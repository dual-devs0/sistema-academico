"""add_foto_url_to_users

Columna foto_url existía en el modelo User desde el inicio pero nunca fue
incluida en la migración base (b948d85238e3). Esta migración la agrega
retroactivamente para sincronizar el esquema de PostgreSQL con el modelo.

Revision ID: d6e0f4g2h3i8
Revises: c5d9e3f1a2b6
Create Date: 2026-07-04
"""

from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = "d6e0f4g2h3i8"
down_revision: Union[str, None] = "c5d9e3f1a2b6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    # SQLite via create_all() ya tiene la columna; solo aplica en PostgreSQL
    if bind.dialect.name == "postgresql":
        op.add_column("users", sa.Column("foto_url", sa.String(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.drop_column("users", "foto_url")
