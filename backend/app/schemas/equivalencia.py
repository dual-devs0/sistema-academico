"""
Schemas Pydantic — Fase 5D: Equivalencias y suficiencia.
"""

from __future__ import annotations
from datetime import date
from typing import Optional
from pydantic import BaseModel


class SolicitudEquivalenciaCreate(BaseModel):
    tipo: str
    universidad_origen: Optional[str] = None


class SolicitudEquivalenciaOut(BaseModel):
    id: int
    alumno_id: int
    tipo: str
    universidad_origen: Optional[str]
    estado: str

    model_config = {"from_attributes": True}


class EquivalenciaMateriaResolver(BaseModel):
    resolucion: str
    materia_destino_id: Optional[int] = None


class EquivalenciaMateriaOut(BaseModel):
    id: int
    solicitud_id: int
    materia_origen_nombre: str
    materia_destino_id: Optional[int]
    programa_analitico_storage_key: Optional[str]
    resolucion: Optional[str]

    model_config = {"from_attributes": True}


class ExamenSuficienciaCreate(BaseModel):
    alumno_id: int
    materia_id: int
    fecha: date


class ExamenSuficienciaOut(BaseModel):
    id: int
    alumno_id: int
    materia_id: int
    fecha: date
    resultado: Optional[str]

    model_config = {"from_attributes": True}
