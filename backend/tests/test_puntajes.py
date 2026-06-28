from app.models.puntaje import Puntaje


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def _seed_puntajes(db, seed):
    p1 = Puntaje(
        user_id=seed["alumno"].id,
        materia_id=seed["materia"].id,
        tipo="parcial1",
        valor=8.5,
        editado_por=seed["admin"].id,
    )
    p2 = Puntaje(
        user_id=seed["admin"].id,
        materia_id=seed["materia"].id,
        tipo="parcial1",
        valor=9.0,
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
        "user_id":    seed["alumno"].id,
        "materia_id": seed["materia"].id,
        "tipo":       "parcial2",
        "valor":      7.5,
    }
    res = client.post("/puntajes/", json=payload, headers=auth(tokens["admin"]))
    assert res.status_code == 200
    data = res.json()
    assert data["user_id"]    == seed["alumno"].id
    assert data["materia_id"] == seed["materia"].id
    assert data["tipo"]       == "parcial2"
    assert float(data["valor"]) == 7.5
