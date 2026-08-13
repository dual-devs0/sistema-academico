"""Proveedor de email para producción — Resend (predeterminado), SendGrid o
SMTP, intercambiables por configuración (EMAIL_PROVIDER). Modo "mock" (log)
cuando no hay credenciales configuradas — nunca lanza excepciones hacia el
caller: un email fallido se registra y degrada con gracia (el flujo del
usuario nunca se rompe por un proveedor caído).

Variables de entorno:
  EMAIL_PROVIDER         auto|mock|resend|sendgrid|smtp  (default: auto)
  RESEND_API_KEY         clave de API de Resend
  SENDGRID_API_KEY       clave de API de SendGrid
  SMTP_HOST               host SMTP (default smtp.gmail.com)
  SMTP_PORT               puerto SMTP (default 587)
  SMTP_USER               usuario SMTP
  SMTP_PASSWORD           contraseña SMTP
  EMAIL_FROM              remitente (default sistema@uca.edu.py)
  EMAIL_FROM_NAME         nombre visible del remitente (default Sistema Académico UCA)
  EMAIL_MAX_ATTEMPTS      reintentos por envío (default 3)
  EMAIL_MOCK              "true" fuerza modo mock (útil en dev/test)

Depende de: httpx, fastapi-mail (solo para el backend SMTP). Usado por:
app/email_utils.py y, en el futuro, cualquier otro envío transaccional.
"""
import asyncio
import logging
import os

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

EMAIL_PROVIDER = os.getenv("EMAIL_PROVIDER", "auto").strip().lower()
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "").strip()
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY", "").strip()
SMTP_USER = os.getenv("SMTP_USER", "") or os.getenv("MAIL_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "") or os.getenv("MAIL_PASSWORD", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", "") or os.getenv("MAIL_FROM", "sistema@uca.edu.py")
EMAIL_FROM_NAME = os.getenv("EMAIL_FROM_NAME", "Sistema Académico UCA")
EMAIL_MAX_ATTEMPTS = int(os.getenv("EMAIL_MAX_ATTEMPTS", "3"))
FORCE_MOCK = os.getenv("EMAIL_MOCK", "").strip().lower() in ("1", "true", "yes")


def _resolve_provider() -> str:
    """Auto-detección: Resend > SendGrid > SMTP > mock."""
    if EMAIL_PROVIDER != "auto":
        return EMAIL_PROVIDER
    if RESEND_API_KEY:
        return "resend"
    if SENDGRID_API_KEY:
        return "sendgrid"
    if SMTP_USER and SMTP_PASSWORD:
        return "smtp"
    return "mock"


ACTIVE_PROVIDER = "mock" if FORCE_MOCK else _resolve_provider()

# Cliente HTTP compartido por los proveedores HTTP (Resend/SendGrid).
_http_client: "httpx.AsyncClient | None" = None
_http_client_lock = asyncio.Lock()


async def _get_client() -> "httpx.AsyncClient":
    global _http_client
    if _http_client is None:
        async with _http_client_lock:
            if _http_client is None:
                import httpx

                _http_client = httpx.AsyncClient(timeout=30.0)
    return _http_client


async def _send_via_resend(to: str, subject: str, html: str) -> None:
    client = await _get_client()
    resp = await client.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "from": f"{EMAIL_FROM_NAME} <{EMAIL_FROM}>",
            "to": [to],
            "subject": subject,
            "html": html,
        },
    )
    if resp.status_code >= 400:
        raise RuntimeError(f"Resend API error {resp.status_code}: {resp.text[:300]}")


async def _send_via_sendgrid(to: str, subject: str, html: str) -> None:
    client = await _get_client()
    resp = await client.post(
        "https://api.sendgrid.com/v3/mail/send",
        headers={
            "Authorization": f"Bearer {SENDGRID_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "personalizations": [{"to": [{"email": to}]}],
            "from": {"email": EMAIL_FROM, "name": EMAIL_FROM_NAME},
            "subject": subject,
            "content": [{"type": "text/html", "value": html}],
        },
    )
    if resp.status_code >= 400:
        raise RuntimeError(f"SendGrid API error {resp.status_code}: {resp.text[:300]}")


async def _send_via_smtp(to: str, subject: str, html: str) -> None:
    """Backend SMTP vía fastapi-mail (misma config que email_utils)."""
    from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType, NameEmail
    from pydantic import SecretStr

    conf = ConnectionConfig(
        MAIL_USERNAME=SMTP_USER,
        MAIL_PASSWORD=SecretStr(SMTP_PASSWORD),
        MAIL_FROM=EMAIL_FROM,
        MAIL_PORT=int(os.getenv("SMTP_PORT", os.getenv("MAIL_PORT", "587"))),
        MAIL_SERVER=os.getenv("SMTP_HOST", os.getenv("MAIL_SERVER", "smtp.gmail.com")),
        MAIL_STARTTLS=os.getenv("MAIL_STARTTLS", "True").lower() in ("true", "1", "yes"),
        MAIL_SSL_TLS=os.getenv("MAIL_SSL_TLS", "False").lower() in ("true", "1", "yes"),
        USE_CREDENTIALS=os.getenv("USE_CREDENTIALS", "True").lower() in ("true", "1", "yes"),
        VALIDATE_CERTS=os.getenv("VALIDATE_CERTS", "True").lower() in ("true", "1", "yes"),
    )
    fm = FastMail(conf)
    message = MessageSchema(
        subject=subject,
        recipients=[NameEmail(name="", email=to)],
        body=html,
        subtype=MessageType.html,
    )
    await fm.send_message(message)


async def _send_once(to: str, subject: str, html: str) -> None:
    if ACTIVE_PROVIDER == "resend":
        await _send_via_resend(to, subject, html)
    elif ACTIVE_PROVIDER == "sendgrid":
        await _send_via_sendgrid(to, subject, html)
    elif ACTIVE_PROVIDER == "smtp":
        await _send_via_smtp(to, subject, html)
    else:
        logger.info(
            "Mock Email sent to %s | subject=%s | provider=%s",
            to, subject, ACTIVE_PROVIDER,
        )


async def send_email(to: str, subject: str, html: str) -> None:
    """Envía un email con reintentos y backoff. NUNCA lanza: un fallo se
    registra y el flujo de negocio sigue (degradación elegante)."""
    for attempt in range(1, EMAIL_MAX_ATTEMPTS + 1):
        try:
            await _send_once(to, subject, html)
            return
        except Exception as exc:  # noqa: BLE001 — degradar siempre
            if attempt < EMAIL_MAX_ATTEMPTS:
                wait = 2 ** (attempt - 1)
                logger.warning(
                    "Email send failed (attempt %d/%d, provider=%s): %s. Retrying in %ds…",
                    attempt, EMAIL_MAX_ATTEMPTS, ACTIVE_PROVIDER, exc, wait,
                )
                await asyncio.sleep(wait)
            else:
                logger.error(
                    "Email send failed after %d attempts (provider=%s): %s",
                    EMAIL_MAX_ATTEMPTS, ACTIVE_PROVIDER, exc,
                )


def provider_setting() -> dict:
    """Estado actual del provider (para logs/healthchecks)."""
    return {
        "provider": ACTIVE_PROVIDER,
        "from": EMAIL_FROM,
        "mock": ACTIVE_PROVIDER == "mock",
    }