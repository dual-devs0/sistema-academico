"""
Router Exámenes Regulares — Fase 7E.

Endpoints:
  GET  /examenes/disponibles         — exámenes con cupos (alumno)
  GET  /examenes/inscriptos          — mis inscripciones (alumno)
  GET  /examenes/                    — listar todos (admin)
  POST /examenes/                    — crear examen (admin)
  POST /examenes/inscripciones       — inscribirse (alumno)
  DELETE /examenes/inscripciones/{id} — cancelar inscripción (alumno)
"""

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import database
from app.dependencias import get_current_user, require_role
from app.models.examen import Examen, InscripcionExamen
from app.models.materia import Materia
from app.models.users import User
from app.schemas.examen_schema import (
    ExamenCreate,
    ExamenOut,
    ExamenDisponible,
    InscripcionExamenCreate,
    InscripcionExamenOut,
    InscripcionExamenDetalle,
)

router = APIRouter(prefix="/examenes", tags=["examenes"])


# ── Listar todos (admin) ──────────────────────────────────────────────


@router.get("/", response_model=List[ExamenOut], summary="Listar exámenes (admin)")
def listar_examenes(
    periodo: Optional[str] = None,
    materia_id: Optional[int] = None,
    estado: Optional[str] = None,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_role("admin")),
):
    q = db.query(Examen)
    if periodo:
        q = q.filter(Examen.periodo == periodo)
    if materia_id:
        q = q.filter(Examen.materia_id == materia_id)
    if estado:
        q = q.filter(Examen.estado == estado)
    return q.order_by(Examen.fecha.desc()).all()


# ── Crear examen (admin) ─────────────────────────────────────────────


@router.post("/", response_model=ExamenOut, summary="Crear examen (admin)")
def crear_examen(
    data: ExamenCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_role("admin")),
):
    materia = db.query(Materia).filter(Materia.id == data.materia_id).first()
    if not materia:
        raise HTTPException(status_code=404, detail="Materia no encontrada")

    examen = Examen(
        materia_id=data.materia_id,
        fecha=data.fecha,
        hora_inicio=data.hora_inicio,
        hora_fin=data.hora_fin,
        aula=data.aula,
        tipo=data.tipo,
        periodo=data.periodo,
        cupos=data.cupos,
        profesor_id=data.profesor_id,
    )
    db.add(examen)
    db.commit()
    db.refresh(examen)
    return examen


# ── Disponibles (alumno) ─────────────────────────────────────────────


@router.get(
    "/disponibles",
    response_model=List[ExamenDisponible],
    summary="Exámenes disponibles para inscripción",
)
def examenes_disponibles(
    periodo: Optional[str] = None,
    materia_id: Optional[int] = None,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    alumno_id = current_user["user_id"]

    q = (
        db.query(Examen, Materia.nombre.label("materia_nombre"))
        .join(Materia, Examen.materia_id == Materia.id)
        .filter(Examen.estado == "programado")
    )
    if periodo:
        q = q.filter(Examen.periodo == periodo)
    if materia_id:
        q = q.filter(Examen.materia_id == materia_id)

    rows = q.order_by(Examen.fecha).all()

    result = []
    for examen, materia_nombre in rows:
        # Contar inscripciones activas
        inscritos = (
            db.query(func.count(InscripcionExamen.id))
            .filter(
                InscripcionExamen.examen_id == examen.id,
                InscripcionExamen.estado == "inscripto",
            )
            .scalar()
        )

        cupos_disponibles = None
        if examen.cupos is not None:
            cupos_disponibles = max(0, examen.cupos - inscritos)

        # Chequear si el alumno ya está inscripto
        ya_inscripto = (
            db.query(InscripcionExamen)
            .filter(
                InscripcionExamen.examen_id == examen.id,
                InscripcionExamen.alumno_id == alumno_id,
                InscripcionExamen.estado == "inscripto",
            )
            .first()
            is not None
        )

        # Obtener nombre del profesor
        profesor_nombre = None
        if examen.profesor_id:
            prof = db.query(User).filter(User.id == examen.profesor_id).first()
            if prof:
                profesor_nombre = prof.nombre

        result.append(
            ExamenDisponible(
                id=examen.id,
                materia_id=examen.materia_id,
                fecha=examen.fecha,
                hora_inicio=examen.hora_inicio,
                hora_fin=examen.hora_fin,
                aula=examen.aula,
                tipo=examen.tipo,
                periodo=examen.periodo,
                cupos=examen.cupos,
                estado=examen.estado,
                profesor_id=examen.profesor_id,
                created_at=examen.created_at,
                materia_nombre=materia_nombre,
                profesor_nombre=profesor_nombre,
                cupos_disponibles=cupos_disponibles,
                ya_inscripto=ya_inscripto,
            )
        )

    return result


# ── Mis inscripciones (alumno) ────────────────────────────────────────


@router.get(
    "/inscriptos",
    response_model=List[InscripcionExamenDetalle],
    summary="Mis exámenes inscriptos",
)
def mis_examenes_inscriptos(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    alumno_id = current_user["user_id"]

    rows = (
        db.query(InscripcionExamen, Materia.nombre.label("materia_nombre"))
        .join(Examen, InscripcionExamen.examen_id == Examen.id)
        .join(Materia, Examen.materia_id == Materia.id)
        .filter(
            InscripcionExamen.alumno_id == alumno_id,
            InscripcionExamen.estado == "inscripto",
        )
        .order_by(Examen.fecha)
        .all()
    )

    result = []
    for insc, materia_nombre in rows:
        detalle = InscripcionExamenDetalle(
            id=insc.id,
            examen_id=insc.examen_id,
            alumno_id=insc.alumno_id,
            estado=insc.estado,
            inscripto_en=insc.inscripto_en,
            cancelado_en=insc.cancelado_en,
            examen=ExamenOut.model_validate(insc.examen),
            materia_nombre=materia_nombre,
        )
        result.append(detalle)

    return result


# ── Inscribirse ───────────────────────────────────────────────────────


@router.post(
    "/inscripciones",
    response_model=InscripcionExamenOut,
    summary="Inscribirse a un examen",
)
def inscribirse_examen(
    data: InscripcionExamenCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_role(["alumno", "admin"])),
):
    alumno_id = current_user["user_id"]

    examen = db.query(Examen).filter(Examen.id == data.examen_id).first()
    if not examen:
        raise HTTPException(status_code=404, detail="Examen no encontrado")
    if examen.estado != "programado":
        raise HTTPException(
            status_code=422,
            detail=f"El examen no está disponible (estado: {examen.estado})",
        )

    # Verificar cupos
    if examen.cupos is not None:
        inscritos = (
            db.query(func.count(InscripcionExamen.id))
            .filter(
                InscripcionExamen.examen_id == examen.id,
                InscripcionExamen.estado == "inscripto",
            )
            .scalar()
        )
        if inscritos >= examen.cupos:
            raise HTTPException(
                status_code=422, detail="No hay cupos disponibles para este examen"
            )

    # Verificar inscripción duplicada
    existente = (
        db.query(InscripcionExamen)
        .filter(
            InscripcionExamen.examen_id == data.examen_id,
            InscripcionExamen.alumno_id == alumno_id,
            InscripcionExamen.estado == "inscripto",
        )
        .first()
    )
    if existente:
        raise HTTPException(
            status_code=409, detail="Ya estás inscripto en este examen"
        )

    inscripcion = InscripcionExamen(
        examen_id=data.examen_id,
        alumno_id=alumno_id,
    )
    db.add(inscripcion)
    db.commit()
    db.refresh(inscripcion)
    return inscripcion


# ── Cancelar inscripción ──────────────────────────────────────────────


@router.delete(
    "/inscripciones/{inscripcion_id}",
    response_model=InscripcionExamenOut,
    summary="Cancelar inscripción a examen",
)
def cancelar_inscripcion(
    inscripcion_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    alumno_id = current_user["user_id"]

    inscripcion = (
        db.query(InscripcionExamen)
        .filter(InscripcionExamen.id == inscripcion_id)
        .first()
    )
    if not inscripcion:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada")

    # Solo el dueño o admin puede cancelar
    if (
        current_user["role"] != "admin"
        and inscripcion.alumno_id != alumno_id
    ):
        raise HTTPException(status_code=403, detail="No autorizado")

    if inscripcion.estado != "inscripto":
        raise HTTPException(
            status_code=409,
            detail=f"Inscripción no cancelable (estado: {inscripcion.estado})",
        )

    inscripcion.estado = "cancelada"
    inscripcion.cancelado_en = datetime.now(timezone.utc)
    db.commit()
    db.refresh(inscripcion)
    return inscripcion
