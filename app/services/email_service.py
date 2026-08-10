"""Transactional email delivery for passwordless authentication.

SMTP keeps the application provider-neutral: Resend, Brevo, Mailgun and a
company mailbox can all be used by supplying their SMTP credentials.
"""

import os
import smtplib
from email.message import EmailMessage


class EmailDeliveryError(Exception):
    """Raised when the configured provider cannot accept a transactional email."""


def send_login_code(recipient: str, code: str) -> None:
    host = os.environ.get("SMTP_HOST")
    sender = os.environ.get("EMAIL_FROM")
    if not host or not sender:
        raise EmailDeliveryError("El servicio de email no esta configurado")

    message = EmailMessage()
    message["Subject"] = f"{code} es tu codigo para SplitWise"
    message["From"] = sender
    message["To"] = recipient
    message.set_content(
        f"Tu codigo para ingresar a SplitWise es: {code}\n\n"
        "Vence en 10 minutos. Si no solicitaste este codigo, podes ignorar este email."
    )

    port = int(os.environ.get("SMTP_PORT", "587"))
    username = os.environ.get("SMTP_USERNAME")
    password = os.environ.get("SMTP_PASSWORD")
    use_tls = os.environ.get("SMTP_USE_TLS", "true").lower() != "false"

    try:
        with smtplib.SMTP(host, port, timeout=15) as smtp:
            if use_tls:
                smtp.starttls()
            if username and password:
                smtp.login(username, password)
            smtp.send_message(message)
    except (OSError, smtplib.SMTPException) as exc:
        raise EmailDeliveryError("No se pudo enviar el email de acceso") from exc
