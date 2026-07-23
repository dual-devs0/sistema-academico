from typing import Optional, cast
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from app import models, schemas, database
from app.dependencias import get_current_user
from app.services.pensum import validar_correlatividades
from app.services.financiero import verificar_deuda_inscripcion, registrar_override_mora


class PromocionarBody(BaseModel):
    carrera_id: int
    desde_anio: int
    desde_semestre: int
    hasta_anio: int
    hasta_semestre: int

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
        raise HTTPException(
            status_code=404, detail="No hay oferta activa para esta materia"
        )
    return oferta


def _to_out(
    ins: "models.inscripcion.Inscripcion"
) -> schemas.inscripcion.InscripcionOut:
    return schemas.inscripcion.InscripcionOut(
        id=cast(int, ins.id),
        alumno_id=cast(int, ins.alumno_id),
        materia_id=ins.oferta.materia_id if ins.oferta else None,
        oferta_materia_id=cast(int, ins.oferta_materia_id),
    )


@router.post("/", response_model=schemas.inscripcion.InscripcionOut)
def inscribir(
    inscripcion: schemas.inscripcion.InscripcionCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role not in ("alumno", "admin"):
        raise HTTPException(status_code=403, detail="No autorizado")
    # Force the student to only enroll themselves
    alumno_id = inscripcion.alumno_id
    if current_user.role == "alumno":
        alumno_id = current_user.user_id
    materia = (
        db.query(models.materia.Materia)
        .filter(models.materia.Materia.id == inscripcion.materia_id)
        .first()
    )
    if not materia:
        raise HTTPException(status_code=404, detail="Materia no encontrada")

    resultado = validar_correlatividades(alumno_id, inscripcion.materia_id, db)
    if not resultado["valido"]:
        pendientes_nombres = []
        for p in resultado["pendientes"]:
            m = (
                db.query(models.materia.Materia)
                .filter(models.materia.Materia.id == p["materia_id"])
                .first()
            )
            nombre = m.nombre if m else f"Materia #{p['materia_id']}"
            accion = "tener aprobada" if p["tipo"] == "aprobada" else "estar cursando"
            pendientes_nombres.append(f"{nombre} ({accion})")
        raise HTTPException(
            status_code=422,
            detail="No cumplís las correlatividades: falta "
            f"{', '.join(pendientes_nombres)}",
        )

    oferta = _oferta_activa_o_404(db, inscripcion.materia_id)

    # ── Bloqueo por mora ──────────────────────────────────────────────
    es_admin = current_user.role == "admin"
    override_mora = (
        inscripcion.override_mora if hasattr(inscripcion, "override_mora") else False
    )
    estado_deuda = verificar_deuda_inscripcion(alumno_id, db, es_admin=es_admin)
    if estado_deuda.bloqueado:
        if es_admin and override_mora:
            # Admin override — registrar en auditoría
            registrar_override_mora(
                alumno_id=alumno_id,
                admin_id=current_user.user_id,
                db=db,
                oferta_materia_id=cast(int, oferta.id),
                motivo="Override manual en inscripción. Cuotas vencidas: "
                f"{estado_deuda.cuotas_vencidas}",
            )
        else:
            detalle_str = "; ".join(
                f"{d.periodo} (vence {d.fecha_vencimiento}, Gs. {d.monto_a_pagar})"
                for d in estado_deuda.detalle[:3]
            )
            raise HTTPException(
                status_code=422,
                detail="Alumno bloqueado por mora: "
                f"{estado_deuda.cuotas_vencidas} cuota(s) vencida(s). "
                f"Detalle: {detalle_str}. "
                "Admin puede usar override_mora=true.",
            )
    # ─────────────────────────────────────────────────────────────────

    existente = (
        db.query(models.inscripcion.Inscripcion)
        .filter(
            models.inscripcion.Inscripcion.alumno_id == alumno_id,
            models.inscripcion.Inscripcion.oferta_materia_id == oferta.id,
        )
        .first()
    )
    if existente:
        raise HTTPException(
            status_code=400, detail="El alumno ya esta inscripto en esta materia"
        )
    # Check for schedule overlap
    from app.services.pensum import verificar_solapamiento_inscripcion

    conflictos = verificar_solapamiento_inscripcion(
        db, alumno_id, inscripcion.materia_id
    )
    if conflictos:
        raise HTTPException(
            status_code=409,
            detail=f"Solapamiento de horario: {', '.join(conflictos)}",
        )
    nueva = models.inscripcion.Inscripcion(
        alumno_id=alumno_id,
        oferta_materia_id=oferta.id,
    )
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return _to_out(nueva)


@router.delete("/{inscripcion_id}")
def desinscribir(
    inscripcion_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    ins = (
        db.query(models.inscripcion.Inscripcion)
        .filter(models.inscripcion.Inscripcion.id == inscripcion_id)
        .first()
    )
    if not ins:
        raise HTTPException(status_code=404, detail="Inscripcion no encontrada")
    if current_user.role == "alumno" and ins.alumno_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    db.delete(ins)
    db.commit()
    return {"detail": "Desinscripto correctamente"}


@router.get("/materia/{materia_id}")
def alumnos_por_materia(
    materia_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    oferta = _oferta_activa_o_404(db, materia_id)
    inscripciones = (
        db.query(models.inscripcion.Inscripcion)
        .filter(models.inscripcion.Inscripcion.oferta_materia_id == oferta.id)
        .all()
    )
    if not inscripciones:
        return []
    alumno_ids = [i.alumno_id for i in inscripciones]
    alumnos_map = {
        u.id: u
        for u in db.query(models.user.User)
        .filter(models.user.User.id.in_(alumno_ids))
        .all()
    }
    result = []
    for i in inscripciones:
        if i.alumno_id is not None:
            alumno = alumnos_map.get(i.alumno_id)
            if alumno:
                result.append(
                    {
                        "inscripcion_id": i.id,
                        "alumno_id": alumno.id,
                        "nombre": alumno.nombre or alumno.username,
                        "username": alumno.username,
                        "email": alumno.email or alumno.username,
                    }
                )
    return result


@router.get("/")
def list_inscripciones(
    alumno_id: Optional[int] = Query(None, description="Filtrar por alumno (admin/profesor)"),
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    q = db.query(models.inscripcion.Inscripcion).options(
        joinedload(models.inscripcion.Inscripcion.oferta)
    )
    if current_user.role == "alumno":
        q = q.filter(models.inscripcion.Inscripcion.alumno_id == current_user.user_id)
    elif alumno_id:
        q = q.filter(models.inscripcion.Inscripcion.alumno_id == alumno_id)
    rows = q.all()
    return [_to_out(i) for i in rows]


@router.post("/promocionar")
def promocionar_grupo(
    body: PromocionarBody,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    """Admin: promueve alumnos de un semestre origen al destino."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")

    M = models.materia.Materia
    O = models.oferta_materia.OfertaMateria
    I = models.inscripcion.Inscripcion

    # Materias origen
    src_materias = (
        db.query(M)
        .filter(
            M.carrera_id == body.carrera_id,
            M.anio == body.desde_anio,
            M.semestre == body.desde_semestre,
        )
        .all()
    )
    if not src_materias:
        raise HTTPException(status_code=404, detail="No hay materias en el semestre origen")

    # Materias destino
    dst_materias = (
        db.query(M)
        .filter(
            M.carrera_id == body.carrera_id,
            M.anio == body.hasta_anio,
            M.semestre == body.hasta_semestre,
        )
        .all()
    )
    if not dst_materias:
        raise HTTPException(status_code=404, detail="No hay materias en el semestre destino")

    src_ids = {m.id for m in src_materias}
    dst_ids = {m.id for m in dst_materias}

    # Alumnos con al menos una inscripcion en origen
    src_ofertas = (
        db.query(O).filter(O.materia_id.in_(src_ids), O.activa == True).all()
    )
    src_oferta_ids = {o.id for o in src_ofertas}
    src_oferta_por_materia = {o.materia_id: o.id for o in src_ofertas}

    alumnos_con_inscripcion = (
        db.query(I.alumno_id)
        .filter(I.oferta_materia_id.in_(src_oferta_ids))
        .distinct()
        .all()
    )
    alumno_ids = {r[0] for r in alumnos_con_inscripcion}

    if not alumno_ids:
        raise HTTPException(status_code=400, detail="No hay alumnos inscriptos en el semestre origen")

    # Ofertas destino
    dst_ofertas = (
        db.query(O).filter(O.materia_id.in_(dst_ids), O.activa == True).all()
    )
    dst_oferta_por_materia = {o.materia_id: o.id for o in dst_ofertas}

    # Inscripciones existentes destino
    dst_oferta_ids = {o.id for o in dst_ofertas}
    existentes = set()
    if dst_oferta_ids:
        rows = (
            db.query(I.alumno_id, I.oferta_materia_id)
            .filter(
                I.alumno_id.in_(list(alumno_ids)),
                I.oferta_materia_id.in_(list(dst_oferta_ids)),
            )
            .all()
        )
        existentes = {(r.alumno_id, r.oferta_materia_id) for r in rows}

    promovidos = 0
    ya_inscriptos = 0
    errores = 0

    for aid in alumno_ids:
        for dst_m in dst_materias:
            oferta_id = dst_oferta_por_materia.get(dst_m.id)
            if not oferta_id:
                errores += 1
                continue
            key = (aid, oferta_id)
            if key in existentes:
                ya_inscriptos += 1
                continue
            db.add(I(alumno_id=aid, oferta_materia_id=oferta_id))
            promovidos += 1

    db.commit()
    return {
        "detail": f"{promovidos} inscripciones creadas, {ya_inscriptos} ya existentes, {errores} errores",
        "promovidos": promovidos,
        "ya_inscriptos": ya_inscriptos,
        "errores": errores,
        "alumnos_afectados": len(alumno_ids),
    }


@router.get("/carrera/{carrera_id}")
def inscripciones_por_carrera(
    carrera_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    """Admin: lista todas las materias de una carrera con sus alumnos inscriptos."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    materias = (
        db.query(models.materia.Materia)
        .filter(models.materia.Materia.carrera_id == carrera_id)
        .order_by(models.materia.Materia.anio, models.materia.Materia.semestre, models.materia.Materia.nombre)
        .all()
    )
    result = []
    for m in materias:
        oferta = (
            db.query(models.oferta_materia.OfertaMateria)
            .filter(
                models.oferta_materia.OfertaMateria.materia_id == m.id,
                models.oferta_materia.OfertaMateria.activa == True,
            )
            .first()
        )
        alumnos = []
        if oferta:
            inscripciones = (
                db.query(models.inscripcion.Inscripcion)
                .filter(models.inscripcion.Inscripcion.oferta_materia_id == oferta.id)
                .all()
            )
            if inscripciones:
                alumno_ids = [i.alumno_id for i in inscripciones]
                alumnos_map = {
                    u.id: u
                    for u in db.query(models.user.User)
                    .filter(models.user.User.id.in_(alumno_ids))
                    .all()
                }
                for i in inscripciones:
                    if i.alumno_id is not None:
                        alumno = alumnos_map.get(i.alumno_id)
                        if alumno:
                            alumnos.append({
                                "inscripcion_id": i.id,
                                "alumno_id": alumno.id,
                                "nombre": alumno.nombre or alumno.username,
                                "username": alumno.username,
                            })
        result.append({
            "materia_id": m.id,
            "materia_nombre": m.nombre,
            "codigo": m.codigo,
            "anio": m.anio,
            "semestre": m.semestre,
            "creditos": m.creditos,
            "alumnos": alumnos,
        })
    return result
