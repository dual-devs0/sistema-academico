# backend/app/routers/__init__.py
from . import users_router as users
from . import auth_router as auth
from . import materia_router as materias
from . import inscripciones_router as inscripciones
from . import carreras_router as carreras
from . import asistencias_router as asistencias
from . import puntajes_router as puntajes
from . import apuntes_router as apuntes
from . import eventos_router as eventos
from . import programas_router as programas
from . import reportes_router as reportes
from . import boleta_router as boleta
from . import alumno_router as alumno
from . import foro_router as foro

__all__ = ["users", "auth", "materias", "inscripciones", "carreras", "asistencias", "puntajes", "apuntes", "eventos", "programas", "reportes", "boleta", "alumno", "foro"]
