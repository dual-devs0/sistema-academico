
# ─── Módulo 4.2 — Endpoints nuevos ────────────────────────────────────────────

from app import models
from app import schemas
from app import database
from app import dependencies
from sqlalchemy import func
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile
from typing import Optional, List

def _verificar_titular_o_admin(materia_id: int, current_user: dict, db: Session) -> None:
    if current_user["role"] == "admin":
        return
    if current_user["role"] != "profesor":
        raise HTTPException(status_code=403, detail="Solo profesores y administradores pueden registrar asistencia")
    materia = db.query(models.materia.Materia).filter(
        models.materia.Materia.id == materia_id
    ).first()
    if not materia:
        raise HTTPException(status_code=404, detail="Materia no encontrada")
    if materia.profesor_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="No eres el profesor titular de esta materia")

@router.post("/lote", response_model=schemas.asistencia.AsistenciaLoteResponse, summary="Registrar asistencia de toda una clase en un único request")
def registrar_lote(payload: schemas.asistencia.AsistenciaLote, db: Session = Depends(database.get_db), current_user = Depends(get_current_user)):
    _verificar_titular_o_admin(payload.materia_id, current_user, db)
    materia = db.query(models.materia.Materia).filter(models.materia.Materia.id == payload.materia_id).first()
    if not materia:
        raise HTTPException(status_code=404, detail="Materia no encontrada")
    ids_solicitados = [r.user_id for r in payload.registros]
    alumnos_map: dict[int, models.user.User] = {
        u.id: u for u in db.query(models.user.User).filter(models.user.User.id.in_(ids_solicitados)).all()
    }
    inscripciones = db.query(models.inscripcion.Inscripcion.alumno_id).filter(
        models.inscripcion.Inscripcion.materia_id == payload.materia_id,
        models.inscripcion.Inscripcion.alumno_id.in_(ids_solicitados),
    ).all()
    ids_inscriptos = {row.alumno_id for row in inscripciones}
    ids_no_inscriptos = set(ids_solicitados) - ids_inscriptos
    if ids_no_inscriptos:
        raise HTTPException(status_code=400, detail=f"Los siguientes alumnos no están matriculados en esta materia: {sorted(ids_no_inscriptos)}")
    existentes_map: dict[int, models.asistencia.Asistencia] = {
        a.user_id: a for a in db.query(models.asistencia.Asistencia).filter(
            models.asistencia.Asistencia.materia_id == payload.materia_id,
            models.asistencia.Asistencia.fecha == payload.fecha,
            models.asistencia.Asistencia.user_id.in_(ids_solicitados),
        ).all()
    }
    creados = 0
    actualizados = 0
    for registro in payload.registros:
        alumno = alumnos_map.get(registro.user_id)
        if not alumno:
            raise HTTPException(status_code=404, detail=f"Alumno con id {registro.user_id} no encontrado")
        es_becado_snapshot = bool(alumno.es_becado)
        if registro.user_id in existentes_map:
            existente = existentes_map[registro.user_id]
            existente.presente = registro.presente
            existente.es_becado = es_becado_snapshot
            actualizados += 1
        else:
            nueva = models.asistencia.Asistencia(
                user_id=registro.user_id, materia_id=payload.materia_id,
                fecha=payload.fecha, presente=registro.presente, es_becado=es_becado_snapshot,
            )
            db.add(nueva)
            creados += 1
    db.commit()
    return schemas.asistencia.AsistenciaLoteResponse(creados=creados, actualizados=actualizados, total=creados + actualizados)

@router.get("/materia/{materia_id}/alumnos", response_model=list[schemas.asistencia.AlumnoAsistenciaOut], summary="Obtener alumnos matriculados con su porcentaje de asistencia")
def alumnos_con_asistencia(materia_id: int, becado: Optional[bool] = Query(None, description="Filtrar por condición de beca"), db: Session = Depends(database.get_db), current_user = Depends(get_current_user)):
    materia = db.query(models.materia.Materia).filter(models.materia.Materia.id == materia_id).first()
    if not materia:
        raise HTTPException(status_code=404, detail="Materia no encontrada")
    if current_user["role"] not in ("admin", "profesor"):
        inscripto = db.query(models.inscripcion.Inscripcion).filter(
            models.inscripcion.Inscripcion.materia_id == materia_id,
            models.inscripcion.Inscripcion.alumno_id == current_user["user_id"],
        ).first()
        if not inscripto:
            raise HTTPException(status_code=403, detail="No estás inscripto en esta materia")
    elif current_user["role"] == "profesor" and materia.profesor_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="No eres el profesor titular de esta materia")
    inscripciones = db.query(models.inscripcion.Inscripcion).filter(models.inscripcion.Inscripcion.materia_id == materia_id).all()
    alumno_ids = [i.alumno_id for i in inscripciones]
    query_alumnos = db.query(models.user.User).filter(models.user.User.id.in_(alumno_ids))
    if becado is not None:
        query_alumnos = query_alumnos.filter(models.user.User.es_becado == becado)
    alumnos = query_alumnos.all()
    total_clases = db.query(func.count(func.distinct(models.asistencia.Asistencia.fecha))).filter(models.asistencia.Asistencia.materia_id == materia_id).scalar() or 0
    presencias_rows = db.query(
        models.asistencia.Asistencia.user_id, func.count(models.asistencia.Asistencia.id).label("presentes"),
    ).filter(
        models.asistencia.Asistencia.materia_id == materia_id,
        models.asistencia.Asistencia.presente == True,
        models.asistencia.Asistencia.user_id.in_(alumno_ids),
    ).group_by(models.asistencia.Asistencia.user_id).all()
    presencias_map: dict[int, int] = {row.user_id: row.presentes for row in presencias_rows}
    resultado = []
    for alumno in alumnos:
        presentes = presencias_map.get(alumno.id, 0)
        porcentaje = round((presentes / total_clases) * 100, 2) if total_clases > 0 else 0.0
        resultado.append(schemas.asistencia.AlumnoAsistenciaOut(
            user_id=alumno.id, nombre=alumno.nombre, username=alumno.username,
            es_becado=bool(alumno.es_becado), materia_id=materia_id,
            nombre_materia=materia.nombre, total_clases=total_clases,
            presentes=presentes, porcentaje=porcentaje,
        ))
    return resultado

@router.get("/alumno/{user_id}/porcentaje", response_model=list[schemas.asistencia.PorcentajeGlobalOut], summary="Porcentaje de asistencia de un alumno en todas sus materias")
def porcentaje_asistencia_alumno(user_id: int, materia_id: Optional[int] = Query(None, description="Filtrar por materia específica"), db: Session = Depends(database.get_db), current_user = Depends(get_current_user)):
    if current_user["role"] == "alumno" and current_user["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Solo podés consultar tu propia asistencia")
    alumno = db.query(models.user.User).filter(models.user.User.id == user_id).first()
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")
    if alumno.role != "alumno":
        raise HTTPException(status_code=400, detail="El usuario indicado no es un alumno")
    inscripciones_q = db.query(models.inscripcion.Inscripcion).filter(models.inscripcion.Inscripcion.alumno_id == user_id)
    if materia_id is not None:
        inscripciones_q = inscripciones_q.filter(models.inscripcion.Inscripcion.materia_id == materia_id)
    inscripciones = inscripciones_q.all()
    if not inscripciones:
        return []
    materia_ids = [i.materia_id for i in inscripciones]
    if current_user["role"] == "profesor":
        sus_materias = {m.id for m in db.query(models.materia.Materia).filter(
            models.materia.Materia.profesor_id == current_user["user_id"],
            models.materia.Materia.id.in_(materia_ids),
        ).all()}
        materia_ids = [mid for mid in materia_ids if mid in sus_materias]
        if not materia_ids:
            raise HTTPException(status_code=403, detail="Este alumno no está matriculado en ninguna de tus materias")
    materias_map: dict[int, models.materia.Materia] = {m.id: m for m in db.query(models.materia.Materia).filter(models.materia.Materia.id.in_(materia_ids)).all()}
    resultado = []
    for mid in materia_ids:
        materia = materias_map.get(mid)
        if not materia: continue
        total_clases = db.query(func.count(func.distinct(models.asistencia.Asistencia.fecha))).filter(models.asistencia.Asistencia.materia_id == mid).scalar() or 0
        presentes = db.query(func.count(models.asistencia.Asistencia.id)).filter(
            models.asistencia.Asistencia.materia_id == mid,
            models.asistencia.Asistencia.user_id == user_id,
            models.asistencia.Asistencia.presente == True,
        ).scalar() or 0
        porcentaje = round((presentes / total_clases) * 100, 2) if total_clases > 0 else 0.0
        resultado.append(schemas.asistencia.PorcentajeGlobalOut(
            materia_id=mid, nombre_materia=materia.nombre, total_clases=total_clases,
            presentes=presentes, porcentaje=porcentaje,
        ))
    return resultado
