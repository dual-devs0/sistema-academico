"""
Modelos SQLAlchemy — Fase 5B: Graduación y tesis.
"""
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Date, Text,
    ForeignKey, CheckConstraint,
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base


class ProcesoGraduacion(Base):
    __tablename__ = "procesos_graduacion"

    id = Column(Integer, primary_key=True, index=True)
    alumno_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    fecha_inicio = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    estado = Column(String(20), nullable=False, default="en_proceso")
    tutor_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "estado IN ('en_proceso','tesis_en_curso','tesis_aprobada','graduado','rechazado')",
            name="ck_proceso_graduacion_estado",
        ),
    )

    alumno = relationship("User", foreign_keys=[alumno_id])
    tutor = relationship("User", foreign_keys=[tutor_id])
    etapas = relationship("EtapaTesis", back_populates="proceso")
    verificaciones = relationship("VerificacionSolvencia", back_populates="proceso")


class EtapaTesis(Base):
    __tablename__ = "etapas_tesis"

    id = Column(Integer, primary_key=True, index=True)
    proceso_id = Column(Integer, ForeignKey("procesos_graduacion.id"), nullable=False)
    nombre_etapa = Column(String(200), nullable=False)
    fecha_limite = Column(Date, nullable=True)
    estado = Column(String(20), nullable=False, default="pendiente")
    observaciones = Column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "estado IN ('pendiente','en_curso','aprobada','rechazada')",
            name="ck_etapa_tesis_estado",
        ),
    )

    proceso = relationship("ProcesoGraduacion", back_populates="etapas")


class VerificacionSolvencia(Base):
    __tablename__ = "verificacion_solvencia"

    id = Column(Integer, primary_key=True, index=True)
    proceso_id = Column(Integer, ForeignKey("procesos_graduacion.id"), nullable=False)
    solvencia_financiera = Column(Boolean, nullable=False, default=False)
    solvencia_biblioteca = Column(Boolean, nullable=False, default=False)
    fecha_verificacion = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    proceso = relationship("ProcesoGraduacion", back_populates="verificaciones")