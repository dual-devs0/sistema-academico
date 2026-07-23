from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError
from typing import Union
from app.auth import SECRET_KEY, ALGORITHM
from app.schemas.current_user_schema import CurrentUser
from app.models.token_blacklist import TokenBlacklist

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def get_blacklist_db():
    """Hook so tests can override which DB to use for blacklist checks."""
    from app.database import SessionLocal
    return SessionLocal()


def get_current_user(token: str = Depends(oauth2_scheme)) -> CurrentUser:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        role = payload.get("role")
        user_id = payload.get("user_id")
        jti = payload.get("jti")
        if username is None or role is None or user_id is None:
            raise HTTPException(status_code=401, detail="Token inválido")

        if jti:
            try:
                db = get_blacklist_db()
                try:
                    blacklisted = db.query(TokenBlacklist).filter(
                        TokenBlacklist.jti == jti
                    ).first()
                    if blacklisted:
                        raise HTTPException(status_code=401, detail="Token revocado")
                finally:
                    db.close()
            except HTTPException:
                raise
            except Exception as exc:
                import logging
                logging.getLogger("dependencias").warning(
                    "Blacklist check failed: %s", exc
                )

        return CurrentUser(username=username, role=role, user_id=user_id)
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")
    except ValidationError:
        raise HTTPException(status_code=401, detail="Token inválido")


def require_role(required_role: Union[str, list[str]]):
    """Dependency factory. Accepts a single role string or a list of roles."""
    allowed = [required_role] if isinstance(required_role, str) else required_role

    def role_checker(current_user: CurrentUser = Depends(get_current_user)):
        if current_user.role not in allowed:
            raise HTTPException(status_code=403, detail="No autorizado")
        return current_user

    return role_checker
