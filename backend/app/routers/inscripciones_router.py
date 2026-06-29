from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app import models, schemas, database
from app.dependencias import require_role, get_current_user

router = APIRouter(prefix="/inscripciones", tags=["inscripciones"])


@router.post("/", response_model=schemas.inscripcion.InscripcionOut)
def inscribir(inscripcion: schemas.inscripcion.InscripcionCreate, db: Session = Depends(database.get_db), current_user=Depends(get_current_user)):
    if current_user["role"] not in ("alumno", "admin"):
        raise HTTPException(status_code=403, detail="No autorizado")
    existente = db.query(models.inscripcion.Inscripcion).filter(
        models.inscripcion.Inscripcion.alumno_id == inscripcion.alumno_id,
        models.inscripcion.Inscripcion.materia_id == inscripcion.materia_id,
    ).first()
    if existente:
        raise HTTPException(status_code=400, detail="El alumno ya esta inscripto en esta materia")
    nueva = models.inscripcion.Inscripcion(
        alumno_id=inscripcion.alumno_id,
        materia_id=inscripcion.materia_id,
    )
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva


@router.delete("/{inscripcion_id}")
def desinscribir(inscripcion_id: int, db: Session = Depends(database.get_db), current_user=Depends(get_current_user)):
    ins = db.query(models.inscripcion.Inscripcion).filter(models.inscripcion.Inscripcion.id == inscripcion_id).first()
    if not ins:
        raise HTTPException(status_code=404, detail="Inscripcion no encontrada")
    if current_user["role"] == "alumno" and ins.alumno_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="No autorizado")
    db.delete(ins)
    db.commit()
    return {"detail": "Desinscripto correctamente"}


@router.get("/materia/{materia_id}")
def alumnos_por_materia(materia_id: int, db: Session = Depends(database.get_db), current_user=Depends(get_current_user)):
    inscripciones = db.query(models.inscripcion.Inscripcion).filter(
        models.inscripcion.Inscripcion.materia_id == materia_id
    ).all()
    result = []
    for i in inscripciones:
        alumno = db.query(models.user.User).filter(models.user.User.id == i.alumno_id).first()
        if alumno:
            result.append({
                "inscripcion_id": i.id,
                "alumno_id": alumno.id,
                "nombre": alumno.nombre or alumno.username,
                "username": alumno.username,
                "email": alumno.email or alumno.username,
            })
    return result


@router.get("/")
def list_inscripciones(db: Session = Depends(database.get_db), current_user=Depends(get_current_user)):
    if current_user["role"] == "alumno":
        return db.query(models.inscripcion.Inscripcion).filter(
            models.inscripcion.Inscripcion.alumno_id == current_user["user_id"]
        ).all()
    return db.query(models.inscripcion.Inscripcion).all()
