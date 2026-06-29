"""
Integration flow tests.
Uses the conftest.py fixtures (in-memory SQLite + seeded users) so all
endpoints that require auth receive a valid token.
"""


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "API Sistema Académico funcionando"}


def test_user_flow(client, seed, tokens):
    headers = auth(tokens["admin"])

    # Admin creates a new user via API
    new_user = {
        "username": "flow_user",
        "password": "flow123",
        "role": "alumno",
        "nombre": "Flow User",
        "email": "flow@test.com",
    }
    response = client.post("/users/", json=new_user, headers=headers)
    assert response.status_code == 200
    assert response.json()["username"] == "flow_user"

    # Admin creates a materia (profesor_id must be an existing user)
    materia_data = {"nombre": "Álgebra Avanzada", "profesor_id": seed["profesor"].id}
    response = client.post("/materias/", json=materia_data, headers=headers)
    assert response.status_code == 200
    assert response.json()["nombre"] == "Álgebra Avanzada"


def test_alumno_flow(client, seed, tokens):
    # Alumno logs in (login tested separately in test_auth.py)
    headers = auth(tokens["alumno"])

    # Alumno inscribes in the seeded materia
    inscripcion_data = {
        "alumno_id": seed["alumno"].id,
        "materia_id": seed["materia"].id,
    }
    response = client.post("/inscripciones/", json=inscripcion_data, headers=headers)
    assert response.status_code == 200

    # Alumno can only see their own puntajes
    response = client.get("/puntajes/", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert all(p["user_id"] == seed["alumno"].id for p in data)
