"""
Modelos de Exámenes Regulares — Fase 7E.

Tablas:
  - examenes: Mesa de examen programada por admin/profesor
  - inscripciones_examen: Inscripción de alumno a una mesa
"""

from datetime import date, datetime, timezone
from typing import Optional

from sqlalchemy import (
    Integer,
    String,
    Date,
    DateTime,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.database import Base


class Examen(Base):
    __tablename__ = "examenes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    materia_id: Mapped[int] = mapped_column(Integer, ForeignKey("materias.id"), nullable=False)
    fecha: Mapped[date] = mapped_column(Date, nullable=False)
    hora_inicio: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)  # HH:MM
    hora_fin: Mapped[Optional[str]] = mapped_column(String(5), nullable=True)
    aula: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    tipo: Mapped[str] = mapped_column(
        String(20), nullable=False, default="final"
    )  # parcial | final | recuperatorio
    periodo: Mapped[str] = mapped_column(String(10), nullable=False)  # ej. '2026-1'
    cupos: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # null = sin límite
    estado: Mapped[str] = mapped_column(
        String(20), nullable=False, default="programado"
    )  # programado | en_curso | finalizado | cancelado
    profesor_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    materia = relationship("Materia")
    profesor = relationship("User", foreign_keys=[profesor_id])
    inscripciones = relationship(
        "InscripcionExamen", back_populates="examen", cascade="all, delete-orphan"
    )


class InscripcionExamen(Base):
    __tablename__ = "inscripciones_examen"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    examen_id: Mapped[int] = mapped_column(Integer, ForeignKey("examenes.id"), nullable=False)
    alumno_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    estado: Mapped[str] = mapped_column(
        String(20), nullable=False, default="inscripto"
    )  # inscripto | presente | ausente | cancelada
    inscripto_en: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    cancelado_en: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    examen = relationship("Examen", back_populates="inscripciones")
    alumno = relationship("User", foreign_keys=[alumno_id])

    __table_args__ = (
        UniqueConstraint("examen_id", "alumno_id", name="uq_inscripcion_examen_alumno"),
    )
