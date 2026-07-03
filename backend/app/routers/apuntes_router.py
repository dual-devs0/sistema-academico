from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session
from typing import Optional
from app import models, schemas, database
from app.dependencias import get_current_user

router = APIRouter(prefix="/apuntes", tags=["apuntes"])


@router.post("/", response_model=schemas.apunte.ApunteOut)
def create_apunte(
    apunte: schemas.apunte.ApunteCreate,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    new_apunte = models.apunte.Apunte(**apunte.model_dump())
    db.add(new_apunte)
    db.commit()
    db.refresh(new_apunte)
    return new_apunte


@router.get("/", response_model=list[schemas.apunte.ApunteOut])
def list_apuntes(
    materia_id: Optional[int] = Query(None),
    aprobado: Optional[bool] = Query(None),
    tipo_contenido: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    db: Session = Depends(database.get_db),
):
    query = db.query(models.apunte.Apunte)
    if materia_id is not None:
        query = query.filter(models.apunte.Apunte.materia_id == materia_id)
    if aprobado is not None:
        query = query.filter(models.apunte.Apunte.aprobado == aprobado)
    if tipo_contenido is not None:
        query = query.filter(models.apunte.Apunte.tipo_contenido == tipo_contenido)
    if q:
        query = query.filter(
            or_(
                models.apunte.Apunte.titulo.ilike(f"%{q}%"),
                models.apunte.Apunte.tags.ilike(f"%{q}%"),
                models.apunte.Apunte.descripcion.ilike(f"%{q}%"),
            )
        )
    return query.all()


@router.get("/{apunte_id}", response_model=schemas.apunte.ApunteOut)
def get_apunte(
    apunte_id: int,
    db: Session = Depends(database.get_db),
):
    apunte = db.query(models.apunte.Apunte).filter(models.apunte.Apunte.id == apunte_id).first()
    if not apunte:
        raise HTTPException(status_code=404, detail="Apunte no encontrado")
    return apunte


@router.put("/{apunte_id}", response_model=schemas.apunte.ApunteOut)
def update_apunte(
    apunte_id: int,
    data: schemas.apunte.ApunteUpdate,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    apunte = db.query(models.apunte.Apunte).filter(models.apunte.Apunte.id == apunte_id).first()
    if not apunte:
        raise HTTPException(status_code=404, detail="Apunte no encontrado")
    if current_user["role"] not in ("admin",) and current_user["user_id"] != apunte.user_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(apunte, key, value)
    db.commit()
    db.refresh(apunte)
    return apunte


@router.patch("/{apunte_id}/aprobar", response_model=schemas.apunte.ApunteOut)
def aprobar_apunte(
    apunte_id: int,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    apunte = db.query(models.apunte.Apunte).filter(models.apunte.Apunte.id == apunte_id).first()
    if not apunte:
        raise HTTPException(status_code=404, detail="Apunte no encontrado")
    apunte.aprobado = True
    db.commit()
    db.refresh(apunte)
    return apunte


@router.patch("/{apunte_id}/like", response_model=schemas.apunte.ApunteOut)
def like_apunte(
    apunte_id: int,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    apunte = db.query(models.apunte.Apunte).filter(models.apunte.Apunte.id == apunte_id).first()
    if not apunte:
        raise HTTPException(status_code=404, detail="Apunte no encontrado")
    apunte.likes = (apunte.likes or 0) + 1
    db.commit()
    db.refresh(apunte)
    return apunte


@router.patch("/{apunte_id}/descargar", response_model=schemas.apunte.ApunteOut)
def descargar_apunte(
    apunte_id: int,
    db: Session = Depends(database.get_db),
):
    apunte = db.query(models.apunte.Apunte).filter(models.apunte.Apunte.id == apunte_id).first()
    if not apunte:
        raise HTTPException(status_code=404, detail="Apunte no encontrado")
    apunte.descargas = (apunte.descargas or 0) + 1
    db.commit()
    db.refresh(apunte)
    return apunte


@router.delete("/{apunte_id}")
def delete_apunte(
    apunte_id: int,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    apunte = db.query(models.apunte.Apunte).filter(models.apunte.Apunte.id == apunte_id).first()
    if not apunte:
        raise HTTPException(status_code=404, detail="Apunte no encontrado")
    if current_user["role"] not in ("admin",) and current_user["user_id"] != apunte.user_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    db.delete(apunte)
    db.commit()
    return {"detail": "Apunte eliminado"}
