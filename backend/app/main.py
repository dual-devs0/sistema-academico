# Run: alembic upgrade head before starting the server
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.routers import (
    users, auth, materias, inscripciones, test as test_router,
    carreras, asistencias, puntajes, apuntes, eventos, temarios, reportes, boleta,
)

app = FastAPI(
    title="Sistema Académico",
    description="API para gestión académica de la Universidad Católica",
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
app.include_router(temarios.router)
app.include_router(reportes.router)
app.include_router(boleta.router)
app.include_router(test_router.router)


@app.get(
    "/",
    tags=["default"],
    responses={200: {"description": "API funcionando correctamente"}},
)
def root():
    return {"message": "API Sistema Académico funcionando"}
