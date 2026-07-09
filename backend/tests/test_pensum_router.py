from app.models.materia import Materia
from app.models.oferta_materia import OfertaMateria
from app.models.pensum_materia import PensumMateria
from app.models.correlatividad import Correlatividad
from app.models.puntaje import Puntaje


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def _materia_con_oferta(db, seed, nombre):
    m = Materia(nombre=nombre, carrera_id=seed["carrera"].id)
    db.add(m)
    db.flush()
    oferta = OfertaMateria(
        materia_id=m.id, profesor_id=seed["profesor"].id, periodo="2026-1", activa=True
    )
    db.add(oferta)
    db.commit()
    db.refresh(m)
    db.refresh(oferta)
    return m, oferta


def test_agregar_materia_a_malla_admin(client, seed, tokens, db):
    materia, _ = _materia_con_oferta(db, seed, "Malla Materia 1")
    payload = {"materia_id": materia.id, "semestre": 1, "creditos": 6}
    res = client.post(
        f"/pensum/carreras/{seed['carrera'].id}/materias",
        json=payload,
        headers=auth(tokens["admin"]),
    )
    assert res.status_code == 200
    assert res.json()["materia_nombre"] == "Malla Materia 1"


def test_agregar_materia_a_malla_no_admin_403(client, seed, tokens, db):
    materia, _ = _materia_con_oferta(db, seed, "Malla Materia 2")
    payload = {"materia_id": materia.id, "semestre": 1, "creditos": 6}
    res = client.post(
        f"/pensum/carreras/{seed['carrera'].id}/materias",
        json=payload,
        headers=auth(tokens["profesor"]),
    )
    assert res.status_code == 403


def test_agregar_materia_duplicada_400(client, seed, tokens, db):
    materia, _ = _materia_con_oferta(db, seed, "Malla Materia 3")
    payload = {"materia_id": materia.id, "semestre": 1, "creditos": 6}
    r1 = client.post(
        f"/pensum/carreras/{seed['carrera'].id}/materias",
        json=payload,
        headers=auth(tokens["admin"]),
    )
    assert r1.status_code == 200
    r2 = client.post(
        f"/pensum/carreras/{seed['carrera'].id}/materias",
        json=payload,
        headers=auth(tokens["admin"]),
    )
    assert r2.status_code == 400


def test_quitar_materia_de_malla(client, seed, tokens, db):
    materia, _ = _materia_con_oferta(db, seed, "Malla Materia 4")
    payload = {"materia_id": materia.id, "semestre": 1, "creditos": 6}
    res = client.post(
        f"/pensum/carreras/{seed['carrera'].id}/materias",
        json=payload,
        headers=auth(tokens["admin"]),
    )
    pm_id = res.json()["id"]
    res = client.delete(
        f"/pensum/carreras/{seed['carrera'].id}/materias/{pm_id}",
        headers=auth(tokens["admin"]),
    )
    assert res.status_code == 200


def test_crear_correlatividad_autorreferencia_422(client, seed, tokens, db):
    materia, _ = _materia_con_oferta(db, seed, "Malla Materia 5")
    res = client.post(
        "/pensum/correlatividades",
        json={
            "materia_id": materia.id,
            "prerrequisito_id": materia.id,
            "tipo": "aprobada",
        },
        headers=auth(tokens["admin"]),
    )
    assert res.status_code == 422


def test_crear_y_eliminar_correlatividad(client, seed, tokens, db):
    base, _ = _materia_con_oferta(db, seed, "Base Corr")
    avanzada, _ = _materia_con_oferta(db, seed, "Avanzada Corr")
    res = client.post(
        "/pensum/correlatividades",
        json={
            "materia_id": avanzada.id,
            "prerrequisito_id": base.id,
            "tipo": "aprobada",
        },
        headers=auth(tokens["admin"]),
    )
    assert res.status_code == 200
    corr_id = res.json()["id"]

    res = client.delete(
        f"/pensum/correlatividades/{corr_id}", headers=auth(tokens["admin"])
    )
    assert res.status_code == 200


def test_listar_correlatividades_filtra_por_carrera(client, seed, tokens, db):
    base, _ = _materia_con_oferta(db, seed, "Base Corr List")
    avanzada, _ = _materia_con_oferta(db, seed, "Avanzada Corr List")
    db.add(
        PensumMateria(
            carrera_id=seed["carrera"].id,
            materia_id=avanzada.id,
            semestre=2,
            creditos=4,
        )
    )
    db.add(
        Correlatividad(
            materia_id=avanzada.id, prerrequisito_id=base.id, tipo="aprobada"
        )
    )
    db.commit()

    res = client.get(
        f"/pensum/correlatividades?carrera_id={seed['carrera'].id}",
        headers=auth(tokens["alumno"]),
    )
    assert res.status_code == 200
    materias_con_corr = [c["materia_id"] for c in res.json()]
    assert avanzada.id in materias_con_corr


def test_obtener_malla_carrera(client, seed, tokens, db):
    materia, _ = _materia_con_oferta(db, seed, "Malla Materia 6")
    db.add(
        PensumMateria(
            carrera_id=seed["carrera"].id, materia_id=materia.id, semestre=2, creditos=8
        )
    )
    db.commit()

    res = client.get(
        f"/pensum/carreras/{seed['carrera'].id}", headers=auth(tokens["alumno"])
    )
    assert res.status_code == 200
    nombres = [m["materia_nombre"] for m in res.json()]
    assert "Malla Materia 6" in nombres


def test_avance_alumno_estados(client, seed, tokens, db):
    aprobada, oferta_aprobada = _materia_con_oferta(db, seed, "Avance Aprobada")
    bloqueada, _ = _materia_con_oferta(db, seed, "Avance Bloqueada")
    prereq, _ = _materia_con_oferta(db, seed, "Avance Prereq")

    db.add(
        PensumMateria(
            carrera_id=seed["carrera"].id,
            materia_id=aprobada.id,
            semestre=1,
            creditos=5,
        )
    )
    db.add(
        PensumMateria(
            carrera_id=seed["carrera"].id,
            materia_id=bloqueada.id,
            semestre=2,
            creditos=5,
        )
    )
    db.add(
        Puntaje(
            user_id=seed["alumno"].id,
            oferta_materia_id=oferta_aprobada.id,
            tipo="final",
            valor=9.0,
        )
    )
    db.add(
        Correlatividad(
            materia_id=bloqueada.id, prerrequisito_id=prereq.id, tipo="aprobada"
        )
    )
    db.commit()

    res = client.get(
        f"/pensum/alumno/{seed['alumno'].id}/avance", headers=auth(tokens["alumno"])
    )
    assert res.status_code == 200
    por_materia = {a["materia_id"]: a for a in res.json()}
    assert por_materia[aprobada.id]["estado"] == "aprobada"
    assert por_materia[aprobada.id]["pendientes"] == []
    assert por_materia[bloqueada.id]["estado"] == "bloqueada"
    pendientes = por_materia[bloqueada.id]["pendientes"]
    assert len(pendientes) == 1
    assert pendientes[0]["materia_id"] == prereq.id
    assert pendientes[0]["materia_nombre"] == "Avance Prereq"
    assert pendientes[0]["tipo"] == "aprobada"


def test_avance_alumno_no_autorizado_403(client, seed, tokens):
    res = client.get(
        f"/pensum/alumno/{seed['alumno'].id}/avance", headers=auth(tokens["alumno2"])
    )
    assert res.status_code == 403


def test_creditos_alumno(client, seed, tokens, db):
    aprobada, oferta_aprobada = _materia_con_oferta(db, seed, "Creditos Aprobada")
    db.add(
        PensumMateria(
            carrera_id=seed["carrera"].id,
            materia_id=aprobada.id,
            semestre=1,
            creditos=6,
        )
    )
    db.add(
        Puntaje(
            user_id=seed["alumno"].id,
            oferta_materia_id=oferta_aprobada.id,
            tipo="final",
            valor=7.0,
        )
    )
    db.commit()

    res = client.get(
        f"/pensum/alumno/{seed['alumno'].id}/creditos", headers=auth(tokens["admin"])
    )
    assert res.status_code == 200
    assert res.json()["creditos_acumulados"] == 6


def test_inscripcion_bloqueada_por_correlatividad(client, seed, tokens, db):
    base, _ = _materia_con_oferta(db, seed, "Corr Base Inscripcion")
    avanzada, _ = _materia_con_oferta(db, seed, "Corr Avanzada Inscripcion")
    db.add(
        Correlatividad(
            materia_id=avanzada.id, prerrequisito_id=base.id, tipo="aprobada"
        )
    )
    db.commit()

    res = client.post(
        "/inscripciones/",
        json={
            "alumno_id": seed["alumno"].id,
            "materia_id": avanzada.id,
        },
        headers=auth(tokens["alumno"]),
    )
    assert res.status_code == 422
    assert "Corr Base Inscripcion" in res.json()["detail"]


def test_inscripcion_permitida_con_correlatividad_cumplida(client, seed, tokens, db):
    base, oferta_base = _materia_con_oferta(db, seed, "Corr Base OK")
    avanzada, _ = _materia_con_oferta(db, seed, "Corr Avanzada OK")
    db.add(
        Correlatividad(
            materia_id=avanzada.id, prerrequisito_id=base.id, tipo="aprobada"
        )
    )
    db.add(
        Puntaje(
            user_id=seed["alumno"].id,
            oferta_materia_id=oferta_base.id,
            tipo="final",
            valor=8.0,
        )
    )
    db.commit()

    res = client.post(
        "/inscripciones/",
        json={
            "alumno_id": seed["alumno"].id,
            "materia_id": avanzada.id,
        },
        headers=auth(tokens["alumno"]),
    )
    assert res.status_code == 200
