def test_login_success(client, seed):
    res = client.post("/auth/login", json={"username": "admin_test", "password": "admin123"})
    assert res.status_code == 200
    body = res.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


def test_login_wrong_password(client, seed):
    res = client.post("/auth/login", json={"username": "admin_test", "password": "wrongpass"})
    assert res.status_code == 400


def test_login_unknown_user(client, seed):
    res = client.post("/auth/login", json={"username": "noexiste", "password": "x"})
    assert res.status_code == 400
