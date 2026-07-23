"""
Modelos SQLAlchemy — Fase 5D: Equivalencias y suficiencia.
"""

from datetime import date, datetime, timezone
from typing import Optional
from sqlalchemy import (
    Integer,
    String,
    Date,
    DateTime,
    ForeignKey,
    CheckConstraint,
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.database import Base


class SolicitudEquivalencia(Base):
    __tablename__ = "solicitudes_equivalencia"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    alumno_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    tipo: Mapped[str] = mapped_column(String(30), nullable=False)
    universidad_origen: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="pendiente")
    created_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    __table_args__ = (
        CheckConstraint(
            "tipo IN ('equivalencia','convalidacion')",
            name="ck_solicitud_equivalencia_tipo",
        ),
        CheckConstraint(
            "estado IN ('pendiente','en_proceso','resuelta','rechazada')",
            name="ck_solicitud_equivalencia_estado",
        ),
    )

    alumno = relationship("User", foreign_keys=[alumno_id])
    materias = relationship("EquivalenciaMateria", back_populates="solicitud", cascade="all, delete-orphan")


class EquivalenciaMateria(Base):
    __tablename__ = "equivalencias_materia"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    solicitud_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("solicitudes_equivalencia.id", ondelete="CASCADE"), nullable=False
    )
    materia_origen_nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    materia_destino_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("materias.id"), nullable=True)
    programa_analitico_storage_key: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    resolucion: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "resolucion IN ('aprobada','rechazada','pendiente')",
            name="ck_equivalencia_resolucion",
        ),
    )

    solicitud = relationship("SolicitudEquivalencia", back_populates="materias")


class ExamenSuficiencia(Base):
    __tablename__ = "examenes_suficiencia"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    alumno_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    materia_id: Mapped[int] = mapped_column(Integer, ForeignKey("materias.id"), nullable=False)
    fecha: Mapped[date] = mapped_column(Date, nullable=False)
    resultado: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "resultado IN ('aprobado','reprobado','pendiente')",
            name="ck_examen_suficiencia_resultado",
        ),
    )

    alumno = relationship("User", foreign_keys=[alumno_id])
    materia = relationship("Materia", foreign_keys=[materia_id])
