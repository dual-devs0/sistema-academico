from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session
from typing import Optional
from app import models, schemas, database
from app.security import hash_password
from app.dependencias import require_role, get_current_user
from app.services.storage import subir_archivo, obtener_url_firmada

router = APIRouter(prefix="/users", tags=["users"])

@router.post("/", response_model=schemas.user.UserOut)
def create_user(user: schemas.user.UserCreate, db: Session = Depends(database.get_db), current_user = Depends(get_current_user)):
    if current_user["role"] != "admin":
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
def get_me(db: Session = Depends(database.get_db), current_user = Depends(get_current_user)):
    user = db.query(models.user.User).filter(models.user.User.id == current_user["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user

@router.get("/", response_model=schemas.user.UserListOut)
def list_users(
    skip: int = 0,
    limit: int = 20,
    q: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    query = db.query(models.user.User)
    if role:
        query = query.filter(models.user.User.role == role)
    if q:
        like = f"%{q}%"
        query = query.filter(or_(
            models.user.User.nombre.ilike(like),
            models.user.User.email.ilike(like),
            models.user.User.username.ilike(like),
        ))
    total = query.count()
    items = query.offset(skip).limit(limit).all()
    return {"items": items, "total": total}

@router.get("/secure")
def secure_endpoint(current_user = Depends(get_current_user)):
    return {"msg": f"Hola {current_user['username']}, tu rol es {current_user['role']}"}

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

    user = db.query(models.user.User).filter(models.user.User.id == current_user["user_id"]).first()
    user.foto_url = key
    db.commit()
    return {"storage_key": key, "url": obtener_url_firmada(key)}


@router.patch("/{user_id}", response_model=schemas.user.UserOut)
def update_user(user_id: int, data: schemas.user.UserUpdate, background_tasks: BackgroundTasks, db: Session = Depends(database.get_db), current_user = Depends(get_current_user)):
    from app.email_utils import send_password_reset_email_bg

    if current_user["role"] != "admin" and current_user["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    user = db.query(models.user.User).filter(models.user.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    update_data = data.model_dump(exclude_unset=True)
    new_password = update_data.get("password")
    
    # Non-admin users cannot change role, carrera_id, or es_becado
    if current_user["role"] != "admin":
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
            send_password_reset_email_bg(background_tasks, user.email, user.nombre or user.username, new_password)
        except Exception as e:
            print("Error sending password reset email:", e)
            
    return user

@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(database.get_db), current_user = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    user = db.query(models.user.User).filter(models.user.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    # Delete related records first
    db.query(models.asistencia.Asistencia).filter(models.asistencia.Asistencia.user_id == user_id).delete()
    db.query(models.puntaje.Puntaje).filter(models.puntaje.Puntaje.user_id == user_id).delete()
    db.query(models.inscripcion.Inscripcion).filter(models.inscripcion.Inscripcion.alumno_id == user_id).delete()
    db.query(models.foro.ForoMensaje).filter(models.foro.ForoMensaje.user_id == user_id).delete()
    db.query(models.apunte.Apunte).filter(models.apunte.Apunte.user_id == user_id).delete()
    db.delete(user)
    db.commit()
    return {"detail": "Usuario eliminado correctamente"}
