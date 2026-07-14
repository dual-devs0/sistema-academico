"""
Migra datos de sistema_academico.db (SQLite) → PostgreSQL.

Uso:
    DATABASE_URL=postgresql+psycopg2://sa_user:sa_pass@localhost:5432/
    sistema_academico \
    python scripts/migrate_sqlite_to_pg.py

Requiere que el schema de PG ya exista (alembic upgrade head).
Borra todos los datos existentes en PG antes de insertar.
NO usar en producción con datos reales sin backup previo.
"""

import os
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
SQLITE_PATH = Path(__file__).parent.parent / "sistema_academico.db"
PG_URL = os.getenv("DATABASE_URL", "")

if not PG_URL.startswith("postgresql"):
    print("ERROR: DATABASE_URL debe apuntar a PostgreSQL.", file=sys.stderr)
    sys.exit(1)

if not SQLITE_PATH.exists():
    print(f"ERROR: SQLite DB no encontrada en {SQLITE_PATH}", file=sys.stderr)
    sys.exit(1)

# ---------------------------------------------------------------------------
# Orden de inserción respeta FKs
# ---------------------------------------------------------------------------
TABLE_ORDER = [
    "carreras",
    "users",
    "materias",
    "inscripciones",
    "puntajes",
    "asistencias",
    "apuntes",
    "programas",
    "horarios",
    "foro_hilos",
    "foro_mensajes",
    "eventos_calendario",
    "refresh_tokens",  # si ya existe
]

from sqlalchemy import create_engine, text, inspect  # noqa: E402
from sqlalchemy.types import Boolean, DateTime  # noqa: E402


def get_columns(engine, table_name: str) -> list[str]:
    insp = inspect(engine)
    return [c["name"] for c in insp.get_columns(table_name)]


def get_bool_cols(engine, table_name: str) -> set[str]:
    insp = inspect(engine)
    return {
        c["name"]
        for c in insp.get_columns(table_name)
        if isinstance(c["type"], Boolean)
    }


def get_datetime_cols(engine, table_name: str) -> set[str]:
    insp = inspect(engine)
    return {
        c["name"]
        for c in insp.get_columns(table_name)
        if isinstance(c["type"], DateTime)
    }


def coerce_row(row: dict, bool_cols: set, dt_cols: set) -> dict:
    result = {}
    for k, v in row.items():
        if k in bool_cols and v is not None:
            result[k] = bool(v)
        elif k in dt_cols and isinstance(v, str):
            # SQLite returns datetime as string; parse to datetime object
            for fmt in (
                "%Y-%m-%d %H:%M:%S.%f",
                "%Y-%m-%d %H:%M:%S",
                "%Y-%m-%dT%H:%M:%S.%f",
                "%Y-%m-%dT%H:%M:%S",
            ):
                try:
                    result[k] = datetime.strptime(v, fmt)
                    break
                except ValueError:
                    continue
            else:
                result[k] = v  # fallback: pass as-is
        else:
            result[k] = v
    return result


def migrate():
    sqlite_conn = sqlite3.connect(SQLITE_PATH)
    sqlite_conn.row_factory = sqlite3.Row

    pg_engine = create_engine(PG_URL)

    with pg_engine.begin() as pg_conn:
        pg_insp = inspect(pg_engine)
        existing_tables = pg_insp.get_table_names()

        sqlite_tables = {
            r[0]
            for r in sqlite_conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()
        }

        for table in TABLE_ORDER:
            if table not in existing_tables:
                print(f"  SKIP {table} (no existe en PG aún)")
                continue
            if table not in sqlite_tables:
                print(f"  SKIP {table} (no existe en SQLite — tabla nueva)")
                continue

            rows = sqlite_conn.execute(f"SELECT * FROM {table}").fetchall()  # noqa: S608
            if not rows:
                print(f"  SKIP {table} (vacía en SQLite)")
                continue

            pg_cols = get_columns(pg_engine, table)
            sqlite_cols = list(rows[0].keys())
            common_cols = [c for c in sqlite_cols if c in pg_cols]
            col_list = ", ".join(f'"{c}"' for c in common_cols)
            placeholders = ", ".join(f":{c}" for c in common_cols)

            # Borrar destino antes de insertar (orden inverso no necesario — truncate cascade)  # noqa: E501
            pg_conn.execute(text(f'DELETE FROM "{table}"'))

            bool_cols = get_bool_cols(pg_engine, table)
            dt_cols = get_datetime_cols(pg_engine, table)
            records = [
                coerce_row(
                    dict(zip(common_cols, [row[c] for c in common_cols])),
                    bool_cols,
                    dt_cols,
                )
                for row in rows
            ]
            pg_conn.execute(
                text(f'INSERT INTO "{table}" ({col_list}) VALUES ({placeholders})'),
                records,
            )
            print(f"  OK  {table}: {len(records)} filas")

        # Resetear sequences de PG para que auto-increment no colisione.
        # Solo tablas con columna 'id' serial (no alembic_version ni join tables).
        for table in existing_tables:
            has_id = any(c["name"] == "id" for c in pg_insp.get_columns(table))
            if not has_id:
                continue
            try:
                pg_conn.execute(
                    text(
                        f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), "
                        f'COALESCE(MAX(id), 1)) FROM "{table}"'
                    )
                )
            except Exception:
                pass  # tabla sin sequence serial

    sqlite_conn.close()
    print("\nMigración completada.")


if __name__ == "__main__":
    migrate()
