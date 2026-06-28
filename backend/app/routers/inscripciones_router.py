from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schemas, database
from app.dependencias import get_current_user

router = APIRouter(prefix="/inscripciones", tags=["inscripciones"])

@router.post("/", response_model=schemas.inscripcion.InscripcionOut)
def inscribir(inscripcion: schemas.inscripcion.InscripcionCreate, db: Session = Depends(database.get_db), current_user = Depends(get_current_user)):
    # Solo alumnos pueden inscribirse
    if current_user["role"] != "alumno":
        raise HTTPException(status_code=403, detail="No autorizado")
    nueva_inscripcion = models.inscripcion.Inscripcion(
        alumno_id=inscripcion.alumno_id,
        materia_id=inscripcion.materia_id
    )
    db.add(nueva_inscripcion)
    db.commit()
    db.refresh(nueva_inscripcion)
    return nueva_inscripcion

@router.get("/{alumno_id}", response_model=list[schemas.inscripcion.InscripcionOut])
def listar_inscripciones(alumno_id: int, db: Session = Depends(database.get_db), current_user = Depends(get_current_user)):
    # Un alumno solo puede ver sus propias inscripciones
    if current_user["role"] != "alumno" or current_user["user_id"] != alumno_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    return db.query(models.inscripcion.Inscripcion).filter(models.inscripcion.Inscripcion.alumno_id == alumno_id).all()
