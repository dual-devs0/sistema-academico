"""Middleware ASGI de protección CSRF (double-submit cookie).

Qué hace: exige que todo POST/PUT/PATCH/DELETE traiga el header
X-CSRF-Token igual al valor de la cookie csrf_token (setead en login/refresh
por auth_router.py). Aplica global, con excepciones en CSRF_EXEMPT_PATHS.
Depende de: nada (self-contained). Usado por: app/main.py (app.add_middleware).
"""
import os
import secrets
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from collections.abc import Awaitable, Callable

CSRF_EXEMPT_PATHS = {
    "/auth/login",
    "/auth/registro",
    "/auth/recuperar-contrasena",
    "/auth/reset-password",
    "/auth/refresh",
}

CSRF_PREFIX_EXEMPT = {"/static"}


class CSRFMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        # FIX AUDITORIA_2026-07-24 #3: este flag ANTES leía RATE_LIMIT_ENABLED
        # (copy-paste), lo que apagaba CSRF entero si se desactivaba el rate
        # limit en producción. Flag propio ahora — ver CHANGELOG_FIXES.md.
        if os.getenv("CSRF_ENABLED", "true").lower() != "true":
            return await call_next(request)
        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
            path = request.url.path.rstrip("/") or "/"
            if path not in CSRF_EXEMPT_PATHS and not any(
                path.startswith(p) for p in CSRF_PREFIX_EXEMPT
            ):
                csrf_cookie = request.cookies.get("csrf_token")
                csrf_header = request.headers.get("x-csrf-token")

                if not csrf_cookie or not csrf_header or not secrets.compare_digest(
                    csrf_cookie, csrf_header
                ):
                    return Response(
                        status_code=403,
                        content='{"detail":"CSRF token inválido o ausente"}',
                        media_type="application/json",
                    )

        return await call_next(request)
