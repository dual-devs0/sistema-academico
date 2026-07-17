import hashlib
import os
import secrets
import string
from datetime import datetime, timezone, timedelta

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Cookie,
    Depends,
    Header,
    HTTPException,
    Request,
    Response,
)
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

_COOKIE_SECURE = os.getenv("COOKIE_SECURE", "true").lower() == "true"

_password_reset_attempts: dict[str, list[float]] = {}
_PASSWORD_RESET_MAX_ATTEMPTS = 3
_PASSWORD_RESET_WINDOW_SECONDS = 15 * 60


def _check_password_reset_rate_limit(key: str):
    import time

    now = time.time()
    window_start = now - _PASSWORD_RESET_WINDOW_SECONDS
    if key in _password_reset_attempts:
        _password_reset_attempts[key] = [
            t for t in _password_reset_attempts[key] if t > window_start
        ]
        if len(_password_reset_attempts[key]) >= _PASSWORD_RESET_MAX_ATTEMPTS:
            raise HTTPException(
                status_code=429,
                detail="Demasiados intentos. Intenta de nuevo en 15 minutos.",
            )
        _password_reset_attempts[key].append(now)
    else:
        _password_reset_attempts[key] = [now]


_login_failed_attempts: dict[str, list[float]] = {}
_LOGIN_MAX_ATTEMPTS = 5
_LOGIN_WINDOW_SECONDS = 15 * 60


def _check_login_rate_limit(key: str):
    """Bloquea si `key` (username + IP) acumuló demasiados intentos fallidos
    de login recientes. No cuenta contra el límite hasta que falle el login
    (ver `_register_login_failure` / `_clear_login_attempts`)."""
    import time

    now = time.time()
    window_start = now - _LOGIN_WINDOW_SECONDS
    attempts = [t for t in _login_failed_attempts.get(key, []) if t > window_start]
    _login_failed_attempts[key] = attempts
    if len(attempts) >= _LOGIN_MAX_ATTEMPTS:
        raise HTTPException(
            status_code=429,
            detail="Demasiados intentos fallidos. Intenta de nuevo en 15 minutos.",
        )


def _register_login_failure(key: str):
    import time

    _login_failed_attempts.setdefault(key, []).append(time.time())


def _clear_login_attempts(key: str):
    _login_failed_attempts.pop(key, None)


def _set_refresh_cookie(response: Response, raw_token: str) -> None:
    response.set_cookie(
        key="refresh_token",
        value=raw_token,
        httponly=True,
        secure=_COOKIE_SECURE,
        samesite="lax",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/",
    )


def _set_csrf_cookie(response: Response, csrf_token: str) -> None:
    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        httponly=False,
        secure=_COOKIE_SECURE,
        samesite="lax",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/",
    )


def _issue_csrf_token(response: Response) -> str:
    csrf_token = secrets.token_hex(32)
    _set_csrf_cookie(response, csrf_token)
    return csrf_token


@router.post("/login")
def login(
    user: schemas.user.LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(database.get_db),
):
    client_ip = request.client.host if request.client else "unknown"
    rate_limit_key = f"{user.username}:{client_ip}"
    _check_login_rate_limit(rate_limit_key)

    db_user = (
        db.query(models.user.User)
        .filter(models.user.User.username == user.username)
        .first()
    )
    if not db_user or not security.verify_password(
        user.password, db_user.hashed_password
    ):
        _register_login_failure(rate_limit_key)
        raise HTTPException(status_code=400, detail="Credenciales inválidas")

    _clear_login_attempts(rate_limit_key)

    access_token = create_access_token(
        {"sub": db_user.username, "role": db_user.role, "user_id": db_user.id}
    )
    raw, hashed = create_refresh_token()
    rt = RefreshToken(
        usuario_id=db_user.id,
        token_hash=hashed,
        expira_en=datetime.now(timezone.utc)
        + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(rt)
    db.commit()

    _set_refresh_cookie(response, raw)
    csrf_token = _issue_csrf_token(response)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "refresh_token": raw,
        "csrf_token": csrf_token,
    }


@router.post("/refresh")
def refresh(
    response: Response,
    body: schemas.user.RefreshRequest | None = None,
    db: Session = Depends(database.get_db),
    refresh_token: str | None = Cookie(default=None),
    csrf_cookie: str | None = Cookie(default=None, alias="csrf_token"),
    x_csrf_token: str | None = Header(default=None),
):
    used_cookie_flow = not (body and body.refresh_token)
    token = (body.refresh_token if body else None) or refresh_token
    if not token:
        raise HTTPException(status_code=401, detail="No hay refresh token")

    if used_cookie_flow:
        if not csrf_cookie or not x_csrf_token or not secrets.compare_digest(
            csrf_cookie, x_csrf_token
        ):
            raise HTTPException(status_code=403, detail="CSRF token inválido o ausente")

    hashed = hashlib.sha256(token.encode()).hexdigest()
    now = datetime.now(timezone.utc)

    rt = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.token_hash == hashed,
            RefreshToken.revocado == False,  # noqa: E712
            RefreshToken.expira_en > now,
        )
        .first()
    )
    if not rt:
        raise HTTPException(status_code=401, detail="Refresh token inválido o expirado")

    rt.revocado = True
    db.flush()

    db_user = (
        db.query(models.user.User).filter(models.user.User.id == rt.usuario_id).first()
    )
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
    csrf_token = _issue_csrf_token(response)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "refresh_token": raw,
        "csrf_token": csrf_token,
    }


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
    response.delete_cookie(key="csrf_token", path="/")
    return {"detail": "Sesión cerrada"}


@router.post("/recuperar-contrasena")
def recuperar_contrasena(
    req: schemas.user.RecuperarRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db),
):
    _check_password_reset_rate_limit(req.username_or_email)

    # Buscar usuario por username o email
    db_user = (
        db.query(models.user.User)
        .filter(
            (models.user.User.username == req.username_or_email)
            | (models.user.User.email == req.username_or_email)
        )
        .first()
    )

    if not db_user:
        raise HTTPException(
            status_code=404, detail="No se encontró un usuario con ese dato."
        )

    # Verificación adicional si se envió matrícula (que puede ser el username o legajo en el sistema)
    if req.matricula and db_user.username != req.matricula:
        raise HTTPException(
            status_code=400, detail="Los datos proporcionados no coinciden."
        )

    alphabet = string.ascii_letters + string.digits
    new_password = "".join(secrets.choice(alphabet) for _ in range(10))
    db_user.hashed_password = security.hash_password(new_password)
    db.commit()

    user_name = db_user.nombre or db_user.username
    user_email = db_user.email
    if user_email:
        send_password_reset_email_bg(
            background_tasks, user_email, user_name, new_password
        )

    return {"detail": "Si el usuario existe y los datos coinciden, recibirás un email con instrucciones."}


@router.post("/registro", response_model=schemas.user.RegistroResponse)
def registro(
    req: schemas.user.RegistroRequest,
    db: Session = Depends(database.get_db),
):
    """
    Registra la solicitud de un nuevo alumno para acceder al sistema.
    En una app real, esto podría crear un usuario inactivo o guardar en una tabla de solicitudes.
    """
    # Verificar si ya existe el usuario
    db_user = (
        db.query(models.user.User)
        .filter(models.user.User.username == req.matricula)
        .first()
    )
    if db_user:
        raise HTTPException(
            status_code=400, detail="La matrícula ya se encuentra registrada."
        )

    # Por ahora, simplemente retornamos éxito simulando que la solicitud fue recibida
    # Para completarlo, podríamos insertar en una tabla "SolicitudesRegistro"
    return {
        "detail": "Solicitud de registro enviada exitosamente. Será procesada por secretaría.",
        "solicitud_id": 12345
    }
