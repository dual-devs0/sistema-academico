# backend/app/routers/__init__.py
from . import users_router as users
from . import auth_router as auth
from . import materia_router as materias
from . import inscripciones_router as inscripciones

__all__ = ["users", "auth", "materias", "inscripciones"]
