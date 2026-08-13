"""Envío de emails transaccionales (background tasks).

Compatibilidad: mantiene las firmas públicas existentes (send_*_email_bg) —
los tests de test_email.py y los routers dependen de ellas. Internamente
delega en app/email_provider.py según EMAIL_PROVIDER:

- mock          → solo log (default sin credenciales, y en dev/test)
- resend        → API de Resend (prioridad 1)
- sendgrid      → API de SendGrid (prioridad 2)
- smtp          → fastapi-mail (prioridad 3, config MAIL_*/SMTP_*)

El flujo SMTP legado (fm + _send_with_retry) se conserva intacto para no
cambiar el comportamiento de test_email.py.
"""
import asyncio
import logging
import os

from dotenv import load_dotenv
from fastapi import BackgroundTasks
from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType, NameEmail
from pydantic import SecretStr

from app.email_provider import (
    ACTIVE_PROVIDER,
    EMAIL_FROM,
    EMAIL_FROM_NAME,
    send_email,
)
from app.email_templates import (
    render_admin_password_reset_email,
    render_alerta_inasistencia_email,
    render_new_grade_email,
    render_reset_password_email,
    render_welcome_email,
)

load_dotenv()

logger = logging.getLogger(__name__)

conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME", "dummy@example.com"),
    MAIL_PASSWORD=SecretStr(os.getenv("MAIL_PASSWORD", "dummy")),
    MAIL_FROM=os.getenv("MAIL_FROM", "sistema@uca.edu.py"),
    MAIL_PORT=int(os.getenv("MAIL_PORT", "587")),
    MAIL_SERVER=os.getenv("MAIL_SERVER", "smtp.gmail.com"),
    MAIL_STARTTLS=os.getenv("MAIL_STARTTLS", "True").lower() in ("true", "1", "yes"),
    MAIL_SSL_TLS=os.getenv("MAIL_SSL_TLS", "False").lower() in ("true", "1", "yes"),
    USE_CREDENTIALS=os.getenv("USE_CREDENTIALS", "True").lower()
    in ("true", "1", "yes"),
    VALIDATE_CERTS=os.getenv("VALIDATE_CERTS", "True").lower() in ("true", "1", "yes"),
)

fm = FastMail(conf)

RESET_TOKEN_EXPIRATION_MINUTES = int(os.getenv("RESET_TOKEN_EXPIRATION_MINUTES", "60"))


def _credentials_configured() -> bool:
    pw = os.getenv("MAIL_PASSWORD", "")
    return bool(pw) and pw != "dummy"


async def _send_with_retry(
    message: MessageSchema, max_attempts: int = 3, backoff_base: int = 2
) -> None:
    for attempt in range(max_attempts):
        try:
            await fm.send_message(message)
            return
        except Exception as exc:
            if attempt < max_attempts - 1:
                wait = backoff_base**attempt
                logger.warning(
                    "Email send failed (attempt %d/%d): %s. Retrying in %ds…",
                    attempt + 1,
                    max_attempts,
                    exc,
                    wait,
                )
                await asyncio.sleep(wait)
            else:
                logger.error(
                    "Email send failed after %d attempts: %s", max_attempts, exc
                )


def _is_smtp_or_mock() -> bool:
    """True cuando el flujo SMTP legado aplica (o mock sin credenciales)."""
    return ACTIVE_PROVIDER in ("smtp", "mock")


def _queue_smtp(
    background_tasks: BackgroundTasks,
    subject: str,
    email_to: str,
    html: str,
) -> None:
    message = MessageSchema(
        subject=subject,
        recipients=[NameEmail(name=EMAIL_FROM_NAME, email=email_to)],
        body=html,
        subtype=MessageType.html,
    )
    background_tasks.add_task(_send_with_retry, message)


def _mock_or_smtp(
    background_tasks: BackgroundTasks,
    email_to: str,
    subject: str,
    html: str,
) -> bool:
    """Maneja los casos mock/smtp. Retorna True si se resolvió (no continuar)."""
    if _is_smtp_or_mock() and not _credentials_configured():
        logger.info("Mock Email sent to %s: %s | %s", email_to, subject, html)
        return True
    if _is_smtp_or_mock():
        _queue_smtp(background_tasks, subject, email_to, html)
        return True
    return False


RESET_PASSWORD_FRONTEND_URL = os.getenv(
    "RESET_PASSWORD_FRONTEND_URL",
    os.getenv(
        "FRONTEND_URL",
        "https://sistema.uca.edu.py/reset-password",
    ),
)


def _reset_link(token: str) -> str:
    return f"{RESET_PASSWORD_FRONTEND_URL}?token={token}"


def send_password_reset_email_bg(
    background_tasks: BackgroundTasks,
    email_to: str,
    user_name: str,
) -> None:
    subject = "UCA - Restablecimiento de contraseña"
    html = render_admin_password_reset_email(user_name)
    if _mock_or_smtp(background_tasks, email_to, subject, html):
        return
    background_tasks.add_task(send_email, email_to, subject, html)


def send_reset_link_email_bg(
    background_tasks: BackgroundTasks,
    email_to: str,
    user_name: str,
    token: str,
) -> None:
    subject = "UCA - Restablecimiento de contraseña"
    if _mock_or_smtp(
        background_tasks,
        email_to,
        subject,
        render_reset_password_email(
            user_name, _reset_link(token), RESET_TOKEN_EXPIRATION_MINUTES
        ),
    ):
        return
    background_tasks.add_task(
        send_email,
        email_to,
        subject,
        render_reset_password_email(
            user_name, _reset_link(token), RESET_TOKEN_EXPIRATION_MINUTES
        ),
    )


def send_welcome_email_bg(
    background_tasks: BackgroundTasks,
    email_to: str,
    user_name: str,
) -> None:
    subject = "UCA - Bienvenido al Sistema Académico"
    html = render_welcome_email(user_name)
    if _mock_or_smtp(background_tasks, email_to, subject, html):
        return
    background_tasks.add_task(send_email, email_to, subject, html)


def send_new_grade_email_bg(
    background_tasks: BackgroundTasks,
    email_to: str,
    user_name: str,
    materia_name: str,
    tipo_nota: str,
    valor_nota: float,
) -> None:
    subject = f"UCA - Nueva calificación en {materia_name}"
    if _mock_or_smtp(
        background_tasks,
        email_to,
        subject,
        render_new_grade_email(user_name, materia_name, tipo_nota, valor_nota),
    ):
        return
    background_tasks.add_task(
        send_email,
        email_to,
        subject,
        render_new_grade_email(user_name, materia_name, tipo_nota, valor_nota),
    )


def send_alerta_inasistencia_email_bg(
    background_tasks: BackgroundTasks,
    emails_to: list[str],
    alumno_nombre: str,
    materia_nombre: str,
    porcentaje: float,
) -> None:
    if not emails_to:
        return
    subject = f"UCA - Alerta de inasistencia crítica en {materia_nombre}"
    html = render_alerta_inasistencia_email(alumno_nombre, materia_nombre, porcentaje)
    if _is_smtp_or_mock():
        if not _credentials_configured():
            logger.info(
                "Mock Email sent to %s: Alerta inasistencia %s en %s (%.1f%%)",
                emails_to, alumno_nombre, materia_nombre, porcentaje,
            )
            return
        message = MessageSchema(
            subject=subject,
            recipients=[NameEmail(name="", email=e) for e in emails_to],
            body=html,
            subtype=MessageType.html,
        )
        background_tasks.add_task(_send_with_retry, message)
        return
    for e in emails_to:
        background_tasks.add_task(send_email, e, subject, html)