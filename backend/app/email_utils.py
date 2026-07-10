import asyncio
import logging
import os

from dotenv import load_dotenv
from fastapi import BackgroundTasks
from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType

load_dotenv()

logger = logging.getLogger(__name__)

conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME", "dummy@example.com"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD", "dummy"),
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


def send_password_reset_email_bg(
    background_tasks: BackgroundTasks,
    email_to: str,
    user_name: str,
    new_password: str,
) -> None:
    if not _credentials_configured():
        print(f"Mock Email sent to {email_to}: Password reset to {new_password}")
        return

    html = f"""
    <h3>Hola {user_name},</h3>
    <p>Tu contraseña ha sido restablecida.</p>
    <p>Nueva contraseña temporal: <b>{new_password}</b></p>
    <p>Por favor, cámbiala lo antes posible.</p>
    """
    message = MessageSchema(
        subject="UCA - Restablecimiento de contraseña",
        recipients=[email_to],
        body=html,
        subtype=MessageType.html,
    )
    background_tasks.add_task(_send_with_retry, message)


def send_new_grade_email_bg(
    background_tasks: BackgroundTasks,
    email_to: str,
    user_name: str,
    materia_name: str,
    tipo_nota: str,
    valor_nota: float,
) -> None:
    if not _credentials_configured():
        print(
            f"Mock Email sent to {email_to}: Grade {valor_nota} in {materia_name} ({tipo_nota})"  # noqa: E501
        )
        return

    html = f"""
    <h3>Hola {user_name},</h3>
    <p>Se ha cargado una nueva nota en <b>{materia_name}</b>.</p>
    <p>Tipo de evaluación: {tipo_nota}</p>
    <p>Calificación: <b>{valor_nota}</b></p>
    """
    message = MessageSchema(
        subject=f"UCA - Nueva calificación en {materia_name}",
        recipients=[email_to],
        body=html,
        subtype=MessageType.html,
    )
    background_tasks.add_task(_send_with_retry, message)
