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
    insp = sa.inspect(bind)
    
    # Check which columns already exist
    materias_cols = [c['name'] for c in insp.get_columns('materias')]
    asistencias_cols = [c['name'] for c in insp.get_columns('asistencias')]
    
    # SQLite via create_all() may already have these columns; check before adding
    if 'creditos' not in materias_cols:
        op.add_column(
            "materias",
            sa.Column("creditos", sa.Integer(), nullable=True, server_default="4"),
        )
    if 'cupos' not in materias_cols:
        op.add_column(
            "materias",
            sa.Column("cupos", sa.Integer(), nullable=True, server_default="40"),
        )
    if 'horario' not in materias_cols:
        op.add_column("materias", sa.Column("horario", sa.String(), nullable=True))
    if 'secciones' not in materias_cols:
        op.add_column(
            "materias",
            sa.Column("secciones", sa.Integer(), nullable=True, server_default="1"),
        )
    if 'motivo' not in asistencias_cols:
        op.add_column("asistencias", sa.Column("motivo", sa.String(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    
    materias_cols = [c['name'] for c in insp.get_columns('materias')]
    asistencias_cols = [c['name'] for c in insp.get_columns('asistencias')]
    
    if 'secciones' in materias_cols:
        op.drop_column("materias", "secciones")
    if 'horario' in materias_cols:
        op.drop_column("materias", "horario")
    if 'cupos' in materias_cols:
        op.drop_column("materias", "cupos")
    if 'creditos' in materias_cols:
        op.drop_column("materias", "creditos")
    if 'motivo' in asistencias_cols:
        op.drop_column("asistencias", "motivo")
