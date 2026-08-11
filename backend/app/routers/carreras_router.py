"""
Catálogo de carreras — lectura simple, requiere solo autenticación (no rol específico).
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app import models, schemas, database
from app.dependencias import get_current_user

router = APIRouter(prefix="/carreras", tags=["carreras"])


@router.post("/", response_model=schemas.carrera.CarreraOut)
def create_carrera(
    carrera: schemas.carrera.CarreraCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    existing = db.query(models.carrera.Carrera).filter(models.carrera.Carrera.nombre == carrera.nombre).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una carrera con ese nombre")
    new_carrera = models.carrera.Carrera(
        nombre=carrera.nombre,
        duracion_semestres=carrera.duracion_semestres,
        creditos_totales=carrera.creditos_totales,
    )
    db.add(new_carrera)
    db.commit()
    db.refresh(new_carrera)
    return new_carrera


@router.get("/", response_model=list[schemas.carrera.CarreraOut])
def list_carreras(
    skip: int = Query(0, ge=0),
    limit: int = Query(500, ge=1, le=2000),
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    return db.query(models.carrera.Carrera).offset(skip).limit(limit).all()
