from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app import models, schemas, database
from app.dependencias import require_role

router = APIRouter(prefix="/materias", tags=["materias"])

@router.post(
    "/",
    response_model=schemas.materia.MateriaOut,
    responses={
        403: {"description": "No autorizado"},
        400: {"description": "Error de validación"}
    }
)

def create_materia(
    materia: schemas.materia.MateriaCreate,
    db: Session = Depends(database.SessionLocal),
    current_user = Depends(require_role("admin"))
):
    new_materia = models.materia.Materia(
        nombre=materia.nombre,
        profesor_id=materia.profesor_id
    )
    db.add(new_materia)
    db.commit()
    db.refresh(new_materia)
    return new_materia

@router.get(
    "/",
    response_model=list[schemas.materia.MateriaOut],
    responses={
        200: {"description": "Lista de materias"}
    }
)

#@router.get("/", response_model=list[schemas.materia.MateriaOut])
def list_materias(db: Session = Depends(database.SessionLocal)):
    return db.query(models.materia.Materia).all()
