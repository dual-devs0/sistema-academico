"""Tests para POST /asistencias/qr/verificar (registro de asistencia del
alumno vía escaneo del QR emitido por el profesor)."""

from datetime import date, datetime, timedelta, timezone

from jose import jwt

from app.auth import ALGORITHM, SECRET_KEY
from app.models.inscripcion import Inscripcion
from app.models.materia import Materia
from app.models.oferta_materia import OfertaMateria
from app.models.carrera import Carrera
from app.routers.asistencias_router import (
    QR_TOKEN_KIND,
    create_qr_token,
)


def _materia_ajena(db, seed):
    """Crea una materia + oferta que el profesor del seed NO dicta."""
    for obj in db.query(Carrera).all():
        carrera = obj
        break
    materia = Materia(nombre="Materia Ajena", carrera_id=carrera.id, anio=2, semestre=1)
    db.add(materia)
    db.flush()
    oferta = OfertaMateria(
        materia_id=materia.id,
        profesor_id=seed["admin"].id,  # no es el profesor del seed
        periodo="2026-1",
        activa=True,
    )
    db.add(oferta)
    db.commit()
    return materia, oferta


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


# ---------------------------------------------------------------------------
# Seguridad (Fase 1): solo alumnos pueden escanear
# ---------------------------------------------------------------------------


def test_qr_profesor_no_puede_escanear(client, seed, tokens, db):
    _inscribir(db, seed["alumno"].id, seed["oferta"].id)
    qr_token = create_qr_token(seed["materia"].id, seed["oferta"].id)

    res = client.post(
        "/asistencias/qr/verificar",
        json={"qr_token": qr_token},
        headers=_auth(tokens["profesor"]),
    )
    assert res.status_code == 403
    assert res.json()["detail"] == "Solo alumnos pueden escanear"


def test_qr_admin_no_puede_escanear(client, seed, tokens, db):
    _inscribir(db, seed["alumno"].id, seed["oferta"].id)
    qr_token = create_qr_token(seed["materia"].id, seed["oferta"].id)

    res = client.post(
        "/asistencias/qr/verificar",
        json={"qr_token": qr_token},
        headers=_auth(tokens["admin"]),
    )
    assert res.status_code == 403


# ---------------------------------------------------------------------------
# Seguridad (Fase 1): solo el profesor de la materia genera QR
# ---------------------------------------------------------------------------


def test_generar_qr_profesor_de_su_materia_ok(client, seed, tokens):
    res = client.get(
        f"/asistencias/qr/{seed['materia'].id}",
        headers=_auth(tokens["profesor"]),
    )
    assert res.status_code == 200, res.text
    assert "qr_base64" in res.json()


def test_generar_qr_profesor_de_materia_ajena_403(client, seed, tokens, db):
    materia_ajena, _ = _materia_ajena(db, seed)
    res = client.get(
        f"/asistencias/qr/{materia_ajena.id}",
        headers=_auth(tokens["profesor"]),
    )
    assert res.status_code == 403
    assert res.json()["detail"] == "No autorizado para esta materia"


# ---------------------------------------------------------------------------
# Seguridad (Fase 1): toggle/marcar solo sobre materias propias
# ---------------------------------------------------------------------------


def test_marcar_alumno_no_inscripto_403(client, seed, tokens, db):
    res = client.post(
        "/asistencias/profesor/marcar",
        params={
            "materia_id": seed["materia"].id,
            "alumno_id": seed["alumno2"].id,  # alumno2 no está inscripto
            "fecha": "2026-08-07",
            "presente": True,
        },
        headers=_auth(tokens["profesor"]),
    )
    assert res.status_code == 403
    assert "no está inscripto" in res.json()["detail"]


def test_marcar_profesor_materia_ajena_403(client, seed, tokens, db):
    materia_ajena, _ = _materia_ajena(db, seed)
    res = client.post(
        "/asistencias/profesor/marcar",
        params={
            "materia_id": materia_ajena.id,
            "alumno_id": seed["alumno"].id,
            "fecha": "2026-08-07",
            "presente": True,
        },
        headers=_auth(tokens["profesor"]),
    )
    assert res.status_code == 403
    assert res.json()["detail"] == "No autorizado para esta materia"


def test_toggle_profesor_materia_ajena_403(client, seed, tokens, db):
    _inscribir(db, seed["alumno"].id, seed["oferta"].id)
    materia_ajena, oferta_ajena = _materia_ajena(db, seed)
    # Registrar asistencia de un alumno en la materia ajena como admin (lícito),
    # luego intentar togglarla como profesor del seed → 403.
    from app.models.asistencia import Asistencia

    asis = Asistencia(
        user_id=seed["alumno"].id,
        oferta_materia_id=oferta_ajena.id,
        fecha=date.today(),
        presente=True,
    )
    db.add(asis)
    db.commit()
    db.refresh(asis)

    res = client.put(
        f"/asistencias/profesor/toggle/{asis.id}",
        params={"presente": False},
        headers=_auth(tokens["profesor"]),
    )
    assert res.status_code == 403
    assert res.json()["detail"] == "No autorizado para esta materia"
