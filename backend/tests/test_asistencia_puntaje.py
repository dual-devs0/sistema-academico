from datetime import date, timedelta

from app.models.asistencia import Asistencia
from app.models.inscripcion import Inscripcion


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def _crear_asistencias(db, seed, specs):
    """specs: lista de (presente, motivo, puntaje_justificacion)."""
    inicio = date(2026, 3, 1)
    for i, (presente, motivo, pj) in enumerate(specs):
        db.add(Asistencia(
            user_id=seed["alumno"].id,
            oferta_materia_id=seed["oferta"].id,
            fecha=inicio + timedelta(days=i),
            presente=presente,
            motivo=motivo,
            puntaje_justificacion=pj,
        ))
    db.commit()


def test_porcentaje_pondera_ausencia_justificada(client, seed, tokens, db):
    # presente(5) + justificada-4(4) + sin-motivo(0) = 9/3 = 3.0 -> 60%
    _crear_asistencias(db, seed, [
        (True, None, None),
        (False, "Enfermedad", 4),
        (False, None, None),
    ])
    res = client.get(
        f"/asistencias/alumno/{seed['alumno'].id}/porcentaje?materia_id={seed['materia'].id}",
        headers=auth(tokens["admin"]),
    )
    assert res.status_code == 200
    assert res.json()["porcentaje"] == 60.0


def test_porcentaje_justificada_puntaje_3(db, seed):
    from app.routers.asistencias_router import calcular_porcentaje_asistencia
    _crear_asistencias(db, seed, [
        (False, "Viaje familiar", 3),
    ])
    resultado = calcular_porcentaje_asistencia(db, seed["alumno"].id, seed["materia"].id)
    assert resultado["porcentaje"] == 60.0  # 3/5*100


def test_porcentaje_motivo_sin_puntaje_elegido_usa_default_4(db, seed):
    """Registro legacy: motivo cargado pero sin puntaje_justificacion -> default 4."""
    from app.routers.asistencias_router import calcular_porcentaje_asistencia
    _crear_asistencias(db, seed, [
        (False, "Enfermedad", None),
    ])
    resultado = calcular_porcentaje_asistencia(db, seed["alumno"].id, seed["materia"].id)
    assert resultado["porcentaje"] == 80.0  # 4/5*100


def test_porcentaje_todo_presente_100(db, seed):
    from app.routers.asistencias_router import calcular_porcentaje_asistencia
    _crear_asistencias(db, seed, [(True, None, None)] * 5)
    resultado = calcular_porcentaje_asistencia(db, seed["alumno"].id, seed["materia"].id)
    assert resultado["porcentaje"] == 100.0


def test_alumnos_asistencia_roster_usa_puntaje_ponderado(client, seed, tokens, db):
    db.add(Inscripcion(alumno_id=seed["alumno"].id, oferta_materia_id=seed["oferta"].id))
    db.commit()
    _crear_asistencias(db, seed, [
        (True, None, None),
        (False, "Enfermedad", 3),
    ])
    res = client.get(
        f"/asistencias/materia/{seed['materia'].id}/alumnos",
        headers=auth(tokens["profesor"]),
    )
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 1
    # (5 + 3) / 2 = 4.0 -> 80%
    assert data[0]["porcentaje"] == 80.0


def test_profesor_toggle_valida_puntaje_justificacion_invalido(client, seed, tokens, db):
    _crear_asistencias(db, seed, [(True, None, None)])
    asistencia = db.query(Asistencia).filter(
        Asistencia.user_id == seed["alumno"].id
    ).first()
    res = client.put(
        f"/asistencias/profesor/toggle/{asistencia.id}"
        f"?presente=false&motivo=Enfermedad&puntaje_justificacion=5",
        headers=auth(tokens["profesor"]),
    )
    assert res.status_code == 422


def test_profesor_toggle_guarda_puntaje_justificacion(client, seed, tokens, db):
    _crear_asistencias(db, seed, [(True, None, None)])
    asistencia = db.query(Asistencia).filter(
        Asistencia.user_id == seed["alumno"].id
    ).first()
    res = client.put(
        f"/asistencias/profesor/toggle/{asistencia.id}"
        f"?presente=false&motivo=Enfermedad&puntaje_justificacion=3",
        headers=auth(tokens["profesor"]),
    )
    assert res.status_code == 200
    db.refresh(asistencia)
    assert asistencia.puntaje_justificacion == 3
    assert asistencia.motivo == "Enfermedad"


def test_profesor_toggle_marcar_presente_limpia_puntaje_justificacion(client, seed, tokens, db):
    _crear_asistencias(db, seed, [(False, "Enfermedad", 4)])
    asistencia = db.query(Asistencia).filter(
        Asistencia.user_id == seed["alumno"].id
    ).first()
    res = client.put(
        f"/asistencias/profesor/toggle/{asistencia.id}?presente=true",
        headers=auth(tokens["profesor"]),
    )
    assert res.status_code == 200
    db.refresh(asistencia)
    assert asistencia.puntaje_justificacion is None
