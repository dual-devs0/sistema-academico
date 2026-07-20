"""Utilidades compartidas para cálculo de promedios ponderados."""

PESOS = {"parcial1": 0.25, "parcial2": 0.25, "practico": 0.20, "final": 0.30}


def calcular_promedio_final(notas: dict[str, float | None]) -> float | None:
    """
    Calcula promedio ponderado.
    Si falta alguna nota se calcula con las disponibles (proporcional).
    """
    existentes = {k: v for k, v in notas.items() if v is not None}
    if not existentes:
        return None
    peso_total = sum(PESOS[k] for k in existentes)
    if peso_total == 0:
        return None
    ponderado = sum(PESOS[k] * v for k, v in existentes.items())
    return round(ponderado / peso_total, 2)