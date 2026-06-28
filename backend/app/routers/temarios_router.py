from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app import models, schemas, database
from app.dependencias import get_current_user

router = APIRouter(prefix="/temarios", tags=["temarios"])

@router.post("/", response_model=schemas.temario.TemarioOut)
def create_temario(temario: schemas.temario.TemarioCreate, db: Session = Depends(database.get_db), current_user = Depends(get_current_user)):
    if current_user["role"] not in ("admin", "profesor"):
        raise HTTPException(status_code=403, detail="No autorizado")
    new_temario = models.temario.Temario(
        materia_id=temario.materia_id,
        semana=temario.semana,
        titulo=temario.titulo,
        descripcion=temario.descripcion
    )
    db.add(new_temario)
    db.commit()
    db.refresh(new_temario)
    return new_temario

@router.get("/", response_model=list[schemas.temario.TemarioOut])
def list_temarios(
    materia_id: Optional[int] = Query(None),
    db: Session = Depends(database.get_db)
):
    query = db.query(models.temario.Temario)
    if materia_id is not None:
        query = query.filter(models.temario.Temario.materia_id == materia_id)
    return query.all()

@router.get("/{materia_id}", response_model=list[schemas.temario.TemarioOut])
def get_temario_por_materia(materia_id: int, db: Session = Depends(database.get_db)):
    return db.query(models.temario.Temario).filter(models.temario.Temario.materia_id == materia_id).all()
