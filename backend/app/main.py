import os
import sqlite3
from dotenv import load_dotenv
load_dotenv()  # carga .env antes de que cualquier módulo lea os.getenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.routers import (
    users, auth, materias, inscripciones, test as test_router,
    carreras, asistencias, puntajes, apuntes, eventos, programas, reportes, boleta, alumno, foro,
    horarios, profesor, pensum, expediente,
)

# Schema management es exclusivo de Alembic (backend/alembic/versions/) --
# nunca create_all() acá. Correr `alembic upgrade head` para aplicar migraciones.

STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "static")
os.makedirs(os.path.join(STATIC_DIR, "avatars"), exist_ok=True)

app = FastAPI(
    title="Sistema Academico",
    description="API para gestion academica de la Universidad Catolica",
    version="0.1.0",
)

origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")]
print(f"CORS origins: {origins}")

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

app.include_router(users.router)
app.include_router(auth.router)
app.include_router(materias.router)
app.include_router(inscripciones.router)
app.include_router(carreras.router)
app.include_router(asistencias.router)
app.include_router(puntajes.router)
app.include_router(apuntes.router)
app.include_router(eventos.router)
app.include_router(programas.router)
app.include_router(reportes.router)
app.include_router(boleta.router)
app.include_router(alumno.router)
app.include_router(foro.router)
app.include_router(horarios.router)
app.include_router(profesor.router)
app.include_router(pensum.router)
app.include_router(expediente.router)
app.include_router(test_router.router)


def _apply_db_migrations():
    """Safe incremental migrations for SQLite (ADD COLUMN only)."""
    db_url = os.getenv("DATABASE_URL", "sqlite:///./sistema_academico.db")
    if "sqlite" not in db_url:
        return
    db_path = db_url.replace("sqlite:///", "")
    if not os.path.exists(db_path):
        return
    pending = {
        "asistencias": [
            ("motivo", "VARCHAR"),
        ],
        "apuntes": [
            ("descripcion", "TEXT"),
            ("tipo_contenido", "VARCHAR(50) DEFAULT 'pdf'"),
            ("likes", "INTEGER DEFAULT 0"),
            ("descargas", "INTEGER DEFAULT 0"),
            ("visibilidad", "VARCHAR(20) DEFAULT 'publico'"),
            ("fecha_subida", "DATETIME"),
        ],
        "temarios": [
            ("bibliografia", "JSON"),
        ],
        "eventos_calendario": [
            ("fecha_fin", "DATE"),
            ("anio", "INTEGER"),
            ("semestre", "INTEGER"),
            ("archivo_pdf", "TEXT"),
        ],
        "materias": [
            ("creditos", "INTEGER DEFAULT 4"),
            ("cupos", "INTEGER DEFAULT 40"),
            ("horario", "VARCHAR"),
            ("secciones", "INTEGER DEFAULT 1"),
        ],
        "users": [
            ("foto_url", "VARCHAR"),
        ],
    }
    try:
        conn = sqlite3.connect(db_path)
        c = conn.cursor()
        for table, columns in pending.items():
            c.execute(f"PRAGMA table_info({table})")
            existing = {row[1] for row in c.fetchall()}
            if not existing:
                continue  # table doesn't exist yet; create_all handles it
            for col, coltype in columns:
                if col not in existing:
                    conn.execute(f"ALTER TABLE {table} ADD COLUMN {col} {coltype}")
                    print(f"[migration] Added column: {table}.{col}")
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[migration] Warning: {e}")


_apply_db_migrations()


@app.get(
    "/",
    tags=["default"],
    responses={200: {"description": "API funcionando correctamente"}},
)
def root():
    return {"message": "API Sistema Academico funcionando"}
