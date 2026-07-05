import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from jose import jwt

_SECRET_KEY_ENV = os.getenv("JWT_SECRET", "")
if not _SECRET_KEY_ENV:
    raise RuntimeError(
        "JWT_SECRET no configurado. "
        "Agregá JWT_SECRET=<clave-de-64-hex> al archivo .env antes de arrancar el servidor."
    )
SECRET_KEY = _SECRET_KEY_ENV
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRES_MINUTES", "15"))
REFRESH_TOKEN_EXPIRE_DAYS = 7


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc), "jti": secrets.token_hex(16)})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token() -> tuple[str, str]:
    """Retorna (token_raw, token_hash). Persistir solo el hash en BD."""
    raw = secrets.token_hex(32)
    hashed = hashlib.sha256(raw.encode()).hexdigest()
    return raw, hashed