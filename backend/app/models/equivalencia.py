"""
Modelos SQLAlchemy — Fase 5D: Equivalencias y suficiencia.
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Date,
    ForeignKey,
    CheckConstraint,
)
from sqlalchemy.orm import relationship
from app.database import Base


class SolicitudEquivalencia(Base):
    __tablename__ = "solicitudes_equivalencia"

    id = Column(Integer, primary_key=True, index=True)
    alumno_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tipo = Column(String(30), nullable=False)
    universidad_origen = Column(String(200), nullable=True)
    estado = Column(String(20), nullable=False, default="pendiente")

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
    materias = relationship("EquivalenciaMateria", back_populates="solicitud")


class EquivalenciaMateria(Base):
    __tablename__ = "equivalencias_materia"

    id = Column(Integer, primary_key=True, index=True)
    solicitud_id = Column(
        Integer, ForeignKey("solicitudes_equivalencia.id"), nullable=False
    )
    materia_origen_nombre = Column(String(200), nullable=False)
    materia_destino_id = Column(Integer, ForeignKey("materias.id"), nullable=True)
    programa_analitico_storage_key = Column(String(500), nullable=True)
    resolucion = Column(String(30), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "resolucion IN ('aprobada','rechazada','pendiente')",
            name="ck_equivalencia_resolucion",
        ),
    )

    solicitud = relationship("SolicitudEquivalencia", back_populates="materias")


class ExamenSuficiencia(Base):
    __tablename__ = "examenes_suficiencia"

    id = Column(Integer, primary_key=True, index=True)
    alumno_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    materia_id = Column(Integer, ForeignKey("materias.id"), nullable=False)
    fecha = Column(Date, nullable=False)
    resultado = Column(String(20), nullable=True)

    __table_args__ = (
        CheckConstraint(
            "resultado IN ('aprobado','reprobado','pendiente')",
            name="ck_examen_suficiencia_resultado",
        ),
    )

    alumno = relationship("User", foreign_keys=[alumno_id])
    materia = relationship("Materia", foreign_keys=[materia_id])
