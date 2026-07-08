from sqlalchemy.orm import Session
from app.models.oferta_materia import OfertaMateria


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
