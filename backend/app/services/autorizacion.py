from sqlalchemy.orm import Session
from app.models.oferta_materia import OfertaMateria
from app.models.inscripcion import Inscripcion


def es_profesor_de_materia(db: Session, materia_id: int, profesor_id: int) -> bool:
    """True si profesor_id dicta una oferta activa de materia_id."""
    return db.query(
        db.query(OfertaMateria)
        .filter(
            OfertaMateria.materia_id == materia_id,
            OfertaMateria.profesor_id == profesor_id,
            OfertaMateria.activa == True,  # noqa: E712
        )
        .exists()
    ).scalar()


def es_profesor_de_alumno(db: Session, profesor_id: int, alumno_id: int) -> bool:
    """True si el profesor dicta al menos una materia activa en la que el alumno está inscripto."""
    return db.query(
        db.query(Inscripcion)
        .join(OfertaMateria, Inscripcion.oferta_materia_id == OfertaMateria.id)
        .filter(
            Inscripcion.alumno_id == alumno_id,
            OfertaMateria.profesor_id == profesor_id,
            OfertaMateria.activa == True,  # noqa: E712
        )
        .exists()
    ).scalar()
