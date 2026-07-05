"""
Tests de compatibilidad con PostgreSQL.

Requieren TEST_DATABASE_URL apuntando a un PostgreSQL real.
Correr: TEST_DATABASE_URL=postgresql+psycopg2://... pytest -m postgres

Si TEST_DATABASE_URL no existe o sigue siendo SQLite, todos se saltean.
"""
import concurrent.futures
import os
import threading

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import (  # noqa: F401
    user as user_model,
    materia as materia_model,
    inscripcion,
    carrera as carrera_model,
    asistencia,
    puntaje as puntaje_model,
    apunte,
    evento_calendario,
    temario,
    horario,
)
from app.security import hash_password

_PG_URL = os.getenv("TEST_DATABASE_URL", "")
_IS_PG = _PG_URL.startswith("postgresql")

pytestmark = pytest.mark.skipif(not _IS_PG, reason="TEST_DATABASE_URL not set to PostgreSQL")


@pytest.fixture(scope="module")
def pg_engine():
    engine = create_engine(
        _PG_URL,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
    )
    # create_all es no-op si las tablas ya existen (creadas por Alembic)
    Base.metadata.create_all(bind=engine)
    yield engine
    # No drop_all — las tablas pertenecen al schema Alembic.
    # Limpiamos solo los datos de test para no dejar basura.
    _TABLE_CLEANUP_ORDER = [
        "asistencias", "puntajes", "apuntes", "foro_mensajes",
        "foro_hilos", "inscripciones", "eventos_calendario",
        "programas", "temarios", "horarios", "materias",
        "refresh_tokens", "users", "carreras",
    ]
    with engine.begin() as conn:
        for tbl in _TABLE_CLEANUP_ORDER:
            conn.execute(text(f"DELETE FROM {tbl}"))
    engine.dispose()


@pytest.fixture()
def pg_session(pg_engine):
    Session = sessionmaker(bind=pg_engine)
    session = Session()
    yield session
    session.rollback()
    session.close()


# ---------------------------------------------------------------------------
# Conectividad básica
# ---------------------------------------------------------------------------

def test_pg_connection(pg_engine):
    with pg_engine.connect() as conn:
        result = conn.execute(text("SELECT 1")).scalar()
    assert result == 1


# ---------------------------------------------------------------------------
# Tipos de columna
# ---------------------------------------------------------------------------

def test_boolean_columns_round_trip(pg_session):
    carrera = carrera_model.Carrera(nombre="Test Carrera Bool")
    pg_session.add(carrera)
    pg_session.flush()

    user = user_model.User(
        username="bool_test_user",
        hashed_password=hash_password("pass"),
        role="alumno",
        nombre="Bool Test",
        es_becado=True,
    )
    pg_session.add(user)
    pg_session.flush()

    pg_session.expire(user)
    fetched = pg_session.get(user_model.User, user.id)
    assert fetched.es_becado is True  # no 1, no "t" — bool real


def test_datetime_timezone_aware(pg_session):
    carrera = carrera_model.Carrera(nombre="Test Carrera TZ")
    pg_session.add(carrera)
    pg_session.flush()

    user = user_model.User(
        username="tz_test_user",
        hashed_password=hash_password("pass"),
        role="alumno",
        nombre="TZ Test",
    )
    pg_session.add(user)
    pg_session.flush()

    pg_session.expire(user)
    fetched = pg_session.get(user_model.User, user.id)
    assert fetched.created_at is not None
    assert fetched.created_at.tzinfo is not None  # no naive datetime


# ---------------------------------------------------------------------------
# Escritura concurrente (el caso crítico de SQLite)
# ---------------------------------------------------------------------------

def test_concurrent_writes_no_lock(pg_engine):
    """10 threads insertan asistencias simultáneamente — ningún OperationalError por lock."""
    from datetime import date, timedelta
    from app.models.asistencia import Asistencia

    Session = sessionmaker(bind=pg_engine)

    # Seed mínimo: carrera, profesor, alumno, materia
    setup_session = Session()
    carrera = carrera_model.Carrera(nombre="Concurrent Test Carrera")
    setup_session.add(carrera)
    setup_session.flush()

    profesor = user_model.User(
        username="concurrent_prof",
        hashed_password=hash_password("p"),
        role="profesor",
        nombre="Prof Concurrent",
    )
    alumno = user_model.User(
        username="concurrent_alumno",
        hashed_password=hash_password("p"),
        role="alumno",
        nombre="Alumno Concurrent",
        carrera_id=carrera.id,
    )
    setup_session.add_all([profesor, alumno])
    setup_session.flush()

    materia = materia_model.Materia(
        nombre="Concurrent Materia",
        profesor_id=profesor.id,
        carrera_id=carrera.id,
        anio=1,
        semestre=1,
    )
    setup_session.add(materia)
    setup_session.commit()

    alumno_id = alumno.id
    materia_id = materia.id
    setup_session.close()

    errors = []

    def insert_asistencia(day_offset):
        s = Session()
        try:
            a = Asistencia(
                user_id=alumno_id,
                materia_id=materia_id,
                fecha=date(2025, 1, 1) + timedelta(days=day_offset),
                presente=True,
            )
            s.add(a)
            s.commit()
        except Exception as exc:
            errors.append(str(exc))
        finally:
            s.close()

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(insert_asistencia, i) for i in range(10)]
        concurrent.futures.wait(futures)

    assert errors == [], f"Concurrent write errors: {errors}"
