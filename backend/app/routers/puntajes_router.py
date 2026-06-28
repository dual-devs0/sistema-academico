from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app import models, schemas, database
from app.dependencias import get_current_user

router = APIRouter(prefix="/puntajes", tags=["puntajes"])

@router.post("/", response_model=schemas.puntaje.PuntajeOut)
def create_puntaje(puntaje: schemas.puntaje.PuntajeCreate, db: Session = Depends(database.get_db), current_user = Depends(get_current_user)):
    user = db.query(models.user.User).filter(models.user.User.username == current_user["username"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    new_puntaje = models.puntaje.Puntaje(
        user_id=puntaje.user_id,
        materia_id=puntaje.materia_id,
        tipo=puntaje.tipo,
        valor=puntaje.valor,
        editado_por=user.id
    )
    db.add(new_puntaje)
    db.commit()
    db.refresh(new_puntaje)
    return new_puntaje

@router.get("/", response_model=list[schemas.puntaje.PuntajeOut])
def list_puntajes(
    user_id: Optional[int] = Query(None),
    materia_id: Optional[int] = Query(None),
    tipo: Optional[str] = Query(None),
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    query = db.query(models.puntaje.Puntaje)
    if current_user["role"] == "alumno":
        query = query.filter(models.puntaje.Puntaje.user_id == current_user["user_id"])
    else:
        if user_id is not None:
            query = query.filter(models.puntaje.Puntaje.user_id == user_id)
    if materia_id is not None:
        query = query.filter(models.puntaje.Puntaje.materia_id == materia_id)
    if tipo is not None:
        query = query.filter(models.puntaje.Puntaje.tipo == tipo)
    return query.all()

@router.put("/{puntaje_id}", response_model=schemas.puntaje.PuntajeOut)
def update_puntaje(puntaje_id: int, puntaje: schemas.puntaje.PuntajeCreate, db: Session = Depends(database.get_db), current_user = Depends(get_current_user)):
    user = db.query(models.user.User).filter(models.user.User.username == current_user["username"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    existing = db.query(models.puntaje.Puntaje).filter(models.puntaje.Puntaje.id == puntaje_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Puntaje no encontrado")
    for key, value in puntaje.model_dump().items():
        setattr(existing, key, value)
    existing.editado_por = user.id
    db.commit()
    db.refresh(existing)
    return existing

@router.delete("/{puntaje_id}")
def delete_puntaje(puntaje_id: int, db: Session = Depends(database.get_db), current_user = Depends(get_current_user)):
    existing = db.query(models.puntaje.Puntaje).filter(models.puntaje.Puntaje.id == puntaje_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Puntaje no encontrado")
    db.delete(existing)
    db.commit()
    return {"detail": "Puntaje eliminado"}

@router.get("/{user_id}/promedio")
def promedio_puntajes(user_id: int, db: Session = Depends(database.get_db), current_user = Depends(get_current_user)):
    if current_user["role"] != "admin" and current_user["username"] != str(user_id):
        raise HTTPException(status_code=403, detail="No autorizado")
    puntajes = db.query(models.puntaje.Puntaje).filter(models.puntaje.Puntaje.user_id == user_id).all()
    if not puntajes:
        return {"promedio": 0}
    total = sum(float(p.valor) for p in puntajes)
    return {"promedio": round(total / len(puntajes), 2)}
