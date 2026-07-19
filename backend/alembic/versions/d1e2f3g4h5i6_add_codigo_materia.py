"""add codigo column to materias, backfilled

Revision ID: d1e2f3g4h5i6
Revises: c6d7e8f9g0h1
Create Date: 2026-07-18 15:00:00.000000

"""
import re
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'd1e2f3g4h5i6'
down_revision: Union[str, Sequence[str], None] = 'c6d7e8f9g0h1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _prefijo(nombre: str) -> str:
    letras = re.sub(r'[^A-Za-z]', '', nombre or '').upper()
    return (letras[:3] or 'MAT').ljust(3, 'X')


def upgrade() -> None:
    op.add_column('materias', sa.Column('codigo', sa.String(length=20), nullable=True))

    conn = op.get_bind()
    filas = conn.execute(
        sa.text(
            'SELECT id, nombre, carrera_id FROM materias '
            'ORDER BY COALESCE(carrera_id, 0), semestre, id'
        )
    ).fetchall()

    contador_por_carrera: dict[int, int] = {}
    for fila in filas:
        carrera_key = fila.carrera_id or 0
        contador_por_carrera[carrera_key] = contador_por_carrera.get(carrera_key, 0) + 1
        codigo = f"{_prefijo(fila.nombre)}-{contador_por_carrera[carrera_key]:03d}"
        conn.execute(
            sa.text('UPDATE materias SET codigo = :codigo WHERE id = :id'),
            {'codigo': codigo, 'id': fila.id},
        )

    op.create_unique_constraint(
        'uq_materia_codigo_carrera', 'materias', ['carrera_id', 'codigo']
    )


def downgrade() -> None:
    op.drop_constraint('uq_materia_codigo_carrera', 'materias', type_='unique')
    op.drop_column('materias', 'codigo')
