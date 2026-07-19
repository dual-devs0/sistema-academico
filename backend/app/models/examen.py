"""
Modelos de Exámenes Regulares — Fase 7E.

Tablas:
  - examenes: Mesa de examen programada por admin/profesor
  - inscripciones_examen: Inscripción de alumno a una mesa
"""

from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    Integer,
    String,
    Date,
    DateTime,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.database import Base


class Examen(Base):
    __tablename__ = "examenes"

    id = Column(Integer, primary_key=True, index=True)
    materia_id = Column(Integer, ForeignKey("materias.id"), nullable=False)
    fecha = Column(Date, nullable=False)
    hora_inicio = Column(String(5), nullable=True)  # HH:MM
    hora_fin = Column(String(5), nullable=True)
    aula = Column(String(50), nullable=True)
    tipo = Column(
        String(20), nullable=False, default="final"
    )  # parcial | final | recuperatorio
    periodo = Column(String(10), nullable=False)  # ej. '2026-1'
    cupos = Column(Integer, nullable=True)  # null = sin límite
    estado = Column(
        String(20), nullable=False, default="programado"
    )  # programado | en_curso | finalizado | cancelado
    profesor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    materia = relationship("Materia")
    profesor = relationship("User", foreign_keys=[profesor_id])
    inscripciones = relationship(
        "InscripcionExamen", back_populates="examen", cascade="all, delete-orphan"
    )


class InscripcionExamen(Base):
    __tablename__ = "inscripciones_examen"

    id = Column(Integer, primary_key=True, index=True)
    examen_id = Column(Integer, ForeignKey("examenes.id"), nullable=False)
    alumno_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    estado = Column(
        String(20), nullable=False, default="inscripto"
    )  # inscripto | presente | ausente | cancelada
    inscripto_en = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    cancelado_en = Column(DateTime(timezone=True), nullable=True)

    examen = relationship("Examen", back_populates="inscripciones")
    alumno = relationship("User", foreign_keys=[alumno_id])

    __table_args__ = (
        UniqueConstraint("examen_id", "alumno_id", name="uq_inscripcion_examen_alumno"),
    )
