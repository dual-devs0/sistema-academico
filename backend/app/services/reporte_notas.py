"""Agregación de datos para el reporte de calificaciones del alumno (JSON + PDF).

Agrupa notas por semestre usando OfertaMateria.periodo (ej. "2026-1"), ya
existente en el modelo — no hace falta inferir semestre de fechas. Detecta
recursadas: una materia con notas en más de una OfertaMateria (más de un
intento). El intento del período más reciente es el "vigente"; con ese se
arma la tabla por semestre. Las métricas de avance hacia graduación usan
PensumMateria (mismo criterio de aprobación que pensum_router::creditos_alumno
— aprobada si CUALQUIER intento, no solo el vigente, dio promedio >= 6).
Depende de: puntajes_utils (promedio real, no AVG crudo). Usado por:
routers/reporte_notas_router.py (JSON + PDF).
"""
from collections import defaultdict

from sqlalchemy.orm import Session

from app import models
from app.services.puntajes_utils import calcular_promedio_final, get_pesos

APROBACION_MINIMA = 6.0


def _periodo_sort_key(periodo: str | None) -> tuple[int, int]:
    if not periodo:
        return (0, 0)
    try:
        anio_str, sem_str = periodo.split("-")
        return (int(anio_str), int(sem_str))
    except (ValueError, AttributeError):
        return (0, 0)


def construir_reporte_notas(db: Session, alumno_id: int, semestre: str | None = None) -> dict | None:
    alumno = db.query(models.user.User).filter(models.user.User.id == alumno_id).first()
    if not alumno:
        return None

    carrera_nombre = None
    carrera_id = alumno.carrera_id
    if carrera_id:
        carrera = db.query(models.carrera.Carrera).filter(models.carrera.Carrera.id == carrera_id).first()
        if carrera:
            carrera_nombre = carrera.nombre

    filas = (
        db.query(models.puntaje.Puntaje)
        .filter(models.puntaje.Puntaje.user_id == alumno_id)
        .all()
    )

    ofertas_ids = {f.oferta_materia_id for f in filas}
    ofertas = (
        {
            o.id: o
            for o in db.query(models.oferta_materia.OfertaMateria)
            .filter(models.oferta_materia.OfertaMateria.id.in_(ofertas_ids))
            .all()
        }
        if ofertas_ids
        else {}
    )
    materia_ids = {o.materia_id for o in ofertas.values()}
    materias_map = (
        {
            m.id: m
            for m in db.query(models.materia.Materia)
            .filter(models.materia.Materia.id.in_(materia_ids))
            .all()
        }
        if materia_ids
        else {}
    )

    notas_por_oferta: dict[int, dict] = defaultdict(dict)
    felicitado_por_oferta: dict[int, bool] = {}
    for f in filas:
        notas_por_oferta[f.oferta_materia_id][f.tipo] = float(f.valor)
        if f.tipo == "directa":
            felicitado_por_oferta[f.oferta_materia_id] = bool(f.felicitado)

    pesos_cache: dict[int, dict] = {}

    def pesos_de(materia_id: int) -> dict:
        if materia_id not in pesos_cache:
            pesos_cache[materia_id] = get_pesos(db, materia_id)
        return pesos_cache[materia_id]

    # materia_id -> lista de intentos {oferta_id, periodo, promedio, felicitado}
    intentos_por_materia: dict[int, list[dict]] = defaultdict(list)
    for oferta_id, notas in notas_por_oferta.items():
        oferta = ofertas.get(oferta_id)
        if not oferta:
            continue
        mid = oferta.materia_id
        promedio = calcular_promedio_final(notas, pesos_de(mid))
        if promedio is None:
            continue
        intentos_por_materia[mid].append({
            "oferta_id": oferta_id,
            "periodo": oferta.periodo,
            "promedio": promedio,
            "felicitado": felicitado_por_oferta.get(oferta_id, False),
        })

    semestres_map: dict[str, list[dict]] = defaultdict(list)
    recursadas: list[dict] = []
    vigentes: dict[int, dict] = {}
    aprobada_alguna_vez: dict[int, bool] = {}

    for mid, intentos in intentos_por_materia.items():
        intentos.sort(key=lambda x: _periodo_sort_key(x["periodo"]))
        materia = materias_map.get(mid)
        nombre = materia.nombre if materia else f"Materia #{mid}"
        vigente = intentos[-1]
        vigentes[mid] = {**vigente, "materia_nombre": nombre}
        aprobada_alguna_vez[mid] = any(it["promedio"] >= APROBACION_MINIMA for it in intentos)

        if len(intentos) > 1:
            recursadas.append({
                "materia_id": mid,
                "materia_nombre": nombre,
                "intentos": [
                    {
                        "periodo": it["periodo"],
                        "promedio": it["promedio"],
                        "felicitado": it["felicitado"],
                        "aprobado": it["promedio"] >= APROBACION_MINIMA,
                        "vigente": it["oferta_id"] == vigente["oferta_id"],
                    }
                    for it in intentos
                ],
            })

        if vigente["periodo"]:
            semestres_map[vigente["periodo"]].append({
                "materia_id": mid,
                "materia_nombre": nombre,
                "promedio": vigente["promedio"],
                "felicitado": vigente["felicitado"],
                "aprobado": vigente["promedio"] >= APROBACION_MINIMA,
                "recursada": len(intentos) > 1,
            })

    recursadas.sort(key=lambda r: r["materia_nombre"])

    # ── Métricas globales (siempre sobre TODO el historial, no filtradas por semestre) ──
    proms_vigentes = [v["promedio"] for v in vigentes.values()]
    promedio_general = round(sum(proms_vigentes) / len(proms_vigentes), 2) if proms_vigentes else None
    materias_aprobadas = sum(1 for v in vigentes.values() if v["promedio"] >= APROBACION_MINIMA)

    total_materias_plan = None
    materias_aprobadas_plan = None
    avance_pct = None
    faltan = None
    if carrera_id:
        plan = (
            db.query(models.pensum_materia.PensumMateria)
            .filter(models.pensum_materia.PensumMateria.carrera_id == carrera_id)
            .all()
        )
        if plan:
            total_materias_plan = len(plan)
            materias_aprobadas_plan = sum(
                1 for pm in plan if aprobada_alguna_vez.get(pm.materia_id, False)
            )
            avance_pct = round(materias_aprobadas_plan / total_materias_plan * 100) if total_materias_plan else 0
            faltan = total_materias_plan - materias_aprobadas_plan

    semestres_ordenados = sorted(semestres_map.keys(), key=_periodo_sort_key, reverse=True)
    if semestre:
        semestres_ordenados = [s for s in semestres_ordenados if s == semestre]

    semestres_out = [
        {
            "periodo": s,
            "materias": sorted(semestres_map[s], key=lambda x: x["materia_nombre"]),
        }
        for s in semestres_ordenados
    ]

    return {
        "alumno": {
            "user_id": alumno.id,
            "nombre": alumno.nombre or alumno.username,
            "cedula": alumno.cedula,
            "carrera_nombre": carrera_nombre,
        },
        "metricas": {
            "promedio_general": promedio_general,
            "materias_aprobadas": materias_aprobadas,
            "total_materias_plan": total_materias_plan,
            "materias_aprobadas_plan": materias_aprobadas_plan,
            "avance_pct": avance_pct,
            "faltan": faltan,
        },
        "periodos_disponibles": sorted(semestres_map.keys(), key=_periodo_sort_key, reverse=True),
        "semestres": semestres_out,
        "recursadas": recursadas,
    }
