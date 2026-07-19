"""
Schemas Pydantic — Fase 4: Módulo Financiero + Becas Diferenciadas.

Todos los montos monetarios usan Decimal (mapea a Numeric(12,2) en la DB).
"""

from __future__ import annotations
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field


# ═══════════════════════════════════════════════════════════════════════
# FUENTES BECA
# ═══════════════════════════════════════════════════════════════════════


class FuenteBecaOut(BaseModel):
    id: int
    nombre: str
    tipo: str
    es_externa: bool
    requiere_reporte_externo: bool
    editable_porcentaje: bool

    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════════════
# BECAS CATÁLOGO
# ═══════════════════════════════════════════════════════════════════════


class BecaCatalogoCreate(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=200)
    fuente_id: int
    porcentaje_descuento: Decimal = Field(..., ge=0, le=100)
    monto_fijo: Optional[Decimal] = None
    requisitos: Optional[str] = None
    cupos_totales: Optional[int] = None
    cupos_disponibles: Optional[int] = None


class BecaCatalogoOut(BaseModel):
    id: int
    nombre: str
    fuente_id: int
    fuente: FuenteBecaOut
    porcentaje_descuento: Decimal
    monto_fijo: Optional[Decimal]
    requisitos: Optional[str]
    cupos_totales: Optional[int]
    cupos_disponibles: Optional[int]

    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════════════
# POSTULACIONES
# ═══════════════════════════════════════════════════════════════════════


class PostulacionCreate(BaseModel):
    beca_id: int
    documentos_storage_keys: Optional[List[str]] = None


class PostulacionRevisar(BaseModel):
    estado: str = Field(..., pattern="^(en_revision|aprobada|rechazada)$")
    motivo_rechazo: Optional[str] = None


class PostulacionOut(BaseModel):
    id: int
    alumno_id: int
    beca_id: int
    beca: BecaCatalogoOut
    estado: str
    fecha_postulacion: datetime
    documentos_storage_keys: Optional[List[str]]
    motivo_rechazo: Optional[str]
    revisado_por: Optional[int]
    revisado_en: Optional[datetime]

    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════════════
# BECAS ACTIVAS  (shape exacto del enunciado)
# ═══════════════════════════════════════════════════════════════════════


class BecaActivaOut(BaseModel):
    id: int
    beca_nombre: str
    fuente: str
    es_externa: bool
    porcentaje_descuento: Decimal
    periodo_inicio: str
    periodo_fin: Optional[str]
    promedio_minimo_requerido: Optional[Decimal]
    promedio_actual: Optional[Decimal]
    estado_renovacion: str

    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════════════
# CONCEPTOS ARANCEL
# ═══════════════════════════════════════════════════════════════════════


class ConceptoArancelCreate(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=200)
    carrera_id: Optional[int] = None
    monto_base: Decimal = Field(..., gt=0)
    periodicidad: str = Field(default="mensual", max_length=80)


class ConceptoArancelOut(BaseModel):
    id: int
    nombre: str
    carrera_id: Optional[int]
    monto_base: Decimal
    periodicidad: str
    activo: bool

    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════════════
# CUOTAS  (incluye fuente de beca para trazabilidad)
# ═══════════════════════════════════════════════════════════════════════


class GenerarCuotasRequest(BaseModel):
    alumno_id: int
    concepto_id: int
    periodos: List[str] = Field(
        ..., min_length=1, description="Lista de períodos ej. ['2026-01','2026-02',...]"
    )
    fecha_vencimiento_base: date = Field(
        ..., description="Fecha de vencimiento para el primer período"
    )


class CuotaOut(BaseModel):
    id: int
    alumno_id: int
    concepto_id: int
    periodo: str
    monto: Decimal
    monto_descuento: Decimal
    monto_a_pagar: Decimal  # monto - monto_descuento calculado
    fecha_vencimiento: date
    estado: str
    beca_nombre: Optional[str]  # trazabilidad
    fuente_beca: Optional[str]  # trazabilidad
    es_beca_externa: Optional[bool]
    pago_id: Optional[int] = None  # último pago registrado (Fase 4B)
    comprobante_estado: Optional[str] = None  # estado_emision del comprobante fiscal
    comprobante_url_pdf: Optional[str] = None

    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════════════
# PAGOS
# ═══════════════════════════════════════════════════════════════════════


class PagoCreate(BaseModel):
    cuota_id: int
    monto_pagado: Decimal = Field(..., gt=0)
    metodo: str = Field(
        ..., pattern="^(transferencia|efectivo|cheque|tarjeta|deposito)$"
    )
    referencia: Optional[str] = None
    nota_ajuste: Optional[str] = None
    pago_ajuste_ref_id: Optional[int] = None  # para ajustes


class PagoOut(BaseModel):
    id: int
    cuota_id: int
    monto_pagado: Decimal
    fecha_pago: datetime
    metodo: str
    referencia: Optional[str]
    registrado_por: int
    es_ajuste: bool
    pago_ajuste_ref_id: Optional[int]

    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════════════
# COMPROBANTES
# ═══════════════════════════════════════════════════════════════════════


class ComprobanteOut(BaseModel):
    id: int
    pago_id: int
    tipo: str
    numero_comprobante: Optional[str]
    cdc: Optional[str]
    timbrado: Optional[str]
    url_pdf: Optional[str]
    storage_key: Optional[str]
    estado_emision: str
    intentos: int
    ultimo_error: Optional[str]
    fecha_emision: Optional[datetime]

    model_config = {"from_attributes": True}


class ComprobantePendienteOut(BaseModel):
    """Vista para el panel admin de comprobantes en error/pendiente."""

    id: int
    pago_id: int
    alumno_nombre: str
    monto_pagado: Decimal
    estado_emision: str
    intentos: int
    ultimo_error: Optional[str]

    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════════════
# ESTADO DEUDA PARA INSCRIPCIÓN
# ═══════════════════════════════════════════════════════════════════════


class CuotaVencidaDetalle(BaseModel):
    cuota_id: int
    periodo: str
    monto_a_pagar: Decimal
    fecha_vencimiento: date
    dias_vencida: int


class EstadoDeudaOut(BaseModel):
    bloqueado: bool
    cuotas_vencidas: int
    max_permitidas: int
    detalle: List[CuotaVencidaDetalle]
    tiene_beca_100: bool  # excepción ITAIPU / beca total
    override_disponible: bool  # solo admins pueden activarlo


# ═══════════════════════════════════════════════════════════════════════
# RENDICIÓN  (export Excel/CSV)
# ═══════════════════════════════════════════════════════════════════════


class RendicionRow(BaseModel):
    alumno_nombre: str
    cedula: Optional[str]
    carrera: str
    beca_nombre: str
    fuente: str
    porcentaje_descuento: Decimal
    monto_becado: Decimal  # sum(monto_descuento) en cuotas del período
    periodo: str


# ═══════════════════════════════════════════════════════════════════════
# PAGOS ONLINE (gateway stub)
# ═══════════════════════════════════════════════════════════════════════


class PagoOnlineInitRequest(BaseModel):
    cuota_id: int


class PagoOnlineInitResponse(BaseModel):
    pago_id: int
    transaction_id: str
    redirect_url: str
    monto: Decimal


class PagoOnlineConfirmRequest(BaseModel):
    transaction_id: str
    estado: str = "confirmado"  # | "rechazado"


class PagoOnlineOut(BaseModel):
    id: int
    cuota_id: int
    monto: Decimal
    transaction_id: Optional[str]
    estado: str
    creado_en: Optional[datetime]

    model_config = {"from_attributes": True}
