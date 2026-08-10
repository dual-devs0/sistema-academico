"""
Portal docente: cátedras activas, histórico, agenda (eventos+recordatorios), estadísticas
de sus propios cursos. Todo endpoint valida que la oferta pertenezca al profesor autenticado
(es_profesor_de_materia) — si esa validación falta, un profesor podría ver/editar datos de
una materia que no dicta.
"""
from datetime import date, datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, case
from sqlalchemy.orm import Session, joinedload
from app import models, schemas, database
from app.dependencias import get_current_user
from app.schemas.current_user_schema import CurrentUser
from app.services.puntajes_utils import calcular_promedio_final, get_pesos

router = APIRouter(prefix="/profesor", tags=["profesor"])


def _requiere_profesor(current_user: CurrentUser):
    if current_user.role not in ("admin", "profesor"):
        raise HTTPException(
            status_code=403, detail="Solo administradores o profesores pueden acceder a este recurso"
        )


@router.get("/dashboard")
def profesor_dashboard(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    _requiere_profesor(current_user)
    uid = current_user.user_id

    O = models.oferta_materia.OfertaMateria
    M = models.materia.Materia
    I = models.inscripcion.Inscripcion
    P = models.puntaje.Puntaje
    A = models.asistencia.Asistencia
    H = models.horario.Horario
    C = models.carrera.Carrera
    U = models.user.User

    ofertas = (
        db.query(O).options(joinedload(O.materia).joinedload(M.carrera))
        .filter(O.profesor_id == uid, O.activa == True)
        .all()
    )
    oferta_ids = [o.id for o in ofertas]
    materia_ids = [o.materia_id for o in ofertas]

    resumen = {
        "materias_activas": len(ofertas),
        "total_alumnos": 0,
        "promedio_general": None,
        "porcentaje_aprobacion": None,
        "asistencia_promedio": None,
    }

    if not oferta_ids:
        return {"resumen": resumen, "materias": [], "agenda_hoy": [], "alertas": []}

    # Alumnos únicos
    alumno_ids_raw = [
        r[0] for r in db.query(I.alumno_id)
        .filter(I.oferta_materia_id.in_(oferta_ids), I.alumno_id.isnot(None))
        .distinct().all()
    ]
    resumen["total_alumnos"] = len(alumno_ids_raw)

    # Promedio general / % aprobacion: promedio real por (oferta, alumno) con
    # los pesos reales de cada materia -- no un AVG crudo que mezclaria
    # escalas distintas (parcial max 20, final max 50, directa 0-10).
    materia_por_oferta = {o.id: o.materia_id for o in ofertas}
    pesos_cache: dict[int, dict] = {}

    def pesos_de(materia_id: int) -> dict:
        if materia_id not in pesos_cache:
            pesos_cache[materia_id] = get_pesos(db, materia_id)
        return pesos_cache[materia_id]

    notas_por_grupo: dict[tuple[int, int], dict] = {}
    for p in db.query(P).filter(P.oferta_materia_id.in_(oferta_ids)).all():
        notas_por_grupo.setdefault((p.oferta_materia_id, p.user_id), {})[p.tipo] = float(p.valor)

    promedios_grupo = []
    promedios_por_oferta: dict[int, list[float]] = {}
    promedios_por_usuario: dict[int, list[float]] = {}
    for (oferta_id, user_id), notas in notas_por_grupo.items():
        mid = materia_por_oferta.get(oferta_id)
        prom = calcular_promedio_final(notas, pesos_de(mid) if mid else None)
        if prom is not None:
            promedios_grupo.append(prom)
            promedios_por_oferta.setdefault(oferta_id, []).append(prom)
            promedios_por_usuario.setdefault(user_id, []).append(prom)

    if promedios_grupo:
        resumen["promedio_general"] = round(sum(promedios_grupo) / len(promedios_grupo), 2)
        aprob_count = sum(1 for v in promedios_grupo if v >= 6)
        resumen["porcentaje_aprobacion"] = round(aprob_count / len(promedios_grupo) * 100, 1)

    # Asistencia promedio
    asis_row = (
        db.query(
            func.count(A.id).label("total"),
            func.sum(case((A.presente, 1), else_=0)).label("pres"),
        )
        .filter(A.oferta_materia_id.in_(oferta_ids))
        .first()
    )
    total_a = asis_row.total if asis_row else 0
    pres_a = asis_row.pres if asis_row else 0
    if total_a > 0:
        resumen["asistencia_promedio"] = round(pres_a / total_a * 100, 1)

    # Materias con detalle
    alumno_por_oferta: dict[int, int] = {}
    for ofid, cnt in (
        db.query(I.oferta_materia_id, func.count(I.id))
        .filter(I.oferta_materia_id.in_(oferta_ids))
        .group_by(I.oferta_materia_id)
        .all()
    ):
        if ofid is not None:
            alumno_por_oferta[ofid] = cnt

    prom_por_oferta: dict[int, float | None] = {
        oferta_id: round(sum(vals) / len(vals), 2)
        for oferta_id, vals in promedios_por_oferta.items()
    }

    horarios_por_materia: dict[int, list[dict]] = {}
    for h in db.query(H).filter(H.materia_id.in_(materia_ids)).all():
        horarios_por_materia.setdefault(h.materia_id, []).append({
            "dia": h.dia_semana,
            "hora_inicio": h.hora_inicio.isoformat(),
            "hora_fin": h.hora_fin.isoformat(),
            "aula": h.aula,
        })

    materias_out = []
    for o in ofertas:
        materia = o.materia
        if not materia:
            continue
        materias_out.append({
            "id": materia.id,
            "oferta_id": o.id,
            "nombre": materia.nombre,
            "codigo": materia.codigo,
            "carrera": materia.carrera.nombre if materia.carrera else None,
            "periodo": o.periodo,
            "cantidad_alumnos": alumno_por_oferta.get(o.id, 0),
            "promedio": prom_por_oferta.get(o.id),
            "horarios": horarios_por_materia.get(materia.id, []),
        })

    # Agenda de hoy
    hoy = date.today()
    hoy_dt_inicio = datetime.combine(hoy, datetime.min.time())
    hoy_dt_fin = datetime.combine(hoy, datetime.max.time())
    agenda_hoy = []

    for h in db.query(H).filter(H.materia_id.in_(materia_ids)).all():
        if h.dia_semana == hoy.weekday():
            m_nombre = next((mo["nombre"] for mo in materias_out if mo["id"] == h.materia_id), None)
            agenda_hoy.append({
                "tipo": "clase",
                "hora_inicio": h.hora_inicio.isoformat()[:5],
                "hora_fin": h.hora_fin.isoformat()[:5],
                "titulo": m_nombre or f"Materia #{h.materia_id}",
                "aula": h.aula,
            })

    eventos_hoy = (
        db.query(models.evento.EventoCalendario)
        .filter(
            models.evento.EventoCalendario.fecha == hoy,
            models.evento.EventoCalendario.materia_id.in_(materia_ids),
        )
        .all()
    )
    for e in eventos_hoy:
        m_nombre = next((mo["nombre"] for mo in materias_out if mo["id"] == e.materia_id), None)
        agenda_hoy.append({
            "tipo": "evento",
            "hora_inicio": e.hora or "—",
            "hora_fin": None,
            "titulo": e.titulo,
            "aula": e.ubicacion or "Campus UCA",
            "materia": m_nombre,
        })

    recordatorios_hoy = (
        db.query(models.recordatorio_docente.RecordatorioDocente)
        .filter(
            models.recordatorio_docente.RecordatorioDocente.profesor_id == uid,
            models.recordatorio_docente.RecordatorioDocente.fecha >= hoy_dt_inicio,
            models.recordatorio_docente.RecordatorioDocente.fecha <= hoy_dt_fin,
        )
        .all()
    )
    for r in recordatorios_hoy:
        agenda_hoy.append({
            "tipo": "recordatorio",
            "hora_inicio": r.fecha.strftime("%H:%M") if r.fecha else "—",
            "hora_fin": None,
            "titulo": r.titulo,
            "aula": r.descripcion or "",
        })

    agenda_hoy.sort(key=lambda x: (x["hora_inicio"] == "—", x["hora_inicio"]))

    # Alertas: alumnos con inasistencia ≥25% o promedio < 6
    alertas = []
    if alumno_ids_raw:
        asis_agg = {}
        for r in db.query(
            A.user_id, A.oferta_materia_id,
            func.count(A.id).label("total"),
            func.sum(case((A.presente, 1), else_=0)).label("pres"),
        ).filter(
            A.user_id.in_(alumno_ids_raw),
            A.oferta_materia_id.in_(oferta_ids),
        ).group_by(A.user_id, A.oferta_materia_id).all():
            key = (r.user_id, r.oferta_materia_id)
            asis_agg[key] = {"total": r.total or 0, "pres": r.pres or 0}

        # Promedio real por alumno (promedio de sus promedios por oferta,
        # cada uno con los pesos reales) -- no un AVG crudo cross-materia.
        punt_agg_uid: dict[int, float] = {
            uid: sum(vals) / len(vals)
            for uid, vals in promedios_por_usuario.items()
        }

        nombre_map: dict[int, str] = {}
        for u in db.query(U.id, U.nombre).filter(U.id.in_(alumno_ids_raw)).all():
            nombre_map[u.id] = u.nombre or f"Alumno #{u.id}"

        oferta_nombre_map: dict[int, str] = {o.id: (o.materia.nombre if o.materia else f"Oferta #{o.id}") for o in ofertas}

        for (uid_a, ofid), stats in asis_agg.items():
            inas_pct = round((1 - stats["pres"] / stats["total"]) * 100) if stats["total"] > 0 else 0
            prom = punt_agg_uid.get(uid_a)
            if inas_pct >= 25 or (prom is not None and prom < 6):
                alertas.append({
                    "alumno_id": uid_a,
                    "alumno_nombre": nombre_map.get(uid_a, f"Alumno #{uid_a}"),
                    "materia_id": ofid,
                    "materia_nombre": oferta_nombre_map.get(ofid, f"Oferta #{ofid}"),
                    "inasistencia_pct": inas_pct,
                })

    return {
        "resumen": resumen,
        "materias": materias_out,
        "agenda_hoy": agenda_hoy,
        "alertas": alertas,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/materias")
def mis_materias(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    _requiere_profesor(current_user)
    O = models.oferta_materia.OfertaMateria
    M = models.materia.Materia
    C = models.carrera.Carrera
    ofertas = (
        db.query(O)
        .options(joinedload(O.materia).joinedload(M.carrera))
        .filter(O.profesor_id == current_user.user_id, O.activa == True)
        .all()
    )
    return [
        {
            "id": o.materia.id,
            "nombre": o.materia.nombre,
            "codigo": o.materia.codigo,
            "carrera": o.materia.carrera.nombre if o.materia and o.materia.carrera else None,
        }
        for o in ofertas if o.materia
    ]


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
    materia_por_oferta = {o.id: o.materia_id for o in ofertas}
    pesos_cache: dict[int, dict] = {}

    def pesos_de(materia_id: int) -> dict:
        if materia_id not in pesos_cache:
            pesos_cache[materia_id] = get_pesos(db, materia_id)
        return pesos_cache[materia_id]

    # Student count per oferta (single query)
    alumno_counts: dict[int, int] = {oid: cnt for oid, cnt in
        db.query(I.oferta_materia_id, func.count(I.id))
        .filter(I.oferta_materia_id.in_(oferta_ids))
        .group_by(I.oferta_materia_id)
        .all()
        if oid is not None
    }

    # Promedio real + tasa de aprobacion por oferta (pesos reales de la
    # materia, no un AVG crudo que mezclaria parcial/practico/final/directa).
    notas_por_grupo: dict[tuple[int, int], dict] = {}
    for p in db.query(P).filter(P.oferta_materia_id.in_(oferta_ids)).all():
        notas_por_grupo.setdefault((p.oferta_materia_id, p.user_id), {})[p.tipo] = float(p.valor)

    promedios_por_oferta: dict[int, list[float]] = {}
    for (oferta_id, _user_id), notas in notas_por_grupo.items():
        mid = materia_por_oferta.get(oferta_id)
        prom = calcular_promedio_final(notas, pesos_de(mid) if mid else None)
        if prom is not None:
            promedios_por_oferta.setdefault(oferta_id, []).append(prom)

    punt_agg = {}
    for ofid in oferta_ids:
        vals = promedios_por_oferta.get(ofid)
        if vals:
            prom = round(sum(vals) / len(vals), 2)
            aprob = sum(1 for v in vals if v >= 6)
            pct_aprob = round((aprob / len(vals)) * 100, 1)
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
    )
    if current_user.role == "profesor":
        q = q.join(models.inscripcion.Inscripcion, models.inscripcion.Inscripcion.alumno_id == models.user.User.id)
        q = q.join(models.oferta_materia.OfertaMateria, models.oferta_materia.OfertaMateria.id == models.inscripcion.Inscripcion.oferta_materia_id)
        q = q.filter(
            models.oferta_materia.OfertaMateria.profesor_id == current_user.user_id,
            models.oferta_materia.OfertaMateria.activa == True,
        )
        q = q.distinct()
    q = q.order_by(models.user.User.nombre, models.user.User.username)
    total = q.count()
    alumnos = q.offset(skip).limit(limit).all()
    items = [
        {"id": a.id, "nombre": a.nombre or a.username, "username": a.username, "cedula": a.cedula or ""}
        for a in alumnos
    ]
    return {"total": total, "skip": skip, "limit": limit, "items": items}
