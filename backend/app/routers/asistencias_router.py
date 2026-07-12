from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app import database, models, schemas
from app.auth import ALGORITHM, SECRET_KEY
from app.dependencias import get_current_user
from app.services.autorizacion import es_profesor_de_materia


router = APIRouter(prefix="/asistencias", tags=["asistencias"])


# ─── QR de asistencia ────────────────────────────────────────────────────────

QR_TOKEN_KIND = "asistencia_qr"
QR_TOKEN_TTL_MINUTES = 15


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


def _verificar_profesor_materia(db: Session, materia_id: int, current_user: dict):
    """Raises 403 if current_user is not the subject's teacher nor admin."""
    if current_user["role"] == "admin":
        return
    materia = (
        db.query(models.materia.Materia)
        .filter(models.materia.Materia.id == materia_id)
        .first()
    )
    if not materia:
        raise HTTPException(status_code=404, detail="Materia no encontrada")
    if not es_profesor_de_materia(db, materia_id, current_user["user_id"]):
        raise HTTPException(
            status_code=403, detail="No sos el profesor titular de esta materia"
        )


@router.post("/", response_model=schemas.asistencia.AsistenciaOut)
def create_asistencia(
    asistencia: schemas.asistencia.AsistenciaCreate,
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
    return new_asistencia


@router.get("/", response_model=list[schemas.asistencia.AsistenciaOut])
def list_asistencias(
    materia_id: Optional[int] = Query(None),
    user_id: Optional[int] = Query(None),
    fecha: Optional[date] = Query(None),
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(models.asistencia.Asistencia)
    # Alumno solo ve sus propias asistencias
    if current_user["role"] == "alumno":
        query = query.filter(
            models.asistencia.Asistencia.user_id == current_user["user_id"]
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
    return query.all()


@router.put("/{asistencia_id}", response_model=schemas.asistencia.AsistenciaOut)
def update_asistencia(
    asistencia_id: int,
    asistencia: schemas.asistencia.AsistenciaCreate,
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

    for reg in lote.registros:
        alumno = (
            db.query(models.user.User)
            .filter(models.user.User.id == reg.user_id)
            .first()
        )
        es_becado = alumno.es_becado if alumno else False

        existing = (
            db.query(models.asistencia.Asistencia)
            .filter(
                models.asistencia.Asistencia.user_id == reg.user_id,
                models.asistencia.Asistencia.oferta_materia_id == oferta_id,
                models.asistencia.Asistencia.fecha == lote.fecha,
            )
            .first()
        )
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

    db.commit()
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
    if current_user["role"] not in ("admin", "profesor"):
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

    result = []
    for a in alumnos:
        total = (
            db.query(models.asistencia.Asistencia)
            .filter(
                models.asistencia.Asistencia.user_id == a.id,
                models.asistencia.Asistencia.oferta_materia_id.in_(ofertas_ids),
            )
            .count()
        )
        presentes = (
            db.query(models.asistencia.Asistencia)
            .filter(
                models.asistencia.Asistencia.user_id == a.id,
                models.asistencia.Asistencia.oferta_materia_id.in_(ofertas_ids),
                models.asistencia.Asistencia.presente,
            )
            .count()
        )
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
    if current_user["role"] == "alumno" and current_user["user_id"] != user_id:
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
            models.inscripcion.Inscripcion.alumno_id == current_user["user_id"],
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
            models.asistencia.Asistencia.user_id == current_user["user_id"],
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
        .filter(models.user.User.id == current_user["user_id"])
        .first()
    )
    es_becado = alumno.es_becado if alumno else False
    nueva = models.asistencia.Asistencia(
        user_id=current_user["user_id"],
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
        hora_registro=datetime.now().strftime("%H:%M"),
        presentes=presentes,
        ausentes=ausentes,
    )
