"""add_audit_log_and_password_reset_improvements

Revision ID: e9f8d7c6b5a4
Revises: b1c2d3e4f5g6
Create Date: 2026-08-12 00:00:00.000000

Agrega la tabla de auditoría genérica (audit_log) usada por los eventos de
seguridad: recuperación/reset de contraseña, invalidación de sesiones, etc.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e9f8d7c6b5a4'
down_revision: Union[str, Sequence[str], None] = 'b1c2d3e4f5g6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'audit_log',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('evento', sa.String(length=100), nullable=False),
        sa.Column('usuario_id', sa.Integer(), nullable=True),
        sa.Column('usuario', sa.String(length=120), nullable=True),
        sa.Column('ip', sa.String(length=64), nullable=True),
        sa.Column('detalle', sa.Text(), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['usuario_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_audit_log_evento'), 'audit_log', ['evento'], unique=False)
    op.create_index(op.f('ix_audit_log_timestamp'), 'audit_log', ['timestamp'], unique=False)
    op.create_index(
        op.f('ix_audit_log_evento_usuario'), 'audit_log', ['evento', 'usuario_id'], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_audit_log_evento_usuario'), table_name='audit_log')
    op.drop_index(op.f('ix_audit_log_timestamp'), table_name='audit_log')
    op.drop_index(op.f('ix_audit_log_evento'), table_name='audit_log')
    op.drop_table('audit_log')