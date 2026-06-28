from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app import models, schemas, database
from app.dependencias import get_current_user

router = APIRouter(prefix="/eventos", tags=["eventos"])

@router.post("/", response_model=schemas.evento.EventoOut)
def create_evento(evento: schemas.evento.EventoCreate, db: Session = Depends(database.get_db), current_user = Depends(get_current_user)):
    new_evento = models.evento.EventoCalendario(
        titulo=evento.titulo,
        tipo=evento.tipo,
        fecha=evento.fecha,
        materia_id=evento.materia_id,
        carrera_id=evento.carrera_id,
        descripcion=evento.descripcion,
        creado_por=evento.creado_por
    )
    db.add(new_evento)
    db.commit()
    db.refresh(new_evento)
    return new_evento

@router.get("/", response_model=list[schemas.evento.EventoOut])
def list_eventos(
    tipo: Optional[str] = Query(None),
    carrera_id: Optional[int] = Query(None),
    materia_id: Optional[int] = Query(None),
    db: Session = Depends(database.get_db)
):
    query = db.query(models.evento.EventoCalendario)
    if tipo is not None:
        query = query.filter(models.evento.EventoCalendario.tipo == tipo)
    if carrera_id is not None:
        query = query.filter(models.evento.EventoCalendario.carrera_id == carrera_id)
    if materia_id is not None:
        query = query.filter(models.evento.EventoCalendario.materia_id == materia_id)
    return query.all()
