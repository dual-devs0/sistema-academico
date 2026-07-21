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
) -> None:
    if not _credentials_configured():
        print(f"Mock Email sent to {email_to}: Password was reset by admin")
        return

    html = f"""
    <h3>Hola {user_name},</h3>
    <p>Un administrador ha restablecido tu contraseña en el Sistema Académico UCA.</p>
    <p>Usá la opción <b>"Recuperar contraseña"</b> en la pantalla de inicio de sesión para establecer una nueva.</p>
    <p>Si no solicitaste este cambio, contactá al administrador del sistema.</p>
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


def send_alerta_inasistencia_email_bg(
    background_tasks: BackgroundTasks,
    emails_to: list[str],
    alumno_nombre: str,
    materia_nombre: str,
    porcentaje: float,
) -> None:
    if not emails_to:
        return
    if not _credentials_configured():
        print(
            f"Mock Email sent to {emails_to}: Alerta inasistencia {alumno_nombre} "
            f"en {materia_nombre} ({porcentaje}%)"
        )
        return

    html = f"""
    <h3>Alerta de inasistencia crítica</h3>
    <p>El alumno <b>{alumno_nombre}</b> superó el 25% de faltas en
    <b>{materia_nombre}</b>.</p>
    <p>Porcentaje de inasistencia actual: <b>{porcentaje}%</b></p>
    <p>Según reglamento, esto puede implicar pérdida de regularidad en la materia.</p>
    """
    message = MessageSchema(
        subject=f"UCA - Alerta de inasistencia crítica en {materia_nombre}",
        recipients=emails_to,
        body=html,
        subtype=MessageType.html,
    )
    background_tasks.add_task(_send_with_retry, message)
