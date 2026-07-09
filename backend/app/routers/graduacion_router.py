"""
Router Graduación — Fase 5B.

GET    /graduacion/alumno/{id}/condicion
POST   /graduacion/procesos
PUT    /graduacion/procesos/{id}/tutor
PUT    /graduacion/procesos/{id}/etapas/{eid}
GET    /graduacion/procesos/{id}/solvencia
GET    /graduacion/procesos/{id}/documentos-cones
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app import database
from app.dependencias import get_current_user, require_role
from app.schemas.graduacion import (
    CondicionEgresoOut,
    ProcesoGraduacionCreate,
    ProcesoGraduacionOut,
    ProcesoGraduacionTutorUpdate,
    EtapaTesisUpdate,
    EtapaTesisOut,
    VerificacionSolvenciaOut,
)
from app.services.graduacion import (
    verificar_condicion_egreso,
    iniciar_proceso,
    asignar_tutor,
    actualizar_etapa,
)
from app.models.graduacion import ProcesoGraduacion, VerificacionSolvencia

router = APIRouter(prefix="/graduacion", tags=["graduacion"])


@router.get(
    "/alumno/{id}/condicion",
    response_model=CondicionEgresoOut,
    summary="Verificar condición de egreso del alumno",
)
def check_condicion_egreso(
    id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    return verificar_condicion_egreso(id, db)


@router.post(
    "/procesos",
    response_model=ProcesoGraduacionOut,
    summary="Iniciar proceso de graduación",
)
def crear_proceso(
    data: ProcesoGraduacionCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_role("admin")),
):
    try:
        proceso = iniciar_proceso(alumno_id=data.alumno_id, db=db)
        db.commit()
        db.refresh(proceso)
        return proceso
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=422, detail=str(e))


@router.put(
    "/procesos/{id}/tutor",
    response_model=ProcesoGraduacionOut,
    summary="Asignar tutor al proceso",
)
def asignar_tutor_endpoint(
    id: int,
    data: ProcesoGraduacionTutorUpdate,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_role("admin")),
):
    try:
        proceso = asignar_tutor(proceso_id=id, tutor_id=data.tutor_id, db=db)
        db.commit()
        db.refresh(proceso)
        return proceso
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=422, detail=str(e))


@router.put(
    "/procesos/{id}/etapas/{eid}",
    response_model=EtapaTesisOut,
    summary="Actualizar estado de etapa de tesis",
)
def actualizar_etapa_endpoint(
    id: int,
    eid: int,
    data: EtapaTesisUpdate,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_role("admin")),
):
    try:
        etapa = actualizar_etapa(
            etapa_id=eid, estado=data.estado, observaciones=data.observaciones, db=db
        )
        db.commit()
        db.refresh(etapa)
        return etapa
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=422, detail=str(e))


@router.get(
    "/procesos/{id}/solvencia",
    response_model=List[VerificacionSolvenciaOut],
    summary="Verificaciones de solvencia del proceso",
)
def listar_solvencia(
    id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    proceso = db.query(ProcesoGraduacion).filter(ProcesoGraduacion.id == id).first()
    if not proceso:
        raise HTTPException(status_code=404, detail="Proceso no encontrado")
    return (
        db.query(VerificacionSolvencia)
        .filter(
            VerificacionSolvencia.proceso_id == id,
        )
        .all()
    )


@router.get(
    "/procesos/{id}/documentos-cones", summary="Listar URL de documentos de Cones"
)
def documentos_cones(
    id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    proceso = db.query(ProcesoGraduacion).filter(ProcesoGraduacion.id == id).first()
    if not proceso:
        raise HTTPException(status_code=404, detail="Proceso no encontrado")
    return {"mensaje": "Endpoint pendiente de integración con CONES"}  # placeholder
