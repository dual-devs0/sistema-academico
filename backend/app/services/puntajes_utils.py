"""Utilidades compartidas para cálculo de promedios sobre puntos configurables por materia."""

from sqlalchemy.orm import Session

from app.models.peso_evaluacion import PesoEvaluacion, PESO_DEFAULT
from app.models.puntaje import Puntaje

PESOS = PESO_DEFAULT  # compat: algunos callers legacy solo usan las claves (parcial1/parcial2/practico/final)
PESO_DEFAULT_FLOAT = {k: float(v) for k, v in PESO_DEFAULT.items()}

FINAL_TIPOS = ("final1", "final2", "final3")


def get_pesos(db: Session, materia_id: int | None) -> dict[str, float]:
    """Puntaje máximo por tipo para una materia. Sin fila configurada -> default 20/20/10/50."""
    if materia_id is not None:
        peso = db.query(PesoEvaluacion).filter(PesoEvaluacion.materia_id == materia_id).first()
        if peso:
            return {
                "parcial1": float(peso.parcial1_max),
                "parcial2": float(peso.parcial2_max),
                "practico": float(peso.practico_max),
                "final": float(peso.final_max),
            }
    return {k: float(v) for k, v in PESO_DEFAULT.items()}


def calcular_promedio_final(
    notas: dict[str, float | None], pesos: dict[str, float] | None = None
) -> float | None:
    """
    Promedio 0-10 a partir de puntos obtenidos / puntos máximos configurados (reescalado a /10).
    Si falta algún tipo, se recalcula proporcional solo con los tipos presentes (materia "en curso").
    El final efectivo es el mayor valor no nulo entre final1/final2/final3 (mejor nota entre oportunidades).
    """
    pesos = pesos or PESO_DEFAULT_FLOAT
    final_vals = [notas.get(t) for t in FINAL_TIPOS if notas.get(t) is not None]
    final_efectivo = max(final_vals) if final_vals else notas.get("final")  # compat con tipo legacy "final"

    tipos = {
        "parcial1": notas.get("parcial1"),
        "parcial2": notas.get("parcial2"),
        "practico": notas.get("practico"),
        "final": final_efectivo,
    }
    existentes = {k: v for k, v in tipos.items() if v is not None}
    if not existentes:
        return None
    max_total = sum(pesos[k] for k in existentes)
    if max_total == 0:
        return None
    puntos = sum(existentes.values())
    return round(puntos / max_total * 10, 2)


TIPOS_VALIDOS = {"parcial1", "parcial2", "practico", "final1", "final2", "final3"}


def promedios_por_alumno(db: Session, user_ids: list[int]) -> dict[int, float]:
    """
    Promedio 0-10 por alumno (promedio de sus promedios por materia, cada uno ya
    ponderado por los pesos reales de esa materia). Reemplaza el AVG(valor) crudo,
    que mezclaría escalas distintas (parcial máx 20 vs final máx 50) sin sentido.
    """
    if not user_ids:
        return {}
    filas = (
        db.query(Puntaje)
        .filter(Puntaje.user_id.in_(user_ids), Puntaje.tipo.in_(TIPOS_VALIDOS))
        .all()
    )
    if not filas:
        return {}

    materia_ids = {f.materia_id for f in filas if f.materia_id is not None}
    pesos_por_materia = {mid: get_pesos(db, mid) for mid in materia_ids}

    por_alumno_materia: dict[tuple[int, int], dict[str, float | None]] = {}
    for f in filas:
        mid = f.materia_id
        if mid is None:
            continue
        key = (f.user_id, mid)
        d = por_alumno_materia.setdefault(key, {t: None for t in TIPOS_VALIDOS})
        d[f.tipo] = float(f.valor)

    promedios_por_materia: dict[int, list[float]] = {}
    for (uid, mid), notas in por_alumno_materia.items():
        prom = calcular_promedio_final(notas, pesos_por_materia[mid])
        if prom is not None:
            promedios_por_materia.setdefault(uid, []).append(prom)

    return {
        uid: round(sum(vals) / len(vals), 2)
        for uid, vals in promedios_por_materia.items()
    }
