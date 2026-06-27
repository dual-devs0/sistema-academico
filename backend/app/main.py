from fastapi import FastAPI
from app.routers import users_router, auth_router, test, materias_router

app = FastAPI(title="Sistema Académico")

app.include_router(users_router.router)
app.include_router(auth_router.router)
app.include_router(test.router)
app.include_router(materias_router.router)

@app.get("/")
def root():
    return {"message": "API Sistema Académico funcionando"}