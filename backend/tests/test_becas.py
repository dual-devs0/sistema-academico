"""
Tests Fase 4 — Módulo Becas (HTTP).

Cubre:
- GET /becas/catalogo (público)
- POST /becas/postulaciones (alumno)
- PUT /becas/postulaciones/{id}/revisar — aprobar → crea BecaActiva
- PUT /becas/postulaciones/{id}/revisar — rechazar
- GET /becas/alumno/{id}/activas (shape exacto)
- GET /becas/postulaciones requiere fuente_id (mandatorio)
- GET /becas/reportes/rendicion retorna Excel
"""
from __future__ import annotations
import pytest
from decimal import Decimal

from app.models.financiero import BecaActiva, BecaCatalogo, FuenteBeca


# ─── helpers ─────────────────────────────────────────────────────────

def _seed_beca(db, seed, es_externa=False, porcentaje="30.00"):
    fuente = FuenteBeca(
        nombre="TestFuenteHTTP", tipo="test",
        es_externa=es_externa, requiere_reporte_externo=False,
        editable_porcentaje=True,
    )
    db.add(fuente)
    db.flush()
    beca = BecaCatalogo(
        nombre="Beca HTTP Test", fuente_id=fuente.id,
        porcentaje_descuento=Decimal(porcentaje),
        cupos_totales=10, cupos_disponibles=10,
    )
    db.add(beca)
    db.commit()
    db.refresh(fuente)
    db.refresh(beca)
    return fuente, beca


# ─── tests ───────────────────────────────────────────────────────────

class TestCatalogo:
    def test_catalogo_publico(self, client, seed, db):
        _seed_beca(db, seed)
        from app.auth import create_access_token
        token = create_access_token({"sub": seed["alumno"].username, "role": "alumno", "user_id": seed["alumno"].id})
        r = client.get("/becas/catalogo", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_catalogo_sin_auth_falla(self, client, seed):
        r = client.get("/becas/catalogo")
        assert r.status_code == 401


class TestPostulaciones:
    def test_alumno_puede_postular(self, client, seed, db):
        fuente, beca = _seed_beca(db, seed)
        from app.auth import create_access_token
        token = create_access_token({"sub": seed["alumno"].username, "role": "alumno", "user_id": seed["alumno"].id})
        r = client.post(
            "/becas/postulaciones",
            json={"beca_id": beca.id},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["estado"] == "pendiente"
        assert data["alumno_id"] == seed["alumno"].id

    def test_doble_postulacion_rechazada(self, client, seed, db):
        fuente, beca = _seed_beca(db, seed)
        from app.auth import create_access_token
        token = create_access_token({"sub": seed["alumno"].username, "role": "alumno", "user_id": seed["alumno"].id})
        headers = {"Authorization": f"Bearer {token}"}
        client.post("/becas/postulaciones", json={"beca_id": beca.id}, headers=headers)
        r = client.post("/becas/postulaciones", json={"beca_id": beca.id}, headers=headers)
        assert r.status_code == 409

    def test_profesor_no_puede_postular(self, client, seed, db):
        fuente, beca = _seed_beca(db, seed)
        from app.auth import create_access_token
        token = create_access_token({"sub": seed["profesor"].username, "role": "profesor", "user_id": seed["profesor"].id})
        r = client.post(
            "/becas/postulaciones",
            json={"beca_id": beca.id},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 403


class TestRevisionComite:
    def _postular_y_token_admin(self, client, seed, db):
        fuente, beca = _seed_beca(db, seed)
        from app.auth import create_access_token
        token_alumno = create_access_token({"sub": seed["alumno"].username, "role": "alumno", "user_id": seed["alumno"].id})
        token_admin = create_access_token({"sub": seed["admin"].username, "role": "admin", "user_id": seed["admin"].id})
        r = client.post(
            "/becas/postulaciones",
            json={"beca_id": beca.id},
            headers={"Authorization": f"Bearer {token_alumno}"},
        )
        return r.json()["id"], token_admin, fuente.id

    def test_aprobar_crea_beca_activa(self, client, seed, db):
        post_id, token_admin, fuente_id = self._postular_y_token_admin(client, seed, db)
        r = client.put(
            f"/becas/postulaciones/{post_id}/revisar",
            json={"estado": "aprobada"},
            headers={"Authorization": f"Bearer {token_admin}"},
        )
        assert r.status_code == 200
        assert r.json()["estado"] == "aprobada"

        # Verificar que BecaActiva fue creada
        from app.auth import create_access_token
        token_admin2 = create_access_token({"sub": seed["admin"].username, "role": "admin", "user_id": seed["admin"].id})
        r2 = client.get(
            f"/becas/alumno/{seed['alumno'].id}/activas",
            headers={"Authorization": f"Bearer {token_admin2}"},
        )
        assert r2.status_code == 200
        activas = r2.json()
        assert len(activas) >= 1

    def test_rechazar_postulacion(self, client, seed, db):
        post_id, token_admin, fuente_id = self._postular_y_token_admin(client, seed, db)
        r = client.put(
            f"/becas/postulaciones/{post_id}/revisar",
            json={"estado": "rechazada", "motivo_rechazo": "No cumple requisitos"},
            headers={"Authorization": f"Bearer {token_admin}"},
        )
        assert r.status_code == 200
        assert r.json()["estado"] == "rechazada"
        assert r.json()["motivo_rechazo"] == "No cumple requisitos"


class TestBecasActiasShape:
    def test_shape_exacto_enunciado(self, client, seed, db):
        """GET /becas/alumno/{id}/activas debe retornar los campos exactos del enunciado."""
        fuente, beca = _seed_beca(db, seed)
        activa = BecaActiva(
            alumno_id=seed["alumno"].id,
            beca_id=beca.id,
            fuente_id=fuente.id,
            periodo_inicio="2026-01",
            periodo_fin="2026-12",
            promedio_minimo_requerido=Decimal("4.0"),
            promedio_actual=Decimal("4.5"),
            estado_renovacion="vigente",
        )
        db.add(activa)
        db.commit()

        from app.auth import create_access_token
        token = create_access_token({"sub": seed["alumno"].username, "role": "alumno", "user_id": seed["alumno"].id})
        r = client.get(
            f"/becas/alumno/{seed['alumno'].id}/activas",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 1
        item = data[0]
        # Verificar todos los campos del enunciado
        required_fields = {
            "beca_nombre", "fuente", "es_externa", "porcentaje_descuento",
            "periodo_inicio", "periodo_fin", "promedio_minimo_requerido",
            "promedio_actual", "estado_renovacion",
        }
        assert required_fields.issubset(set(item.keys()))


class TestListadoPostulaciones:
    def test_requiere_fuente_id(self, client, seed, db):
        from app.auth import create_access_token
        token = create_access_token({"sub": seed["admin"].username, "role": "admin", "user_id": seed["admin"].id})
        # Sin fuente_id → 422
        r = client.get("/becas/postulaciones", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 422

    def test_con_fuente_id_funciona(self, client, seed, db):
        fuente, beca = _seed_beca(db, seed)
        from app.auth import create_access_token
        token = create_access_token({"sub": seed["admin"].username, "role": "admin", "user_id": seed["admin"].id})
        r = client.get(
            f"/becas/postulaciones?fuente_id={fuente.id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200
        assert isinstance(r.json(), list)


class TestRendicionExcelHTTP:
    def test_rendicion_retorna_xlsx(self, client, seed, db):
        fuente, beca = _seed_beca(db, seed, es_externa=True)
        # Renombrar fuente a ITAIPU para el query
        fuente.nombre = "ITAIPU"
        db.commit()
        from app.auth import create_access_token
        token = create_access_token({"sub": seed["admin"].username, "role": "admin", "user_id": seed["admin"].id})
        r = client.get(
            "/becas/reportes/rendicion?fuente=ITAIPU",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200
        assert "spreadsheetml" in r.headers.get("content-type", "")
