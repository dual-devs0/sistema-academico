"""create_financiero_becas

Fase 4 -- Módulo financiero, aranceles y becas diferenciadas.
Tablas nuevas: fuentes_beca, becas_catalogo, postulaciones_beca,
becas_activas, conceptos_arancel, cuotas, pagos, comprobantes,
auditoria_override_mora.
Columna nueva en carreras: max_cuotas_mora.

Revision ID: s6t7u8v9w0x1
Revises: r5s6t7u8v9w0
Create Date: 2026-07-08
"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = "s6t7u8v9w0x1"
down_revision: Union[str, None] = "r5s6t7u8v9w0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── columna nueva en carreras ────────────────────────────────────────
    op.add_column(
        "carreras",
        sa.Column("max_cuotas_mora", sa.Integer(), nullable=False, server_default="1"),
    )

    # ── fuentes_beca ─────────────────────────────────────────────────────
    op.create_table(
        "fuentes_beca",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nombre", sa.String(150), nullable=False, unique=True),
        sa.Column("tipo", sa.String(80), nullable=False),
        sa.Column("es_externa", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("requiere_reporte_externo", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("editable_porcentaje", sa.Boolean(), nullable=False, server_default="true"),
    )

    # seed: 4 fuentes iniciales
    fuentes_table = sa.table(
        "fuentes_beca",
        sa.column("nombre", sa.String),
        sa.column("tipo", sa.String),
        sa.column("es_externa", sa.Boolean),
        sa.column("requiere_reporte_externo", sa.Boolean),
        sa.column("editable_porcentaje", sa.Boolean),
    )
    op.bulk_insert(
        fuentes_table,
        [
            {"nombre": "ITAIPU",            "tipo": "convenio_externo",  "es_externa": True,  "requiere_reporte_externo": True,  "editable_porcentaje": False},
            {"nombre": "Institucional UCA", "tipo": "institucional",     "es_externa": False, "requiere_reporte_externo": False, "editable_porcentaje": True},
            {"nombre": "BECAL",             "tipo": "convenio_externo",  "es_externa": True,  "requiere_reporte_externo": True,  "editable_porcentaje": False},
            {"nombre": "Fundasep",          "tipo": "convenio_externo",  "es_externa": True,  "requiere_reporte_externo": True,  "editable_porcentaje": False},
        ],
    )

    # ── becas_catalogo ───────────────────────────────────────────────────
    op.create_table(
        "becas_catalogo",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nombre", sa.String(200), nullable=False),
        sa.Column("fuente_id", sa.Integer(), sa.ForeignKey("fuentes_beca.id"), nullable=False),
        sa.Column("porcentaje_descuento", sa.Numeric(5, 2), nullable=False),
        sa.Column("monto_fijo", sa.Numeric(12, 2), nullable=True),
        sa.Column("requisitos", sa.Text(), nullable=True),
        sa.Column("cupos_totales", sa.Integer(), nullable=True),
        sa.Column("cupos_disponibles", sa.Integer(), nullable=True),
        sa.CheckConstraint(
            "porcentaje_descuento >= 0 AND porcentaje_descuento <= 100",
            name="ck_beca_porcentaje_rango",
        ),
    )

    # ── postulaciones_beca ───────────────────────────────────────────────
    op.create_table(
        "postulaciones_beca",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("alumno_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("beca_id", sa.Integer(), sa.ForeignKey("becas_catalogo.id"), nullable=False),
        sa.Column("estado", sa.String(20), nullable=False, server_default="pendiente"),
        sa.Column("fecha_postulacion", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("documentos_storage_keys", sa.JSON(), nullable=True),
        sa.Column("motivo_rechazo", sa.Text(), nullable=True),
        sa.Column("revisado_por", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("revisado_en", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "estado IN ('pendiente','en_revision','aprobada','rechazada')",
            name="ck_postulacion_estado",
        ),
    )

    # ── becas_activas ────────────────────────────────────────────────────
    op.create_table(
        "becas_activas",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("alumno_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("beca_id", sa.Integer(), sa.ForeignKey("becas_catalogo.id"), nullable=False),
        sa.Column("fuente_id", sa.Integer(), sa.ForeignKey("fuentes_beca.id"), nullable=False),  # denorm para reportes
        sa.Column("periodo_inicio", sa.String(10), nullable=False),
        sa.Column("periodo_fin", sa.String(10), nullable=True),
        sa.Column("promedio_minimo_requerido", sa.Numeric(5, 2), nullable=True),
        sa.Column("promedio_actual", sa.Numeric(5, 2), nullable=True),
        sa.Column("estado_renovacion", sa.String(30), nullable=False, server_default="vigente"),
        sa.Column("otorgado_por", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("otorgado_en", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint(
            "estado_renovacion IN ('vigente','en_riesgo','suspendida','finalizada')",
            name="ck_beca_activa_estado",
        ),
    )

    # ── conceptos_arancel ────────────────────────────────────────────────
    op.create_table(
        "conceptos_arancel",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nombre", sa.String(200), nullable=False),
        sa.Column("carrera_id", sa.Integer(), sa.ForeignKey("carreras.id"), nullable=True),
        sa.Column("monto_base", sa.Numeric(12, 2), nullable=False),
        sa.Column("periodicidad", sa.String(80), nullable=False, server_default="mensual"),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default="true"),
    )

    # ── cuotas ───────────────────────────────────────────────────────────
    op.create_table(
        "cuotas",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("alumno_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("concepto_id", sa.Integer(), sa.ForeignKey("conceptos_arancel.id"), nullable=False),
        sa.Column("periodo", sa.String(10), nullable=False),
        sa.Column("monto", sa.Numeric(12, 2), nullable=False),
        sa.Column("monto_descuento", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("fecha_vencimiento", sa.Date(), nullable=False),
        sa.Column("estado", sa.String(20), nullable=False, server_default="pendiente"),
        sa.Column("beca_aplicada_id", sa.Integer(), sa.ForeignKey("becas_activas.id"), nullable=True),
        sa.Column("generado_en", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("generado_por", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.CheckConstraint(
            "estado IN ('pendiente','pagada','vencida','anulada')",
            name="ck_cuota_estado",
        ),
    )

    # ── pagos ─────────────────────────────────────────────────────────────
    op.create_table(
        "pagos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("cuota_id", sa.Integer(), sa.ForeignKey("cuotas.id"), nullable=False),
        sa.Column("monto_pagado", sa.Numeric(12, 2), nullable=False),
        sa.Column("fecha_pago", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("metodo", sa.String(50), nullable=False),           # transferencia, efectivo, cheque
        sa.Column("referencia", sa.String(200), nullable=True),
        sa.Column("registrado_por", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("pago_ajuste_ref_id", sa.Integer(), sa.ForeignKey("pagos.id"), nullable=True),  # para ajustes
        sa.Column("es_ajuste", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("nota_ajuste", sa.Text(), nullable=True),
    )

    # ── comprobantes ─────────────────────────────────────────────────────
    op.create_table(
        "comprobantes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("pago_id", sa.Integer(), sa.ForeignKey("pagos.id"), nullable=False, unique=True),
        sa.Column("numero_comprobante", sa.String(50), nullable=True),
        sa.Column("cdc", sa.String(44), nullable=True),               # DNIT — fase 4B
        sa.Column("storage_key", sa.String(500), nullable=True),
        sa.Column("fecha_emision", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── auditoria_override_mora ───────────────────────────────────────────
    op.create_table(
        "auditoria_override_mora",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("alumno_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("admin_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("oferta_materia_id", sa.Integer(), sa.ForeignKey("ofertas_materia.id"), nullable=True),
        sa.Column("motivo", sa.Text(), nullable=True),
        sa.Column("registrado_en", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("auditoria_override_mora")
    op.drop_table("comprobantes")
    op.drop_table("pagos")
    op.drop_table("cuotas")
    op.drop_table("conceptos_arancel")
    op.drop_table("becas_activas")
    op.drop_table("postulaciones_beca")
    op.drop_table("becas_catalogo")
    op.drop_table("fuentes_beca")
    op.drop_column("carreras", "max_cuotas_mora")
