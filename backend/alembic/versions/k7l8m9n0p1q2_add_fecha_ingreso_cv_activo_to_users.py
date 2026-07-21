"""add fecha_ingreso cv activo to users

Revision ID: k7l8m9n0p1q2
Revises: m6m6m6m6m6m6
Create Date: 2026-07-20 18:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "k7l8m9n0p1q2"
down_revision: Union[str, None] = "m6m6m6m6m6m6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("fecha_ingreso", sa.Date(), nullable=True))
    op.add_column("users", sa.Column("cv", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.text("true")))


def downgrade() -> None:
    op.drop_column("users", "activo")
    op.drop_column("users", "cv")
    op.drop_column("users", "fecha_ingreso")
