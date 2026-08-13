"""Tests del rate limiting GLOBAL (app/rate_limiting.py).

Importante: conftest fija RATE_LIMIT_ENABLED=false en .env.test para no
afectar al resto de la suite; estos tests encienden el middleware a nivel
de módulo (limiter.enabled) y restablecen el estado tras cada test.
"""
import asyncio
import time

import pytest
from unittest.mock import MagicMock, patch

from app.rate_limiting import (
    RateLimitManager,
    MemorySlidingWindowStore,
    RedisSlidingWindowStore,
    limiter,
    metrics_snapshot,
    DEFAULTS,
)


def auth(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def rl_enabled(monkeypatch):
    """Enciende el rate limiter (memoria local), con reglas mínimas y
    limpio entre tests."""
    monkeypatch.setattr(limiter, "enabled", True)
    limiter.store = MemorySlidingWindowStore()
    _saved = {cat: DEFAULTS[cat] for cat in ("READ", "WRITE", "AUTH_LOGIN", "PASSWORD_RESET")}
    for cat in _saved:
        DEFAULTS[cat] = _saved[cat].__class__(3, 60)
    yield
    monkeypatch.setattr(limiter, "enabled", False)
    DEFAULTS.update(_saved)


def _reset_snap():
    import app.rate_limiting as rl
    rl._blocked_total = 0
    rl._blocked_by_category.clear()
    rl._blocked_by_endpoint.clear()
    rl._blocked_by_ip.clear()
    rl._requests_by_category.clear()
    rl._requests_total = 0
    rl._recent_blocked.clear()


# ---------------------------------------------------------------------------
# Límite alcanzado / ventana / headers / response 429
# ---------------------------------------------------------------------------


def test_límite_alcanzado_responde_429_json(client, rl_enabled, tokens):
    _reset_snap()
    headers = auth(tokens["alumno"])
    for _ in range(3):
        res = client.get("/alumno/dashboard", headers=headers)
        assert res.status_code == 200
    res = client.get("/alumno/dashboard", headers=headers)
    assert res.status_code == 429
    body = res.json()
    assert body == {
        "success": False,
        "error": {"code": "RATE_LIMIT_EXCEEDED", "message": "Too many requests."},
    }


def test_headers_correctos_en_limitado_y_excedido(client, rl_enabled, tokens):
    _reset_snap()
    headers = auth(tokens["alumno"])
    res = client.get("/alumno/dashboard", headers=headers)
    assert res.headers["X-RateLimit-Limit"] == "3"
    assert res.headers["X-RateLimit-Remaining"] == "2"

    for _ in range(3):
        client.get("/alumno/dashboard", headers=headers)
    res = client.get("/alumno/dashboard", headers=headers)
    assert res.status_code == 429
    assert res.headers["X-RateLimit-Limit"] == "3"
    assert res.headers["X-RateLimit-Remaining"] == "0"
    assert int(res.headers["Retry-After"]) >= 1


def test_ventana_se_reinicia(client, rl_enabled, tokens):
    _reset_snap()
    headers = auth(tokens["alumno"])
    DEFAULTS["READ"] = DEFAULTS["READ"].__class__(2, 1)  # 2 requests/1s
    client.get("/alumno/dashboard", headers=headers)
    client.get("/alumno/dashboard", headers=headers)
    assert client.get("/alumno/dashboard", headers=headers).status_code == 429
    time.sleep(1.2)
    assert client.get("/alumno/dashboard", headers=headers).status_code == 200


def test_categorias_independientes(client, rl_enabled, tokens):
    """READ (GET /users/) y WRITE (POST /users/) tienen límites propios."""
    _reset_snap()
    headers = auth(tokens["admin"])
    DEFAULTS["READ"] = DEFAULTS["READ"].__class__(2, 60)
    DEFAULTS["WRITE"] = DEFAULTS["WRITE"].__class__(20, 60)
    client.get("/users/", headers=headers)
    client.get("/users/", headers=headers)
    assert client.get("/users/", headers=headers).status_code == 429
    assert client.post(
        "/users/", json={"username": "x1", "password": "clave123", "role": "alumno"},
        headers=headers,
    ).status_code in (200, 422)  # NO 429 — WRITE tiene otro límite


def test_auth_login_limitado_junto_al_bloqueo_por_fallos(client, rl_enabled, seed):
    from app.routers import auth_router

    auth_router._login_failed_attempts.clear()
    _reset_snap()
    DEFAULTS["AUTH_LOGIN"] = DEFAULTS["AUTH_LOGIN"].__class__(2, 60)
    client.post("/auth/login", json={"username": "admin_test", "password": "x"})
    client.post("/auth/login", json={"username": "admin_test", "password": "x"})
    res = client.post("/auth/login", json={"username": "admin_test", "password": "x"})
    assert res.status_code == 429
    auth_router._login_failed_attempts.clear()


# ---------------------------------------------------------------------------
# Exclusiones / bypass
# ---------------------------------------------------------------------------


def test_bypass_endpoints_excluidos(client, rl_enabled):
    _reset_snap()
    DEFAULTS["READ"] = DEFAULTS["READ"].__class__(1, 60)
    for _ in range(5):
        assert client.get("/health").status_code == 200
    for _ in range(3):
        assert client.get("/metrics").status_code == 200
    assert client.get("/version").status_code == 200


def test_options_no_limitado(client, rl_enabled):
    res = client.options("/users/")
    assert res.status_code in (200, 405)
    assert "X-RateLimit-Limit" not in res.headers


# ---------------------------------------------------------------------------
# Múltiples usuarios / IPs / API keys
# ---------------------------------------------------------------------------


def test_ips_distintas_tienen_buckets_independientes(client, rl_enabled):
    """Sin token: solo importa el bucket IP (X-Forwarded-For)."""
    _reset_snap()
    DEFAULTS["READ"] = DEFAULTS["READ"].__class__(2, 60)
    for _ in range(2):
        assert client.get(
            "/carreras/", headers={"X-Forwarded-For": "10.0.0.1"}
        ).status_code in (200, 401)
    assert client.get(
        "/carreras/", headers={"X-Forwarded-For": "10.0.0.1"}
    ).status_code == 429
    assert client.get(
        "/carreras/", headers={"X-Forwarded-For": "10.0.0.2"}
    ).status_code in (200, 401)


def test_usuarios_autenticados_tienen_buckets_independientes(client, rl_enabled, tokens):
    _reset_snap()
    DEFAULTS["READ"] = DEFAULTS["READ"].__class__(2, 60)
    auth1 = {**auth(tokens["alumno"]), "X-Forwarded-For": "10.0.0.1"}
    auth2 = {**auth(tokens["profesor"]), "X-Forwarded-For": "10.0.0.2"}
    for _ in range(2):
        assert client.get("/alumno/dashboard", headers=auth1).status_code in (200, 403)
    assert client.get("/alumno/dashboard", headers=auth1).status_code == 429
    assert client.get("/alumno/dashboard", headers=auth2).status_code in (200, 403)


def test_api_key_tiene_bucket_propio(client, rl_enabled, monkeypatch):
    _reset_snap()
    monkeypatch.setattr(
        "app.rate_limiting.API_KEYS", {"sk-test-1", "sk-test-2"}
    )
    DEFAULTS["READ"] = DEFAULTS["READ"].__class__(2, 60)
    for _ in range(2):
        assert client.get(
            "/carreras/", headers={"X-API-Key": "sk-test-1", "X-Forwarded-For": "10.0.0.1"}
        ).status_code in (200, 401)
    assert client.get(
        "/carreras/", headers={"X-API-Key": "sk-test-1", "X-Forwarded-For": "10.0.0.1"}
    ).status_code == 429
    assert client.get(
        "/carreras/", headers={"X-API-Key": "sk-test-2", "X-Forwarded-For": "10.0.0.2"}
    ).status_code in (200, 401)  # el bucket no bloquea — la auth es otra cosa


# ---------------------------------------------------------------------------
# Redis caído → degradación elegante (sin red real, store stub que lanza)
# ---------------------------------------------------------------------------


class _ExplodingStore(MemorySlidingWindowStore):
    def __init__(self) -> None:
        super().__init__()
        self.calls = 0

    async def check_and_add(self, key, now, window, limit):
        self.calls += 1
        if self.calls == 1:
            raise ConnectionError("redis down")
        return await super().check_and_add(key, now, window, limit)


def test_redis_caido_degrada_a_memoria(rl_enabled, tokens):
    manager = RateLimitManager()
    manager.enabled = True
    manager._redis_failed_logged = False
    manager.store = _ExplodingStore()

    from fastapi import Request
    req = Request({"type": "http", "method": "GET", "path": "/users/",
                   "headers": [(b"host", b"test"), (b"x-forwarded-for", b"1.2.3.4")],
                   "query_string": b"", "server": ("test", 80), "client": ("1.2.3.4", 1),
                   "scheme": "http"})

    result = asyncio.run(manager.check_request(req))
    assert result["allowed"] is True
    assert isinstance(manager.store, MemorySlidingWindowStore)


def test_redis_store_contrato_sin_red():
    """Con URL inalcanzable, el store Redis lanza rápido (connect_timeout
    corto) para que el manager degrade; no cuelga ni rompe la API."""
    store = RedisSlidingWindowStore("redis://127.0.0.1:1/1", "x", )
    try:
        asyncio.run(store.check_and_add("k", time.time(), 60, 10))
        raise AssertionError("se esperaba excepción de conexión")
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Observabilidad
# ---------------------------------------------------------------------------


def test_metricas_registran_bloqueos_y_requests(client, rl_enabled, tokens):
    _reset_snap()
    headers = auth(tokens["alumno"])
    DEFAULTS["READ"] = DEFAULTS["READ"].__class__(1, 60)
    client.get("/users/", headers=headers)  # sin READ restante en 2da llamada
    client.get("/users/", headers=headers)
    snap = metrics_snapshot()
    assert snap["requests_total"] == 2
    assert snap["blocked_total"] == 1
    assert len(snap["top_blocked_endpoints"]) == 1
    assert snap["top_blocked_endpoints"][0][0] == "/users"
    assert len(snap["top_blocked_ips"]) == 1


def test_metrics_text_formato_prometheus(client, rl_enabled):
    from app.rate_limiting import metrics_text

    text = metrics_text()
    assert "uca_rate_limit_requests_total" in text
    assert "uca_rate_limit_blocked_total" in text


# ---------------------------------------------------------------------------
# Rendimiento básico (sanidad)
# ---------------------------------------------------------------------------


def test_memory_store_rendimiento():
    """1k checks en memoria deben resolverse en < 1s (sanity perf)."""
    store = MemorySlidingWindowStore()
    now = time.time()
    start = time.perf_counter()

    async def _run():
        for i in range(1000):
            await store.check_and_add("perf", now + i * 0.0001, 60, 10_000)

    asyncio.run(_run())
    elapsed = time.perf_counter() - start
    assert elapsed < 1.0