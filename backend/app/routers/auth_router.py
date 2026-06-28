from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schemas, database, security
from app.auth import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login")
def login(user: schemas.user.LoginRequest, db: Session = Depends(database.get_db)):
    db_user = db.query(models.user.User).filter(models.user.User.username == user.username).first()
    if not db_user or not security.verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=400, detail="Credenciales inválidas")
    token = create_access_token({"sub": db_user.username, "role": db_user.role, "user_id": db_user.id})
    return {"access_token": token, "token_type": "bearer"}
