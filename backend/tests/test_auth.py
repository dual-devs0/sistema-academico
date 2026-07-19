def test_login_success(client, seed):
    res = client.post(
        "/auth/login", json={"username": "admin_test", "password": "admin123"}
    )
    assert res.status_code == 200
    body = res.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


def test_login_wrong_password(client, seed):
    res = client.post(
        "/auth/login", json={"username": "admin_test", "password": "wrongpass"}
    )
    assert res.status_code == 400


def test_login_unknown_user(client, seed):
    res = client.post("/auth/login", json={"username": "noexiste", "password": "x"})
    assert res.status_code == 400


def test_login_rate_limit_bloquea_tras_intentos_fallidos(client, seed):
    from app.routers import auth_router

    auth_router._login_failed_attempts.clear()
    username = "profesor_test_rl"

    for _ in range(auth_router._LOGIN_MAX_ATTEMPTS):
        res = client.post(
            "/auth/login", json={"username": username, "password": "wrongpass"}
        )
        assert res.status_code == 400

    res = client.post(
        "/auth/login", json={"username": username, "password": "wrongpass"}
    )
    assert res.status_code == 429

    auth_router._login_failed_attempts.clear()


def test_login_exitoso_limpia_intentos_previos(client, seed):
    from app.routers import auth_router

    auth_router._login_failed_attempts.clear()

    for _ in range(auth_router._LOGIN_MAX_ATTEMPTS - 1):
        res = client.post(
            "/auth/login", json={"username": "admin_test", "password": "wrongpass"}
        )
        assert res.status_code == 400

    res = client.post(
        "/auth/login", json={"username": "admin_test", "password": "admin123"}
    )
    assert res.status_code == 200

    # Tras login exitoso el contador se resetea: se pueden fallar de nuevo
    # sin quedar bloqueado inmediatamente.
    res = client.post(
        "/auth/login", json={"username": "admin_test", "password": "wrongpass"}
    )
    assert res.status_code == 400

    auth_router._login_failed_attempts.clear()
