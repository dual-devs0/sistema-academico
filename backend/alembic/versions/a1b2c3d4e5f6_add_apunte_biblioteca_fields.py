"""add biblioteca fields to apuntes table

Add columns for biblioteca avanzada functionality:
  - descripcion (Text)
  - tipo_contenido (String, default 'pdf')
  - likes (Integer, default 0)
  - descargas (Integer, default 0)
  - visibilidad (String, default 'publico')
  - fecha_subida (DateTime, default now)

Revision ID: a1b2c3d4e5f6
Revises: 63005e9acb85
Create Date: 2026-07-02
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "63005e9acb85"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    is_sqlite = bind.dialect.name == "sqlite"

    with op.batch_alter_table("apuntes") as batch_op:
        batch_op.add_column(sa.Column("descripcion", sa.Text(), nullable=True))
        batch_op.add_column(
            sa.Column(
                "tipo_contenido", sa.String(50), server_default="pdf", nullable=False
            )
        )
        batch_op.add_column(
            sa.Column("likes", sa.Integer(), server_default="0", nullable=False)
        )
        batch_op.add_column(
            sa.Column("descargas", sa.Integer(), server_default="0", nullable=False)
        )
        batch_op.add_column(
            sa.Column(
                "visibilidad", sa.String(20), server_default="publico", nullable=False
            )
        )
        batch_op.add_column(
            sa.Column(
                "fecha_subida",
                sa.DateTime(),
                server_default=sa.func.now(),
                nullable=True,
            )
        )
        if is_sqlite:
            # SQLite cannot add columns with NOT NULL + no default for existing rows
            batch_op.alter_column("tipo_contenido", nullable=True)
            batch_op.alter_column("visibilidad", nullable=True)


def downgrade() -> None:
    with op.batch_alter_table("apuntes") as batch_op:
        batch_op.drop_column("descripcion")
        batch_op.drop_column("tipo_contenido")
        batch_op.drop_column("likes")
        batch_op.drop_column("descargas")
        batch_op.drop_column("visibilidad")
        batch_op.drop_column("fecha_subida")
