"""
Router Becas — Fase 4.

Endpoints:
  GET  /becas/catalogo
  POST /becas/postulaciones
  PUT  /becas/postulaciones/{id}/revisar
  GET  /becas/alumno/{id}/activas
  GET  /becas/reportes/rendicion?fuente=X&periodo=Y
"""

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
import io

from sqlalchemy.orm import Session

from app import database
from app.dependencias import get_current_user, require_role
from app.models.financiero import (
    BecaActiva,
    BecaCatalogo,
    FuenteBeca,
    PostulacionBeca,
)
from app.schemas.financiero import (
    BecaCatalogoCreate,
    BecaCatalogoOut,
    BecaActivaOut,
    PostulacionCreate,
    PostulacionOut,
    PostulacionRevisar,
    FuenteBecaOut,
)
from app.services.financiero import (
    get_becas_activas_out,
    export_rendicion_excel,
)

router = APIRouter(prefix="/becas", tags=["becas"])


# ── Fuentes (lectura) ─────────────────────────────────────────────────


@router.get(
    "/fuentes",
    response_model=List[FuenteBecaOut],
    summary="Listar fuentes de beca",
)
def listar_fuentes(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    return db.query(FuenteBeca).order_by(FuenteBeca.nombre).all()


# ── Catálogo ──────────────────────────────────────────────────────────


@router.get(
    "/catalogo",
    response_model=List[BecaCatalogoOut],
    summary="Catálogo de becas disponibles",
)
def catalogo_becas(
    fuente_id: Optional[int] = None,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    q = db.query(BecaCatalogo)
    if fuente_id:
        q = q.filter(BecaCatalogo.fuente_id == fuente_id)
    return q.order_by(BecaCatalogo.nombre).all()


@router.post(
    "/catalogo",
    response_model=BecaCatalogoOut,
    summary="Crear beca en catálogo (admin)",
)
def crear_beca_catalogo(
    data: BecaCatalogoCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_role("admin")),
):
    fuente = db.query(FuenteBeca).filter(FuenteBeca.id == data.fuente_id).first()
    if not fuente:
        raise HTTPException(status_code=404, detail="Fuente beca no encontrada")

    beca = BecaCatalogo(
        nombre=data.nombre,
        fuente_id=data.fuente_id,
        porcentaje_descuento=data.porcentaje_descuento,
        monto_fijo=data.monto_fijo,
        requisitos=data.requisitos,
        cupos_totales=data.cupos_totales,
        cupos_disponibles=data.cupos_disponibles,
    )
    db.add(beca)
    db.commit()
    db.refresh(beca)
    return beca


# ── Postulaciones ─────────────────────────────────────────────────────


@router.post(
    "/postulaciones",
    response_model=PostulacionOut,
    summary="Postular a una beca (alumno)",
)
def postular_beca(
    data: PostulacionCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_role(["alumno", "admin"])),
):
    alumno_id = current_user.user_id

    beca = db.query(BecaCatalogo).filter(BecaCatalogo.id == data.beca_id).first()
    if not beca:
        raise HTTPException(status_code=404, detail="Beca no encontrada")

    # Cupos disponibles
    if beca.cupos_disponibles is not None and beca.cupos_disponibles <= 0:
        raise HTTPException(
            status_code=422, detail="No hay cupos disponibles para esta beca"
        )

    # Evitar doble postulación activa
    existente = (
        db.query(PostulacionBeca)
        .filter(
            PostulacionBeca.alumno_id == alumno_id,
            PostulacionBeca.beca_id == data.beca_id,
            PostulacionBeca.estado.in_(["pendiente", "en_revision"]),
        )
        .first()
    )
    if existente:
        raise HTTPException(
            status_code=409, detail="Ya tiene una postulación activa para esta beca"
        )

    post = PostulacionBeca(
        alumno_id=alumno_id,
        beca_id=data.beca_id,
        estado="pendiente",
        documentos_storage_keys=data.documentos_storage_keys,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


@router.get(
    "/postulaciones",
    response_model=List[PostulacionOut],
    summary="Listar postulaciones — OBLIGATORIO filtrar por fuente_id (admin)",
)
def listar_postulaciones(
    fuente_id: int = Query(
        ..., description="Filtro mandatorio: separar flujos internos de externos"
    ),
    estado: Optional[str] = None,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_role("admin")),
):
    """
    El filtro fuente_id es MANDATORIO para evitar mezclar flujos
    de revisión internos (Institucional UCA) con externos (ITAIPU, BECAL).
    """
    q = (
        db.query(PostulacionBeca)
        .join(BecaCatalogo, PostulacionBeca.beca_id == BecaCatalogo.id)
        .filter(BecaCatalogo.fuente_id == fuente_id)
    )
    if estado:
        q = q.filter(PostulacionBeca.estado == estado)
    return q.order_by(PostulacionBeca.fecha_postulacion.desc()).all()


@router.put(
    "/postulaciones/{postulacion_id}/revisar",
    response_model=PostulacionOut,
    summary="Revisar postulación — Comité (admin)",
)
def revisar_postulacion(
    postulacion_id: int,
    data: PostulacionRevisar,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_role("admin")),
):
    post = (
        db.query(PostulacionBeca).filter(PostulacionBeca.id == postulacion_id).first()
    )
    if not post:
        raise HTTPException(status_code=404, detail="Postulación no encontrada")
    if post.estado not in ("pendiente", "en_revision"):
        raise HTTPException(
            status_code=409, detail=f"Postulación ya cerrada (estado: {post.estado})"
        )

    post.estado = data.estado
    post.motivo_rechazo = data.motivo_rechazo
    post.revisado_por = current_user.user_id
    post.revisado_en = datetime.now(timezone.utc)

    # Si aprobada: crear BecaActiva
    if data.estado == "aprobada":
        beca = db.query(BecaCatalogo).filter(BecaCatalogo.id == post.beca_id).first()
        if beca:
            activa = BecaActiva(
                alumno_id=post.alumno_id,
                beca_id=beca.id,
                fuente_id=beca.fuente_id,
                periodo_inicio=datetime.now(timezone.utc).strftime("%Y-%m"),
                estado_renovacion="vigente",
                otorgado_por=current_user.user_id,
            )
            db.add(activa)
            # Reducir cupos
            if beca.cupos_disponibles is not None:
                beca.cupos_disponibles = max(0, beca.cupos_disponibles - 1)

    db.commit()
    db.refresh(post)
    return post


# ── Becas activas por alumno ──────────────────────────────────────────


@router.get(
    "/alumno/{alumno_id}/activas",
    response_model=List[BecaActivaOut],
    summary="Becas activas de un alumno",
)
def becas_activas_alumno(
    alumno_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role == "alumno" and current_user.user_id != alumno_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    return get_becas_activas_out(alumno_id, db)


# ── Reporte rendición ─────────────────────────────────────────────────


@router.get(
    "/reportes/rendicion",
    summary="Exportar rendición de becas (Excel/CSV)",
)
def rendicion_becas(
    fuente: str = Query(..., description="Nombre de la fuente. Ej: ITAIPU"),
    periodo: Optional[str] = Query(None, description="Ej: 2026-06"),
    formato: str = Query("excel", description="excel | csv"),
    db: Session = Depends(database.get_db),
    current_user=Depends(require_role("admin")),
):
    """
    Exporta rendición filtrada por fuente (MANDATORIO).
    Columnas: Alumno, Cédula, Carrera, Monto Becado, Período.
    """
    fuente_obj = db.query(FuenteBeca).filter(FuenteBeca.nombre == fuente).first()
    if not fuente_obj:
        raise HTTPException(status_code=404, detail=f"Fuente '{fuente}' no encontrada")

    excel_bytes = export_rendicion_excel(fuente_obj.id, periodo, db)
    filename = f"rendicion_{fuente.lower().replace(' ', '_')}_{periodo or 'todos'}.xlsx"

    return StreamingResponse(
        io.BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
