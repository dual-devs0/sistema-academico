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
    assert response.json() == {"message": "API Sistema Academico funcionando"}


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

    # Admin creates a materia (catalogo, sin profesor asignado todavia)
    materia_data = {"nombre": "Álgebra Avanzada"}
    response = client.post("/materias/", json=materia_data, headers=headers)
    assert response.status_code == 200
    materia_id = response.json()["id"]
    assert response.json()["nombre"] == "Álgebra Avanzada"

    # Admin asigna profesor a la materia para el periodo actual (oferta)
    oferta_data = {
        "materia_id": materia_id,
        "profesor_id": seed["profesor"].id,
        "periodo": "2026-1",
    }
    response = client.post("/materias/ofertas", json=oferta_data, headers=headers)
    assert response.status_code == 200
    assert response.json()["profesor_id"] == seed["profesor"].id


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
