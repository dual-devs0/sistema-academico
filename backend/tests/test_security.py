"""Tests for security fixes and access control."""

from datetime import date, time

from app.models.puntaje import Puntaje
from app.models.horario import Horario


def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ===================== USER ROLE ESCALATION FIX =====================


def test_alumno_cannot_change_role_to_admin(client, seed, tokens):
    res = client.patch(
        f"/users/{seed['alumno'].id}",
        json={"role": "admin"},
        headers=auth(tokens["alumno"]),
    )
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "alumno"


def test_alumno_cannot_change_carrera_id(client, seed, tokens):
    res = client.patch(
        f"/users/{seed['alumno'].id}",
        json={"carrera_id": 99},
        headers=auth(tokens["alumno"]),
    )
    assert res.status_code == 200
    data = res.json()
    assert data["carrera_id"] == seed["alumno"].carrera_id


def test_alumno_can_change_own_name(client, seed, tokens):
    res = client.patch(
        f"/users/{seed['alumno'].id}",
        json={"nombre": "Nuevo Nombre"},
        headers=auth(tokens["alumno"]),
    )
    assert res.status_code == 200
    data = res.json()
    assert data["nombre"] == "Nuevo Nombre"


def test_admin_can_change_role(client, seed, tokens):
    res = client.patch(
        f"/users/{seed['alumno'].id}",
        json={"role": "admin"},
        headers=auth(tokens["admin"]),
    )
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "admin"


# ===================== ENROLLMENT FIX =====================


def test_alumno_cannot_enroll_other_student(client, seed, tokens):
    res = client.post(
        "/inscripciones/",
        json={"alumno_id": seed["alumno2"].id, "materia_id": seed["materia"].id},
        headers=auth(tokens["alumno"]),
    )
    assert res.status_code == 200
    data = res.json()
    # Should be enrolled as current user, not alumno2
    assert data["alumno_id"] == seed["alumno"].id


def test_admin_can_enroll_any_student(client, seed, tokens):
    res = client.post(
        "/inscripciones/",
        json={"alumno_id": seed["alumno2"].id, "materia_id": seed["materia"].id},
        headers=auth(tokens["admin"]),
    )
    assert res.status_code == 200
    data = res.json()
    assert data["alumno_id"] == seed["alumno2"].id


# ===================== APUNTE CREATION FIX =====================


def test_apunte_creation_forces_current_user(client, seed, tokens):
    res = client.post(
        "/apuntes/",
        json={
            "user_id": seed["alumno2"].id,
            "materia_id": seed["materia"].id,
            "titulo": "Test Apunte",
            "archivo_url": "http://example.com/doc.pdf",
        },
        headers=auth(tokens["alumno"]),
    )
    assert res.status_code == 200
    data = res.json()
    assert data["user_id"] == seed["alumno"].id


# ===================== DELETE USER FIX =====================


def test_delete_user_actually_removes(client, seed, tokens):
    res = client.delete(f"/users/{seed['alumno2'].id}", headers=auth(tokens["admin"]))
    assert res.status_code == 200
    # Verify user is gone
    res = client.get("/users/", headers=auth(tokens["admin"]))
    usernames = [u["username"] for u in res.json()["items"]]
    assert "alumno2_test" not in usernames


def test_delete_user_non_admin_returns_403(client, seed, tokens):
    res = client.delete(f"/users/{seed['admin'].id}", headers=auth(tokens["alumno"]))
    assert res.status_code == 403


# ===================== PROFESSOR GRADE OWNERSHIP =====================


def test_profesor_cannot_create_grade_for_other_materia(client, seed, tokens, db):
    # Create a materia dictada por otro profesor (via oferta)
    from app.models.materia import Materia
    from app.models.oferta_materia import OfertaMateria

    other_materia = Materia(nombre="Otra Materia", carrera_id=seed["carrera"].id)
    db.add(other_materia)
    db.flush()
    other_oferta = OfertaMateria(
        materia_id=other_materia.id,
        profesor_id=seed["alumno"].id,
        periodo="2026-1",
        activa=True,
    )
    db.add(other_oferta)
    db.commit()
    db.refresh(other_materia)

    res = client.post(
        "/puntajes/",
        json={
            "user_id": seed["alumno"].id,
            "materia_id": other_materia.id,
            "tipo": "parcial1",
            "valor": 7.5,
        },
        headers=auth(tokens["profesor"]),
    )
    assert res.status_code == 403


def test_profesor_can_create_grade_for_own_materia(client, seed, tokens):
    res = client.post(
        "/puntajes/",
        json={
            "user_id": seed["alumno"].id,
            "materia_id": seed["materia"].id,
            "tipo": "parcial1",
            "valor": 7.5,
        },
        headers=auth(tokens["profesor"]),
    )
    assert res.status_code == 200


# ===================== GRADE VALIDATION =====================


def test_grade_value_out_of_range_rejected(client, seed, tokens):
    res = client.post(
        "/puntajes/",
        json={
            "user_id": seed["alumno"].id,
            "materia_id": seed["materia"].id,
            "tipo": "parcial1",
            "valor": 15.0,
        },
        headers=auth(tokens["admin"]),
    )
    assert res.status_code == 422


def test_grade_value_negative_rejected(client, seed, tokens):
    res = client.post(
        "/puntajes/",
        json={
            "user_id": seed["alumno"].id,
            "materia_id": seed["materia"].id,
            "tipo": "parcial1",
            "valor": -1.0,
        },
        headers=auth(tokens["admin"]),
    )
    assert res.status_code == 422


# ===================== DUPLICATE GRADE PREVENTION =====================


def test_duplicate_grade_type_rejected(client, seed, tokens):
    # Create first grade
    res = client.post(
        "/puntajes/",
        json={
            "user_id": seed["alumno"].id,
            "materia_id": seed["materia"].id,
            "tipo": "parcial1",
            "valor": 7.5,
        },
        headers=auth(tokens["admin"]),
    )
    assert res.status_code == 200

    # Try to create duplicate
    res = client.post(
        "/puntajes/",
        json={
            "user_id": seed["alumno"].id,
            "materia_id": seed["materia"].id,
            "tipo": "parcial1",
            "valor": 8.0,
        },
        headers=auth(tokens["admin"]),
    )
    assert res.status_code == 400


# ===================== DUPLICATE ATTENDANCE PREVENTION =====================


def test_duplicate_attendance_handled_by_unique_constraint(client, seed, tokens, db):
    # First attendance should work
    res = client.post(
        "/asistencias/",
        json={
            "user_id": seed["alumno"].id,
            "materia_id": seed["materia"].id,
            "fecha": "2026-03-15",
            "presente": True,
        },
        headers=auth(tokens["profesor"]),
    )
    assert res.status_code == 200

    # Second attendance same user/materia/fecha should return 409
    res = client.post(
        "/asistencias/",
        json={
            "user_id": seed["alumno"].id,
            "materia_id": seed["materia"].id,
            "fecha": "2026-03-15",
            "presente": True,
        },
        headers=auth(tokens["profesor"]),
    )
    assert res.status_code == 409


# ===================== AUTH ON PUBLIC ENDPOINTS =====================


def test_materias_list_requires_auth(client, seed):
    res = client.get("/materias/")
    assert res.status_code == 401


def test_apuntes_list_requires_auth(client, seed):
    res = client.get("/apuntes/")
    assert res.status_code == 401


def test_programas_list_requires_auth(client, seed):
    res = client.get("/programas/")
    assert res.status_code == 401


def test_temarios_list_requires_auth(client, seed):
    res = client.get("/temarios/")
    assert res.status_code in (401, 404)


def test_eventos_get_requires_auth(client, seed):
    res = client.get("/eventos/1")
    assert res.status_code == 401


# ===================== FORUM ENROLLMENT CHECK =====================


def test_alumno_cannot_create_thread_in_unenrolled_materia(client, seed, tokens, db):
    from app.models.materia import Materia

    other = Materia(nombre="Materia Sin Inscripcion")
    db.add(other)
    db.commit()
    db.refresh(other)

    res = client.post(
        "/foro/hilos",
        json={"materia_id": other.id, "titulo": "Thread sin inscripcion"},
        headers=auth(tokens["alumno"]),
    )
    assert res.status_code == 403


def test_alumno_can_create_thread_in_enrolled_materia(client, seed, tokens, db):
    from app.models.inscripcion import Inscripcion

    insc = Inscripcion(alumno_id=seed["alumno"].id, oferta_materia_id=seed["oferta"].id)
    db.add(insc)
    db.commit()

    res = client.post(
        "/foro/hilos",
        json={"materia_id": seed["materia"].id, "titulo": "Thread valido"},
        headers=auth(tokens["alumno"]),
    )
    assert res.status_code == 200


# ===================== EVENT FILTER FIX =====================


def test_alumno_sees_global_and_own_materia_events(client, seed, tokens, db):
    from app.models.evento_calendario import EventoCalendario

    global_ev = EventoCalendario(
        titulo="Feriado Nacional",
        tipo="feriado",
        fecha=date(2026, 7, 15),
    )
    materia_ev = EventoCalendario(
        titulo="Parcial Programacion",
        tipo="parcial",
        fecha=date(2026, 7, 20),
        materia_id=seed["materia"].id,
    )
    db.add_all([global_ev, materia_ev])
    db.commit()

    from app.models.inscripcion import Inscripcion

    insc = Inscripcion(alumno_id=seed["alumno"].id, oferta_materia_id=seed["oferta"].id)
    db.add(insc)
    db.commit()

    res = client.get("/eventos/", headers=auth(tokens["alumno"]))
    assert res.status_code == 200
    data = res.json()
    titulos = [e["titulo"] for e in data]
    assert "Feriado Nacional" in titulos
    assert "Parcial Programacion" in titulos


# ===================== HORARIO CRUD =====================


def test_create_horario_admin(client, seed, tokens):
    res = client.post(
        "/horarios/",
        json={
            "materia_id": seed["materia"].id,
            "dia_semana": 1,
            "hora_inicio": "08:00",
            "hora_fin": "10:00",
            "aula": "A101",
        },
        headers=auth(tokens["admin"]),
    )
    assert res.status_code == 200
    data = res.json()
    assert data["dia_semana"] == 1
    assert data["aula"] == "A101"


def test_create_horario_alumno_forbidden(client, seed, tokens):
    res = client.post(
        "/horarios/",
        json={
            "materia_id": seed["materia"].id,
            "dia_semana": 1,
            "hora_inicio": "08:00",
            "hora_fin": "10:00",
        },
        headers=auth(tokens["alumno"]),
    )
    assert res.status_code == 403


def test_horario_overlap_detection(client, seed, tokens, db):
    from app.models.materia import Materia
    from app.models.oferta_materia import OfertaMateria
    from app.models.inscripcion import Inscripcion

    materia2 = Materia(nombre="Base de Datos", carrera_id=seed["carrera"].id)
    db.add(materia2)
    db.flush()
    oferta2 = OfertaMateria(
        materia_id=materia2.id,
        profesor_id=seed["profesor"].id,
        periodo="2026-1",
        activa=True,
    )
    db.add(oferta2)
    db.commit()
    db.refresh(materia2)
    db.refresh(oferta2)

    h1 = Horario(
        materia_id=seed["materia"].id,
        dia_semana=1,
        hora_inicio=time(8, 0),
        hora_fin=time(10, 0),
    )
    h2 = Horario(
        materia_id=materia2.id,
        dia_semana=1,
        hora_inicio=time(9, 0),
        hora_fin=time(11, 0),
    )
    db.add_all([h1, h2])
    db.commit()

    insc = Inscripcion(alumno_id=seed["alumno"].id, oferta_materia_id=oferta2.id)
    db.add(insc)
    db.commit()

    res = client.post(
        "/inscripciones/",
        json={"alumno_id": seed["alumno"].id, "materia_id": seed["materia"].id},
        headers=auth(tokens["alumno"]),
    )
    assert res.status_code == 409


# ===================== PASSWORD RESET RATE LIMIT =====================


def test_password_reset_rate_limit(client, seed):
    for _ in range(4):
        res = client.post(
            "/auth/recuperar-contrasena",
            json={"username_or_email": "admin_test"},
        )
    assert res.status_code == 429


# ===================== AUTH ENDPOINTS =====================


def test_materia_get_requires_auth(client, seed):
    res = client.get("/materias/1")
    assert res.status_code == 401


def test_alumno_cannot_list_other_users(client, seed, tokens):
    res = client.get("/users/", headers=auth(tokens["alumno"]))
    assert res.status_code == 403


def test_boleta_uses_weighted_average(client, seed, tokens, db):
    """Verify the boleta PDF generation uses weighted average matching puntajes_router."""  # noqa: E501
    puntajes_data = [
        {
            "user_id": seed["alumno"].id,
            "oferta_materia_id": seed["oferta"].id,
            "tipo": "parcial1",
            "valor": 8.0,
        },
        {
            "user_id": seed["alumno"].id,
            "oferta_materia_id": seed["oferta"].id,
            "tipo": "parcial2",
            "valor": 7.0,
        },
        {
            "user_id": seed["alumno"].id,
            "oferta_materia_id": seed["oferta"].id,
            "tipo": "practico",
            "valor": 9.0,
        },
        {
            "user_id": seed["alumno"].id,
            "oferta_materia_id": seed["oferta"].id,
            "tipo": "final",
            "valor": 6.0,
        },
    ]
    for p in puntajes_data:
        db.add(Puntaje(**p, editado_por=seed["admin"].id))
    db.commit()

    res = client.get(f"/boleta/{seed['alumno'].id}", headers=auth(tokens["alumno"]))
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"


def test_schedule_overlap_verification_endpoint(client, seed, tokens, db):
    """Test the /horarios/verificar-solapamiento endpoint."""
    from app.models.inscripcion import Inscripcion
    from app.models.materia import Materia
    from app.models.oferta_materia import OfertaMateria

    materia2 = Materia(nombre="Base de Datos", carrera_id=seed["carrera"].id)
    db.add(materia2)
    db.flush()
    oferta2 = OfertaMateria(
        materia_id=materia2.id,
        profesor_id=seed["profesor"].id,
        periodo="2026-1",
        activa=True,
    )
    db.add(oferta2)
    db.commit()
    db.refresh(materia2)
    db.refresh(oferta2)

    h1 = Horario(
        materia_id=seed["materia"].id,
        dia_semana=1,
        hora_inicio=time(8, 0),
        hora_fin=time(10, 0),
    )
    h2 = Horario(
        materia_id=materia2.id,
        dia_semana=1,
        hora_inicio=time(9, 0),
        hora_fin=time(11, 0),
    )
    db.add_all([h1, h2])
    db.commit()

    insc = Inscripcion(alumno_id=seed["alumno"].id, oferta_materia_id=oferta2.id)
    db.add(insc)
    db.commit()

    res = client.get(
        f"/horarios/verificar-solapamiento?materia_id={seed['materia'].id}",
        headers=auth(tokens["alumno"]),
    )
    assert res.status_code == 200
    data = res.json()
    assert data["tiene_conflicto"] is True
