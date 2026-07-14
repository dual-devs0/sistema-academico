"""Tests para la alerta automática de inasistencia crítica (>=25%)."""

from datetime import date, timedelta


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_alerta_se_dispara_al_cruzar_25_por_ciento(client, seed, tokens, monkeypatch):
    calls = []

    def fake_send(background_tasks, emails_to, alumno_nombre, materia_nombre, porcentaje):
        calls.append(
            {
                "emails": emails_to,
                "alumno": alumno_nombre,
                "materia": materia_nombre,
                "porcentaje": porcentaje,
            }
        )

    monkeypatch.setattr(
        "app.routers.asistencias_router.send_alerta_inasistencia_email_bg", fake_send
    )

    base = date(2026, 3, 1)
    # 3 presentes (0% inasistencia)
    for i in range(3):
        res = client.post(
            "/asistencias/",
            json={
                "materia_id": seed["materia"].id,
                "user_id": seed["alumno"].id,
                "fecha": (base + timedelta(days=i)).isoformat(),
                "presente": True,
            },
            headers=_auth(tokens["profesor"]),
        )
        assert res.status_code == 200, res.text

    assert calls == []  # todavía no cruzó el umbral

    # 4ta clase: ausente -> 1/4 = 25% => cruza el umbral, debe alertar
    res = client.post(
        "/asistencias/",
        json={
            "materia_id": seed["materia"].id,
            "user_id": seed["alumno"].id,
            "fecha": (base + timedelta(days=3)).isoformat(),
            "presente": False,
        },
        headers=_auth(tokens["profesor"]),
    )
    assert res.status_code == 200, res.text
    assert len(calls) == 1
    alerta = calls[0]
    assert alerta["porcentaje"] == 25.0
    assert alerta["materia"] == seed["materia"].nombre
    assert seed["alumno"].email in alerta["emails"]
    assert seed["profesor"].email in alerta["emails"]
    assert seed["admin"].email in alerta["emails"]

    # 5ta clase: sigue ausente (2/5 = 40%), ya venía >=25%, no debe reenviar
    res = client.post(
        "/asistencias/",
        json={
            "materia_id": seed["materia"].id,
            "user_id": seed["alumno"].id,
            "fecha": (base + timedelta(days=4)).isoformat(),
            "presente": False,
        },
        headers=_auth(tokens["profesor"]),
    )
    assert res.status_code == 200, res.text
    assert len(calls) == 1  # no se reenvió


def test_alerta_no_se_dispara_bajo_el_umbral(client, seed, tokens, monkeypatch):
    calls = []

    def fake_send(background_tasks, emails_to, alumno_nombre, materia_nombre, porcentaje):
        calls.append(porcentaje)

    monkeypatch.setattr(
        "app.routers.asistencias_router.send_alerta_inasistencia_email_bg", fake_send
    )

    base = date(2026, 4, 1)
    # 1 ausente de 5 clases = 20%, no debe alertar
    for i in range(4):
        res = client.post(
            "/asistencias/",
            json={
                "materia_id": seed["materia"].id,
                "user_id": seed["alumno"].id,
                "fecha": (base + timedelta(days=i)).isoformat(),
                "presente": True,
            },
            headers=_auth(tokens["profesor"]),
        )
        assert res.status_code == 200, res.text

    res = client.post(
        "/asistencias/",
        json={
            "materia_id": seed["materia"].id,
            "user_id": seed["alumno"].id,
            "fecha": (base + timedelta(days=4)).isoformat(),
            "presente": False,
        },
        headers=_auth(tokens["profesor"]),
    )
    assert res.status_code == 200, res.text
    assert calls == []


def test_alerta_lote_dispara_para_alumno_que_cruza_umbral(client, seed, tokens, monkeypatch, db):
    from app.models.asistencia import Asistencia

    calls = []

    def fake_send(background_tasks, emails_to, alumno_nombre, materia_nombre, porcentaje):
        calls.append((alumno_nombre, porcentaje))

    monkeypatch.setattr(
        "app.routers.asistencias_router.send_alerta_inasistencia_email_bg", fake_send
    )

    base = date(2026, 5, 1)
    # Pre-cargar 3 presentes directamente en BD para alumno.
    for i in range(3):
        db.add(
            Asistencia(
                user_id=seed["alumno"].id,
                oferta_materia_id=seed["oferta"].id,
                fecha=base + timedelta(days=i),
                presente=True,
            )
        )
    db.commit()

    # Cargar en lote la 4ta clase como ausente -> cruza 25%.
    res = client.post(
        "/asistencias/lote",
        json={
            "materia_id": seed["materia"].id,
            "fecha": (base + timedelta(days=3)).isoformat(),
            "registros": [
                {"user_id": seed["alumno"].id, "presente": False},
            ],
        },
        headers=_auth(tokens["profesor"]),
    )
    assert res.status_code == 200, res.text
    assert len(calls) == 1
    assert calls[0][1] == 25.0
