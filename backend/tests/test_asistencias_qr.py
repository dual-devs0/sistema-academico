"""Tests para POST /asistencias/qr/verificar (registro de asistencia del
alumno vía escaneo del QR emitido por el profesor)."""

from datetime import datetime, timedelta, timezone

from jose import jwt

from app.auth import ALGORITHM, SECRET_KEY
from app.models.inscripcion import Inscripcion
from app.routers.asistencias_router import (
    QR_TOKEN_KIND,
    create_qr_token,
)


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _inscribir(db, alumno_id: int, oferta_id: int) -> None:
    ins = Inscripcion(alumno_id=alumno_id, oferta_materia_id=oferta_id)
    db.add(ins)
    db.commit()


# ---------------------------------------------------------------------------
# Éxito
# ---------------------------------------------------------------------------


def test_qr_verificar_exito(client, seed, tokens, db):
    _inscribir(db, seed["alumno"].id, seed["oferta"].id)
    qr_token = create_qr_token(seed["materia"].id, seed["oferta"].id)

    res = client.post(
        "/asistencias/qr/verificar",
        json={"qr_token": qr_token},
        headers=_auth(tokens["alumno"]),
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["materia_nombre"] == seed["materia"].nombre
    assert data["presentes"] == 1
    assert data["ausentes"] == 0
    assert "fecha" in data
    assert "hora_registro" in data


# ---------------------------------------------------------------------------
# QR inválido / expirado / kind incorrecto
# ---------------------------------------------------------------------------


def test_qr_token_invalido_retorna_400(client, seed, tokens, db):
    _inscribir(db, seed["alumno"].id, seed["oferta"].id)
    res = client.post(
        "/asistencias/qr/verificar",
        json={"qr_token": "not-a-jwt"},
        headers=_auth(tokens["alumno"]),
    )
    assert res.status_code == 400
    assert "inválido" in res.json()["detail"].lower() or "expirado" in res.json()["detail"].lower()


def test_qr_token_expirado_retorna_400(client, seed, tokens, db):
    _inscribir(db, seed["alumno"].id, seed["oferta"].id)
    now = datetime.now(timezone.utc)
    payload = {
        "kind": QR_TOKEN_KIND,
        "materia_id": seed["materia"].id,
        "oferta_id": seed["oferta"].id,
        "iat": now - timedelta(minutes=30),
        "exp": now - timedelta(minutes=15),
    }
    expired = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    res = client.post(
        "/asistencias/qr/verificar",
        json={"qr_token": expired},
        headers=_auth(tokens["alumno"]),
    )
    assert res.status_code == 400


def test_qr_token_kind_incorrecto_retorna_400(client, seed, tokens, db):
    _inscribir(db, seed["alumno"].id, seed["oferta"].id)
    now = datetime.now(timezone.utc)
    payload = {
        "kind": "algo_diferente",
        "materia_id": seed["materia"].id,
        "oferta_id": seed["oferta"].id,
        "iat": now,
        "exp": now + timedelta(minutes=15),
    }
    bad = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    res = client.post(
        "/asistencias/qr/verificar",
        json={"qr_token": bad},
        headers=_auth(tokens["alumno"]),
    )
    assert res.status_code == 400


# ---------------------------------------------------------------------------
# Alumno no inscripto
# ---------------------------------------------------------------------------


def test_qr_alumno_no_inscripto_retorna_403(client, seed, tokens):
    # NO inscribimos al alumno.
    qr_token = create_qr_token(seed["materia"].id, seed["oferta"].id)
    res = client.post(
        "/asistencias/qr/verificar",
        json={"qr_token": qr_token},
        headers=_auth(tokens["alumno"]),
    )
    assert res.status_code == 403


# ---------------------------------------------------------------------------
# Duplicado en el mismo día
# ---------------------------------------------------------------------------


def test_qr_asistencia_duplicada_retorna_409(client, seed, tokens, db):
    _inscribir(db, seed["alumno"].id, seed["oferta"].id)
    qr_token = create_qr_token(seed["materia"].id, seed["oferta"].id)

    r1 = client.post(
        "/asistencias/qr/verificar",
        json={"qr_token": qr_token},
        headers=_auth(tokens["alumno"]),
    )
    assert r1.status_code == 200

    r2 = client.post(
        "/asistencias/qr/verificar",
        json={"qr_token": qr_token},
        headers=_auth(tokens["alumno"]),
    )
    assert r2.status_code == 409
