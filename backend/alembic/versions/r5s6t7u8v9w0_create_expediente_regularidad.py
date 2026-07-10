"""create_expediente_regularidad

Fase 3 -- Expediente academico consolidado. Crea expediente_materias
(cierre oficial de una oferta cursada, snapshot de nota/creditos/condicion),
expediente_semestres (cache de agregacion por alumno+periodo) y
regularidad_alumno (cache de estado activo/en_riesgo/irregular/de_baja).

Revision ID: r5s6t7u8v9w0
Revises: q4r5s6t7u8v9
Create Date: 2026-07-07
"""

from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = "r5s6t7u8v9w0"
down_revision: Union[str, None] = "q4r5s6t7u8v9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "expediente_materias",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("alumno_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column(
            "oferta_materia_id",
            sa.Integer(),
            sa.ForeignKey("ofertas_materia.id"),
            nullable=False,
        ),
        sa.Column("nota_final", sa.Numeric(5, 2), nullable=False),
        sa.Column("creditos", sa.Integer(), nullable=False),
        sa.Column("condicion", sa.String(20), nullable=False),
        sa.Column(
            "cerrado_por", sa.Integer(), sa.ForeignKey("users.id"), nullable=False
        ),
        sa.Column(
            "cerrado_en", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.CheckConstraint(
            "condicion IN ('aprobada','reprobada')", name="ck_expediente_condicion"
        ),
        sa.UniqueConstraint(
            "alumno_id", "oferta_materia_id", name="uq_expediente_alumno_oferta"
        ),
    )

    op.create_table(
        "expediente_semestres",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("alumno_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("periodo", sa.String(10), nullable=False),
        sa.Column("ppa_periodo", sa.Numeric(5, 2), nullable=True),
        sa.Column("creditos_periodo", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "materias_aprobadas", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column(
            "materias_reprobadas", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.UniqueConstraint(
            "alumno_id", "periodo", name="uq_expediente_semestre_alumno_periodo"
        ),
    )

    op.create_table(
        "regularidad_alumno",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "alumno_id",
            sa.Integer(),
            sa.ForeignKey("users.id"),
            nullable=False,
            unique=True,
        ),
        sa.Column("estado", sa.String(20), nullable=False),
        sa.Column("ppa_acumulado", sa.Numeric(5, 2), nullable=True),
        sa.Column("motivo", sa.String(255), nullable=True),
        sa.Column(
            "calculado_en", sa.DateTime(timezone=True), server_default=sa.func.now()
        ),
        sa.CheckConstraint(
            "estado IN ('activo','en_riesgo','irregular','de_baja')",
            name="ck_regularidad_estado",
        ),
    )


def downgrade() -> None:
    op.drop_table("regularidad_alumno")
    op.drop_table("expediente_semestres")
    op.drop_table("expediente_materias")
