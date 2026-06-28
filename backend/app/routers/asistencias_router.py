from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
from app import models, schemas, database
from app.dependencias import get_current_user

router = APIRouter(prefix="/asistencias", tags=["asistencias"])

@router.post("/", response_model=schemas.asistencia.AsistenciaOut)
def create_asistencia(asistencia: schemas.asistencia.AsistenciaCreate, db: Session = Depends(database.get_db), current_user = Depends(get_current_user)):
    new_asistencia = models.asistencia.Asistencia(
        user_id=asistencia.user_id,
        materia_id=asistencia.materia_id,
        fecha=asistencia.fecha,
        presente=asistencia.presente,
        es_becado=asistencia.es_becado
    )
    db.add(new_asistencia)
    db.commit()
    db.refresh(new_asistencia)
    return new_asistencia

@router.get("/", response_model=list[schemas.asistencia.AsistenciaOut])
def list_asistencias(
    materia_id: Optional[int] = Query(None),
    user_id: Optional[int] = Query(None),
    fecha: Optional[date] = Query(None),
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user)
):
    query = db.query(models.asistencia.Asistencia)
    if materia_id is not None:
        query = query.filter(models.asistencia.Asistencia.materia_id == materia_id)
    if user_id is not None:
        query = query.filter(models.asistencia.Asistencia.user_id == user_id)
    if fecha is not None:
        query = query.filter(models.asistencia.Asistencia.fecha == fecha)
    return query.all()

@router.put("/{asistencia_id}", response_model=schemas.asistencia.AsistenciaOut)
def update_asistencia(asistencia_id: int, asistencia: schemas.asistencia.AsistenciaCreate, db: Session = Depends(database.get_db), current_user = Depends(get_current_user)):
    existing = db.query(models.asistencia.Asistencia).filter(models.asistencia.Asistencia.id == asistencia_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Asistencia no encontrada")
    for key, value in asistencia.model_dump().items():
        setattr(existing, key, value)
    db.commit()
    db.refresh(existing)
    return existing

@router.delete("/{asistencia_id}")
def delete_asistencia(asistencia_id: int, db: Session = Depends(database.get_db), current_user = Depends(get_current_user)):
    existing = db.query(models.asistencia.Asistencia).filter(models.asistencia.Asistencia.id == asistencia_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Asistencia no encontrada")
    db.delete(existing)
    db.commit()
    return {"detail": "Asistencia eliminada"}

@router.get("/{materia_id}/resumen")
def resumen_asistencia(materia_id: int, db: Session = Depends(database.get_db), current_user = Depends(get_current_user)):
    total = db.query(models.asistencia.Asistencia).filter(
        models.asistencia.Asistencia.materia_id == materia_id
    ).count()
    presentes = db.query(models.asistencia.Asistencia).filter(
        models.asistencia.Asistencia.materia_id == materia_id,
        models.asistencia.Asistencia.presente == True
    ).count()
    if total == 0:
        return {"porcentaje": 0}
    return {"porcentaje": round((presentes / total) * 100, 2)}
