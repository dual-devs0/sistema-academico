"""
Router Equivalencias — Fase 5D.

POST  /equivalencias/solicitudes
PUT   /equivalencias/{id}/materias/{mid}/resolver
POST  /equivalencias/examenes-suficiencia
GET   /equivalencias/alumno/{id}
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app import database
from app.dependencias import get_current_user, require_role
from app.schemas.equivalencia import (
    SolicitudEquivalenciaCreate,
    SolicitudEquivalenciaOut,
    EquivalenciaMateriaResolver,
    EquivalenciaMateriaOut,
    ExamenSuficienciaCreate,
    ExamenSuficienciaOut,
)
from app.services.equivalencia import (
    crear_solicitud,
    resolver_materia,
    crear_examen_suficiencia,
    obtener_equivalencias_alumno,
)

router = APIRouter(prefix="/equivalencias", tags=["equivalencias"])


@router.get(
    "/solicitudes",
    response_model=List[SolicitudEquivalenciaOut],
    summary="Admin lista todas las solicitudes (filtro opcional ?estado=)",
)
def listar_todas_solicitudes(
    estado: Optional[str] = None,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_role("admin")),
):
    from app.models.equivalencia import SolicitudEquivalencia
    from sqlalchemy.orm import joinedload
    q = db.query(SolicitudEquivalencia).options(joinedload(SolicitudEquivalencia.alumno))
    if estado:
        q = q.filter(SolicitudEquivalencia.estado == estado)
    solicitudes = q.order_by(SolicitudEquivalencia.id.desc()).all()
    for s in solicitudes:
        s.alumno_nombre = s.alumno.nombre if s.alumno else None
    return solicitudes


@router.get(
    "/materias",
    response_model=List[dict],
    summary="Lista de materias disponibles para equivalencia",
)
def listar_materias(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    from app.models.materia import Materia
    materias = db.query(Materia).order_by(Materia.nombre).all()
    return [{"id": m.id, "nombre": m.nombre, "codigo": m.codigo or ""} for m in materias]


@router.post(
    "/solicitudes",
    response_model=SolicitudEquivalenciaOut,
    summary="Alumno crea solicitud de equivalencia",
)
def crear_solicitud_endpoint(
    data: SolicitudEquivalenciaCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_role("alumno")),
):
    try:
        solicitud = crear_solicitud(
            alumno_id=current_user.user_id,
            tipo=data.tipo,
            universidad_origen=data.universidad_origen,
            db=db,
        )
        db.commit()
        db.refresh(solicitud)
        return solicitud
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=422, detail=str(e))


@router.put(
    "/{id}/materias/{mid}/resolver",
    response_model=EquivalenciaMateriaOut,
    summary="Admin resuelve equivalencia de materia",
)
def resolver_materia_endpoint(
    id: int,
    mid: int,
    data: EquivalenciaMateriaResolver,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_role("admin")),
):
    try:
        eq = resolver_materia(
            solicitud_id=id,
            materia_eq_id=mid,
            resolucion=data.resolucion,
            materia_destino_id=data.materia_destino_id,
            db=db,
        )
        db.commit()
        db.refresh(eq)
        return eq
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=422, detail=str(e))


@router.put(
    "/{solicitud_id}/resolver",
    response_model=EquivalenciaMateriaOut,
    summary="Admin resuelve la primera materia pendiente de una solicitud",
)
def resolver_solicitud_endpoint(
    solicitud_id: int,
    data: EquivalenciaMateriaResolver,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_role("admin")),
):
    from app.models.equivalencia import EquivalenciaMateria
    eq = (
        db.query(EquivalenciaMateria)
        .filter(
            EquivalenciaMateria.solicitud_id == solicitud_id,
            EquivalenciaMateria.resolucion.is_(None),
        )
        .first()
    )
    if not eq:
        raise HTTPException(status_code=404, detail="No hay materias pendientes en esta solicitud")
    try:
        result = resolver_materia(
            solicitud_id=solicitud_id,
            materia_eq_id=eq.id,
            resolucion=data.resolucion,
            materia_destino_id=data.materia_destino_id,
            db=db,
        )
        db.commit()
        db.refresh(result)
        return result
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=422, detail=str(e))


@router.post(
    "/examenes-suficiencia",
    response_model=ExamenSuficienciaOut,
    summary="Registrar examen de suficiencia",
)
def crear_examen_endpoint(
    data: ExamenSuficienciaCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_role("admin")),
):
    from app.models.users import User
    alumno = db.query(User).filter(User.id == data.alumno_id, User.role == "alumno").first()
    if not alumno:
        raise HTTPException(status_code=422, detail="El alumno_id proporcionado no existe o no es un alumno")
    try:
        examen = crear_examen_suficiencia(
            alumno_id=data.alumno_id,
            materia_id=data.materia_id,
            fecha=data.fecha,
            db=db,
        )
        db.commit()
        db.refresh(examen)
        return examen
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=422, detail=str(e))


@router.get(
    "/alumno/{id}",
    response_model=List[SolicitudEquivalenciaOut],
    summary="Equivalencias del alumno",
)
def listar_equivalencias(
    id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != "admin" and current_user.user_id != id:
        raise HTTPException(status_code=403, detail="No autorizado")
    if current_user.role not in ("admin", "alumno"):
        raise HTTPException(status_code=403, detail="No autorizado")
    return obtener_equivalencias_alumno(id, db)
