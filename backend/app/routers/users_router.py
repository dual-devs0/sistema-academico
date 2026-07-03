import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File
from sqlalchemy.orm import Session
from app import models, schemas, database
from app.security import hash_password
from app.dependencias import require_role, get_current_user

router = APIRouter(prefix="/users", tags=["users"])

AVATAR_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "static", "avatars")
AVATAR_DIR = os.path.abspath(AVATAR_DIR)
ALLOWED_EXT = {".png", ".jpg", ".jpeg", ".webp"}

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

@router.post("/me/foto", response_model=schemas.user.UserOut)
def subir_foto_perfil(
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user),
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail="Formato no soportado. Usá PNG, JPG o WEBP.")

    contents = file.file.read()
    if len(contents) > 3 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="La imagen supera el límite de 3MB.")

    os.makedirs(AVATAR_DIR, exist_ok=True)
    filename = f"user{current_user['user_id']}_{uuid.uuid4().hex[:8]}{ext}"
    with open(os.path.join(AVATAR_DIR, filename), "wb") as f:
        f.write(contents)

    user = db.query(models.user.User).filter(models.user.User.id == current_user["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    user.foto_url = f"/static/avatars/{filename}"
    db.commit()
    db.refresh(user)
    return user


@router.get("/", response_model=list[schemas.user.UserOut])
def list_users(db: Session = Depends(database.get_db), current_user = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    return db.query(models.user.User).all()

@router.get("/secure")
def secure_endpoint(current_user = Depends(get_current_user)):
    return {"msg": f"Hola {current_user['username']}, tu rol es {current_user['role']}"}

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