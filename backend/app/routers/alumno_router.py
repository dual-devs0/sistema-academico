from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schemas, database
from app.dependencias import get_current_user
from app.security import hash_password

router = APIRouter(prefix="/alumno", tags=["alumno"])


@router.get("/mi-perfil", response_model=schemas.user.UserOut)
def mi_perfil(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    user = (
        db.query(models.user.User)
        .filter(models.user.User.id == current_user["user_id"])
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user


@router.patch("/mi-perfil", response_model=schemas.user.UserOut)
def actualizar_mi_perfil(
    data: schemas.user.UserUpdate,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    user = (
        db.query(models.user.User)
        .filter(models.user.User.id == current_user["user_id"])
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
    inscripciones = (
        db.query(models.inscripcion.Inscripcion)
        .filter(models.inscripcion.Inscripcion.alumno_id == current_user["user_id"])
        .all()
    )
    materia_ids = [i.oferta.materia_id for i in inscripciones]
    if not materia_ids:
        return []
    materias = (
        db.query(models.materia.Materia)
        .filter(models.materia.Materia.id.in_(materia_ids))
        .all()
    )
    result = []
    for m in materias:
        oferta = (
            db.query(models.oferta_materia.OfertaMateria)
            .filter(
                models.oferta_materia.OfertaMateria.materia_id == m.id,
                models.oferta_materia.OfertaMateria.activa == True,  # noqa: E712
            )
            .first()
        )
        profesor = (
            db.query(models.user.User)
            .filter(models.user.User.id == oferta.profesor_id)
            .first()
            if oferta
            else None
        )
        result.append(
            {
                "id": m.id,
                "nombre": m.nombre,
                "profesor": profesor.nombre if profesor else None,
                "anio": m.anio,
                "semestre": m.semestre,
            }
        )
    return result


@router.get("/mis-notas")
def mis_notas(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    user_id = current_user["user_id"]
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

    PESOS = {"parcial1": 0.25, "parcial2": 0.25, "practico": 0.20, "final": 0.30}
    result = []
    for mid, data in por_materia.items():
        existentes = {k: v for k, v in data.items() if k in PESOS and v is not None}
        if existentes:
            peso_total = sum(PESOS[k] for k in existentes)
            prom = (
                round(sum(PESOS[k] * v for k, v in existentes.items()) / peso_total, 2)
                if peso_total > 0
                else None
            )
        else:
            prom = None
        result.append({**data, "promedio": prom})

    return result


@router.get("/mi-asistencia")
def mi_asistencia(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    user_id = current_user["user_id"]
    asistencias = (
        db.query(models.asistencia.Asistencia)
        .filter(models.asistencia.Asistencia.user_id == user_id)
        .all()
    )

    por_materia: dict[int, dict] = {}
    for a in asistencias:
        mid = a.materia_id
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


@router.get("/mi-resumen")
def mi_resumen(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    user_id = current_user["user_id"]
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
