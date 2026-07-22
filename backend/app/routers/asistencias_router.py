from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app import database, models, schemas
from app.auth import ALGORITHM, SECRET_KEY
from app.dependencias import get_current_user
from app.email_utils import send_alerta_inasistencia_email_bg
from app.services.autorizacion import es_profesor_de_materia
from app.schemas.current_user_schema import CurrentUser


router = APIRouter(prefix="/asistencias", tags=["asistencias"])


# ─── QR de asistencia ────────────────────────────────────────────────────────

QR_TOKEN_KIND = "asistencia_qr"
QR_TOKEN_TTL_MINUTES = 15

# ─── Alerta de inasistencia crítica ─────────────────────────────────────────
UMBRAL_INASISTENCIA_CRITICA = 25.0


def create_qr_token(materia_id: int, oferta_id: int) -> str:
    """Emite un JWT firmado con SECRET_KEY que autoriza registrar asistencia
    para (materia_id, oferta_id). Válido por QR_TOKEN_TTL_MINUTES.
    Consumido por POST /asistencias/qr/verificar.
    """
    now = datetime.now(timezone.utc)
    payload = {
        "kind": QR_TOKEN_KIND,
        "materia_id": materia_id,
        "oferta_id": oferta_id,
        "iat": now,
        "exp": now + timedelta(minutes=QR_TOKEN_TTL_MINUTES),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def _oferta_activa_id(db: Session, materia_id: int) -> int | None:
    oferta = (
        db.query(models.oferta_materia.OfertaMateria)
        .filter(
            models.oferta_materia.OfertaMateria.materia_id == materia_id,
            models.oferta_materia.OfertaMateria.activa == True,  # noqa: E712
        )
        .first()
    )
    return oferta.id if oferta else None


def _verificar_profesor_materia(db: Session, materia_id: int, current_user: CurrentUser):
    """Raises 403 if current_user is not the subject's teacher nor admin."""
    if current_user.role == "admin":
        return
    materia = (
        db.query(models.materia.Materia)
        .filter(models.materia.Materia.id == materia_id)
        .first()
    )
    if not materia:
        raise HTTPException(status_code=404, detail="Materia no encontrada")
    if not es_profesor_de_materia(db, materia_id, current_user.user_id):
        raise HTTPException(
            status_code=403, detail="No sos el profesor titular de esta materia"
        )


def _verificar_alerta_inasistencia(
    db: Session,
    background_tasks: BackgroundTasks,
    user_id: int,
    oferta_materia_id: int,
) -> None:
    """Si el alumno acaba de cruzar el 25% de inasistencia en la oferta
    (antes < 25%, ahora >= 25%), notifica por email a alumno, profesor y
    administradores. Reusa los mismos registros de asistencia (manual o QR).
    Se dispara una sola vez por cruce, ya que solo alerta en el instante en
    que el porcentaje pasa de <25% a >=25%; si luego sigue subiendo no
    reenvía.
    """
    total = (
        db.query(models.asistencia.Asistencia)
        .filter(
            models.asistencia.Asistencia.user_id == user_id,
            models.asistencia.Asistencia.oferta_materia_id == oferta_materia_id,
        )
        .count()
    )
    if total == 0:
        return
    ausentes = (
        db.query(models.asistencia.Asistencia)
        .filter(
            models.asistencia.Asistencia.user_id == user_id,
            models.asistencia.Asistencia.oferta_materia_id == oferta_materia_id,
            models.asistencia.Asistencia.presente == False,  # noqa: E712
        )
        .count()
    )
    pct_actual = (ausentes / total) * 100
    if pct_actual < UMBRAL_INASISTENCIA_CRITICA:
        return

    # Estado justo antes de este registro (para detectar el cruce del umbral)
    total_antes = total - 1
    ausentes_antes = ausentes - 1 if ausentes > 0 else 0
    pct_antes = (ausentes_antes / total_antes) * 100 if total_antes > 0 else 0.0
    if pct_antes >= UMBRAL_INASISTENCIA_CRITICA:
        return  # ya se había alertado en un registro anterior

    oferta = (
        db.query(models.oferta_materia.OfertaMateria)
        .filter(models.oferta_materia.OfertaMateria.id == oferta_materia_id)
        .first()
    )
    if not oferta:
        return
    materia = (
        db.query(models.materia.Materia)
        .filter(models.materia.Materia.id == oferta.materia_id)
        .first()
    )
    alumno = db.query(models.user.User).filter(models.user.User.id == user_id).first()
    profesor = (
        db.query(models.user.User)
        .filter(models.user.User.id == oferta.profesor_id)
        .first()
    )
    admins = (
        db.query(models.user.User).filter(models.user.User.role == "admin").all()
    )

    emails = []
    if alumno and alumno.email:
        emails.append(alumno.email)
    if profesor and profesor.email:
        emails.append(profesor.email)
    for admin in admins:
        if admin.email:
            emails.append(admin.email)
    emails = list(dict.fromkeys(emails))  # dedupe preservando orden

    send_alerta_inasistencia_email_bg(
        background_tasks,
        emails,
        alumno.nombre or alumno.username if alumno else "Alumno",
        materia.nombre if materia else "",
        round(pct_actual, 1),
    )


@router.post("/", response_model=schemas.asistencia.AsistenciaOut)
def create_asistencia(
    asistencia: schemas.asistencia.AsistenciaCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    _verificar_profesor_materia(db, asistencia.materia_id, current_user)
    oferta_id = _oferta_activa_id(db, asistencia.materia_id)
    if oferta_id is None:
        raise HTTPException(
            status_code=404, detail="No hay oferta activa para esta materia"
        )
    # Check for existing attendance record
    existing = (
        db.query(models.asistencia.Asistencia)
        .filter(
            models.asistencia.Asistencia.user_id == asistencia.user_id,
            models.asistencia.Asistencia.oferta_materia_id == oferta_id,
            models.asistencia.Asistencia.fecha == asistencia.fecha,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail="Ya existe un registro de asistencia para este alumno en esta fecha",
        )
    # Snapshot es_becado from user
    alumno = (
        db.query(models.user.User)
        .filter(models.user.User.id == asistencia.user_id)
        .first()
    )
    es_becado = alumno.es_becado if alumno else False
    new_asistencia = models.asistencia.Asistencia(
        user_id=asistencia.user_id,
        oferta_materia_id=oferta_id,
        fecha=asistencia.fecha,
        presente=asistencia.presente,
        es_becado=es_becado,
    )
    db.add(new_asistencia)
    db.commit()
    db.refresh(new_asistencia)

    if not asistencia.presente:
        _verificar_alerta_inasistencia(db, background_tasks, asistencia.user_id, oferta_id)

    return new_asistencia


@router.get("/", response_model=list[schemas.asistencia.AsistenciaOut])
def list_asistencias(
    materia_id: Optional[int] = Query(None),
    user_id: Optional[int] = Query(None),
    fecha: Optional[date] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(500, ge=1, le=2000),
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(models.asistencia.Asistencia)
    # Alumno solo ve sus propias asistencias
    if current_user.role == "alumno":
        query = query.filter(
            models.asistencia.Asistencia.user_id == current_user.user_id
        )
    else:
        if user_id is not None:
            query = query.filter(models.asistencia.Asistencia.user_id == user_id)
    if materia_id is not None:
        oferta_id = _oferta_activa_id(db, materia_id)
        query = query.filter(
            models.asistencia.Asistencia.oferta_materia_id == oferta_id
        )
    if fecha is not None:
        query = query.filter(models.asistencia.Asistencia.fecha == fecha)
    query = query.order_by(models.asistencia.Asistencia.id).offset(skip).limit(limit)
    return query.all()


@router.put("/{asistencia_id}", response_model=schemas.asistencia.AsistenciaOut)
def update_asistencia(
    asistencia_id: int,
    asistencia: schemas.asistencia.AsistenciaCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    existing = (
        db.query(models.asistencia.Asistencia)
        .filter(models.asistencia.Asistencia.id == asistencia_id)
        .first()
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Asistencia no encontrada")
    _verificar_profesor_materia(db, existing.materia_id, current_user)
    data = asistencia.model_dump()
    nueva_materia_id = data.pop("materia_id")
    if nueva_materia_id != existing.materia_id:
        nuevo_oferta_id = _oferta_activa_id(db, nueva_materia_id)
        if nuevo_oferta_id is None:
            raise HTTPException(
                status_code=404, detail="No hay oferta activa para esta materia"
            )
        existing.oferta_materia_id = nuevo_oferta_id
    for key, value in data.items():
        setattr(existing, key, value)
    db.commit()
    db.refresh(existing)

    if not existing.presente:
        _verificar_alerta_inasistencia(
            db, background_tasks, existing.user_id, existing.oferta_materia_id
        )

    return existing


@router.delete("/{asistencia_id}")
def delete_asistencia(
    asistencia_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    existing = (
        db.query(models.asistencia.Asistencia)
        .filter(models.asistencia.Asistencia.id == asistencia_id)
        .first()
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Asistencia no encontrada")
    _verificar_profesor_materia(db, existing.materia_id, current_user)
    db.delete(existing)
    db.commit()
    return {"detail": "Asistencia eliminada"}


@router.post("/lote", response_model=schemas.asistencia.AsistenciaLoteResponse)
def cargar_asistencia_lote(
    lote: schemas.asistencia.AsistenciaLote,
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    """Carga/actualiza asistencia de toda una clase en un solo request."""
    _verificar_profesor_materia(db, lote.materia_id, current_user)
    oferta_id = _oferta_activa_id(db, lote.materia_id)
    if oferta_id is None:
        raise HTTPException(
            status_code=404, detail="No hay oferta activa para esta materia"
        )
    guardados = 0
    actualizados = 0
    ausentes_user_ids = []

    # batch pre-fetch: 2 queries fijas en vez de 2 × N
    lote_user_ids = [r.user_id for r in lote.registros]
    users_map = {
        u.id: u
        for u in db.query(models.user.User)
        .filter(models.user.User.id.in_(lote_user_ids))
        .all()
    }
    existentes_map = {
        a.user_id: a
        for a in db.query(models.asistencia.Asistencia)
        .filter(
            models.asistencia.Asistencia.user_id.in_(lote_user_ids),
            models.asistencia.Asistencia.oferta_materia_id == oferta_id,
            models.asistencia.Asistencia.fecha == lote.fecha,
        )
        .all()
    }

    for reg in lote.registros:
        alumno = users_map.get(reg.user_id)
        es_becado = alumno.es_becado if alumno else False

        existing = existentes_map.get(reg.user_id)
        if existing:
            existing.presente = reg.presente
            existing.es_becado = es_becado
            actualizados += 1
        else:
            nueva = models.asistencia.Asistencia(
                user_id=reg.user_id,
                oferta_materia_id=oferta_id,
                fecha=lote.fecha,
                presente=reg.presente,
                es_becado=es_becado,
            )
            db.add(nueva)
            guardados += 1

        if not reg.presente:
            ausentes_user_ids.append(reg.user_id)

    db.commit()

    for uid in ausentes_user_ids:
        _verificar_alerta_inasistencia(db, background_tasks, uid, oferta_id)

    return schemas.asistencia.AsistenciaLoteResponse(
        guardados=guardados, actualizados=actualizados, total=guardados + actualizados
    )


@router.get(
    "/materia/{materia_id}/alumnos",
    response_model=list[schemas.asistencia.AlumnoAsistenciaOut],
)
def alumnos_asistencia(
    materia_id: int,
    becado: Optional[bool] = Query(None),
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    """Retorna alumnos matriculados con su porcentaje de asistencia."""
    if current_user.role not in ("admin", "profesor"):
        raise HTTPException(status_code=403, detail="No autorizado")

    ofertas_ids = [
        o.id
        for o in db.query(models.oferta_materia.OfertaMateria.id)
        .filter(models.oferta_materia.OfertaMateria.materia_id == materia_id)
        .all()
    ]
    inscripciones = (
        db.query(models.inscripcion.Inscripcion)
        .filter(models.inscripcion.Inscripcion.oferta_materia_id.in_(ofertas_ids))
        .all()
    )
    if not inscripciones:
        return []

    alumno_ids = [i.alumno_id for i in inscripciones]
    alumnos = db.query(models.user.User).filter(models.user.User.id.in_(alumno_ids))
    if becado is not None:
        alumnos = alumnos.filter(models.user.User.es_becado == becado)
    alumnos = alumnos.all()

    from sqlalchemy import func, case as sa_case

    alumno_ids_list = [a.id for a in alumnos]
    # GROUP BY: 1 query total en vez de 2 × N
    conteos_raw = (
        db.query(
            models.asistencia.Asistencia.user_id,
            func.count().label("total"),
            func.sum(
                sa_case((models.asistencia.Asistencia.presente == True, 1), else_=0)
            ).label("presentes"),
        )
        .filter(
            models.asistencia.Asistencia.user_id.in_(alumno_ids_list),
            models.asistencia.Asistencia.oferta_materia_id.in_(ofertas_ids),
        )
        .group_by(models.asistencia.Asistencia.user_id)
        .all()
    )
    conteos = {row.user_id: (row.total, int(row.presentes or 0)) for row in conteos_raw}

    result = []
    for a in alumnos:
        total, presentes = conteos.get(a.id, (0, 0))
        pct = round((presentes / total) * 100, 1) if total > 0 else 0.0
        result.append(
            schemas.asistencia.AlumnoAsistenciaOut(
                user_id=a.id,
                nombre=a.nombre,
                username=a.username,
                es_becado=a.es_becado,
                total_clases=total,
                presentes=presentes,
                porcentaje=pct,
            )
        )

    return result


@router.get("/alumno/{user_id}/porcentaje")
def porcentaje_asistencia_alumno(
    user_id: int,
    materia_id: Optional[int] = Query(None),
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    """Porcentaje de asistencia de un alumno (global o por materia)."""
    if current_user.role != "admin" and current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="No autorizado")

    query = db.query(models.asistencia.Asistencia).filter(
        models.asistencia.Asistencia.user_id == user_id
    )
    if materia_id is not None:
        ofertas_ids = [
            o.id
            for o in db.query(models.oferta_materia.OfertaMateria.id)
            .filter(models.oferta_materia.OfertaMateria.materia_id == materia_id)
            .all()
        ]
        query = query.filter(
            models.asistencia.Asistencia.oferta_materia_id.in_(ofertas_ids)
        )

    total = query.count()
    presentes = query.filter(models.asistencia.Asistencia.presente).count()
    return {
        "user_id": user_id,
        "materia_id": materia_id,
        "total_clases": total,
        "presentes": presentes,
        "porcentaje": round((presentes / total) * 100, 1) if total > 0 else 0.0,
    }


@router.get("/{materia_id}/resumen")
def resumen_asistencia(
    materia_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    ofertas_ids = [
        o.id
        for o in db.query(models.oferta_materia.OfertaMateria.id)
        .filter(models.oferta_materia.OfertaMateria.materia_id == materia_id)
        .all()
    ]
    total = (
        db.query(models.asistencia.Asistencia)
        .filter(models.asistencia.Asistencia.oferta_materia_id.in_(ofertas_ids))
        .count()
    )
    presentes = (
        db.query(models.asistencia.Asistencia)
        .filter(
            models.asistencia.Asistencia.oferta_materia_id.in_(ofertas_ids),
            models.asistencia.Asistencia.presente,
        )
        .count()
    )
    if total == 0:
        return {"porcentaje": 0}
    return {"porcentaje": round((presentes / total) * 100, 2)}


@router.post(
    "/qr/verificar",
    response_model=schemas.asistencia.QrVerifyResponse,
    summary="Registrar asistencia del alumno actual escaneando el QR del aula",
)
def verificar_qr_asistencia(
    body: schemas.asistencia.QrVerifyRequest,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    """Registra la asistencia del alumno autenticado usando el QR emitido
    por el profesor. Valida:
    - JWT firmado con SECRET_KEY, con `kind == "asistencia_qr"` y sin vencer.
    - Alumno inscripto en una oferta de la materia indicada.
    - No hay asistencia registrada para hoy en la misma oferta.
    Devuelve el conteo de presentes/ausentes en la clase de hoy.
    """
    # 1. Decodificar y validar el JWT del QR.
    try:
        payload = jwt.decode(body.qr_token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=400, detail="QR inválido o expirado")

    if payload.get("kind") != QR_TOKEN_KIND:
        raise HTTPException(status_code=400, detail="QR inválido o expirado")

    materia_id = payload.get("materia_id")
    oferta_id_qr = payload.get("oferta_id")
    if materia_id is None or oferta_id_qr is None:
        raise HTTPException(status_code=400, detail="QR inválido o expirado")

    # 2. Verificar que la oferta del QR sigue siendo la activa de la materia.
    oferta_activa_id = _oferta_activa_id(db, materia_id)
    if oferta_activa_id != oferta_id_qr:
        raise HTTPException(status_code=400, detail="QR inválido o expirado")

    # 3. Verificar que el alumno está inscripto en esa oferta.
    inscripcion = (
        db.query(models.inscripcion.Inscripcion)
        .filter(
            models.inscripcion.Inscripcion.alumno_id == current_user.user_id,
            models.inscripcion.Inscripcion.oferta_materia_id == oferta_activa_id,
        )
        .first()
    )
    if not inscripcion:
        raise HTTPException(
            status_code=403, detail="No estás inscripto en esta materia"
        )

    # 4. Verificar que no hay asistencia previa para hoy.
    hoy = date.today()
    existente = (
        db.query(models.asistencia.Asistencia)
        .filter(
            models.asistencia.Asistencia.user_id == current_user.user_id,
            models.asistencia.Asistencia.oferta_materia_id == oferta_activa_id,
            models.asistencia.Asistencia.fecha == hoy,
        )
        .first()
    )
    if existente:
        raise HTTPException(
            status_code=409, detail="Tu asistencia de hoy ya está registrada"
        )

    # 5. Snapshot es_becado + insertar registro.
    alumno = (
        db.query(models.user.User)
        .filter(models.user.User.id == current_user.user_id)
        .first()
    )
    es_becado = alumno.es_becado if alumno else False
    nueva = models.asistencia.Asistencia(
        user_id=current_user.user_id,
        oferta_materia_id=oferta_activa_id,
        fecha=hoy,
        presente=True,
        es_becado=es_becado,
    )
    db.add(nueva)
    db.commit()

    # 6. Conteo de la clase de hoy (post-insert).
    presentes = (
        db.query(models.asistencia.Asistencia)
        .filter(
            models.asistencia.Asistencia.oferta_materia_id == oferta_activa_id,
            models.asistencia.Asistencia.fecha == hoy,
            models.asistencia.Asistencia.presente,
        )
        .count()
    )
    ausentes = (
        db.query(models.asistencia.Asistencia)
        .filter(
            models.asistencia.Asistencia.oferta_materia_id == oferta_activa_id,
            models.asistencia.Asistencia.fecha == hoy,
            models.asistencia.Asistencia.presente == False,  # noqa: E712
        )
        .count()
    )

    # Nombre de la materia para la respuesta.
    materia = (
        db.query(models.materia.Materia)
        .filter(models.materia.Materia.id == materia_id)
        .first()
    )

    return schemas.asistencia.QrVerifyResponse(
        materia_nombre=materia.nombre if materia else "",
        fecha=hoy,
        hora_registro=datetime.now(timezone.utc).strftime("%H:%M"),
        presentes=presentes,
        ausentes=ausentes,
    )


# ─── Endpoints para ProfesorView del frontend ────────────────────────────────


@router.get(
    "/profesor/carreras",
    summary="Carreras donde el profesor dicta clases",
)
def profesor_carreras(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role not in ("admin", "profesor"):
        raise HTTPException(status_code=403, detail="No autorizado")
    carreras_con_materias = (
        db.query(models.carrera.Carrera)
        .join(models.materia.Materia)
        .join(
            models.oferta_materia.OfertaMateria,
            models.oferta_materia.OfertaMateria.materia_id == models.materia.Materia.id,
        )
        .filter(
            models.oferta_materia.OfertaMateria.profesor_id == current_user.user_id,
            models.oferta_materia.OfertaMateria.activa == True,
        )
        .distinct()
        .all()
    )
    if current_user.role == "admin":
        carreras_con_materias = db.query(models.carrera.Carrera).all()
    return [{"id": c.id, "nombre": c.nombre} for c in carreras_con_materias]


@router.get(
    "/profesor/materias",
    summary="Materias del profesor filtradas por carrera",
)
def profesor_materias(
    carrera_id: int = Query(...),
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role not in ("admin", "profesor"):
        raise HTTPException(status_code=403, detail="No autorizado")
    query = db.query(models.materia.Materia).filter(
        models.materia.Materia.carrera_id == carrera_id
    )
    if current_user.role == "profesor":
        query = query.join(
            models.oferta_materia.OfertaMateria,
            models.oferta_materia.OfertaMateria.materia_id == models.materia.Materia.id,
        ).filter(
            models.oferta_materia.OfertaMateria.profesor_id == current_user.user_id,
            models.oferta_materia.OfertaMateria.activa == True,
        )
    return [
        {"id": m.id, "nombre": m.nombre, "codigo": str(m.id)}
        for m in query.all()
    ]


@router.get(
    "/profesor/alumnos",
    response_model=schemas.asistencia.ProfesorAlumnosResponse,
    summary="Alumnos de una materia con asistencia en una fecha",
)
def profesor_alumnos(
    materia_id: int = Query(...),
    fecha: str = Query(...),
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role not in ("admin", "profesor"):
        raise HTTPException(status_code=403, detail="No autorizado")
    materia = (
        db.query(models.materia.Materia)
        .filter(models.materia.Materia.id == materia_id)
        .first()
    )
    if not materia:
        raise HTTPException(status_code=404, detail="Materia no encontrada")

    ofertas_ids = [
        o.id
        for o in db.query(models.oferta_materia.OfertaMateria.id)
        .filter(models.oferta_materia.OfertaMateria.materia_id == materia_id)
        .all()
    ]
    inscripciones = (
        db.query(models.inscripcion.Inscripcion)
        .filter(models.inscripcion.Inscripcion.oferta_materia_id.in_(ofertas_ids))
        .all()
    )
    alumno_ids = [i.alumno_id for i in inscripciones]
    alumnos = (
        db.query(models.user.User)
        .filter(models.user.User.id.in_(alumno_ids))
        .all()
    )

    fecha_date = date.fromisoformat(fecha) if fecha else date.today()
    # batch: 1 query en vez de 1 × N
    asis_map = {
        a_row.user_id: a_row
        for a_row in db.query(models.asistencia.Asistencia)
        .filter(
            models.asistencia.Asistencia.user_id.in_([a.id for a in alumnos]),
            models.asistencia.Asistencia.oferta_materia_id.in_(ofertas_ids),
            models.asistencia.Asistencia.fecha == fecha_date,
        )
        .all()
    }
    result = []
    for a in alumnos:
        asistencia = asis_map.get(a.id)
        result.append(
            schemas.asistencia.ProfesorAlumnoOut(
                id=a.id,
                nombre=a.nombre or a.username,
                documento=a.username,
                asistencia_id=asistencia.id if asistencia else None,
                presente=asistencia.presente if asistencia else None,
                es_becado=a.es_becado or False,
                motivo=getattr(asistencia, "motivo", None) if asistencia else None,
            )
        )

    return schemas.asistencia.ProfesorAlumnosResponse(
        fecha=fecha,
        materia=materia.nombre,
        alumnos=result,
    )


@router.get(
    "/qr/{materia_id}",
    response_model=schemas.asistencia.QrGenerateResponse,
    summary="Generar QR de asistencia para una materia",
)
def generar_qr(
    materia_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role not in ("admin", "profesor"):
        raise HTTPException(status_code=403, detail="No autorizado")
    materia = (
        db.query(models.materia.Materia)
        .filter(models.materia.Materia.id == materia_id)
        .first()
    )
    if not materia:
        raise HTTPException(status_code=404, detail="Materia no encontrada")
    oferta_id = _oferta_activa_id(db, materia_id)
    if oferta_id is None:
        raise HTTPException(
            status_code=404, detail="No hay oferta activa para esta materia"
        )

    import io
    import qrcode
    import base64

    token = create_qr_token(materia_id, oferta_id)
    expira_en = QR_TOKEN_TTL_MINUTES * 60

    qr = qrcode.make(token)
    buf = io.BytesIO()
    qr.save(buf)
    qr_base64 = base64.b64encode(buf.getvalue()).decode()

    scan_url = f"/asistencia/scan?token={token}"

    return schemas.asistencia.QrGenerateResponse(
        qr_base64=qr_base64,
        token=token,
        scan_url=scan_url,
        expira_en=expira_en,
    )


@router.put(
    "/profesor/toggle/{asistencia_id}",
    summary="Toggle presente/ausente de una asistencia existente",
)
def profesor_toggle_asistencia(
    asistencia_id: int,
    presente: bool = Query(...),
    motivo: str | None = Query(None),
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role not in ("admin", "profesor"):
        raise HTTPException(status_code=403, detail="No autorizado")
    existing = (
        db.query(models.asistencia.Asistencia)
        .filter(models.asistencia.Asistencia.id == asistencia_id)
        .first()
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Asistencia no encontrada")
    existing.presente = presente
    if motivo is not None:
        existing.motivo = motivo
    db.commit()
    db.refresh(existing)
    return {"id": existing.id, "presente": existing.presente, "motivo": getattr(existing, "motivo", None)}


@router.post(
    "/profesor/marcar",
    summary="Crear registro de asistencia para un alumno",
)
def profesor_marcar_asistencia(
    materia_id: int = Query(...),
    alumno_id: int = Query(...),
    fecha_str: str = Query(..., alias="fecha"),
    presente: bool = Query(...),
    motivo: str | None = Query(None),
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role not in ("admin", "profesor"):
        raise HTTPException(status_code=403, detail="No autorizado")
    oferta_id = _oferta_activa_id(db, materia_id)
    if oferta_id is None:
        raise HTTPException(
            status_code=404, detail="No hay oferta activa para esta materia"
        )
    fecha_date = date.fromisoformat(fecha_str) if fecha_str else date.today()

    alumno = db.query(models.user.User).filter(models.user.User.id == alumno_id).first()
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")

    existing = (
        db.query(models.asistencia.Asistencia)
        .filter(
            models.asistencia.Asistencia.user_id == alumno_id,
            models.asistencia.Asistencia.oferta_materia_id == oferta_id,
            models.asistencia.Asistencia.fecha == fecha_date,
        )
        .first()
    )
    if existing:
        existing.presente = presente
        if motivo is not None:
            existing.motivo = motivo
        db.commit()
        db.refresh(existing)
        return {"id": existing.id, "presente": existing.presente, "motivo": getattr(existing, "motivo", None)}

    nueva = models.asistencia.Asistencia(
        user_id=alumno_id,
        oferta_materia_id=oferta_id,
        fecha=fecha_date,
        presente=presente,
        es_becado=alumno.es_becado or False,
    )
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return {"id": nueva.id, "presente": nueva.presente, "motivo": None}
