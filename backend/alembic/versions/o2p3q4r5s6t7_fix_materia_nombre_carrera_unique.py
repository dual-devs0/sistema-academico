"""fix_materia_nombre_carrera_unique

El modelo Materia declara UniqueConstraint('nombre', 'carrera_id',
name='uq_materia_nombre_carrera') pero el schema real de Postgres solo
tenia 'materias_nombre_key' (UNIQUE sobre nombre solo, sin carrera_id) --
drift heredado de cuando la tabla se creo via Base.metadata.create_all()
en la migracion SQLite->Postgres de Fase 0, nunca a traves de una
revision Alembic versionada. La regla real de negocio es nombre unico
POR carrera (dos carreras distintas pueden compartir nombre de materia),
no nombre unico global.

Verificado antes de escribir esta migracion: no existen duplicados
(nombre, carrera_id) en los datos actuales.

Revision ID: o2p3q4r5s6t7
Revises: n1o2p3q4r5s6
Create Date: 2026-07-06
"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = "o2p3q4r5s6t7"
down_revision: Union[str, None] = "n1o2p3q4r5s6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("materias_nombre_key", "materias", type_="unique")
    op.create_unique_constraint("uq_materia_nombre_carrera", "materias", ["nombre", "carrera_id"])


def downgrade() -> None:
    op.drop_constraint("uq_materia_nombre_carrera", "materias", type_="unique")
    op.create_unique_constraint("materias_nombre_key", "materias", ["nombre"])
