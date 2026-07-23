from app.models.materia import Materia
from app.models.oferta_materia import OfertaMateria
from app.models.pensum_materia import PensumMateria
from app.models.puntaje import Puntaje


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def _materia_en_pensum(db, seed, nombre, creditos=4):
    m = Materia(nombre=nombre, carrera_id=seed["carrera"].id)
    db.add(m)
    db.flush()
    oferta = OfertaMateria(
        materia_id=m.id, profesor_id=seed["profesor"].id, periodo="2026-1", activa=True
    )
    db.add(oferta)
    db.add(
        PensumMateria(
            carrera_id=seed["carrera"].id,
            materia_id=m.id,
            semestre=1,
            creditos=creditos,
        )
    )
    db.commit()
    db.refresh(m)
    db.refresh(oferta)
    return m, oferta


def test_cerrar_materia_admin_ok(client, seed, tokens, db):
    materia, oferta = _materia_en_pensum(db, seed, "Cerrar OK", creditos=6)
    db.add(
        Puntaje(
            user_id=seed["alumno"].id,
            oferta_materia_id=oferta.id,
            tipo="final1",
            valor=40.0,
        )
    )
    db.commit()

    res = client.post(
        "/expediente/cerrar-materia",
        json={
            "alumno_id": seed["alumno"].id,
            "oferta_materia_id": oferta.id,
        },
        headers=auth(tokens["admin"]),
    )
    assert res.status_code == 200
    body = res.json()
    assert body["materia_nombre"] == "Cerrar OK"
    assert body["creditos"] == 6
    assert body["condicion"] == "aprobada"
    assert body["nota_final"] == 8.0


def test_cerrar_materia_no_admin_403(client, seed, tokens, db):
    materia, oferta = _materia_en_pensum(db, seed, "Cerrar No Admin")
    res = client.post(
        "/expediente/cerrar-materia",
        json={
            "alumno_id": seed["alumno"].id,
            "oferta_materia_id": oferta.id,
        },
        headers=auth(tokens["profesor"]),
    )
    assert res.status_code == 403


def test_cerrar_materia_fuera_del_pensum_404(client, seed, tokens, db):
    m = Materia(nombre="Fuera de Pensum", carrera_id=seed["carrera"].id)
    db.add(m)
    db.flush()
    oferta = OfertaMateria(
        materia_id=m.id, profesor_id=seed["profesor"].id, periodo="2026-1", activa=True
    )
    db.add(oferta)
    db.flush()
    db.add(
        Puntaje(
            user_id=seed["alumno"].id,
            oferta_materia_id=oferta.id,
            tipo="final1",
            valor=40.0,
        )
    )
    db.commit()
    db.refresh(oferta)

    res = client.post(
        "/expediente/cerrar-materia",
        json={
            "alumno_id": seed["alumno"].id,
            "oferta_materia_id": oferta.id,
        },
        headers=auth(tokens["admin"]),
    )
    assert res.status_code == 404


def test_cerrar_materia_sin_notas_422(client, seed, tokens, db):
    materia, oferta = _materia_en_pensum(db, seed, "Sin Notas")
    res = client.post(
        "/expediente/cerrar-materia",
        json={
            "alumno_id": seed["alumno"].id,
            "oferta_materia_id": oferta.id,
        },
        headers=auth(tokens["admin"]),
    )
    assert res.status_code == 422


def test_cerrar_materia_es_upsert_rectificacion(client, seed, tokens, db):
    materia, oferta = _materia_en_pensum(db, seed, "Rectificar")
    db.add(
        Puntaje(
            user_id=seed["alumno"].id,
            oferta_materia_id=oferta.id,
            tipo="final1",
            valor=25.0,
        )
    )
    db.commit()

    r1 = client.post(
        "/expediente/cerrar-materia",
        json={
            "alumno_id": seed["alumno"].id,
            "oferta_materia_id": oferta.id,
        },
        headers=auth(tokens["admin"]),
    )
    assert r1.json()["condicion"] == "reprobada"
    id1 = r1.json()["id"]

    puntaje = db.query(Puntaje).filter(Puntaje.oferta_materia_id == oferta.id).first()
    puntaje.valor = 45.0
    db.commit()

    r2 = client.post(
        "/expediente/cerrar-materia",
        json={
            "alumno_id": seed["alumno"].id,
            "oferta_materia_id": oferta.id,
        },
        headers=auth(tokens["admin"]),
    )
    assert r2.status_code == 200
    assert r2.json()["id"] == id1
    assert r2.json()["condicion"] == "aprobada"
    assert r2.json()["nota_final"] == 9.0


def test_ppa_self_or_admin_403(client, seed, tokens):
    res = client.get(
        f"/expediente/alumno/{seed['alumno'].id}/ppa", headers=auth(tokens["alumno2"])
    )
    assert res.status_code == 403


def test_ppa_endpoint_ok(client, seed, tokens, db):
    materia, oferta = _materia_en_pensum(db, seed, "PPA Endpoint", creditos=4)
    db.add(
        Puntaje(
            user_id=seed["alumno"].id,
            oferta_materia_id=oferta.id,
            tipo="final1",
            valor=40.0,
        )
    )
    db.commit()
    client.post(
        "/expediente/cerrar-materia",
        json={
            "alumno_id": seed["alumno"].id,
            "oferta_materia_id": oferta.id,
        },
        headers=auth(tokens["admin"]),
    )

    res = client.get(
        f"/expediente/alumno/{seed['alumno'].id}/ppa", headers=auth(tokens["alumno"])
    )
    assert res.status_code == 200
    assert res.json() == {"ppa": 8.0, "creditos_computados": 4}


def test_expediente_alumno_endpoint(client, seed, tokens, db):
    materia, oferta = _materia_en_pensum(db, seed, "Expediente Endpoint", creditos=4)
    db.add(
        Puntaje(
            user_id=seed["alumno"].id,
            oferta_materia_id=oferta.id,
            tipo="final1",
            valor=40.0,
        )
    )
    db.commit()
    client.post(
        "/expediente/cerrar-materia",
        json={
            "alumno_id": seed["alumno"].id,
            "oferta_materia_id": oferta.id,
        },
        headers=auth(tokens["admin"]),
    )

    res = client.get(
        f"/expediente/alumno/{seed['alumno'].id}", headers=auth(tokens["admin"])
    )
    assert res.status_code == 200
    body = res.json()
    assert len(body["materias"]) == 1
    assert body["materias"][0]["materia_nombre"] == "Expediente Endpoint"
    assert len(body["semestres"]) == 1
    assert body["semestres"][0]["periodo"] == "2026-1"
    assert body["semestres"][0]["materias_aprobadas"] == 1


def test_regularidad_endpoint(client, seed, tokens, db):
    materia, oferta = _materia_en_pensum(db, seed, "Regularidad Endpoint", creditos=4)
    db.add(
        Puntaje(
            user_id=seed["alumno"].id,
            oferta_materia_id=oferta.id,
            tipo="final1",
            valor=40.0,
        )
    )
    db.commit()
    client.post(
        "/expediente/cerrar-materia",
        json={
            "alumno_id": seed["alumno"].id,
            "oferta_materia_id": oferta.id,
        },
        headers=auth(tokens["admin"]),
    )

    res = client.get(
        f"/expediente/alumno/{seed['alumno'].id}/regularidad",
        headers=auth(tokens["admin"]),
    )
    assert res.status_code == 200
    assert res.json()["estado"] == "activo"
