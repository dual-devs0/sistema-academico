"""datetime_timezone_pg_pool

Migra columnas DateTime a DateTime(timezone=True) para compatibilidad con
PostgreSQL. En SQLite esta migración es no-op (SQLite no diferencia tz).

Revision ID: a4f7b2c9d1e8
Revises: m0n1p2q3r4s5
Create Date: 2026-07-04
"""

from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = "a4f7b2c9d1e8"
down_revision: Union[str, None] = "m0n1p2q3r4s5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name

    if dialect == "postgresql":
        op.alter_column(
            "users",
            "created_at",
            type_=sa.DateTime(timezone=True),
            existing_nullable=True,
            postgresql_using="created_at AT TIME ZONE 'UTC'",
        )
        op.alter_column(
            "puntajes",
            "editado_en",
            type_=sa.DateTime(timezone=True),
            existing_nullable=True,
            postgresql_using="editado_en AT TIME ZONE 'UTC'",
        )


def downgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name

    if dialect == "postgresql":
        op.alter_column(
            "users",
            "created_at",
            type_=sa.DateTime(timezone=False),
            existing_nullable=True,
        )
        op.alter_column(
            "puntajes",
            "editado_en",
            type_=sa.DateTime(timezone=False),
            existing_nullable=True,
        )
