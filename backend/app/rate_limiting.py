"""Rate limiting global para TODA la API — sliding window, multi-bucket.

Protege contra fuerza bruta, scraping, spam, DDoS básico, enumeración y
bots. Cada request se controla contra N buckets simultáneos:

  - bucket por IP (client host / X-Forwarded-For)
  - bucket por USUARIO autenticado (JWT Bearer, decodificado)
  - bucket por API KEY (header X-API-Key, si está en API_KEYS)

Algoritmo: sliding window log exacto (lista de timestamps por clave,
purgando los expirados en cada request). Almacenamiento: Redis (sorted
sets) con degradación elegante a memoria local de proceso si Redis cae —
jamás derriba la API (fail-open solo para la infraestructura de
limitación: si el storage falla, se sigue limitando con memoria local).

Respuesta 429 consistente:
  {"success": false, "error": {"code": "RATE_LIMIT_EXCEEDED",
   "message": "Too many requests."}}
con headers X-RateLimit-Limit, X-RateLimit-Remaining y Retry-After.

Variables de entorno (todas opcionales):
  RATE_LIMIT_ENABLED            true|false (default true)
  REDIS_URL                     ej. redis://default:pass@host:6379/0
  REDIS_TOKEN                   token de auth (redis://default:<token>@...)
  REDIS_SSL                     true para conexión TLS
  RATE_LIMIT_EXCLUDE_PATHS      csv exacto (default /health,/version,/metrics)
  RATE_LIMIT_EXCLUDE_PREFIXES   csv prefijos (default /static,/docs,/openapi.json,/redoc)
  API_KEYS                      csv de API keys válidas (bucket aparte)
  RATE_LIMIT_<CATEGORIA>        límite por ventana, ej RATE_LIMIT_AUTH_LOGIN=15/60
  RATE_LIMIT_DEFAULT_READ       default GET (default 120/60)
  RATE_LIMIT_DEFAULT_WRITE      default mutaciones (default 60/60)

Categorías: AUTH, AUTH_LOGIN, AUTH_REGISTER, PASSWORD_RESET, VERIFY_EMAIL,
UPLOADS, QR, REPORTS, EXPORTS, IMPORTS, SEARCH, CRUD, READ, WRITE, ADMIN,
PUBLIC_ENDPOINTS, HEAVY_ENDPOINTS — cada una con límites independientes.

Depende de: optional redis (no hard dep), threading, time.
Usado por: app/main.py (middleware + /metrics).
"""
import asyncio
import logging
import os
import threading
import time
from collections import Counter, deque
from dataclasses import dataclass
from typing import Deque, Optional

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Rule:
    limit: int
    window_seconds: int


def _parse_int(value: str, default: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _parse_rule(raw: str, default: Rule) -> Rule:
    """Acepta 'N'tantos' o 'N/window' (ej '15/60') o '3/15minutes'."""
    raw = raw.strip().lower()
    if not raw:
        return default
    if "/" in raw:
        lim, win = raw.split("/", 1)
        try:
            limit = int(lim)
        except ValueError:
            return default
        win_n = _parse_int(win, default.window_seconds)
        if "minutes" in win:
            win_n = _parse_int(win.replace("minutes", ""), default.window_seconds) * 60
        elif "hour" in win:
            win_n = _parse_int(win.replace("hours", "").replace("hour", ""), default.window_seconds) * 3600
        return Rule(limit=max(limit, 1), window_seconds=max(win_n, 1))
    limit = _parse_int(raw, default.limit)
    return Rule(limit=max(limit, 1), window_seconds=default.window_seconds)


def _env_rule(category: str, default: Rule) -> Rule:
    return _parse_rule(os.getenv(f"RATE_LIMIT_{category}", ""), default)


DEFAULTS: dict[str, Rule] = {
    "AUTH": _env_rule("AUTH", Rule(60, 60)),
    "AUTH_LOGIN": _env_rule("AUTH_LOGIN", Rule(15, 60)),
    "AUTH_REGISTER": _env_rule("AUTH_REGISTER", Rule(6, 3600)),
    "PASSWORD_RESET": _env_rule("PASSWORD_RESET", Rule(6, 900)),
    "VERIFY_EMAIL": _env_rule("VERIFY_EMAIL", Rule(20, 3600)),
    "UPLOADS": _env_rule("UPLOADS", Rule(15, 60)),
    "QR": _env_rule("QR", Rule(30, 60)),
    "REPORTS": _env_rule("REPORTS", Rule(20, 60)),
    "EXPORTS": _env_rule("EXPORTS", Rule(15, 60)),
    "IMPORTS": _env_rule("IMPORTS", Rule(15, 60)),
    "SEARCH": _env_rule("SEARCH", Rule(30, 60)),
    "HEAVY_ENDPOINTS": _env_rule("HEAVY_ENDPOINTS", Rule(30, 60)),
    "ADMIN": _env_rule("ADMIN", Rule(30, 60)),
    "CRUD": _env_rule("CRUD", Rule(60, 60)),
    "PUBLIC_ENDPOINTS": _env_rule("PUBLIC_ENDPOINTS", Rule(120, 60)),
    "READ": _env_rule("DEFAULT_READ", _env_rule("READ", Rule(120, 60))),
    "WRITE": _env_rule("DEFAULT_WRITE", _env_rule("WRITE", Rule(60, 60))),
}

# Tabla de rutas: (prefijo_absoluto_o_infix, categoría). El orden importa —
# las más específicas primero, luego /auth/* genérico, luego READ/WRITE.
_ROUTE_TABLE: list[tuple[str, str]] = [
    ("/auth/login", "AUTH_LOGIN"),
    ("/auth/registro", "AUTH_REGISTER"),
    ("/auth/recuperar-contrasena", "PASSWORD_RESET"),
    ("/auth/reset-password", "PASSWORD_RESET"),
    ("/auth/", "AUTH"),
    ("/users/me/foto", "UPLOADS"),
    ("/users/me/avatar", "UPLOADS"),
    ("/qr", "QR"),
    ("/asistencias/qr", "QR"),
    ("/reportes", "REPORTS"),
    ("/reporte-notas", "REPORTS"),
    ("/boleta", "REPORTS"),
    ("/estadisticas", "REPORTS"),
    ("/buscar", "SEARCH"),
    ("/search", "SEARCH"),
    ("/expediente", "HEAVY_ENDPOINTS"),
    ("/pensum", "HEAVY_ENDPOINTS"),
    ("/admin", "ADMIN"),
    ("/export", "EXPORTS"),
    ("/import", "IMPORTS"),
]

EXCLUDE_PATH_PREFIXES = {
    p.strip().rstrip("/")
    for p in os.getenv(
        "RATE_LIMIT_EXCLUDE_PREFIXES",
        "/static,/docs,/openapi.json,/redoc",
    ).split(",")
    if p.strip()
}
EXCLUDE_EXACT_PATHS = {
    p.strip() for p in os.getenv(
        "RATE_LIMIT_EXCLUDE_PATHS", "/health,/version,/metrics,/"
    ).split(",") if p.strip()
}

API_KEYS = {k.strip() for k in os.getenv("API_KEYS", "").split(",") if k.strip()}

ENABLED = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"
REDIS_URL = os.getenv("REDIS_URL", "") or os.getenv("UPSTASH_REDIS_REST_URL", "")
REDIS_TOKEN = os.getenv("REDIS_TOKEN", "")

_MAX_WINDOW_KEYS = 50_000  # tope de claves en memoria (evita DoS por cardinalidad)


def _match_category(path: str) -> str:
    for prefix, category in _ROUTE_TABLE:
        if prefix in path:
            return category
    return "READ"  # fallback genérico (se ajusta por método abajo)


# ---------------------------------------------------------------------------
# Sliding window stores
# ---------------------------------------------------------------------------


class SlidingWindowStore:
    """Interfaz: cuenta la ventana actual de una clave y registra el request."""

    async def check_and_add(self, key: str, now: float, window: int, limit: int):
        raise NotImplementedError

    async def close(self) -> None:
        pass


class MemorySlidingWindowStore(SlidingWindowStore):
    """Sliding window log en memoria de proceso, thread-safe.

    Es el fallback cuando Redis no está disponible o deshabilitado. Limitación
    conocida: no comparte estado entre procesos (worker N del Gunicorn no ve
    los requests del worker 1) — en producción multi-instancia preferir Redis.
    """

    def __init__(self) -> None:
        self._windows: dict[str, Deque[float]] = {}
        self._lock = threading.RLock()

    async def check_and_add(self, key: str, now: float, window: int, limit: int):
        cutoff = now - window
        with self._lock:
            if len(self._windows) >= _MAX_WINDOW_KEYS and key not in self._windows:
                # Evict de la clave menos recientemente tocada (dict ordenado).
                self._windows.pop(next(iter(self._windows)))
            events = self._windows.get(key)
            if events is None:
                events = deque()
                self._windows[key] = events
            while events and events[0] <= cutoff:
                events.popleft()
            if len(events) >= limit:
                retry_after = max(1.0, window - (now - events[0]))
                return False, retry_after, limit - len(events)
            events.append(now)
            return True, 0.0, limit - len(events)

    async def close(self) -> None:
        with self._lock:
            self._windows.clear()


class RedisSlidingWindowStore(SlidingWindowStore):
    """Sliding window log en Redis (sorted sets), atómico por pipeline.

    Si Redis no responde, el RateLimitManager degrada a MemoryStore
    permanentemente (log emitido una vez) — nunca rompe la API.
    """

    def __init__(self, url: str, token: str = "") -> None:
        self._url = url
        self._token = token
        self._client: Optional[object] = None
        self._lock = asyncio.Lock()

    async def _get_client(self):
        if self._client is not None:
            return self._client
        async with self._lock:
            if self._client is not None:
                return self._client
            import redis.asyncio as aioredis

            self._client = aioredis.from_url(
                self._url,
                password=self._token or None,
                socket_timeout=1.5,
                socket_connect_timeout=1.5,
                max_connections=10,
            )
            await self._client.ping()
            return self._client

    async def check_and_add(self, key: str, now: float, window: int, limit: int):
        client = await self._get_client()
        rkey = f"rl:{key}"
        pipe = client.pipeline()
        pipe.zremrangebyscore(rkey, "-inf", now - window)
        pipe.zcard(rkey)
        pipe.zadd(rkey, {str(now): now})
        pipe.zrange(rkey, 0, 0)
        pipe.expire(rkey, window * 2 + 60)
        _, count, _, oldest, _ = await pipe.execute()
        count = int(count)
        if count + 1 > limit:  # el zadd ya registró este request
            oldest_ts = float(oldest[0]) if oldest else now
            retry_after = max(1.0, window - (now - oldest_ts))
            return False, retry_after, max(0, limit - (count + 1))
        return True, 0.0, max(0, limit - (count + 1))

    async def close(self) -> None:
        if self._client is not None:
            try:
                await self._client.aclose()
            except Exception:
                pass
            self._client = None


class RateLimitManager:
    """Orquesta stores y buckets. El punto único de verdad del rate limiting."""

    def __init__(self) -> None:
        self.enabled = ENABLED
        self.store: SlidingWindowStore = MemorySlidingWindowStore()
        self._redis_failed_logged = False
        if self.enabled and REDIS_URL:
            try:
                self.store = RedisSlidingWindowStore(REDIS_URL, REDIS_TOKEN)
            except Exception:  # noqa: BLE001
                self.store = MemorySlidingWindowStore()

    def _fallback_to_memory(self, exc: Exception) -> None:
        if self._redis_failed_logged:
            return
        self._redis_failed_logged = True
        logger.warning(
            "Redis rate limit store no disponible (%s) — degradando a memoria local.", exc
        )
        self.store = MemorySlidingWindowStore()

    def _bearer_user_id(self, request: Request) -> Optional[str]:
        auth = request.headers.get("authorization", "")
        if not auth.startswith("Bearer "):
            return None
        token = auth[7:]
        try:
            from app.auth import ALGORITHM, SECRET_KEY
            from jose import jwt

            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return str(payload.get("user_id") or payload.get("sub"))
        except Exception:  # noqa: BLE001 — token inválido: solo bucket IP
            return None

    def _buckets(self, request: Request, category: str) -> list[tuple[str, int, int]]:
        """Devuelve [(bucket_key, limit, window), ...] — se exige TODOS."""
        rule = DEFAULTS.get(category) or DEFAULTS["READ"]
        buckets: list[tuple[str, int, int]] = [(f"{category}:ip:{_client_ip(request)}", rule.limit, rule.window_seconds)]

        user_id = self._bearer_user_id(request)
        if user_id:
            buckets.append((f"{category}:user:{user_id}", rule.limit, rule.window_seconds))

        api_key = request.headers.get("x-api-key", "")
        if api_key and api_key in API_KEYS:
            buckets.append((f"{category}:apikey:{api_key}", rule.limit, rule.window_seconds))
        return buckets

    async def check_request(self, request: Request) -> Optional[dict]:
        """Verifica todos los buckets. Retorna None si pasa, o el payload 429."""
        path = request.url.path.rstrip("/") or "/"
        if path in EXCLUDE_EXACT_PATHS or any(
            path.startswith(p) for p in EXCLUDE_PATH_PREFIXES
        ):
            return None
        if request.method in ("OPTIONS", "HEAD"):
            return None

        category = _match_category(path)
        if request.method not in ("GET", "HEAD"):
            # La tabla define categorías concretas; para el resto: WRITE.
            if category == "READ":
                category = "WRITE"
        rule = DEFAULTS.get(category) or DEFAULTS["READ"]

        now = time.time()
        buckets = self._buckets(request, category)
        allowed = True
        retry_after = 0.0
        remaining_min = rule.limit
        for key, limit, window in buckets:
            try:
                ok, retry, remaining = await self.store.check_and_add(key, now, window, limit)
            except Exception as exc:  # noqa: BLE001 — degrado a memoria
                self._fallback_to_memory(exc)
                ok, retry, remaining = await self.store.check_and_add(
                    key, now, window, limit
                )
            remaining_min = min(remaining_min, remaining)
            if not ok:
                allowed = False
                retry_after = max(retry_after, retry)

        if allowed:
            metrics_request_allowed(category, path)
            return {
                "allowed": True,
                "category": category,
                "limit": rule.limit,
                "remaining": remaining_min,
                "retry_after": 0,
            }
        metrics_request_blocked(category, path, _client_ip(request))
        return {
            "allowed": False,
            "category": category,
            "limit": rule.limit,
            "remaining": 0,
            "retry_after": int(retry_after) or 1,
        }


limiter = RateLimitManager()


# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not limiter.enabled:
            return await call_next(request)

        result: Optional[dict] = None
        try:
            result = await limiter.check_request(request)
        except Exception as exc:  # noqa: BLE001 — nunca derribar la API
            logger.error("Rate limit check failed (fail-open): %s", exc)

        if result is None:
            return await call_next(request)

        if not result["allowed"]:
            logger.warning(
                "Rate limit blocked ip=%s path=%s category=%s",
                _client_ip(request), request.url.path, result.get("category", "?"),
            )
            return JSONResponse(
                status_code=429,
                content={
                    "success": False,
                    "error": {
                        "code": "RATE_LIMIT_EXCEEDED",
                        "message": "Too many requests.",
                    },
                },
                headers={
                    "X-RateLimit-Limit": str(result["limit"]),
                    "X-RateLimit-Remaining": "0",
                    "Retry-After": str(result["retry_after"]),
                },
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(result["limit"])
        response.headers["X-RateLimit-Remaining"] = str(result["remaining"])
        return response


_last_category = ""


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ---------------------------------------------------------------------------
# Observabilidad — métricas en memoria (prometheus text + JSON interno)
# ---------------------------------------------------------------------------

_metrics_lock = threading.RLock()
_blocked_total = 0
_blocked_by_category: Counter = Counter()
_blocked_by_endpoint: Counter = Counter()
_blocked_by_ip: Counter = Counter()
_requests_by_category: Counter = Counter()
_requests_total = 0
_recent_blocked: Deque[float] = deque(maxlen=5000)


def metrics_request_allowed(category: str, path: str) -> None:
    global _requests_total
    with _metrics_lock:
        _requests_total += 1
        _requests_by_category[category] += 1


def metrics_request_blocked(category: str, path: str, ip: str) -> None:
    global _blocked_total, _requests_total
    with _metrics_lock:
        _blocked_total += 1
        _requests_total += 1
        _blocked_by_category[category] += 1
        _blocked_by_endpoint[path] += 1
        _blocked_by_ip[ip] += 1
        _recent_blocked.append(time.time())


def _rate_per_minute() -> float:
    with _metrics_lock:
        cutoff = time.time() - 60
        recent = [t for t in _recent_blocked if t >= cutoff]
        return round(len(recent) / 60.0, 2)


def metrics_snapshot() -> dict:
    with _metrics_lock:
        return {
            "requests_total": _requests_total,
            "blocked_total": _blocked_total,
            "blocked_per_minute_avg": _rate_per_minute(),
            "top_blocked_endpoints": _blocked_by_endpoint.most_common(10),
            "top_blocked_ips": _blocked_by_ip.most_common(10),
            "blocked_by_category": dict(_blocked_by_category),
            "requests_by_category": dict(_requests_by_category),
            "provider": "redis" if limiter.store.__class__.__name__.startswith("Redis") else "memory",
        }


def metrics_text() -> str:
    snap = metrics_snapshot()
    lines = [
        "# HELP uca_rate_limit_requests_total Total requests checked by the rate limiter",
        "# TYPE uca_rate_limit_requests_total counter",
        f"uca_rate_limit_requests_total {snap['requests_total']}",
        "# HELP uca_rate_limit_blocked_total Total requests blocked by the rate limiter",
        "# TYPE uca_rate_limit_blocked_total counter",
        f"uca_rate_limit_blocked_total {snap['blocked_total']}",
        "# HELP uca_rate_limit_blocked_per_minute Average blocked requests per minute",
        f"uca_rate_limit_blocked_per_minute_avg {snap['blocked_per_minute_avg']}",
    ]
    for cat, count in snap["blocked_by_category"].items():
        safe = cat.replace("-", "_")
        lines.append(f'uca_rate_limit_blocked_total{{category="{safe}"}} {count}')
    for ep, count in snap["top_blocked_endpoints"]:
        safe = ep.replace('"', "'")
        lines.append(f'uca_rate_limit_blocked_total{{endpoint="{safe}"}} {count}')
    for ip, count in snap["top_blocked_ips"]:
        safe = ip.replace('"', "'")
        lines.append(f'uca_rate_limit_blocked_total{{ip="{safe}"}} {count}')
    lines.append("")
    return "\n".join(lines)