from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app import models, schemas, database
from app.dependencias import get_current_user

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

    return {
        "id": m.id,
        "nombre": m.nombre,
        "profesor_id": profesor_id,
        "carrera_id": m.carrera_id,
        "anio": m.anio,
        "semestre": m.semestre,
        "profesor_nombre": prof_nombre,
        "carrera_nombre": carrera_nombre,
    }


@router.post("/")
def create_materia(
    materia: schemas.materia.MateriaCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
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
    return [_enrich(m, db) for m in query.all()]


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
    current_user=Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
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
    current_user=Depends(get_current_user),
):
    """Admin: asigna un profesor a una materia para un período dado."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
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
        activa=nueva.activa,
        materia_nombre=materia.nombre,
        profesor_nombre=profesor.nombre or profesor.username,
    )
