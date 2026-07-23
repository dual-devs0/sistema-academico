from __future__ import annotations

from sqlalchemy.orm import Session
from app.models.correlatividad import Correlatividad
from app.models.puntaje import Puntaje
from app.models.oferta_materia import OfertaMateria
from app.models.inscripcion import Inscripcion
from app import models as m
from app.services.puntajes_utils import calcular_promedio_final, get_pesos, PESO_DEFAULT_FLOAT


def _dia_nombre(d: int) -> str:
    dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
    return dias[d] if 0 <= d <= 6 else "?"


def verificar_solapamiento_inscripcion(
    db: Session, alumno_id: int, materia_id_nueva: int
) -> list[str]:
    """
    Verifica si el horario de la materia nueva se superpone
    con materias ya cursadas por el alumno.
    Retorna lista de descripciones de conflictos.
    """
    conflictos = []
    horario_nuevo = (
        db.query(m.horario.Horario)
        .filter(m.horario.Horario.materia_id == materia_id_nueva)
        .all()
    )
    if not horario_nuevo:
        return []

    inscripciones = (
        db.query(m.inscripcion.Inscripcion)
        .filter(
            m.inscripcion.Inscripcion.alumno_id == alumno_id,
        )
        .all()
    )
    materia_ids_existentes = [
        i.oferta.materia_id
        for i in inscripciones
        if i.oferta.materia_id != materia_id_nueva
    ]

    for h_nuevo in horario_nuevo:
        horarios_exist = (
            db.query(m.horario.Horario)
            .filter(
                m.horario.Horario.materia_id.in_(materia_ids_existentes),
                m.horario.Horario.dia_semana == h_nuevo.dia_semana,
            )
            .all()
        )
        for h_exist in horarios_exist:
            if (
                h_nuevo.hora_inicio < h_exist.hora_fin
                and h_nuevo.hora_fin > h_exist.hora_inicio
            ):
                materia_exist = (
                    db.query(m.materia.Materia)
                    .filter(m.materia.Materia.id == h_exist.materia_id)
                    .first()
                )
                conflictos.append(
                    f"'{materia_exist.nombre if materia_exist else '?'}' el día "
                    f"{_dia_nombre(h_exist.dia_semana)} "
                    f"de {h_exist.hora_inicio} a {h_exist.hora_fin}"
                )

    return conflictos


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
    pesos = get_pesos(db, materia_id)
    for notas in por_oferta.values():
        promedio = calcular_promedio_final(notas, pesos)
        if promedio is not None and promedio >= 6:
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
    inscripto_en_activa = any(activa_por_oferta.get(oid) for oid in inscriptas_ids if oid is not None)

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

    pesos = get_pesos(db, materia_id)
    mejor_promedio: float | None = None
    reprobado_en_oferta_cerrada = False
    for oferta_id, notas in por_oferta.items():
        promedio = calcular_promedio_final(notas, pesos)
        if promedio is None:
            continue
        if mejor_promedio is None or promedio > mejor_promedio:
            mejor_promedio = promedio
        if promedio < 6 and not activa_por_oferta.get(oferta_id, True):
            reprobado_en_oferta_cerrada = True

    return mejor_promedio, inscripto_en_activa, reprobado_en_oferta_cerrada


def _tiene_nota_aprobatoria_cached(
    materia_id: int,
    ofertas_por_materia: dict,
    puntajes_por_oferta: dict,
    pesos_por_materia: dict[int, dict] | None = None,
) -> bool:
    """Version sin DB — usa datos pre-cargados."""
    pesos = (pesos_por_materia or {}).get(materia_id, PESO_DEFAULT_FLOAT)
    for oferta in ofertas_por_materia.get(materia_id, []):
        notas = puntajes_por_oferta.get(oferta.id, {})
        promedio = calcular_promedio_final(notas, pesos)
        if promedio is not None and promedio >= 6:
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
    pesos_por_materia: dict[int, dict] | None = None,
) -> tuple[str, list[dict], float | None]:
    """Versión sin DB de _calcular_estado_materia — usa datos pre-cargados en batch."""
    mejor_promedio: float | None = None
    inscripto_en_activa = False
    reprobado_en_cerrada = False
    pesos = (pesos_por_materia or {}).get(materia_id, PESO_DEFAULT_FLOAT)

    for oferta in ofertas_por_materia.get(materia_id, []):
        if oferta.id in inscriptas_oferta_ids and activa_por_oferta_id.get(oferta.id):
            inscripto_en_activa = True
        notas = puntajes_por_oferta.get(oferta.id, {})
        promedio = calcular_promedio_final(notas, pesos)
        if promedio is not None:
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
            cumple = _tiene_nota_aprobatoria_cached(c.prerrequisito_id, ofertas_por_materia, puntajes_por_oferta, pesos_por_materia)
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


def validar_correlatividad_estructural(
    carrera_id: int, materia_id: int, prerrequisito_id: int, db: Session
) -> dict:
    """Validaciones estructurales de una correlatividad (sin considerar alumnos).

    Retorna {"valido": bool, "error": str|None}.
    - Evita ciclos: verifica que materia_id no aparezca en la cadena de
      prerrequisitos de prerrequisito_id (BFS).
    - Evita semestre >=: el prerrequisito debe pertenecer a un semestre
      anterior al de materia_id dentro de la misma carrera.
    """
    PM = m.pensum_materia.PensumMateria

    # 1. Semestre check
    pensum_origen = (
        db.query(PM)
        .filter(PM.carrera_id == carrera_id, PM.materia_id == materia_id)
        .first()
    )
    pensum_prerreq = (
        db.query(PM)
        .filter(PM.carrera_id == carrera_id, PM.materia_id == prerrequisito_id)
        .first()
    )

    if not pensum_origen:
        return {"valido": False, "error": "La materia no pertenece a la malla de esta carrera"}
    if not pensum_prerreq:
        return {"valido": False, "error": "El prerrequisito no pertenece a la malla de esta carrera"}

    if pensum_prerreq.semestre >= pensum_origen.semestre:
        return {
            "valido": False,
            "error": (
                f"El prerrequisito debe estar en un semestre anterior "
                f"(semestre {pensum_prerreq.semestre} >= {pensum_origen.semestre})"
            ),
        }

    # 2. Cycle detection (BFS)
    visitados = {prerrequisito_id}
    cola = [prerrequisito_id]
    while cola:
        actual = cola.pop(0)
        hijos = (
            db.query(Correlatividad)
            .filter(Correlatividad.materia_id == actual)
            .all()
        )
        for h in hijos:
            if h.prerrequisito_id == materia_id:
                return {"valido": False, "error": "La correlatividad crearía un ciclo"}
            if h.prerrequisito_id not in visitados:
                visitados.add(h.prerrequisito_id)
                cola.append(h.prerrequisito_id)

    return {"valido": True, "error": None}
