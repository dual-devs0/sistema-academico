"""Create foro tables (hilos + mensajes)

Revision ID: m0n1p2q3r4s5
Revises: g7h8i9j0k1l2
Create Date: 2026-07-02
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "m0n1p2q3r4s5"
down_revision: Union[str, Sequence[str], None] = "g7h8i9j0k1l2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "foro_hilos",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column(
            "materia_id", sa.Integer(), sa.ForeignKey("materias.id"), nullable=False
        ),
        sa.Column("titulo", sa.String(200), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column(
            "creado_por", sa.Integer(), sa.ForeignKey("users.id"), nullable=False
        ),
        sa.Column("fijado", sa.Boolean(), server_default="0", nullable=False),
        sa.Column("cerrado", sa.Boolean(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_table(
        "foro_mensajes",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column(
            "hilo_id", sa.Integer(), sa.ForeignKey("foro_hilos.id"), nullable=False
        ),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("contenido", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("foro_mensajes")
    op.drop_table("foro_hilos")
