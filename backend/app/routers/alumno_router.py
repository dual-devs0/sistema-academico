from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app import models, schemas, database
from app.models import evento_calendario
from app.dependencias import get_current_user
from app.security import hash_password
from app.services.storage import obtener_url_firmada
from app.services.puntajes_utils import calcular_promedio_final

router = APIRouter(prefix="/alumno", tags=["alumno"])


@router.get("/mi-perfil", response_model=schemas.user.UserOut)
def mi_perfil(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    user = (
        db.query(models.user.User)
        .filter(models.user.User.id == current_user.user_id)
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if user.foto_url:
        user.foto_url = obtener_url_firmada(user.foto_url)
    return user


@router.patch("/mi-perfil", response_model=schemas.user.UserOut)
def actualizar_mi_perfil(
    data: schemas.user.UserUpdate,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    user = (
        db.query(models.user.User)
        .filter(models.user.User.id == current_user.user_id)
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    update_data = data.model_dump(exclude_unset=True)

    # Alumno solo puede cambiar nombre, email y password
    allowed = {"nombre", "email", "password"}
    for key in list(update_data.keys()):
        if key not in allowed:
            del update_data[key]

    if "password" in update_data:
        update_data["hashed_password"] = hash_password(update_data.pop("password"))

    for key, value in update_data.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return user


@router.get("/mis-materias")
def mis_materias(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    uid = current_user.user_id
    inscripciones = (
        db.query(models.inscripcion.Inscripcion)
        .options(
            joinedload(models.inscripcion.Inscripcion.oferta)
            .joinedload(models.oferta_materia.OfertaMateria.materia),
            joinedload(models.inscripcion.Inscripcion.oferta)
            .joinedload(models.oferta_materia.OfertaMateria.profesor),
        )
        .filter(models.inscripcion.Inscripcion.alumno_id == uid)
        .all()
    )
    seen = set()
    result = []
    for ins in inscripciones:
        oferta = ins.oferta
        if not oferta or not oferta.activa:
            continue
        m = oferta.materia
        if not m or m.id in seen:
            continue
        seen.add(m.id)
        result.append({
            "id": m.id,
            "nombre": m.nombre,
            "profesor": oferta.profesor.nombre if oferta.profesor else None,
            "anio": m.anio,
            "semestre": m.semestre,
        })
    return result


@router.get("/mis-notas")
def mis_notas(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    user_id = current_user.user_id
    puntajes = (
        db.query(models.puntaje.Puntaje)
        .filter(models.puntaje.Puntaje.user_id == user_id)
        .all()
    )
    materias = db.query(models.materia.Materia).all()
    mat_map = {m.id: m.nombre for m in materias}

    por_materia: dict[int, dict] = {}
    for p in puntajes:
        mid = p.materia_id
        if mid is None:
            continue
        if mid not in por_materia:
            por_materia[mid] = {
                "materia_id": mid,
                "materia_nombre": mat_map.get(mid, "—"),
                "parcial1": None,
                "parcial2": None,
                "practico": None,
                "final": None,
            }
        por_materia[mid][p.tipo] = float(p.valor)

    result = []
    for mid, data in por_materia.items():
        scores = {
            "parcial1": data.get("parcial1"),
            "parcial2": data.get("parcial2"),
            "practico": data.get("practico"),
            "final": data.get("final"),
        }
        prom = calcular_promedio_final(scores)
        result.append({**data, "promedio": prom})

    return result


@router.get("/mi-asistencia")
def mi_asistencia(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    user_id = current_user.user_id
    asistencias = (
        db.query(models.asistencia.Asistencia)
        .filter(models.asistencia.Asistencia.user_id == user_id)
        .all()
    )

    por_materia: dict[int, dict] = {}
    for a in asistencias:
        mid = a.materia_id
        if mid is None:
            continue
        if mid not in por_materia:
            por_materia[mid] = {"total": 0, "presentes": 0}
        por_materia[mid]["total"] += 1
        if a.presente:
            por_materia[mid]["presentes"] += 1

    materias = db.query(models.materia.Materia).all()
    mat_map = {m.id: m.nombre for m in materias}

    result = []
    for mid, data in por_materia.items():
        pct = round((data["presentes"] / data["total"]) * 100, 1)
        result.append(
            {
                "materia_id": mid,
                "materia_nombre": mat_map.get(mid, "—"),
                "total_clases": data["total"],
                "presentes": data["presentes"],
                "porcentaje": pct,
            }
        )

    return result


@router.get("/dashboard")
def dashboard(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    """
    Endpoint agregado para el dashboard móvil.

    Retorna en UNA sola llamada todo lo que la pantalla principal necesita:
    - perfil del usuario (user)
    - resumen académico (resumen)
    - próximo evento / eventos cercanos (proximoEvento, eventosCercanos)
    - saldo de cuenta (cuentaSaldoPendiente, etc.)
    - regularidad activa (regularidadActiva)

    Esto reemplaza los 4 requests paralelos que hacía antes el mobile.
    """
    user_id = current_user.user_id

    # Perfil
    user = (
        db.query(models.user.User)
        .filter(models.user.User.id == user_id)
        .first()
    )

    # Resumen
    notas_data = mis_notas(db, current_user) or []
    asistencias_data = mi_asistencia(db, current_user) or []
    promedios = [n.get("promedio") for n in notas_data if n.get("promedio") is not None]
    prom_general = round(sum(promedios) / len(promedios), 2) if promedios else None

    resumen = {
        "alumno": {
            "id": user.id,
            "nombre": user.nombre,
            "username": user.username,
            "email": user.email,
            "es_becado": user.es_becado,
        }
        if user
        else None,
        "cantidad_materias": len(notas_data),
        "promedio_general": prom_general,
        "notas": notas_data,
        "asistencia": asistencias_data,
    }

    # Eventos próximos (30 días)
    hoy = date.today()
    hasta = hoy + timedelta(days=30)
    eventos = (
        db.query(evento_calendario.EventoCalendario)
        .filter(
            evento_calendario.EventoCalendario.fecha >= hoy,
            evento_calendario.EventoCalendario.fecha <= hasta,
        )
        .order_by(evento_calendario.EventoCalendario.fecha.asc())
        .all()
    )
    eventos_cercanos = [
        {
            "id": e.id,
            "titulo": e.titulo,
            "tipo": e.tipo,
            "fecha": e.fecha.isoformat() if e.fecha else None,
            "fecha_fin": e.fecha_fin.isoformat() if e.fecha_fin else None,
            "materia_id": e.materia_id,
            "carrera_id": e.carrera_id,
            "descripcion": e.descripcion,
            "anio": e.anio,
            "semestre": e.semestre,
            "archivo_pdf": e.archivo_pdf,
            "creado_por": e.creado_por,
        }
        for e in eventos
    ]

    # Próximo evento relevante (parcial, final, entrega)
    relevantes = [e for e in eventos if e.tipo in ("parcial", "final", "entrega")]
    proximo = relevantes[0] if relevantes else (eventos[0] if eventos else None)
    proximo_evento = None
    if proximo:
        proximo_evento = {
            "id": proximo.id,
            "titulo": proximo.titulo,
            "tipo": proximo.tipo,
            "fecha": proximo.fecha.isoformat() if proximo.fecha else None,
            "fecha_fin": proximo.fecha_fin.isoformat() if proximo.fecha_fin else None,
            "materia_id": proximo.materia_id,
            "carrera_id": proximo.carrera_id,
            "descripcion": proximo.descripcion,
            "anio": proximo.anio,
            "semestre": proximo.semestre,
            "archivo_pdf": proximo.archivo_pdf,
            "creado_por": proximo.creado_por,
        }

    # Cuenta: saldos de cuotas
    cuenta_saldo_pendiente = 0.0
    cuenta_saldo_vencido = 0.0
    cuenta_pagado = 0.0
    cuenta_hay_cuotas = False

    try:
        cuotas = (
            db.query(models.financiero.Cuota)
            .filter(models.financiero.Cuota.alumno_id == user_id)
            .all()
        )
        if cuotas:
            cuenta_hay_cuotas = True
            for c in cuotas:
                monto = float(c.monto_a_pagar) if c.monto_a_pagar else 0
                if c.estado == "pagada":
                    cuenta_pagado += monto
                elif c.estado == "vencido":
                    cuenta_saldo_vencido += monto
                elif c.estado == "pendiente":
                    cuenta_saldo_pendiente += monto
    except Exception:
        pass  # Si no hay tabla o modelo, ignorar silenciosamente

    # Regularidad activa: asistencia promedio >= 70%
    asistencias_lista = asistencias_data or []
    if asistencias_lista:
        regularidad = all(
            (a.get("porcentaje") or 100) >= 70 for a in asistencias_lista
        )
    else:
        regularidad = True

    # Perfil del usuario en formato UserInfo
    user_out = None
    if user:
        user_out = {
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "nombre": user.nombre,
            "email": user.email,
            "carrera_id": user.carrera_id,
            "es_becado": user.es_becado,
            "foto_url": obtener_url_firmada(user.foto_url) if user.foto_url else None,
        }
        # Intentar obtener nombre de carrera y semestre
        if user.carrera_id:
            carrera = (
                db.query(models.carrera.Carrera)
                .filter(models.carrera.Carrera.id == user.carrera_id)
                .first()
            )
            if carrera:
                user_out["carrera_nombre"] = carrera.nombre
            else:
                user_out["carrera_nombre"] = None
        else:
            user_out["carrera_nombre"] = None
        user_out["semestre"] = None  # backend no expone semestre actual hoy

    return {
        "user": user_out,
        "resumen": resumen,
        "proximoEvento": proximo_evento,
        "eventosCercanos": eventos_cercanos,
        "cuentaSaldoPendiente": cuenta_saldo_pendiente,
        "cuentaSaldoVencido": cuenta_saldo_vencido,
        "cuentaPagado": cuenta_pagado,
        "cuentaHayCuotas": cuenta_hay_cuotas,
        "regularidadActiva": regularidad,
    }


@router.get("/mi-resumen")
def mi_resumen(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    user_id = current_user.user_id
    notas = mis_notas(db, current_user) or []
    asistencia = mi_asistencia(db, current_user) or []
    user = db.query(models.user.User).filter(models.user.User.id == user_id).first()

    promedios = [n.get("promedio") for n in notas if n.get("promedio") is not None]
    prom_general = round(sum(promedios) / len(promedios), 2) if promedios else None

    return {
        "alumno": {
            "id": user.id,
            "nombre": user.nombre,
            "username": user.username,
            "email": user.email,
            "es_becado": user.es_becado,
        }
        if user
        else None,
        "cantidad_materias": len(notas),
        "promedio_general": prom_general,
        "notas": notas,
        "asistencia": asistencia,
    }
