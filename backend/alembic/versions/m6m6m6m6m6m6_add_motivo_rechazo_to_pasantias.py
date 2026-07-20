"""add motivo_rechazo to pasantias

Revision ID: m6m6m6m6m6m6
Revises: rename_temarios_to_programas
Create Date: 2026-07-20 19:07:15.285049

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'm6m6m6m6m6m6'
down_revision: Union[str, Sequence[str], None] = 'rename_temarios_to_programas'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('pasantias', sa.Column('motivo_rechazo', sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('pasantias', 'motivo_rechazo')
