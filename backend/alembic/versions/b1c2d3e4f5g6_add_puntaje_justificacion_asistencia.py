"""add puntaje_justificacion column to asistencias (puntaje 0-5 de asistencia)

Revision ID: b1c2d3e4f5g6
Revises: a9b8c7d6e5f4
Create Date: 2026-08-10 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'b1c2d3e4f5g6'
down_revision: Union[str, Sequence[str], None] = 'a9b8c7d6e5f4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'asistencias',
        sa.Column('puntaje_justificacion', sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('asistencias', 'puntaje_justificacion')
