import logging
import os
from typing import Any

from pywebpush import webpush, WebPushException
from py_vapid import Vapid
from sqlalchemy.orm import Session

from app.models.financiero import SuscripcionPush

logger = logging.getLogger(__name__)


def _generar_vapid_keys() -> tuple[str, str]:
    v = Vapid()
    v.generate_keys()
    public_key = v.public_key.decode("utf-8") if isinstance(v.public_key, bytes) else v.public_key
    private_key = v.private_key.decode("utf-8") if isinstance(v.private_key, bytes) else v.private_key
    return public_key, private_key


def get_vapid_keys() -> tuple[str, str, str]:
    public_key = os.getenv("VAPID_PUBLIC_KEY", "")
    private_key = os.getenv("VAPID_PRIVATE_KEY", "")
    claim_email = os.getenv("VAPID_CLAIM_EMAIL", "admin@uca.edu.py")

    if not public_key or not private_key or public_key == "BP_placeholder":
        public_key, private_key = _generar_vapid_keys()
        logger.warning(
            "VAPID keys not configured — generated ephemeral keys. "
            "Set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY in .env for persistence."
        )

    return public_key, private_key, claim_email


def _subscription_dict(sub: SuscripcionPush) -> dict[str, Any]:
    return {
        "endpoint": sub.endpoint,
        "keys": {
            "p256dh": sub.p256dh,
            "auth": sub.auth,
        },
    }


def enviar_notificacion(subscription: SuscripcionPush, titulo: str, cuerpo: str, url: str = "") -> bool:
    _, private_key, claim_email = get_vapid_keys()
    sub_info = _subscription_dict(subscription)
    try:
        webpush(
            subscription_info=sub_info,
            data={
                "title": titulo,
                "body": cuerpo,
                "url": url,
            },
            vapid_private_key=private_key,
            vapid_claims={"sub": f"mailto:{claim_email}"},
        )
        return True
    except WebPushException as exc:
        logger.error("WebPush failed for %s: %s", subscription.endpoint, exc)
        return False
    except Exception as exc:
        logger.error("Unexpected error sending push to %s: %s", subscription.endpoint, exc)
        return False


def enviar_notificaciones_masivo(
    subscriptions: list[SuscripcionPush],
    titulo: str,
    cuerpo: str,
    url: str = "",
) -> tuple[int, int]:
    exitosos = 0
    fallidos = 0
    for sub in subscriptions:
        ok = enviar_notificacion(sub, titulo, cuerpo, url)
        if ok:
            exitosos += 1
        else:
            fallidos += 1
    return exitosos, fallidos
