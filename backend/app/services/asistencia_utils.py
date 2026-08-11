"""
services/asistencia_utils.py — puntaje de asistencia por sesion de clase (0-5).

Regla confirmada por el usuario (no esta escrita en el Reglamento formal, es
la practica real de la facultad):
- presente                          -> 5
- ausente con justificativo (motivo)-> 3 o 4, a criterio del profesor
  (columna puntaje_justificacion, elegida al marcar la ausencia)
- ausente sin justificativo         -> 0

El "porcentaje de asistencia" de un alumno es el promedio de estos puntajes
por sesion, escalado a 100 (avg/5*100) -- NO es un simple presentes/total.
Toda la app (gate de regularidad, dashboards, boleta, mobile) debe leer este
mismo calculo -- no reimplementar presentes/total en otro lado.

puntaje_sesion() es la version Python (fila por fila); puntaje_asistencia_sql()
es el equivalente en SQLAlchemy `case()` para usar en queries agregadas
(SUM/AVG) sin traer todas las filas a Python. Deben mantenerse en sync.
"""
from sqlalchemy import case as sa_case

PUNTAJE_PRESENTE = 5
PUNTAJE_AUSENTE_SIN_JUSTIFICAR = 0
# Fallback para ausencias con motivo pero sin puntaje_justificacion elegido
# (registros legacy anteriores a esta feature, o carga por API vieja).
PUNTAJE_JUSTIFICADA_DEFAULT = 4


def puntaje_sesion(presente: bool, motivo: str | None, puntaje_justificacion: int | None) -> int:
    if presente:
        return PUNTAJE_PRESENTE
    if puntaje_justificacion in (3, 4):
        return puntaje_justificacion
    if motivo:
        return PUNTAJE_JUSTIFICADA_DEFAULT
    return PUNTAJE_AUSENTE_SIN_JUSTIFICAR


def porcentaje_desde_puntajes(puntajes: list[int]) -> float:
    if not puntajes:
        return 0.0
    return round(sum(puntajes) / len(puntajes) / PUNTAJE_PRESENTE * 100, 1)


def puntaje_asistencia_sql(Asistencia):
    """Expresion SQL equivalente a puntaje_sesion(), para usar dentro de
    func.sum()/func.avg() en queries agregadas."""
    return sa_case(
        (Asistencia.presente == True, PUNTAJE_PRESENTE),  # noqa: E712
        (Asistencia.puntaje_justificacion.in_((3, 4)), Asistencia.puntaje_justificacion),
        (Asistencia.motivo.isnot(None), PUNTAJE_JUSTIFICADA_DEFAULT),
        else_=PUNTAJE_AUSENTE_SIN_JUSTIFICAR,
    )
