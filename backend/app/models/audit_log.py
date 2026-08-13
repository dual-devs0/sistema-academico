from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import Integer, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


# Log de auditoría genérico — eventos de seguridad y cambios sensibles
# (reset de contraseña, iniciar/cerrar sesión, fallos de token, etc.).
# Append-only por convención: no exponer endpoints de update/delete.
# Usado por: app/audit.py (helper) y app/routers/auth_router.py.
class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    evento: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    usuario_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    usuario: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    ip: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    detalle: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    __table_args__ = (
        Index("ix_audit_log_evento_usuario", "evento", "usuario_id"),
    )