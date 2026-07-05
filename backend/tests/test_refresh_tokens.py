"""
Tests para el esquema de autenticación con refresh tokens httpOnly.
Cubre: login, refresh, logout, revocación, rotación, retrocompatibilidad.
"""
import hashlib
import pytest
from datetime import datetime, timezone, timedelta
from jose import jwt

from app.auth import SECRET_KEY, ALGORITHM


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _decode(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


def _get_cookie(response, name: str) -> str | None:
    for header_name, header_val in response.headers.items():
        if header_name.lower() == "set-cookie" and f"{name}=" in header_val:
            for part in header_val.split(";"):
                part = part.strip()
                if part.startswith(f"{name}="):
                    return part[len(f"{name}="):]
    return None


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

def test_login_retorna_access_token(client, seed):
    res = client.post("/auth/login", json={"username": "admin_test", "password": "admin123"})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_access_token_expira_en_15_min(client, seed):
    res = client.post("/auth/login", json={"username": "admin_test", "password": "admin123"})
    token = res.json()["access_token"]
    payload = _decode(token)
    exp = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
    iat = datetime.fromtimestamp(payload["iat"], tz=timezone.utc)
    delta_minutes = (exp - iat).total_seconds() / 60
    assert 14 <= delta_minutes <= 16  # 15 min con margen


def test_login_setea_cookie_httponly(client, seed):
    res = client.post("/auth/login", json={"username": "admin_test", "password": "admin123"})
    assert res.status_code == 200
    # TestClient expone cookies en res.cookies
    assert "refresh_token" in res.cookies
    # Verificar atributos httponly (header crudo)
    set_cookie = next(
        (v for k, v in res.headers.items() if k.lower() == "set-cookie" and "refresh_token=" in v),
        None
    )
    assert set_cookie is not None
    assert "HttpOnly" in set_cookie
    assert "SameSite=lax" in set_cookie.lower() or "samesite=lax" in set_cookie.lower()


def test_login_guarda_refresh_token_en_bd(client, seed, db):
    from app.models.refresh_token import RefreshToken
    client.post("/auth/login", json={"username": "alumno_test", "password": "alumno123"})
    rt = db.query(RefreshToken).filter(RefreshToken.revocado == False).first()
    assert rt is not None
    assert rt.token_hash  # solo el hash, nunca el raw


# ---------------------------------------------------------------------------
# Refresh
# ---------------------------------------------------------------------------

def test_refresh_valido_emite_nuevo_access_token(client, seed):
    login = client.post("/auth/login", json={"username": "alumno_test", "password": "alumno123"})
    # cookie se envía automáticamente en TestClient con follow_redirects
    res = client.post("/auth/refresh")
    assert res.status_code == 200
    assert "access_token" in res.json()


def test_refresh_rota_token_revoca_anterior(client, seed, db):
    from app.models.refresh_token import RefreshToken
    client.post("/auth/login", json={"username": "alumno_test", "password": "alumno123"})
    client.post("/auth/refresh")
    # El token anterior debe estar revocado
    revocados = db.query(RefreshToken).filter(RefreshToken.revocado == True).count()
    assert revocados >= 1


def test_refresh_sin_cookie_retorna_401(client, seed):
    res = client.post("/auth/refresh")
    assert res.status_code == 401


def test_refresh_token_revocado_retorna_401(client, seed, db):
    from app.models.refresh_token import RefreshToken
    client.post("/auth/login", json={"username": "alumno_test", "password": "alumno123"})
    # Revocar manualmente todos los tokens
    db.query(RefreshToken).update({"revocado": True})
    db.commit()
    res = client.post("/auth/refresh")
    assert res.status_code == 401


def test_refresh_token_expirado_retorna_401(client, seed, db):
    from app.models.refresh_token import RefreshToken
    client.post("/auth/login", json={"username": "alumno_test", "password": "alumno123"})
    # Expirar todos los tokens
    pasado = datetime.now(timezone.utc) - timedelta(days=1)
    db.query(RefreshToken).update({"expira_en": pasado})
    db.commit()
    res = client.post("/auth/refresh")
    assert res.status_code == 401


# ---------------------------------------------------------------------------
# Logout
# ---------------------------------------------------------------------------

def test_logout_revoca_refresh_token_en_bd(client, seed, db):
    from app.models.refresh_token import RefreshToken
    client.post("/auth/login", json={"username": "alumno_test", "password": "alumno123"})
    res = client.post("/auth/logout")
    assert res.status_code == 200
    # Todos los tokens del usuario deben estar revocados
    activos = db.query(RefreshToken).filter(RefreshToken.revocado == False).count()
    assert activos == 0


def test_logout_limpia_cookie(client, seed):
    client.post("/auth/login", json={"username": "alumno_test", "password": "alumno123"})
    res = client.post("/auth/logout")
    set_cookie = next(
        (v for k, v in res.headers.items() if k.lower() == "set-cookie" and "refresh_token=" in v),
        None
    )
    # La cookie debe borrarse (max-age=0 o expires en pasado)
    assert set_cookie is not None
    assert 'max-age=0' in set_cookie.lower() or 'expires=' in set_cookie.lower()


def test_refresh_despues_de_logout_retorna_401(client, seed):
    client.post("/auth/login", json={"username": "alumno_test", "password": "alumno123"})
    client.post("/auth/logout")
    res = client.post("/auth/refresh")
    assert res.status_code == 401
