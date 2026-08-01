"""Tests del filtro por período (historial) en /alumno/mi-asistencia."""

from datetime import date, timedelta


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _cargar_asistencias(client, seed, tokens, base, presente_seq, materia_id=None):
    """Carga asistencias secuenciales (True/False) para el alumno del seed."""
    for i, presente in enumerate(presente_seq):
        res = client.post(
            "/asistencias/",
            json={
                "materia_id": materia_id or seed["materia"].id,
                "user_id": seed["alumno"].id,
                "fecha": (base + timedelta(days=i)).isoformat(),
                "presente": presente,
            },
            headers=_auth(tokens["profesor"]),
        )
        assert res.status_code == 200, res.text


def test_mi_asistencia_sin_filtro_devuelve_agregado_global(client, seed, tokens):
    base = date(2026, 6, 1)
    _cargar_asistencias(client, seed, tokens, base, [True, True, False])

    res = client.get("/alumno/mi-asistencia", headers=_auth(tokens["alumno"]))
    assert res.status_code == 200, res.text
    data = res.json()
    assert len(data) == 1
    row = data[0]
    assert row["materia_id"] == seed["materia"].id
    assert row["total_clases"] == 3
    assert row["presentes"] == 2
    assert row["porcentaje"] == round((2 / 3) * 100, 1)


def test_mi_asistencia_filtra_por_periodo(client, seed, tokens, db):
    from app.models.asistencia import Asistencia
    from app.models.inscripcion import Inscripcion

    base = date(2026, 7, 1)

    # Inscripción del alumno en la oferta (período 2026-1 / materia anio=1 sem=1)
    db.add(
        Inscripcion(
            alumno_id=seed["alumno"].id,
            oferta_materia_id=seed["oferta"].id,
        )
    )
    db.add_all(
        [
            Asistencia(
                user_id=seed["alumno"].id,
                oferta_materia_id=seed["oferta"].id,
                fecha=base + timedelta(days=0),
                presente=True,
            ),
            Asistencia(
                user_id=seed["alumno"].id,
                oferta_materia_id=seed["oferta"].id,
                fecha=base + timedelta(days=1),
                presente=False,
            ),
        ]
    )
    db.commit()

    # Filtro coincidente: anio=1 semestre=1 (la materia del seed)
    res = client.get(
        "/alumno/mi-asistencia?anio=1&semestre=1",
        headers=_auth(tokens["alumno"]),
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert len(data) == 1
    assert data[0]["total_clases"] == 2
    assert data[0]["presentes"] == 1
    assert data[0]["porcentaje"] == 50.0

    # Filtro sin coincidencia: anio=2 semestre=2
    res = client.get(
        "/alumno/mi-asistencia?anio=2&semestre=2",
        headers=_auth(tokens["alumno"]),
    )
    assert res.status_code == 200, res.text
    assert res.json() == []

    # Filtro parcial (solo anio)
    res = client.get(
        "/alumno/mi-asistencia?anio=1",
        headers=_auth(tokens["alumno"]),
    )
    assert res.status_code == 200, res.text
    assert len(res.json()) == 1
