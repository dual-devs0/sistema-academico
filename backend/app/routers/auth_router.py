import hashlib
import secrets
import string
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, BackgroundTasks, Cookie, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app import models, schemas, database, security
from app.auth import (
    create_access_token,
    create_refresh_token,
    REFRESH_TOKEN_EXPIRE_DAYS,
)
from app.email_utils import send_password_reset_email_bg
from app.models.refresh_token import RefreshToken

router = APIRouter(prefix="/auth", tags=["auth"])

# Simple in-memory rate limiter for password reset (3 attempts per 15 min)
_password_reset_attempts: dict[str, list[float]] = {}
_PASSWORD_RESET_MAX_ATTEMPTS = 3
_PASSWORD_RESET_WINDOW_SECONDS = 15 * 60


def _check_password_reset_rate_limit(key: str):
    import time
    now = time.time()
    window_start = now - _PASSWORD_RESET_WINDOW_SECONDS
    if key in _password_reset_attempts:
        _password_reset_attempts[key] = [t for t in _password_reset_attempts[key] if t > window_start]
        if len(_password_reset_attempts[key]) >= _PASSWORD_RESET_MAX_ATTEMPTS:
            raise HTTPException(status_code=429, detail="Demasiados intentos. Intenta de nuevo en 15 minutos.")
        _password_reset_attempts[key].append(now)
    else:
        _password_reset_attempts[key] = [now]


def _set_refresh_cookie(response: Response, raw_token: str) -> None:
    response.set_cookie(
        key="refresh_token",
        value=raw_token,
        httponly=True,
        secure=False,  # cambiar a True en producción con HTTPS
        samesite="lax",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/",  # "/" para que Vite proxy (/api/auth/refresh) y prod lo envíen
    )


@router.post("/login")
def login(
    user: schemas.user.LoginRequest,
    response: Response,
    db: Session = Depends(database.get_db),
):
    db_user = db.query(models.user.User).filter(models.user.User.username == user.username).first()
    if not db_user or not security.verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=400, detail="Credenciales inválidas")

    access_token = create_access_token(
        {"sub": db_user.username, "role": db_user.role, "user_id": db_user.id}
    )
    raw, hashed = create_refresh_token()
    rt = RefreshToken(
        usuario_id=db_user.id,
        token_hash=hashed,
        expira_en=datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(rt)
    db.commit()

    _set_refresh_cookie(response, raw)
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/refresh")
def refresh(
    response: Response,
    db: Session = Depends(database.get_db),
    refresh_token: str | None = Cookie(default=None),
):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No hay refresh token")

    hashed = hashlib.sha256(refresh_token.encode()).hexdigest()
    now = datetime.now(timezone.utc)

    rt = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.token_hash == hashed,
            RefreshToken.revocado == False,
            RefreshToken.expira_en > now,
        )
        .first()
    )
    if not rt:
        raise HTTPException(status_code=401, detail="Refresh token inválido o expirado")

    # Rotación: revocar token actual antes de emitir el nuevo
    rt.revocado = True
    db.flush()

    db_user = db.query(models.user.User).filter(models.user.User.id == rt.usuario_id).first()
    access_token = create_access_token(
        {"sub": db_user.username, "role": db_user.role, "user_id": db_user.id}
    )
    raw, hashed_new = create_refresh_token()
    new_rt = RefreshToken(
        usuario_id=db_user.id,
        token_hash=hashed_new,
        expira_en=now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(new_rt)
    db.commit()

    _set_refresh_cookie(response, raw)
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/logout")
def logout(
    response: Response,
    db: Session = Depends(database.get_db),
    refresh_token: str | None = Cookie(default=None),
):
    if refresh_token:
        hashed = hashlib.sha256(refresh_token.encode()).hexdigest()
        rt = db.query(RefreshToken).filter(RefreshToken.token_hash == hashed).first()
        if rt:
            rt.revocado = True
            db.commit()

    response.delete_cookie(key="refresh_token", path="/")
    return {"detail": "Sesión cerrada"}


@router.post("/recuperar-contrasena")
def recuperar_contrasena(
    req: schemas.user.RecuperarRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db),
):
    _check_password_reset_rate_limit(req.username_or_email)

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

    return {"detail": "Si el usuario existe, recibirás un email con instrucciones."}
