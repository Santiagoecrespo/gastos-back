"""Transactional emails for JuntaCuentas."""

import os
import smtplib
from email.message import EmailMessage


class EmailDeliveryError(Exception):
    """Raised when the configured provider cannot accept a transactional email."""


def _send(recipient: str, subject: str, content: str) -> None:
    host = os.environ.get("SMTP_HOST")
    sender = os.environ.get("EMAIL_FROM")
    if not host or not sender:
        raise EmailDeliveryError("El servicio de email no esta configurado")

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = sender
    message["To"] = recipient
    message.set_content(content)

    port = int(os.environ.get("SMTP_PORT", "587"))
    username = os.environ.get("SMTP_USERNAME")
    password = os.environ.get("SMTP_PASSWORD")
    use_tls = os.environ.get("SMTP_USE_TLS", "true").lower() != "false"
    use_ssl = os.environ.get("SMTP_USE_SSL", "false").lower() == "true"

    try:
        client_class = smtplib.SMTP_SSL if use_ssl else smtplib.SMTP
        with client_class(host, port, timeout=15) as smtp:
            if use_tls and not use_ssl:
                smtp.starttls()
            if username and password:
                smtp.login(username, password)
            smtp.send_message(message)
    except (OSError, smtplib.SMTPException) as exc:
        raise EmailDeliveryError("No se pudo enviar el email") from exc


def send_login_notification(recipient: str) -> None:
    """Notify the account owner after a successful password login."""
    _send(
        recipient,
        "Nuevo ingreso a JuntaCuentas",
        "Hola, detectamos un nuevo ingreso a tu cuenta de JuntaCuentas.\n\n"
        "Si fuiste vos, no tenes que hacer nada. Si no reconoces este acceso, cambia tu contrasena.",
    )
