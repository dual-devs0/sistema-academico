from datetime import datetime, timezone
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    BackgroundTasks,
    UploadFile,
    File,
    Query,
)
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload
from typing import Optional
from app import models, schemas, database
from app.security import hash_password
from app.dependencias import get_current_user
from app.models.refresh_token import RefreshToken
from app.services.storage import subir_archivo, obtener_url_firmada

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/stats")
def users_stats(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")

    U = models.user.User

    role_counts = {
        row.role: row.cnt
        for row in db.query(U.role, func.count(U.id).label("cnt"))
        .group_by(U.role)
        .all()
    }

    total_becados = db.query(U).filter(U.es_becado.is_(True)).count()

    now = datetime.now(timezone.utc)
    six_months_ago = now.replace(month=now.month - 6 if now.month > 6 else now.month + 6, year=now.year - 1 if now.month <= 6 else now.year)

    rows = (
        db.query(
            func.date_trunc("month", U.created_at).label("month"),
            func.count(U.id).label("cnt"),
        )
        .filter(U.created_at >= six_months_ago)
        .group_by(func.date_trunc("month", U.created_at))
        .order_by(func.date_trunc("month", U.created_at))
        .all()
    )

    crecimiento_mensual: list[dict] = []
    for r in rows:
        month_str = r.month.strftime("%Y-%m") if r.month else ""
        crecimiento_mensual.append({"month": month_str, "count": r.cnt})

    return {
        "total_alumnos": role_counts.get("alumno", 0),
        "total_profesores": role_counts.get("profesor", 0),
        "total_admins": role_counts.get("admin", 0),
        "total_becados": total_becados,
        "crecimiento_mensual": crecimiento_mensual,
    }


@router.post("/", response_model=schemas.user.UserOut)
def create_user(
    user: schemas.user.UserCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    new_user = models.user.User(
        username=user.username,
        hashed_password=hash_password(user.password),
        role=user.role,
        nombre=user.nombre or "",
        email=user.email,
        carrera_id=user.carrera_id,
        es_becado=user.es_becado or False,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.get("/me", response_model=schemas.user.UserOut)
def get_me(
    db: Session = Depends(database.get_db), current_user=Depends(get_current_user)
):
    user = (
        db.query(models.user.User)
        .filter(models.user.User.id == current_user.user_id)
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if user.foto_url:
        user.foto_url = obtener_url_firmada(user.foto_url)
    return user


@router.get("/{user_id}", response_model=schemas.user.UserOut)
def get_user(
    user_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    user = db.query(models.user.User).filter(models.user.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user


@router.get("/{user_id}/materias")
def get_user_materias(
    user_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    user = db.query(models.user.User).filter(models.user.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    O = models.oferta_materia.OfertaMateria
    M = models.materia.Materia
    C = models.carrera.Carrera

    results = (
        db.query(O, M, C)
        .join(M, M.id == O.materia_id)
        .outerjoin(C, C.id == M.carrera_id)
        .filter(O.profesor_id == user_id)
        .order_by(O.periodo.desc(), M.anio, M.semestre)
        .all()
    )

    return [
        {
            "id": o.id,
            "materia_id": m.id,
            "materia_nombre": m.nombre,
            "carrera_id": m.carrera_id,
            "carrera_nombre": c.nombre if c else None,
            "anio": m.anio,
            "semestre": m.semestre,
            "periodo": o.periodo,
            "activa": o.activa,
        }
        for o, m, c in results
    ]


@router.get("/", response_model=schemas.user.UserListOut)
def list_users(
    skip: int = 0,
    limit: int = 20,
    q: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    es_becado: Optional[bool] = Query(None),
    carrera_id: Optional[int] = Query(None),
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    query = db.query(models.user.User)
    if role:
        query = query.filter(models.user.User.role == role)
    if es_becado is not None:
        query = query.filter(models.user.User.es_becado.is_(True))
    if carrera_id is not None:
        query = query.filter(models.user.User.carrera_id == carrera_id)
    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(
                models.user.User.nombre.ilike(like),
                models.user.User.email.ilike(like),
                models.user.User.username.ilike(like),
            )
        )
    total = query.count()
    items = query.offset(skip).limit(limit).all()
    return {"items": items, "total": total}


@router.get("/secure")
def secure_endpoint(current_user=Depends(get_current_user)):
    return {"msg": f"Hola {current_user.username}, tu rol es {current_user.role}"}


@router.post("/me/foto")
async def upload_foto_perfil(
    foto: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    contenido = await foto.read()
    try:
        key = subir_archivo(contenido, foto.filename or "foto.jpg", "foto_perfil")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    user = (
        db.query(models.user.User)
        .filter(models.user.User.id == current_user.user_id)
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    user.foto_url = key
    db.commit()
    return {"storage_key": key, "url": obtener_url_firmada(key)}


@router.patch("/{user_id}", response_model=schemas.user.UserOut)
def update_user(
    user_id: int,
    data: schemas.user.UserUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    from app.email_utils import send_password_reset_email_bg

    if current_user.role != "admin" and current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    user = db.query(models.user.User).filter(models.user.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    update_data = data.model_dump(exclude_unset=True)
    new_password = update_data.get("password")

    # Non-admin users cannot change role, carrera_id, or es_becado
    if current_user.role != "admin":
        for forbidden in ("role", "carrera_id", "es_becado"):
            update_data.pop(forbidden, None)

    if "password" in update_data:
        user.hashed_password = hash_password(update_data.pop("password"))

    for key, value in update_data.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)

    if new_password and user.email:
        try:
            send_password_reset_email_bg(
                background_tasks, user.email, user.nombre or user.username, new_password
            )
        except Exception as e:
            print("Error sending password reset email:", e)

    return user


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    user = db.query(models.user.User).filter(models.user.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    # Delete related records first
    db.query(RefreshToken).filter(
        RefreshToken.usuario_id == user_id
    ).delete()
    db.query(models.asistencia.Asistencia).filter(
        models.asistencia.Asistencia.user_id == user_id
    ).delete()
    db.query(models.puntaje.Puntaje).filter(
        models.puntaje.Puntaje.user_id == user_id
    ).delete()
    db.query(models.inscripcion.Inscripcion).filter(
        models.inscripcion.Inscripcion.alumno_id == user_id
    ).delete()
    db.query(models.foro.ForoMensaje).filter(
        models.foro.ForoMensaje.user_id == user_id
    ).delete()
    db.query(models.apunte.Apunte).filter(
        models.apunte.Apunte.user_id == user_id
    ).delete()
    db.delete(user)
    db.commit()
    return {"detail": "Usuario eliminado correctamente"}
