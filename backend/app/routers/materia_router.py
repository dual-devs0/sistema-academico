from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app import models, schemas, database

from app.dependencias import require_role, get_current_user

router = APIRouter(prefix="/materias", tags=["materias"])


def _enrich(m, db: Session) -> dict:
    prof_nombre = None
    if m.profesor_id:
        prof = db.query(models.user.User).filter(models.user.User.id == m.profesor_id).first()
        if prof:
            prof_nombre = prof.nombre or prof.username

    carrera_nombre = None
    if m.carrera_id:
        carrera = db.query(models.carrera.Carrera).filter(models.carrera.Carrera.id == m.carrera_id).first()
        if carrera:
            carrera_nombre = carrera.nombre

    return {
        "id": m.id,
        "nombre": m.nombre,
        "profesor_id": m.profesor_id,
        "carrera_id": m.carrera_id,
        "anio": m.anio,
        "semestre": m.semestre,
        "profesor_nombre": prof_nombre,
        "carrera_nombre": carrera_nombre,
    }


@router.post("/")
def create_materia(materia: schemas.materia.MateriaCreate, db: Session = Depends(database.get_db), current_user=Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    # Duplicate check: same nombre + carrera_id
    existing = db.query(models.materia.Materia).filter(
        models.materia.Materia.nombre == materia.nombre,
        models.materia.Materia.carrera_id == materia.carrera_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una materia con ese nombre en esta carrera")
    new_materia = models.materia.Materia(
        nombre=materia.nombre,
        profesor_id=materia.profesor_id,
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
    db: Session = Depends(database.get_db),
):
    query = db.query(models.materia.Materia)
    if profesor_id is not None:
        query = query.filter(models.materia.Materia.profesor_id == profesor_id)
    if carrera_id is not None:
        query = query.filter(models.materia.Materia.carrera_id == carrera_id)
    return [_enrich(m, db) for m in query.all()]


@router.get("/{materia_id}")
def get_materia(materia_id: int, db: Session = Depends(database.get_db)):
    materia = db.query(models.materia.Materia).filter(models.materia.Materia.id == materia_id).first()
    if not materia:
        raise HTTPException(status_code=404, detail="Materia no encontrada")
    return _enrich(materia, db)
