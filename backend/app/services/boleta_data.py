"""Reshape de construir_reporte_notas() al contrato BoletaData del módulo
Boleta (ver frontend/src/pages/Boleta/types.ts). Una sola fuente de datos
(services/reporte_notas.py) evita el desorden de antes, donde el frontend
armaba la vista con llamadas sueltas (mis-notas + mis-periodos + creditos).
"""
from app.services.reporte_notas import construir_reporte_notas


def _mejor_final(m: dict) -> float | None:
    if m.get("directa") is not None:
        return m["directa"]
    finales = [m.get("final1"), m.get("final2"), m.get("final3")]
    finales = [f for f in finales if f is not None]
    return max(finales) if finales else None


def construir_boleta_data(db, alumno_id: int) -> dict | None:
    rep = construir_reporte_notas(db, alumno_id)
    if rep is None:
        return None

    met = rep["metricas"]
    periodo_actual = rep["periodos_disponibles"][0] if rep["periodos_disponibles"] else None

    if met["total_materias_plan"] is not None:
        materias_totales = met["total_materias_plan"]
        avance_pct = met["avance_pct"] or 0
        faltan = met["faltan"] or 0
    else:
        # Sin plan de estudios configurado para la carrera: fallback sobre
        # el total de materias con nota vigente (no hay "requeridas" definido).
        materias_totales = sum(len(s["materias"]) for s in rep["semestres"])
        avance_pct = round(met["materias_aprobadas"] / materias_totales * 100) if materias_totales else 0
        faltan = max(materias_totales - met["materias_aprobadas"], 0)

    resumen = {
        "promedioGlobal": met["promedio_general"] or 0,
        "materiasAprobadas": met["materias_aprobadas"],
        "materiasTotales": materias_totales,
        "avanceCarreraPct": avance_pct,
        "faltanParaGraduarse": faltan,
    }

    periodos = []
    for sem in rep["semestres"]:
        anio_str, sem_str = sem["periodo"].split("-")
        anio, semestre = int(anio_str), int(sem_str)
        etiqueta = f"{semestre}° Semestre {anio}"
        if sem["periodo"] == periodo_actual:
            etiqueta += " (actual)"

        materias = []
        proms = []
        for m in sem["materias"]:
            proms.append(m["promedio"])
            materias.append({
                "id": str(m["materia_id"]),
                "nombre": m["materia_nombre"],
                "p1": m.get("parcial1"),
                "p2": m.get("parcial2"),
                "tp": m.get("practico"),
                "final": _mejor_final(m),
                "promedio": m["promedio"],
                "estado": "aprobado" if m["aprobado"] else "reprobado",
            })

        periodos.append({
            "anio": anio,
            "semestre": semestre,
            "etiqueta": etiqueta,
            "promedioSemestre": round(sum(proms) / len(proms), 2) if proms else 0,
            "materias": materias,
        })

    return {"resumen": resumen, "periodos": periodos}
