"""rename temarios table to programas

Revision ID: rename_temarios_to_programas
Revises: 30786ce7f516
Create Date: 2026-07-20 19:04:09.817687

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'rename_temarios_to_programas'
down_revision: Union[str, Sequence[str], None] = '30786ce7f516'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    insp = sa.inspect(bind)
    
    # Only rename if temarios exists and programas doesn't
    if insp.has_table('temarios') and not insp.has_table('programas'):
        op.rename_table('temarios', 'programas')
        # AUDIT-FIX B-1: rename_index no existe en Alembic, usar drop+create
        op.drop_index('ix_temarios_id', table_name='programas', if_exists=True)
        op.create_index('ix_programas_id', 'programas', ['id'])


def downgrade() -> None:
    """Downgrade schema."""
    bind = op.get_bind()
    insp = sa.inspect(bind)
    
    if insp.has_table('programas') and not insp.has_table('temarios'):
        # AUDIT-FIX B-1: rename_index no existe en Alembic, usar drop+create
        op.drop_index('ix_programas_id', table_name='temarios', if_exists=True)
        op.create_index('ix_temarios_id', 'temarios', ['id'])
        op.rename_table('programas', 'temarios')
