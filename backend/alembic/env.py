import os
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config, pool
from alembic import context
from dotenv import load_dotenv

# Load .env from backend/ directory (one level up from alembic/)
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

config = context.config

database_url = os.getenv("DATABASE_URL")
if database_url:
    config.set_main_option("sqlalchemy.url", database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Import Base and all models so every table is registered in metadata
from app.database import Base
from app.models import (  # noqa: F401
    user,
    materia,
    oferta_materia,
    inscripcion,
    carrera,
    asistencia,
    puntaje,
    apunte,
    evento_calendario,
    temario,
    recordatorio_docente,
    pensum_materia,
    correlatividad,
    avance_alumno_pensum,
    expediente_materia,
    expediente_semestre,
    regularidad_alumno,
)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
