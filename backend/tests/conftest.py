import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
# Import all models so every table is registered in Base.metadata
from app.models import (  # noqa: F401
    user as user_model,
    materia as materia_model,
    inscripcion,
    carrera as carrera_model,
    asistencia,
    puntaje as puntaje_model,
    apunte,
    evento_calendario,
    temario,
)
from app.security import hash_password
from app.auth import create_access_token

TEST_DATABASE_URL = "sqlite:///:memory:"

engine_test = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)


@pytest.fixture()
def db():
    Base.metadata.create_all(bind=engine_test)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine_test)


@pytest.fixture()
def client(db):
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def seed(db):
    carrera = carrera_model.Carrera(nombre="Ing. Informática")
    db.add(carrera)
    db.flush()

    admin = user_model.User(
        username="admin_test",
        hashed_password=hash_password("admin123"),
        role="admin",
        nombre="Admin Test",
        email="admin@test.com",
    )
    profesor = user_model.User(
        username="prof_test",
        hashed_password=hash_password("prof123"),
        role="profesor",
        nombre="Profesor Test",
        email="prof@test.com",
    )
    db.add_all([admin, profesor])
    db.flush()

    alumno = user_model.User(
        username="alumno_test",
        hashed_password=hash_password("alumno123"),
        role="alumno",
        nombre="Alumno Test",
        email="alumno@test.com",
        carrera_id=carrera.id,
    )
    db.add(alumno)
    db.flush()

    materia = materia_model.Materia(
        nombre="Programación I",
        profesor_id=profesor.id,
        carrera_id=carrera.id,
        anio=1,
        semestre=1,
    )
    db.add(materia)
    db.commit()

    for obj in (admin, profesor, alumno, carrera, materia):
        db.refresh(obj)

    return {
        "admin":    admin,
        "profesor": profesor,
        "alumno":   alumno,
        "carrera":  carrera,
        "materia":  materia,
    }


@pytest.fixture()
def tokens(seed):
    return {
        "admin":    create_access_token({"sub": seed["admin"].username,    "role": "admin",    "user_id": seed["admin"].id}),
        "profesor": create_access_token({"sub": seed["profesor"].username, "role": "profesor", "user_id": seed["profesor"].id}),
        "alumno":   create_access_token({"sub": seed["alumno"].username,   "role": "alumno",   "user_id": seed["alumno"].id}),
    }
