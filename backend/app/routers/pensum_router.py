from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schemas, database
from app.dependencias import get_current_user
from app.services.pensum import (
    validar_correlatividades,
    validar_correlatividad_estructural,
    promedio_y_estado_intento,
    _calcular_estado_cached,
    _tiene_nota_aprobatoria_cached,
)

router = APIRouter(prefix="/pensum", tags=["pensum"])


@router.post(
    "/carreras/{carrera_id}/materias", response_model=schemas.pensum.PensumMateriaOut
)
def agregar_materia_a_malla(
    carrera_id: int,
    data: schemas.pensum.PensumMateriaCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    carrera = (
        db.query(models.carrera.Carrera)
        .filter(models.carrera.Carrera.id == carrera_id)
        .first()
    )
    if not carrera:
        raise HTTPException(status_code=404, detail="Carrera no encontrada")
    materia = (
        db.query(models.materia.Materia)
        .filter(models.materia.Materia.id == data.materia_id)
        .first()
    )
    if not materia:
        raise HTTPException(status_code=404, detail="Materia no encontrada")
    existente = (
        db.query(models.pensum_materia.PensumMateria)
        .filter(
            models.pensum_materia.PensumMateria.carrera_id == carrera_id,
            models.pensum_materia.PensumMateria.materia_id == data.materia_id,
        )
        .first()
    )
    if existente:
        raise HTTPException(
            status_code=400, detail="Esa materia ya está en la malla de esta carrera"
        )

    nuevo = models.pensum_materia.PensumMateria(
        carrera_id=carrera_id,
        materia_id=data.materia_id,
        semestre=data.semestre,
        creditos=data.creditos,
        es_electiva=data.es_electiva or False,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return schemas.pensum.PensumMateriaOut(
        id=nuevo.id,
        carrera_id=nuevo.carrera_id,
        materia_id=nuevo.materia_id,
        materia_nombre=materia.nombre,
        semestre=nuevo.semestre,
        creditos=nuevo.creditos,
        es_electiva=nuevo.es_electiva,
    )


@router.delete("/carreras/{carrera_id}/materias/{pensum_materia_id}")
def quitar_materia_de_malla(
    carrera_id: int,
    pensum_materia_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    pm = (
        db.query(models.pensum_materia.PensumMateria)
        .filter(
            models.pensum_materia.PensumMateria.id == pensum_materia_id,
            models.pensum_materia.PensumMateria.carrera_id == carrera_id,
        )
        .first()
    )
    if not pm:
        raise HTTPException(
            status_code=404, detail="No encontrado en la malla de esta carrera"
        )
    db.delete(pm)
    db.commit()
    return {"detail": "Materia removida de la malla"}


from pydantic import BaseModel


class PensumMateriaUpdate(BaseModel):
    semestre: int | None = None
    creditos: int | None = None
    es_electiva: bool | None = None


@router.patch("/materias/{pensum_materia_id}", response_model=schemas.pensum.PensumMateriaOut)
def actualizar_pensum_materia(
    pensum_materia_id: int,
    data: PensumMateriaUpdate,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    pm = (
        db.query(models.pensum_materia.PensumMateria)
        .filter(models.pensum_materia.PensumMateria.id == pensum_materia_id)
        .first()
    )
    if not pm:
        raise HTTPException(status_code=404, detail="PensumMateria no encontrada")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(pm, key, value)
    db.commit()
    db.refresh(pm)

    materia = (
        db.query(models.materia.Materia)
        .filter(models.materia.Materia.id == pm.materia_id)
        .first()
    )
    return schemas.pensum.PensumMateriaOut(
        id=pm.id,
        carrera_id=pm.carrera_id,
        materia_id=pm.materia_id,
        materia_nombre=materia.nombre if materia else None,
        materia_codigo=materia.codigo if materia else None,
        semestre=pm.semestre,
        creditos=pm.creditos,
        es_electiva=pm.es_electiva,
    )


@router.get("/correlatividades", response_model=list[schemas.pensum.CorrelatividadOut])
def listar_correlatividades(
    carrera_id: int | None = None,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(models.correlatividad.Correlatividad)
    if carrera_id is not None:
        materia_ids = [
            row[0]
            for row in db.query(models.pensum_materia.PensumMateria.materia_id)
            .filter(models.pensum_materia.PensumMateria.carrera_id == carrera_id)
            .all()
        ]
        query = query.filter(
            models.correlatividad.Correlatividad.materia_id.in_(materia_ids)
        )
    return query.all()


@router.post("/correlatividades", response_model=schemas.pensum.CorrelatividadOut)
def crear_correlatividad(
    data: schemas.pensum.CorrelatividadCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    if data.materia_id == data.prerrequisito_id:
        raise HTTPException(
            status_code=422, detail="Una materia no puede ser prerrequisito de sí misma"
        )
    if data.tipo not in ("aprobada", "cursando"):
        raise HTTPException(
            status_code=422, detail="tipo debe ser 'aprobada' o 'cursando'"
        )
    for mid in (data.materia_id, data.prerrequisito_id):
        if (
            not db.query(models.materia.Materia)
            .filter(models.materia.Materia.id == mid)
            .first()
        ):
            raise HTTPException(status_code=404, detail=f"Materia {mid} no encontrada")

    # Find the carrera_id from any pensum_materia containing materia_id
    pm = (
        db.query(models.pensum_materia.PensumMateria)
        .filter(models.pensum_materia.PensumMateria.materia_id == data.materia_id)
        .first()
    )
    if pm:
        validacion = validar_correlatividad_estructural(
            pm.carrera_id, data.materia_id, data.prerrequisito_id, db
        )
        if not validacion["valido"]:
            raise HTTPException(status_code=422, detail=validacion["error"])

    nueva = models.correlatividad.Correlatividad(
        materia_id=data.materia_id,
        prerrequisito_id=data.prerrequisito_id,
        tipo=data.tipo,
    )
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva


@router.delete("/correlatividades/{correlatividad_id}")
def eliminar_correlatividad(
    correlatividad_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    corr = (
        db.query(models.correlatividad.Correlatividad)
        .filter(models.correlatividad.Correlatividad.id == correlatividad_id)
        .first()
    )
    if not corr:
        raise HTTPException(status_code=404, detail="Correlatividad no encontrada")
    db.delete(corr)
    db.commit()
    return {"detail": "Correlatividad eliminada"}


@router.get(
    "/carreras/{carrera_id}", response_model=list[schemas.pensum.PensumMateriaOut]
)
def obtener_malla_carrera(
    carrera_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    carrera = (
        db.query(models.carrera.Carrera)
        .filter(models.carrera.Carrera.id == carrera_id)
        .first()
    )
    if not carrera:
        raise HTTPException(status_code=404, detail="Carrera no encontrada")
    filas = (
        db.query(models.pensum_materia.PensumMateria)
        .filter(models.pensum_materia.PensumMateria.carrera_id == carrera_id)
        .order_by(models.pensum_materia.PensumMateria.semestre)
        .all()
    )
    materia_ids = [pm.materia_id for pm in filas]
    materias_map = {
        m.id: m
        for m in db.query(models.materia.Materia)
        .filter(models.materia.Materia.id.in_(materia_ids))
        .all()
    }
    result = []
    for pm in filas:
        materia = materias_map.get(pm.materia_id)
        result.append(
            schemas.pensum.PensumMateriaOut(
                id=pm.id,
                carrera_id=pm.carrera_id,
                materia_id=pm.materia_id,
                materia_nombre=materia.nombre if materia else None,
                materia_codigo=materia.codigo if materia else None,
                semestre=pm.semestre,
                creditos=pm.creditos,
                es_electiva=pm.es_electiva,
            )
        )
    return result


def _prerequisitos_de(db: Session, materia_id: int) -> list[dict]:
    """Lista completa de prerrequisitos de una materia (independiente de si
    ya están cumplidos), para mostrar 'Requiere: X' en la card."""
    prereqs = (
        db.query(models.correlatividad.Correlatividad)
        .filter(models.correlatividad.Correlatividad.materia_id == materia_id)
        .all()
    )
    resultado = []
    for pr in prereqs:
        materia_prerreq = (
            db.query(models.materia.Materia)
            .filter(models.materia.Materia.id == pr.prerrequisito_id)
            .first()
        )
        resultado.append(
            {
                "materia_id": pr.prerrequisito_id,
                "materia_nombre": materia_prerreq.nombre if materia_prerreq else "—",
                "tipo": pr.tipo,
            }
        )
    return resultado


def _calcular_estado_materia(
    db: Session, alumno_id: int, materia_id: int
) -> tuple[str, list[dict], float | None]:
    promedio, inscripto_en_activa, reprobado = promedio_y_estado_intento(
        db, alumno_id, materia_id
    )
    if promedio is not None and promedio >= 6:
        return "aprobada", [], promedio
    if inscripto_en_activa:
        return "cursando", [], promedio
    if reprobado:
        return "reprobada", [], promedio
    resultado = validar_correlatividades(alumno_id, materia_id, db)
    if resultado["valido"]:
        return "pendiente", [], promedio
    pendientes = []
    for p in resultado["pendientes"]:
        materia_prerreq = (
            db.query(models.materia.Materia)
            .filter(models.materia.Materia.id == p["materia_id"])
            .first()
        )
        pendientes.append(
            {
                "materia_id": p["materia_id"],
                "materia_nombre": materia_prerreq.nombre if materia_prerreq else "—",
                "tipo": p["tipo"],
            }
        )
    return "bloqueada", pendientes, promedio


@router.get(
    "/alumno/{alumno_id}/avance", response_model=list[schemas.pensum.AvanceMateriaOut]
)
def avance_alumno(
    alumno_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != "admin" and current_user.user_id != alumno_id:
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

    # --- batch pre-fetch: 7 queries fijas independientemente del tamaño de malla ---
    materia_ids = [pm.materia_id for pm in filas]
    pensum_ids = [pm.id for pm in filas]

    # 1. Materias
    materias_map = {
        m.id: m
        for m in db.query(models.materia.Materia)
        .filter(models.materia.Materia.id.in_(materia_ids))
        .all()
    }

    # 2. Correlatividades
    correlatividades_por_materia: dict = defaultdict(list)
    for c in (
        db.query(models.correlatividad.Correlatividad)
        .filter(models.correlatividad.Correlatividad.materia_id.in_(materia_ids))
        .all()
    ):
        correlatividades_por_materia[c.materia_id].append(c)

    # 3. OfertaMateria
    ofertas = (
        db.query(models.oferta_materia.OfertaMateria)
        .filter(models.oferta_materia.OfertaMateria.materia_id.in_(materia_ids))
        .all()
    )
    ofertas_por_materia: dict = defaultdict(list)
    for o in ofertas:
        ofertas_por_materia[o.materia_id].append(o)
    activa_por_oferta_id = {o.id: bool(o.activa) for o in ofertas}

    # 4. Inscripciones del alumno
    todos_oferta_ids = [o.id for o in ofertas]
    inscriptas_oferta_ids: set = {
        i.oferta_materia_id
        for i in db.query(models.inscripcion.Inscripcion.oferta_materia_id)
        .filter(
            models.inscripcion.Inscripcion.alumno_id == alumno_id,
            models.inscripcion.Inscripcion.oferta_materia_id.in_(todos_oferta_ids),
        )
        .all()
    }

    # 5. Puntajes del alumno
    puntajes_por_oferta: dict = defaultdict(dict)
    for p in (
        db.query(models.puntaje.Puntaje)
        .filter(
            models.puntaje.Puntaje.user_id == alumno_id,
            models.puntaje.Puntaje.oferta_materia_id.in_(todos_oferta_ids),
        )
        .all()
    ):
        puntajes_por_oferta[p.oferta_materia_id][p.tipo] = float(p.valor)

    # 6. AvanceAlumnoPensum existente
    avance_map = {
        a.pensum_materia_id: a
        for a in db.query(models.avance_alumno_pensum.AvanceAlumnoPensum)
        .filter(
            models.avance_alumno_pensum.AvanceAlumnoPensum.alumno_id == alumno_id,
            models.avance_alumno_pensum.AvanceAlumnoPensum.pensum_materia_id.in_(
                pensum_ids
            ),
        )
        .all()
    }

    # 7. Nombres de prereqs
    prereq_ids = {
        c.prerrequisito_id
        for corrs in correlatividades_por_materia.values()
        for c in corrs
    }
    prereq_nombres = {
        m.id: m.nombre
        for m in db.query(models.materia.Materia)
        .filter(models.materia.Materia.id.in_(prereq_ids))
        .all()
    } if prereq_ids else {}
    # ---------------------------------------------------------------------------------

    result = []
    for pm in filas:
        materia = materias_map.get(pm.materia_id)
        estado, pendientes, nota = _calcular_estado_cached(
            pm.materia_id,
            ofertas_por_materia,
            inscriptas_oferta_ids,
            puntajes_por_oferta,
            activa_por_oferta_id,
            correlatividades_por_materia,
            prereq_nombres,
        )
        # prerequisitos completos (todos, no solo pendientes)
        prerequisitos = [
            {
                "materia_id": c.prerrequisito_id,
                "materia_nombre": prereq_nombres.get(c.prerrequisito_id, "—"),
                "tipo": c.tipo,
            }
            for c in correlatividades_por_materia.get(pm.materia_id, [])
        ]

        avance = avance_map.get(pm.id)
        if avance:
            avance.estado = estado
        else:
            db.add(
                models.avance_alumno_pensum.AvanceAlumnoPensum(
                    alumno_id=alumno_id,
                    pensum_materia_id=pm.id,
                    estado=estado,
                )
            )

        result.append(
            schemas.pensum.AvanceMateriaOut(
                pensum_materia_id=pm.id,
                materia_id=pm.materia_id,
                materia_nombre=materia.nombre if materia else "—",
                materia_codigo=materia.codigo if materia else None,
                semestre=pm.semestre,
                creditos=pm.creditos,
                estado=estado,
                nota=round(nota, 2) if nota is not None else None,
                pendientes=pendientes,
                prerequisitos=prerequisitos,
            )
        )
    db.commit()
    return result


@router.get(
    "/alumno/{alumno_id}/creditos", response_model=schemas.pensum.CreditosAlumnoOut
)
def creditos_alumno(
    alumno_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != "admin" and current_user.user_id != alumno_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    alumno = db.query(models.user.User).filter(models.user.User.id == alumno_id).first()
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")
    if not alumno.carrera_id:
        return schemas.pensum.CreditosAlumnoOut(
            creditos_acumulados=0, creditos_totales=None
        )

    carrera = (
        db.query(models.carrera.Carrera)
        .filter(models.carrera.Carrera.id == alumno.carrera_id)
        .first()
    )
    filas = (
        db.query(models.pensum_materia.PensumMateria)
        .filter(models.pensum_materia.PensumMateria.carrera_id == alumno.carrera_id)
        .all()
    )
    materia_ids = [pm.materia_id for pm in filas]
    ofertas_cred = (
        db.query(models.oferta_materia.OfertaMateria)
        .filter(models.oferta_materia.OfertaMateria.materia_id.in_(materia_ids))
        .all()
    )
    ofertas_por_materia_cred: dict = defaultdict(list)
    for o in ofertas_cred:
        ofertas_por_materia_cred[o.materia_id].append(o)
    oferta_ids_cred = [o.id for o in ofertas_cred]
    puntajes_por_oferta_cred: dict = defaultdict(dict)
    for p in (
        db.query(models.puntaje.Puntaje)
        .filter(
            models.puntaje.Puntaje.user_id == alumno_id,
            models.puntaje.Puntaje.oferta_materia_id.in_(oferta_ids_cred),
        )
        .all()
    ):
        puntajes_por_oferta_cred[p.oferta_materia_id][p.tipo] = float(p.valor)

    acumulados = 0
    for pm in filas:
        if _tiene_nota_aprobatoria_cached(
            pm.materia_id, ofertas_por_materia_cred, puntajes_por_oferta_cred
        ):
            acumulados += pm.creditos

    return schemas.pensum.CreditosAlumnoOut(
        creditos_acumulados=acumulados,
        creditos_totales=carrera.creditos_totales if carrera else None,
    )
