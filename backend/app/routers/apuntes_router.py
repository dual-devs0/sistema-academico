from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy import or_
from sqlalchemy.orm import Session
from typing import Optional
from app import models, schemas, database
from app.dependencias import get_current_user
from app.services.storage import subir_archivo, obtener_url_firmada, eliminar_archivo

router = APIRouter(prefix="/apuntes", tags=["apuntes"])


@router.post("/", response_model=schemas.apunte.ApunteOut)
def create_apunte(
    apunte: schemas.apunte.ApunteCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    data = apunte.model_dump()
    data["user_id"] = current_user.user_id
    new_apunte = models.apunte.Apunte(**data)
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
    skip: int = Query(0, ge=0),
    limit: int = Query(500, ge=1, le=2000),
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
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
    return query.offset(skip).limit(limit).all()


@router.get("/{apunte_id}", response_model=schemas.apunte.ApunteOut)
def get_apunte(
    apunte_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    apunte = (
        db.query(models.apunte.Apunte)
        .filter(models.apunte.Apunte.id == apunte_id)
        .first()
    )
    if not apunte:
        raise HTTPException(status_code=404, detail="Apunte no encontrado")
    return apunte


@router.put("/{apunte_id}", response_model=schemas.apunte.ApunteOut)
def update_apunte(
    apunte_id: int,
    data: schemas.apunte.ApunteUpdate,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    apunte = (
        db.query(models.apunte.Apunte)
        .filter(models.apunte.Apunte.id == apunte_id)
        .first()
    )
    if not apunte:
        raise HTTPException(status_code=404, detail="Apunte no encontrado")
    if (
        current_user.role not in ("admin",)
        and current_user.user_id != apunte.user_id
    ):
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
    current_user=Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    apunte = (
        db.query(models.apunte.Apunte)
        .filter(models.apunte.Apunte.id == apunte_id)
        .first()
    )
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
    current_user=Depends(get_current_user),
):
    apunte = (
        db.query(models.apunte.Apunte)
        .filter(models.apunte.Apunte.id == apunte_id)
        .first()
    )
    if not apunte:
        raise HTTPException(status_code=404, detail="Apunte no encontrado")
    db.query(models.apunte.Apunte).filter(models.apunte.Apunte.id == apunte_id).update(
        {models.apunte.Apunte.likes: models.apunte.Apunte.likes + 1}
    )
    db.commit()
    db.refresh(apunte)
    return apunte


@router.patch("/{apunte_id}/descargar", response_model=schemas.apunte.ApunteOut)
def descargar_apunte(
    apunte_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    apunte = (
        db.query(models.apunte.Apunte)
        .filter(models.apunte.Apunte.id == apunte_id)
        .first()
    )
    if not apunte:
        raise HTTPException(status_code=404, detail="Apunte no encontrado")
    db.query(models.apunte.Apunte).filter(models.apunte.Apunte.id == apunte_id).update(
        {models.apunte.Apunte.descargas: models.apunte.Apunte.descargas + 1}
    )
    db.commit()
    db.refresh(apunte)
    return apunte


@router.post("/{apunte_id}/archivo")
async def upload_archivo_apunte(
    apunte_id: int,
    archivo: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    apunte = (
        db.query(models.apunte.Apunte)
        .filter(models.apunte.Apunte.id == apunte_id)
        .first()
    )
    if not apunte:
        raise HTTPException(status_code=404, detail="Apunte no encontrado")
    if (
        current_user.role not in ("admin",)
        and current_user.user_id != apunte.user_id
    ):
        raise HTTPException(status_code=403, detail="No autorizado")

    contenido = await archivo.read()
    try:
        key = subir_archivo(contenido, archivo.filename or "archivo", "apunte")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    # Eliminar archivo anterior si existía
    if apunte.storage_key:
        try:
            eliminar_archivo(apunte.storage_key)
        except Exception:
            pass  # no bloquear si R2 falla al borrar el viejo

    apunte.storage_key = key
    db.commit()
    return {"storage_key": key, "url": obtener_url_firmada(key)}


@router.get("/{apunte_id}/url-descarga")
def get_url_descarga(
    apunte_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    apunte = (
        db.query(models.apunte.Apunte)
        .filter(models.apunte.Apunte.id == apunte_id)
        .first()
    )
    if not apunte:
        raise HTTPException(status_code=404, detail="Apunte no encontrado")
    if not apunte.storage_key:
        raise HTTPException(
            status_code=404, detail="Este apunte no tiene archivo subido"
        )
    return {"url": obtener_url_firmada(apunte.storage_key)}


@router.delete("/{apunte_id}")
def delete_apunte(
    apunte_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    apunte = (
        db.query(models.apunte.Apunte)
        .filter(models.apunte.Apunte.id == apunte_id)
        .first()
    )
    if not apunte:
        raise HTTPException(status_code=404, detail="Apunte no encontrado")
    if (
        current_user.role not in ("admin",)
        and current_user.user_id != apunte.user_id
    ):
        raise HTTPException(status_code=403, detail="No autorizado")
    db.delete(apunte)
    db.commit()
    return {"detail": "Apunte eliminado"}
