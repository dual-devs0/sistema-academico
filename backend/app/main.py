from fastapi import FastAPI
<<<<<<< HEAD
from app.routers import users_router, auth_router, test

app = FastAPI(title="Sistema Académico")

app.include_router(users_router.router)
app.include_router(auth_router.router)
app.include_router(test.router)
=======
import backend.app.routers.users_router as users_router
import backend.app.routers.auth_router as auth_router
from backend.app.routers import test
app = FastAPI(title="Sistema Académico")

# Incluimos routers
app.include_router(users_router.router)
app.include_router(auth_router.router)
app.include_router(test.router)
print(users_router.router.routes)
print(auth_router.router.routes)
>>>>>>> 5cf3462cf0a0a1b7e9c9ac03a2a5c248594d7758


@app.get("/")
def root():
    return {"message": "API Sistema Académico funcionando"}
