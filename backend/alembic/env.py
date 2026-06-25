import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

config = context.config

# Sobrescribir la URL con la de .env
database_url = os.getenv("DATABASE_URL")
if database_url:
    config.set_main_option("sqlalchemy.url", database_url)

# Logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Importar Base y modelos
from app.database import Base
from app.models import users  # importa el módulo, no Base

target_metadata = Base.metadata
