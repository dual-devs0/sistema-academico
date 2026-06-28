def auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_list_users_no_token(client, seed):
    res = client.get("/users/")
    assert res.status_code == 401


def test_list_users_alumno_returns_403(client, seed, tokens):
    res = client.get("/users/", headers=auth(tokens["alumno"]))
    assert res.status_code == 403


def test_list_users_admin_returns_list(client, seed, tokens):
    res = client.get("/users/", headers=auth(tokens["admin"]))
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 3
    usernames = [u["username"] for u in data]
    assert "admin_test" in usernames
    assert "alumno_test" in usernames


def test_get_me_returns_current_user(client, seed, tokens):
    res = client.get("/users/me", headers=auth(tokens["alumno"]))
    assert res.status_code == 200
    data = res.json()
    assert data["username"] == "alumno_test"
    assert data["role"] == "alumno"


def test_get_me_admin(client, seed, tokens):
    res = client.get("/users/me", headers=auth(tokens["admin"]))
    assert res.status_code == 200
    assert res.json()["username"] == "admin_test"


def test_create_user_admin(client, seed, tokens):
    payload = {
        "username": "nuevo_user",
        "password": "nuevo123",
        "role": "alumno",
        "nombre": "Nuevo User",
        "email": "nuevo@test.com",
    }
    res = client.post("/users/", json=payload, headers=auth(tokens["admin"]))
    assert res.status_code == 200
    data = res.json()
    assert data["username"] == "nuevo_user"
    assert data["role"] == "alumno"


def test_create_user_alumno_returns_403(client, seed, tokens):
    payload = {
        "username": "otro_user",
        "password": "otro123",
        "role": "alumno",
        "nombre": "Otro User",
        "email": "otro@test.com",
    }
    res = client.post("/users/", json=payload, headers=auth(tokens["alumno"]))
    assert res.status_code == 403
