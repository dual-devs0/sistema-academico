"""create all tables

Revision ID: b948d85238e3
Revises:
Create Date: 2026-06-25 18:40:17.649025

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b948d85238e3'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # carreras — no foreign keys, must be first
    op.create_table(
        'carreras',
        sa.Column('id',     sa.Integer(),      nullable=False),
        sa.Column('nombre', sa.String(150),    nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('nombre'),
    )
    op.create_index(op.f('ix_carreras_id'), 'carreras', ['id'], unique=False)

    # users — depends on carreras
    op.create_table(
        'users',
        sa.Column('id',               sa.Integer(),      nullable=False),
        sa.Column('username',         sa.String(),       nullable=False),
        sa.Column('hashed_password',  sa.String(),       nullable=False),
        sa.Column('role',             sa.String(),       nullable=False),
        sa.Column('nombre',           sa.String(120),    nullable=False),
        sa.Column('email',            sa.String(200),    nullable=True),
        sa.Column('carrera_id',       sa.Integer(),      nullable=True),
        sa.Column('es_becado',        sa.Boolean(),      nullable=True),
        sa.Column('created_at',       sa.DateTime(),     nullable=True),
        sa.ForeignKeyConstraint(['carrera_id'], ['carreras.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('username'),
    )
    op.create_index(op.f('ix_users_id'),       'users', ['id'],       unique=False)
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)

    # materias — depends on users, carreras
    op.create_table(
        'materias',
        sa.Column('id',          sa.Integer(), nullable=False),
        sa.Column('nombre',      sa.String(),  nullable=False),
        sa.Column('profesor_id', sa.Integer(), nullable=False),
        sa.Column('carrera_id',  sa.Integer(), nullable=True),
        sa.Column('anio',        sa.Integer(), nullable=True),
        sa.Column('semestre',    sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['carrera_id'],  ['carreras.id']),
        sa.ForeignKeyConstraint(['profesor_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('nombre'),
    )
    op.create_index(op.f('ix_materias_id'),     'materias', ['id'],     unique=False)
    op.create_index(op.f('ix_materias_nombre'), 'materias', ['nombre'], unique=True)

    # inscripciones — depends on users, materias
    op.create_table(
        'inscripciones',
        sa.Column('id',         sa.Integer(), nullable=False),
        sa.Column('alumno_id',  sa.Integer(), nullable=True),
        sa.Column('materia_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['alumno_id'],  ['users.id']),
        sa.ForeignKeyConstraint(['materia_id'], ['materias.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_inscripciones_id'), 'inscripciones', ['id'], unique=False)

    # asistencias — depends on users, materias
    op.create_table(
        'asistencias',
        sa.Column('id',         sa.Integer(), nullable=False),
        sa.Column('user_id',    sa.Integer(), nullable=False),
        sa.Column('materia_id', sa.Integer(), nullable=False),
        sa.Column('fecha',      sa.Date(),    nullable=False),
        sa.Column('presente',   sa.Boolean(), nullable=False),
        sa.Column('es_becado',  sa.Boolean(), nullable=True),
        sa.ForeignKeyConstraint(['materia_id'], ['materias.id']),
        sa.ForeignKeyConstraint(['user_id'],    ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_asistencias_id'), 'asistencias', ['id'], unique=False)

    # puntajes — depends on users (×2), materias
    op.create_table(
        'puntajes',
        sa.Column('id',          sa.Integer(),              nullable=False),
        sa.Column('user_id',     sa.Integer(),              nullable=False),
        sa.Column('materia_id',  sa.Integer(),              nullable=False),
        sa.Column('tipo',        sa.String(20),             nullable=False),
        sa.Column('valor',       sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('editado_por', sa.Integer(),              nullable=True),
        sa.Column('editado_en',  sa.DateTime(),             nullable=True),
        sa.ForeignKeyConstraint(['editado_por'], ['users.id']),
        sa.ForeignKeyConstraint(['materia_id'],  ['materias.id']),
        sa.ForeignKeyConstraint(['user_id'],     ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_puntajes_id'), 'puntajes', ['id'], unique=False)

    # apuntes — depends on users, materias
    op.create_table(
        'apuntes',
        sa.Column('id',          sa.Integer(),      nullable=False),
        sa.Column('user_id',     sa.Integer(),      nullable=False),
        sa.Column('materia_id',  sa.Integer(),      nullable=False),
        sa.Column('titulo',      sa.String(200),    nullable=False),
        sa.Column('archivo_url', sa.Text(),         nullable=False),
        sa.Column('tags',        sa.Text(),         nullable=True),
        sa.Column('aprobado',    sa.Boolean(),      nullable=True),
        sa.ForeignKeyConstraint(['materia_id'], ['materias.id']),
        sa.ForeignKeyConstraint(['user_id'],    ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_apuntes_id'), 'apuntes', ['id'], unique=False)

    # temarios — depends on materias
    op.create_table(
        'temarios',
        sa.Column('id',          sa.Integer(),   nullable=False),
        sa.Column('materia_id',  sa.Integer(),   nullable=False),
        sa.Column('semana',      sa.Integer(),   nullable=False),
        sa.Column('titulo',      sa.String(200), nullable=False),
        sa.Column('descripcion', sa.Text(),      nullable=True),
        sa.ForeignKeyConstraint(['materia_id'], ['materias.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_temarios_id'), 'temarios', ['id'], unique=False)

    # eventos_calendario — depends on materias, carreras, users
    op.create_table(
        'eventos_calendario',
        sa.Column('id',          sa.Integer(),   nullable=False),
        sa.Column('titulo',      sa.String(200), nullable=False),
        sa.Column('tipo',        sa.String(20),  nullable=False),
        sa.Column('fecha',       sa.Date(),      nullable=False),
        sa.Column('materia_id',  sa.Integer(),   nullable=True),
        sa.Column('carrera_id',  sa.Integer(),   nullable=True),
        sa.Column('descripcion', sa.Text(),      nullable=True),
        sa.Column('creado_por',  sa.Integer(),   nullable=True),
        sa.ForeignKeyConstraint(['carrera_id'], ['carreras.id']),
        sa.ForeignKeyConstraint(['creado_por'], ['users.id']),
        sa.ForeignKeyConstraint(['materia_id'], ['materias.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_eventos_calendario_id'), 'eventos_calendario', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_eventos_calendario_id'), table_name='eventos_calendario')
    op.drop_table('eventos_calendario')

    op.drop_index(op.f('ix_temarios_id'), table_name='temarios')
    op.drop_table('temarios')

    op.drop_index(op.f('ix_apuntes_id'), table_name='apuntes')
    op.drop_table('apuntes')

    op.drop_index(op.f('ix_puntajes_id'), table_name='puntajes')
    op.drop_table('puntajes')

    op.drop_index(op.f('ix_asistencias_id'), table_name='asistencias')
    op.drop_table('asistencias')

    op.drop_index(op.f('ix_inscripciones_id'), table_name='inscripciones')
    op.drop_table('inscripciones')

    op.drop_index(op.f('ix_materias_nombre'), table_name='materias')
    op.drop_index(op.f('ix_materias_id'),     table_name='materias')
    op.drop_table('materias')

    op.drop_index(op.f('ix_users_username'), table_name='users')
    op.drop_index(op.f('ix_users_id'),       table_name='users')
    op.drop_table('users')

    op.drop_index(op.f('ix_carreras_id'), table_name='carreras')
    op.drop_table('carreras')
