from __future__ import annotations

from sqlalchemy.orm import Session
from app.models.correlatividad import Correlatividad
from app.models.puntaje import Puntaje
from app.models.oferta_materia import OfertaMateria
from app.models.inscripcion import Inscripcion

PESOS = {"parcial1": 0.25, "parcial2": 0.25, "practico": 0.20, "final": 0.30}


def _tiene_nota_aprobatoria(db: Session, alumno_id: int, materia_id: int) -> bool:
    """True si el alumno tiene promedio ponderado >= 6 en CUALQUIER oferta de la materia."""  # noqa: E501
    ofertas_ids = [
        o.id
        for o in db.query(OfertaMateria.id)
        .filter(OfertaMateria.materia_id == materia_id)
        .all()
    ]
    if not ofertas_ids:
        return False
    puntajes = (
        db.query(Puntaje)
        .filter(
            Puntaje.user_id == alumno_id, Puntaje.oferta_materia_id.in_(ofertas_ids)
        )
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


def promedio_y_estado_intento(
    db: Session, alumno_id: int, materia_id: int
) -> tuple[float | None, bool, bool]:
    """Para una materia: (mejor promedio ponderado entre ofertas, si está
    inscripto en una oferta ACTIVA, si tiene un intento en oferta ya CERRADA
    con promedio < 6 — es decir, reprobado)."""
    ofertas = (
        db.query(OfertaMateria).filter(OfertaMateria.materia_id == materia_id).all()
    )
    if not ofertas:
        return None, False, False
    activa_por_oferta = {o.id: bool(o.activa) for o in ofertas}
    ofertas_ids = list(activa_por_oferta.keys())

    inscriptas_ids = {
        i.oferta_materia_id
        for i in db.query(Inscripcion)
        .filter(
            Inscripcion.alumno_id == alumno_id,
            Inscripcion.oferta_materia_id.in_(ofertas_ids),
        )
        .all()
    }
    inscripto_en_activa = any(activa_por_oferta.get(oid) for oid in inscriptas_ids)

    puntajes = (
        db.query(Puntaje)
        .filter(
            Puntaje.user_id == alumno_id, Puntaje.oferta_materia_id.in_(ofertas_ids)
        )
        .all()
    )
    por_oferta: dict[int, dict] = {}
    for p in puntajes:
        por_oferta.setdefault(p.oferta_materia_id, {})[p.tipo] = float(p.valor)

    mejor_promedio: float | None = None
    reprobado_en_oferta_cerrada = False
    for oferta_id, notas in por_oferta.items():
        existentes = {k: v for k, v in notas.items() if k in PESOS}
        if not existentes:
            continue
        peso_total = sum(PESOS[k] for k in existentes)
        if peso_total == 0:
            continue
        promedio = sum(PESOS[k] * v for k, v in existentes.items()) / peso_total
        if mejor_promedio is None or promedio > mejor_promedio:
            mejor_promedio = promedio
        if promedio < 6 and not activa_por_oferta.get(oferta_id, True):
            reprobado_en_oferta_cerrada = True

    return mejor_promedio, inscripto_en_activa, reprobado_en_oferta_cerrada


def _tiene_nota_aprobatoria_cached(
    materia_id: int,
    ofertas_por_materia: dict,
    puntajes_por_oferta: dict,
) -> bool:
    """Version sin DB — usa datos pre-cargados."""
    for oferta in ofertas_por_materia.get(materia_id, []):
        notas = puntajes_por_oferta.get(oferta.id, {})
        existentes = {k: v for k, v in notas.items() if k in PESOS}
        if not existentes:
            continue
        peso_total = sum(PESOS[k] for k in existentes)
        if peso_total == 0:
            continue
        if sum(PESOS[k] * v for k, v in existentes.items()) / peso_total >= 6:
            return True
    return False


def _calcular_estado_cached(
    materia_id: int,
    ofertas_por_materia: dict,
    inscriptas_oferta_ids: set,
    puntajes_por_oferta: dict,
    activa_por_oferta_id: dict,
    correlatividades_por_materia: dict,
    prereq_nombres: dict,
) -> tuple[str, list[dict], float | None]:
    """Versión sin DB de _calcular_estado_materia — usa datos pre-cargados en batch."""
    mejor_promedio: float | None = None
    inscripto_en_activa = False
    reprobado_en_cerrada = False

    for oferta in ofertas_por_materia.get(materia_id, []):
        if oferta.id in inscriptas_oferta_ids and activa_por_oferta_id.get(oferta.id):
            inscripto_en_activa = True
        notas = puntajes_por_oferta.get(oferta.id, {})
        existentes = {k: v for k, v in notas.items() if k in PESOS}
        if existentes:
            peso_total = sum(PESOS[k] for k in existentes)
            if peso_total > 0:
                promedio = sum(PESOS[k] * v for k, v in existentes.items()) / peso_total
                if mejor_promedio is None or promedio > mejor_promedio:
                    mejor_promedio = promedio
                if promedio < 6 and not activa_por_oferta_id.get(oferta.id, True):
                    reprobado_en_cerrada = True

    if mejor_promedio is not None and mejor_promedio >= 6:
        return "aprobada", [], mejor_promedio
    if inscripto_en_activa:
        return "cursando", [], mejor_promedio
    if reprobado_en_cerrada:
        return "reprobada", [], mejor_promedio

    corrs = correlatividades_por_materia.get(materia_id, [])
    if not corrs:
        return "pendiente", [], mejor_promedio

    pendientes = []
    for c in corrs:
        cumple = False
        if c.tipo == "aprobada":
            cumple = _tiene_nota_aprobatoria_cached(c.prerrequisito_id, ofertas_por_materia, puntajes_por_oferta)
        elif c.tipo == "cursando":
            cumple = any(
                o.id in inscriptas_oferta_ids
                for o in ofertas_por_materia.get(c.prerrequisito_id, [])
            )
        if not cumple:
            pendientes.append({
                "materia_id": c.prerrequisito_id,
                "materia_nombre": prereq_nombres.get(c.prerrequisito_id, "—"),
                "tipo": c.tipo,
            })

    if pendientes:
        return "bloqueada", pendientes, mejor_promedio
    return "pendiente", [], mejor_promedio


def _tiene_inscripcion(db: Session, alumno_id: int, materia_id: int) -> bool:
    """True si el alumno tiene (o tuvo) inscripcion activa en cualquier oferta de la materia."""  # noqa: E501
    ofertas_ids = [
        o.id
        for o in db.query(OfertaMateria.id)
        .filter(OfertaMateria.materia_id == materia_id)
        .all()
    ]
    if not ofertas_ids:
        return False
    return db.query(
        db.query(Inscripcion)
        .filter(
            Inscripcion.alumno_id == alumno_id,
            Inscripcion.oferta_materia_id.in_(ofertas_ids),
        )
        .exists()
    ).scalar()


def validar_correlatividades(alumno_id: int, materia_id: int, db: Session) -> dict:
    """Evalua todos los prerrequisitos de materia_id para alumno_id.

    Devuelve {"valido": bool, "pendientes": [{"materia_id", "tipo"}, ...]}
    Evalua TODOS los prerrequisitos, no corta en el primero que falla.
    """
    prerequisitos = (
        db.query(Correlatividad).filter(Correlatividad.materia_id == materia_id).all()
    )
    if not prerequisitos:
        return {"valido": True, "pendientes": []}

    pendientes = []
    for pr in prerequisitos:
        if pr.tipo == "aprobada":
            if not _tiene_nota_aprobatoria(db, alumno_id, pr.prerrequisito_id):
                pendientes.append(
                    {"materia_id": pr.prerrequisito_id, "tipo": "aprobada"}
                )
        elif pr.tipo == "cursando":
            if not _tiene_inscripcion(db, alumno_id, pr.prerrequisito_id):
                pendientes.append(
                    {"materia_id": pr.prerrequisito_id, "tipo": "cursando"}
                )

    return {"valido": len(pendientes) == 0, "pendientes": pendientes}
