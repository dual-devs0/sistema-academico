import base64
import json
import os
import re
from datetime import date, timedelta
from typing import Optional

from typing import cast
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app import models, schemas, database
from app.dependencias import get_current_user

router = APIRouter(prefix="/eventos", tags=["eventos"])

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")


def _parsear_pdf_con_gemini(
    pdf_bytes: bytes, anio: int, semestre: int, instrucciones: str | None = None
) -> list[dict]:
    """Env\u00eda PDF a Gemini y devuelve lista de eventos parseados."""
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="google-genai no instalado. pip install google-genai",
        )

    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=500, detail="GEMINI_API_KEY no configurada en .env"
        )

    client = genai.Client(api_key=GEMINI_API_KEY)

    prompt = f"""
Eres un asistente que extrae eventos de calendarios acad\u00e9micos en PDF.
El a\u00f1o es {anio}, el semestre es {semestre}.
{"Instrucciones adicionales: " + instrucciones if instrucciones else ""}

Devuelve SOLO un JSON array con objetos con los campos:
- titulo: string
- tipo: uno de "parcial", "final", "feriado", "asueto", "entrega", "actividad"
- fecha: string YYYY-MM-DD
- fecha_fin: string YYYY-MM-DD o null
- descripcion: string o null

No incluyas markdown ni texto adicional, solo el JSON array.
"""

    pdf_blob: "types.Blob" = types.Blob(mime_type="application/pdf", data=pdf_bytes)
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=cast(list, [prompt, pdf_blob]),
    )
    text = (response.text or "").strip()

    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)

    try:
        eventos = json.loads(text)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="Gemini devolvi\u00f3 JSON inv\u00e1lido: " + text[:300],
        )

    if not isinstance(eventos, list):
        raise HTTPException(status_code=500, detail="Gemini no devolvi\u00f3 un array")

    for ev in eventos:
        ev.setdefault("fecha_fin", None)
        ev.setdefault("descripcion", None)
        ev.setdefault("tipo", "actividad")
        ev.setdefault("titulo", "Sin t\u00edtulo")

    return eventos


@router.post("/", response_model=schemas.evento.EventoOut)
def create_evento(
    evento: schemas.evento.EventoCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role not in ("admin", "profesor"):
        raise HTTPException(status_code=403, detail="No autorizado")
    new_evento = models.evento.EventoCalendario(
        **evento.model_dump(exclude_unset=True),
        creado_por=current_user.user_id,
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
    skip: int = Query(0, ge=0),
    limit: int = Query(500, ge=1, le=2000),
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
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
        query = query.filter(
            models.evento.EventoCalendario.fecha >= date.fromisoformat(desde)
        )
    if hasta is not None:
        query = query.filter(
            models.evento.EventoCalendario.fecha <= date.fromisoformat(hasta)
        )

    # Alumno ve eventos globales + de sus carreras/materias
    if current_user.role == "alumno":
        inscripciones = (
            db.query(models.inscripcion.Inscripcion)
            .options(joinedload(models.inscripcion.Inscripcion.oferta))
            .filter(models.inscripcion.Inscripcion.alumno_id == current_user.user_id)
            .all()
        )
        materia_ids = {i.oferta.materia_id for i in inscripciones if i.oferta}
        from sqlalchemy import or_

        if materia_ids:
            query = query.filter(
                or_(
                    models.evento.EventoCalendario.materia_id.is_(None),
                    models.evento.EventoCalendario.materia_id.in_(materia_ids),
                )
            )
        else:
            query = query.filter(models.evento.EventoCalendario.materia_id.is_(None))

    return (
        query.order_by(models.evento.EventoCalendario.fecha)
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{evento_id}", response_model=schemas.evento.EventoOut)
def get_evento(
    evento_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    evento = (
        db.query(models.evento.EventoCalendario)
        .filter(models.evento.EventoCalendario.id == evento_id)
        .first()
    )
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    return evento


@router.put("/{evento_id}", response_model=schemas.evento.EventoOut)
def update_evento(
    evento_id: int,
    data: schemas.evento.EventoUpdate,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role not in ("admin", "profesor"):
        raise HTTPException(status_code=403, detail="No autorizado")
    evento = (
        db.query(models.evento.EventoCalendario)
        .filter(models.evento.EventoCalendario.id == evento_id)
        .first()
    )
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
    current_user=Depends(get_current_user),
):
    if current_user.role not in ("admin", "profesor"):
        raise HTTPException(status_code=403, detail="No autorizado")
    evento = (
        db.query(models.evento.EventoCalendario)
        .filter(models.evento.EventoCalendario.id == evento_id)
        .first()
    )
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    db.delete(evento)
    db.commit()
    return {"detail": "Evento eliminado"}


@router.post("/cargar-pdf", response_model=schemas.evento.CargaPdfResponse)
def cargar_pdf(
    payload: schemas.evento.CargaPdfRequest,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    """Carga un PDF del calendario acad\u00e9mico, lo parsea con Gemini y crea los eventos."""  # noqa: E501
    if current_user.role not in ("admin", "profesor"):
        raise HTTPException(status_code=403, detail="No autorizado")

    try:
        pdf_bytes = base64.b64decode(payload.pdf_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Base64 inv\u00e1lido")

    eventos_data = _parsear_pdf_con_gemini(
        pdf_bytes, payload.anio, payload.semestre, payload.instrucciones
    )

    creados = []
    errores = []
    for ev_data in eventos_data:
        try:
            ev = models.evento.EventoCalendario(
                titulo=ev_data["titulo"],
                tipo=ev_data["tipo"],
                fecha=date.fromisoformat(ev_data["fecha"]),
                fecha_fin=date.fromisoformat(ev_data["fecha_fin"])
                if ev_data.get("fecha_fin")
                else None,
                descripcion=ev_data.get("descripcion"),
                anio=payload.anio,
                semestre=payload.semestre,
                creado_por=current_user.user_id,
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
        eventos=[schemas.evento.EventoOut.model_validate(ev) for ev in creados],
        errores=errores,
    )


@router.get("/mes/{anio}/{mes}", response_model=list[schemas.evento.EventoOut])
def eventos_mes(
    anio: int,
    mes: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    """Eventos de un mes espec\u00edfico (para vista mensual del alumno)."""
    primero = date(anio, mes, 1)
    if mes == 12:
        ultimo = date(anio + 1, 1, 1) - timedelta(days=1)
    else:
        ultimo = date(anio, mes + 1, 1) - timedelta(days=1)

    query = db.query(models.evento.EventoCalendario).filter(
        models.evento.EventoCalendario.fecha >= primero,
        models.evento.EventoCalendario.fecha <= ultimo,
    )

    if current_user.role == "alumno":
        inscripciones = (
            db.query(models.inscripcion.Inscripcion)
            .options(joinedload(models.inscripcion.Inscripcion.oferta))
            .filter(models.inscripcion.Inscripcion.alumno_id == current_user.user_id)
            .all()
        )
        materia_ids = {i.oferta.materia_id for i in inscripciones if i.oferta}

        from sqlalchemy import or_

        filters = [models.evento.EventoCalendario.materia_id.is_(None)]
        if materia_ids:
            filters.append(models.evento.EventoCalendario.materia_id.in_(materia_ids))
        query = query.filter(or_(*filters))

    return query.order_by(models.evento.EventoCalendario.fecha).all()


@router.get("/dia/{fecha_str}", response_model=schemas.evento.EventoDiaOut)
def eventos_dia(
    fecha_str: str,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    """Eventos de un d\u00eda espec\u00edfico (click en el d\u00eda en vista mensual)."""  # noqa: E501
    try:
        fecha = date.fromisoformat(fecha_str)
    except ValueError:
        raise HTTPException(
            status_code=400, detail="Fecha inv\u00e1lida. Us\u00e1 YYYY-MM-DD"
        )

    query = db.query(models.evento.EventoCalendario).filter(
        models.evento.EventoCalendario.fecha == fecha,
    )

    if current_user.role == "alumno":
        inscripciones = (
            db.query(models.inscripcion.Inscripcion)
            .options(joinedload(models.inscripcion.Inscripcion.oferta))
            .filter(models.inscripcion.Inscripcion.alumno_id == current_user.user_id)
            .all()
        )
        materia_ids = {i.oferta.materia_id for i in inscripciones if i.oferta}
        from sqlalchemy import or_

        filters = [models.evento.EventoCalendario.materia_id.is_(None)]
        if materia_ids:
            filters.append(models.evento.EventoCalendario.materia_id.in_(materia_ids))
        query = query.filter(or_(*filters))

    eventos = query.order_by(models.evento.EventoCalendario.tipo).all()
    return schemas.evento.EventoDiaOut(fecha=fecha, eventos=[schemas.evento.EventoOut.model_validate(ev) for ev in eventos])
