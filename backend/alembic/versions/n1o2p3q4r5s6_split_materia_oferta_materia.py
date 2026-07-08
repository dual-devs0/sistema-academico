"""split_materia_oferta_materia

Materia.profesor_id era fijo (un profesor por materia para siempre, sin
periodo). Inscripcion/Puntaje/Asistencia apuntaban a materia_id directo,
sin ningun campo de periodo -- era imposible saber cuantos alumnos tuvo
una catedra en un periodo especifico, y un alumno repitiendo la materia
colisionaba con uq_puntaje_user_materia_tipo.

Esta migracion introduce ofertas_materia (materia_id + profesor_id +
periodo) y mueve Inscripcion/Puntaje/Asistencia a apuntar a
oferta_materia_id en vez de materia_id directo. Todas las materias
existentes se migran a una unica oferta de periodo '2026-1' con su
profesor actual -- no hay datos historicos reales que preservar por
periodo, asi que el backfill es 1 oferta por materia.

Revision ID: n1o2p3q4r5s6
Revises: e7f1g5h3i4j9
Create Date: 2026-07-06
"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = "n1o2p3q4r5s6"
down_revision: Union[str, None] = "e7f1g5h3i4j9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

PERIODO_BACKFILL = "2026-1"


def upgrade() -> None:
    bind = op.get_bind()

    # 1. Nueva tabla ofertas_materia
    op.create_table(
        "ofertas_materia",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("materia_id", sa.Integer(), sa.ForeignKey("materias.id"), nullable=False),
        sa.Column("profesor_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("periodo", sa.String(10), nullable=False),
        sa.Column("activa", sa.Boolean(), server_default=sa.true()),
        sa.UniqueConstraint("materia_id", "periodo", name="uq_oferta_materia_periodo"),
    )

    # 2. Data migration: 1 oferta activa por materia existente, con su profesor actual
    bind.execute(
        sa.text(
            "INSERT INTO ofertas_materia (materia_id, profesor_id, periodo, activa) "
            "SELECT id, profesor_id, :periodo, true FROM materias"
        ),
        {"periodo": PERIODO_BACKFILL},
    )

    # 3. Agregar oferta_materia_id (nullable) a inscripciones, puntajes, asistencias
    for tabla in ("inscripciones", "puntajes", "asistencias"):
        op.add_column(tabla, sa.Column("oferta_materia_id", sa.Integer(), sa.ForeignKey("ofertas_materia.id"), nullable=True))
        # Backfill: cada materia tiene exactamente 1 oferta en este momento -> join directo sin ambiguedad
        bind.execute(sa.text(
            f"UPDATE {tabla} t SET oferta_materia_id = om.id "
            f"FROM ofertas_materia om WHERE om.materia_id = t.materia_id"
        ))
        op.alter_column(tabla, "oferta_materia_id", nullable=False)

    # 4. Constraints nuevas. NOTA: uq_puntaje_user_materia_tipo y
    # uq_asistencia_user_materia_fecha estan en los modelos SQLAlchemy pero
    # nunca se aplicaron en el Postgres real (confirmado contra neondb_test:
    # solo existen las FK simples, ninguna UNIQUE compuesta) -- drift entre
    # modelo y schema desde la migracion SQLite->Postgres de Fase 0. No hay
    # nada que dropear; solo se crean las nuevas.
    op.create_unique_constraint("uq_puntaje_user_oferta_tipo", "puntajes", ["user_id", "oferta_materia_id", "tipo"])
    op.create_unique_constraint("uq_asistencia_user_oferta_fecha", "asistencias", ["user_id", "oferta_materia_id", "fecha"])

    # 5. Drop materia_id viejo en las 3 tablas (cascada tambien la FK)
    op.drop_column("inscripciones", "materia_id")
    op.drop_column("puntajes", "materia_id")
    op.drop_column("asistencias", "materia_id")

    # 6. Drop materias.profesor_id (ya vive en ofertas_materia)
    op.drop_column("materias", "profesor_id")


def downgrade() -> None:
    bind = op.get_bind()

    op.add_column("materias", sa.Column("profesor_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True))
    bind.execute(sa.text(
        "UPDATE materias m SET profesor_id = om.profesor_id "
        "FROM ofertas_materia om WHERE om.materia_id = m.id AND om.periodo = :periodo"
    ), {"periodo": PERIODO_BACKFILL})
    op.alter_column("materias", "profesor_id", nullable=False)

    for tabla in ("inscripciones", "puntajes", "asistencias"):
        op.add_column(tabla, sa.Column("materia_id", sa.Integer(), sa.ForeignKey("materias.id"), nullable=True))
        bind.execute(sa.text(
            f"UPDATE {tabla} t SET materia_id = om.materia_id "
            f"FROM ofertas_materia om WHERE om.id = t.oferta_materia_id"
        ))
        op.alter_column(tabla, "materia_id", nullable=False)

    op.drop_constraint("uq_puntaje_user_oferta_tipo", "puntajes", type_="unique")
    op.drop_constraint("uq_asistencia_user_oferta_fecha", "asistencias", type_="unique")

    op.drop_column("inscripciones", "oferta_materia_id")
    op.drop_column("puntajes", "oferta_materia_id")
    op.drop_column("asistencias", "oferta_materia_id")

    op.drop_table("ofertas_materia")
