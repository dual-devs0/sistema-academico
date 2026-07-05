from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
from app import models, schemas, database
from app.dependencias import get_current_user


router = APIRouter(prefix="/asistencias", tags=["asistencias"])


def _verificar_profesor_materia(db: Session, materia_id: int, current_user: dict):
    """Raises 403 if current_user is not the subject's teacher nor admin."""
    if current_user["role"] == "admin":
        return
    materia = db.query(models.materia.Materia).filter(models.materia.Materia.id == materia_id).first()
    if not materia:
        raise HTTPException(status_code=404, detail="Materia no encontrada")
    if materia.profesor_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="No sos el profesor titular de esta materia")


@router.post("/", response_model=schemas.asistencia.AsistenciaOut)
def create_asistencia(
    asistencia: schemas.asistencia.AsistenciaCreate,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    _verificar_profesor_materia(db, asistencia.materia_id, current_user)
    # Check for existing attendance record
    existing = db.query(models.asistencia.Asistencia).filter(
        models.asistencia.Asistencia.user_id == asistencia.user_id,
        models.asistencia.Asistencia.materia_id == asistencia.materia_id,
        models.asistencia.Asistencia.fecha == asistencia.fecha,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Ya existe un registro de asistencia para este alumno en esta fecha")
    # Snapshot es_becado from user
    alumno = db.query(models.user.User).filter(models.user.User.id == asistencia.user_id).first()
    es_becado = alumno.es_becado if alumno else False
    new_asistencia = models.asistencia.Asistencia(
        user_id=asistencia.user_id,
        materia_id=asistencia.materia_id,
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
    current_user = Depends(get_current_user),
):
    query = db.query(models.asistencia.Asistencia)
    # Alumno solo ve sus propias asistencias
    if current_user["role"] == "alumno":
        query = query.filter(models.asistencia.Asistencia.user_id == current_user["user_id"])
    else:
        if user_id is not None:
            query = query.filter(models.asistencia.Asistencia.user_id == user_id)
    if materia_id is not None:
        query = query.filter(models.asistencia.Asistencia.materia_id == materia_id)
    if fecha is not None:
        query = query.filter(models.asistencia.Asistencia.fecha == fecha)
    return query.all()


@router.put("/{asistencia_id}", response_model=schemas.asistencia.AsistenciaOut)
def update_asistencia(
    asistencia_id: int,
    asistencia: schemas.asistencia.AsistenciaCreate,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    existing = db.query(models.asistencia.Asistencia).filter(models.asistencia.Asistencia.id == asistencia_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Asistencia no encontrada")
    _verificar_profesor_materia(db, existing.materia_id, current_user)
    for key, value in asistencia.model_dump().items():
        setattr(existing, key, value)
    db.commit()
    db.refresh(existing)
    return existing


@router.delete("/{asistencia_id}")
def delete_asistencia(
    asistencia_id: int,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    existing = db.query(models.asistencia.Asistencia).filter(models.asistencia.Asistencia.id == asistencia_id).first()
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
    current_user = Depends(get_current_user),
):
    """Carga/actualiza asistencia de toda una clase en un solo request."""
    _verificar_profesor_materia(db, lote.materia_id, current_user)
    guardados = 0
    actualizados = 0

    for reg in lote.registros:
        alumno = db.query(models.user.User).filter(models.user.User.id == reg.user_id).first()
        es_becado = alumno.es_becado if alumno else False

        existing = (
            db.query(models.asistencia.Asistencia)
            .filter(
                models.asistencia.Asistencia.user_id == reg.user_id,
                models.asistencia.Asistencia.materia_id == lote.materia_id,
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
                materia_id=lote.materia_id,
                fecha=lote.fecha,
                presente=reg.presente,
                es_becado=es_becado,
            )
            db.add(nueva)
            guardados += 1

    db.commit()
    return schemas.asistencia.AsistenciaLoteResponse(guardados=guardados, actualizados=actualizados, total=guardados + actualizados)


@router.get("/materia/{materia_id}/alumnos", response_model=list[schemas.asistencia.AlumnoAsistenciaOut])
def alumnos_asistencia(
    materia_id: int,
    becado: Optional[bool] = Query(None),
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    """Retorna alumnos matriculados con su porcentaje de asistencia."""
    if current_user["role"] not in ("admin", "profesor"):
        raise HTTPException(status_code=403, detail="No autorizado")

    inscripciones = (
        db.query(models.inscripcion.Inscripcion)
        .filter(models.inscripcion.Inscripcion.materia_id == materia_id)
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
                models.asistencia.Asistencia.materia_id == materia_id,
            )
            .count()
        )
        presentes = (
            db.query(models.asistencia.Asistencia)
            .filter(
                models.asistencia.Asistencia.user_id == a.id,
                models.asistencia.Asistencia.materia_id == materia_id,
                models.asistencia.Asistencia.presente == True,
            )
            .count()
        )
        pct = round((presentes / total) * 100, 1) if total > 0 else 0.0
        result.append(
            schemas.asistencia.AlumnoAsistenciaOut(
                user_id=a.id, nombre=a.nombre, username=a.username,
                es_becado=a.es_becado, total_clases=total, presentes=presentes, porcentaje=pct,
            )
        )

    return result


@router.get("/alumno/{user_id}/porcentaje")
def porcentaje_asistencia_alumno(
    user_id: int,
    materia_id: Optional[int] = Query(None),
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    """Porcentaje de asistencia de un alumno (global o por materia)."""
    if current_user["role"] == "alumno" and current_user["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="No autorizado")

    query = db.query(models.asistencia.Asistencia).filter(models.asistencia.Asistencia.user_id == user_id)
    if materia_id is not None:
        query = query.filter(models.asistencia.Asistencia.materia_id == materia_id)

    total = query.count()
    presentes = query.filter(models.asistencia.Asistencia.presente == True).count()
    return {
        "user_id": user_id,
        "materia_id": materia_id,
        "total_clases": total,
        "presentes": presentes,
        "porcentaje": round((presentes / total) * 100, 1) if total > 0 else 0.0,
    }


@router.get("/{materia_id}/resumen")
def resumen_asistencia(materia_id: int, db: Session = Depends(database.get_db), current_user = Depends(get_current_user)):
    total = db.query(models.asistencia.Asistencia).filter(
        models.asistencia.Asistencia.materia_id == materia_id
    ).count()
    presentes = db.query(models.asistencia.Asistencia).filter(
        models.asistencia.Asistencia.materia_id == materia_id,
        models.asistencia.Asistencia.presente == True
    ).count()
    if total == 0:
        return {"porcentaje": 0}
    return {"porcentaje": round((presentes / total) * 100, 2)}
