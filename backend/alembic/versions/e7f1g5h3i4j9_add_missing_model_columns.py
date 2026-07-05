"""add_missing_model_columns

Columnas presentes en los modelos SQLAlchemy pero ausentes de las migraciones
previas (añadidas directamente al modelo sin pasar por Alembic):
  - materias: creditos, cupos, horario, secciones
  - asistencias: motivo

Revision ID: e7f1g5h3i4j9
Revises: d6e0f4g2h3i8
Create Date: 2026-07-04
"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = "e7f1g5h3i4j9"
down_revision: Union[str, None] = "d6e0f4g2h3i8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    # SQLite via create_all() ya tiene estas columnas; solo aplica en PostgreSQL
    if bind.dialect.name == "postgresql":
        op.add_column("materias", sa.Column("creditos", sa.Integer(), nullable=True, server_default="4"))
        op.add_column("materias", sa.Column("cupos",    sa.Integer(), nullable=True, server_default="40"))
        op.add_column("materias", sa.Column("horario",  sa.String(),  nullable=True))
        op.add_column("materias", sa.Column("secciones", sa.Integer(), nullable=True, server_default="1"))
        op.add_column("asistencias", sa.Column("motivo", sa.String(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.drop_column("asistencias", "motivo")
        op.drop_column("materias", "secciones")
        op.drop_column("materias", "horario")
        op.drop_column("materias", "cupos")
        op.drop_column("materias", "creditos")
