from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app import models, schemas, database
from app.dependencias import get_current_user
from app.services.autorizacion import es_profesor_de_materia

router = APIRouter(prefix="/horarios", tags=["horarios"])


def verificar_solapamiento_inscripcion(
    db: Session, alumno_id: int, materia_id_nueva: int
) -> list[str]:
    """
    Verifica si el horario de la materia nueva se superpone
    con materias ya cursadas por el alumno.
    Retorna lista de descripciones de conflictos.
    """
    conflictos = []
    horario_nuevo = (
        db.query(models.horario.Horario)
        .filter(models.horario.Horario.materia_id == materia_id_nueva)
        .all()
    )
    if not horario_nuevo:
        return []

    inscripciones = (
        db.query(models.inscripcion.Inscripcion)
        .filter(
            models.inscripcion.Inscripcion.alumno_id == alumno_id,
        )
        .all()
    )
    materia_ids_existentes = [
        i.oferta.materia_id
        for i in inscripciones
        if i.oferta.materia_id != materia_id_nueva
    ]

    for h_nuevo in horario_nuevo:
        horarios_exist = (
            db.query(models.horario.Horario)
            .filter(
                models.horario.Horario.materia_id.in_(materia_ids_existentes),
                models.horario.Horario.dia_semana == h_nuevo.dia_semana,
            )
            .all()
        )
        for h_exist in horarios_exist:
            if (
                h_nuevo.hora_inicio < h_exist.hora_fin
                and h_nuevo.hora_fin > h_exist.hora_inicio
            ):
                materia_exist = (
                    db.query(models.materia.Materia)
                    .filter(models.materia.Materia.id == h_exist.materia_id)
                    .first()
                )
                conflictos.append(
                    f"'{materia_exist.nombre if materia_exist else '?'}' el día "
                    f"{_dia_nombre(h_exist.dia_semana)} "
                    f"de {h_exist.hora_inicio} a {h_exist.hora_fin}"
                )

    return conflictos


def _dia_nombre(d: int) -> str:
    dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
    return dias[d] if 0 <= d <= 6 else "?"


@router.post("/", response_model=schemas.horario.HorarioOut)
def create_horario(
    horario: schemas.horario.HorarioCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role not in ("admin", "profesor"):
        raise HTTPException(
            status_code=403,
            detail="Solo administradores y profesores pueden crear horarios",
        )
    materia = (
        db.query(models.materia.Materia)
        .filter(models.materia.Materia.id == horario.materia_id)
        .first()
    )
    if not materia:
        raise HTTPException(status_code=404, detail="Materia no encontrada")
    if current_user.role == "profesor" and not es_profesor_de_materia(
        db, horario.materia_id, current_user.user_id
    ):
        raise HTTPException(
            status_code=403, detail="No sos el profesor de esta materia"
        )
    # Validate time range
    if horario.hora_inicio >= horario.hora_fin:
        raise HTTPException(
            status_code=400,
            detail="La hora de inicio debe ser anterior a la hora de fin",
        )
    # Check professor schedule conflict
    existing = (
        db.query(models.horario.Horario)
        .filter(
            models.horario.Horario.materia_id == horario.materia_id,
            models.horario.Horario.dia_semana == horario.dia_semana,
            models.horario.Horario.hora_inicio == horario.hora_inicio,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Ya existe un horario para esta materia en ese día y hora",
        )
    new_horario = models.horario.Horario(**horario.model_dump())
    db.add(new_horario)
    db.commit()
    db.refresh(new_horario)
    materia_nombre = (
        db.query(models.materia.Materia.nombre)
        .filter(models.materia.Materia.id == new_horario.materia_id)
        .scalar()
    )
    result = schemas.horario.HorarioOut(
        id=new_horario.id,
        materia_id=new_horario.materia_id,
        dia_semana=new_horario.dia_semana,
        hora_inicio=new_horario.hora_inicio,
        hora_fin=new_horario.hora_fin,
        aula=new_horario.aula,
        materia_nombre=materia_nombre,
    )
    return result


@router.get("/", response_model=list[schemas.horario.HorarioOut])
def list_horarios(
    materia_id: Optional[int] = Query(None),
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(models.horario.Horario)
    if materia_id is not None:
        query = query.filter(models.horario.Horario.materia_id == materia_id)
    horarios = query.order_by(
        models.horario.Horario.dia_semana, models.horario.Horario.hora_inicio
    ).all()
    result = []
    for h in horarios:
        materia_nombre = (
            db.query(models.materia.Materia.nombre)
            .filter(models.materia.Materia.id == h.materia_id)
            .scalar()
        )
        result.append(
            schemas.horario.HorarioOut(
                id=h.id,
                materia_id=h.materia_id,
                dia_semana=h.dia_semana,
                hora_inicio=h.hora_inicio,
                hora_fin=h.hora_fin,
                aula=h.aula,
                materia_nombre=materia_nombre,
            )
        )
    return result


@router.get("/materia/{materia_id}", response_model=list[schemas.horario.HorarioOut])
def horarios_por_materia(
    materia_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    horarios = (
        db.query(models.horario.Horario)
        .filter(models.horario.Horario.materia_id == materia_id)
        .order_by(models.horario.Horario.dia_semana, models.horario.Horario.hora_inicio)
        .all()
    )
    materia_nombre = (
        db.query(models.materia.Materia.nombre)
        .filter(models.materia.Materia.id == materia_id)
        .scalar()
    )
    return [
        schemas.horario.HorarioOut(
            id=h.id,
            materia_id=h.materia_id,
            dia_semana=h.dia_semana,
            hora_inicio=h.hora_inicio,
            hora_fin=h.hora_fin,
            aula=h.aula,
            materia_nombre=materia_nombre,
        )
        for h in horarios
    ]


@router.delete("/{horario_id}")
def delete_horario(
    horario_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role not in ("admin", "profesor"):
        raise HTTPException(status_code=403, detail="No autorizado")
    horario = (
        db.query(models.horario.Horario)
        .filter(models.horario.Horario.id == horario_id)
        .first()
    )
    if not horario:
        raise HTTPException(status_code=404, detail="Horario no encontrado")
    if current_user.role == "profesor":
        if not es_profesor_de_materia(db, horario.materia_id, current_user.user_id):
            raise HTTPException(status_code=403, detail="No autorizado")
    db.delete(horario)
    db.commit()
    return {"detail": "Horario eliminado"}


@router.get("/verificar-solapamiento")
def verificar_solapamiento(
    materia_id: int = Query(...),
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    """Verifica si el alumno actual tiene solapamiento de horario al inscribirse en una materia."""  # noqa: E501
    if current_user.role != "alumno":
        raise HTTPException(
            status_code=403, detail="Solo alumnos pueden verificar solapamiento"
        )
    conflictos = verificar_solapamiento_inscripcion(
        db, current_user.user_id, materia_id
    )
    return {
        "tiene_conflicto": len(conflictos) > 0,
        "conflictos": conflictos,
    }
