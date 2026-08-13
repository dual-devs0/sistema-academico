"""Flujo completo de recuperación de contraseña en producción.

Cubre: generación/hash del token, expiración configurable, token inválido,
token reutilizado, múltiples solicitudes (mata links viejos), usuario
inexistente (sin enumeración), email enviado/fallido (degradación),
invalidación de sesiones (refresh tokens revocados) y logs de auditoría.
"""
import hashlib
import time
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from app.models.password_reset_token import PasswordResetToken
from app.models.refresh_token import RefreshToken
from app.models.audit_log import AuditLog


def _crear_token(db, usuario_id, raw="raw-token-valido-123", usado=False, horas=1):
    token_hash = hashlib.sha256(raw.encode()).hexdigest()
    token = PasswordResetToken(
        usuario_id=usuario_id,
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=horas),
        used=usado,
    )
    db.add(token)
    db.commit()
    return token


# ---------------------------------------------------------------------------
# Solicitud de recuperación
# ---------------------------------------------------------------------------


def test_recuperar_contrasena_responde_generico_y_crea_token(client, db, seed):
    from app.routers.auth_router import _password_reset_attempts
    _password_reset_attempts.clear()

    with patch("app.routers.auth_router.send_reset_link_email_bg") as mock_email:
        res = client.post(
            "/auth/recuperar-contrasena",
            json={"username_or_email": "admin@test.com"},
        )
    assert res.status_code == 200
    assert res.json()["detail"] == "Si el usuario existe, recibirás un email con instrucciones."
    mock_email.assert_called_once()

    token = db.query(PasswordResetToken).filter(
        PasswordResetToken.usuario_id == seed["admin"].id
    ).first()
    assert token is not None
    assert token.used is False
    # SQLite devuelve naive datetimes; comparar en el mismo dominio que el store.
    assert token.expires_at > datetime.now()


def test_recuperar_contrasena_almacena_token_hasheado_nunca_plano(client, db, seed):
    from app.routers.auth_router import _password_reset_attempts
    _password_reset_attempts.clear()

    with patch("app.routers.auth_router.send_reset_link_email_bg") as mock_email:
        client.post(
            "/auth/recuperar-contrasena",
            json={"username_or_email": "admin_test"},
        )
    raw_token = mock_email.call_args[0][3]
    token = db.query(PasswordResetToken).filter(
        PasswordResetToken.usuario_id == seed["admin"].id
    ).first()
    assert token.token_hash != raw_token
    assert token.token_hash == hashlib.sha256(raw_token.encode()).hexdigest()


def test_recuperar_contrasena_usuario_inexistente_no_revela(client, seed):
    from app.routers.auth_router import _password_reset_attempts
    _password_reset_attempts.clear()
    res = client.post(
        "/auth/recuperar-contrasena",
        json={"username_or_email": "nadie@test.com"},
    )
    assert res.status_code == 200
    assert res.json()["detail"] == "Si el usuario existe, recibirás un email con instrucciones."


def test_recuperar_contrasena_email_invalido_rechazado(client, seed):
    res = client.post(
        "/auth/recuperar-contrasena",
        json={"username_or_email": "no-es-un-email@"},
    )
    assert res.status_code == 422


def test_recuperar_contrasena_segunda_solicitud_invalida_primera(client, db, seed):
    """Múltiples solicitudes: cada una mata el token anterior (un solo link
    vigente a la vez; imposible reutilizar el primero)."""
    from app.routers.auth_router import _password_reset_attempts
    _password_reset_attempts.clear()

    with patch("app.routers.auth_router.send_reset_link_email_bg") as mock_email:
        client.post("/auth/recuperar-contrasena", json={"username_or_email": "admin_test"})
        token1_raw = mock_email.call_args[0][3]
        client.post("/auth/recuperar-contrasena", json={"username_or_email": "admin_test"})
        token2_raw = mock_email.call_args[0][3]

    assert token1_raw != token2_raw
    hash1 = hashlib.sha256(token1_raw.encode()).hexdigest()
    hash2 = hashlib.sha256(token2_raw.encode()).hexdigest()

    res1 = client.post(
        "/auth/reset-password",
        json={"token": token1_raw, "new_password": "NuevaPass1"},
    )
    assert res1.status_code == 400  # primera token ya no existe

    res2 = client.post(
        "/auth/reset-password",
        json={"token": token2_raw, "new_password": "NuevaPass1"},
    )
    assert res2.status_code == 200

    assert db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == hash1
    ).first() is None
    assert db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == hash2
    ).first().used is True


# ---------------------------------------------------------------------------
# Consumo del token (reset)
# ---------------------------------------------------------------------------


def test_reset_password_exitoso_y_login_nuevo(client, db, seed):
    _crear_token(db, seed["admin"].id, raw="token-exitoso-1")
    res = client.post(
        "/auth/reset-password",
        json={"token": "token-exitoso-1", "new_password": "NuevaPass1"},
    )
    assert res.status_code == 200

    res = client.post(
        "/auth/login", json={"username": "admin_test", "password": "NuevaPass1"}
    )
    assert res.status_code == 200


def test_reset_password_token_invalido(client, db, seed):
    res = client.post(
        "/auth/reset-password",
        json={"token": "token-que-no-existe", "new_password": "NuevaPass1"},
    )
    assert res.status_code == 400


def test_reset_password_token_expirado(client, db, seed):
    _crear_token(db, seed["admin"].id, raw="token-expirado-1", horas=-1)
    res = client.post(
        "/auth/reset-password",
        json={"token": "token-expirado-1", "new_password": "NuevaPass1"},
    )
    assert res.status_code == 400


def test_reset_password_token_reutilizado_rechazado(client, db, seed):
    _crear_token(db, seed["admin"].id, raw="token-reutilizable-1")
    ok = client.post(
        "/auth/reset-password",
        json={"token": "token-reutilizable-1", "new_password": "NuevaPass1"},
    )
    assert ok.status_code == 200

    reuso = client.post(
        "/auth/reset-password",
        json={"token": "token-reutilizable-1", "new_password": "OtraPass2"},
    )
    assert reuso.status_code == 400
    # La contraseña del primer reset sigue vigente (el reuso no la tocó).
    res = client.post(
        "/auth/login", json={"username": "admin_test", "password": "NuevaPass1"}
    )
    assert res.status_code == 200


def test_reset_password_contraseña_debil_rechazada(client, db, seed):
    _crear_token(db, seed["admin"].id, raw="token-debil-123")
    res = client.post(
        "/auth/reset-password",
        json={"token": "token-debil-123", "new_password": "abc"},
    )
    assert res.status_code == 422


def test_reset_password_revoca_sesiones_existentes(client, db, seed):
    """Tras un reset, todos los refresh tokens del usuario quedan revocados
    (invalidación de sesiones en todos los dispositivos)."""
    rt_old = RefreshToken(
        usuario_id=seed["admin"].id,
        token_hash=hashlib.sha256("rt-viejo".encode()).hexdigest(),
        expira_en=datetime.now(timezone.utc) + timedelta(days=7),
        revocado=False,
    )
    db.add(rt_old)
    db.commit()

    _crear_token(db, seed["admin"].id, raw="token-sesiones-1")
    client.post(
        "/auth/reset-password",
        json={"token": "token-sesiones-1", "new_password": "NuevaPass1"},
    )

    db.refresh(rt_old)
    assert rt_old.revocado is True


def test_reset_password_registra_auditoria(client, db, seed):
    _crear_token(db, seed["admin"].id, raw="token-auditoria-1")
    client.post(
        "/auth/reset-password",
        json={"token": "token-auditoria-1", "new_password": "NuevaPass1"},
    )
    eventos = [a.evento for a in db.query(AuditLog).all()]
    assert "password_reset_completed" in eventos


def test_recuperar_contrasena_registra_auditoria(client, db, seed):
    from app.routers.auth_router import _password_reset_attempts
    _password_reset_attempts.clear()
    with patch("app.routers.auth_router.send_reset_link_email_bg"):
        client.post("/auth/recuperar-contrasena", json={"username_or_email": "admin_test"})
    eventos = [a.evento for a in db.query(AuditLog).all()]
    assert "password_reset_requested" in eventos


# ---------------------------------------------------------------------------
# Proveedor de email: enviado / fallido / caído
# ---------------------------------------------------------------------------


def test_recuperar_contrasena_email_se_envia_en_background(client, db, seed):
    from app.routers.auth_router import _password_reset_attempts
    _password_reset_attempts.clear()

    with patch("app.routers.auth_router.send_reset_link_email_bg") as mock_email:
        client.post("/auth/recuperar-contrasena", json={"username_or_email": "admin_test"})
    mock_email.assert_called_once()
    args = mock_email.call_args[0]
    assert args[1] == "admin@test.com"
    assert len(args[3]) >= 32  # token crudo criptográfica


def test_recuperar_contrasena_sin_email_cuenta_no_envia(client, db, seed):
    """Usuarios sin email: no envía nada pero responde igual (sin enumerar)."""
    from app.routers.auth_router import _password_reset_attempts
    _password_reset_attempts.clear()

    seed["admin"].email = None
    db.commit()

    with patch("app.routers.auth_router.send_reset_link_email_bg") as mock_email:
        res = client.post(
            "/auth/recuperar-contrasena", json={"username_or_email": "admin_test"}
        )
    assert res.status_code == 200
    mock_email.assert_not_called()


def test_email_provider_fallido_no_rompe_respuesta(client, db, seed):
    """Proveedor caído (send_email interno falla): el endpoint responde 200
    igual; el error queda en los logs del provider (bg task)."""
    from app.routers.auth_router import _password_reset_attempts
    _password_reset_attempts.clear()

    import app.email_utils
    with patch.object(
        app.email_utils, "ACTIVE_PROVIDER", "resend"
    ), patch(
        "app.email_provider._send_via_resend",
        side_effect=RuntimeError("provider down"),
    ):
        res = client.post(
            "/auth/recuperar-contrasena", json={"username_or_email": "admin_test"}
        )
    assert res.status_code == 200


def test_send_email_retries_y_luego_degrada_sin_raise():
    """send_email nunca lanza: 3 intentos, luego log de error."""
    import asyncio
    import logging
    from unittest.mock import AsyncMock, patch

    import app.email_provider as ep

    failures = AsyncMock(side_effect=RuntimeError("boom"))
    with (
        patch.object(ep, "ACTIVE_PROVIDER", "resend"),
        patch.object(ep, "EMAIL_MAX_ATTEMPTS", 2),
        patch.object(ep, "_send_once", failures),
        patch.object(ep, "logger") as mock_logger,
        patch("asyncio.sleep", new_callable=AsyncMock),
    ):
        asyncio.run(ep.send_email("a@b.com", "S", "<p>x</p>"))
    assert failures.call_count == 2
    mock_logger.error.assert_called_once()


def test_email_templates_contienen_enlace_y_expiración():
    from app.email_templates import render_reset_password_email

    html = render_reset_password_email("Juan", "https://sistema.uca.edu.py/reset-password?token=abc", 60)
    assert "Restablecer contraseña" in html
    assert "https://sistema.uca.edu.py/reset-password?token=abc" in html
    assert "expira en" in html
    assert "@media" in html  # responsive
    assert "uc" in html.lower() or "UCA" in html  # branding


def test_sliding_window_memory_store():
    """Algoritmo sliding window: cuenta exacta dentro de la ventana."""
    import asyncio

    from app.rate_limiting import MemorySlidingWindowStore

    store = MemorySlidingWindowStore()
    now = time.time()
    ok, _, _ = asyncio.run(store.check_and_add("k1", now, 60, 3))
    assert ok is True
    asyncio.run(store.check_and_add("k1", now + 1, 60, 3))
    asyncio.run(store.check_and_add("k1", now + 2, 60, 3))
    ok, retry, remaining = asyncio.run(store.check_and_add("k1", now + 3, 60, 3))
    assert ok is False
    assert retry >= 1
    assert remaining == 0
    # Fuera de la ventana: vuelve a permitir (los eventos vencen).
    ok, _, _ = asyncio.run(store.check_and_add("k1", now + 61, 60, 3))
    assert ok is True