"""Tests para la exportación RUE-ES (MEC): matrícula y trayecto académico."""

import csv
import io
from datetime import date


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_matricula_requiere_admin(client, seed, tokens):
    res = client.get(
        "/reportes/rue-es/matricula", headers=_auth(tokens["profesor"])
    )
    assert res.status_code == 403


def test_matricula_exporta_csv_con_alumnos(client, seed, tokens):
    res = client.get("/reportes/rue-es/matricula", headers=_auth(tokens["admin"]))
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/csv")

    reader = csv.reader(io.StringIO(res.text), delimiter=";")
    rows = list(reader)
    header = rows[0]
    assert header == [
        "cedula",
        "apellidos_nombres",
        "carrera",
        "codigo_mec_carrera",
        "anio_ingreso",
        "condicion_beca",
        "estado",
    ]
    body_rows = rows[1:]
    nombres = [r[1] for r in body_rows]
    assert seed["alumno"].nombre in nombres
    assert seed["alumno2"].nombre in nombres


def test_trayecto_academico_requiere_admin(client, seed, tokens):
    res = client.get(
        "/reportes/rue-es/trayecto-academico", headers=_auth(tokens["profesor"])
    )
    assert res.status_code == 403


def test_trayecto_academico_incluye_inscripcion_y_notas(client, seed, tokens, db):
    from app.models.inscripcion import Inscripcion
    from app.models.puntaje import Puntaje
    from app.models.asistencia import Asistencia

    db.add(Inscripcion(alumno_id=seed["alumno"].id, oferta_materia_id=seed["oferta"].id))
    db.add(
        Puntaje(
            user_id=seed["alumno"].id,
            oferta_materia_id=seed["oferta"].id,
            tipo="final1",
            valor=40.0,
        )
    )
    db.add(
        Asistencia(
            user_id=seed["alumno"].id,
            oferta_materia_id=seed["oferta"].id,
            fecha=date(2026, 3, 1),
            presente=True,
        )
    )
    db.commit()

    res = client.get(
        "/reportes/rue-es/trayecto-academico", headers=_auth(tokens["admin"])
    )
    assert res.status_code == 200
    reader = csv.reader(io.StringIO(res.text), delimiter=";")
    rows = list(reader)
    header, body_rows = rows[0], rows[1:]
    assert header == [
        "cedula",
        "apellidos_nombres",
        "carrera",
        "materia",
        "periodo",
        "nota_final",
        "estado_materia",
        "porcentaje_asistencia",
    ]
    assert len(body_rows) == 1
    row = body_rows[0]
    assert row[1] == seed["alumno"].nombre
    assert row[3] == seed["materia"].nombre
    assert row[5] == "8.0"
    assert row[6] == "APROBADO"
    assert row[7] == "100.0"
