from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app import models, schemas, database
from app.dependencias import get_current_user

router = APIRouter(prefix="/foro", tags=["foro"])


@router.post("/hilos", response_model=schemas.foro.ForoHiloOut)
def crear_hilo(
    hilo: schemas.foro.ForoHiloCreate,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    if current_user["role"] not in ("admin", "profesor", "alumno"):
        raise HTTPException(status_code=403, detail="No autorizado")
    materia = db.query(models.materia.Materia).filter(models.materia.Materia.id == hilo.materia_id).first()
    if not materia:
        raise HTTPException(status_code=404, detail="Materia no encontrada")
    # Check that user is enrolled in or teaches this materia (unless admin)
    if current_user["role"] == "alumno":
        insc = db.query(models.inscripcion.Inscripcion).filter(
            models.inscripcion.Inscripcion.alumno_id == current_user["user_id"],
            models.inscripcion.Inscripcion.materia_id == hilo.materia_id,
        ).first()
        if not insc:
            raise HTTPException(status_code=403, detail="No estas inscripto en esta materia")
    elif current_user["role"] == "profesor":
        if materia.profesor_id != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="No sos el profesor de esta materia")
    nuevo = models.foro.ForoHilo(
        materia_id=hilo.materia_id,
        titulo=hilo.titulo,
        descripcion=hilo.descripcion,
        creado_por=current_user["user_id"],
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


@router.get("/hilos", response_model=list[schemas.foro.ForoHiloOut])
def listar_hilos(
    materia_id: Optional[int] = Query(None),
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    query = db.query(models.foro.ForoHilo)
    if materia_id is not None:
        query = query.filter(models.foro.ForoHilo.materia_id == materia_id)
    hilos = query.order_by(models.foro.ForoHilo.fijado.desc(), models.foro.ForoHilo.created_at.desc()).all()

    result = []
    for h in hilos:
        creador = db.query(models.user.User).filter(models.user.User.id == h.creado_por).first()
        result.append(schemas.foro.ForoHiloOut(
            id=h.id, materia_id=h.materia_id, titulo=h.titulo,
            descripcion=h.descripcion, creado_por=h.creado_por,
            nombre_creador=creador.nombre or creador.username if creador else None,
            fijado=h.fijado, cerrado=h.cerrado, created_at=h.created_at,
            mensajes=[],
        ))
    return result


@router.get("/hilos/{hilo_id}", response_model=schemas.foro.ForoHiloOut)
def obtener_hilo(
    hilo_id: int,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    hilo = db.query(models.foro.ForoHilo).filter(models.foro.ForoHilo.id == hilo_id).first()
    if not hilo:
        raise HTTPException(status_code=404, detail="Hilo no encontrado")

    creador = db.query(models.user.User).filter(models.user.User.id == hilo.creado_por).first()
    mensajes_q = db.query(models.foro.ForoMensaje).filter(models.foro.ForoMensaje.hilo_id == hilo_id).order_by(models.foro.ForoMensaje.created_at).all()

    mensajes_out = []
    for m in mensajes_q:
        autor = db.query(models.user.User).filter(models.user.User.id == m.user_id).first()
        mensajes_out.append(schemas.foro.ForoMensajeOut(
            id=m.id, hilo_id=m.hilo_id, user_id=m.user_id,
            nombre_usuario=autor.nombre or autor.username if autor else None,
            contenido=m.contenido, created_at=m.created_at,
        ))

    return schemas.foro.ForoHiloOut(
        id=hilo.id, materia_id=hilo.materia_id, titulo=hilo.titulo,
        descripcion=hilo.descripcion, creado_por=hilo.creado_por,
        nombre_creador=creador.nombre or creador.username if creador else None,
        fijado=hilo.fijado, cerrado=hilo.cerrado, created_at=hilo.created_at,
        mensajes=mensajes_out,
    )


@router.put("/hilos/{hilo_id}", response_model=schemas.foro.ForoHiloOut)
def actualizar_hilo(
    hilo_id: int,
    data: schemas.foro.ForoHiloUpdate,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    if current_user["role"] not in ("admin", "profesor"):
        raise HTTPException(status_code=403, detail="No autorizado")
    hilo = db.query(models.foro.ForoHilo).filter(models.foro.ForoHilo.id == hilo_id).first()
    if not hilo:
        raise HTTPException(status_code=404, detail="Hilo no encontrado")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(hilo, key, value)
    db.commit()
    db.refresh(hilo)
    return hilo


@router.delete("/hilos/{hilo_id}")
def eliminar_hilo(
    hilo_id: int,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    if current_user["role"] not in ("admin", "profesor"):
        raise HTTPException(status_code=403, detail="No autorizado")
    hilo = db.query(models.foro.ForoHilo).filter(models.foro.ForoHilo.id == hilo_id).first()
    if not hilo:
        raise HTTPException(status_code=404, detail="Hilo no encontrado")
    db.query(models.foro.ForoMensaje).filter(models.foro.ForoMensaje.hilo_id == hilo_id).delete()
    db.delete(hilo)
    db.commit()
    return {"detail": "Hilo eliminado"}


@router.post("/hilos/{hilo_id}/mensajes", response_model=schemas.foro.ForoMensajeOut)
def crear_mensaje(
    hilo_id: int,
    msg: schemas.foro.ForoMensajeCreate,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    hilo = db.query(models.foro.ForoHilo).filter(models.foro.ForoHilo.id == hilo_id).first()
    if not hilo:
        raise HTTPException(status_code=404, detail="Hilo no encontrado")
    if hilo.cerrado:
        raise HTTPException(status_code=400, detail="El hilo está cerrado")
    # Check that user can post (enrolled/teaches/admin)
    materia = db.query(models.materia.Materia).filter(models.materia.Materia.id == hilo.materia_id).first()
    if current_user["role"] == "alumno":
        insc = db.query(models.inscripcion.Inscripcion).filter(
            models.inscripcion.Inscripcion.alumno_id == current_user["user_id"],
            models.inscripcion.Inscripcion.materia_id == hilo.materia_id,
        ).first()
        if not insc:
            raise HTTPException(status_code=403, detail="No estas inscripto en esta materia")
    elif current_user["role"] == "profesor" and materia:
        if materia.profesor_id != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="No sos el profesor de esta materia")

    nuevo = models.foro.ForoMensaje(
        hilo_id=hilo_id,
        user_id=current_user["user_id"],
        contenido=msg.contenido,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)

    autor = db.query(models.user.User).filter(models.user.User.id == nuevo.user_id).first()
    return schemas.foro.ForoMensajeOut(
        id=nuevo.id, hilo_id=nuevo.hilo_id, user_id=nuevo.user_id,
        nombre_usuario=autor.nombre or autor.username if autor else None,
        contenido=nuevo.contenido, created_at=nuevo.created_at,
    )


@router.delete("/mensajes/{mensaje_id}")
def eliminar_mensaje(
    mensaje_id: int,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    msg = db.query(models.foro.ForoMensaje).filter(models.foro.ForoMensaje.id == mensaje_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Mensaje no encontrado")
    if current_user["role"] not in ("admin",) and current_user["user_id"] != msg.user_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    db.delete(msg)
    db.commit()
    return {"detail": "Mensaje eliminado"}
