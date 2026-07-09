"""create_refresh_tokens

Tabla para refresh tokens httpOnly. Permite revocación, expiración y
rotación sin estado en el cliente.

Revision ID: c5d9e3f1a2b6
Revises: b3c8e1f2a9d7
Create Date: 2026-07-04
"""

from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op
from sqlalchemy.sql import func

revision: str = "c5d9e3f1a2b6"
down_revision: Union[str, None] = "b3c8e1f2a9d7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("usuario_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("expira_en", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revocado", sa.Boolean, default=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=func.now()),
    )
    op.create_index("ix_refresh_tokens_token_hash", "refresh_tokens", ["token_hash"])
    op.create_index("ix_refresh_tokens_usuario_id", "refresh_tokens", ["usuario_id"])


def downgrade() -> None:
    op.drop_index("ix_refresh_tokens_usuario_id", table_name="refresh_tokens")
    op.drop_index("ix_refresh_tokens_token_hash", table_name="refresh_tokens")
    op.drop_table("refresh_tokens")
