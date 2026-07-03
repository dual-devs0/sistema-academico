import io
from datetime import datetime, timezone
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

from app import models, database
from app.dependencias import get_current_user

router = APIRouter(prefix="/boleta", tags=["boleta"])

TIPOS = ["parcial1", "parcial2", "practico", "final"]
HEADERS = ["Materia", "Parcial 1", "Parcial 2", "T.P.", "Final", "Promedio"]


def _fmt(val) -> str:
    if val is None:
        return "—"
    try:
        f = float(val)
        return f"{f:.1f}"
    except Exception:
        return "—"


def _build_pdf(user: models.user.User, carrera_nombre: str, puntajes: list) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    style_center = ParagraphStyle("c", parent=styles["Normal"], alignment=TA_CENTER)
    style_small  = ParagraphStyle("s", parent=styles["Normal"], fontSize=9, textColor=colors.HexColor("#64748b"))
    style_small_c= ParagraphStyle("sc", parent=style_small, alignment=TA_CENTER)
    style_title  = ParagraphStyle("t", parent=styles["Heading1"], fontSize=14, alignment=TA_CENTER, textColor=colors.HexColor("#0f172a"), spaceAfter=2)
    style_sub    = ParagraphStyle("su", parent=styles["Normal"], fontSize=10, alignment=TA_CENTER, textColor=colors.HexColor("#64748b"), spaceAfter=4)
    style_label  = ParagraphStyle("la", parent=styles["Normal"], fontSize=9, textColor=colors.HexColor("#94a3b8"))
    style_value  = ParagraphStyle("va", parent=styles["Normal"], fontSize=11, textColor=colors.HexColor("#0f172a"), spaceAfter=2)

    story = []

    # Header
    story.append(Paragraph("Universidad Católica de Caacupé", style_title))
    story.append(Paragraph("Sistema Académico — Boleta de Calificaciones", style_sub))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0")))
    story.append(Spacer(1, 0.4 * cm))

    # Alumno info block
    becado_txt = "Sí — Con beca activa" if user.es_becado else "No"
    info_data = [
        [Paragraph("Nombre", style_label), Paragraph(user.nombre or user.username, style_value),
         Paragraph("Legajo / Usuario", style_label), Paragraph(user.username, style_value)],
        [Paragraph("Carrera", style_label), Paragraph(carrera_nombre, style_value),
         Paragraph("Becado", style_label), Paragraph(becado_txt, style_value)],
    ]
    info_table = Table(info_data, colWidths=[3 * cm, 7 * cm, 3.5 * cm, 3.5 * cm])
    info_table.setStyle(TableStyle([
        ("VALIGN",     (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 0.4 * cm))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0")))
    story.append(Spacer(1, 0.4 * cm))

    # Build per-materia score map: materia_id → {tipo: valor, nombre: str}
    mat_map: dict[int, dict] = defaultdict(lambda: {"nombre": "—", "parcial1": None, "parcial2": None, "practico": None, "final": None})
    for p in puntajes:
        mat_map[p.materia_id]["nombre"]  = p.materia_nombre
        mat_map[p.materia_id][p.tipo]    = float(p.valor)

    # Table
    header_row = [Paragraph(h, ParagraphStyle("th", parent=styles["Normal"], fontSize=9, textColor=colors.white, fontName="Helvetica-Bold", alignment=TA_CENTER))
                  for h in HEADERS]
    table_data = [header_row]

    promedios_generales = []
    for mid, row in sorted(mat_map.items(), key=lambda x: x[1]["nombre"]):
        scores = [row["parcial1"], row["parcial2"], row["practico"], row["final"]]
        existing = [s for s in scores if s is not None]
        prom = sum(existing) / len(existing) if existing else None
        if prom is not None:
            promedios_generales.append(prom)

        prom_color = colors.HexColor("#16a34a") if prom is not None and prom >= 6 else colors.HexColor("#dc2626")
        prom_style = ParagraphStyle("pv", parent=styles["Normal"], fontSize=10, fontName="Helvetica-Bold",
                                    textColor=prom_color if prom is not None else colors.HexColor("#94a3b8"),
                                    alignment=TA_CENTER)

        table_data.append([
            Paragraph(row["nombre"], ParagraphStyle("mn", parent=styles["Normal"], fontSize=10, fontName="Helvetica-Bold", textColor=colors.HexColor("#1e293b"))),
            Paragraph(_fmt(row["parcial1"]), style_small_c),
            Paragraph(_fmt(row["parcial2"]), style_small_c),
            Paragraph(_fmt(row["practico"]), style_small_c),
            Paragraph(_fmt(row["final"]),    style_small_c),
            Paragraph(_fmt(prom),            prom_style),
        ])

    if not mat_map:
        table_data.append([
            Paragraph("Sin materias registradas", ParagraphStyle("em", parent=styles["Normal"], textColor=colors.HexColor("#94a3b8"), alignment=TA_CENTER)),
            *[Paragraph("", style_small_c)] * 5,
        ])

    col_w = [6.5 * cm, 2.3 * cm, 2.3 * cm, 2.3 * cm, 2.3 * cm, 2.3 * cm]
    t = Table(table_data, colWidths=col_w, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (-1, 0), colors.HexColor("#0f172a")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#f8fafc"), colors.white]),
        ("GRID",         (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",   (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 6),
        ("LEFTPADDING",  (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("ALIGN",        (1, 0), (-1, -1), "CENTER"),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.5 * cm))

    # Footer — promedio general + fecha
    prom_gral = sum(promedios_generales) / len(promedios_generales) if promedios_generales else None
    prom_gral_txt = _fmt(prom_gral)
    aprobado_txt  = "APROBADO" if prom_gral is not None and prom_gral >= 6 else ("DESAPROBADO" if prom_gral is not None else "—")
    aprobado_color= "#16a34a" if (prom_gral is not None and prom_gral >= 6) else "#dc2626"

    fecha_txt = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M") + " UTC"

    footer_data = [[
        Paragraph(f"Promedio general: <font color='{aprobado_color}'><b>{prom_gral_txt}</b></font> — <font color='{aprobado_color}'><b>{aprobado_txt}</b></font>",
                  ParagraphStyle("fg", parent=styles["Normal"], fontSize=11, textColor=colors.HexColor("#0f172a"))),
        Paragraph(f"Fecha de emisión: {fecha_txt}",
                  ParagraphStyle("fd", parent=styles["Normal"], fontSize=9, textColor=colors.HexColor("#64748b"), alignment=TA_RIGHT)),
    ]]
    ft = Table(footer_data, colWidths=[10 * cm, 7 * cm])
    ft.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(ft)
    story.append(Spacer(1, 0.3 * cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e2e8f0")))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(
        "Documento oficial generado por el Sistema Académico UCA · Solo válido con sello institucional",
        ParagraphStyle("disc", parent=styles["Normal"], fontSize=7, textColor=colors.HexColor("#94a3b8"), alignment=TA_CENTER)
    ))

    doc.build(story)
    buf.seek(0)
    return buf.read()


@router.get("/{user_id}")
def get_boleta(
    user_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    if current_user["role"] not in ("admin", "profesor") and current_user["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="No autorizado")

    user = db.query(models.user.User).filter(models.user.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    carrera_nombre = "—"
    if user.carrera_id:
        c = db.query(models.carrera.Carrera).filter(models.carrera.Carrera.id == user.carrera_id).first()
        if c:
            carrera_nombre = c.nombre

    # Join puntajes with materia name in one query
    rows = (
        db.query(
            models.puntaje.Puntaje,
            models.materia.Materia.nombre.label("materia_nombre"),
        )
        .join(models.materia.Materia, models.puntaje.Puntaje.materia_id == models.materia.Materia.id)
        .filter(models.puntaje.Puntaje.user_id == user_id)
        .all()
    )

    class _Row:
        def __init__(self, p, nombre):
            self.materia_id     = p.materia_id
            self.tipo           = p.tipo
            self.valor          = p.valor
            self.materia_nombre = nombre

    flat = [_Row(p, n) for p, n in rows]

    pdf_bytes = _build_pdf(user, carrera_nombre, flat)

    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="boleta_{user.username}.pdf"'},
    )
