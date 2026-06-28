from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from typing import Union
from app.auth import SECRET_KEY, ALGORITHM

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str     = payload.get("role")
        user_id: int  = payload.get("user_id")
        if username is None or role is None:
            raise HTTPException(status_code=401, detail="Token inválido")
        return {"username": username, "role": role, "user_id": user_id}
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")


def require_role(required_role: Union[str, list[str]]):
    """Dependency factory. Accepts a single role string or a list of roles."""
    allowed = [required_role] if isinstance(required_role, str) else required_role

    def role_checker(current_user=Depends(get_current_user)):
        if current_user["role"] not in allowed:
            raise HTTPException(status_code=403, detail="No autorizado")
        return current_user

    return role_checker
