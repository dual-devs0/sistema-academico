"""Tests de notificaciones push -- sin cobertura previa (gap encontrado
durante preparacion de deploy a produccion, 2026-07-24)."""


def test_vapid_public_key_no_crashea_sin_env_configurada(client):
    """FIX (prep-deploy 2026-07-24): _generar_vapid_keys() devolvia objetos
    de `cryptography` en vez de strings cuando VAPID_PUBLIC_KEY/PRIVATE_KEY
    no estan seteadas -- el endpoint crasheaba al serializar la respuesta
    JSON. Este es exactamente el estado real del primer deploy (sin VAPID
    configurada todavia). Endpoint publico, sin auth."""
    res = client.get("/notificaciones/vapid-public-key")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data["public_key"], str)
    assert len(data["public_key"]) > 0


def test_get_vapid_keys_devuelve_strings_serializables():
    from app.services.notificaciones_push import get_vapid_keys

    public_key, private_key, claim_email = get_vapid_keys()
    assert isinstance(public_key, str) and public_key
    assert isinstance(private_key, str) and private_key
    assert isinstance(claim_email, str) and claim_email
