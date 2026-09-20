import asyncio
import os
from dotenv import load_dotenv

# Load env variables
load_dotenv()

from app.utils.email import send_email

async def main():
    print("Attempting to send a test email...")
    try:
        await send_email(
            to_email="jemshiyajameel4@gmail.com",
            subject="SMTP Test Email",
            body="If you receive this, SMTP is working perfectly!"
        )
        print("Test email sent successfully!")
    except Exception as e:
        print("Error occurred while sending email:")
        print(type(e), e)

if __name__ == "__main__":
    asyncio.run(main())
