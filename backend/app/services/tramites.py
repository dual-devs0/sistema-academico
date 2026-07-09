"""
services/tramites.py — Fase 5A: Solicitudes y trámites.

Reglas:
- Trámites automáticos (requiere_aprobacion=False, dispatch por nombre en
  _GENERADORES_AUTO) generan su PDF de forma síncrona al crear la
  solicitud — sin llamada externa de por medio, no hace falta background.
- Solo se auto-resuelve si el alumno está 'activo' según
  calcular_regularidad(); si no, la solicitud se rechaza con el motivo.
- Trámites manuales (requiere_aprobacion=True o sin generador) quedan
  'pendiente' hasta que un admin los resuelva vía PUT .../resolver.
"""
from __future__ import annotations

import io
from datetime import datetime, timezone
from typing import Callable, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_CENTER
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from sqlalchemy.orm import Session

from app.models.expediente_materia import ExpedienteMateria
from app.models.materia import Materia
from app.models.oferta_materia import OfertaMateria
from app.models.tramites import Solicitud, TipoTramite
from app.models.users import User
from app.services.expediente import calcular_ppa, calcular_regularidad
from app.services.storage import subir_archivo


def _doc_base() -> tuple[io.BytesIO, SimpleDocTemplate, list]:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=2.5 * cm, rightMargin=2.5 * cm, topMargin=2.5 * cm, bottomMargin=2.5 * cm,
    )
    return buf, doc, []


def _header(story: list, titulo: str) -> None:
    styles = getSampleStyleSheet()
    style_title = ParagraphStyle("t", parent=styles["Heading1"], fontSize=14, alignment=TA_CENTER,
                                  textColor=colors.HexColor("#0f172a"), spaceAfter=2)
    style_sub = ParagraphStyle("su", parent=styles["Normal"], fontSize=10, alignment=TA_CENTER,
                                textColor=colors.HexColor("#64748b"), spaceAfter=4)
    story.append(Paragraph("Universidad Católica de Caacupé", style_title))
    story.append(Paragraph(titulo, style_sub))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0")))
    story.append(Spacer(1, 0.5 * cm))


def _footer(story: list) -> None:
    styles = getSampleStyleSheet()
    fecha_txt = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M") + " UTC"
    story.append(Spacer(1, 0.5 * cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e2e8f0")))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(
        f"Fecha de emisión: {fecha_txt} · Documento generado automáticamente por el Sistema Académico UCA",
        ParagraphStyle("disc", parent=styles["Normal"], fontSize=7, textColor=colors.HexColor("#94a3b8"), alignment=TA_CENTER),
    ))


def generar_constancia_regular_pdf(alumno: User, regularidad: dict) -> bytes:
    buf, doc, story = _doc_base()
    styles = getSampleStyleSheet()
    style_body = ParagraphStyle("b", parent=styles["Normal"], fontSize=11, leading=18,
                                 textColor=colors.HexColor("#0f172a"))

    _header(story, "Constancia de Alumno Regular")
    story.append(Paragraph(
        f"Se deja constancia de que <b>{alumno.nombre or alumno.username}</b> "
        f"(documento {alumno.cedula or '—'}) se encuentra registrado/a como "
        f"<b>alumno regular</b> de esta institución, con estado académico "
        f"<b>activo</b> al momento de la emisión de este documento.",
        style_body,
    ))
    if regularidad.get("ppa_acumulado") is not None:
        story.append(Spacer(1, 0.3 * cm))
        story.append(Paragraph(f"PPA acumulado: {regularidad['ppa_acumulado']}", style_body))
    _footer(story)

    doc.build(story)
    buf.seek(0)
    return buf.read()


def generar_historial_oficial_pdf(alumno: User, db: Session) -> bytes:
    buf, doc, story = _doc_base()
    styles = getSampleStyleSheet()

    _header(story, "Historial Académico Oficial")

    rows = (
        db.query(ExpedienteMateria, Materia.nombre.label("materia_nombre"), OfertaMateria.periodo)
        .join(OfertaMateria, ExpedienteMateria.oferta_materia_id == OfertaMateria.id)
        .join(Materia, OfertaMateria.materia_id == Materia.id)
        .filter(ExpedienteMateria.alumno_id == alumno.id)
        .order_by(OfertaMateria.periodo.asc())
        .all()
    )

    header_row = [Paragraph(h, ParagraphStyle("th", parent=styles["Normal"], fontSize=9,
                             textColor=colors.white, fontName="Helvetica-Bold", alignment=TA_CENTER))
                  for h in ["Período", "Materia", "Nota", "Condición"]]
    table_data = [header_row]
    for exp, nombre, periodo in rows:
        table_data.append([
            Paragraph(periodo, ParagraphStyle("p", parent=styles["Normal"], fontSize=9, alignment=TA_CENTER)),
            Paragraph(nombre, ParagraphStyle("m", parent=styles["Normal"], fontSize=9)),
            Paragraph(str(exp.nota_final), ParagraphStyle("n", parent=styles["Normal"], fontSize=9, alignment=TA_CENTER)),
            Paragraph(exp.condicion, ParagraphStyle("c", parent=styles["Normal"], fontSize=9, alignment=TA_CENTER)),
        ])
    if not rows:
        table_data.append([Paragraph("Sin materias registradas en el expediente",
                           ParagraphStyle("e", parent=styles["Normal"], fontSize=9, textColor=colors.HexColor("#94a3b8"))), "", "", ""])

    t = Table(table_data, colWidths=[3 * cm, 8 * cm, 2.5 * cm, 3.5 * cm], repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(t)

    ppa_info = calcular_ppa(alumno.id, db)
    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph(
        f"PPA acumulado: {ppa_info['ppa'] if ppa_info['ppa'] is not None else '—'} "
        f"({ppa_info['creditos_computados']} créditos computados)",
        ParagraphStyle("ppa", parent=styles["Normal"], fontSize=10),
    ))
    _footer(story)

    doc.build(story)
    buf.seek(0)
    return buf.read()


_GENERADORES_AUTO: dict[str, Callable[[User, Session], bytes]] = {
    "Constancia de alumno regular": lambda alumno, db: generar_constancia_regular_pdf(alumno, calcular_regularidad(alumno.id, db)),
    "Historial académico oficial": generar_historial_oficial_pdf,
}


def crear_solicitud(alumno_id: int, tipo_tramite_id: int, db: Session) -> Solicitud:
    tipo = db.query(TipoTramite).filter(TipoTramite.id == tipo_tramite_id).first()
    if not tipo:
        raise ValueError(f"Tipo de trámite {tipo_tramite_id} no existe")

    solicitud = Solicitud(alumno_id=alumno_id, tipo_tramite_id=tipo_tramite_id, estado="pendiente")
    db.add(solicitud)
    db.flush()

    generador = _GENERADORES_AUTO.get(tipo.nombre)
    if not tipo.requiere_aprobacion and generador:
        alumno = db.query(User).filter(User.id == alumno_id).first()
        regularidad = calcular_regularidad(alumno_id, db)
        if regularidad["estado"] != "activo":
            raise ValueError(
                f"No se puede generar '{tipo.nombre}': el alumno no está en estado regular "
                f"({regularidad['estado']}{' — ' + regularidad['motivo'] if regularidad['motivo'] else ''})"
            )
        pdf_bytes = generador(alumno, db)
        key = subir_archivo(pdf_bytes, f"{tipo.nombre}.pdf", prefix="tramite")
        solicitud.estado = "resuelta"
        solicitud.storage_key_resultado = key
        solicitud.fecha_resolucion = datetime.now(timezone.utc)
        solicitud.resuelto_por = None

    db.flush()
    return solicitud
