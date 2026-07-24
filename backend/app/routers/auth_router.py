import hashlib
import os
import secrets
import threading
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
from app.email_utils import send_reset_link_email_bg, send_welcome_email_bg, send_password_reset_email_bg
from app.models.refresh_token import RefreshToken
from app.models.password_reset_token import PasswordResetToken
from app.models.token_blacklist import TokenBlacklist
from app.rate_limiter import limiter

router = APIRouter(prefix="/auth", tags=["auth"])

_COOKIE_SECURE = os.getenv("COOKIE_SECURE", "true").lower() == "true"

_password_reset_attempts: dict[str, list[float]] = {}
_PASSWORD_RESET_MAX_ATTEMPTS = 3
_PASSWORD_RESET_WINDOW_SECONDS = 15 * 60
_password_reset_lock = threading.Lock()


def _check_password_reset_rate_limit(key: str):
    import time

    now = time.time()
    window_start = now - _PASSWORD_RESET_WINDOW_SECONDS
    with _password_reset_lock:
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
_login_lock = threading.Lock()


def _check_login_rate_limit(key: str):
    """Bloquea si `key` (username + IP) acumuló demasiados intentos fallidos
    de login recientes. No cuenta contra el límite hasta que falle el login
    (ver `_register_login_failure` / `_clear_login_attempts`)."""
    import time

    now = time.time()
    window_start = now - _LOGIN_WINDOW_SECONDS
    attempts = [t for t in _login_failed_attempts.get(key, []) if t > window_start]
    with _login_lock:
        _login_failed_attempts[key] = attempts
        if len(attempts) >= _LOGIN_MAX_ATTEMPTS:
            raise HTTPException(
                status_code=429,
                detail="Demasiados intentos fallidos. Intenta de nuevo en 15 minutos.",
            )


def _register_login_failure(key: str):
    import time

    with _login_lock:
        _login_failed_attempts.setdefault(key, []).append(time.time())


def _clear_login_attempts(key: str):
    with _login_lock:
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
        user.password, str(db_user.hashed_password)
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
        "csrf_token": csrf_token,
    }


@router.post("/refresh")
@limiter.limit("10/minute")
def refresh(
    request: Request,
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

    setattr(rt, 'revocado', True)
    db.flush()

    db_user = (
        db.query(models.user.User).filter(models.user.User.id == rt.usuario_id).first()
    )
    # AUDIT-FIX B-6: guard contra None antes de acceder a atributos
    if db_user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
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
        "csrf_token": csrf_token,
    }


@router.post("/logout")
def logout(
    response: Response,
    request: Request,
    db: Session = Depends(database.get_db),
    refresh_token: str | None = Cookie(default=None),
):
    # Revocar refresh token
    if refresh_token:
        hashed = hashlib.sha256(refresh_token.encode()).hexdigest()
        rt = db.query(RefreshToken).filter(RefreshToken.token_hash == hashed).first()
        if rt:
            setattr(rt, 'revocado', True)
            db.commit()

    # Revocar access token (jti) si está presente en el header
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            from app.auth import SECRET_KEY, ALGORITHM
            from jose import jwt
            payload = jwt.decode(auth_header[7:], SECRET_KEY, algorithms=[ALGORITHM])
            jti = payload.get("jti")
            exp = payload.get("exp")
            if jti and exp:
                from datetime import datetime, timezone
                bl = TokenBlacklist(
                    jti=jti,
                    expires_at=datetime.fromtimestamp(exp, tz=timezone.utc),
                )
                db.add(bl)
                db.commit()
        except Exception:
            pass

    response.delete_cookie(key="refresh_token", path="/")
    response.delete_cookie(key="csrf_token", path="/")
    return {"detail": "Sesión cerrada"}


@router.post("/recuperar-contrasena")
@limiter.limit("3/15minutes")
def recuperar_contrasena(
    request: Request,
    req: schemas.user.RecuperarRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db),
):
    _check_password_reset_rate_limit(req.username_or_email)

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

    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

    reset_token = PasswordResetToken(
        usuario_id=db_user.id,
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    db.add(reset_token)
    db.commit()

    user_name: str = str(db_user.nombre or db_user.username)
    user_email: str | None = str(db_user.email) if db_user.email else None
    if user_email:
        send_reset_link_email_bg(
            background_tasks, user_email, user_name, raw_token
        )

    return {"detail": "Si el usuario existe, recibirás un email con instrucciones."}


@router.post("/reset-password")
@limiter.limit("10/minute")
def reset_password(
    request: Request,
    req: schemas.user.ResetPasswordRequest,
    db: Session = Depends(database.get_db),
):
    token_hash = hashlib.sha256(req.token.encode()).hexdigest()

    reset_token = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.used == False,  # noqa: E712
            PasswordResetToken.expires_at > datetime.now(timezone.utc),
        )
        .first()
    )

    if not reset_token:
        raise HTTPException(
            status_code=400,
            detail="Token inválido o expirado. Solicitá un nuevo restablecimiento de contraseña.",
        )

    db_user = (
        db.query(models.user.User)
        .filter(models.user.User.id == reset_token.usuario_id)
        .first()
    )
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    setattr(db_user, 'hashed_password', security.hash_password(req.new_password))
    setattr(reset_token, 'used', True)
    db.commit()

    return {"detail": "Contraseña actualizada correctamente."}


@router.post("/registro")
@limiter.limit("3/hour")
def solicitar_registro(
    request: Request,
    req: schemas.user.RegistroRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db),
):
    """Activación de cuenta pre-creada por un admin: el alumno/profesor
    confirma cédula + matrícula (username). Se envía un email de bienvenida
    sin contraseña. El usuario debe usar "Recuperar contraseña" para establecerla."""
    _check_password_reset_rate_limit(req.matricula)

    db_user = (
        db.query(models.user.User)
        .filter(
            models.user.User.username == req.matricula,
            models.user.User.cedula == req.documento,
        )
        .first()
    )

    if not db_user:
        raise HTTPException(
            status_code=404,
            detail="No se encontró una cuenta con esos datos. Contactá a la administración.",
        )

    user_name: str = str(db_user.nombre or db_user.username)
    user_email: str | None = str(db_user.email) if db_user.email else None
    if user_email:
        send_welcome_email_bg(
            background_tasks, user_email, user_name
        )

    return {"detail": "Si los datos son correctos, recibirás un email con instrucciones."}
