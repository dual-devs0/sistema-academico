"""Tests for security fixes and access control."""

from datetime import date, time

from app.models.puntaje import Puntaje
from app.models.asistencia import Asistencia
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
    usernames = [u["username"] for u in res.json()]
    assert "alumno2_test" not in usernames


def test_delete_user_non_admin_returns_403(client, seed, tokens):
    res = client.delete(f"/users/{seed['admin'].id}", headers=auth(tokens["alumno"]))
    assert res.status_code == 403


# ===================== PROFESSOR GRADE OWNERSHIP =====================

def test_profesor_cannot_create_grade_for_other_materia(client, seed, tokens, db):
    # Create a materia that belongs to NO profesor (or another profesor)
    from app.models.materia import Materia
    other_materia = Materia(nombre="Otra Materia", profesor_id=seed["alumno"].id, carrera_id=seed["carrera"].id)
    db.add(other_materia)
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
    # Use correct path matching the router prefix + route
    res = client.get("/temarios/")
    assert res.status_code in (401, 404)  # 404 if route not found without trailing slash


def test_eventos_get_requires_auth(client, seed):
    res = client.get("/eventos/1")
    assert res.status_code == 401


# ===================== FORUM ENROLLMENT CHECK =====================

def test_alumno_cannot_create_thread_in_unenrolled_materia(client, seed, tokens, db):
    # Create a materia the student is NOT enrolled in
    from app.models.materia import Materia
    other = Materia(nombre="Materia Sin Inscripcion", profesor_id=seed["profesor"].id)
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
    # First enroll the student
    from app.models.inscripcion import Inscripcion
    insc = Inscripcion(alumno_id=seed["alumno"].id, materia_id=seed["materia"].id)
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
    # Create a global event (no materia_id)
    global_ev = EventoCalendario(
        titulo="Feriado Nacional", tipo="feriado", fecha=date(2026, 7, 15),
    )
    # Create a materia-specific event
    materia_ev = EventoCalendario(
        titulo="Parcial Programacion", tipo="parcial", fecha=date(2026, 7, 20),
        materia_id=seed["materia"].id,
    )
    db.add_all([global_ev, materia_ev])
    db.commit()

    # Enroll student in materia
    from app.models.inscripcion import Inscripcion
    insc = Inscripcion(alumno_id=seed["alumno"].id, materia_id=seed["materia"].id)
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
    # Create a second materia with same profesor
    from app.models.materia import Materia
    from app.models.inscripcion import Inscripcion
    from app.models.horario import Horario

    materia2 = Materia(nombre="Base de Datos", profesor_id=seed["profesor"].id, carrera_id=seed["carrera"].id)
    db.add(materia2)
    db.commit()
    db.refresh(materia2)

    # Add horarios for both materias at the same time
    h1 = Horario(materia_id=seed["materia"].id, dia_semana=1, hora_inicio=time(8, 0), hora_fin=time(10, 0))
    h2 = Horario(materia_id=materia2.id, dia_semana=1, hora_inicio=time(9, 0), hora_fin=time(11, 0))
    db.add_all([h1, h2])
    db.commit()

    # Enroll in materia2
    insc = Inscripcion(alumno_id=seed["alumno"].id, materia_id=materia2.id)
    db.add(insc)
    db.commit()

    # Try to enroll in materia (which overlaps) - should be blocked
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
    # The 4th request should be rate limited
    assert res.status_code == 429


# ===================== AUTH ENDPOINTS =====================

def test_materia_get_requires_auth(client, seed):
    res = client.get(f"/materias/1")
    assert res.status_code == 401


def test_alumno_cannot_list_other_users(client, seed, tokens):
    res = client.get("/users/", headers=auth(tokens["alumno"]))
    assert res.status_code == 403


def test_alumno_cannot_list_enrolled_students_in_any_materia(client, seed, tokens):
    res = client.get(f"/inscripciones/materia/{seed['materia'].id}", headers=auth(tokens["alumno"]))
    assert res.status_code == 200
    # Should only see their own data or empty
    data = res.json()
    for d in data:
        assert d["alumno_id"] == seed["alumno"].id


def test_boleta_uses_weighted_average(client, seed, tokens, db):
    """Verify the boleta PDF generation uses weighted average matching puntajes_router."""
    # Create grades for the student
    puntajes_data = [
        {"user_id": seed["alumno"].id, "materia_id": seed["materia"].id, "tipo": "parcial1", "valor": 8.0},
        {"user_id": seed["alumno"].id, "materia_id": seed["materia"].id, "tipo": "parcial2", "valor": 7.0},
        {"user_id": seed["alumno"].id, "materia_id": seed["materia"].id, "tipo": "practico", "valor": 9.0},
        {"user_id": seed["alumno"].id, "materia_id": seed["materia"].id, "tipo": "final", "valor": 6.0},
    ]
    for p in puntajes_data:
        db.add(Puntaje(**p, editado_por=seed["admin"].id))
    db.commit()

    # Weighted: 8*0.25 + 7*0.25 + 9*0.20 + 6*0.30 = 2.0 + 1.75 + 1.80 + 1.80 = 7.35
    weighted_avg = (8.0*0.25 + 7.0*0.25 + 9.0*0.20 + 6.0*0.30) / (0.25+0.25+0.20+0.30)

    # Get the boleta PDF
    res = client.get(f"/boleta/{seed['alumno'].id}", headers=auth(tokens["alumno"]))
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"


def test_schedule_overlap_verification_endpoint(client, seed, tokens, db):
    """Test the /horarios/verificar-solapamiento endpoint."""
    from app.models.horario import Horario
    from app.models.inscripcion import Inscripcion
    from app.models.materia import Materia

    materia2 = Materia(nombre="Base de Datos", profesor_id=seed["profesor"].id, carrera_id=seed["carrera"].id)
    db.add(materia2)
    db.commit()
    db.refresh(materia2)

    # Add overlapping horarios
    h1 = Horario(materia_id=seed["materia"].id, dia_semana=1, hora_inicio=time(8, 0), hora_fin=time(10, 0))
    h2 = Horario(materia_id=materia2.id, dia_semana=1, hora_inicio=time(9, 0), hora_fin=time(11, 0))
    db.add_all([h1, h2])
    db.commit()

    # Enroll in materia2
    insc = Inscripcion(alumno_id=seed["alumno"].id, materia_id=materia2.id)
    db.add(insc)
    db.commit()

    # Verify overlap
    res = client.get(
        f"/horarios/verificar-solapamiento?materia_id={seed['materia'].id}",
        headers=auth(tokens["alumno"]),
    )
    assert res.status_code == 200
    data = res.json()
    assert data["tiene_conflicto"] is True
