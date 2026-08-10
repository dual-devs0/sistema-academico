"""Utilidades compartidas para cálculo de promedios sobre puntos configurables por materia.

Motor de notas 0-100 por puntos (parcial1/parcial2/práctico + final, mejor
oportunidad entre final1/2/3). El resultado final es un ENTERO 1-5 -- escala
oficial de la Universidad Católica "Nuestra Señora de la Asunción" (Art. 24º
del Reglamento de Estudiante, ver PORCENTAJE_A_ESCALON abajo), no 0-10.
Depende de: models.peso_evaluacion (pesos por materia, default 20/20/10/50
sumando 100). Usado por: puntajes_router.py, alumno_router.py, boleta_router.py,
reportes_router.py — cualquier lugar que muestre un promedio de materia.
Si get_pesos()/calcular_promedio_final() calculan mal, el error se propaga
directo al PPA y a la boleta oficial del alumno.
"""

import math

from sqlalchemy.orm import Session

from app.models.peso_evaluacion import PesoEvaluacion, PESO_DEFAULT
from app.models.puntaje import Puntaje

PESOS = PESO_DEFAULT  # compat: algunos callers legacy solo usan las claves (parcial1/parcial2/practico/final)
PESO_DEFAULT_FLOAT = {k: float(v) for k, v in PESO_DEFAULT.items()}

FINAL_TIPOS = ("final1", "final2", "final3")

# Nota minima de aprobacion (escala 1-5, Art. 24 Reglamento UCA -- ver
# porcentaje_a_escalon). Fuente unica -- reporte_notas.py, boleta_pdf.py,
# graduacion.py y cualquier otro lugar que necesite este corte deben
# importarlo de aca, no redeclararlo, para que boleta/expediente/dashboard
# nunca puedan divergir en que cuenta como "aprobado".
APROBACION_MINIMA = 2

# Tabla oficial de conversion porcentaje -> nota final (Art. 24 Reglamento de
# Estudiante UCA). Los rangos son tal cual el reglamento (asimetricos: la
# banda de 4 son 11 puntos porcentuales, la de 5 son 10) -- no "inventar" una
# division pareja en quintos.
#   0-59   -> 1 (reprobado)
#  60-69   -> 2 (aprobado, minimo)
#  70-79   -> 3
#  80-90   -> 4
#  91-100  -> 5
_ESCALONES = (
    (59, 1),
    (69, 2),
    (79, 3),
    (90, 4),
)


def redondear_half_up(x: float) -> int:
    """Round-half-up a entero (3.5 -> 4, 3.4 -> 3, -3.5 -> -3).

    Unica funcion de redondeo del sistema de notas -- Python round() usa
    banker's rounding (round half to even: round(2.5)==2), lo que produciria
    resultados distintos para alumnos con desempeño casi identico segun si su
    porcentaje cae en un ".5" par o impar. Se usa tanto para porcentaje_a_escalon
    como para el PPA (services/expediente.py::calcular_ppa) -- una sola regla
    en todo el sistema, no una por archivo.
    """
    return math.floor(x + 0.5) if x >= 0 else -math.floor(-x + 0.5)


def porcentaje_a_escalon(pct: float) -> int:
    """Convierte un porcentaje 0-100 a la nota final entera 1-5 (Art. 24).

    Redondeo round-half-up ANTES de mapear a la tabla (59.5% -> 60 -> nota 2).
    """
    pct_clamped = max(0.0, min(100.0, pct))
    pct_redondeado = redondear_half_up(pct_clamped)
    for limite, nota in _ESCALONES:
        if pct_redondeado <= limite:
            return nota
    return 5


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
) -> int | None:
    """
    Nota final entera 1-5 (Art. 24 Reglamento UCA) a partir de puntos obtenidos
    / puntos máximos configurados, convertidos a porcentaje y mapeados con
    porcentaje_a_escalon(). Si falta algún tipo, se calcula proporcional solo
    con los tipos presentes (materia "en curso" -- mismo criterio que antes,
    solo cambia la tabla de salida).
    El final efectivo es el mayor valor no nulo entre final1/final2/final3 (mejor nota entre oportunidades).
    Si hay una nota "directa" (carga simplificada del profesor), el profesor ya
    decide directamente el escalón final 1-5 -- no es un porcentaje a convertir,
    se usa tal cual (ver puntaje_schema.py, valida rango 1-5).
    """
    if notas.get("directa") is not None:
        return int(round(float(notas["directa"])))
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
    pct = puntos / max_total * 100
    return porcentaje_a_escalon(pct)


TIPOS_VALIDOS = {"parcial1", "parcial2", "practico", "final1", "final2", "final3", "directa"}


def promedios_por_alumno(db: Session, user_ids: list[int]) -> dict[int, float]:
    """
    Promedio informal por alumno en escala 1-5 (promedio simple de sus notas
    finales por materia, cada una ya calculada con porcentaje_a_escalon).
    Es un KPI agregado para dashboards -- NO es el PPA oficial (ese es
    services/expediente.py::calcular_ppa, ponderado por creditos y entero).
    Por eso se devuelve como float, no redondeado a entero: acá interesa la
    tendencia (3.4 dice mas que "3" en un dashboard), el PPA real si es entero
    puro. Reemplaza el AVG(valor) crudo, que mezclaría escalas distintas
    (parcial máx 20 vs final máx 50) sin sentido.
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
