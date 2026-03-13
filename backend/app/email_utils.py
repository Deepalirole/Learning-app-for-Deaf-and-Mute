import os
import smtplib
from email.message import EmailMessage


def send_reset_email(*, to_email: str, reset_link: str) -> None:
    gmail_user = os.getenv("GMAIL_USER")
    gmail_password = os.getenv("GMAIL_APP_PASSWORD")

    if not gmail_user or not gmail_password:
        return

    msg = EmailMessage()
    msg["Subject"] = "Reset your SignLearn password"
    msg["From"] = gmail_user
    msg["To"] = to_email
    msg.set_content(f"Click to reset your password: {reset_link}")

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(gmail_user, gmail_password)
        server.send_message(msg)
