from fastapi import FastAPI
from app.routers import users, auth, materias, inscripciones

app = FastAPI(
    title="Sistema Académico",
    description="API para gestión académica de la Universidad Católica",
    version="0.1.0"
)


app.include_router(users.router)
app.include_router(auth.router)
app.include_router(materias.router)
app.include_router(inscripciones.router)

@app.get(
    "/",
    tags=["default"],
    responses={
        200: {"description": "API funcionando correctamente"}
    }
)
def root():
    return {"message": "API Sistema Académico funcionando"}
