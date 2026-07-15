import asyncio
import logging
import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()  # carga .env antes de que cualquier módulo lea os.getenv
from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402
from app.middleware.security_headers import SecurityHeadersMiddleware  # noqa: E402
from app.jobs.reintento_facturacion import ciclo_reintentos  # noqa: E402
from app.routers import (  # noqa: E402
    users,
    auth,
    materias,
    inscripciones,
    test as test_router,
    carreras,
    asistencias,
    puntajes,
    apuntes,
    eventos,
    programas,
    reportes,
    boleta,
    alumno,
    foro,
    horarios,
    profesor,
    pensum,
    expediente,
    finanzas,
    becas,
    tramites,
    pasantias,
    graduacion,
    equivalencias,
    examenes,
    notificaciones,
)

# Schema management es exclusivo de Alembic (backend/alembic/versions/) --
# nunca create_all() acá. Correr `alembic upgrade head` para aplicar migraciones.

STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "static")
os.makedirs(os.path.join(STATIC_DIR, "avatars"), exist_ok=True)

logger = logging.getLogger(__name__)

REINTENTO_INTERVALO_SEGUNDOS = 600  # Fase 4B: job de reintentos de facturación


async def _loop_reintentos_facturacion():
    while True:
        await asyncio.sleep(REINTENTO_INTERVALO_SEGUNDOS)
        try:
            await ciclo_reintentos()
        except Exception as exc:
            logger.error("Loop de reintentos de facturación falló: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(_loop_reintentos_facturacion())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="Sistema Academico",
    description="API para gestion academica de la Universidad Catolica",
    version="0.1.0",
    lifespan=lifespan,
)

origins = [
    o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
]
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
app.include_router(finanzas.router)
app.include_router(becas.router)
app.include_router(tramites.router)
app.include_router(pasantias.router)
app.include_router(graduacion.router)
app.include_router(equivalencias.router)
app.include_router(examenes.router)
app.include_router(notificaciones.router)
app.include_router(test_router.router)


@app.get(
    "/",
    tags=["default"],
    responses={200: {"description": "API funcionando correctamente"}},
)
def root():
    return {"message": "API Sistema Academico funcionando"}
