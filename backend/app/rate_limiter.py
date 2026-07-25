"""Instancia compartida de slowapi.Limiter — rate limiting por IP.

Default 100/min global (app/main.py); límites específicos por endpoint via
decorador @limiter.limit(...) en los routers (ver auth_router.py). No
confundir RATE_LIMIT_ENABLED con CSRF_ENABLED (app/middleware/csrf.py) —
son flags independientes, ver AUDITORIA_2026-07-24.md hallazgo #3.
Depende de: nada. Usado por: app/main.py, auth_router.py.
"""
import os
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100/minute"],
    enabled=os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true",
)
