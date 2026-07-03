import os
import secrets
from datetime import datetime, timedelta
from jose import jwt

# Use a strong default for development; must be configured in production
_SECRET_KEY_ENV = os.getenv("JWT_SECRET", "")
if not _SECRET_KEY_ENV:
    import warnings
    _SECRET_KEY_ENV = secrets.token_hex(32)
    warnings.warn("JWT_SECRET no configurado. Usando clave temporal generada. Configurá JWT_SECRET en .env para producción.")
SECRET_KEY = _SECRET_KEY_ENV
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRES_MINUTES", "60"))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": datetime.utcnow(), "jti": secrets.token_hex(16)})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
