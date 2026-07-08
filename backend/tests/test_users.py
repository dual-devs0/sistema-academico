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
    assert "items" in data and "total" in data
    assert data["total"] >= 3
    usernames = [u["username"] for u in data["items"]]
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


def test_list_users_filter_by_role(client, seed, tokens):
    res = client.get("/users/?role=profesor", headers=auth(tokens["admin"]))
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 1
    assert all(u["role"] == "profesor" for u in data["items"])


def test_list_users_search_by_q(client, seed, tokens):
    res = client.get("/users/?q=alumno_test", headers=auth(tokens["admin"]))
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 1
    assert data["items"][0]["username"] == "alumno_test"


def test_list_users_search_by_email(client, seed, tokens):
    res = client.get("/users/?q=prof@test.com", headers=auth(tokens["admin"]))
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 1
    assert data["items"][0]["username"] == "prof_test"


def test_list_users_pagination_skip_limit(client, seed, tokens):
    res_page1 = client.get("/users/?skip=0&limit=2", headers=auth(tokens["admin"]))
    res_page2 = client.get("/users/?skip=2&limit=2", headers=auth(tokens["admin"]))
    assert res_page1.status_code == 200 and res_page2.status_code == 200
    data1, data2 = res_page1.json(), res_page2.json()
    assert len(data1["items"]) == 2
    assert data1["total"] == data2["total"]
    assert data1["total"] >= 4
    ids_page1 = {u["id"] for u in data1["items"]}
    ids_page2 = {u["id"] for u in data2["items"]}
    assert ids_page1.isdisjoint(ids_page2)
