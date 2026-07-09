"""facturacion_electronica

Fase 4B -- Integración facturación electrónica guarani.app.
Extiende comprobantes con campos de emisión/reintento y agrega
users.cedula (documento requerido por guarani.app para emitir factura).

Revision ID: t7u8v9w0x1y2
Revises: s6t7u8v9w0x1
Create Date: 2026-07-09
"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = "t7u8v9w0x1y2"
down_revision: Union[str, None] = "s6t7u8v9w0x1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("cedula", sa.String(20), nullable=True))

    op.add_column(
        "comprobantes",
        sa.Column("tipo", sa.String(20), nullable=False, server_default="factura"),
    )
    op.add_column("comprobantes", sa.Column("timbrado", sa.String(20), nullable=True))
    op.add_column("comprobantes", sa.Column("url_pdf", sa.String(500), nullable=True))
    op.add_column(
        "comprobantes",
        sa.Column("estado_emision", sa.String(20), nullable=False, server_default="pendiente"),
    )
    op.add_column(
        "comprobantes",
        sa.Column("intentos", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column("comprobantes", sa.Column("ultimo_error", sa.Text(), nullable=True))
    op.create_check_constraint(
        "ck_comprobante_estado_emision",
        "comprobantes",
        "estado_emision IN ('pendiente','emitido','error','reintentando')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_comprobante_estado_emision", "comprobantes", type_="check")
    op.drop_column("comprobantes", "ultimo_error")
    op.drop_column("comprobantes", "intentos")
    op.drop_column("comprobantes", "estado_emision")
    op.drop_column("comprobantes", "url_pdf")
    op.drop_column("comprobantes", "timbrado")
    op.drop_column("comprobantes", "tipo")
    op.drop_column("users", "cedula")
