from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schemas, database
from app.security import hash_password
from app.dependencias import require_role

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

@router.get("/", response_model=list[schemas.user.UserOut])
def list_users(db: Session = Depends(database.get_db), current_user = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    return db.query(models.user.User).all()

@router.get("/secure")
def secure_endpoint(current_user = Depends(get_current_user)):
    return {"msg": f"Hola {current_user['username']}, tu rol es {current_user['role']}"}

@router.patch("/{user_id}", response_model=schemas.user.UserOut)
def update_user(user_id: int, data: schemas.user.UserUpdate, db: Session = Depends(database.get_db), current_user = Depends(get_current_user)):
    if current_user["role"] != "admin" and current_user["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="No autorizado")
    user = db.query(models.user.User).filter(models.user.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    update_data = data.model_dump(exclude_unset=True)
    if "password" in update_data:
        user.hashed_password = hash_password(update_data.pop("password"))
    for key, value in update_data.items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(database.get_db), current_user = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    user = db.query(models.user.User).filter(models.user.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    db.delete(user)
    db.commit()
    return {"detail": "Usuario eliminado"}
