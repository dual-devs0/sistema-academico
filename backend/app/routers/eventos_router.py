import base64
import json
import os
import re
from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import models, schemas, database
from app.dependencias import get_current_user

router = APIRouter(prefix="/eventos", tags=["eventos"])

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")


def _parsear_pdf_con_gemini(pdf_bytes: bytes, anio: int, semestre: int, instrucciones: str | None = None) -> list[dict]:
    """Envía PDF a Gemini y devuelve lista de eventos parseados."""
    try:
        import google.generativeai as genai
    except ImportError:
        raise HTTPException(status_code=500, detail="google-generativeai no instalado. pip install google-generativeai")

    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY no configurada en .env")

    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-2.0-flash")

    prompt = f"""
Eres un asistente que extrae eventos de calendarios académicos en PDF.
El año es {anio}, el semestre es {semestre}.
{ 'Instrucciones adicionales: ' + instrucciones if instrucciones else '' }

Devuelve SOLO un JSON array con objetos con los campos:
- titulo: string
- tipo: uno de "parcial", "final", "feriado", "asueto", "entrega", "actividad"
- fecha: string YYYY-MM-DD
- fecha_fin: string YYYY-MM-DD o null
- descripcion: string o null

No incluyas markdown ni texto adicional, solo el JSON array.
"""

    pdf_data = {"mime_type": "application/pdf", "data": pdf_bytes}
    response = model.generate_content([prompt, pdf_data])
    text = response.text.strip()

    # Strip markdown code fences if present
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)

    try:
        eventos = json.loads(text)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Gemini devolvió JSON inválido: " + text[:300])

    if not isinstance(eventos, list):
        raise HTTPException(status_code=500, detail="Gemini no devolvió un array")

    for ev in eventos:
        ev.setdefault("fecha_fin", None)
        ev.setdefault("descripcion", None)
        ev.setdefault("tipo", "actividad")
        ev.setdefault("titulo", "Sin título")

    return eventos


@router.post("/", response_model=schemas.evento.EventoOut)
def create_evento(
    evento: schemas.evento.EventoCreate,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    if current_user["role"] not in ("admin", "profesor"):
        raise HTTPException(status_code=403, detail="No autorizado")
    new_evento = models.evento.EventoCalendario(
        **evento.model_dump(exclude_unset=True),
        creado_por=current_user["user_id"],
    )
    db.add(new_evento)
    db.commit()
    db.refresh(new_evento)
    return new_evento


@router.get("/", response_model=list[schemas.evento.EventoOut])
def list_eventos(
    tipo: Optional[str] = Query(None),
    carrera_id: Optional[int] = Query(None),
    materia_id: Optional[int] = Query(None),
    anio: Optional[int] = Query(None),
    semestre: Optional[int] = Query(None),
    desde: Optional[str] = Query(None),
    hasta: Optional[str] = Query(None),
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    query = db.query(models.evento.EventoCalendario)
    if tipo is not None:
        query = query.filter(models.evento.EventoCalendario.tipo == tipo)
    if carrera_id is not None:
        query = query.filter(models.evento.EventoCalendario.carrera_id == carrera_id)
    if materia_id is not None:
        query = query.filter(models.evento.EventoCalendario.materia_id == materia_id)
    if anio is not None:
        query = query.filter(models.evento.EventoCalendario.anio == anio)
    if semestre is not None:
        query = query.filter(models.evento.EventoCalendario.semestre == semestre)
    if desde is not None:
        query = query.filter(models.evento.EventoCalendario.fecha >= date.fromisoformat(desde))
    if hasta is not None:
        query = query.filter(models.evento.EventoCalendario.fecha <= date.fromisoformat(hasta))

    # Alumno ve eventos globales + de sus materias inscriptas
    if current_user["role"] == "alumno":
        from sqlalchemy import or_
        inscripciones = db.query(models.inscripcion.Inscripcion).filter(
            models.inscripcion.Inscripcion.alumno_id == current_user["user_id"]
        ).all()
        materia_ids = {i.materia_id for i in inscripciones}
        es_global = models.evento.EventoCalendario.materia_id.is_(None)
        if materia_ids:
            query = query.filter(or_(es_global, models.evento.EventoCalendario.materia_id.in_(materia_ids)))
        else:
            query = query.filter(es_global)

    return query.order_by(models.evento.EventoCalendario.fecha).all()


@router.get("/{evento_id}", response_model=schemas.evento.EventoOut)
def get_evento(
    evento_id: int,
    db: Session = Depends(database.get_db),
):
    evento = db.query(models.evento.EventoCalendario).filter(models.evento.EventoCalendario.id == evento_id).first()
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    return evento


@router.put("/{evento_id}", response_model=schemas.evento.EventoOut)
def update_evento(
    evento_id: int,
    data: schemas.evento.EventoUpdate,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    if current_user["role"] not in ("admin", "profesor"):
        raise HTTPException(status_code=403, detail="No autorizado")
    evento = db.query(models.evento.EventoCalendario).filter(models.evento.EventoCalendario.id == evento_id).first()
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(evento, key, value)
    db.commit()
    db.refresh(evento)
    return evento


@router.delete("/{evento_id}")
def delete_evento(
    evento_id: int,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    if current_user["role"] not in ("admin", "profesor"):
        raise HTTPException(status_code=403, detail="No autorizado")
    evento = db.query(models.evento.EventoCalendario).filter(models.evento.EventoCalendario.id == evento_id).first()
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    db.delete(evento)
    db.commit()
    return {"detail": "Evento eliminado"}


@router.post("/cargar-pdf", response_model=schemas.evento.CargaPdfResponse)
def cargar_pdf(
    payload: schemas.evento.CargaPdfRequest,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    """Carga un PDF del calendario académico, lo parsea con Gemini y crea los eventos."""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores pueden cargar calendarios PDF")

    try:
        pdf_bytes = base64.b64decode(payload.pdf_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Base64 inválido")

    eventos_data = _parsear_pdf_con_gemini(pdf_bytes, payload.anio, payload.semestre, payload.instrucciones)

    creados = []
    errores = []
    for ev_data in eventos_data:
        try:
            ev = models.evento.EventoCalendario(
                titulo=ev_data["titulo"],
                tipo=ev_data["tipo"],
                fecha=date.fromisoformat(ev_data["fecha"]),
                fecha_fin=date.fromisoformat(ev_data["fecha_fin"]) if ev_data.get("fecha_fin") else None,
                descripcion=ev_data.get("descripcion"),
                anio=payload.anio,
                semestre=payload.semestre,
                creado_por=current_user["user_id"],
            )
            db.add(ev)
            db.flush()
            creados.append(ev)
        except Exception as e:
            errores.append(f"Error en evento '{ev_data.get('titulo', '?')}': {str(e)}")

    db.commit()
    for ev in creados:
        db.refresh(ev)

    return schemas.evento.CargaPdfResponse(
        procesados=len(creados),
        eventos=creados,
        errores=errores,
    )


@router.get("/mes/{anio}/{mes}", response_model=list[schemas.evento.EventoOut])
def eventos_mes(
    anio: int,
    mes: int,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    """Eventos de un mes específico (para vista mensual del alumno)."""
    primero = date(anio, mes, 1)
    if mes == 12:
        ultimo = date(anio + 1, 1, 1) - timedelta(days=1)
    else:
        ultimo = date(anio, mes + 1, 1) - timedelta(days=1)

    query = db.query(models.evento.EventoCalendario).filter(
        models.evento.EventoCalendario.fecha >= primero,
        models.evento.EventoCalendario.fecha <= ultimo,
    )

    if current_user["role"] == "alumno":
        inscripciones = db.query(models.inscripcion.Inscripcion).filter(
            models.inscripcion.Inscripcion.alumno_id == current_user["user_id"]
        ).all()
        materia_ids = {i.materia_id for i in inscripciones}

        from sqlalchemy import or_
        query = query.filter(
            or_(
                models.evento.EventoCalendario.materia_id.is_(None),
                models.evento.EventoCalendario.materia_id.in_(materia_ids) if materia_ids else False,
            )
        )

    return query.order_by(models.evento.EventoCalendario.fecha).all()


@router.get("/dia/{fecha_str}", response_model=schemas.evento.EventoDiaOut)
def eventos_dia(
    fecha_str: str,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    """Eventos de un día específico (click en el día en vista mensual)."""
    try:
        fecha = date.fromisoformat(fecha_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Fecha inválida. Usá YYYY-MM-DD")

    query = db.query(models.evento.EventoCalendario).filter(
        models.evento.EventoCalendario.fecha == fecha,
    )

    if current_user["role"] == "alumno":
        inscripciones = db.query(models.inscripcion.Inscripcion).filter(
            models.inscripcion.Inscripcion.alumno_id == current_user["user_id"]
        ).all()
        materia_ids = {i.materia_id for i in inscripciones}
        from sqlalchemy import or_
        query = query.filter(
            or_(
                models.evento.EventoCalendario.materia_id.is_(None),
                models.evento.EventoCalendario.materia_id.in_(materia_ids) if materia_ids else False,
            )
        )

    eventos = query.order_by(models.evento.EventoCalendario.tipo).all()
    return schemas.evento.EventoDiaOut(fecha=fecha, eventos=eventos)
