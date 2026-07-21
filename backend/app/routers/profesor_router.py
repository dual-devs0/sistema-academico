from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from app import models, schemas, database
from app.dependencias import get_current_user
from app.schemas.current_user_schema import CurrentUser
from app.schemas.users_schemas import AlumnoSimpleOut

router = APIRouter(prefix="/profesor", tags=["profesor"])


def _requiere_profesor(current_user: CurrentUser):
    if current_user.role not in ("admin", "profesor"):
        raise HTTPException(
            status_code=403, detail="Solo administradores o profesores pueden acceder a este recurso"
        )


@router.get("/mi-historico")
def mi_historico(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    _requiere_profesor(current_user)

    uid = current_user.user_id
    O = models.oferta_materia.OfertaMateria
    M = models.materia.Materia
    C = models.carrera.Carrera
    I = models.inscripcion.Inscripcion
    P = models.puntaje.Puntaje

    ofertas = (
        db.query(O)
        .options(joinedload(O.materia).joinedload(M.carrera))
        .filter(O.profesor_id == uid)
        .order_by(O.periodo.desc())
        .all()
    )
    if not ofertas:
        return []

    oferta_ids = [o.id for o in ofertas]
    materia_ids = [o.materia_id for o in ofertas]

    # Student count per oferta (single query)
    alumno_counts = dict(
        db.query(I.oferta_materia_id, func.count(I.id))
        .filter(I.oferta_materia_id.in_(oferta_ids))
        .group_by(I.oferta_materia_id)
        .all()
    )

    # Avg puntaje + pass rate per oferta (single query per student)
    punt_agg = {}
    for ofid in oferta_ids:
        rows = db.query(P.user_id, func.avg(P.valor).label("prom")).filter(
            P.oferta_materia_id == ofid
        ).group_by(P.user_id).all()
        if rows:
            vals = [r.prom for r in rows]
            prom = round(sum(vals) / len(vals), 2) if vals else None
            aprob = sum(1 for r in rows if r.prom >= 6)
            total = len(rows)
            pct_aprob = round((aprob / total) * 100, 1) if total > 0 else 0.0
        else:
            prom = None
            pct_aprob = None
        punt_agg[ofid] = (prom, pct_aprob)

    periodos: dict[str, list] = {}
    for oferta in ofertas:
        materia = oferta.materia
        if not materia:
            continue
        prom, pct = punt_agg.get(oferta.id, (None, None))
        cat = {
            "materia_id": materia.id,
            "materia_nombre": materia.nombre,
            "carrera_nombre": materia.carrera.nombre if materia.carrera else None,
            "cantidad_alumnos": alumno_counts.get(oferta.id, 0),
            "promedio_grupo": prom,
            "porcentaje_aprobacion": pct,
        }
        periodos.setdefault(oferta.periodo, []).append(cat)

    return [{"periodo": p, "catedras": c} for p, c in periodos.items()]


@router.get("/mi-agenda")
def mi_agenda(
    desde: date = Query(...),
    hasta: date = Query(...),
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    """Clases fijas + eventos institucionales + recordatorios propios, normalizado por dia."""  # noqa: E501
    _requiere_profesor(current_user)
    if hasta < desde:
        raise HTTPException(
            status_code=422, detail="'hasta' no puede ser anterior a 'desde'"
        )

    ofertas_activas = (
        db.query(models.oferta_materia.OfertaMateria)
        .filter(
            models.oferta_materia.OfertaMateria.profesor_id == current_user.user_id,
            models.oferta_materia.OfertaMateria.activa == True,  # noqa: E712
        )
        .all()
    )
    materia_ids = [o.materia_id for o in ofertas_activas]
    materia_nombre = {}
    if materia_ids:
        for m in (
            db.query(models.materia.Materia)
            .filter(models.materia.Materia.id.in_(materia_ids))
            .all()
        ):
            materia_nombre[m.id] = m.nombre

    items = []

    # Clases fijas: Horario recurrente casado contra cada dia del rango
    if materia_ids:
        horarios = (
            db.query(models.horario.Horario)
            .filter(models.horario.Horario.materia_id.in_(materia_ids))
            .all()
        )
        cur = desde
        while cur <= hasta:
            for h in horarios:
                if h.dia_semana == cur.weekday():
                    items.append(
                        {
                            "tipo": "clase",
                            "fecha": cur.isoformat(),
                            "hora_inicio": h.hora_inicio.isoformat(),
                            "hora_fin": h.hora_fin.isoformat(),
                            "materia_id": h.materia_id,
                            "materia_nombre": materia_nombre.get(h.materia_id),
                            "aula": h.aula,
                        }
                    )
            cur += timedelta(days=1)

    # Eventos institucionales o de sus materias
    from sqlalchemy import or_

    eventos_q = db.query(models.evento.EventoCalendario).filter(
        models.evento.EventoCalendario.fecha >= desde,
        models.evento.EventoCalendario.fecha <= hasta,
    )
    if materia_ids:
        eventos_q = eventos_q.filter(
            or_(
                models.evento.EventoCalendario.materia_id.is_(None),
                models.evento.EventoCalendario.materia_id.in_(materia_ids),
            )
        )
    else:
        eventos_q = eventos_q.filter(
            models.evento.EventoCalendario.materia_id.is_(None)
        )
    for e in eventos_q.all():
        items.append(
            {
                "tipo": "evento",
                "fecha": e.fecha.isoformat(),
                "titulo": e.titulo,
                "evento_tipo": e.tipo,
                "materia_id": e.materia_id,
                "materia_nombre": materia_nombre.get(e.materia_id)
                if e.materia_id
                else None,
                "descripcion": e.descripcion,
            }
        )

    # Recordatorios propios
    desde_dt = datetime.combine(desde, datetime.min.time())
    hasta_dt = datetime.combine(hasta, datetime.max.time())
    recordatorios_q = db.query(models.recordatorio_docente.RecordatorioDocente).filter(
        models.recordatorio_docente.RecordatorioDocente.profesor_id
        == current_user.user_id,
        models.recordatorio_docente.RecordatorioDocente.fecha >= desde_dt,
        models.recordatorio_docente.RecordatorioDocente.fecha <= hasta_dt,
    )
    for r in recordatorios_q.all():
        items.append(
            {
                "tipo": "recordatorio",
                "id": r.id,
                "fecha": r.fecha.isoformat(),
                "titulo": r.titulo,
                "descripcion": r.descripcion,
                "materia_id": r.materia_id,
                "materia_nombre": materia_nombre.get(r.materia_id)
                if r.materia_id
                else None,
                "completado": r.completado,
            }
        )

    return {"desde": desde.isoformat(), "hasta": hasta.isoformat(), "items": items}


@router.post("/recordatorios", response_model=schemas.recordatorio.RecordatorioOut)
def crear_recordatorio(
    data: schemas.recordatorio.RecordatorioCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    _requiere_profesor(current_user)
    nuevo = models.recordatorio_docente.RecordatorioDocente(
        profesor_id=current_user.user_id,
        titulo=data.titulo,
        descripcion=data.descripcion,
        fecha=data.fecha,
        materia_id=data.materia_id,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


@router.patch(
    "/recordatorios/{recordatorio_id}",
    response_model=schemas.recordatorio.RecordatorioOut,
)
def actualizar_recordatorio(
    recordatorio_id: int,
    data: schemas.recordatorio.RecordatorioUpdate,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    _requiere_profesor(current_user)
    rec = (
        db.query(models.recordatorio_docente.RecordatorioDocente)
        .filter(models.recordatorio_docente.RecordatorioDocente.id == recordatorio_id)
        .first()
    )
    if not rec:
        raise HTTPException(status_code=404, detail="Recordatorio no encontrado")
    if rec.profesor_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(rec, key, value)
    db.commit()
    db.refresh(rec)
    return rec


@router.delete("/recordatorios/{recordatorio_id}")
def eliminar_recordatorio(
    recordatorio_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    _requiere_profesor(current_user)
    rec = (
        db.query(models.recordatorio_docente.RecordatorioDocente)
        .filter(models.recordatorio_docente.RecordatorioDocente.id == recordatorio_id)
        .first()
    )
    if not rec:
        raise HTTPException(status_code=404, detail="Recordatorio no encontrado")
    if rec.profesor_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    db.delete(rec)
    db.commit()
    return {"detail": "Recordatorio eliminado"}


@router.get(
    "/lista-alumnos",
    summary="Lista básica de alumnos (admin/profesor) con paginación",
)
def lista_alumnos(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role not in ("admin", "profesor"):
        raise HTTPException(status_code=403, detail="No autorizado")
    q = (
        db.query(models.user.User)
        .filter(models.user.User.role == "alumno")
        .order_by(models.user.User.nombre, models.user.User.username)
    )
    total = q.count()
    alumnos = q.offset(skip).limit(limit).all()
    items = [
        {"id": a.id, "nombre": a.nombre or a.username, "username": a.username, "cedula": a.cedula or ""}
        for a in alumnos
    ]
    return {"total": total, "skip": skip, "limit": limit, "items": items}
