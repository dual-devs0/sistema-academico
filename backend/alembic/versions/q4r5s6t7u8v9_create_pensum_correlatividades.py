"""create_pensum_correlatividades

Fase 2 -- Pensum y malla curricular. Extiende carreras con
duracion_semestres/creditos_totales y crea pensum_materias,
correlatividades y avance_alumno_pensum.

Revision ID: q4r5s6t7u8v9
Revises: p3q4r5s6t7u8
Create Date: 2026-07-07
"""

from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = "q4r5s6t7u8v9"
down_revision: Union[str, None] = "p3q4r5s6t7u8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "carreras", sa.Column("duracion_semestres", sa.Integer(), nullable=True)
    )
    op.add_column(
        "carreras", sa.Column("creditos_totales", sa.Integer(), nullable=True)
    )

    op.create_table(
        "pensum_materias",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "carrera_id", sa.Integer(), sa.ForeignKey("carreras.id"), nullable=False
        ),
        sa.Column(
            "materia_id", sa.Integer(), sa.ForeignKey("materias.id"), nullable=False
        ),
        sa.Column("semestre", sa.Integer(), nullable=False),
        sa.Column("creditos", sa.Integer(), nullable=False),
        sa.Column("es_electiva", sa.Boolean(), server_default=sa.false()),
        sa.UniqueConstraint(
            "carrera_id", "materia_id", name="uq_pensum_carrera_materia"
        ),
    )

    op.create_table(
        "correlatividades",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "materia_id", sa.Integer(), sa.ForeignKey("materias.id"), nullable=False
        ),
        sa.Column(
            "prerrequisito_id",
            sa.Integer(),
            sa.ForeignKey("materias.id"),
            nullable=False,
        ),
        sa.Column("tipo", sa.String(20), nullable=False),
        sa.CheckConstraint(
            "materia_id != prerrequisito_id",
            name="ck_correlatividad_no_autorreferencia",
        ),
        sa.UniqueConstraint(
            "materia_id", "prerrequisito_id", "tipo", name="uq_correlatividad_regla"
        ),
    )

    op.create_table(
        "avance_alumno_pensum",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("alumno_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column(
            "pensum_materia_id",
            sa.Integer(),
            sa.ForeignKey("pensum_materias.id"),
            nullable=False,
        ),
        sa.Column("estado", sa.String(20), nullable=False, server_default="pendiente"),
        sa.Column(
            "fecha_actualizacion",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint(
            "alumno_id", "pensum_materia_id", name="uq_avance_alumno_pensum_materia"
        ),
    )


def downgrade() -> None:
    op.drop_table("avance_alumno_pensum")
    op.drop_table("correlatividades")
    op.drop_table("pensum_materias")
    op.drop_column("carreras", "creditos_totales")
    op.drop_column("carreras", "duracion_semestres")
