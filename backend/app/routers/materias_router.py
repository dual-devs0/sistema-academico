from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models.materias import Materia, Inscripcion
from app.schemas.materias_schemas import MateriaCreate, MateriaOut, InscripcionCreate, InscripcionOut
from app.database import SessionLocal

router = APIRouter(prefix="/materias", tags=["materias"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=MateriaOut)
def crear_materia(materia: MateriaCreate, db: Session = Depends(get_db)):
    nueva = Materia(**materia.model_dump())
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva

@router.get("/", response_model=list[MateriaOut])
def listar_materias(db: Session = Depends(get_db)):
    return db.query(Materia).all()

@router.post("/inscripciones/", response_model=InscripcionOut)
def inscribir_alumno(inscripcion: InscripcionCreate, db: Session = Depends(get_db)):
    nueva = Inscripcion(**inscripcion.model_dump())
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva

@router.get("/inscripciones/{alumno_id}", response_model=list[InscripcionOut])
def ver_inscripciones(alumno_id: int, db: Session = Depends(get_db)):
    return db.query(Inscripcion).filter(Inscripcion.alumno_id == alumno_id).all()