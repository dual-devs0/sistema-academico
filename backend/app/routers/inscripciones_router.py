from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app import models, schemas, database
from app.dependencias import require_role, get_current_user
from app.services.pensum import validar_correlatividades

router = APIRouter(prefix="/inscripciones", tags=["inscripciones"])


def _oferta_activa_o_404(db: Session, materia_id: int):
    oferta = (
        db.query(models.oferta_materia.OfertaMateria)
        .filter(
            models.oferta_materia.OfertaMateria.materia_id == materia_id,
            models.oferta_materia.OfertaMateria.activa == True,  # noqa: E712
        )
        .first()
    )
    if not oferta:
        raise HTTPException(status_code=404, detail="No hay oferta activa para esta materia")
    return oferta


def _to_out(db: Session, ins: "models.inscripcion.Inscripcion") -> schemas.inscripcion.InscripcionOut:
    return schemas.inscripcion.InscripcionOut(
        id=ins.id, alumno_id=ins.alumno_id,
        materia_id=ins.oferta.materia_id, oferta_materia_id=ins.oferta_materia_id,
    )


@router.post("/", response_model=schemas.inscripcion.InscripcionOut)
def inscribir(inscripcion: schemas.inscripcion.InscripcionCreate, db: Session = Depends(database.get_db), current_user=Depends(get_current_user)):
    if current_user["role"] not in ("alumno", "admin"):
        raise HTTPException(status_code=403, detail="No autorizado")
    # Force the student to only enroll themselves
    alumno_id = inscripcion.alumno_id
    if current_user["role"] == "alumno":
        alumno_id = current_user["user_id"]
    materia = db.query(models.materia.Materia).filter(models.materia.Materia.id == inscripcion.materia_id).first()
    if not materia:
        raise HTTPException(status_code=404, detail="Materia no encontrada")

    resultado = validar_correlatividades(alumno_id, inscripcion.materia_id, db)
    if not resultado["valido"]:
        pendientes_nombres = []
        for p in resultado["pendientes"]:
            m = db.query(models.materia.Materia).filter(models.materia.Materia.id == p["materia_id"]).first()
            nombre = m.nombre if m else f"Materia #{p['materia_id']}"
            accion = "tener aprobada" if p["tipo"] == "aprobada" else "estar cursando"
            pendientes_nombres.append(f"{nombre} ({accion})")
        raise HTTPException(
            status_code=422,
            detail=f"No cumplís las correlatividades: falta {', '.join(pendientes_nombres)}",
        )

    oferta = _oferta_activa_o_404(db, inscripcion.materia_id)
    existente = db.query(models.inscripcion.Inscripcion).filter(
        models.inscripcion.Inscripcion.alumno_id == alumno_id,
        models.inscripcion.Inscripcion.oferta_materia_id == oferta.id,
    ).first()
    if existente:
        raise HTTPException(status_code=400, detail="El alumno ya esta inscripto en esta materia")
    # Check for schedule overlap
    try:
        from app.routers.horarios_router import verificar_solapamiento_inscripcion
        conflictos = verificar_solapamiento_inscripcion(db, alumno_id, inscripcion.materia_id)
        if conflictos:
            raise HTTPException(status_code=409, detail=f"Solapamiento de horario: {', '.join(conflictos)}")
    except ImportError:
        pass  # horarios module not yet available
    nueva = models.inscripcion.Inscripcion(
        alumno_id=alumno_id,
        oferta_materia_id=oferta.id,
    )
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return _to_out(db, nueva)


@router.delete("/{inscripcion_id}")
def desinscribir(inscripcion_id: int, db: Session = Depends(database.get_db), current_user=Depends(get_current_user)):
    ins = db.query(models.inscripcion.Inscripcion).filter(models.inscripcion.Inscripcion.id == inscripcion_id).first()
    if not ins:
        raise HTTPException(status_code=404, detail="Inscripcion no encontrada")
    if current_user["role"] == "alumno" and ins.alumno_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="No autorizado")
    db.delete(ins)
    db.commit()
    return {"detail": "Desinscripto correctamente"}


@router.get("/materia/{materia_id}")
def alumnos_por_materia(materia_id: int, db: Session = Depends(database.get_db), current_user=Depends(get_current_user)):
    oferta = _oferta_activa_o_404(db, materia_id)
    inscripciones = db.query(models.inscripcion.Inscripcion).filter(
        models.inscripcion.Inscripcion.oferta_materia_id == oferta.id
    ).all()
    result = []
    for i in inscripciones:
        alumno = db.query(models.user.User).filter(models.user.User.id == i.alumno_id).first()
        if alumno:
            result.append({
                "inscripcion_id": i.id,
                "alumno_id": alumno.id,
                "nombre": alumno.nombre or alumno.username,
                "username": alumno.username,
                "email": alumno.email or alumno.username,
            })
    return result


@router.get("/")
def list_inscripciones(db: Session = Depends(database.get_db), current_user=Depends(get_current_user)):
    if current_user["role"] == "alumno":
        rows = db.query(models.inscripcion.Inscripcion).filter(
            models.inscripcion.Inscripcion.alumno_id == current_user["user_id"]
        ).all()
    else:
        rows = db.query(models.inscripcion.Inscripcion).all()
    return [_to_out(db, i) for i in rows]
