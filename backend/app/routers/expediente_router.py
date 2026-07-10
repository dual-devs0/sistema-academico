from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schemas, database
from app.dependencias import get_current_user
from app.services.expediente import calcular_ppa, calcular_regularidad
from app.routers.puntajes_router import _calcular_promedio_final, PESOS

router = APIRouter(prefix="/expediente", tags=["expediente"])


@router.post("/cerrar-materia", response_model=schemas.expediente.ExpedienteMateriaOut)
def cerrar_materia(
    data: schemas.expediente.CerrarMateriaIn,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")

    alumno = (
        db.query(models.user.User).filter(models.user.User.id == data.alumno_id).first()
    )
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")
    oferta = (
        db.query(models.oferta_materia.OfertaMateria)
        .filter(models.oferta_materia.OfertaMateria.id == data.oferta_materia_id)
        .first()
    )
    if not oferta:
        raise HTTPException(status_code=404, detail="Oferta no encontrada")

    pensum_materia = (
        db.query(models.pensum_materia.PensumMateria)
        .filter(
            models.pensum_materia.PensumMateria.materia_id == oferta.materia_id,
            models.pensum_materia.PensumMateria.carrera_id == alumno.carrera_id,
        )
        .first()
    )
    if not pensum_materia:
        raise HTTPException(
            status_code=404,
            detail="La materia no esta en el pensum de la carrera del alumno",
        )

    puntajes = (
        db.query(models.puntaje.Puntaje)
        .filter(
            models.puntaje.Puntaje.user_id == data.alumno_id,
            models.puntaje.Puntaje.oferta_materia_id == data.oferta_materia_id,
        )
        .all()
    )
    notas = {p.tipo: float(p.valor) for p in puntajes if p.tipo in PESOS}
    nota_final = _calcular_promedio_final(notas)
    if nota_final is None:
        raise HTTPException(
            status_code=422, detail="El alumno no tiene notas cargadas para esta oferta"
        )
    condicion = "aprobada" if nota_final >= 6 else "reprobada"

    existente = (
        db.query(models.expediente_materia.ExpedienteMateria)
        .filter(
            models.expediente_materia.ExpedienteMateria.alumno_id == data.alumno_id,
            models.expediente_materia.ExpedienteMateria.oferta_materia_id
            == data.oferta_materia_id,
        )
        .first()
    )
    if existente:
        existente.nota_final = nota_final
        existente.creditos = pensum_materia.creditos
        existente.condicion = condicion
        existente.cerrado_por = current_user["user_id"]
        registro = existente
    else:
        registro = models.expediente_materia.ExpedienteMateria(
            alumno_id=data.alumno_id,
            oferta_materia_id=data.oferta_materia_id,
            nota_final=nota_final,
            creditos=pensum_materia.creditos,
            condicion=condicion,
            cerrado_por=current_user["user_id"],
        )
        db.add(registro)
    db.commit()
    db.refresh(registro)

    materia = (
        db.query(models.materia.Materia)
        .filter(models.materia.Materia.id == oferta.materia_id)
        .first()
    )
    return schemas.expediente.ExpedienteMateriaOut(
        id=registro.id,
        alumno_id=registro.alumno_id,
        materia_id=oferta.materia_id,
        materia_nombre=materia.nombre if materia else "—",
        periodo=oferta.periodo,
        nota_final=float(registro.nota_final),
        creditos=registro.creditos,
        condicion=registro.condicion,
    )


@router.get("/alumno/{alumno_id}/ppa", response_model=schemas.expediente.PPAOut)
def ppa_alumno(
    alumno_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    if current_user["role"] != "admin" and current_user["user_id"] != alumno_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    resultado = calcular_ppa(alumno_id, db)
    return schemas.expediente.PPAOut(**resultado)


@router.get(
    "/alumno/{alumno_id}", response_model=schemas.expediente.ExpedienteAlumnoOut
)
def expediente_alumno(
    alumno_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    if current_user["role"] != "admin" and current_user["user_id"] != alumno_id:
        raise HTTPException(status_code=403, detail="No autorizado")

    filas = (
        db.query(models.expediente_materia.ExpedienteMateria)
        .filter(models.expediente_materia.ExpedienteMateria.alumno_id == alumno_id)
        .all()
    )

    materias_out = []
    por_periodo: dict[str, dict] = {}
    for f in filas:
        oferta = (
            db.query(models.oferta_materia.OfertaMateria)
            .filter(models.oferta_materia.OfertaMateria.id == f.oferta_materia_id)
            .first()
        )
        materia = (
            db.query(models.materia.Materia)
            .filter(models.materia.Materia.id == oferta.materia_id)
            .first()
            if oferta
            else None
        )
        periodo = oferta.periodo if oferta else "—"

        materias_out.append(
            schemas.expediente.ExpedienteMateriaOut(
                id=f.id,
                alumno_id=f.alumno_id,
                materia_id=oferta.materia_id if oferta else 0,
                materia_nombre=materia.nombre if materia else "—",
                periodo=periodo,
                nota_final=float(f.nota_final),
                creditos=f.creditos,
                condicion=f.condicion,
            )
        )

        agg = por_periodo.setdefault(
            periodo,
            {
                "creditos": 0,
                "aprobadas": 0,
                "reprobadas": 0,
                "ponderado": 0.0,
                "creditos_aprobadas": 0,
            },
        )
        if f.condicion == "aprobada":
            agg["aprobadas"] += 1
            agg["creditos"] += f.creditos
            agg["ponderado"] += float(f.nota_final) * f.creditos
            agg["creditos_aprobadas"] += f.creditos
        else:
            agg["reprobadas"] += 1

    semestres_out = []
    for periodo, agg in por_periodo.items():
        ppa_periodo = (
            round(agg["ponderado"] / agg["creditos_aprobadas"], 2)
            if agg["creditos_aprobadas"]
            else None
        )

        registro = (
            db.query(models.expediente_semestre.ExpedienteSemestre)
            .filter(
                models.expediente_semestre.ExpedienteSemestre.alumno_id == alumno_id,
                models.expediente_semestre.ExpedienteSemestre.periodo == periodo,
            )
            .first()
        )
        if registro:
            registro.ppa_periodo = ppa_periodo
            registro.creditos_periodo = agg["creditos"]
            registro.materias_aprobadas = agg["aprobadas"]
            registro.materias_reprobadas = agg["reprobadas"]
        else:
            db.add(
                models.expediente_semestre.ExpedienteSemestre(
                    alumno_id=alumno_id,
                    periodo=periodo,
                    ppa_periodo=ppa_periodo,
                    creditos_periodo=agg["creditos"],
                    materias_aprobadas=agg["aprobadas"],
                    materias_reprobadas=agg["reprobadas"],
                )
            )

        semestres_out.append(
            schemas.expediente.ExpedienteSemestreOut(
                periodo=periodo,
                ppa_periodo=ppa_periodo,
                creditos_periodo=agg["creditos"],
                materias_aprobadas=agg["aprobadas"],
                materias_reprobadas=agg["reprobadas"],
            )
        )
    db.commit()

    return schemas.expediente.ExpedienteAlumnoOut(
        materias=materias_out, semestres=semestres_out
    )


@router.get(
    "/alumno/{alumno_id}/regularidad", response_model=schemas.expediente.RegularidadOut
)
def regularidad_alumno(
    alumno_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    if current_user["role"] != "admin" and current_user["user_id"] != alumno_id:
        raise HTTPException(status_code=403, detail="No autorizado")

    resultado = calcular_regularidad(alumno_id, db)

    registro = (
        db.query(models.regularidad_alumno.RegularidadAlumno)
        .filter(models.regularidad_alumno.RegularidadAlumno.alumno_id == alumno_id)
        .first()
    )
    if registro:
        registro.estado = resultado["estado"]
        registro.ppa_acumulado = resultado["ppa_acumulado"]
        registro.motivo = resultado["motivo"]
    else:
        db.add(
            models.regularidad_alumno.RegularidadAlumno(
                alumno_id=alumno_id,
                estado=resultado["estado"],
                ppa_acumulado=resultado["ppa_acumulado"],
                motivo=resultado["motivo"],
            )
        )
    db.commit()

    return schemas.expediente.RegularidadOut(**resultado)
