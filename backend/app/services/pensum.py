from sqlalchemy.orm import Session
from app.models.correlatividad import Correlatividad
from app.models.puntaje import Puntaje
from app.models.oferta_materia import OfertaMateria
from app.models.inscripcion import Inscripcion

PESOS = {"parcial1": 0.25, "parcial2": 0.25, "practico": 0.20, "final": 0.30}


def _tiene_nota_aprobatoria(db: Session, alumno_id: int, materia_id: int) -> bool:
    """True si el alumno tiene promedio ponderado >= 6 en CUALQUIER oferta de la materia."""
    ofertas_ids = [
        o.id for o in db.query(OfertaMateria.id).filter(OfertaMateria.materia_id == materia_id).all()
    ]
    if not ofertas_ids:
        return False
    puntajes = (
        db.query(Puntaje)
        .filter(Puntaje.user_id == alumno_id, Puntaje.oferta_materia_id.in_(ofertas_ids))
        .all()
    )
    por_oferta: dict[int, dict] = {}
    for p in puntajes:
        por_oferta.setdefault(p.oferta_materia_id, {})[p.tipo] = float(p.valor)
    for notas in por_oferta.values():
        existentes = {k: v for k, v in notas.items() if k in PESOS}
        if not existentes:
            continue
        peso_total = sum(PESOS[k] for k in existentes)
        if peso_total == 0:
            continue
        promedio = sum(PESOS[k] * v for k, v in existentes.items()) / peso_total
        if promedio >= 6:
            return True
    return False


def _tiene_inscripcion(db: Session, alumno_id: int, materia_id: int) -> bool:
    """True si el alumno tiene (o tuvo) inscripcion activa en cualquier oferta de la materia."""
    ofertas_ids = [
        o.id for o in db.query(OfertaMateria.id).filter(OfertaMateria.materia_id == materia_id).all()
    ]
    if not ofertas_ids:
        return False
    return db.query(
        db.query(Inscripcion)
        .filter(Inscripcion.alumno_id == alumno_id, Inscripcion.oferta_materia_id.in_(ofertas_ids))
        .exists()
    ).scalar()


def validar_correlatividades(alumno_id: int, materia_id: int, db: Session) -> dict:
    """Evalua todos los prerrequisitos de materia_id para alumno_id.

    Devuelve {"valido": bool, "pendientes": [{"materia_id", "tipo"}, ...]}
    Evalua TODOS los prerrequisitos, no corta en el primero que falla.
    """
    prerequisitos = db.query(Correlatividad).filter(Correlatividad.materia_id == materia_id).all()
    if not prerequisitos:
        return {"valido": True, "pendientes": []}

    pendientes = []
    for pr in prerequisitos:
        if pr.tipo == "aprobada":
            if not _tiene_nota_aprobatoria(db, alumno_id, pr.prerrequisito_id):
                pendientes.append({"materia_id": pr.prerrequisito_id, "tipo": "aprobada"})
        elif pr.tipo == "cursando":
            if not _tiene_inscripcion(db, alumno_id, pr.prerrequisito_id):
                pendientes.append({"materia_id": pr.prerrequisito_id, "tipo": "cursando"})

    return {"valido": len(pendientes) == 0, "pendientes": pendientes}
