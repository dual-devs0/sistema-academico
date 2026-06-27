from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schemas, database

from app.dependencias import get_current_user

router = APIRouter(prefix="/materias", tags=["materias"])

@router.post("/", response_model=schemas.materia.MateriaOut)
def create_materia(materia: schemas.materia.MateriaCreate, db: Session = Depends(database.SessionLocal), current_user = Depends(get_current_user)):
    # Solo admin puede crear materias
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    new_materia = models.materia.Materia(
        nombre=materia.nombre,
        profesor_id=materia.profesor_id
    )
    db.add(new_materia)
    db.commit()
    db.refresh(new_materia)
    return new_materia

@router.get("/", response_model=list[schemas.materia.MateriaOut])
def list_materias(db: Session = Depends(database.SessionLocal)):
    return db.query(models.materia.Materia).all()
