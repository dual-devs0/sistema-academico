"""
Tests — Fase 5C: Pasantías.

6 endpoints:
  POST /pasantias/empresas
  POST /pasantias/solicitudes
  PUT  /pasantias/{id}/aprobar
  PUT  /pasantias/{id}/horas
  POST /pasantias/{id}/informes
  PUT  /pasantias/{id}/finalizar
"""

import pytest


# ── Helpers ──────────────────────────────────────────────────────────


def _crear_empresa(client, token, nombre="Empresa Test SA"):
    return client.post(
        "/pasantias/empresas",
        json={
            "nombre": nombre,
            "rubro": "Tecnología",
            "contacto": "Juan",
            "telefono": "021123456",
            "email": "juan@test.com",
            "convenio_activo": True,
        },
        headers={"Authorization": f"Bearer {token}"},
    )


def _solicitar(client, token, empresa_id):
    return client.post(
        "/pasantias/solicitudes",
        json={
            "empresa_id": empresa_id,
            "fecha_inicio": "2026-08-01",
            "horas_requeridas": 200,
        },
        headers={"Authorization": f"Bearer {token}"},
    )


# ── Tests ────────────────────────────────────────────────────────────


class TestEmpresas:
    def test_admin_crea_empresa(self, client, tokens):
        r = _crear_empresa(client, tokens["admin"])
        assert r.status_code == 200
        data = r.json()
        assert data["nombre"] == "Empresa Test SA"
        assert data["convenio_activo"] is True

    def test_empresa_duplicada_rechazada(self, client, tokens):
        _crear_empresa(client, tokens["admin"])
        r = _crear_empresa(client, tokens["admin"])
        assert r.status_code == 422

    def test_alumno_no_puede_crear_empresa(self, client, tokens):
        r = _crear_empresa(client, tokens["alumno"])
        assert r.status_code == 403


class TestSolicitudes:
    def test_alumno_solicita_pasantia(self, client, tokens):
        emp_r = _crear_empresa(client, tokens["admin"])
        empresa_id = emp_r.json()["id"]
        r = _solicitar(client, tokens["alumno"], empresa_id)
        assert r.status_code == 200
        data = r.json()
        assert data["estado"] == "pendiente"
        assert data["horas_requeridas"] == 200

    def test_empresa_inexistente_rechazada(self, client, tokens):
        r = _solicitar(client, tokens["alumno"], empresa_id=9999)
        assert r.status_code == 422

    def test_admin_no_puede_solicitar(self, client, tokens):
        emp_r = _crear_empresa(client, tokens["admin"])
        r = _solicitar(client, tokens["admin"], emp_r.json()["id"])
        assert r.status_code == 403


class TestListarSolicitudes:
    def test_alumno_ve_solo_las_propias(self, client, tokens):
        emp_r = _crear_empresa(client, tokens["admin"])
        _solicitar(client, tokens["alumno"], emp_r.json()["id"])
        r = client.get(
            "/pasantias/solicitudes",
            headers={"Authorization": f"Bearer {tokens['alumno']}"},
        )
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 1
        assert all("alumno_id" in p for p in data)

    def test_admin_ve_todas_con_empresa_nombre(self, client, tokens):
        emp_r = _crear_empresa(client, tokens["admin"], nombre="Empresa Listar SA")
        _solicitar(client, tokens["alumno"], emp_r.json()["id"])
        r = client.get(
            "/pasantias/solicitudes",
            headers={"Authorization": f"Bearer {tokens['admin']}"},
        )
        assert r.status_code == 200
        data = r.json()
        assert any(p["empresa_nombre"] == "Empresa Listar SA" for p in data)

    def test_admin_filtra_por_estado(self, client, tokens):
        emp_r = _crear_empresa(client, tokens["admin"], nombre="Empresa Filtro SA")
        _solicitar(client, tokens["alumno"], emp_r.json()["id"])
        r = client.get(
            "/pasantias/solicitudes?estado=pendiente",
            headers={"Authorization": f"Bearer {tokens['admin']}"},
        )
        assert r.status_code == 200
        assert all(p["estado"] == "pendiente" for p in r.json())

    def test_profesor_no_autorizado_403(self, client, tokens):
        r = client.get(
            "/pasantias/solicitudes",
            headers={"Authorization": f"Bearer {tokens['profesor']}"},
        )
        assert r.status_code == 403


@pytest.fixture()
def aprobar_setup(client, tokens):
    emp_r = _crear_empresa(client, tokens["admin"])
    sol_r = _solicitar(client, tokens["alumno"], emp_r.json()["id"])
    return sol_r.json()["id"]


class TestAprobacion:
    def test_aprobar_pasantia(self, client, tokens, aprobar_setup):
        prof_token = tokens["profesor"]
        prof_r = client.get(
            "/users/me", headers={"Authorization": f"Bearer {prof_token}"}
        )
        assert prof_r.status_code == 200
        tutor_id = prof_r.json()["id"]

        r = client.put(
            f"/pasantias/{aprobar_setup}/aprobar",
            params={"tutor_id": tutor_id},
            headers={"Authorization": f"Bearer {tokens['admin']}"},
        )
        assert r.status_code == 200
        assert r.json()["estado"] == "en_curso"

    def test_aprobar_tutor_inexistente(self, client, tokens, aprobar_setup):
        r = client.put(
            f"/pasantias/{aprobar_setup}/aprobar",
            params={"tutor_id": 9999},
            headers={"Authorization": f"Bearer {tokens['admin']}"},
        )
        assert r.status_code == 422


class TestHoras:
    def test_actualizar_horas(self, client, tokens, aprobar_setup):
        r = client.put(
            f"/pasantias/{aprobar_setup}/horas",
            json={"horas_completadas": 100},
            headers={"Authorization": f"Bearer {tokens['admin']}"},
        )
        assert r.status_code == 200
        assert r.json()["horas_completadas"] == 100


class TestFinalizar:
    def test_finalizar_pasantia(self, client, tokens, aprobar_setup):
        client.put(
            f"/pasantias/{aprobar_setup}/horas",
            json={"horas_completadas": 200},
            headers={"Authorization": f"Bearer {tokens['admin']}"},
        )
        r = client.put(
            f"/pasantias/{aprobar_setup}/finalizar",
            headers={"Authorization": f"Bearer {tokens['admin']}"},
        )
        assert r.status_code == 200
        assert r.json()["estado"] == "completada"

    def test_finalizar_sin_horas(self, client, tokens, aprobar_setup):
        r = client.put(
            f"/pasantias/{aprobar_setup}/finalizar",
            headers={"Authorization": f"Bearer {tokens['admin']}"},
        )
        assert r.status_code == 422
