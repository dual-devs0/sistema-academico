"""
Modelos SQLAlchemy — Fase 5A: Solicitudes y trámites.
"""

from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import (
    Integer,
    String,
    Boolean,
    DateTime,
    Text,
    ForeignKey,
    CheckConstraint,
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.database import Base


class TipoTramite(Base):
    __tablename__ = "tipos_tramite"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    descripcion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    requiere_aprobacion: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    dias_estimados: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    solicitudes = relationship("Solicitud", back_populates="tipo_tramite", cascade="all, delete-orphan")


class Solicitud(Base):
    __tablename__ = "solicitudes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    alumno_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    tipo_tramite_id: Mapped[int] = mapped_column(Integer, ForeignKey("tipos_tramite.id", ondelete="CASCADE"), nullable=False)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="pendiente")
    # pendiente / en_proceso / resuelta / rechazada
    fecha_solicitud: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    fecha_resolucion: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    resuelto_por: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )  # null = auto-generada
    storage_key_resultado: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    motivo_rechazo: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "estado IN ('pendiente','en_proceso','resuelta','rechazada')",
            name="ck_solicitud_estado",
        ),
    )

    alumno = relationship("User", foreign_keys=[alumno_id])
    resolutor = relationship("User", foreign_keys=[resuelto_por])
    tipo_tramite = relationship("TipoTramite", back_populates="solicitudes")
