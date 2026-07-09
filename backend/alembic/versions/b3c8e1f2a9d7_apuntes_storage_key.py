"""apuntes_storage_key

Agrega columna storage_key a apuntes (key en R2).
archivo_url queda nullable para retrocompatibilidad con registros existentes.

Revision ID: b3c8e1f2a9d7
Revises: a4f7b2c9d1e8
Create Date: 2026-07-04
"""

from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = "b3c8e1f2a9d7"
down_revision: Union[str, None] = "a4f7b2c9d1e8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("apuntes", sa.Column("storage_key", sa.Text, nullable=True))
    # archivo_url ya existe; solo relajar NOT NULL para retrocompat
    op.alter_column("apuntes", "archivo_url", nullable=True)


def downgrade() -> None:
    op.drop_column("apuntes", "storage_key")
    op.alter_column("apuntes", "archivo_url", nullable=False)
