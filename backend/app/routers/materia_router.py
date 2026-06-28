from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app import models, schemas, database
from app.dependencias import require_role

router = APIRouter(prefix="/materias", tags=["materias"])

@router.post("/", response_model=schemas.materia.MateriaOut)
def create_materia(materia: schemas.materia.MateriaCreate, db: Session = Depends(database.get_db), current_user = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
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
    return new_materia

@router.get("/", response_model=list[schemas.materia.MateriaOut])
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
    return query.all()

@router.get("/{materia_id}", response_model=schemas.materia.MateriaOut)
def get_materia(materia_id: int, db: Session = Depends(database.get_db)):
    materia = db.query(models.materia.Materia).filter(models.materia.Materia.id == materia_id).first()
    if not materia:
        raise HTTPException(status_code=404, detail="Materia no encontrada")
    return materia
