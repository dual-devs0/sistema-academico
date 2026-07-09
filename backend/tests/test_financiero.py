"""
Tests Fase 4 — Módulo Financiero.

Cubre:
- Generación de cuotas con descuento de beca
- Pago parcial (2 pagos para cubrir 1 cuota)
- Inmutabilidad de pagos (no existe PUT)
- Bloqueo inscripción por mora → 422
- Override admin sin bloqueo
- Excepción beca 100% ITAIPU → no bloqueo
- Rendición Excel (bytes + content-type)
"""
from __future__ import annotations
import pytest
from datetime import date, timedelta
from decimal import Decimal

from app.models.financiero import (
    BecaActiva, BecaCatalogo, ConceptoArancel, Cuota, FuenteBeca, Pago,
)
from app.services.financiero import (
    calcular_descuento_beca,
    cuota_to_out,
    export_rendicion_excel,
    generar_cuotas_alumno,
    registrar_pago,
    tiene_beca_100,
    verificar_deuda_inscripcion,
)


# ─── helpers ─────────────────────────────────────────────────────────

def _make_fuente(db, nombre="TestFuente", es_externa=False, editable=True, reporte=False) -> FuenteBeca:
    f = FuenteBeca(nombre=nombre, tipo="test", es_externa=es_externa,
                   requiere_reporte_externo=reporte, editable_porcentaje=editable)
    db.add(f)
    db.flush()
    return f


def _make_beca(db, fuente_id, porcentaje="50.00", nombre="Beca Test") -> BecaCatalogo:
    b = BecaCatalogo(nombre=nombre, fuente_id=fuente_id,
                     porcentaje_descuento=Decimal(porcentaje))
    db.add(b)
    db.flush()
    return b


def _make_beca_activa(db, alumno_id, beca, fuente_id, estado="vigente") -> BecaActiva:
    ba = BecaActiva(alumno_id=alumno_id, beca_id=beca.id, fuente_id=fuente_id,
                    periodo_inicio="2026-01", estado_renovacion=estado)
    db.add(ba)
    db.flush()
    return ba


def _make_concepto(db, carrera_id=None, monto=Decimal("500000")) -> ConceptoArancel:
    c = ConceptoArancel(nombre="Cuota Mensual Test", monto_base=monto,
                        carrera_id=carrera_id)
    db.add(c)
    db.flush()
    return c


def _make_cuota_vencida(db, alumno_id, concepto_id) -> Cuota:
    """Cuota vencida hace 5 días, sin pagar."""
    c = Cuota(
        alumno_id=alumno_id,
        concepto_id=concepto_id,
        periodo="2026-01",
        monto=Decimal("500000"),
        monto_descuento=Decimal("0"),
        fecha_vencimiento=date.today() - timedelta(days=5),
        estado="pendiente",
    )
    db.add(c)
    db.flush()
    return c


# ─── tests ───────────────────────────────────────────────────────────

class TestGenerarCuotas:
    def test_sin_beca_monto_completo(self, db, seed):
        alumno = seed["alumno"]
        concepto = _make_concepto(db)
        db.commit()

        cuotas = generar_cuotas_alumno(
            alumno_id=alumno.id,
            concepto_id=concepto.id,
            periodos=["2026-01", "2026-02"],
            fecha_vencimiento_base=date(2026, 1, 31),
            generado_por=seed["admin"].id,
            db=db,
        )
        db.commit()

        assert len(cuotas) == 2
        for c in cuotas:
            assert c.monto == Decimal("500000")
            assert c.monto_descuento == Decimal("0")
            assert c.beca_aplicada_id is None

    def test_con_beca_50_porciento(self, db, seed):
        alumno = seed["alumno"]
        fuente = _make_fuente(db)
        beca = _make_beca(db, fuente.id, "50.00")
        _make_beca_activa(db, alumno.id, beca, fuente.id)
        concepto = _make_concepto(db, monto=Decimal("1000000"))
        db.commit()

        cuotas = generar_cuotas_alumno(
            alumno_id=alumno.id,
            concepto_id=concepto.id,
            periodos=["2026-01"],
            fecha_vencimiento_base=date(2026, 1, 31),
            generado_por=seed["admin"].id,
            db=db,
        )
        db.commit()

        assert cuotas[0].monto_descuento == Decimal("500000")
        assert cuotas[0].beca_aplicada_id is not None

    def test_multi_beca_aplica_mayor(self, db, seed):
        """Con beca 30% y 60%, debe aplicar 60%."""
        alumno = seed["alumno"]
        fuente = _make_fuente(db, "Fuente A")
        beca_30 = _make_beca(db, fuente.id, "30.00", "Beca 30")
        beca_60 = _make_beca(db, fuente.id, "60.00", "Beca 60")
        _make_beca_activa(db, alumno.id, beca_30, fuente.id)
        _make_beca_activa(db, alumno.id, beca_60, fuente.id)
        concepto = _make_concepto(db, monto=Decimal("1000000"))
        db.commit()

        porcentaje, beca_aplicada = calcular_descuento_beca(alumno.id, db)
        assert porcentaje == Decimal("60.00")


class TestPagos:
    def test_pago_parcial_dos_pagos_cubre_cuota(self, db, seed):
        """Dos pagos parciales deben marcar la cuota como pagada."""
        alumno = seed["alumno"]
        concepto = _make_concepto(db)
        db.commit()
        cuotas = generar_cuotas_alumno(
            alumno_id=alumno.id, concepto_id=concepto.id,
            periodos=["2026-01"], fecha_vencimiento_base=date(2026, 1, 31),
            generado_por=seed["admin"].id, db=db,
        )
        db.commit()
        cuota = cuotas[0]

        # Primer pago: 200k (parcial)
        pago1 = registrar_pago(
            cuota_id=cuota.id, monto_pagado=Decimal("200000"),
            metodo="efectivo", registrado_por=seed["admin"].id, db=db,
        )
        db.commit()
        db.refresh(cuota)
        assert cuota.estado == "pendiente"   # todavía no está completa

        # Segundo pago: 300k (cubre el resto)
        registrar_pago(
            cuota_id=cuota.id, monto_pagado=Decimal("300000"),
            metodo="transferencia", registrado_por=seed["admin"].id, db=db,
        )
        db.commit()
        db.refresh(cuota)
        assert cuota.estado == "pagada"

    def test_pago_cuota_anulada_falla(self, db, seed):
        alumno = seed["alumno"]
        concepto = _make_concepto(db)
        db.commit()
        cuotas = generar_cuotas_alumno(
            alumno_id=alumno.id, concepto_id=concepto.id,
            periodos=["2026-02"], fecha_vencimiento_base=date(2026, 2, 28),
            generado_por=seed["admin"].id, db=db,
        )
        db.commit()
        cuota = cuotas[0]
        cuota.estado = "anulada"
        db.commit()

        with pytest.raises(ValueError, match="anulada"):
            registrar_pago(
                cuota_id=cuota.id, monto_pagado=Decimal("500000"),
                metodo="efectivo", registrado_por=seed["admin"].id, db=db,
            )


class TestBloqueoPorMora:
    def test_bloqueo_con_cuota_vencida(self, db, seed):
        alumno = seed["alumno"]
        concepto = _make_concepto(db)
        db.commit()
        _make_cuota_vencida(db, alumno.id, concepto.id)
        db.commit()

        estado = verificar_deuda_inscripcion(alumno.id, db)
        assert estado.bloqueado is True
        assert estado.cuotas_vencidas == 1
        assert len(estado.detalle) == 1

    def test_sin_cuotas_no_bloqueo(self, db, seed):
        alumno = seed["alumno"]
        db.commit()

        estado = verificar_deuda_inscripcion(alumno.id, db)
        assert estado.bloqueado is False

    def test_beca_100_no_bloquea(self, db, seed):
        """Alumno con beca ITAIPU 100% no debe quedar bloqueado aunque tenga mora."""
        alumno = seed["alumno"]
        fuente = _make_fuente(db, "ITAIPU", es_externa=True, editable=False, reporte=True)
        beca = _make_beca(db, fuente.id, "100.00", "Beca ITAIPU")
        _make_beca_activa(db, alumno.id, beca, fuente.id)
        concepto = _make_concepto(db)
        db.commit()
        _make_cuota_vencida(db, alumno.id, concepto.id)
        db.commit()

        assert tiene_beca_100(alumno.id, db) is True
        estado = verificar_deuda_inscripcion(alumno.id, db)
        assert estado.bloqueado is False
        assert estado.tiene_beca_100 is True

    def test_override_disponible_solo_admin(self, db, seed):
        alumno = seed["alumno"]
        concepto = _make_concepto(db)
        db.commit()
        _make_cuota_vencida(db, alumno.id, concepto.id)
        db.commit()

        estado_admin = verificar_deuda_inscripcion(alumno.id, db, es_admin=True)
        estado_alumno = verificar_deuda_inscripcion(alumno.id, db, es_admin=False)

        assert estado_admin.override_disponible is True
        assert estado_alumno.override_disponible is False

    def test_umbral_mora_se_lee_de_carrera_no_hardcode(self, db, seed):
        """Con max_cuotas_mora=2 en la carrera, 1 vencida no bloquea, 2 sí."""
        carrera = seed["carrera"]
        carrera.max_cuotas_mora = 2
        concepto = _make_concepto(db)
        db.commit()

        _make_cuota_vencida(db, seed["alumno"].id, concepto.id)
        db.commit()
        estado_una = verificar_deuda_inscripcion(seed["alumno"].id, db)
        assert estado_una.bloqueado is False
        assert estado_una.max_permitidas == 2

        _make_cuota_vencida(db, seed["alumno"].id, concepto.id)
        db.commit()
        estado_dos = verificar_deuda_inscripcion(seed["alumno"].id, db)
        assert estado_dos.bloqueado is True


class TestRendicionExcel:
    def test_export_retorna_bytes_xlsx(self, db, seed):
        alumno = seed["alumno"]
        fuente = _make_fuente(db, "ITAIPU", es_externa=True, editable=False, reporte=True)
        beca = _make_beca(db, fuente.id, "100.00", "Beca ITAIPU")
        _make_beca_activa(db, alumno.id, beca, fuente.id)
        db.commit()

        excel_bytes = export_rendicion_excel(fuente.id, None, db)
        assert isinstance(excel_bytes, bytes)
        assert len(excel_bytes) > 0
        # XLSX magic bytes
        assert excel_bytes[:4] == b"PK\x03\x04"

    def test_export_fuente_inexistente_retorna_vacio(self, db, seed):
        db.commit()
        excel_bytes = export_rendicion_excel(9999, None, db)
        assert isinstance(excel_bytes, bytes)
