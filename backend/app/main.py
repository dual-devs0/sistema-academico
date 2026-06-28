from fastapi import FastAPI
from app.routers import users, auth, materias, inscripciones

app = FastAPI(title="Sistema Académico")

# Incluimos routers
app.include_router(users.router)
app.include_router(auth.router)
app.include_router(materias.router)
app.include_router(inscripciones.router)

@app.get("/")
def root():
    return {"message": "API Sistema Académico funcionando"}
