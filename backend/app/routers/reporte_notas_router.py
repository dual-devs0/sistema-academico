"""Reporte de calificaciones del alumno: JSON (web/app) + PDF descargable, por
semestre o global. Agrupamiento y métricas viven en services/reporte_notas.py;
este router solo valida acceso (siempre self-service, igual que alumno_router.py)
y arma el PDF con reportlab (mismo patrón visual que boleta_router.py).
"""
import io
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)
from reportlab.lib.enums import TA_CENTER, TA_RIGHT

from app import database
from app.dependencias import get_current_user
from app.services.reporte_notas import construir_reporte_notas

router = APIRouter(prefix="/alumno", tags=["alumno"])


def _fmt_nota(m: dict) -> str:
    txt = f"{m['promedio']:.2f}".rstrip("0").rstrip(".")
    return f"{txt}F" if m["felicitado"] else txt


def _periodo_label(periodo: str) -> str:
    try:
        anio, sem = periodo.split("-")
        return f"{'Primer' if sem == '1' else 'Segundo'} semestre {anio}"
    except (ValueError, AttributeError):
        return periodo


def _build_pdf(reporte: dict, titulo: str, mostrar_recursadas: bool = True) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=2 * cm, rightMargin=2 * cm, topMargin=2 * cm, bottomMargin=2 * cm,
    )
    styles = getSampleStyleSheet()
    style_title = ParagraphStyle("t", parent=styles["Heading1"], fontSize=14, alignment=TA_CENTER,
                                  textColor=colors.HexColor("#0f172a"), spaceAfter=2)
    style_sub = ParagraphStyle("su", parent=styles["Normal"], fontSize=10, alignment=TA_CENTER,
                                textColor=colors.HexColor("#64748b"), spaceAfter=2)
    style_h2 = ParagraphStyle("h2", parent=styles["Heading2"], fontSize=12,
                               textColor=colors.HexColor("#0f172a"), spaceBefore=10, spaceAfter=6)
    style_small = ParagraphStyle("s", parent=styles["Normal"], fontSize=9, textColor=colors.HexColor("#64748b"))
    style_small_c = ParagraphStyle("sc", parent=style_small, alignment=TA_CENTER)

    alumno = reporte["alumno"]
    met = reporte["metricas"]
    story = []

    story.append(Paragraph("Reporte de Calificaciones", style_title))
    story.append(Paragraph(alumno["nombre"], style_sub))
    ci = f"C.I. {alumno['cedula']}" if alumno.get("cedula") else ""
    carrera = alumno.get("carrera_nombre") or "—"
    story.append(Paragraph(" · ".join(p for p in [ci, carrera] if p), style_small))
    story.append(Paragraph(titulo, style_small))
    story.append(Spacer(1, 0.4 * cm))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0")))
    story.append(Spacer(1, 0.4 * cm))

    # Métricas
    def _m(label, val):
        return Paragraph(f"<font size=8 color='#64748b'>{label}</font><br/><font size=16><b>{val}</b></font>", style_small)

    prom_txt = f"{met['promedio_general']:.2f}" if met["promedio_general"] is not None else "—"
    avance_txt = f"{met['avance_pct']}%" if met["avance_pct"] is not None else "—"
    faltan_txt = str(met["faltan"]) if met["faltan"] is not None else "—"
    metricas_table = Table(
        [[_m("Promedio general", prom_txt), _m("Materias aprobadas", met["materias_aprobadas"]),
          _m("Avance de carrera", avance_txt), _m("Faltan para graduarse", faltan_txt)]],
        colWidths=[4.25 * cm] * 4,
    )
    metricas_table.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(metricas_table)
    story.append(Spacer(1, 0.5 * cm))

    if met["total_materias_plan"]:
        story.append(Paragraph(
            f"Progreso hacia la graduación: {met['materias_aprobadas_plan']} / {met['total_materias_plan']} materias",
            style_small,
        ))
        story.append(Spacer(1, 0.3 * cm))

    # Tabla por semestre
    for sem in reporte["semestres"]:
        story.append(Paragraph(_periodo_label(sem["periodo"]), style_h2))
        rows = [["Materia", "Nota", "Estado"]]
        for m in sem["materias"]:
            rows.append([m["materia_nombre"], _fmt_nota(m), "Aprobado" if m["aprobado"] else "Reprobado"])
        t = Table(rows, colWidths=[9.5 * cm, 3 * cm, 4.5 * cm], repeatRows=1)
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ]))
        story.append(t)
        story.append(Spacer(1, 0.3 * cm))

    # Recursadas
    if reporte["recursadas"] and mostrar_recursadas:
        story.append(Paragraph("Historial de recursadas", style_h2))
        rows = [["Materia", "Período", "Nota"]]
        for r in reporte["recursadas"]:
            for i, it in enumerate(r["intentos"]):
                nombre = r["materia_nombre"] if i == 0 else ""
                nota_txt = f"{it['promedio']:.2f}".rstrip("0").rstrip(".")
                nota_txt = f"{nota_txt}F" if it["felicitado"] else nota_txt
                nota_txt += " (vigente)" if it["vigente"] else " (histórica)"
                rows.append([nombre, _periodo_label(it["periodo"]), nota_txt])
        t = Table(rows, colWidths=[6 * cm, 5.5 * cm, 5.5 * cm], repeatRows=1)
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#78350f")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#fde68a")),
            ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(t)
        story.append(Spacer(1, 0.3 * cm))

    story.append(Spacer(1, 0.3 * cm))
    fecha_txt = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M") + " UTC"
    story.append(Paragraph(f"Fecha de emisión: {fecha_txt}", ParagraphStyle(
        "fd", parent=styles["Normal"], fontSize=9, textColor=colors.HexColor("#64748b"), alignment=TA_RIGHT)))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e2e8f0")))
    story.append(Paragraph(
        "Documento generado por el Sistema Académico UCA",
        ParagraphStyle("disc", parent=styles["Normal"], fontSize=7,
                        textColor=colors.HexColor("#94a3b8"), alignment=TA_CENTER),
    ))

    doc.build(story)
    buf.seek(0)
    return buf.read()


@router.get("/reporte-notas", response_model=None)
def reporte_notas(
    semestre: str | None = Query(None, description="Formato 'YYYY-N', ej. 2026-1. Sin valor: reporte global."),
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    """Usado por Cursos > Calificaciones (desglose inline por semestre). El PDF
    unificado (con selección de scope) vive en boleta_router::/boleta/pdf —
    reutiliza construir_reporte_notas() y _build_pdf() de este módulo."""
    reporte = construir_reporte_notas(db, current_user.user_id, semestre)
    if reporte is None:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")
    return reporte
