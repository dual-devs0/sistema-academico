"""
Schemas de Exámenes — Fase 7E.
"""

from datetime import date, datetime
from typing import Optional, List

from pydantic import BaseModel


# ── Examen ────────────────────────────────────────────────────────────


class ExamenCreate(BaseModel):
    materia_id: int
    fecha: date
    hora_inicio: Optional[str] = None
    hora_fin: Optional[str] = None
    aula: Optional[str] = None
    tipo: str = "final"
    periodo: str
    cupos: Optional[int] = None
    profesor_id: Optional[int] = None


class ExamenOut(BaseModel):
    id: int
    materia_id: int
    fecha: date
    hora_inicio: Optional[str] = None
    hora_fin: Optional[str] = None
    aula: Optional[str] = None
    tipo: str
    periodo: str
    cupos: Optional[int] = None
    estado: str
    profesor_id: Optional[int] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ExamenDisponible(ExamenOut):
    """Examen con cupos disponibles calculados."""

    materia_nombre: Optional[str] = None
    profesor_nombre: Optional[str] = None
    cupos_disponibles: Optional[int] = None
    ya_inscripto: bool = False


# ── Inscripción ───────────────────────────────────────────────────────


class InscripcionExamenCreate(BaseModel):
    examen_id: int


class InscripcionExamenOut(BaseModel):
    id: int
    examen_id: int
    alumno_id: int
    estado: str
    inscripto_en: Optional[datetime] = None
    cancelado_en: Optional[datetime] = None

    model_config = {"from_attributes": True}


class InscripcionExamenDetalle(InscripcionExamenOut):
    """Inscripción con datos del examen anidados."""

    examen: Optional[ExamenOut] = None
    materia_nombre: Optional[str] = None
