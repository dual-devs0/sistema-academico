from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schemas, database
from app.dependencias import require_role

router = APIRouter(prefix="/inscripciones", tags=["inscripciones"])

@router.post(
    "/",
    response_model=schemas.inscripcion.InscripcionOut,
    responses={
        403: {"description": "No autorizado"},
        400: {"description": "Error de validación"}
    }
)
def inscribir(
    inscripcion: schemas.inscripcion.InscripcionCreate,
    db: Session = Depends(database.SessionLocal),
    current_user = Depends(require_role("alumno"))
):
    nueva_inscripcion = models.inscripcion.Inscripcion(
        alumno_id=inscripcion.alumno_id,
        materia_id=inscripcion.materia_id
    )
    db.add(nueva_inscripcion)
    db.commit()
    db.refresh(nueva_inscripcion)
    return nueva_inscripcion

@router.get(
    "/{alumno_id}",
    response_model=list[schemas.inscripcion.InscripcionOut],
    responses={
        403: {"description": "No autorizado"},
        404: {"description": "Alumno no encontrado"}
    }
)
#@router.get("/{alumno_id}", response_model=list[schemas.inscripcion.InscripcionOut])
def listar_inscripciones(
    alumno_id: int,
    db: Session = Depends(database.SessionLocal),
    current_user = Depends(require_role("alumno"))
):
    # Un alumno solo puede ver sus propias inscripciones
    if int(current_user["username"]) != alumno_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    return db.query(models.inscripcion.Inscripcion).filter(
        models.inscripcion.Inscripcion.alumno_id == alumno_id
    ).all()
