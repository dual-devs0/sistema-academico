"""Tests para el endpoint agregado /alumno/dashboard.

Este endpoint compone en una sola llamada:
- perfil del usuario
- resumen académico
- próximos eventos
- saldo de cuenta
- regularidad activa
"""

import pytest
from datetime import date

from app.models.users import User
from app.models.materia import Materia
from app.models.oferta_materia import OfertaMateria
from app.models.carrera import Carrera
from app.models.asistencia import Asistencia
from app.models.evento_calendario import EventoCalendario
from app.security import hash_password
from app.auth import create_access_token


@pytest.fixture()
def dashboard_seed(db):
    """Seed con alumno + 1 oferta + 1 asistencia + 1 evento."""
    carrera = Carrera(nombre="Ing. Civil")
    db.add(carrera)
    db.flush()

    alumno = User(
        username="dashboard_test",
        hashed_password=hash_password("alumno123"),
        role="alumno",
        nombre="Dashboard Test",
        email="dashboard@test.com",
        carrera_id=carrera.id,
    )
    db.add(alumno)
    db.flush()

    materia = Materia(nombre="Estructuras I", carrera_id=carrera.id, anio=2, semestre=1)
    db.add(materia)
    db.flush()

    oferta = OfertaMateria(materia_id=materia.id, profesor_id=alumno.id, periodo="2026-1", activa=True)
    db.add(oferta)
    db.flush()

    # Asistencia: 2 presentes / 3 total
    for i in range(3):
        db.add(Asistencia(
            user_id=alumno.id,
            oferta_materia_id=oferta.id,
            fecha=date(2026, 4, 5 + i),
            presente=(i < 2),
        ))

    # Evento futuro
    db.add(EventoCalendario(
        titulo="Parcial Estructuras I",
        tipo="parcial",
        fecha=date(2026, 8, 15),
        materia_id=materia.id,
        carrera_id=carrera.id,
        descripcion="Tema 1-5",
    ))
    db.commit()

    token = create_access_token({
        "sub": alumno.username,
        "role": "alumno",
        "user_id": alumno.id,
    })

    return {"alumno": alumno, "carrera": carrera, "token": token}


class TestDashboard:
    def test_sin_auth_retorna_401(self, client):
        resp = client.get("/alumno/dashboard")
        assert resp.status_code == 401

    def test_dashboard_estructura_ok(self, client, dashboard_seed):
        resp = client.get(
            "/alumno/dashboard",
            headers={"Authorization": f"Bearer {dashboard_seed['token']}"},
        )
        assert resp.status_code == 200
        data = resp.json()

        # Estructura esperada
        assert "user" in data
        assert "resumen" in data
        assert "proximoEvento" in data
        assert "eventosCercanos" in data
        assert "cuentaSaldoPendiente" in data
        assert "cuentaSaldoVencido" in data
        assert "cuentaPagado" in data
        assert "cuentaHayCuotas" in data
        assert "regularidadActiva" in data

    def test_dashboard_user_info(self, client, dashboard_seed):
        resp = client.get(
            "/alumno/dashboard",
            headers={"Authorization": f"Bearer {dashboard_seed['token']}"},
        )
        assert resp.status_code == 200
        data = resp.json()

        user = data["user"]
        assert user is not None
        assert user["username"] == "dashboard_test"
        assert user["role"] == "alumno"
        assert user["nombre"] == "Dashboard Test"
        assert user["carrera_nombre"] == "Ing. Civil"
        assert user["semestre"] is None  # backend no expone semestre actual

    def test_dashboard_resumen(self, client, dashboard_seed):
        resp = client.get(
            "/alumno/dashboard",
            headers={"Authorization": f"Bearer {dashboard_seed['token']}"},
        )
        assert resp.status_code == 200
        data = resp.json()

        resumen = data["resumen"]
        assert resumen is not None
        assert "cantidad_materias" in resumen
        assert "promedio_general" in resumen
        assert "asistencia" in resumen

    def test_dashboard_eventos(self, client, dashboard_seed):
        resp = client.get(
            "/alumno/dashboard",
            headers={"Authorization": f"Bearer {dashboard_seed['token']}"},
        )
        assert resp.status_code == 200
        data = resp.json()

        assert data["proximoEvento"] is not None
        assert data["proximoEvento"]["titulo"] == "Parcial Estructuras I"
        assert data["proximoEvento"]["tipo"] == "parcial"

    def test_dashboard_regularidad(self, client, dashboard_seed):
        resp = client.get(
            "/alumno/dashboard",
            headers={"Authorization": f"Bearer {dashboard_seed['token']}"},
        )
        assert resp.status_code == 200
        data = resp.json()

        # 2/3 = 66.67%, < 70% → regularidad false
        assert data["regularidadActiva"] is False
