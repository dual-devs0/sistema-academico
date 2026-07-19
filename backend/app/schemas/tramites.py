"""
Schemas Pydantic — Fase 5A: Solicitudes y trámites.
"""

from __future__ import annotations
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel


class TipoTramiteOut(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str]
    requiere_aprobacion: bool
    dias_estimados: Optional[int]

    model_config = {"from_attributes": True}


class SolicitudCreate(BaseModel):
    tipo_tramite_id: int


class SolicitudOut(BaseModel):
    id: int
    alumno_id: int
    tipo_tramite_id: int
    estado: str
    fecha_solicitud: datetime
    fecha_resolucion: Optional[datetime]
    resuelto_por: Optional[int]
    storage_key_resultado: Optional[str]
    motivo_rechazo: Optional[str]

    model_config = {"from_attributes": True}


class SolicitudResolverRequest(BaseModel):
    estado: Literal["resuelta", "rechazada"]
    motivo_rechazo: Optional[str] = None
