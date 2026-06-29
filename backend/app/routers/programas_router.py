from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app import models, schemas, database
from app.dependencias import get_current_user

router = APIRouter(prefix="/programas", tags=["programas"])

@router.post("/", response_model=schemas.programa.ProgramaOut)
def create_programa(programa: schemas.programa.ProgramaCreate, db: Session = Depends(database.get_db), current_user = Depends(get_current_user)):
    if current_user["role"] not in ("admin", "profesor"):
        raise HTTPException(status_code=403, detail="No autorizado")
    new_programa = models.programa.Programa(
        materia_id=programa.materia_id,
        semana=programa.semana,
        titulo=programa.titulo,
        descripcion=programa.descripcion
    )
    db.add(new_programa)
    db.commit()
    db.refresh(new_programa)
    return new_programa

@router.get("/", response_model=list[schemas.programa.ProgramaOut])
def list_programas(
    materia_id: Optional[int] = Query(None),
    db: Session = Depends(database.get_db)
):
    query = db.query(models.programa.Programa)
    if materia_id is not None:
        query = query.filter(models.programa.Programa.materia_id == materia_id)
    return query.all()

@router.get("/{materia_id}", response_model=list[schemas.programa.ProgramaOut])
def get_programa_por_materia(materia_id: int, db: Session = Depends(database.get_db)):
    return db.query(models.programa.Programa).filter(models.programa.Programa.materia_id == materia_id).all()
