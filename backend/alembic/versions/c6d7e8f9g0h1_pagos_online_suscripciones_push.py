"""add pagos_online + suscripciones_push

Revision ID: c6d7e8f9g0h1
Revises: b890f76d76ae
Create Date: 2026-07-11 19:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c6d7e8f9g0h1'
down_revision: Union[str, Sequence[str], None] = 'b890f76d76ae'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table('pagos_online',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('cuota_id', sa.Integer(), nullable=False),
        sa.Column('alumno_id', sa.Integer(), nullable=False),
        sa.Column('monto', sa.Numeric(12, 2), nullable=False),
        sa.Column('transaction_id', sa.String(length=100), nullable=True),
        sa.Column('estado', sa.String(length=20), nullable=False, server_default='pendiente'),
        sa.Column('gateway_url', sa.String(length=500), nullable=True),
        sa.Column('gateway_response', sa.JSON(), nullable=True),
        sa.Column('creado_en', sa.DateTime(timezone=True), nullable=True),
        sa.Column('confirmado_en', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['alumno_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['cuota_id'], ['cuotas.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('transaction_id'),
    )
    op.create_index(op.f('ix_pagos_online_id'), 'pagos_online', ['id'], unique=False)

    op.create_table('suscripciones_push',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('endpoint', sa.String(length=500), nullable=False),
        sa.Column('p256dh', sa.String(length=200), nullable=False),
        sa.Column('auth', sa.String(length=200), nullable=False),
        sa.Column('user_agent', sa.String(length=300), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_suscripciones_push_id'), 'suscripciones_push', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_suscripciones_push_id'), table_name='suscripciones_push')
    op.drop_table('suscripciones_push')
    op.drop_index(op.f('ix_pagos_online_id'), table_name='pagos_online')
    op.drop_table('pagos_online')
