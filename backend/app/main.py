import os
import sqlite3
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.routers import (
    users, auth, materias, inscripciones, test as test_router,
    carreras, asistencias, puntajes, apuntes, eventos, programas, reportes, boleta, alumno,
)

# Ensure all tables exist on startup (dev convenience; use alembic in production)
Base.metadata.create_all(bind=engine)

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
app.include_router(test_router.router)


def _apply_db_migrations():
    """Safe incremental migrations for SQLite (ADD COLUMN only)."""
    db_url = os.getenv("DATABASE_URL", "sqlite:///./sistema_academico.db")
    if "sqlite" not in db_url:
        return
    db_path = db_url.replace("sqlite:///", "")
    if not os.path.exists(db_path):
        return
    try:
        conn = sqlite3.connect(db_path)
        c = conn.cursor()
        c.execute("PRAGMA table_info(asistencias)")
        cols = {row[1] for row in c.fetchall()}
        if "motivo" not in cols:
            conn.execute("ALTER TABLE asistencias ADD COLUMN motivo VARCHAR")
            conn.commit()
            print("[migration] Added column: asistencias.motivo")
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
