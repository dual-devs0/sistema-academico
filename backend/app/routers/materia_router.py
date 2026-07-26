"""
CRUD de materias (catálogo) y creación de ofertas por período. Depende de: models.materia,
models.oferta_materia — ver separación Materia/OfertaMateria en ARQUITECTURA.md.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import Optional
from app import models, schemas, database
from app.dependencias import get_current_user, require_role

router = APIRouter(prefix="/materias", tags=["materias"])


def _oferta_activa(m, db: Session):
    return (
        db.query(models.oferta_materia.OfertaMateria)
        .filter(
            models.oferta_materia.OfertaMateria.materia_id == m.id,
            models.oferta_materia.OfertaMateria.activa == True,  # noqa: E712
        )
        .first()
    )


def _enrich(m, db: Session) -> dict:
    oferta = _oferta_activa(m, db)
    prof_nombre = None
    profesor_id = None
    if oferta:
        profesor_id = oferta.profesor_id
        prof = (
            db.query(models.user.User)
            .filter(models.user.User.id == oferta.profesor_id)
            .first()
        )
        if prof:
            prof_nombre = prof.nombre or prof.username

    carrera_nombre = None
    if m.carrera_id:
        carrera = (
            db.query(models.carrera.Carrera)
            .filter(models.carrera.Carrera.id == m.carrera_id)
            .first()
        )
        if carrera:
            carrera_nombre = carrera.nombre

    inscritos = 0
    if oferta:
        inscritos = (
            db.query(models.inscripcion.Inscripcion)
            .filter(models.inscripcion.Inscripcion.oferta_materia_id == oferta.id)
            .count()
        )

    return {
        "id": m.id,
        "nombre": m.nombre,
        "codigo": m.codigo,
        "profesor_id": profesor_id,
        "carrera_id": m.carrera_id,
        "anio": m.anio,
        "semestre": m.semestre,
        "creditos": m.creditos,
        "cupos": m.cupos,
        "horario": m.horario,
        "secciones": m.secciones,
        "inscritos": inscritos,
        "profesor_nombre": prof_nombre,
        "carrera_nombre": carrera_nombre,
    }


@router.post("/")
def create_materia(
    materia: schemas.materia.MateriaCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_role("admin")),
):
    existing = (
        db.query(models.materia.Materia)
        .filter(
            models.materia.Materia.nombre == materia.nombre,
            models.materia.Materia.carrera_id == materia.carrera_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Ya existe una materia con ese nombre en esta carrera",
        )
    new_materia = models.materia.Materia(
        nombre=materia.nombre,
        carrera_id=materia.carrera_id,
        anio=materia.anio or 1,
        semestre=materia.semestre or 1,
    )
    db.add(new_materia)
    db.commit()
    db.refresh(new_materia)
    return _enrich(new_materia, db)


def _enrich_batch(materias: list, db: Session) -> list:
    """Misma salida que _enrich(), pero en 4 queries fijas en vez de hasta 4×N."""
    if not materias:
        return []
    materia_ids = [m.id for m in materias]
    ofertas = (
        db.query(models.oferta_materia.OfertaMateria)
        .filter(
            models.oferta_materia.OfertaMateria.materia_id.in_(materia_ids),
            models.oferta_materia.OfertaMateria.activa == True,  # noqa: E712
        )
        .all()
    )
    oferta_por_materia = {o.materia_id: o for o in ofertas}

    profesor_ids = {o.profesor_id for o in ofertas if o.profesor_id}
    profesores = {
        u.id: u
        for u in db.query(models.user.User).filter(models.user.User.id.in_(profesor_ids)).all()
    } if profesor_ids else {}

    carrera_ids = {m.carrera_id for m in materias if m.carrera_id}
    carreras = {
        c.id: c
        for c in db.query(models.carrera.Carrera).filter(models.carrera.Carrera.id.in_(carrera_ids)).all()
    } if carrera_ids else {}

    oferta_ids = [o.id for o in ofertas]
    inscritos_por_oferta: dict = {}
    if oferta_ids:
        for oferta_id, cnt in (
            db.query(models.inscripcion.Inscripcion.oferta_materia_id, func.count())
            .filter(models.inscripcion.Inscripcion.oferta_materia_id.in_(oferta_ids))
            .group_by(models.inscripcion.Inscripcion.oferta_materia_id)
            .all()
        ):
            inscritos_por_oferta[oferta_id] = cnt

    result = []
    for m in materias:
        oferta = oferta_por_materia.get(m.id)
        prof = profesores.get(oferta.profesor_id) if oferta else None
        carrera = carreras.get(m.carrera_id) if m.carrera_id else None
        result.append({
            "id": m.id,
            "nombre": m.nombre,
            "codigo": m.codigo,
            "profesor_id": oferta.profesor_id if oferta else None,
            "carrera_id": m.carrera_id,
            "anio": m.anio,
            "semestre": m.semestre,
            "creditos": m.creditos,
            "cupos": m.cupos,
            "horario": m.horario,
            "secciones": m.secciones,
            "inscritos": inscritos_por_oferta.get(oferta.id, 0) if oferta else 0,
            "profesor_nombre": (prof.nombre or prof.username) if prof else None,
            "carrera_nombre": carrera.nombre if carrera else None,
        })
    return result


@router.get("/")
def list_materias(
    profesor_id: Optional[int] = Query(None),
    carrera_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(500, ge=1, le=2000),
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(models.materia.Materia)
    if profesor_id is not None:
        query = query.join(
            models.oferta_materia.OfertaMateria,
            models.oferta_materia.OfertaMateria.materia_id == models.materia.Materia.id,
        ).filter(
            models.oferta_materia.OfertaMateria.profesor_id == profesor_id,
            models.oferta_materia.OfertaMateria.activa == True,  # noqa: E712
        )
    if carrera_id is not None:
        query = query.filter(models.materia.Materia.carrera_id == carrera_id)
    query = query.order_by(models.materia.Materia.id).offset(skip).limit(limit)
    return _enrich_batch(query.all(), db)


@router.get("/stats")
def materias_stats(
    db: Session = Depends(database.get_db),
    current_user=Depends(require_role("admin")),
):

    M = models.materia.Materia
    O = models.oferta_materia.OfertaMateria
    C = models.carrera.Carrera
    U = models.user.User

    total_materias = db.query(M).count()
    total_profesores = db.query(U).filter(U.role == "profesor").count()

    ofertas_activas = db.query(O.materia_id).filter(O.activa.is_(True)).distinct().all()
    materia_ids_con_oferta = {r[0] for r in ofertas_activas}
    materias_con_profesor = len(materia_ids_con_oferta)
    materias_sin_profesor = total_materias - materias_con_profesor

    profesores_con_carga = (
        db.query(O.profesor_id)
        .filter(O.activa.is_(True))
        .distinct()
        .count()
    )

    carga_promedio = 0.0
    if profesores_con_carga > 0:
        carga_promedio = round(materias_con_profesor / profesores_con_carga, 1)

    carreras = db.query(C).all()
    por_carrera = []
    for c in carreras:
        ids = {m.id for m in db.query(M.id).filter(M.carrera_id == c.id).all()}
        total_c = len(ids)
        con_prof = len(ids & materia_ids_con_oferta)
        por_carrera.append({
            "carrera": c.nombre,
            "materias": total_c,
            "con_profesor": con_prof,
            "sin_profesor": total_c - con_prof,
        })

    profesores_sin_asignacion = total_profesores - profesores_con_carga

    return {
        "total_materias": total_materias,
        "materias_con_profesor": materias_con_profesor,
        "materias_sin_profesor": materias_sin_profesor,
        "total_profesores": total_profesores,
        "profesores_con_carga": profesores_con_carga,
        "profesores_sin_asignacion": profesores_sin_asignacion,
        "carga_promedio": carga_promedio,
        "por_carrera": por_carrera,
    }


@router.get("/{materia_id}")
def get_materia(
    materia_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    materia = (
        db.query(models.materia.Materia)
        .filter(models.materia.Materia.id == materia_id)
        .first()
    )
    if not materia:
        raise HTTPException(status_code=404, detail="Materia no encontrada")
    return _enrich(materia, db)


from pydantic import BaseModel


class MateriaPatchBody(BaseModel):
    profesor_id: int | None = None


@router.patch("/{materia_id}")
def patch_materia(
    materia_id: int,
    data: MateriaPatchBody,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_role("admin")),
):
    materia = (
        db.query(models.materia.Materia)
        .filter(models.materia.Materia.id == materia_id)
        .first()
    )
    if not materia:
        raise HTTPException(status_code=404, detail="Materia no encontrada")
    if data.profesor_id is not None:
        oferta = _oferta_activa(materia, db)
        if not oferta:
            raise HTTPException(
                status_code=400,
                detail="No hay oferta activa para esta materia. Creá una oferta primero.",
            )
        oferta.profesor_id = data.profesor_id
        db.commit()
    return _enrich(materia, db)


@router.post("/ofertas", response_model=schemas.oferta_materia.OfertaMateriaOut)
def crear_oferta(
    oferta: schemas.oferta_materia.OfertaMateriaCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_role("admin")),
):
    """Admin: asigna un profesor a una materia para un período dado."""
    materia = (
        db.query(models.materia.Materia)
        .filter(models.materia.Materia.id == oferta.materia_id)
        .first()
    )
    if not materia:
        raise HTTPException(status_code=404, detail="Materia no encontrada")
    profesor = (
        db.query(models.user.User)
        .filter(models.user.User.id == oferta.profesor_id)
        .first()
    )
    if not profesor:
        raise HTTPException(status_code=404, detail="Profesor no encontrado")
    existing = (
        db.query(models.oferta_materia.OfertaMateria)
        .filter(
            models.oferta_materia.OfertaMateria.materia_id == oferta.materia_id,
            models.oferta_materia.OfertaMateria.periodo == oferta.periodo,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Ya existe una oferta de esta materia para ese período",
        )
    nueva = models.oferta_materia.OfertaMateria(
        materia_id=oferta.materia_id,
        profesor_id=oferta.profesor_id,
        periodo=oferta.periodo,
        activa=oferta.activa if oferta.activa is not None else True,
    )
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return schemas.oferta_materia.OfertaMateriaOut(
        id=nueva.id,
        materia_id=nueva.materia_id,
        profesor_id=nueva.profesor_id,
        periodo=nueva.periodo,
        activa=bool(nueva.activa),
        materia_nombre=materia.nombre,
        profesor_nombre=profesor.nombre or profesor.username,
    )
