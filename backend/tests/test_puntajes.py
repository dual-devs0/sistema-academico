from datetime import date, timedelta

from app.models.puntaje import Puntaje
from app.models.asistencia import Asistencia


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def _seed_asistencias(db, seed, presentes: int, ausentes: int):
    inicio = date(2026, 3, 1)
    dia = 0
    for _ in range(presentes):
        db.add(Asistencia(
            user_id=seed["alumno"].id,
            oferta_materia_id=seed["oferta"].id,
            fecha=inicio + timedelta(days=dia),
            presente=True,
        ))
        dia += 1
    for _ in range(ausentes):
        db.add(Asistencia(
            user_id=seed["alumno"].id,
            oferta_materia_id=seed["oferta"].id,
            fecha=inicio + timedelta(days=dia),
            presente=False,
        ))
        dia += 1
    db.commit()


def _seed_puntajes(db, seed):
    p1 = Puntaje(
        user_id=seed["alumno"].id,
        oferta_materia_id=seed["oferta"].id,
        tipo="parcial1",
        valor=17.0,
        editado_por=seed["admin"].id,
    )
    p2 = Puntaje(
        user_id=seed["admin"].id,
        oferta_materia_id=seed["oferta"].id,
        tipo="parcial1",
        valor=18.0,
        editado_por=seed["admin"].id,
    )
    db.add_all([p1, p2])
    db.commit()
    return p1, p2


def test_alumno_sees_only_own_puntajes(client, seed, tokens, db):
    _seed_puntajes(db, seed)

    res = client.get("/puntajes/", headers=auth(tokens["alumno"]))
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 1
    assert data[0]["user_id"] == seed["alumno"].id


def test_admin_sees_all_puntajes(client, seed, tokens, db):
    _seed_puntajes(db, seed)

    res = client.get("/puntajes/", headers=auth(tokens["admin"]))
    assert res.status_code == 200
    assert len(res.json()) == 2


def test_create_puntaje(client, seed, tokens):
    payload = {
        "user_id": seed["alumno"].id,
        "materia_id": seed["materia"].id,
        "tipo": "parcial2",
        "valor": 7.5,
    }
    res = client.post("/puntajes/", json=payload, headers=auth(tokens["admin"]))
    assert res.status_code == 200
    data = res.json()
    assert data["user_id"] == seed["alumno"].id
    assert data["materia_id"] == seed["materia"].id
    assert data["tipo"] == "parcial2"
    assert float(data["valor"]) == 7.5


def test_profesor_bloqueado_nota_final_sin_asistencia_minima(client, seed, tokens, db):
    """Regularidad (Art. 24): profesor no puede cargar nota final con <75% asistencia."""
    _seed_asistencias(db, seed, presentes=5, ausentes=10)  # 33%

    payload = {
        "user_id": seed["alumno"].id,
        "materia_id": seed["materia"].id,
        "tipo": "directa",
        "valor": 4,
    }
    res = client.post("/puntajes/", json=payload, headers=auth(tokens["profesor"]))
    assert res.status_code == 403
    assert "asistencia" in res.json()["detail"].lower()


def test_profesor_permitido_nota_final_con_asistencia_suficiente(client, seed, tokens, db):
    _seed_asistencias(db, seed, presentes=9, ausentes=1)  # 90%

    payload = {
        "user_id": seed["alumno"].id,
        "materia_id": seed["materia"].id,
        "tipo": "directa",
        "valor": 4,
    }
    res = client.post("/puntajes/", json=payload, headers=auth(tokens["profesor"]))
    assert res.status_code == 200


def test_profesor_permitido_parcial_sin_asistencia_minima(client, seed, tokens, db):
    """El gate solo aplica a notas finales, no a parciales/practico."""
    _seed_asistencias(db, seed, presentes=2, ausentes=10)  # 17%

    payload = {
        "user_id": seed["alumno"].id,
        "materia_id": seed["materia"].id,
        "tipo": "parcial1",
        "valor": 15,
    }
    res = client.post("/puntajes/", json=payload, headers=auth(tokens["profesor"]))
    assert res.status_code == 200


def test_admin_puede_forzar_nota_final_sin_asistencia_minima(client, seed, tokens, db):
    """Un admin puede forzar la carga aunque el alumno no cumpla el minimo."""
    _seed_asistencias(db, seed, presentes=1, ausentes=10)  # 9%

    payload = {
        "user_id": seed["alumno"].id,
        "materia_id": seed["materia"].id,
        "tipo": "directa",
        "valor": 3,
    }
    res = client.post("/puntajes/", json=payload, headers=auth(tokens["admin"]))
    assert res.status_code == 200


def test_profesor_permitido_nota_final_sin_registros_de_asistencia(client, seed, tokens):
    """Sin clases registradas todavia no hay base para juzgar regularidad -- no bloquea."""
    payload = {
        "user_id": seed["alumno"].id,
        "materia_id": seed["materia"].id,
        "tipo": "directa",
        "valor": 4,
    }
    res = client.post("/puntajes/", json=payload, headers=auth(tokens["profesor"]))
    assert res.status_code == 200


def test_estadisticas_materia_sin_notas_no_rompe(client, seed, tokens):
    """Materia sin notas cargadas devuelve estructura reducida, no 500."""
    res = client.get(
        f"/puntajes/materia/{seed['materia'].id}/estadisticas",
        headers=auth(tokens["admin"]),
    )
    assert res.status_code == 200
    data = res.json()
    assert data["materia_id"] == seed["materia"].id
    assert data["total_alumnos"] == 0
    assert data["promedio_grupo"] == 0
    assert data["distribucion"] == {}
    assert data["aprobados"] == 0
    assert data["en_riesgo"] == 0


def test_estadisticas_materia_con_notas(client, seed, tokens, db):
    """Con notas cargadas, el endpoint agrega correctamente."""
    _seed_puntajes(db, seed)

    res = client.get(
        f"/puntajes/materia/{seed['materia'].id}/estadisticas",
        headers=auth(tokens["admin"]),
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_notas"] == 2
    assert data["total_alumnos"] == 2
    assert data["aprobados"] == 2
    assert data["en_riesgo"] == 0
