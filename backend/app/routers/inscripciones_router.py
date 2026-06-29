from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schemas, database
from app.dependencias import get_current_user

router = APIRouter(prefix="/inscripciones", tags=["inscripciones"])

@router.post("/", response_model=schemas.inscripcion.InscripcionOut)
def inscribir(inscripcion: schemas.inscripcion.InscripcionCreate, db: Session = Depends(database.get_db), current_user = Depends(get_current_user)):
    # Alumnos se inscriben a sí mismos; admin puede inscribir a cualquier alumno
    if current_user["role"] not in ("alumno", "admin"):
        raise HTTPException(status_code=403, detail="No autorizado")
    # Verificar que no exista ya
    existente = db.query(models.inscripcion.Inscripcion).filter(
        models.inscripcion.Inscripcion.alumno_id == inscripcion.alumno_id,
        models.inscripcion.Inscripcion.materia_id == inscripcion.materia_id,
    ).first()
    if existente:
        raise HTTPException(status_code=400, detail="El alumno ya está inscripto en esta materia")
    nueva_inscripcion = models.inscripcion.Inscripcion(
        alumno_id=inscripcion.alumno_id,
        materia_id=inscripcion.materia_id
    )
    db.add(nueva_inscripcion)
    db.commit()
    db.refresh(nueva_inscripcion)
    return nueva_inscripcion


@router.delete("/{inscripcion_id}")
def desinscribir(inscripcion_id: int, db: Session = Dep