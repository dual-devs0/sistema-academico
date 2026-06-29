import os
from fastapi import BackgroundTasks
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from dotenv import load_dotenv

load_dotenv()

conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME", "dummy@example.com"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD", "dummy"),
    MAIL_FROM=os.getenv("MAIL_FROM", "sistema@uca.edu.py"),
    MAIL_PORT=int(os.getenv("MAIL_PORT", "587")),
    MAIL_SERVER=os.getenv("MAIL_SERVER", "smtp.gmail.com"),
    MAIL_STARTTLS=os.getenv("MAIL_STARTTLS", "True").lower() in ("true", "1", "yes"),
    MAIL_SSL_TLS=os.getenv("MAIL_SSL_TLS", "False").lower() in ("true", "1", "yes"),
    USE_CREDENTIALS=os.getenv("USE_CREDENTIALS", "True").lower() in ("true", "1", "yes"),
    VALIDATE_CERTS=os.getenv("VALIDATE_CERTS", "True").lower() in ("true", "1", "yes"),
)

fm = FastMail(conf)

def send_password_reset_email_bg(background_tasks: BackgroundTasks, email_to: str, user_name: str, new_password: str):
    if not os.getenv("MAIL_PASSWORD") or os.getenv("MAIL_PASSWORD") == "dummy":
        print(f"Mock Email sent to {email_to}: Password reset to {new_password}")
        return

    html = f"""
    <h3>Hola {user_name},</h3>
    <p>Tu contraseña ha sido restablecida por un administrador.</p>
    <p>Nueva contraseña: <b>{new_password}</b></p>
    <p>Por favor, cámbiala lo antes posible.</p>
    """
    message = MessageSchema(
        subject="UCA - Restablecimiento de contraseña",
        recipients=[email_to],
        body=html,
        subtype=MessageType.html
    )
    background_tasks.add_task(fm.send_message, message)

def send_new_grade_email_bg(background_tasks: BackgroundTasks, email_to: str, user_name: str, materia_name: str, tipo_nota: str, valor_nota: float):
    if not os.getenv("MAIL_PASSWORD") or os.getenv("MAIL_PASSWORD") == "dummy":
        print(f"Mock Email sent to {email_to}: Grade {valor_nota} in {materia_name} ({tipo_nota})")
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
        subtype=MessageType.html
    )
    background_tasks.add_task(fm.send_message, message)
