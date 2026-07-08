"""create_recordatorios_docente

Tabla para recordatorios propios del profesor, usada por la pestaña
Agenda del portal docente unificado.

Revision ID: p3q4r5s6t7u8
Revises: o2p3q4r5s6t7
Create Date: 2026-07-07
"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = "p3q4r5s6t7u8"
down_revision: Union[str, None] = "o2p3q4r5s6t7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "recordatorios_docente",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("profesor_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("titulo", sa.String(200), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("fecha", sa.DateTime(), nullable=False),
        sa.Column("materia_id", sa.Integer(), sa.ForeignKey("materias.id"), nullable=True),
        sa.Column("completado", sa.Boolean(), server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_table("recordatorios_docente")
