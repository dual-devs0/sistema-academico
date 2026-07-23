"""Tests para notas_router.py.

Endpoints:
  GET /notas/materia/{materia_id}/detalle   → MateriaDetalle con desglose
  GET /notas/materia/{materia_id}/asistencia → AsistenciaDetalleResponse
"""

import pytest
from datetime import date

from app.models.users import User
from app.models.materia import Materia
from app.models.oferta_materia import OfertaMateria
from app.models.carrera import Carrera
from app.models.puntaje import Puntaje
from app.models.asistencia import Asistencia
from app.security import hash_password
from app.auth import create_access_token


# ─── Fixtures ────────────────────────────────────────────────────────────────

@pytest.fixture()
def notas_seed(db):
    """Seed con 1 alumno, 1 materia, 1 oferta, puntajes y asistencias."""
    carrera = Carrera(nombre="Ing. Informatica")
    db.add(carrera)
    db.flush()

    alumno = User(
        username="alumno_notas",
        hashed_password=hash_password("alumno123"),
        role="alumno",
        nombre="Alumno Notas Test",
        email="alumno_notas@test.com",
        carrera_id=carrera.id,
    )
    profesor = User(
        username="prof_notas",
        hashed_password=hash_password("prof123"),
        role="profesor",
        nombre="Profesor Notas Test",
        email="prof_notas@test.com",
    )
    db.add_all([alumno, profesor])
    db.flush()

    materia = Materia(
        nombre="Base de Datos II",
        carrera_id=carrera.id,
        anio=2,
        semestre=1,
    )
    db.add(materia)
    db.flush()

    oferta = OfertaMateria(
        materia_id=materia.id,
        profesor_id=profesor.id,
        periodo="2026-1",
        activa=True,
    )
    db.add(oferta)
    db.flush()

    # Puntajes (notas) del alumno en esta oferta
    for pd in [
        {"tipo": "parcial1", "valor": 15.0},
        {"tipo": "parcial2", "valor": 16.0},
        {"tipo": "practico", "valor": 9.0},
        {"tipo": "final1", "valor": 32.5},
    ]:
        db.add(Puntaje(
            user_id=alumno.id,
            oferta_materia_id=oferta.id,
            tipo=pd["tipo"],
            valor=pd["valor"],
        ))
    db.flush()

    # Asistencias: 3 presentes + 1 ausente = 75%
    for i in range(4):
        db.add(Asistencia(
            user_id=alumno.id,
            oferta_materia_id=oferta.id,
            fecha=date(2026, 3, 10 + i),
            presente=(i < 3),
        ))
    db.commit()

    token = create_access_token({
        "sub": alumno.username,
        "role": "alumno",
        "user_id": alumno.id,
    })

    return {
        "alumno": alumno,
        "profesor": profesor,
        "carrera": carrera,
        "materia": materia,
        "oferta": oferta,
        "token": token,
    }


# ─── Tests: /notas/materia/{id}/detalle ──────────────────────────────────────

class TestMateriaDetalle:
    def test_sin_auth_retorna_401(self, client, notas_seed):
        resp = client.get(f"/notas/materia/{notas_seed['materia'].id}/detalle")
        assert resp.status_code == 401

    def test_materia_404(self, client, notas_seed):
        resp = client.get(
            "/notas/materia/99999/detalle",
            headers={"Authorization": f"Bearer {notas_seed['token']}"},
        )
        assert resp.status_code == 404
        assert "no encontrada" in resp.json()["detail"].lower()

    def test_detalle_completo(self, client, notas_seed):
        resp = client.get(
            f"/notas/materia/{notas_seed['materia'].id}/detalle",
            headers={"Authorization": f"Bearer {notas_seed['token']}"},
        )
        assert resp.status_code == 200
        data = resp.json()

        assert data["materiaId"] == notas_seed["materia"].id
        assert data["nombre"] == "Base de Datos II"
        assert data["profesor"] == "Profesor Notas Test"
        assert data["semestre"] == 1

        # Puntos: (15+16+9+32.5) sobre 100 max (20+20+10+50) reescalado a /10 = 7.25
        assert data["promedio"] == 7.25

        # Asistencia: 3/4 = 75%
        assert data["asistenciaPct"] == 75.0
        assert data["totalClases"] == 4
        assert data["presentes"] == 3

        desglose = {d["tipo"]: d for d in data["desglose"]}
        assert desglose["parcial1"]["nota"] == 15.0
        assert desglose["parcial2"]["nota"] == 16.0
        assert desglose["practico"]["nota"] == 9.0
        assert desglose["final1"]["nota"] == 32.5
        assert desglose["final2"]["nota"] is None  # no registrado
        assert desglose["parcial1"]["peso"] == 20
        assert desglose["final1"]["peso"] == 50
        assert desglose["parcial1"]["puntajeActividad"] == 20

    def test_profesor_tambien_accede(self, client, notas_seed):
        token_prof = create_access_token({
            "sub": notas_seed["profesor"].username,
            "role": "profesor",
            "user_id": notas_seed["profesor"].id,
        })
        resp = client.get(
            f"/notas/materia/{notas_seed['materia'].id}/detalle",
            headers={"Authorization": f"Bearer {token_prof}"},
        )
        assert resp.status_code == 200


# ─── Tests: /notas/materia/{id}/asistencia ───────────────────────────────────

class TestMateriaAsistencia:
    def test_sin_auth_retorna_401(self, client, notas_seed):
        resp = client.get(f"/notas/materia/{notas_seed['materia'].id}/asistencia")
        assert resp.status_code == 401

    def test_asistencia_ok(self, client, notas_seed):
        resp = client.get(
            f"/notas/materia/{notas_seed['materia'].id}/asistencia",
            headers={"Authorization": f"Bearer {notas_seed['token']}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["nombre"] == "Base de Datos II"
        assert len(data["registros"]) == 4

        r0 = data["registros"][0]
        assert "fecha" in r0
        assert r0["tipoClase"] == "P"
        assert r0["horasCatedra"] == 4

        estados = [r["asistenciaCargada"] for r in data["registros"]]
        assert estados.count("Presente") == 3
        assert estados.count("Ausente") == 1

    def test_materia_404(self, client, notas_seed):
        resp = client.get(
            "/notas/materia/99999/asistencia",
            headers={"Authorization": f"Bearer {notas_seed['token']}"},
        )
        assert resp.status_code == 404
