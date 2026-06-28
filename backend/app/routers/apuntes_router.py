from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app import models, schemas, database
from app.dependencias import get_current_user

router = APIRouter(prefix="/apuntes", tags=["apuntes"])

@router.post("/", response_model=schemas.apunte.ApunteOut)
def create_apunte(apunte: schemas.apunte.ApunteCreate, db: Session = Depends(database.get_db), current_user = Depends(get_current_user)):
    new_apunte = models.apunte.Apunte(
        user_id=apunte.user_id,
        materia_id=apunte.materia_id,
        titulo=apunte.titulo,
        archivo_url=apunte.archivo_url,
        tags=apunte.tags,
        aprobado=apunte.aprobado
    )
    db.add(new_apunte)
    db.commit()
    db.refresh(new_apunte)
    return new_apunte

@router.get("/", response_model=list[schemas.apunte.ApunteOut])
def list_apuntes(
    materia_id: Optional[int] = Query(None),
    aprobado: Optional[bool] = Query(None),
    db: Session = Depends(database.get_db)
):
    query = db.query(models.apunte.Apunte)
    if materia_id is not None:
        query = query.filter(models.apunte.Apunte.materia_id == materia_id)
    if aprobado is not None:
        query = query.filter(models.apunte.Apunte.aprobado == aprobado)
    return query.all()

@router.patch("/{apunte_id}/aprobar", response_model=schemas.apunte.ApunteOut)
def aprobar_apunte(apunte_id: int, db: Session = Depends(database.get_db), current_user = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    apunte = db.query(models.apunte.Apunte).filter(models.apunte.Apunte.id == apunte_id).first()
    if not apunte:
        raise HTTPException(status_code=404, detail="Apunte no encontrado")
    apunte.aprobado = True
    db.commit()
    db.refresh(apunte)
    return apunte
