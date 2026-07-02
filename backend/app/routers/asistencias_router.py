from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import date
from app import models, schemas, database
from app.dependencias import get_current_user

router = APIRouter(prefix="/asistencias", tags=["asistencias"])

# ─── Helpers internos ──────────────────────────────────────────────────────────
def _verificar_titular_o_admin(materia_id: int, current_user: dict, db: Session) -> None:
    """Lanza 403 si el usuario no es admin ni el profesor titular de la materia."""
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
# ─── CRUD básico (existente, mejorado) ────────────────────────────────────────
@router.post("/", response_model=schemas.asistencia.AsistenciaOut, summary="Registrar asistencia individual")
def create_asistencia(
    asistencia: schemas.asistencia.AsistenciaCreate,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user)
):
    _verificar_titular_o_admin(asistencia.materia_id, current_user, db)
    # Snapshot de es_becado desde el alumno
    alumno = db.query(models.user.User).filter(models.user.User.id == asistencia.user_id).first()
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")
    new_asistencia = models.asistencia.Asistencia(
        user_id=asistencia.user_id,
        materia_id=asistencia.materia_id,
        fecha=asistencia.fecha,
        presente=asistencia.presente,
        es_becado=alumno.es_becado if alumno.es_becado is not None else False,
    )
    db.add(new_asistencia)
    db.commit()
    db.refresh(new_asistencia)
    return new_asistencia


@router.get("/", response_model=list[schemas.asistencia.AsistenciaOut], summary="Listar asistencias con filtros")
def list_asistencias(
    materia_id: Optional[int] = Query(None),
    user_id: Optional[int] = Query(None),
    fecha: Optional[date] = Query(None),
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user)
):
    # Un alumno solo puede ver sus propias asistencias
    if current_user["role"] == "alumno":
        user_id = current_user["user_id"]
    query = db.query(models.asistencia.Asistencia)
    if materia_id is not None:
        query = query.filter(models.asistencia.Asistencia.materia_id == materia_id)
    if user_id is not None:
        query = query.filter(models.asistencia.Asistencia.user_id == user_id)
    if fecha is not None:
        query = query.filter(models.asistencia.Asistencia.fecha == fecha)
    return query.all()

@router.put("/{asistencia_id}", response_model=schemas.asistencia.AsistenciaOut, summary="Actualizar asistencia individual")
def update_asistencia(
    asistencia_id: int,
    asistencia: schemas.asistencia.AsistenciaCreate,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user)
):
    existing = db.query(models.asistencia.Asistencia).filter(
        models.asistencia.Asistencia.id == asistencia_id
    ).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Asistencia no encontrada")
    _verificar_titular_o_admin(existing.materia_id, current_user, db)
    for key, value in asistencia.model_dump().items():
        setattr(existing, key, value)
    db.commit()
    db.refresh(existing)
    return existing

@router.delete("/{asistencia_id}", summary="Eliminar asistencia")
def delete_asistencia(
    asistencia_id: int,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user)
):
    existing = db.query(models.asistencia.Asistencia).filter(
        models.asistencia.Asistencia.id == asistencia_id
    ).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Asistencia no encontrada")
    _verificar_titular_o_admin(existing.materia_id, current_user, db)
    db.delete(existing)
    db.commit()
    return {"detail": "Asistencia eliminada"}

# ─── Módulo 4.2 — Endpoints nuevos ────────────────────────────────────────────
@router.post(
    "/lote",
    response_model=schemas.asistencia.AsistenciaLoteResponse,
    summary="Registrar asistencia de toda una clase en un único request",
)
def registrar_lote(
    payload: schemas.asistencia.AsistenciaLote,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    """
    Registra o actualiza la asistencia de todos los alumnos de una materia
    para una fecha específica.  Si ya existe un registro para ese alumno
    en esa materia y fecha, se actualiza (upsert).  El campo `es_becado`
    se copia automáticamente desde el perfil del alumno (snapshot).
    Solo el profesor titular de la materia o un admin pueden usar este endpoint.
    """
    _verificar_titular_o_admin(payload.materia_id, current_user, db)
    # Verificar que la materia exista
    materia = db.query(models.materia.Materia).filter(
        models.materia.Materia.id == payload.materia_id
    ).first()
    if not materia:
        raise HTTPException(status_code=404, detail="Materia no encontrada")
    # Cargar todos los user_ids del lote de una sola vez para validar
    ids_solicitados = [r.user_id for r in payload.registros]
    alumnos_map: dict[int, models.user.User] = {
        u.id: u
        for u in db.query(models.user.User).filter(
            models.user.User.id.in_(ids_solicitados)
        ).all()
    }
    # Verificar inscripciones: todos los alumnos del lote deben estar matriculados
    inscripciones = db.query(models.inscripcion.Inscripcion.alumno_id).filter(
        models.inscripcion.Inscripcion.materia_id == payload.materia_id,
        models.inscripcion.Inscripcion.alumno_id.in_(ids_solicitados),
    ).all()
    ids_inscriptos = {row.alumno_id for row in inscripciones}
    ids_no_inscriptos = set(ids_solicitados) - ids_inscriptos
    if ids_no_inscriptos:
        raise HTTPException(
            status_code=400,
            detail=f"Los siguientes alumnos no están matriculados en esta materia: {sorted(ids_no_inscriptos)}",
        )
    # Cargar registros existentes para la fecha (para el upsert)
    existentes_map: dict[int, models.asistencia.Asistencia] = {
        a.user_id: a
        for a in db.query(models.asistencia.Asistencia).filter(
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
            # Actualizar
            existente = existentes_map[registro.user_id]
            existente.presente = registro.presente
            existente.es_becado = es_becado_snapshot
            actualizados += 1
        else:
            # Crear
            nueva = models.asistencia.Asistencia(
                user_id=registro.user_id,
                materia_id=payload.materia_id,
                fecha=payload.fecha,
                presente=registro.presente,
                es_becado=es_becado_snapshot,
            )
            db.add(nueva)
            creados += 1
    db.commit()
    return schemas.asistencia.AsistenciaLoteResponse(
        creados=creados,
        actualizados=actualizados,
        total=creados + actualizados,
    )
@router.get(
    "/materia/{materia_id}/alumnos",
    response_model=list[schemas.asistencia.AlumnoAsistenciaOut],
    summary="Obtener alumnos matriculados con su porcentaje de asistencia",
)
def alumnos_con_asistencia(
    materia_id: int,
    becado: Optional[bool] = Query(None, description="Filtrar por condición de beca: true=becados, false=no becados"),
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    """
    Retorna todos los alumnos inscriptos en la materia con su porcentaje de
    asistencia calculado. Soporta filtro ?becado=true|false.
    Solo el profesor titular, admin, o el propio alumno pueden acceder.
    """
    materia = db.query(models.materia.Materia).filter(
        models.materia.Materia.id == materia_id
    ).first()
    if not materia:
        raise HTTPException(status_code=404, detail="Materia no encontrada")
    # Permisos: admin, profesor titular, o cualquier alumno inscripto
    if current_user["role"] not in ("admin", "profesor"):
        # Verificar que el alumno esté inscripto
        inscripto = db.query(models.inscripcion.Inscripcion).filter(
            models.inscripcion.Inscripcion.materia_id == materia_id,
            models.inscripcion.Inscripcion.alumno_id == current_user["user_id"],
        ).first()
        if not inscripto:
            raise HTTPException(status_code=403, detail="No estás inscripto en esta materia")
    elif current_user["role"] == "profesor" and materia.profesor_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="No eres el profesor titular de esta materia")
    # Obtener alumnos inscriptos
    inscripciones = (
        db.query(models.inscripcion.Inscripcion)
        .filter(models.inscripcion.Inscripcion.materia_id == materia_id)
        .all()
    )
    alumno_ids = [i.alumno_id for i in inscripciones]
    # Cargar alumnos (con filtro de beca opcional)
    query_alumnos = db.query(models.user.User).filter(
        models.user.User.id.in_(alumno_ids)
    )
    if becado is not None:
        query_alumnos = query_alumnos.filter(models.user.User.es_becado == becado)
    alumnos = query_alumnos.all()
    # Total de clases distintas registradas para la materia
    total_clases = (
        db.query(func.count(func.distinct(models.asistencia.Asistencia.fecha)))
        .filter(models.asistencia.Asistencia.materia_id == materia_id)
        .scalar()
    ) or 0
    # Presencias por alumno
    presencias_rows = (
        db.query(
            models.asistencia.Asistencia.user_id,
            func.count(models.asistencia.Asistencia.id).label("presentes"),
        )
        .filter(
            models.asistencia.Asistencia.materia_id == materia_id,
            models.asistencia.Asistencia.presente == True,
            models.asistencia.Asistencia.user_id.in_(alumno_ids),
        )
        .group_by(models.asistencia.Asistencia.user_id)
        .all()
    )
    presencias_map: dict[int, int] = {row.user_id: row.presentes for row in presencias_rows}
    resultado = []
    for alumno in alumnos:
        presentes = presencias_map.get(alumno.id, 0)
        porcentaje = round((presentes / total_clases) * 100, 2) if total_clases > 0 else 0.0
        resultado.append(
            schemas.asistencia.AlumnoAsistenciaOut(
                user_id=alumno.id,
                nombre=alumno.nombre,
                username=alumno.username,
                es_becado=bool(alumno.es_becado),
                materia_id=materia_id,
                nombre_materia=materia.nombre,
                total_clases=total_clases,
                presentes=presentes,
                porcentaje=porcentaje,
            )
        )
    return resultado
@router.get(
    "/alumno/{user_id}/porcentaje",
    response_model=list[schemas.asistencia.PorcentajeGlobalOut],
    summary="Porcentaje de asistencia de un alumno en todas sus materias",
)
def porcentaje_asistencia_alumno(
    user_id: int,
    materia_id: Optional[int] = Query(None, description="Filtrar por materia específica"),
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    """
    Devuelve el porcentaje de asistencia de un alumno, desglosado por materia.
    Un alumno solo puede consultar sus propios datos; un profesor puede consultar
    alumnos de sus materias; un admin puede consultar cualquier alumno.
    """
    # Control de acceso
    if current_user["role"] == "alumno" and current_user["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Solo podés consultar tu propia asistencia")
    alumno = db.query(models.user.User).filter(models.user.User.id == user_id).first()
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")
    if alumno.role != "alumno":
        raise HTTPException(status_code=400, detail="El usuario indicado no es un alumno")
    # Materias en las que está inscripto
    inscripciones_q = db.query(models.inscripcion.Inscripcion).filter(
        models.inscripcion.Inscripcion.alumno_id == user_id
    )
    if materia_id is not None:
        inscripciones_q = inscripciones_q.filter(
            models.inscripcion.Inscripcion.materia_id == materia_id
        )
    inscripciones = inscripciones_q.all()
    if not inscripciones:
        return []
    materia_ids = [i.materia_id for i in inscripciones]
    # Si es profesor, verificar que solo consulte alumnos de SUS materias
    if current_user["role"] == "profesor":
        sus_materias = {
            m.id
            for m in db.query(models.materia.Materia).filter(
                models.materia.Materia.profesor_id == current_user["user_id"],
                models.materia.Materia.id.in_(materia_ids),
            ).all()
        }
        materia_ids = [mid for mid in materia_ids if mid in sus_materias]
        if not materia_ids:
            raise HTTPException(status_code=403, detail="Este alumno no está matriculado en ninguna de tus materias")
    # Cargar materias para los nombres
    materias_map: dict[int, models.materia.Materia] = {
        m.id: m
        for m in db.query(models.materia.Materia).filter(
            models.materia.Materia.id.in_(materia_ids)
        ).all()
    }
    resultado = []
    for mid in materia_ids:
        materia = materias_map.get(mid)
        if not materia:
            continue
        total_clases = (
            db.query(func.count(func.distinct(models.asistencia.Asistencia.fecha)))
            .filter(models.asistencia.Asistencia.materia_id == mid)
            .scalar()
        ) or 0
        presentes = (
            db.query(func.count(models.asistencia.Asistencia.id))
            .filter(
                models.asistencia.Asistencia.materia_id == mid,
                models.asistencia.Asistencia.user_id == user_id,
                models.asistencia.Asistencia.presente == True,
            )
            .scalar()
        ) or 0
        porcentaje = round((presentes / total_clases) * 100, 2) if total_clases > 0 else 0.0
        resultado.append(
            schemas.asistencia.PorcentajeGlobalOut(
                materia_id=mid,
                nombre_materia=materia.nombre,
                total_clases=total_clases,
                presentes=presentes,
                porcentaje=porcentaje,
            )
        )
    return resultado
@router.get("/{materia_id}/resumen", summary="Resumen global de asistencia de una materia")
def resumen_asistencia(
    materia_id: int,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    """Porcentaje global de presencia en todas las clases de la materia."""
    materia = db.query(models.materia.Materia).filter(
        models.materia.Materia.id == materia_id
    ).first()
    if not materia:
        raise HTTPException(status_code=404, detail="Materia no encontrada")
    total = db.query(models.asistencia.Asistencia).filter(
        models.asistencia.Asistencia.materia_id == materia_id
    ).count()
    presentes = db.query(models.asistencia.Asistencia).filter(
        models.asistencia.Asistencia.materia_id == materia_id,
        models.asistencia.Asistencia.presente == True,
    ).count()

    return {
        "materia_id": materia_id,
        "nombre_materia": materia.nombre,
        "total_registros": total,
        "presentes": presentes,
        "ausentes": total - presentes,
        "porcentaje": round((presentes / total) * 100, 2) if total > 0 else 0.0,
    }