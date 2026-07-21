"""
Modelos SQLAlchemy — Fase 5B: Graduación y tesis.
"""

from datetime import date, datetime, timezone
from typing import Optional
from sqlalchemy import (
    Integer,
    String,
    Boolean,
    DateTime,
    Date,
    Text,
    ForeignKey,
    CheckConstraint,
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.database import Base


class ProcesoGraduacion(Base):
    __tablename__ = "procesos_graduacion"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    alumno_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    fecha_inicio: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="en_proceso")
    tutor_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "estado IN ('en_proceso','tesis_en_curso',"
            "'tesis_aprobada','graduado','rechazado')",
            name="ck_proceso_graduacion_estado",
        ),
    )

    alumno = relationship("User", foreign_keys=[alumno_id])
    tutor = relationship("User", foreign_keys=[tutor_id])
    etapas = relationship("EtapaTesis", back_populates="proceso")
    verificaciones = relationship("VerificacionSolvencia", back_populates="proceso")


class EtapaTesis(Base):
    __tablename__ = "etapas_tesis"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    proceso_id: Mapped[int] = mapped_column(Integer, ForeignKey("procesos_graduacion.id"), nullable=False)
    nombre_etapa: Mapped[str] = mapped_column(String(200), nullable=False)
    fecha_limite: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="pendiente")
    observaciones: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "estado IN ('pendiente','en_curso','aprobada','rechazada')",
            name="ck_etapa_tesis_estado",
        ),
    )

    proceso = relationship("ProcesoGraduacion", back_populates="etapas")


class VerificacionSolvencia(Base):
    __tablename__ = "verificacion_solvencia"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    proceso_id: Mapped[int] = mapped_column(Integer, ForeignKey("procesos_graduacion.id"), nullable=False)
    solvencia_financiera: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    solvencia_biblioteca: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    fecha_verificacion: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    proceso = relationship("ProcesoGraduacion", back_populates="verificaciones")
