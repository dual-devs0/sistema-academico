from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app import models, schemas, database
from app.dependencias import get_current_user
from app.email_utils import send_new_grade_email_bg
from app.services.autorizacion import es_profesor_de_materia

router = APIRouter(prefix="/puntajes", tags=["puntajes"])

PESOS = {"parcial1": 0.25, "parcial2": 0.25, "practico": 0.20, "final": 0.30}


def _oferta_activa_id(db: Session, materia_id: int) -> int | None:
    oferta = db.query(models.oferta_materia.OfertaMateria).filter(
        models.oferta_materia.OfertaMateria.materia_id == materia_id,
        models.oferta_materia.OfertaMateria.activa == True,  # noqa: E712
    ).first()
    return oferta.id if oferta else None


def _get_puntajes_por_materia(db: Session, materia_id: int):
    """Retorna todos los puntajes de la oferta activa de una materia con datos del alumno."""
    oferta_id = _oferta_activa_id(db, materia_id)
    if oferta_id is None:
        return []
    return (
        db.query(
            models.puntaje.Puntaje,
            models.user.User.nombre,
            models.user.User.username,
        )
        .join(models.user.User, models.puntaje.Puntaje.user_id == models.user.User.id)
        .filter(models.puntaje.Puntaje.oferta_materia_id == oferta_id)
        .all()
    )


def _calcular_promedio_final(notas: dict[str, float | None]) -> float | None:
    """
    Calcula promedio ponderado.
    Si falta alguna nota se calcula con las disponibles (proporcional).
    """
    existentes = {k: v for k, v in notas.items() if v is not None}
    if not existentes:
        return None
    peso_total = sum(PESOS[k] for k in existentes)
    if peso_total == 0:
        return None
    ponderado = sum(PESOS[k] * v for k, v in existentes.items())
    return round(ponderado / peso_total, 2)


@router.post("/", response_model=schemas.puntaje.PuntajeOut)
def create_puntaje(
    puntaje: schemas.puntaje.PuntajeCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    if current_user["role"] not in ("admin", "profesor"):
        raise HTTPException(status_code=403, detail="No autorizado")
    user = db.query(models.user.User).filter(models.user.User.id == current_user["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    # Verify profesor teaches this materia (unless admin)
    if current_user["role"] == "profesor":
        materia = db.query(models.materia.Materia).filter(models.materia.Materia.id == puntaje.materia_id).first()
        if not materia:
            raise HTTPException(status_code=404, detail="Materia no encontrada")
        if not es_profesor_de_materia(db, puntaje.materia_id, current_user["user_id"]):
            raise HTTPException(status_code=403, detail="No sos el profesor titular de esta materia")
    oferta_id = _oferta_activa_id(db, puntaje.materia_id)
    if oferta_id is None:
        raise HTTPException(status_code=404, detail="No hay oferta activa para esta materia")
    # Check for duplicate grade type
    existing = db.query(models.puntaje.Puntaje).filter(
        models.puntaje.Puntaje.user_id == puntaje.user_id,
        models.puntaje.Puntaje.oferta_materia_id == oferta_id,
        models.puntaje.Puntaje.tipo == puntaje.tipo,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Ya existe una nota de tipo '{puntaje.tipo}' para este alumno en esta materia")
    new_puntaje = models.puntaje.Puntaje(
        user_id=puntaje.user_id,
        oferta_materia_id=oferta_id,
        tipo=puntaje.tipo,
        valor=puntaje.valor,
        editado_por=user.id,
    )
    db.add(new_puntaje)
    db.commit()
    db.refresh(new_puntaje)

    target = db.query(models.user.User).filter(models.user.User.id == puntaje.user_id).first()
    materia = db.query(models.materia.Materia).filter(models.materia.Materia.id == puntaje.materia_id).first()
    if target and target.email and materia:
        send_new_grade_email_bg(background_tasks, target.email, target.nombre or target.username, materia.nombre, puntaje.tipo, puntaje.valor)

    return new_puntaje


@router.get("/", response_model=list[schemas.puntaje.PuntajeOut])
def list_puntajes(
    user_id: Optional[int] = Query(None),
    materia_id: Optional[int] = Query(None),
    tipo: Optional[str] = Query(None),
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    query = db.query(models.puntaje.Puntaje)
    if current_user["role"] == "alumno":
        query = query.filter(models.puntaje.Puntaje.user_id == current_user["user_id"])
    else:
        if user_id is not None:
            query = query.filter(models.puntaje.Puntaje.user_id == user_id)
    if materia_id is not None:
        oferta_id = _oferta_activa_id(db, materia_id)
        query = query.filter(models.puntaje.Puntaje.oferta_materia_id == oferta_id)
    if tipo is not None:
        query = query.filter(models.puntaje.Puntaje.tipo == tipo)
    return query.all()


@router.put("/{puntaje_id}", response_model=schemas.puntaje.PuntajeOut)
def update_puntaje(
    puntaje_id: int,
    puntaje: schemas.puntaje.PuntajeCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    if current_user["role"] not in ("admin", "profesor"):
        raise HTTPException(status_code=403, detail="No autorizado")
    user = db.query(models.user.User).filter(models.user.User.id == current_user["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    existing = db.query(models.puntaje.Puntaje).filter(models.puntaje.Puntaje.id == puntaje_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Puntaje no encontrado")
    # Verify profesor owns this materia
    if current_user["role"] == "profesor":
        if not es_profesor_de_materia(db, existing.materia_id, current_user["user_id"]):
            raise HTTPException(status_code=403, detail="No sos el profesor titular de esta materia")
    data = puntaje.model_dump()
    nueva_materia_id = data.pop("materia_id")
    if nueva_materia_id != existing.materia_id:
        nuevo_oferta_id = _oferta_activa_id(db, nueva_materia_id)
        if nuevo_oferta_id is None:
            raise HTTPException(status_code=404, detail="No hay oferta activa para esta materia")
        existing.oferta_materia_id = nuevo_oferta_id
    for key, value in data.items():
        setattr(existing, key, value)
    existing.editado_por = user.id
    existing.editado_en = __import__("datetime").datetime.utcnow()
    db.commit()
    db.refresh(existing)

    target = db.query(models.user.User).filter(models.user.User.id == existing.user_id).first()
    materia = db.query(models.materia.Materia).filter(models.materia.Materia.id == existing.materia_id).first()
    if target and target.email and materia:
        send_new_grade_email_bg(background_tasks, target.email, target.nombre or target.username, materia.nombre, existing.tipo, existing.valor)

    return existing

@router.delete("/{puntaje_id}")
def delete_puntaje(
    puntaje_id: int,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    if current_user["role"] not in ("admin", "profesor"):
        raise HTTPException(status_code=403, detail="No autorizado")
    existing = db.query(models.puntaje.Puntaje).filter(models.puntaje.Puntaje.id == puntaje_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Puntaje no encontrado")
    # Verify profesor owns this materia
    if current_user["role"] == "profesor":
        if not es_profesor_de_materia(db, existing.materia_id, current_user["user_id"]):
            raise HTTPException(status_code=403, detail="No sos el profesor titular de esta materia")
    db.delete(existing)
    db.commit()
    return {"detail": "Puntaje eliminado"}


@router.get("/materia/{materia_id}", response_model=list[schemas.puntaje.PromedioFinalOut])
def puntajes_por_materia(
    materia_id: int,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    """Notas de todos los alumnos de una materia."""
    if current_user["role"] not in ("admin", "profesor"):
        raise HTTPException(status_code=403, detail="No autorizado")
    # Verify profesor owns this materia
    if current_user["role"] == "profesor":
        if not es_profesor_de_materia(db, materia_id, current_user["user_id"]):
            raise HTTPException(status_code=403, detail="No sos el profesor titular de esta materia")

    rows = _get_puntajes_por_materia(db, materia_id)
    alumno_map: dict[int, dict] = {}
    for p, nombre, username in rows:
        if p.user_id not in alumno_map:
            alumno_map[p.user_id] = {"nombre": nombre, "username": username, "parcial1": None, "parcial2": None, "practico": None, "final": None}
        alumno_map[p.user_id][p.tipo] = float(p.valor)

    result = []
    for uid, data in alumno_map.items():
        prom = _calcular_promedio_final(data)
        result.append(schemas.puntaje.PromedioFinalOut(user_id=uid, **data, promedio_final=prom))

    return result


@router.get("/alumno/{user_id}/promedio-final", response_model=schemas.puntaje.PromedioFinalOut)
def promedio_final_alumno(
    user_id: int,
    materia_id: Optional[int] = Query(None),
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    """Promedio ponderado final de un alumno. Si materia_id es None, por cada materia."""
    if current_user["role"] == "alumno" and current_user["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="No autorizado")

    query = db.query(models.puntaje.Puntaje).filter(models.puntaje.Puntaje.user_id == user_id)
    if materia_id is not None:
        oferta_id = _oferta_activa_id(db, materia_id)
        query = query.filter(models.puntaje.Puntaje.oferta_materia_id == oferta_id)
    puntajes = query.all()

    notas = {"parcial1": None, "parcial2": None, "practico": None, "final": None}
    for p in puntajes:
        notas[p.tipo] = float(p.valor)

    alumno = db.query(models.user.User).filter(models.user.User.id == user_id).first()
    nombre = alumno.nombre if alumno else ""
    prom = _calcular_promedio_final(notas)

    return schemas.puntaje.PromedioFinalOut(user_id=user_id, nombre=nombre, **notas, promedio_final=prom)


@router.get("/materia/{materia_id}/exportar", response_model=schemas.puntaje.ExportacionMateriaOut)
def exportar_materia(
    materia_id: int,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    """Datos de una materia para exportar (notas + asistencia)."""
    if current_user["role"] not in ("admin", "profesor"):
        raise HTTPException(status_code=403, detail="No autorizado")
    # Verify profesor owns this materia
    if current_user["role"] == "profesor":
        if not es_profesor_de_materia(db, materia_id, current_user["user_id"]):
            raise HTTPException(status_code=403, detail="No sos el profesor titular de esta materia")

    materia = db.query(models.materia.Materia).filter(models.materia.Materia.id == materia_id).first()
    if not materia:
        raise HTTPException(status_code=404, detail="Materia no encontrada")

    rows = _get_puntajes_por_materia(db, materia_id)
    alumno_map: dict[int, dict] = {}
    for p, nombre, username in rows:
        if p.user_id not in alumno_map:
            alumno_map[p.user_id] = {"nombre": nombre, "username": username, "parcial1": None, "parcial2": None, "practico": None, "final": None}
        alumno_map[p.user_id][p.tipo] = float(p.valor)

    asistencia_oferta_id = _oferta_activa_id(db, materia_id)
    alumnos_out = []
    for uid, data in alumno_map.items():
        prom = _calcular_promedio_final(data)
        total_asist = db.query(models.asistencia.Asistencia).filter(
            models.asistencia.Asistencia.user_id == uid,
            models.asistencia.Asistencia.oferta_materia_id == asistencia_oferta_id,
        ).count()
        presentes = db.query(models.asistencia.Asistencia).filter(
            models.asistencia.Asistencia.user_id == uid,
            models.asistencia.Asistencia.oferta_materia_id == asistencia_oferta_id,
            models.asistencia.Asistencia.presente == True,
        ).count()
        asist_pct = round((presentes / total_asist) * 100, 1) if total_asist > 0 else None

        alumnos_out.append(schemas.puntaje.AlumnoExportRow(
            user_id=uid, **data, promedio=prom, asistencia_pct=asist_pct,
        ))

    return schemas.puntaje.ExportacionMateriaOut(
        materia_id=materia_id, materia_nombre=materia.nombre, alumnos=alumnos_out,
    )


@router.get("/materia/{materia_id}/estadisticas")
def estadisticas_materia(
    materia_id: int,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    """Promedio del grupo, distribuci\u00f3n de notas, aprobados/riesgo."""
    if current_user["role"] not in ("admin", "profesor"):
        raise HTTPException(status_code=403, detail="No autorizado")
    # Verify profesor owns this materia
    if current_user["role"] == "profesor":
        if not es_profesor_de_materia(db, materia_id, current_user["user_id"]):
            raise HTTPException(status_code=403, detail="No sos el profesor titular de esta materia")

    oferta_id = _oferta_activa_id(db, materia_id)
    puntajes = db.query(models.puntaje.Puntaje).filter(models.puntaje.Puntaje.oferta_materia_id == oferta_id).all() if oferta_id else []
    if not puntajes:
        return {"materia_id": materia_id, "total_alumnos": 0, "promedio_grupo": 0, "distribucion": {}, "aprobados": 0, "en_riesgo": 0}

    valores = [float(p.valor) for p in puntajes]
    promedio = round(sum(valores) / len(valores), 2)

    distribucion = {
        "0-3": sum(1 for v in valores if v < 3),
        "3-5": sum(1 for v in valores if 3 <= v < 5),
        "5-6": sum(1 for v in valores if 5 <= v < 6),
        "6-7": sum(1 for v in valores if 6 <= v < 7),
        "7-9": sum(1 for v in valores if 7 <= v < 9),
        "9-10": sum(1 for v in valores if 9 <= v <= 10),
    }

    alumnos_unicos = set(p.user_id for p in puntajes)
    aprobados = 0
    en_riesgo = 0
    for uid in alumnos_unicos:
        pts = [float(p.valor) for p in puntajes if p.user_id == uid]
        if pts:
            avg = sum(pts) / len(pts)
            if avg >= 6:
                aprobados += 1
            else:
                en_riesgo += 1

    return {
        "materia_id": materia_id,
        "total_alumnos": len(alumnos_unicos),
        "total_notas": len(puntajes),
        "promedio_grupo": promedio,
        "nota_maxima": round(max(valores), 2),
        "nota_minima": round(min(valores), 2),
        "distribucion": distribucion,
        "aprobados": aprobados,
        "en_riesgo": en_riesgo,
    }


# Keep this route last to avoid catching other /materia/ routes
@router.get("/{user_id}/promedio")
def promedio_puntajes(
    user_id: int,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    if current_user["role"] != "admin" and current_user["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    puntajes = db.query(models.puntaje.Puntaje).filter(models.puntaje.Puntaje.user_id == user_id).all()
    if not puntajes:
        return {"promedio": 0}
    total = sum(float(p.valor) for p in puntajes)
    return {"promedio": round(total / len(puntajes), 2)}
