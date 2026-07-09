"""
Router Trámites — Fase 5A.

Endpoints:
  GET  /tramites/tipos
  POST /tramites/solicitudes
  GET  /tramites/solicitudes/mias
  PUT  /tramites/solicitudes/{id}/resolver
  GET  /tramites/solicitudes/{id}/descargar
"""
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app import database
from app.dependencias import get_current_user, require_role
from app.models.tramites import Solicitud, TipoTramite
from app.schemas.tramites import SolicitudCreate, SolicitudOut, TipoTramiteOut
from app.services.storage import obtener_url_firmada, subir_archivo
from app.services.tramites import crear_solicitud

router = APIRouter(prefix="/tramites", tags=["tramites"])

ESTADOS_RESOLUCION_VALIDOS = ("resuelta", "rechazada")


@router.get("/tipos", response_model=List[TipoTramiteOut], summary="Catálogo de tipos de trámite")
def listar_tipos(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    return db.query(TipoTramite).all()


@router.post("/solicitudes", response_model=SolicitudOut, summary="Alumno crea una solicitud")
def crear_solicitud_endpoint(
    data: SolicitudCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_role("alumno")),
):
    try:
        solicitud = crear_solicitud(current_user["user_id"], data.tipo_tramite_id, db)
        db.commit()
        db.refresh(solicitud)
        return solicitud
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=422, detail=str(e))


@router.get(
    "/solicitudes/mias",
    response_model=List[SolicitudOut],
    summary="Alumno: solicitudes propias · Admin: todas (filtro opcional ?estado=)",
)
def listar_mis_solicitudes(
    estado: Optional[str] = None,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    q = db.query(Solicitud)
    if current_user["role"] == "admin":
        if estado:
            q = q.filter(Solicitud.estado == estado)
    elif current_user["role"] == "alumno":
        q = q.filter(Solicitud.alumno_id == current_user["user_id"])
    else:
        raise HTTPException(status_code=403, detail="No autorizado")
    return q.order_by(Solicitud.fecha_solicitud.desc()).all()


@router.put("/solicitudes/{solicitud_id}/resolver", response_model=SolicitudOut, summary="Admin resuelve una solicitud manual")
async def resolver_solicitud(
    solicitud_id: int,
    estado: str = Form(...),
    motivo_rechazo: Optional[str] = Form(None),
    archivo: Optional[UploadFile] = File(None),
    db: Session = Depends(database.get_db),
    current_user=Depends(require_role("admin")),
):
    if estado not in ESTADOS_RESOLUCION_VALIDOS:
        raise HTTPException(status_code=422, detail=f"estado debe ser uno de {ESTADOS_RESOLUCION_VALIDOS}")

    solicitud = db.query(Solicitud).filter(Solicitud.id == solicitud_id).first()
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    if estado == "resuelta" and archivo is not None:
        contenido = await archivo.read()
        try:
            key = subir_archivo(contenido, archivo.filename or "resultado.pdf", prefix="tramite")
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))
        solicitud.storage_key_resultado = key

    solicitud.estado = estado
    solicitud.motivo_rechazo = motivo_rechazo if estado == "rechazada" else None
    solicitud.resuelto_por = current_user["user_id"]
    solicitud.fecha_resolucion = datetime.now(timezone.utc)
    db.commit()
    db.refresh(solicitud)
    return solicitud


@router.get("/solicitudes/{solicitud_id}/descargar", summary="Descargar el resultado de una solicitud resuelta")
def descargar_resultado(
    solicitud_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    solicitud = db.query(Solicitud).filter(Solicitud.id == solicitud_id).first()
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    if current_user["role"] != "admin" and current_user["user_id"] != solicitud.alumno_id:
        raise HTTPException(status_code=403, detail="No autorizado")

    if not solicitud.storage_key_resultado:
        raise HTTPException(status_code=404, detail="La solicitud todavía no tiene un resultado disponible")

    return {"download_url": obtener_url_firmada(solicitud.storage_key_resultado)}
