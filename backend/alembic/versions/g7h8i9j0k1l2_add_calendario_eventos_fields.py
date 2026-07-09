"""Add calendario academico fields to eventos_calendario table

Revision ID: g7h8i9j0k1l2
Revises: f6e5d4c3b2a1
Create Date: 2026-07-02
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "g7h8i9j0k1l2"
down_revision: Union[str, Sequence[str], None] = "f6e5d4c3b2a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("eventos_calendario") as batch_op:
        batch_op.add_column(sa.Column("fecha_fin", sa.Date(), nullable=True))
        batch_op.add_column(sa.Column("anio", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("semestre", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("archivo_pdf", sa.Text(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("eventos_calendario") as batch_op:
        batch_op.drop_column("fecha_fin")
        batch_op.drop_column("anio")
        batch_op.drop_column("semestre")
        batch_op.drop_column("archivo_pdf")
