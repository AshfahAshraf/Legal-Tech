import os
import uuid
import random
import string
import logging
from datetime import datetime, timedelta
from app.authapp.models import User
from app.database import SessionLocal

logger = logging.getLogger("google_calendar")

def generate_mock_meet_link() -> str:
    """Generate a realistic looking Google Meet link (e.g. https://meet.google.com/abc-defg-hij)"""
    part1 = ''.join(random.choices(string.ascii_lowercase, k=3))
    part2 = ''.join(random.choices(string.ascii_lowercase, k=4))
    part3 = ''.join(random.choices(string.ascii_lowercase, k=3))
    return f"https://meet.google.com/{part1}-{part2}-{part3}"

def generate_google_meet_link(client_name: str, date_str: str, time_str: str, user_id: int = None) -> str:
    """
    Attempt to connect to Google Calendar API and generate a Google Meet link.
    If credentials are not configured, fallback to generating a realistic mock link.
    """
    service_account_path = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON") or os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE")
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    
    refresh_token = None
    if user_id:
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if user and user.google_refresh_token:
                refresh_token = user.google_refresh_token
        except Exception as db_err:
            logger.warning(f"Error querying user's refresh token from db: {db_err}")
        finally:
            db.close()

    if not refresh_token:
        refresh_token = os.getenv("GOOGLE_REFRESH_TOKEN")

    if not service_account_path and not (client_id and client_secret and refresh_token):
        logger.info("Google Calendar credentials not configured in environment. Using mock fallback.")
        return generate_mock_meet_link()

    try:
        from google.oauth2 import service_account
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build

        SCOPES = ['https://www.googleapis.com/auth/calendar']
        creds = None

        if service_account_path and os.path.exists(service_account_path):
            creds = service_account.Credentials.from_service_account_file(
                service_account_path, scopes=SCOPES
            )
        elif client_id and client_secret and refresh_token:
            creds = Credentials(
                token=None,
                refresh_token=refresh_token,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=client_id,
                client_secret=client_secret,
                scopes=SCOPES
            )

        if not creds:
            logger.warning("Failed to initialize Google credentials. Falling back to mock link.")
            return generate_mock_meet_link()

        # Build service
        calendar_service = build('calendar', 'v3', credentials=creds)

        # Parse date and time
        # E.g. date_str="2026-07-23", time_str="6:00 PM"
        try:
            dt_str = f"{date_str} {time_str}"
            start_dt = datetime.strptime(dt_str, "%Y-%m-%d %I:%M %p")
        except Exception as parse_err:
            logger.warning(f"Error parsing date/time ({date_str} {time_str}): {parse_err}. Using current time.")
            start_dt = datetime.utcnow() + timedelta(hours=1)

        end_dt = start_dt + timedelta(minutes=30)

        # Event body with conference data (Google Meet)
        event_body = {
            'summary': f'Legal Consultation: {client_name}',
            'description': 'Scheduled Consultation via LegalTech platform.',
            'start': {
                'dateTime': start_dt.isoformat() + 'Z',
                'timeZone': 'UTC',
            },
            'end': {
                'dateTime': end_dt.isoformat() + 'Z',
                'timeZone': 'UTC',
            },
            'conferenceData': {
                'createRequest': {
                    'requestId': f"meet-{uuid.uuid4().hex}",
                    'conferenceSolutionKey': {
                        'type': 'hangoutsMeet'
                    }
                }
            }
        }

        # Insert event to primary calendar (or service account's calendar)
        event = calendar_service.events().insert(
            calendarId='primary',
            body=event_body,
            conferenceDataVersion=1
        ).execute()

        meet_link = event.get('hangoutLink')
        if meet_link:
            return meet_link
        
        logger.warning("Event created successfully, but hangoutLink was not found. Returning mock fallback.")
        return generate_mock_meet_link()

    except Exception as e:
        logger.exception(f"Error connecting to Google Calendar API: {e}. Falling back to mock link.")
        return generate_mock_meet_link()
