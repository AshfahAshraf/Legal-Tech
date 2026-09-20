from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from dotenv import load_dotenv
import os

load_dotenv()

conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
    MAIL_FROM=os.getenv("MAIL_FROM"),
    MAIL_PORT=int(os.getenv("MAIL_PORT")),
    MAIL_SERVER=os.getenv("MAIL_SERVER"),
    MAIL_FROM_NAME=os.getenv("MAIL_FROM_NAME"),
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True
)

async def send_email(
    to_email: str,
    subject: str,
    body: str,
    attachment_path: str = None
):
    attachments = []

    if attachment_path and os.path.exists(attachment_path):
            attachments.append(attachment_path)

    message = MessageSchema(
        subject=subject,
        recipients=[to_email],
        body=body,
        subtype="html",
        attachments=attachments
    )

    fm = FastMail(conf)
    await fm.send_message(message)