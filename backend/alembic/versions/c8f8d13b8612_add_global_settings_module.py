"""add global settings module

Revision ID: c8f8d13b8612
Revises: a22743f21549
Create Date: 2026-07-22 15:41:39.580421

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'c8f8d13b8612'
down_revision: Union[str, Sequence[str], None] = 'a22743f21549'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('global_settings',
        sa.Column('key', sa.String(length=100), nullable=False),
        sa.Column('value', sa.Text(), nullable=True),
        sa.Column('tipo', sa.String(length=20), nullable=False),
        sa.Column('categoria', sa.String(length=50), nullable=False),
        sa.Column('descripcion', sa.Text(), nullable=True),
        sa.Column('editable', sa.Boolean(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['updated_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('key')
    )
    op.create_table('setting_audit_log',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('setting_key', sa.String(length=100), nullable=False),
        sa.Column('old_value', sa.Text(), nullable=True),
        sa.Column('new_value', sa.Text(), nullable=True),
        sa.Column('changed_by', sa.Integer(), nullable=False),
        sa.Column('changed_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['changed_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['setting_key'], ['global_settings.key'], ),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('setting_audit_log')
    op.drop_table('global_settings')
