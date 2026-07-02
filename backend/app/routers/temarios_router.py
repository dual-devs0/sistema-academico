from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app import models, schemas, database
from app.dependencias import get_current_user

router = APIRouter(prefix="/temarios", tags=["temarios"])


@router.post("/", response_model=schemas.temario.TemarioOut)
def create_temario(
    temario: schemas.temario.TemarioCreate,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    if current_user["role"] not in ("admin", "profesor"):
        raise HTTPException(status_code=403, detail="No autorizado")
    data = temario.model_dump()
    if "bibliografia" in data and data["bibliografia"] is not None:
        data["bibliografia"] = [b.model_dump() for b in data["bibliografia"]]
    new_temario = models.temario.Temario(**data)
    db.add(new_temario)
    db.commit()
    db.refresh(new_temario)
    return new_temario


@router.get("/", response_model=list[schemas.temario.TemarioOut])
def list_temarios(
    materia_id: Optional[int] = Query(None),
    db: Session = Depends(database.get_db),
):
    query = db.query(models.temario.Temario)
    if materia_id is not None:
        query = query.filter(models.temario.Temario.materia_id == materia_id)
    return query.all()


@router.get("/{temario_id}", response_model=schemas.temario.TemarioOut)
def get_temario(
    temario_id: int,
    db: Session = Depends(database.get_db),
):
    temario = db.query(models.temario.Temario).filter(models.temario.Temario.id == temario_id).first()
    if not temario:
        raise HTTPException(status_code=404, detail="Temario no encontrado")
    return temario


@router.put("/{temario_id}", response_model=schemas.temario.TemarioOut)
def update_temario(
    temario_id: int,
    data: schemas.temario.TemarioUpdate,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    if current_user["role"] not in ("admin", "profesor"):
        raise HTTPException(status_code=403, detail="No autorizado")
    temario = db.query(models.temario.Temario).filter(models.temario.Temario.id == temario_id).first()
    if not temario:
        raise HTTPException(status_code=404, detail="Temario no encontrado")
    update_data = data.model_dump(exclude_unset=True)
    if "bibliografia" in update_data and update_data["bibliografia"] is not None:
        update_data["bibliografia"] = [b.model_dump() for b in update_data["bibliografia"]]
    for key, value in update_data.items():
        setattr(temario, key, value)
    db.commit()
    db.refresh(temario)
    return temario


@router.delete("/{temario_id}")
def delete_temario(
    temario_id: int,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    if current_user["role"] not in ("admin", "profesor"):
        raise HTTPException(status_code=403, detail="No autorizado")
    temario = db.query(models.temario.Temario).filter(models.temario.Temario.id == temario_id).first()
    if not temario:
        raise HTTPException(status_code=404, detail="Temario no encontrado")
    db.delete(temario)
    db.commit()
    return {"detail": "Temario eliminado"}
