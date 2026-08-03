from app.models.puntaje import Puntaje
from app.models.oferta_materia import OfertaMateria
from app.models.materia import Materia
from app.models.pensum_materia import PensumMateria


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_reporte_notas_global_agrupa_por_semestre(client, seed, tokens, db):
    Puntaje(user_id=seed["alumno"].id, oferta_materia_id=seed["oferta"].id, tipo="directa", valor=8.0).__class__
    p = Puntaje(user_id=seed["alumno"].id, oferta_materia_id=seed["oferta"].id, tipo="directa", valor=8.0)
    db.add(p)
    db.commit()

    res = client.get("/alumno/reporte-notas", headers=auth(tokens["alumno"]))
    assert res.status_code == 200
    data = res.json()
    assert data["alumno"]["nombre"] == "Alumno Test"
    assert data["metricas"]["promedio_general"] == 8.0
    assert data["metricas"]["materias_aprobadas"] == 1
    assert len(data["semestres"]) == 1
    assert data["semestres"][0]["periodo"] == "2026-1"
    assert data["semestres"][0]["materias"][0]["materia_nombre"] == "Programación I"
    assert data["recursadas"] == []


def test_reporte_notas_filtra_por_semestre(client, seed, tokens, db):
    otra_materia = Materia(nombre="Cálculo 1", carrera_id=seed["carrera"].id, anio=1, semestre=1)
    db.add(otra_materia)
    db.flush()
    oferta_vieja = OfertaMateria(materia_id=otra_materia.id, profesor_id=seed["profesor"].id, periodo="2025-2", activa=False)
    db.add(oferta_vieja)
    db.flush()
    db.add(Puntaje(user_id=seed["alumno"].id, oferta_materia_id=oferta_vieja.id, tipo="directa", valor=5.0))
    db.add(Puntaje(user_id=seed["alumno"].id, oferta_materia_id=seed["oferta"].id, tipo="directa", valor=9.0))
    db.commit()

    res = client.get("/alumno/reporte-notas?semestre=2026-1", headers=auth(tokens["alumno"]))
    assert res.status_code == 200
    data = res.json()
    assert len(data["semestres"]) == 1
    assert data["semestres"][0]["periodo"] == "2026-1"
    # metricas siguen siendo GLOBALES aunque se filtre la tabla
    assert data["metricas"]["promedio_general"] == 7.0


def test_reporte_notas_detecta_recursada(client, seed, tokens, db):
    oferta_2 = OfertaMateria(materia_id=seed["materia"].id, profesor_id=seed["profesor"].id, periodo="2026-2", activa=True)
    db.add(oferta_2)
    db.flush()
    db.add(Puntaje(user_id=seed["alumno"].id, oferta_materia_id=seed["oferta"].id, tipo="directa", valor=3.0))
    db.add(Puntaje(user_id=seed["alumno"].id, oferta_materia_id=oferta_2.id, tipo="directa", valor=7.0, felicitado=False))
    db.commit()

    res = client.get("/alumno/reporte-notas", headers=auth(tokens["alumno"]))
    assert res.status_code == 200
    data = res.json()
    assert len(data["recursadas"]) == 1
    rec = data["recursadas"][0]
    assert rec["materia_nombre"] == "Programación I"
    assert len(rec["intentos"]) == 2
    vigente = next(i for i in rec["intentos"] if i["vigente"])
    assert vigente["periodo"] == "2026-2"
    assert vigente["promedio"] == 7.0
    # la vigente es la del semestre mas reciente, aparece en la tabla de ese semestre
    sem = next(s for s in data["semestres"] if s["periodo"] == "2026-2")
    assert sem["materias"][0]["recursada"] is True


def test_reporte_notas_creditos_plan(client, seed, tokens, db):
    seed["carrera"].creditos_totales = 10
    pm1 = PensumMateria(carrera_id=seed["carrera"].id, materia_id=seed["materia"].id, semestre=1, creditos=5)
    otra = Materia(nombre="Álgebra", carrera_id=seed["carrera"].id, anio=1, semestre=1)
    db.add_all([pm1, otra])
    db.flush()
    pm2 = PensumMateria(carrera_id=seed["carrera"].id, materia_id=otra.id, semestre=1, creditos=5)
    db.add(pm2)
    db.add(Puntaje(user_id=seed["alumno"].id, oferta_materia_id=seed["oferta"].id, tipo="directa", valor=8.0))
    db.commit()

    res = client.get("/alumno/reporte-notas", headers=auth(tokens["alumno"]))
    assert res.status_code == 200
    met = res.json()["metricas"]
    assert met["total_materias_plan"] == 2
    assert met["materias_aprobadas_plan"] == 1
    assert met["avance_pct"] == 50
    assert met["faltan"] == 1


def test_reporte_notas_pdf_descarga(client, seed, tokens, db):
    db.add(Puntaje(user_id=seed["alumno"].id, oferta_materia_id=seed["oferta"].id, tipo="directa", valor=9.0, felicitado=True))
    db.commit()

    res = client.get("/alumno/reporte-notas/pdf", headers=auth(tokens["alumno"]))
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert res.content[:4] == b"%PDF"


def test_reporte_notas_requiere_auth(client):
    res = client.get("/alumno/reporte-notas")
    assert res.status_code == 401
