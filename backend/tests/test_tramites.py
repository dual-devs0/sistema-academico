"""
Tests Fase 5A — Solicitudes y trámites.

Cubre:
- Trámite automático (constancia regular) con alumno activo → auto-resuelto
- Trámite automático con alumno no-regular → 422 con motivo
- Trámite manual → queda pendiente, admin resuelve
- Autorización: dueño-o-admin en descarga
"""

from __future__ import annotations
from datetime import date, timedelta
from unittest.mock import patch

import pytest

from app.models.asistencia import Asistencia
from app.models.tramites import TipoTramite
from app.services.tramites import crear_solicitud


def _make_tipos_tramite(db):
    auto1 = TipoTramite(
        nombre="Constancia de alumno regular",
        requiere_aprobacion=False,
        dias_estimados=0,
    )
    auto2 = TipoTramite(
        nombre="Historial académico oficial",
        requiere_aprobacion=False,
        dias_estimados=0,
    )
    manual1 = TipoTramite(
        nombre="Carta de presentación", requiere_aprobacion=True, dias_estimados=5
    )
    db.add_all([auto1, auto2, manual1])
    db.flush()
    return {"constancia": auto1, "historial": auto2, "carta": manual1}


def _romper_regularidad(db, alumno_id, oferta_id):
    """Genera asistencia con <75% de presentes para forzar estado 'en_riesgo'."""
    for i in range(10):
        db.add(
            Asistencia(
                user_id=alumno_id,
                oferta_materia_id=oferta_id,
                fecha=date.today() - timedelta(days=i),
                presente=(i < 3),  # 3/10 = 30% < 75%
            )
        )
    db.flush()


class TestTiposTramite:
    def test_listar_tipos(self, client, db, seed):
        from app.auth import create_access_token

        _make_tipos_tramite(db)
        db.commit()
        token = create_access_token(
            {
                "sub": seed["alumno"].username,
                "role": "alumno",
                "user_id": seed["alumno"].id,
            }
        )
        r = client.get("/tramites/tipos", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        assert len(r.json()) == 3


class TestSolicitudAutomatica:
    def test_alumno_activo_genera_constancia_auto(self, db, seed):
        tipos = _make_tipos_tramite(db)
        db.commit()

        with patch(
            "app.services.tramites.subir_archivo", return_value="tramite/fake-key.pdf"
        ) as mock_subir:
            solicitud = crear_solicitud(seed["alumno"].id, tipos["constancia"].id, db)
            db.commit()

        assert solicitud.estado == "resuelta"
        assert solicitud.storage_key_resultado == "tramite/fake-key.pdf"
        assert solicitud.resuelto_por is None
        assert solicitud.fecha_resolucion is not None
        mock_subir.assert_called_once()

    def test_alumno_no_regular_rechaza_con_motivo(self, db, seed):
        tipos = _make_tipos_tramite(db)
        _romper_regularidad(db, seed["alumno"].id, seed["oferta"].id)
        db.commit()

        with patch("app.services.tramites.subir_archivo") as mock_subir:
            with pytest.raises(ValueError, match="en_riesgo"):
                crear_solicitud(seed["alumno"].id, tipos["constancia"].id, db)
        mock_subir.assert_not_called()

    def test_historial_oficial_auto_resuelto(self, db, seed):
        tipos = _make_tipos_tramite(db)
        db.commit()

        with patch(
            "app.services.tramites.subir_archivo", return_value="tramite/historial.pdf"
        ):
            solicitud = crear_solicitud(seed["alumno"].id, tipos["historial"].id, db)
            db.commit()

        assert solicitud.estado == "resuelta"
        assert solicitud.storage_key_resultado == "tramite/historial.pdf"


class TestListadoDualRole:
    def test_admin_ve_todas_alumno_solo_las_propias(self, client, db, seed):
        from app.auth import create_access_token

        tipos = _make_tipos_tramite(db)
        db.commit()
        with patch("app.services.tramites.subir_archivo", return_value="tramite/x.pdf"):
            crear_solicitud(seed["alumno"].id, tipos["constancia"].id, db)
            crear_solicitud(seed["alumno2"].id, tipos["constancia"].id, db)
            db.commit()

        token_admin = create_access_token(
            {
                "sub": seed["admin"].username,
                "role": "admin",
                "user_id": seed["admin"].id,
            }
        )
        r_admin = client.get(
            "/tramites/solicitudes/mias",
            headers={"Authorization": f"Bearer {token_admin}"},
        )
        assert r_admin.status_code == 200
        assert len(r_admin.json()) == 2

        token_alumno = create_access_token(
            {
                "sub": seed["alumno"].username,
                "role": "alumno",
                "user_id": seed["alumno"].id,
            }
        )
        r_alumno = client.get(
            "/tramites/solicitudes/mias",
            headers={"Authorization": f"Bearer {token_alumno}"},
        )
        assert r_alumno.status_code == 200
        assert len(r_alumno.json()) == 1
        assert r_alumno.json()[0]["alumno_id"] == seed["alumno"].id


class TestSolicitudManual:
    def test_tramite_manual_queda_pendiente(self, db, seed):
        tipos = _make_tipos_tramite(db)
        db.commit()

        solicitud = crear_solicitud(seed["alumno"].id, tipos["carta"].id, db)
        db.commit()

        assert solicitud.estado == "pendiente"
        assert solicitud.storage_key_resultado is None

    def test_admin_resuelve_manual_via_endpoint(self, client, db, seed):
        from app.auth import create_access_token

        tipos = _make_tipos_tramite(db)
        db.commit()
        solicitud = crear_solicitud(seed["alumno"].id, tipos["carta"].id, db)
        db.commit()

        token_admin = create_access_token(
            {
                "sub": seed["admin"].username,
                "role": "admin",
                "user_id": seed["admin"].id,
            }
        )
        r = client.put(
            f"/tramites/solicitudes/{solicitud.id}/resolver",
            data={"estado": "rechazada", "motivo_rechazo": "Documentación incompleta"},
            headers={"Authorization": f"Bearer {token_admin}"},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["estado"] == "rechazada"
        assert data["motivo_rechazo"] == "Documentación incompleta"
        assert data["resuelto_por"] == seed["admin"].id


class TestAutorizacionDescarga:
    def test_alumno_ve_su_propia_solicitud(self, client, db, seed):
        from app.auth import create_access_token

        tipos = _make_tipos_tramite(db)
        db.commit()
        with patch(
            "app.services.tramites.subir_archivo", return_value="tramite/ok.pdf"
        ):
            solicitud = crear_solicitud(seed["alumno"].id, tipos["constancia"].id, db)
            db.commit()

        with patch(
            "app.routers.tramites_router.obtener_url_firmada",
            return_value="https://signed.example/ok.pdf",
        ):
            token = create_access_token(
                {
                    "sub": seed["alumno"].username,
                    "role": "alumno",
                    "user_id": seed["alumno"].id,
                }
            )
            r = client.get(
                f"/tramites/solicitudes/{solicitud.id}/descargar",
                headers={"Authorization": f"Bearer {token}"},
            )
        assert r.status_code == 200
        assert r.json()["download_url"] == "https://signed.example/ok.pdf"

    def test_otro_alumno_no_puede_ver(self, client, db, seed):
        from app.auth import create_access_token

        tipos = _make_tipos_tramite(db)
        db.commit()
        with patch(
            "app.services.tramites.subir_archivo", return_value="tramite/ok.pdf"
        ):
            solicitud = crear_solicitud(seed["alumno"].id, tipos["constancia"].id, db)
            db.commit()

        token = create_access_token(
            {
                "sub": seed["alumno2"].username,
                "role": "alumno",
                "user_id": seed["alumno2"].id,
            }
        )
        r = client.get(
            f"/tramites/solicitudes/{solicitud.id}/descargar",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 403

    def test_descarga_sin_resolver_404(self, client, db, seed):
        from app.auth import create_access_token

        tipos = _make_tipos_tramite(db)
        db.commit()
        solicitud = crear_solicitud(
            seed["alumno"].id, tipos["carta"].id, db
        )  # manual, sin resolver
        db.commit()

        token = create_access_token(
            {
                "sub": seed["alumno"].username,
                "role": "alumno",
                "user_id": seed["alumno"].id,
            }
        )
        r = client.get(
            f"/tramites/solicitudes/{solicitud.id}/descargar",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 404
