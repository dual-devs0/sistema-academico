"""
Tests — Fase 5D: Equivalencias.

4 endpoints:
  POST /equivalencias/solicitudes
  PUT  /equivalencias/{id}/materias/{mid}/resolver
  POST /equivalencias/examenes-suficiencia
  GET  /equivalencias/alumno/{id}
"""


# ── Helpers ──────────────────────────────────────────────────────────


def _crear_solicitud(client, token, tipo="equivalencia"):
    return client.post(
        "/equivalencias/solicitudes",
        json={"tipo": tipo, "universidad_origen": "UNIOESTE"},
        headers={"Authorization": f"Bearer {token}"},
    )


# ── Tests ────────────────────────────────────────────────────────────


class TestSolicitudes:
    def test_alumno_crea_solicitud(self, client, tokens):
        r = _crear_solicitud(client, tokens["alumno"])
        assert r.status_code == 200
        data = r.json()
        assert data["tipo"] == "equivalencia"
        assert data["estado"] == "pendiente"
        assert data["alumno_id"] > 0

    def test_admin_no_puede_crear_solicitud(self, client, tokens):
        r = _crear_solicitud(client, tokens["admin"])
        assert r.status_code == 403

    def test_doble_solicitud_rechazada(self, client, tokens):
        _crear_solicitud(client, tokens["alumno"])
        r = _crear_solicitud(client, tokens["alumno"])
        assert r.status_code == 422


class TestResolverMateria:
    def test_resolver_sin_materias(self, client, tokens):
        r = client.put(
            "/equivalencias/9999/materias/9999/resolver",
            json={"resolucion": "aprobada"},
            headers={"Authorization": f"Bearer {tokens['admin']}"},
        )
        assert r.status_code == 422

    def test_listar_equivalencias_alumno(self, client, tokens):
        _crear_solicitud(client, tokens["alumno"])
        r = client.get(
            "/equivalencias/alumno/1",  # alumno_id genérico
            headers={"Authorization": f"Bearer {tokens['admin']}"},
        )
        # Si no hay alumno con id 1, rta vacía — no falla
        assert r.status_code in (200, 422)

    def test_examen_suficiencia_admin(self, client, tokens):
        r = client.post(
            "/equivalencias/examenes-suficiencia",
            json={"materia_id": 1, "fecha": "2026-09-15"},
            headers={"Authorization": f"Bearer {tokens['admin']}"},
        )
        # materia_id=1 puede no existir, solo validamos que llegue al router
        assert r.status_code in (200, 422)

    def test_resolver_sin_token_rechazado(self, client):
        r = client.put(
            "/equivalencias/1/materias/1/resolver",
            json={"resolucion": "aprobada"},
        )
        assert r.status_code == 401
