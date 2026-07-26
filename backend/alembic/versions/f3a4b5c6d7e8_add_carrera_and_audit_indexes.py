"""add index on users.carrera_id and setting_audit_log.changed_at

Revision ID: f3a4b5c6d7e8
Revises: 4b897d038ce9
Create Date: 2026-07-26 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

revision: str = 'f3a4b5c6d7e8'
down_revision: Union[str, Sequence[str], None] = '4b897d038ce9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

INDEXES = [
    ('ix_users_carrera_id', 'users', ['carrera_id']),
    ('ix_setting_audit_log_changed_at', 'setting_audit_log', ['changed_at']),
]


def upgrade() -> None:
    for name, table, cols in INDEXES:
        op.create_index(name, table, cols, unique=False)


def downgrade() -> None:
    for name, table, cols in reversed(INDEXES):
        op.drop_index(name, table_name=table)
