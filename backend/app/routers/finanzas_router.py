"""
Router Finanzas — Fase 4 + 4B.

Endpoints:
  POST /finanzas/conceptos
  POST /finanzas/cuotas/generar
  GET  /finanzas/alumno/{id}/cuotas
  POST /finanzas/pagos
  GET  /finanzas/pagos/{id}/comprobante
  POST /finanzas/pagos/{id}/comprobante/reintentar
  GET  /finanzas/comprobantes/pendientes
  GET  /finanzas/alumno/{id}/estado-deuda-inscripcion
"""

from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app import database
from app.dependencias import get_current_user, require_role
from app.models.financiero import (
    ConceptoArancel,
    Cuota,
    Pago,
    Comprobante,
)
from app.schemas.financiero import (
    ConceptoArancelCreate,
    ConceptoArancelOut,
    GenerarCuotasRequest,
    CuotaOut,
    PagoCreate,
    PagoOut,
    ComprobanteOut,
    ComprobantePendienteOut,
    EstadoDeudaOut,
)
from app.services.financiero import (
    generar_cuotas_alumno,
    cuota_to_out,
    registrar_pago,
    verificar_deuda_inscripcion,
)
from app.services.facturacion_electronica import procesar_facturacion, MAX_INTENTOS

router = APIRouter(prefix="/finanzas", tags=["finanzas"])


# ── Conceptos arancel ─────────────────────────────────────────────────


@router.post(
    "/conceptos",
    response_model=ConceptoArancelOut,
    summary="Crear concepto de arancel",
)
def crear_concepto(
    data: ConceptoArancelCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_role("admin")),
):
    concepto = ConceptoArancel(
        nombre=data.nombre,
        carrera_id=data.carrera_id,
        monto_base=data.monto_base,
        periodicidad=data.periodicidad,
    )
    db.add(concepto)
    db.commit()
    db.refresh(concepto)
    return concepto


@router.get(
    "/conceptos",
    response_model=List[ConceptoArancelOut],
    summary="Listar conceptos de arancel",
)
def listar_conceptos(
    carrera_id: Optional[int] = None,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_role(["admin"])),
):
    q = db.query(ConceptoArancel).filter(ConceptoArancel.activo == True)  # noqa: E712
    if carrera_id:
        q = q.filter(
            (ConceptoArancel.carrera_id == carrera_id)
            | (ConceptoArancel.carrera_id == None)  # noqa: E711
        )
    return q.all()


# ── Generación de cuotas ──────────────────────────────────────────────


@router.post(
    "/cuotas/generar",
    response_model=List[CuotaOut],
    summary="Generar cuotas para un alumno",
)
def generar_cuotas(
    data: GenerarCuotasRequest,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_role("admin")),
):
    try:
        with db.begin_nested():
            cuotas = generar_cuotas_alumno(
                alumno_id=data.alumno_id,
                concepto_id=data.concepto_id,
                periodos=data.periodos,
                fecha_vencimiento_base=data.fecha_vencimiento_base,
                generado_por=current_user["user_id"],
                db=db,
            )
        db.commit()
        for c in cuotas:
            db.refresh(c)
        return [cuota_to_out(c) for c in cuotas]
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


# ── Cuotas por alumno ─────────────────────────────────────────────────


@router.get(
    "/alumno/{alumno_id}/cuotas",
    response_model=List[CuotaOut],
    summary="Cuotas de un alumno",
)
def cuotas_alumno(
    alumno_id: int,
    estado: Optional[str] = None,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    # Alumno solo puede ver las suyas
    if current_user["role"] == "alumno" and current_user["user_id"] != alumno_id:
        raise HTTPException(status_code=403, detail="No autorizado")

    q = db.query(Cuota).filter(Cuota.alumno_id == alumno_id)
    if estado:
        q = q.filter(Cuota.estado == estado)
    cuotas = q.order_by(Cuota.fecha_vencimiento.asc()).all()
    return [cuota_to_out(c) for c in cuotas]


# ── Pagos ─────────────────────────────────────────────────────────────


@router.post(
    "/pagos",
    response_model=PagoOut,
    summary="Registrar un pago (inmutable)",
)
def crear_pago(
    data: PagoCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_role(["admin"])),
):
    """
    Pagos INMUTABLES. No existe endpoint PUT/DELETE.
    Para correcciones usar pago_ajuste_ref_id con nota_ajuste.

    Al registrar el pago se crea un Comprobante en estado 'pendiente' y
    se dispara la emisión fiscal en background (guarani.app) — un fallo
    del proveedor externo nunca bloquea ni revierte el pago académico.
    """
    try:
        with db.begin_nested():
            pago = registrar_pago(
                cuota_id=data.cuota_id,
                monto_pagado=data.monto_pagado,
                metodo=data.metodo,
                registrado_por=current_user["user_id"],
                db=db,
                referencia=data.referencia,
                pago_ajuste_ref_id=data.pago_ajuste_ref_id,
                nota_ajuste=data.nota_ajuste,
            )
        db.commit()
        db.refresh(pago)

        comprobante = Comprobante(
            pago_id=pago.id, tipo="factura", estado_emision="pendiente"
        )
        db.add(comprobante)
        db.commit()
        db.refresh(comprobante)

        background_tasks.add_task(procesar_facturacion, pago.id, comprobante.id)

        return pago
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get(
    "/pagos/{pago_id}/comprobante",
    response_model=ComprobanteOut,
    summary="Obtener comprobante de pago",
)
def get_comprobante(
    pago_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    pago = db.query(Pago).filter(Pago.id == pago_id).first()
    if not pago:
        raise HTTPException(status_code=404, detail="Pago no encontrado")

    # Alumno solo puede ver comprobantes de sus propias cuotas
    if current_user["role"] == "alumno":
        cuota = db.query(Cuota).filter(Cuota.id == pago.cuota_id).first()
        if not cuota or cuota.alumno_id != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="No autorizado")

    comp = db.query(Comprobante).filter(Comprobante.pago_id == pago_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Comprobante no encontrado")
    return comp


@router.post(
    "/pagos/{pago_id}/comprobante/reintentar",
    response_model=ComprobanteOut,
    summary="Forzar reintento manual de emisión de comprobante (admin)",
)
async def reintentar_comprobante(
    pago_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_role(["admin"])),
):
    comp = db.query(Comprobante).filter(Comprobante.pago_id == pago_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Comprobante no encontrado")
    if comp.intentos >= MAX_INTENTOS:
        raise HTTPException(
            status_code=422,
            detail=f"Comprobante alcanzó el máximo de {MAX_INTENTOS} intentos",
        )

    await procesar_facturacion(pago_id, comp.id)
    db.refresh(comp)
    return comp


@router.get(
    "/comprobantes/pendientes",
    response_model=List[ComprobantePendienteOut],
    summary="Listar comprobantes pendientes o en error (admin)",
)
def listar_comprobantes_pendientes(
    db: Session = Depends(database.get_db),
    current_user=Depends(require_role(["admin"])),
):
    comps = (
        db.query(Comprobante)
        .filter(Comprobante.estado_emision.in_(["pendiente", "error", "reintentando"]))
        .all()
    )
    out = []
    for c in comps:
        pago = c.pago
        alumno = pago.cuota.alumno if pago and pago.cuota else None
        out.append(
            ComprobantePendienteOut(
                id=c.id,
                pago_id=c.pago_id,
                alumno_nombre=alumno.nombre if alumno else "—",
                monto_pagado=pago.monto_pagado if pago else Decimal("0"),
                estado_emision=c.estado_emision,
                intentos=c.intentos,
                ultimo_error=c.ultimo_error,
            )
        )
    return out


# ── Estado deuda para inscripción (endpoint interno) ──────────────────


@router.get(
    "/alumno/{alumno_id}/estado-deuda-inscripcion",
    response_model=EstadoDeudaOut,
    summary="Verificar estado de deuda para inscripción (uso interno)",
)
def estado_deuda_inscripcion(
    alumno_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_role("admin")),
):
    return verificar_deuda_inscripcion(
        alumno_id=alumno_id,
        db=db,
        es_admin=True,
    )
