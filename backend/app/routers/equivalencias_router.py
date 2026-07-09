"""
Router Equivalencias — Fase 5D.

POST  /equivalencias/solicitudes
PUT   /equivalencias/{id}/materias/{mid}/resolver
POST  /equivalencias/examenes-suficiencia
GET   /equivalencias/alumno/{id}
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app import database
from app.dependencias import get_current_user, require_role
from app.schemas.equivalencia import (
    SolicitudEquivalenciaCreate, SolicitudEquivalenciaOut,
    EquivalenciaMateriaResolver, EquivalenciaMateriaOut,
    ExamenSuficienciaCreate, ExamenSuficienciaOut,
)
from app.services.equivalencia import (
    crear_solicitud, resolver_materia, crear_examen_suficiencia,
    obtener_equivalencias_alumno,
)
from app.models.equivalencia import EquivalenciaMateria

router = APIRouter(prefix="/equivalencias", tags=["equivalencias"])


@router.post("/solicitudes", response_model=SolicitudEquivalenciaOut,
             summary="Alumno crea solicitud de equivalencia")
def crear_solicitud_endpoint(
    data: SolicitudEquivalenciaCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_role("alumno")),
):
    try:
        solicitud = crear_solicitud(
            alumno_id=current_user["user_id"], tipo=data.tipo,
            universidad_origen=data.universidad_origen, db=db,
        )
        db.commit()
        db.refresh(solicitud)
        return solicitud
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=422, detail=str(e))


@router.put("/{id}/materias/{mid}/resolver", response_model=EquivalenciaMateriaOut,
           summary="Admin resuelve equivalencia de materia")
def resolver_materia_endpoint(
    id: int,
    mid: int,
    data: EquivalenciaMateriaResolver,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_role("admin")),
):
    try:
        eq = resolver_materia(
            solicitud_id=id, materia_eq_id=mid,
            resolucion=data.resolucion,
            materia_destino_id=data.materia_destino_id, db=db,
        )
        db.commit()
        db.refresh(eq)
        return eq
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/examenes-suficiencia", response_model=ExamenSuficienciaOut,
             summary="Registrar examen de suficiencia")
def crear_examen_endpoint(
    data: ExamenSuficienciaCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_role("admin")),
):
    try:
        examen = crear_examen_suficiencia(
            alumno_id=current_user["user_id"], materia_id=data.materia_id,
            fecha=data.fecha, db=db,
        )
        db.commit()
        db.refresh(examen)
        return examen
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/alumno/{id}", response_model=List[SolicitudEquivalenciaOut],
            summary="Equivalencias del alumno")
def listar_equivalencias(
    id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    return obtener_equivalencias_alumno(id, db)