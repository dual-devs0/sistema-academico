import base64
import hashlib
import hmac
import io
from datetime import datetime, timezone
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, contains_eager

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

from app import models, database
from app.auth import SECRET_KEY
from app.dependencias import get_current_user
from app.services.autorizacion import es_profesor_de_alumno
from app.services.puntajes_utils import calcular_promedio_final, get_pesos

router = APIRouter(prefix="/boleta", tags=["boleta"])

TIPOS = ["parcial1", "parcial2", "practico", "final1", "final2", "final3"]
HEADERS = ["Materia", "Parcial 1", "Parcial 2", "T.P.", "Final", "Promedio"]


def _codigo_verificacion(user_id: int) -> str:
    """Código corto y determinístico, firmado con SECRET_KEY: cualquiera que lo
    reciba en un documento (PDF o vista web) puede validarlo contra
    /boleta/verificar/{codigo} sin necesitar acceso a la cuenta del alumno."""
    firma = hmac.new(SECRET_KEY.encode(), f"boleta:{user_id}".encode(), hashlib.sha256).hexdigest()[:10].upper()
    return f"UCA-X{user_id:04d}-{firma}"


def _verificar_codigo(codigo: str) -> int | None:
    """Devuelve el user_id si el código es válido, None si fue alterado/inventado."""
    try:
        prefijo, user_id_str, firma = codigo.split("-")
        if prefijo != "UCA" or not user_id_str.startswith("X"):
            return None
        user_id = int(user_id_str[1:])
    except (ValueError, IndexError):
        return None
    if hmac.compare_digest(_codigo_verificacion(user_id), codigo):
        return user_id
    return None


def _fmt(val) -> str:
    if val is None:
        return "\u2014"
    try:
        f = float(val)
        return f"{f:.1f}"
    except Exception:
        return "\u2014"


def _build_pdf(user: models.user.User, carrera_nombre: str, puntajes: list, db: Session) -> bytes:
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
    style_small = ParagraphStyle(
        "s", parent=styles["Normal"], fontSize=9, textColor=colors.HexColor("#64748b")
    )
    style_small_c = ParagraphStyle("sc", parent=style_small, alignment=TA_CENTER)
    style_title = ParagraphStyle(
        "t",
        parent=styles["Heading1"],
        fontSize=14,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=2,
    )
    style_sub = ParagraphStyle(
        "su",
        parent=styles["Normal"],
        fontSize=10,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#64748b"),
        spaceAfter=4,
    )
    style_label = ParagraphStyle(
        "la", parent=styles["Normal"], fontSize=9, textColor=colors.HexColor("#94a3b8")
    )
    style_value = ParagraphStyle(
        "va",
        parent=styles["Normal"],
        fontSize=11,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=2,
    )

    story = []

    # Header
    story.append(Paragraph("Universidad Cat\u00f3lica de Caacup\u00e9", style_title))
    story.append(
        Paragraph("Sistema Acad\u00e9mico \u2014 Boleta de Calificaciones", style_sub)
    )
    story.append(
        HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0"))
    )
    story.append(Spacer(1, 0.4 * cm))

    # Alumno info block
    becado_txt = "S\u00ed \u2014 Con beca activa" if user.es_becado else "No"
    info_data = [
        [
            Paragraph("Nombre", style_label),
            Paragraph(user.nombre or user.username, style_value),
            Paragraph("Legajo / Usuario", style_label),
            Paragraph(user.username, style_value),
        ],
        [
            Paragraph("Carrera", style_label),
            Paragraph(carrera_nombre, style_value),
            Paragraph("Becado", style_label),
            Paragraph(becado_txt, style_value),
        ],
    ]
    info_table = Table(info_data, colWidths=[3 * cm, 7 * cm, 3.5 * cm, 3.5 * cm])
    info_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )
    story.append(info_table)
    story.append(Spacer(1, 0.4 * cm))
    story.append(
        HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0"))
    )
    story.append(Spacer(1, 0.4 * cm))

    # Build per-materia score map: materia_id \u2192 {tipo: valor, nombre: str}
    mat_map: dict[int, dict] = defaultdict(
        lambda: {
            "nombre": "\u2014",
            "parcial1": None,
            "parcial2": None,
            "practico": None,
            "final1": None,
            "final2": None,
            "final3": None,
        }
    )
    for p in puntajes:
        mat_map[p.materia_id]["nombre"] = p.materia_nombre
        if p.tipo in mat_map[p.materia_id]:
            mat_map[p.materia_id][p.tipo] = float(p.valor)

    # Table
    header_row = [
        Paragraph(
            h,
            ParagraphStyle(
                "th",
                parent=styles["Normal"],
                fontSize=9,
                textColor=colors.white,
                fontName="Helvetica-Bold",
                alignment=TA_CENTER,
            ),
        )
        for h in HEADERS
    ]
    table_data = [header_row]

    promedios_generales = []
    for mid, row in sorted(mat_map.items(), key=lambda x: x[1]["nombre"]):
        scores = {
            "parcial1": row["parcial1"],
            "parcial2": row["parcial2"],
            "practico": row["practico"],
            "final1": row["final1"],
            "final2": row["final2"],
            "final3": row["final3"],
        }
        pesos = get_pesos(db, mid)
        prom = calcular_promedio_final(scores, pesos)
        finales_no_nulos = [v for v in (row["final1"], row["final2"], row["final3"]) if v is not None]
        row["final"] = max(finales_no_nulos) if finales_no_nulos else None
        if prom is not None:
            promedios_generales.append(prom)

        prom_color = (
            colors.HexColor("#16a34a")
            if prom is not None and prom >= 6
            else colors.HexColor("#dc2626")
        )
        prom_style = ParagraphStyle(
            "pv",
            parent=styles["Normal"],
            fontSize=10,
            fontName="Helvetica-Bold",
            textColor=prom_color if prom is not None else colors.HexColor("#94a3b8"),
            alignment=TA_CENTER,
        )

        table_data.append(
            [
                Paragraph(
                    row["nombre"],
                    ParagraphStyle(
                        "mn",
                        parent=styles["Normal"],
                        fontSize=10,
                        fontName="Helvetica-Bold",
                        textColor=colors.HexColor("#1e293b"),
                    ),
                ),
                Paragraph(_fmt(row["parcial1"]), style_small_c),
                Paragraph(_fmt(row["parcial2"]), style_small_c),
                Paragraph(_fmt(row["practico"]), style_small_c),
                Paragraph(_fmt(row["final"]), style_small_c),
                Paragraph(_fmt(prom), prom_style),
            ]
        )

    if not mat_map:
        table_data.append(
            [
                Paragraph(
                    "Sin materias registradas",
                    ParagraphStyle(
                        "em",
                        parent=styles["Normal"],
                        textColor=colors.HexColor("#94a3b8"),
                        alignment=TA_CENTER,
                    ),
                ),
                *[Paragraph("", style_small_c)] * 5,
            ]
        )

    col_w = [6.5 * cm, 2.3 * cm, 2.3 * cm, 2.3 * cm, 2.3 * cm, 2.3 * cm]
    t = Table(table_data, colWidths=col_w, repeatRows=1)
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                (
                    "ROWBACKGROUNDS",
                    (0, 1),
                    (-1, -1),
                    [colors.HexColor("#f8fafc"), colors.white],
                ),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("ALIGN", (1, 0), (-1, -1), "CENTER"),
            ]
        )
    )
    story.append(t)
    story.append(Spacer(1, 0.5 * cm))

    # Footer \u2014 promedio general + fecha
    prom_gral = (
        sum(promedios_generales) / len(promedios_generales)
        if promedios_generales
        else None
    )
    prom_gral_txt = _fmt(prom_gral)
    aprobado_txt = (
        "APROBADO"
        if prom_gral is not None and prom_gral >= 6
        else ("DESAPROBADO" if prom_gral is not None else "\u2014")
    )
    aprobado_color = (
        "#16a34a" if (prom_gral is not None and prom_gral >= 6) else "#dc2626"
    )

    fecha_txt = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M") + " UTC"

    footer_data = [
        [
            Paragraph(
                f"Promedio general: "
                f"<font color='{aprobado_color}'><b>{prom_gral_txt}</b></font>"
                f" \u2014 <font color='{aprobado_color}'><b>{aprobado_txt}</b></font>",
                ParagraphStyle(
                    "fg",
                    parent=styles["Normal"],
                    fontSize=11,
                    textColor=colors.HexColor("#0f172a"),
                ),
            ),
            Paragraph(
                f"Fecha de emisi\u00f3n: {fecha_txt}",
                ParagraphStyle(
                    "fd",
                    parent=styles["Normal"],
                    fontSize=9,
                    textColor=colors.HexColor("#64748b"),
                    alignment=TA_RIGHT,
                ),
            ),
        ]
    ]
    ft = Table(footer_data, colWidths=[10 * cm, 7 * cm])
    ft.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    story.append(ft)
    story.append(Spacer(1, 0.3 * cm))
    story.append(
        HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e2e8f0"))
    )
    story.append(Spacer(1, 0.2 * cm))
    story.append(
        Paragraph(
            "Documento oficial generado por el Sistema Acad\u00e9mico UCA \u00b7 Solo v\u00e1lido con sello institucional",  # noqa: E501
            ParagraphStyle(
                "disc",
                parent=styles["Normal"],
                fontSize=7,
                textColor=colors.HexColor("#94a3b8"),
                alignment=TA_CENTER,
            ),
        )
    )

    doc.build(story)
    buf.seek(0)
    return buf.read()


@router.get("/verificar/{codigo}")
def verificar_boleta(
    codigo: str,
    db: Session = Depends(database.get_db),
):
    """Verificación pública de autenticidad: recibe el código impreso/mostrado
    en la boleta y confirma si corresponde a un alumno real del sistema."""
    user_id = _verificar_codigo(codigo)
    if user_id is None:
        return {"valido": False}

    user = db.query(models.user.User).filter(models.user.User.id == user_id).first()
    if not user:
        return {"valido": False}

    return {
        "valido": True,
        "alumno_nombre": user.nombre,
        "validado_en": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/{user_id}/sello")
def sello_boleta(
    user_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    if (
        current_user.role not in ("admin", "profesor")
        and current_user.user_id != user_id
    ):
        raise HTTPException(status_code=403, detail="No autorizado")
    if current_user.role == "profesor" and not es_profesor_de_alumno(
        db, current_user.user_id, user_id
    ):
        raise HTTPException(status_code=403, detail="No autorizado")

    user = db.query(models.user.User).filter(models.user.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    import qrcode

    codigo = _codigo_verificacion(user_id)
    qr = qrcode.make(codigo)
    buf = io.BytesIO()
    qr.save(buf)
    qr_base64 = base64.b64encode(buf.getvalue()).decode()

    return {
        "codigo": codigo,
        "qr_base64": qr_base64,
        "validado_en": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/{user_id}")
def get_boleta(
    user_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    if (
        current_user.role not in ("admin", "profesor")
        and current_user.user_id != user_id
    ):
        raise HTTPException(status_code=403, detail="No autorizado")
    if current_user.role == "profesor" and not es_profesor_de_alumno(
        db, current_user.user_id, user_id
    ):
        raise HTTPException(status_code=403, detail="No autorizado")

    user = db.query(models.user.User).filter(models.user.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    carrera_nombre = "\u2014"
    if user.carrera_id:
        c = (
            db.query(models.carrera.Carrera)
            .filter(models.carrera.Carrera.id == user.carrera_id)
            .first()
        )
        if c:
            carrera_nombre = c.nombre

    rows = (
        db.query(models.puntaje.Puntaje)
        .join(
            models.oferta_materia.OfertaMateria,
            models.puntaje.Puntaje.oferta_materia_id
            == models.oferta_materia.OfertaMateria.id,
        )
        .join(
            models.materia.Materia,
            models.oferta_materia.OfertaMateria.materia_id == models.materia.Materia.id,
        )
        .options(contains_eager(models.puntaje.Puntaje.oferta))
        .filter(models.puntaje.Puntaje.user_id == user_id)
        .add_columns(models.materia.Materia.nombre.label("materia_nombre"))
        .all()
    )

    class _Row:
        def __init__(self, p, nombre):
            self.materia_id = p.materia_id
            self.tipo = p.tipo
            self.valor = p.valor
            self.materia_nombre = nombre

    flat = [_Row(p, n) for p, n in rows]

    pdf_bytes = _build_pdf(user, carrera_nombre, flat, db)

    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="boleta_{user.username}.pdf"'
        },
    )
