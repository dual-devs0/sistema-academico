from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app import models, schemas, database
from app.dependencias import get_current_user

router = APIRouter(prefix="/programas", tags=["programas"])


@router.post("/", response_model=schemas.programa.ProgramaOut)
def create_programa(programa: schemas.programa.ProgramaCreate, db: Session = Depends(database.get_db), current_user=Depends(get_current_user)):
    if current_user["role"] not in ("admin", "profesor"):
        raise HTTPException(status_code=403, detail="No autorizado")
    new_programa = models.programa.Programa(
        materia_id=programa.materia_id,
        semana=programa.semana,
        titulo=programa.titulo,
        descripcion=programa.descripcion,
    )
    db.add(new_programa)
    db.commit()
    db.refresh(new_programa)
    return new_programa


@router.get("/")
def list_programas(materia_id: Optional[int] = Query(None), db: Session = Depends(database.get_db), current_user = Depends(get_current_user)):
    query = db.query(models.programa.Programa)
    if materia_id is not None:
        query = query.filter(models.programa.Programa.materia_id == materia_id)
    return query.all()


@router.get("/{materia_id}")
def get_programa_por_materia(materia_id: int, db: Session = Depends(database.get_db), current_user = Depends(get_current_user)):
    return db.query(models.programa.Programa).filter(models.programa.Programa.materia_id == materia_id).order_by(models.programa.Programa.semana).all()


@router.put("/{programa_id}", response_model=schemas.programa.ProgramaOut)
def update_programa(programa_id: int, programa: schemas.programa.ProgramaCreate, db: Session = Depends(database.get_db), current_user=Depends(get_current_user)):
    if current_user["role"] not in ("admin", "profesor"):
        raise HTTPException(status_code=403, detail="No autorizado")
    existing = db.query(models.programa.Programa).filter(models.programa.Programa.id == programa_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Programa no encontrado")
    existing.materia_id = programa.materia_id
    existing.semana = programa.semana
    existing.titulo = programa.titulo
    existing.descripcion = programa.descripcion
    db.commit()
    db.refresh(existing)
    return existing


@router.delete("/{programa_id}")
def delete_programa(programa_id: int, db: Session = Depends(database.get_db), current_user=Depends(get_current_user)):
    if current_user["role"] not in ("admin", "profesor"):
        raise HTTPException(status_code=403, detail="No autorizado")
    existing = db.query(models.programa.Programa).filter(models.programa.Programa.id == programa_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Programa no encontrado")
    db.delete(existing)
    db.commit()
    return {"detail": "Eliminado"}


@router.put("/materia/{materia_id}/bulk")
def bulk_save_programa(
    materia_id: int,
    items: list[schemas.programa.ProgramaCreate],
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    """Replace all programa items for a materia."""
    if current_user["role"] not in ("admin", "profesor"):
        raise HTTPException(status_code=403, detail="No autorizado")
    materia = db.query(models.materia.Materia).filter(models.materia.Materia.id == materia_id).first()
    if not materia:
        raise HTTPException(status_code=404, detail="Materia no encontrada")
    db.query(models.programa.Programa).filter(models.programa.Programa.materia_id == materia_id).delete()
    for i, item in enumerate(items):
        p = models.programa.Programa(
            materia_id=materia_id,
            semana=item.semana if item.semana else i + 1,
            titulo=item.titulo,
            descripcion=item.descripcion,
        )
        db.add(p)
    db.commit()
    result = db.query(models.programa.Programa).filter(models.programa.Programa.materia_id == materia_id).order_by(models.programa.Programa.semana).all()
    return [{"id": r.id, "materia_id": r.materia_id, "semana": r.semana, "titulo": r.titulo, "descripcion": r.descripcion} for r in result]
