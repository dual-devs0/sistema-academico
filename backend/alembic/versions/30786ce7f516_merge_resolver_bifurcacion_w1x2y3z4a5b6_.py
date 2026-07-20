"""merge: resolver bifurcacion w1x2y3z4a5b6 + e2f3g4h5i6j7

Revision ID: 30786ce7f516
Revises: e2f3g4h5i6j7, w1x2y3z4a5b6
Create Date: 2026-07-20 19:02:18.389383

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '30786ce7f516'
down_revision: Union[str, Sequence[str], None] = ('e2f3g4h5i6j7', 'w1x2y3z4a5b6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
