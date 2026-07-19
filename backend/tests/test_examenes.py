"""Tests de exámenes — Fase 7E."""

from datetime import date

import pytest


def test_listar_examenes_admin(client, tokens, seed, db):
    """GET /examenes/ — admin puede listar (vacío al inicio)."""
    resp = client.get("/examenes/", headers={"Authorization": f"Bearer {tokens['admin']}"})
    assert resp.status_code == 200
    assert resp.json() == []


def test_listar_examenes_admin_no_autorizado(client, tokens):
    """GET /examenes/ — alumno no puede listar."""
    resp = client.get("/examenes/", headers={"Authorization": f"Bearer {tokens['alumno']}"})
    assert resp.status_code == 403


def test_crear_examen_admin(client, tokens, seed):
    """POST /examenes/ — admin crea examen exitosamente."""
    body = {
        "materia_id": seed["materia"].id,
        "fecha": "2026-08-15",
        "hora_inicio": "10:00",
        "hora_fin": "12:00",
        "aula": "A101",
        "tipo": "final",
        "periodo": "2026-1",
        "cupos": 30,
        "profesor_id": seed["profesor"].id,
    }
    resp = client.post("/examenes/", json=body, headers={"Authorization": f"Bearer {tokens['admin']}"})
    assert resp.status_code == 200, resp.json()
    data = resp.json()
    assert data["materia_id"] == seed["materia"].id
    assert data["tipo"] == "final"
    assert data["periodo"] == "2026-1"
    assert data["estado"] == "programado"
    assert data["id"] is not None


def test_crear_examen_materia_inexistente(client, tokens):
    """POST /examenes/ — materia inexistente da 404."""
    body = {
        "materia_id": 99999,
        "fecha": "2026-08-15",
        "tipo": "final",
        "periodo": "2026-1",
    }
    resp = client.post("/examenes/", json=body, headers={"Authorization": f"Bearer {tokens['admin']}"})
    assert resp.status_code == 404


def test_crear_examen_no_admin(client, tokens):
    """POST /examenes/ — alumno no puede crear."""
    body = {
        "materia_id": 1,
        "fecha": "2026-08-15",
        "tipo": "final",
        "periodo": "2026-1",
    }
    resp = client.post("/examenes/", json=body, headers={"Authorization": f"Bearer {tokens['alumno']}"})
    assert resp.status_code == 403


def test_examenes_disponibles(client, tokens, seed, db):
    """GET /examenes/disponibles — muestra exámenes programados."""
    from app.models.examen import Examen

    examen = Examen(
        materia_id=seed["materia"].id,
        fecha=date(2026, 8, 15),
        hora_inicio="10:00",
        tipo="final",
        periodo="2026-1",
        cupos=30,
        profesor_id=seed["profesor"].id,
    )
    db.add(examen)
    db.commit()

    resp = client.get("/examenes/disponibles", headers={"Authorization": f"Bearer {tokens['alumno']}"})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["materia_nombre"] == "Programación I"
    assert data[0]["cupos_disponibles"] == 30
    assert data[0]["ya_inscripto"] is False


def test_examenes_disponibles_filtro_periodo(client, tokens, seed, db):
    """GET /examenes/disponibles?periodo= — filtra por periodo."""
    from app.models.examen import Examen

    for p in ("2026-1", "2026-2"):
        db.add(Examen(
            materia_id=seed["materia"].id,
            fecha=date(2026, 8, 15),
            tipo="final",
            periodo=p,
            profesor_id=seed["profesor"].id,
        ))
    db.commit()

    resp = client.get(
        "/examenes/disponibles?periodo=2026-2",
        headers={"Authorization": f"Bearer {tokens['alumno']}"},
    )
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_inscripcion_exitosa(client, tokens, seed, db):
    """POST /examenes/inscripciones — alumno se inscribe."""
    from app.models.examen import Examen, InscripcionExamen

    examen = Examen(
        materia_id=seed["materia"].id,
        fecha=date(2026, 8, 15),
        tipo="final",
        periodo="2026-1",
        cupos=30,
        profesor_id=seed["profesor"].id,
    )
    db.add(examen)
    db.commit()
    db.refresh(examen)

    resp = client.post(
        "/examenes/inscripciones",
        json={"examen_id": examen.id},
        headers={"Authorization": f"Bearer {tokens['alumno']}"},
    )
    assert resp.status_code == 200, resp.json()
    data = resp.json()
    assert data["examen_id"] == examen.id
    assert data["alumno_id"] == seed["alumno"].id
    assert data["estado"] == "inscripto"


def test_inscripcion_sin_cupos(client, tokens, seed, db):
    """POST /examenes/inscripciones — sin cupos da 422."""
    from app.models.examen import Examen

    examen = Examen(
        materia_id=seed["materia"].id,
        fecha=date(2026, 8, 15),
        tipo="final",
        periodo="2026-1",
        cupos=0,
        profesor_id=seed["profesor"].id,
    )
    db.add(examen)
    db.commit()
    db.refresh(examen)

    resp = client.post(
        "/examenes/inscripciones",
        json={"examen_id": examen.id},
        headers={"Authorization": f"Bearer {tokens['alumno']}"},
    )
    assert resp.status_code == 422


def test_inscripcion_duplicada(client, tokens, seed, db):
    """POST /examenes/inscripciones — inscripción duplicada da 409."""
    from app.models.examen import Examen

    examen = Examen(
        materia_id=seed["materia"].id,
        fecha=date(2026, 8, 15),
        tipo="final",
        periodo="2026-1",
        cupos=30,
        profesor_id=seed["profesor"].id,
    )
    db.add(examen)
    db.commit()
    db.refresh(examen)

    # Primera inscripción
    client.post(
        "/examenes/inscripciones",
        json={"examen_id": examen.id},
        headers={"Authorization": f"Bearer {tokens['alumno']}"},
    )

    # Segunda inscripción (duplicada)
    resp = client.post(
        "/examenes/inscripciones",
        json={"examen_id": examen.id},
        headers={"Authorization": f"Bearer {tokens['alumno']}"},
    )
    assert resp.status_code == 409


def test_examenes_inscriptos(client, tokens, seed, db):
    """GET /examenes/inscriptos — lista inscripciones del alumno."""
    from app.models.examen import Examen, InscripcionExamen

    examen = Examen(
        materia_id=seed["materia"].id,
        fecha=date(2026, 8, 15),
        tipo="final",
        periodo="2026-1",
        cupos=30,
        profesor_id=seed["profesor"].id,
    )
    db.add(examen)
    db.commit()
    db.refresh(examen)

    db.add(InscripcionExamen(examen_id=examen.id, alumno_id=seed["alumno"].id))
    db.commit()

    resp = client.get(
        "/examenes/inscriptos",
        headers={"Authorization": f"Bearer {tokens['alumno']}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["materia_nombre"] == "Programación I"
    assert data[0]["examen"]["periodo"] == "2026-1"


def test_cancelar_inscripcion(client, tokens, seed, db):
    """DELETE /examenes/inscripciones/{id} — cancela inscripción."""
    from app.models.examen import Examen, InscripcionExamen

    examen = Examen(
        materia_id=seed["materia"].id,
        fecha=date(2026, 8, 15),
        tipo="final",
        periodo="2026-1",
        cupos=30,
        profesor_id=seed["profesor"].id,
    )
    db.add(examen)
    db.commit()
    db.refresh(examen)

    insc = InscripcionExamen(examen_id=examen.id, alumno_id=seed["alumno"].id)
    db.add(insc)
    db.commit()
    db.refresh(insc)

    resp = client.delete(
        f"/examenes/inscripciones/{insc.id}",
        headers={"Authorization": f"Bearer {tokens['alumno']}"},
    )
    assert resp.status_code == 200
    assert resp.json()["estado"] == "cancelada"


def test_cancelar_inscripcion_inexistente(client, tokens):
    """DELETE /examenes/inscripciones/{id} — inscripción inexistente da 404."""
    resp = client.delete(
        "/examenes/inscripciones/99999",
        headers={"Authorization": f"Bearer {tokens['alumno']}"},
    )
    assert resp.status_code == 404


def test_cancelar_inscripcion_otro_alumno(client, tokens, seed, db):
    """DELETE /examenes/inscripciones/{id} — no se puede cancelar inscripción de otro."""
    from app.models.examen import Examen, InscripcionExamen

    examen = Examen(
        materia_id=seed["materia"].id,
        fecha=date(2026, 8, 15),
        tipo="final",
        periodo="2026-1",
        cupos=30,
        profesor_id=seed["profesor"].id,
    )
    db.add(examen)
    db.commit()
    db.refresh(examen)

    insc = InscripcionExamen(examen_id=examen.id, alumno_id=seed["alumno2"].id)
    db.add(insc)
    db.commit()
    db.refresh(insc)

    resp = client.delete(
        f"/examenes/inscripciones/{insc.id}",
        headers={"Authorization": f"Bearer {tokens['alumno']}"},
    )
    assert resp.status_code == 403


def test_cancelar_inscripcion_admin_cualquiera(client, tokens, seed, db):
    """DELETE /examenes/inscripciones/{id} — admin puede cancelar cualquier inscripción."""
    from app.models.examen import Examen, InscripcionExamen

    examen = Examen(
        materia_id=seed["materia"].id,
        fecha=date(2026, 8, 15),
        tipo="final",
        periodo="2026-1",
        cupos=30,
        profesor_id=seed["profesor"].id,
    )
    db.add(examen)
    db.commit()
    db.refresh(examen)

    insc = InscripcionExamen(examen_id=examen.id, alumno_id=seed["alumno2"].id)
    db.add(insc)
    db.commit()
    db.refresh(insc)

    resp = client.delete(
        f"/examenes/inscripciones/{insc.id}",
        headers={"Authorization": f"Bearer {tokens['admin']}"},
    )
    assert resp.status_code == 200
    assert resp.json()["estado"] == "cancelada"
