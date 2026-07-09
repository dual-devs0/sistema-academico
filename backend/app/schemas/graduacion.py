"""
Schemas Pydantic — Fase 5B: Graduación y tesis.
"""

from __future__ import annotations
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel


class CondicionEgresoOut(BaseModel):
    cumple_creditos: bool
    creditos_aprobados: int
    creditos_totales: int
    cumple_ppa: bool
    ppa_actual: Optional[float]
    ppa_minimo: float
    cumple_pasantia: bool
    pasantia_exigida: bool
    pasantia_completada: bool
    puede_graduarse: bool
    motivo: Optional[str]


class ProcesoGraduacionCreate(BaseModel):
    alumno_id: int


class ProcesoGraduacionOut(BaseModel):
    id: int
    alumno_id: int
    fecha_inicio: datetime
    estado: str
    tutor_id: Optional[int]

    model_config = {"from_attributes": True}


class ProcesoGraduacionTutorUpdate(BaseModel):
    tutor_id: int


class EtapaTesisCreate(BaseModel):
    nombre_etapa: str
    fecha_limite: Optional[date] = None


class EtapaTesisUpdate(BaseModel):
    estado: str
    observaciones: Optional[str] = None


class EtapaTesisOut(BaseModel):
    id: int
    proceso_id: int
    nombre_etapa: str
    fecha_limite: Optional[date]
    estado: str
    observaciones: Optional[str]

    model_config = {"from_attributes": True}


class VerificacionSolvenciaOut(BaseModel):
    id: int
    proceso_id: int
    solvencia_financiera: bool
    solvencia_biblioteca: bool
    fecha_verificacion: datetime

    model_config = {"from_attributes": True}
