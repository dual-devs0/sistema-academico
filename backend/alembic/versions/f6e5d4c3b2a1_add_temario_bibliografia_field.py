"""Add bibliografia field to temarios table

Revision ID: f6e5d4c3b2a1
Revises: a1b2c3d4e5f6
Create Date: 2026-07-02
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f6e5d4c3b2a1"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("temarios") as batch_op:
        batch_op.add_column(sa.Column("bibliografia", sa.JSON(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("temarios") as batch_op:
        batch_op.drop_column("bibliografia")
