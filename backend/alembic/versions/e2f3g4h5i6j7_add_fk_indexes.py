"""add indexes on frequently-filtered FK columns

Revision ID: e2f3g4h5i6j7
Revises: d1e2f3g4h5i6
Create Date: 2026-07-18 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

revision: str = 'e2f3g4h5i6j7'
down_revision: Union[str, Sequence[str], None] = 'd1e2f3g4h5i6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

INDEXES = [
    ('ix_users_role', 'users', ['role']),
    ('ix_asistencias_user_id', 'asistencias', ['user_id']),
    ('ix_asistencias_oferta_materia_id', 'asistencias', ['oferta_materia_id']),
    ('ix_puntajes_user_id', 'puntajes', ['user_id']),
    ('ix_puntajes_oferta_materia_id', 'puntajes', ['oferta_materia_id']),
    ('ix_inscripciones_alumno_id', 'inscripciones', ['alumno_id']),
    ('ix_inscripciones_oferta_materia_id', 'inscripciones', ['oferta_materia_id']),
    ('ix_avance_alumno_pensum_alumno_id', 'avance_alumno_pensum', ['alumno_id']),
]


def upgrade() -> None:
    for name, table, cols in INDEXES:
        op.create_index(name, table, cols, unique=False)


def downgrade() -> None:
    for name, table, cols in reversed(INDEXES):
        op.drop_index(name, table_name=table)
