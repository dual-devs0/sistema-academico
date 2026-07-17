"""Add hora and ubicacion to eventos_calendario

Revision ID: w1x2y3z4a5b6
Revises: v0w1x2y3z4a5
Create Date: 2026-07-16
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "w1x2y3z4a5b6"
down_revision: Union[str, Sequence[str], None] = "v0w1x2y3z4a5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("eventos_calendario") as batch_op:
        batch_op.add_column(sa.Column("hora", sa.String(length=5), nullable=True))
        batch_op.add_column(sa.Column("ubicacion", sa.String(length=200), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("eventos_calendario") as batch_op:
        batch_op.drop_column("hora")
        batch_op.drop_column("ubicacion")
