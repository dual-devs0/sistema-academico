"""enable_rls_sensitive_tables

Row Level Security (RLS) is a PostgreSQL feature that restricts which rows
a database user can see or modify, independently of application-layer checks.

This migration enables RLS on the four tables that contain personal student
data (puntajes, asistencias, apuntes, inscripciones) and creates a permissive
policy granting the application DB user (sa_user) full access. Any other
database user that connects directly will be blocked by default.

IMPORTANT: sa_user must match the value of POSTGRES_USER in docker-compose.yml.
If your compose file uses a different user, update the four policy statements below.

This migration is a no-op on SQLite (development). It only executes on PostgreSQL.

Revision ID: 63005e9acb85
Revises: b948d85238e3
Create Date: 2026-06-28
"""

from typing import Sequence, Union

from alembic import op


revision: str = "63005e9acb85"
down_revision: Union[str, Sequence[str], None] = "b948d85238e3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLES = ["puntajes", "asistencias", "apuntes", "inscripciones"]


def _db_user() -> str | None:
    """Extract DB user from the live connection, not a hardcoded constant."""
    bind = op.get_bind()
    # AUDIT-FIX B-11: tipo de retorno correcto — scalar() puede ser None
    row = bind.execute(__import__("sqlalchemy").text("SELECT current_user")).scalar()
    return row or ""


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return  # RLS is PostgreSQL-only; skip silently on SQLite

    db_user = _db_user()
    for table in TABLES:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;")
        op.execute(f"CREATE POLICY app_access ON {table} TO {db_user} USING (true);")


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    _db_user()  # noqa: F841
    for table in TABLES:
        op.execute(f"DROP POLICY IF EXISTS app_access ON {table};")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;")
