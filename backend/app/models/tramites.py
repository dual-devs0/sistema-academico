"""
Modelos SQLAlchemy — Fase 5A: Solicitudes y trámites.
"""
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Text,
    ForeignKey, CheckConstraint,
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base


class TipoTramite(Base):
    __tablename__ = "tipos_tramite"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False, unique=True)
    descripcion = Column(Text, nullable=True)
    requiere_aprobacion = Column(Boolean, nullable=False, default=False)
    dias_estimados = Column(Integer, nullable=True)

    solicitudes = relationship("Solicitud", back_populates="tipo_tramite")


class Solicitud(Base):
    __tablename__ = "solicitudes"

    id = Column(Integer, primary_key=True, index=True)
    alumno_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tipo_tramite_id = Column(Integer, ForeignKey("tipos_tramite.id"), nullable=False)
    estado = Column(String(20), nullable=False, default="pendiente")
    # pendiente / en_proceso / resuelta / rechazada
    fecha_solicitud = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    fecha_resolucion = Column(DateTime(timezone=True), nullable=True)
    resuelto_por = Column(Integer, ForeignKey("users.id"), nullable=True)  # null = auto-generada
    storage_key_resultado = Column(String(500), nullable=True)
    motivo_rechazo = Column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "estado IN ('pendiente','en_proceso','resuelta','rechazada')",
            name="ck_solicitud_estado",
        ),
    )

    alumno = relationship("User", foreign_keys=[alumno_id])
    resolutor = relationship("User", foreign_keys=[resuelto_por])
    tipo_tramite = relationship("TipoTramite", back_populates="solicitudes")
