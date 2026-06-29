import secrets
import string
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schemas, database, security
from app.auth import create_access_token
from app.email_utils import send_password_reset_email_bg

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login")
def login(user: schemas.user.LoginRequest, db: Session = Depends(database.get_db)):
    db_user = db.query(models.user.User).filter(models.user.User.username == user.username).first()
    if not db_user or not security.verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=400, detail="Credenciales inválidas")
    token = create_access_token({"sub": db_user.username, "role": db_user.role, "user_id": db_user.id})
    return {"access_token": token, "token_type": "bearer"}

@router.post("/recuperar-contrasena")
def recuperar_contrasena(
    req: schemas.user.RecuperarRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db),
):
    db_user = db.query(models.user.User).filter(
        (models.user.User.username == req.username_or_email) |
        (models.user.User.email == req.username_or_email)
    ).first()

    if not db_user:
        raise HTTPException(status_code=404, detail="No se encontró un usuario con ese dato.")

    alphabet = string.ascii_letters + string.digits
    new_password = ''.join(secrets.choice(alphabet) for _ in range(10))
    db_user.hashed_password = security.hash_password(new_password)
    db.commit()

    user_name = db_user.nombre or db_user.username
    user_email = db_user.email
    if user_email:
        send_password_reset_email_bg(background_tasks, user_email, user_name, new_password)
    else:
        print(f"Usuario {db_user.username} no tiene email. Nueva contraseña: {new_password}")

    return {"detail": "Si el usuario existe, recibirás un email con instrucciones."}
