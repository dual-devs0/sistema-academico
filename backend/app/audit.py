"""Helper de auditoría — escribe en la tabla audit_log (append-only).

Eventos de seguridad: password_reset_requested, password_reset_completed,
password_reset_failed, password_changed, logout, refresh_token_revoked.
Nunca guardar datos sensibles (tokens, contraseñas) en `detalle`.

Depende de: app.models.audit_log. Usado por: app/routers/auth_router.py.
"""
import logging
from typing import Optional

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog

logger = logging.getLogger(__name__)


def log_audit(
    db: Session,
    evento: str,
    *,
    usuario_id: Optional[int] = None,
    usuario: Optional[str] = None,
    ip: Optional[str] = None,
    detalle: Optional[str] = None,
) -> None:
    """Registra un evento de auditoría. Falla silencioso (log): un problema de
    auditoría jamás debe romper el flujo de negocio."""
    try:
        db.add(
            AuditLog(
                evento=evento,
                usuario_id=usuario_id,
                usuario=usuario,
                ip=ip,
                detalle=detalle,
            )
        )
        db.commit()
    except Exception as exc:  # noqa: BLE001 — append-only best-effort
        db.rollback()
        logger.error("Audit log write failed (evento=%s): %s", evento, exc)