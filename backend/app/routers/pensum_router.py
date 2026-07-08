from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schemas, database
from app.dependencias import get_current_user
from app.services.pensum import validar_correlatividades, _tiene_nota_aprobatoria, _tiene_inscripcion

router = APIRouter(prefix="/pensum", tags=["pensum"])


@router.post("/carreras/{carrera_id}/materias", response_model=schemas.pensum.PensumMateriaOut)
def agregar_materia_a_malla(
    carrera_id: int,
    data: schemas.pensum.PensumMateriaCreate,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    carrera = db.query(models.carrera.Carrera).filter(models.carrera.Carrera.id == carrera_id).first()
    if not carrera:
        raise HTTPException(status_code=404, detail="Carrera no encontrada")
    materia = db.query(models.materia.Materia).filter(models.materia.Materia.id == data.materia_id).first()
    if not materia:
        raise HTTPException(status_code=404, detail="Materia no encontrada")
    existente = db.query(models.pensum_materia.PensumMateria).filter(
        models.pensum_materia.PensumMateria.carrera_id == carrera_id,
        models.pensum_materia.PensumMateria.materia_id == data.materia_id,
    ).first()
    if existente:
        raise HTTPException(status_code=400, detail="Esa materia ya está en la malla de esta carrera")

    nuevo = models.pensum_materia.PensumMateria(
        carrera_id=carrera_id, materia_id=data.materia_id,
        semestre=data.semestre, creditos=data.creditos,
        es_electiva=data.es_electiva or False,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return schemas.pensum.PensumMateriaOut(
        id=nuevo.id, carrera_id=nuevo.carrera_id, materia_id=nuevo.materia_id,
        materia_nombre=materia.nombre, semestre=nuevo.semestre,
        creditos=nuevo.creditos, es_electiva=nuevo.es_electiva,
    )


@router.delete("/carreras/{carrera_id}/materias/{pensum_materia_id}")
def quitar_materia_de_malla(
    carrera_id: int,
    pensum_materia_id: int,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    pm = db.query(models.pensum_materia.PensumMateria).filter(
        models.pensum_materia.PensumMateria.id == pensum_materia_id,
        models.pensum_materia.PensumMateria.carrera_id == carrera_id,
    ).first()
    if not pm:
        raise HTTPException(status_code=404, detail="No encontrado en la malla de esta carrera")
    db.delete(pm)
    db.commit()
    return {"detail": "Materia removida de la malla"}


@router.get("/correlatividades", response_model=list[schemas.pensum.CorrelatividadOut])
def listar_correlatividades(
    carrera_id: int | None = None,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    query = db.query(models.correlatividad.Correlatividad)
    if carrera_id is not None:
        materia_ids = [
            row[0] for row in db.query(models.pensum_materia.PensumMateria.materia_id)
            .filter(models.pensum_materia.PensumMateria.carrera_id == carrera_id).all()
        ]
        query = query.filter(models.correlatividad.Correlatividad.materia_id.in_(materia_ids))
    return query.all()


@router.post("/correlatividades", response_model=schemas.pensum.CorrelatividadOut)
def crear_correlatividad(
    data: schemas.pensum.CorrelatividadCreate,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    if data.materia_id == data.prerrequisito_id:
        raise HTTPException(status_code=422, detail="Una materia no puede ser prerrequisito de sí misma")
    if data.tipo not in ("aprobada", "cursando"):
        raise HTTPException(status_code=422, detail="tipo debe ser 'aprobada' o 'cursando'")
    for mid in (data.materia_id, data.prerrequisito_id):
        if not db.query(models.materia.Materia).filter(models.materia.Materia.id == mid).first():
            raise HTTPException(status_code=404, detail=f"Materia {mid} no encontrada")

    nueva = models.correlatividad.Correlatividad(
        materia_id=data.materia_id, prerrequisito_id=data.prerrequisito_id, tipo=data.tipo,
    )
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva


@router.delete("/correlatividades/{correlatividad_id}")
def eliminar_correlatividad(
    correlatividad_id: int,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    corr = db.query(models.correlatividad.Correlatividad).filter(
        models.correlatividad.Correlatividad.id == correlatividad_id
    ).first()
    if not corr:
        raise HTTPException(status_code=404, detail="Correlatividad no encontrada")
    db.delete(corr)
    db.commit()
    return {"detail": "Correlatividad eliminada"}


@router.get("/carreras/{carrera_id}", response_model=list[schemas.pensum.PensumMateriaOut])
def obtener_malla_carrera(
    carrera_id: int,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    carrera = db.query(models.carrera.Carrera).filter(models.carrera.Carrera.id == carrera_id).first()
    if not carrera:
        raise HTTPException(status_code=404, detail="Carrera no encontrada")
    filas = (
        db.query(models.pensum_materia.PensumMateria)
        .filter(models.pensum_materia.PensumMateria.carrera_id == carrera_id)
        .order_by(models.pensum_materia.PensumMateria.semestre)
        .all()
    )
    result = []
    for pm in filas:
        materia = db.query(models.materia.Materia).filter(models.materia.Materia.id == pm.materia_id).first()
        result.append(schemas.pensum.PensumMateriaOut(
            id=pm.id, carrera_id=pm.carrera_id, materia_id=pm.materia_id,
            materia_nombre=materia.nombre if materia else None,
            semestre=pm.semestre, creditos=pm.creditos, es_electiva=pm.es_electiva,
        ))
    return result


def _calcular_estado_materia(db: Session, alumno_id: int, materia_id: int) -> tuple[str, list[dict]]:
    if _tiene_nota_aprobatoria(db, alumno_id, materia_id):
        return "aprobada", []
    if _tiene_inscripcion(db, alumno_id, materia_id):
        return "cursando", []
    resultado = validar_correlatividades(alumno_id, materia_id, db)
    if resultado["valido"]:
        return "pendiente", []
    pendientes = []
    for p in resultado["pendientes"]:
        materia_prerreq = db.query(models.materia.Materia).filter(
            models.materia.Materia.id == p["materia_id"]
        ).first()
        pendientes.append({
            "materia_id": p["materia_id"],
            "materia_nombre": materia_prerreq.nombre if materia_prerreq else "—",
            "tipo": p["tipo"],
        })
    return "bloqueada", pendientes


@router.get("/alumno/{alumno_id}/avance", response_model=list[schemas.pensum.AvanceMateriaOut])
def avance_alumno(
    alumno_id: int,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    if current_user["role"] != "admin" and current_user["user_id"] != alumno_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    alumno = db.query(models.user.User).filter(models.user.User.id == alumno_id).first()
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")
    if not alumno.carrera_id:
        return []

    filas = (
        db.query(models.pensum_materia.PensumMateria)
        .filter(models.pensum_materia.PensumMateria.carrera_id == alumno.carrera_id)
        .order_by(models.pensum_materia.PensumMateria.semestre)
        .all()
    )
    result = []
    for pm in filas:
        materia = db.query(models.materia.Materia).filter(models.materia.Materia.id == pm.materia_id).first()
        estado, pendientes = _calcular_estado_materia(db, alumno_id, pm.materia_id)

        avance = db.query(models.avance_alumno_pensum.AvanceAlumnoPensum).filter(
            models.avance_alumno_pensum.AvanceAlumnoPensum.alumno_id == alumno_id,
            models.avance_alumno_pensum.AvanceAlumnoPensum.pensum_materia_id == pm.id,
        ).first()
        if avance:
            avance.estado = estado
        else:
            db.add(models.avance_alumno_pensum.AvanceAlumnoPensum(
                alumno_id=alumno_id, pensum_materia_id=pm.id, estado=estado,
            ))

        result.append(schemas.pensum.AvanceMateriaOut(
            pensum_materia_id=pm.id, materia_id=pm.materia_id,
            materia_nombre=materia.nombre if materia else "—",
            semestre=pm.semestre, creditos=pm.creditos, estado=estado,
            pendientes=pendientes,
        ))
    db.commit()
    return result


@router.get("/alumno/{alumno_id}/creditos", response_model=schemas.pensum.CreditosAlumnoOut)
def creditos_alumno(
    alumno_id: int,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    if current_user["role"] != "admin" and current_user["user_id"] != alumno_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    alumno = db.query(models.user.User).filter(models.user.User.id == alumno_id).first()
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")
    if not alumno.carrera_id:
        return schemas.pensum.CreditosAlumnoOut(creditos_acumulados=0, creditos_totales=None)

    carrera = db.query(models.carrera.Carrera).filter(models.carrera.Carrera.id == alumno.carrera_id).first()
    filas = (
        db.query(models.pensum_materia.PensumMateria)
        .filter(models.pensum_materia.PensumMateria.carrera_id == alumno.carrera_id)
        .all()
    )
    acumulados = 0
    for pm in filas:
        if _tiene_nota_aprobatoria(db, alumno_id, pm.materia_id):
            acumulados += pm.creditos

    return schemas.pensum.CreditosAlumnoOut(
        creditos_acumulados=acumulados,
        creditos_totales=carrera.creditos_totales if carrera else None,
    )
