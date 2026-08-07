from app.models.puntaje import Puntaje
from app.models.oferta_materia import OfertaMateria
from app.models.materia import Materia
from app.models.pensum_materia import PensumMateria
from app.models.inscripcion import Inscripcion


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_boleta_resumen_shape(client, seed, tokens, db):
    db.add(Puntaje(user_id=seed["alumno"].id, oferta_materia_id=seed["oferta"].id, tipo="directa", valor=8.0, felicitado=True))
    db.commit()

    res = client.get("/boleta/resumen", headers=auth(tokens["alumno"]))
    assert res.status_code == 200
    data = res.json()
    assert data["resumen"]["promedioGlobal"] == 8.0
    assert data["resumen"]["materiasAprobadas"] == 1
    assert data["resumen"]["materiasTotales"] == 1  # sin plan configurado -> fallback a total con nota
    assert len(data["periodos"]) == 1
    periodo = data["periodos"][0]
    assert periodo["etiqueta"] == "1° Semestre 2026 (actual)"
    mat = periodo["materias"][0]
    assert mat["nombre"] == "Programación I"
    assert mat["final"] == 8.0
    assert mat["estado"] == "aprobado"


def test_boleta_resumen_con_plan_estudios(client, seed, tokens, db):
    seed["carrera"].creditos_totales = 10
    pm1 = PensumMateria(carrera_id=seed["carrera"].id, materia_id=seed["materia"].id, semestre=1, creditos=5)
    otra = Materia(nombre="Álgebra", carrera_id=seed["carrera"].id, anio=1, semestre=1)
    db.add_all([pm1, otra])
    db.flush()
    pm2 = PensumMateria(carrera_id=seed["carrera"].id, materia_id=otra.id, semestre=1, creditos=5)
    db.add(pm2)
    db.add(Puntaje(user_id=seed["alumno"].id, oferta_materia_id=seed["oferta"].id, tipo="directa", valor=8.0))
    db.commit()

    res = client.get("/boleta/resumen", headers=auth(tokens["alumno"]))
    assert res.status_code == 200
    resumen = res.json()["resumen"]
    assert resumen["materiasTotales"] == 2
    assert resumen["avanceCarreraPct"] == 50
    assert resumen["faltanParaGraduarse"] == 1


def test_boleta_resumen_profesor_ve_alumno_propio(client, seed, tokens, db):
    db.add(Inscripcion(alumno_id=seed["alumno"].id, oferta_materia_id=seed["oferta"].id))
    db.add(Puntaje(user_id=seed["alumno"].id, oferta_materia_id=seed["oferta"].id, tipo="directa", valor=7.0))
    db.commit()

    res = client.get(f"/boleta/resumen?alumno_id={seed['alumno'].id}", headers=auth(tokens["profesor"]))
    assert res.status_code == 200
    assert res.json()["resumen"]["promedioGlobal"] == 7.0


def test_boleta_resumen_alumno_no_puede_ver_a_otro(client, seed, tokens, db):
    db.add(Puntaje(user_id=seed["alumno"].id, oferta_materia_id=seed["oferta"].id, tipo="directa", valor=7.0))
    db.commit()

    res = client.get(f"/boleta/resumen?alumno_id={seed['alumno'].id}", headers=auth(tokens["alumno2"]))
    assert res.status_code == 403


def test_boleta_pdf_scope_global(client, seed, tokens, db):
    db.add(Puntaje(user_id=seed["alumno"].id, oferta_materia_id=seed["oferta"].id, tipo="directa", valor=9.0, felicitado=True))
    db.commit()

    res = client.get("/boleta/pdf?scope=global", headers=auth(tokens["alumno"]))
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert res.content[:4] == b"%PDF"


def test_boleta_pdf_scope_semestre_actual(client, seed, tokens, db):
    otra_materia = Materia(nombre="Cálculo 1", carrera_id=seed["carrera"].id, anio=1, semestre=1)
    db.add(otra_materia)
    db.flush()
    oferta_vieja = OfertaMateria(materia_id=otra_materia.id, profesor_id=seed["profesor"].id, periodo="2025-2", activa=False)
    db.add(oferta_vieja)
    db.flush()
    db.add(Puntaje(user_id=seed["alumno"].id, oferta_materia_id=oferta_vieja.id, tipo="directa", valor=5.0))
    db.add(Puntaje(user_id=seed["alumno"].id, oferta_materia_id=seed["oferta"].id, tipo="directa", valor=9.0))
    db.commit()

    res = client.get("/boleta/pdf?scope=semestre_actual", headers=auth(tokens["alumno"]))
    assert res.status_code == 200
    assert res.content[:4] == b"%PDF"


def test_boleta_pdf_scope_anio_requiere_anio(client, seed, tokens):
    res = client.get("/boleta/pdf?scope=anio", headers=auth(tokens["alumno"]))
    assert res.status_code == 422


def test_boleta_pdf_scope_anio(client, seed, tokens, db):
    db.add(Puntaje(user_id=seed["alumno"].id, oferta_materia_id=seed["oferta"].id, tipo="directa", valor=8.0))
    db.commit()

    res = client.get("/boleta/pdf?scope=anio&anio=2026", headers=auth(tokens["alumno"]))
    assert res.status_code == 200
    assert res.content[:4] == b"%PDF"


def test_boleta_resumen_requiere_auth(client):
    res = client.get("/boleta/resumen")
    assert res.status_code == 401
