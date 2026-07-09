"""create_graduacion_pasantias_equivalencias

Fases 5B + 5C + 5D — tablas de graduación, pasantías y equivalencias.

Revision ID: v0w1x2y3z4a5
Revises: u8v9w0x1y2z3
Create Date: 2026-07-09
"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = "v0w1x2y3z4a5"
down_revision: Union[str, None] = "u8v9w0x1y2z3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    # ── Fase 5C: Pasantías ──────────────────────────────────────────────
    if not insp.has_table("empresas_receptoras"):
        op.create_table(
            "empresas_receptoras",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("nombre", sa.String(200), nullable=False, unique=True),
            sa.Column("rubro", sa.String(100), nullable=True),
            sa.Column("contacto", sa.String(150), nullable=True),
            sa.Column("telefono", sa.String(30), nullable=True),
            sa.Column("email", sa.String(200), nullable=True),
            sa.Column("convenio_activo", sa.Boolean(), nullable=False, server_default="false"),
        )

    if not insp.has_table("pasantias"):
        op.create_table(
            "pasantias",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("alumno_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("empresa_id", sa.Integer(), sa.ForeignKey("empresas_receptoras.id"), nullable=False),
            sa.Column("tutor_academico_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("fecha_inicio", sa.Date(), nullable=False),
            sa.Column("fecha_fin", sa.Date(), nullable=True),
            sa.Column("horas_requeridas", sa.Integer(), nullable=False),
            sa.Column("horas_completadas", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("estado", sa.String(20), nullable=False, server_default="pendiente"),
            sa.CheckConstraint(
                "estado IN ('pendiente','en_curso','completada','rechazada')",
                name="ck_pasantia_estado",
            ),
        )

    if not insp.has_table("informes_pasantia"):
        op.create_table(
            "informes_pasantia",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("pasantia_id", sa.Integer(), sa.ForeignKey("pasantias.id"), nullable=False),
            sa.Column("tipo", sa.String(30), nullable=False),
            sa.Column("storage_key", sa.String(500), nullable=True),
            sa.Column("fecha_entrega", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.CheckConstraint(
                "tipo IN ('plan_trabajo','informe_parcial','informe_final')",
                name="ck_informe_tipo",
            ),
        )

    # ── Fase 5B: Graduación ─────────────────────────────────────────────
    if not insp.has_table("procesos_graduacion"):
        op.create_table(
            "procesos_graduacion",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("alumno_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("fecha_inicio", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("estado", sa.String(20), nullable=False, server_default="en_proceso"),
            sa.Column("tutor_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
            sa.CheckConstraint(
                "estado IN ('en_proceso','tesis_en_curso','tesis_aprobada','graduado','rechazado')",
                name="ck_proceso_graduacion_estado",
            ),
        )

    if not insp.has_table("etapas_tesis"):
        op.create_table(
            "etapas_tesis",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("proceso_id", sa.Integer(), sa.ForeignKey("procesos_graduacion.id"), nullable=False),
            sa.Column("nombre_etapa", sa.String(200), nullable=False),
            sa.Column("fecha_limite", sa.Date(), nullable=True),
            sa.Column("estado", sa.String(20), nullable=False, server_default="pendiente"),
            sa.Column("observaciones", sa.Text(), nullable=True),
            sa.CheckConstraint(
                "estado IN ('pendiente','en_curso','aprobada','rechazada')",
                name="ck_etapa_tesis_estado",
            ),
        )

    if not insp.has_table("verificacion_solvencia"):
        op.create_table(
            "verificacion_solvencia",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("proceso_id", sa.Integer(), sa.ForeignKey("procesos_graduacion.id"), nullable=False),
            sa.Column("solvencia_financiera", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("solvencia_biblioteca", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("fecha_verificacion", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )

    # ── Fase 5D: Equivalencias ──────────────────────────────────────────
    if not insp.has_table("solicitudes_equivalencia"):
        op.create_table(
            "solicitudes_equivalencia",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("alumno_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("tipo", sa.String(30), nullable=False),
            sa.Column("universidad_origen", sa.String(200), nullable=True),
            sa.Column("estado", sa.String(20), nullable=False, server_default="pendiente"),
            sa.CheckConstraint(
                "tipo IN ('equivalencia','convalidacion')",
                name="ck_solicitud_equivalencia_tipo",
            ),
            sa.CheckConstraint(
                "estado IN ('pendiente','en_proceso','resuelta','rechazada')",
                name="ck_solicitud_equivalencia_estado",
            ),
        )

    if not insp.has_table("equivalencias_materia"):
        op.create_table(
            "equivalencias_materia",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("solicitud_id", sa.Integer(), sa.ForeignKey("solicitudes_equivalencia.id"), nullable=False),
            sa.Column("materia_origen_nombre", sa.String(200), nullable=False),
            sa.Column("materia_destino_id", sa.Integer(), sa.ForeignKey("materias.id"), nullable=True),
            sa.Column("programa_analitico_storage_key", sa.String(500), nullable=True),
            sa.Column("resolucion", sa.String(30), nullable=True),
            sa.CheckConstraint(
                "resolucion IN ('aprobada','rechazada','pendiente')",
                name="ck_equivalencia_resolucion",
            ),
        )

    if not insp.has_table("examenes_suficiencia"):
        op.create_table(
            "examenes_suficiencia",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("alumno_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("materia_id", sa.Integer(), sa.ForeignKey("materias.id"), nullable=False),
            sa.Column("fecha", sa.Date(), nullable=False),
            sa.Column("resultado", sa.String(20), nullable=True),
            sa.CheckConstraint(
                "resultado IN ('aprobado','reprobado','pendiente')",
                name="ck_examen_suficiencia_resultado",
            ),
        )


def downgrade() -> None:
    op.drop_table("examenes_suficiencia")
    op.drop_table("equivalencias_materia")
    op.drop_table("solicitudes_equivalencia")
    op.drop_table("verificacion_solvencia")
    op.drop_table("etapas_tesis")
    op.drop_table("procesos_graduacion")
    op.drop_table("informes_pasantia")
    op.drop_table("pasantias")
    op.drop_table("empresas_receptoras")