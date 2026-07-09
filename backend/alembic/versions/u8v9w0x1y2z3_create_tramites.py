"""create_tramites

Fase 5A -- Solicitudes y trámites formales.
Tablas nuevas: tipos_tramite, solicitudes.
Siembra 4 tipos fijos: 2 automáticos (constancia de alumno regular,
historial académico oficial) y 2 manuales (carta de presentación,
constancia de egreso — dependen de Fases 5C/5D).

Revision ID: u8v9w0x1y2z3
Revises: t7u8v9w0x1y2
Create Date: 2026-07-09
"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = "u8v9w0x1y2z3"
down_revision: Union[str, None] = "t7u8v9w0x1y2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Idempotente: neondb_test corre test_postgres_compat.py::pg_engine que
    # llama Base.metadata.create_all() contra la DB real de test, así que
    # las tablas de un modelo nuevo pueden existir ya antes de que esta
    # migración se aplique. Mismo patrón defensivo que s6t7u8v9w0x1.
    bind = op.get_bind()
    insp = sa.inspect(bind)

    if not insp.has_table("tipos_tramite"):
        op.create_table(
            "tipos_tramite",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("nombre", sa.String(200), nullable=False, unique=True),
            sa.Column("descripcion", sa.Text(), nullable=True),
            sa.Column("requiere_aprobacion", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("dias_estimados", sa.Integer(), nullable=True),
        )

    tipos_table = sa.table(
        "tipos_tramite",
        sa.column("nombre", sa.String),
        sa.column("descripcion", sa.String),
        sa.column("requiere_aprobacion", sa.Boolean),
        sa.column("dias_estimados", sa.Integer),
    )
    ya_sembrado = bind.execute(sa.text("SELECT COUNT(*) FROM tipos_tramite")).scalar()
    if not ya_sembrado:
        op.bulk_insert(
            tipos_table,
            [
                {
                    "nombre": "Constancia de alumno regular",
                    "descripcion": "Generación automática — requiere estado de regularidad 'activo'.",
                    "requiere_aprobacion": False,
                    "dias_estimados": 0,
                },
                {
                    "nombre": "Historial académico oficial",
                    "descripcion": "Generación automática — requiere estado de regularidad 'activo'.",
                    "requiere_aprobacion": False,
                    "dias_estimados": 0,
                },
                {
                    "nombre": "Carta de presentación",
                    "descripcion": "Revisión manual por administración (Fase 5C — pasantías).",
                    "requiere_aprobacion": True,
                    "dias_estimados": 5,
                },
                {
                    "nombre": "Constancia de egreso",
                    "descripcion": "Revisión manual por administración (Fase 5D — graduación).",
                    "requiere_aprobacion": True,
                    "dias_estimados": 10,
                },
            ],
        )

    if not insp.has_table("solicitudes"):
        op.create_table(
            "solicitudes",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("alumno_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("tipo_tramite_id", sa.Integer(), sa.ForeignKey("tipos_tramite.id"), nullable=False),
            sa.Column("estado", sa.String(20), nullable=False, server_default="pendiente"),
            sa.Column("fecha_solicitud", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("fecha_resolucion", sa.DateTime(timezone=True), nullable=True),
            sa.Column("resuelto_por", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("storage_key_resultado", sa.String(500), nullable=True),
            sa.Column("motivo_rechazo", sa.Text(), nullable=True),
            sa.CheckConstraint(
                "estado IN ('pendiente','en_proceso','resuelta','rechazada')",
                name="ck_solicitud_estado",
            ),
        )


def downgrade() -> None:
    op.drop_table("solicitudes")
    op.drop_table("tipos_tramite")
