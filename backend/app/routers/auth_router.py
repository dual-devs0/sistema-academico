from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schemas, database, security
from app.auth import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post(
    "/login",
    responses={
        400: {"description": "Credenciales inválidas"}
    }
)
def login(user: schemas.user.UserCreate, db: Session = Depends(database.SessionLocal)):
    db_user = db.query(models.user.User).filter(models.user.User.username == user.username).first()
    if not db_user or not security.verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=400, detail="Credenciales inválidas")
    token = create_access_token({"sub": db_user.username, "role": db_user.role})
    return {"access_token": token, "token_type": "bearer"}
