import logging
import os
from decimal import Decimal
from typing import Optional

import stripe

logger = logging.getLogger(__name__)


def init_stripe() -> None:
    api_key = os.getenv("STRIPE_SECRET_KEY")
    if api_key and api_key != "sk_test_placeholder":
        stripe.api_key = api_key
        logger.info("Stripe inicializado correctamente")
    else:
        logger.warning("STRIPE_SECRET_KEY no configurada — Stripe no disponible")


def crear_checkout_session(
    cuota_id: int,
    monto: Decimal,
    alumno_email: str,
    success_url: str,
    cancel_url: str,
    metadata: Optional[dict] = None,
) -> stripe.checkout.Session:
    if not stripe.api_key:
        raise RuntimeError("Stripe no está configurado")

    _metadata = {"cuota_id": str(cuota_id)}
    if metadata:
        _metadata.update(metadata)

    session = stripe.checkout.Session.create(
        mode="payment",
        client_reference_id=str(cuota_id),
        customer_email=alumno_email,
        line_items=[
            {
                "price_data": {
                    "currency": "pyg",
                    "product_data": {
                        "name": f"Cuota #{cuota_id} — Sistema Académico UCA",
                    },
                    "unit_amount": int(monto * Decimal("100")),
                },
                "quantity": 1,
            }
        ],
        metadata=_metadata,
        success_url=success_url,
        cancel_url=cancel_url,
    )
    return session


def confirmar_pago_webhook(
    payload: bytes, sig_header: str
) -> stripe.Event:
    endpoint_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    if not endpoint_secret or endpoint_secret == "whsec_placeholder":
        logger.warning("STRIPE_WEBHOOK_SECRET no configurada — saltando verificación")
        event = stripe.Event.construct_from(
            stripe.util.json.loads(payload), stripe.api_key
        )
    else:
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
    return event
