"""create horarios table (missing migration — model existed, no migration ever created it;
fresh DBs via `alembic upgrade head` crash on POST /inscripciones/ since
services/pensum.py::verificar_solapamiento_inscripcion queries this table).
Guarded with an existence check since some environments already have the
table from an ad-hoc Base.metadata.create_all() call.

Revision ID: c2d3e4f5g6h7
Revises: e9f8d7c6b5a4
Create Date: 2026-08-18 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'c2d3e4f5g6h7'
down_revision: Union[str, Sequence[str], None] = 'e9f8d7c6b5a4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'horarios' in inspector.get_table_names():
        return
    op.create_table(
        'horarios',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('materia_id', sa.Integer(), sa.ForeignKey('materias.id'), nullable=False),
        sa.Column('dia_semana', sa.Integer(), nullable=False),
        sa.Column('hora_inicio', sa.Time(), nullable=False),
        sa.Column('hora_fin', sa.Time(), nullable=False),
        sa.Column('aula', sa.String(length=50), nullable=True),
        sa.UniqueConstraint(
            'materia_id', 'dia_semana', 'hora_inicio',
            name='uq_horario_materia_dia_hora',
        ),
    )


def downgrade() -> None:
    op.drop_table('horarios')
