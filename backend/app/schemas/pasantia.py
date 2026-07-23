"""
Schemas Pydantic — Fase 5C: Pasantías.
"""

from __future__ import annotations
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel


class EmpresaReceptoraCreate(BaseModel):
    nombre: str
    rubro: Optional[str] = None
    contacto: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    convenio_activo: bool = False


class EmpresaReceptoraOut(BaseModel):
    id: int
    nombre: str
    rubro: Optional[str]
    contacto: Optional[str]
    telefono: Optional[str]
    email: Optional[str]
    convenio_activo: bool

    model_config = {"from_attributes": True}


class PasantiaCreate(BaseModel):
    empresa_id: int
    fecha_inicio: date
    horas_requeridas: int


class PasantiaOut(BaseModel):
    id: int
    alumno_id: int
    alumno_nombre: Optional[str] = None
    empresa_id: int
    empresa_nombre: Optional[str] = None
    tutor_academico_id: Optional[int]
    tutor_nombre: Optional[str] = None
    fecha_inicio: date
    fecha_fin: Optional[date] = None
    horas_requeridas: int
    horas_completadas: int
    estado: str
    motivo_rechazo: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class PasantiaHorasUpdate(BaseModel):
    horas_completadas: int


class InformePasantiaCreate(BaseModel):
    tipo: str


class InformePasantiaOut(BaseModel):
    id: int
    pasantia_id: int
    tipo: str
    storage_key: Optional[str]
    fecha_entrega: datetime

    model_config = {"from_attributes": True}
