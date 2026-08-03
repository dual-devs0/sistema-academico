"""Genera el PDF de Boleta con WeasyPrint + Jinja2 (app/templates/boleta_pdf.html),
a partir del reporte SIN filtrar de services/reporte_notas.py. El scope decide
qué páginas arma:
- "global": página resumen (evolución por semestre) + una página de detalle
  por cada semestre con notas.
- "anio": mini-resumen acotado a ese año + detalle de sus semestres.
- "semestre_actual": una sola página de detalle, sin resumen.
CSS @page de la plantilla maneja la numeración de página (counter(page)),
por eso WeasyPrint en vez de reportlab acá.
"""
import base64
import os
from datetime import datetime, timezone

from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "..", "templates")
LOGO_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "static", "branding", "logo_sistema.png")

_env = Environment(loader=FileSystemLoader(TEMPLATES_DIR), autoescape=True)

APROBACION_MINIMA = 6.0


def _badge_clase(promedio: float) -> str:
    if promedio >= 8:
        return "badge-alto"
    if promedio >= APROBACION_MINIMA:
        return "badge-medio"
    return "badge-bajo"


def _kpi_clase(promedio: float | None) -> str:
    if promedio is None:
        return "indigo"
    if promedio >= 8:
        return "mint"
    if promedio >= APROBACION_MINIMA:
        return "amber"
    return "coral"


def _nota_label(promedio: float, felicitado: bool) -> str:
    txt = f"{promedio:.2f}".rstrip("0").rstrip(".")
    return f"{txt}F" if felicitado else txt


def _periodo_label(periodo: str) -> str:
    try:
        anio, sem = periodo.split("-")
        return f"{sem}° Semestre {anio}"
    except (ValueError, AttributeError):
        return periodo


def _fmt_fecha(dt) -> str:
    if not dt:
        return "—"
    return dt.strftime("%d/%m/%Y")


_logo_cache: dict[str, str] = {}


def _logo_data_uri() -> str:
    if "uri" in _logo_cache:
        return _logo_cache["uri"]
    try:
        with open(LOGO_PATH, "rb") as f:
            b64 = base64.b64encode(f.read()).decode()
        uri = f"data:image/png;base64,{b64}"
    except FileNotFoundError:
        uri = ""
    _logo_cache["uri"] = uri
    return uri


def _resumen_ctx(semestres_scope: list[dict], titulo_materias: str) -> dict:
    total_materias = sum(len(s["materias"]) for s in semestres_scope)
    todas_notas = [m for s in semestres_scope for m in s["materias"]]
    proms = [m["promedio"] for m in todas_notas]
    promedio_general = round(sum(proms) / len(proms), 2) if proms else None
    aprobadas = sum(1 for m in todas_notas if m["aprobado"])
    reprobadas = sum(1 for m in todas_notas if not m["aprobado"])
    n_sem = len(semestres_scope)

    kpis = [
        {"label": titulo_materias, "valor": total_materias, "clase": "indigo",
         "sub": f"{n_sem} semestre{'s' if n_sem != 1 else ''}"},
        {"label": "Promedio general", "valor": (f"{promedio_general:.2f}" if promedio_general is not None else "—"),
         "clase": _kpi_clase(promedio_general), "sub": "sobre notas numéricas"},
        {"label": "Aprobadas", "valor": aprobadas, "clase": "mint", "sub": None},
        {"label": "Reprobadas", "valor": reprobadas, "clase": ("coral" if reprobadas else "mint"), "sub": None},
    ]

    evolucion = []
    for s in sorted(semestres_scope, key=lambda x: x["periodo"]):
        proms_s = [m["promedio"] for m in s["materias"]]
        prom_s = round(sum(proms_s) / len(proms_s), 2) if proms_s else 0
        reprobadas_s = sum(1 for m in s["materias"] if not m["aprobado"])
        evolucion.append({
            "periodo_label": _periodo_label(s["periodo"]),
            "materias_count": len(s["materias"]),
            "promedio": f"{prom_s:.2f}",
            "badge_clase": _badge_clase(prom_s),
            "reprobadas": reprobadas_s,
        })

    return {"kpis": kpis, "evolucion": evolucion}


def _detalle_periodo(sem: dict) -> dict:
    materias = sem["materias"]
    proms = [m["promedio"] for m in materias]
    promedio_periodo = round(sum(proms) / len(proms), 2) if proms else None
    reprobadas = sum(1 for m in materias if not m["aprobado"])
    max_nota = max(proms) if proms else None
    max_count = sum(1 for p in proms if max_nota is not None and round(p, 2) == round(max_nota, 2))

    kpis = [
        {"label": "Materias del período", "valor": len(materias), "clase": "indigo", "sub": None},
        {"label": "Promedio del período", "valor": (f"{promedio_periodo:.2f}" if promedio_periodo is not None else "—"),
         "clase": _kpi_clase(promedio_periodo), "sub": None},
        {"label": "Reprobadas", "valor": reprobadas, "clase": ("coral" if reprobadas else "mint"), "sub": None},
        {"label": "Nota más alta", "valor": (f"{max_nota:.2f}".rstrip("0").rstrip(".") if max_nota is not None else "—"),
         "clase": "mint", "sub": (f"{max_count} materia{'s' if max_count != 1 else ''}" if max_count else None)},
    ]

    materias_out = [
        {
            "codigo": m.get("materia_codigo") or f"MAT-{m['materia_id']:03d}",
            "nombre": m["materia_nombre"],
            "recursada": m["recursada"],
            "nota_label": _nota_label(m["promedio"], m["felicitado"]),
            "badge_clase": _badge_clase(m["promedio"]),
            "fecha_label": _fmt_fecha(m.get("fecha")),
        }
        for m in sorted(materias, key=lambda x: x["materia_nombre"])
    ]

    return {
        "periodo_label": _periodo_label(sem["periodo"]),
        "kpis": kpis,
        "materias": materias_out,
    }


def render_boleta_pdf(reporte: dict, scope: str, anio: int | None = None, semestre: int | None = None) -> bytes:
    """`reporte` es la salida de construir_reporte_notas() SIN filtrar (todo el
    historial) — el recorte de qué semestres mostrar se hace acá según scope."""
    todos_semestres = reporte["semestres"]

    if scope == "semestre_actual":
        periodo_objetivo = reporte["periodos_disponibles"][0] if reporte["periodos_disponibles"] else None
        semestres_scope = [s for s in todos_semestres if s["periodo"] == periodo_objetivo]
        resumen_ctx = None
        if semestres_scope:
            proms = [m["promedio"] for m in semestres_scope[0]["materias"]]
            avg = sum(proms) / len(proms) if proms else None
            pill_clase = "coral" if avg is not None and avg < APROBACION_MINIMA else "mint"
            pill_label = f"Descarga individual · {_periodo_label(semestres_scope[0]['periodo'])}"
        else:
            pill_clase = "indigo"
            pill_label = "Semestre actual"
    elif scope == "anio":
        semestres_scope = [s for s in todos_semestres if s["periodo"].startswith(f"{anio}-")]
        pill_label = f"Descarga por año · {anio}"
        pill_clase = "indigo"
        resumen_ctx = _resumen_ctx(semestres_scope, "Materias del año")
    else:  # global
        semestres_scope = todos_semestres
        anios = sorted({int(s["periodo"].split("-")[0]) for s in todos_semestres})
        rango = f"{anios[0]}–{anios[-1]}" if anios else "—"
        pill_label = f"Vista global · {rango}"
        pill_clase = "indigo"
        resumen_ctx = _resumen_ctx(semestres_scope, "Materias cursadas")

    detalles = [_detalle_periodo(s) for s in semestres_scope]

    context = {
        "logo_src": _logo_data_uri(),
        "universidad_nombre": "Universidad Católica Nuestra Señora de la Asunción",
        "emitido_str": datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M") + " UTC",
        "alumno": reporte["alumno"],
        "scope_pill_label": pill_label,
        "scope_pill_class": pill_clase,
        "resumen": resumen_ctx,
        "detalles": detalles,
    }

    template = _env.get_template("boleta_pdf.html")
    html_str = template.render(**context)
    return HTML(string=html_str).write_pdf()
