from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app import models, schemas, database
from app.security import hash_password
from app.dependencias import get_current_user

router = APIRouter(prefix="/users", tags=["users"])

@router.post("/", response_model=schemas.user.UserOut)
def create_user(user: schemas.user.UserCreate, db: Session = Depends(database.SessionLocal)):
    new_user = models.user.User(
        username=user.username,
        hashed_password=hash_password(user.password),
        role=user.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user) 
    return new_user

@router.get("/", response_model=list[schemas.user.UserOut])
def list_users(db: Session = Depends(database.SessionLocal)):
    return db.query(models.user.User).all()

# 🔒 Endpoint protegido con JWT
@router.get("/secure")
def secure_endpoint(current_user = Depends(get_current_user)):
    return {"msg": f"Hola {current_user['username']}, tu rol es {current_user['role']}"}
