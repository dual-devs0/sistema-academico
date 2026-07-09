"""
Tests — Fase 5B: Graduación.

6 endpoints + verificar_condicion_egreso como función pura.
"""

from app.services.graduacion import verificar_condicion_egreso
from app.models.pensum_materia import PensumMateria
from app.models.avance_alumno_pensum import AvanceAlumnoPensum
from app.models.expediente_materia import ExpedienteMateria
from app.models.oferta_materia import OfertaMateria


# ── Helper ───────────────────────────────────────────────────────────


def _avanzar_alumno(db, seed, creditos=10):
    """Simula que el alumno aprobó materias suficientes en su pensum."""
    pm = PensumMateria(
        carrera_id=seed["carrera"].id,
        materia_id=seed["materia"].id,
        semestre=1,
        creditos=creditos,
    )
    db.add(pm)
    db.flush()

    avance = AvanceAlumnoPensum(
        alumno_id=seed["alumno"].id,
        pensum_materia_id=pm.id,
        estado="aprobada",
    )
    db.add(avance)
    db.flush()

    # También dar nota en expediente para que PPA no sea None
    oferta = OfertaMateria(
        materia_id=seed["materia"].id,
        profesor_id=seed["profesor"].id,
        periodo=f"2026-GRAD-{seed['alumno'].id}",
        activa=False,
    )
    db.add(oferta)
    db.flush()

    exp = ExpedienteMateria(
        alumno_id=seed["alumno"].id,
        oferta_materia_id=oferta.id,
        nota_final=8.0,
        creditos=creditos,
        condicion="aprobada",
        cerrado_por=seed["admin"].id,
    )
    db.add(exp)
    db.flush()

    return pm, oferta


# ── Tests ────────────────────────────────────────────────────────────


class TestCondicionEgreso:
    def test_alumno_sin_datos_no_puede_graduarse(self, db, seed):
        cond = verificar_condicion_egreso(seed["alumno"].id, db)
        assert cond["puede_graduarse"] is False
        assert cond["cumple_creditos"] is False

    def test_alumno_con_creditos_suficientes_y_ppa_alto(self, db, seed):
        _avanzar_alumno(db, seed, creditos=100)
        # Set creditos_totales en carrera
        seed["carrera"].creditos_totales = 100
        db.flush()

        cond = verificar_condicion_egreso(seed["alumno"].id, db)
        assert cond["cumple_creditos"] is True
        assert cond["cumple_ppa"] is True
        assert cond["puede_graduarse"] is True

    def test_alumno_con_creditos_insuficientes(self, db, seed):
        _avanzar_alumno(db, seed, creditos=30)
        seed["carrera"].creditos_totales = 100
        db.flush()

        cond = verificar_condicion_egreso(seed["alumno"].id, db)
        assert cond["cumple_creditos"] is False
        assert cond["puede_graduarse"] is False
        assert "Créditos insuficientes" in (cond["motivo"] or "")

    def test_alumno_inexistente(self, db, seed):
        cond = verificar_condicion_egreso(9999, db)
        assert cond["puede_graduarse"] is False
        assert "Alumno no encontrado" in (cond["motivo"] or "")


class TestProcesosEndpoint:
    def test_iniciar_proceso_exitoso(self, client, tokens, db, seed):
        _avanzar_alumno(db, seed, creditos=100)
        seed["carrera"].creditos_totales = 100
        db.commit()

        r = client.post(
            "/graduacion/procesos",
            json={"alumno_id": seed["alumno"].id},
            headers={"Authorization": f"Bearer {tokens['admin']}"},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["estado"] == "en_proceso"
        assert data["alumno_id"] == seed["alumno"].id

    def test_iniciar_proceso_sin_condiciones(self, client, tokens, seed):
        r = client.post(
            "/graduacion/procesos",
            json={"alumno_id": seed["alumno"].id},
            headers={"Authorization": f"Bearer {tokens['admin']}"},
        )
        assert r.status_code == 422

    def test_condicion_egreso_endpoint(self, client, tokens, seed):
        r = client.get(
            f"/graduacion/alumno/{seed['alumno'].id}/condicion",
            headers={"Authorization": f"Bearer {tokens['admin']}"},
        )
        assert r.status_code == 200
        assert "puede_graduarse" in r.json()

    def test_alumno_no_autorizado_para_procesos(self, client, tokens, seed):
        r = client.post(
            "/graduacion/procesos",
            json={"alumno_id": seed["alumno"].id},
            headers={"Authorization": f"Bearer {tokens['alumno']}"},
        )
        assert r.status_code == 403

    def test_solvencia_endpoint_empty(self, client, tokens, seed):
        r = client.get(
            "/graduacion/procesos/9999/solvencia",
            headers={"Authorization": f"Bearer {tokens['admin']}"},
        )
        assert r.status_code == 404
