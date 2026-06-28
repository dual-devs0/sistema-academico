import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "API Sistema Académico funcionando"}

@pytest.mark.skip(reason="DB no conectada todavía")
def test_user_flow():
    admin_data = {"username": "admin", "password": "admin123", "role": "admin"}
    response = client.post("/users/", json=admin_data)
    assert response.status_code == 200

    response = client.post("/auth/login", json=admin_data)
    assert response.status_code == 200
    token = response.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}
    materia_data = {"nombre": "Matemáticas", "profesor_id": 1}
    response = client.post("/materias/", json=materia_data, headers=headers)
    assert response.status_code == 200

@pytest.mark.skip(reason="DB no conectada todavía")
def test_alumno_flow():
    alumno_data = {"username": "alumno1", "password": "alumno123", "role": "alumno"}
    response = client.post("/users/", json=alumno_data)
    assert response.status_code == 200

    response = client.post("/auth/login", json=alumno_data)
    assert response.status_code == 200
    token = response.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}
    inscripcion_data = {"alumno_id": 2, "materia_id": 1}
    response = client.post("/inscripciones/", json=inscripcion_data, headers=headers)
    assert response.status_code == 200
