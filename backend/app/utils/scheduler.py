import asyncio
from datetime import datetime
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from app.database import SessionLocal
from app.advocate.case_management.models import Case
from app.utils.email import send_email

# Configure logging
logger = logging.getLogger("app.scheduler")

scheduler = BackgroundScheduler()


def check_hearing_reminders():
    logger.info("Running scheduled hearing reminders check...")
    db = SessionLocal()
    today = datetime.now().date()

    try:
        cases = db.query(Case).all()
    except Exception as e:
        logger.error(f"Error fetching cases from database: {e}")
        db.close()
        return

    for case in cases:
        if not case.next_hearing_date:
            continue

        try:
            # Clean date string and split in case time is appended
            date_str = case.next_hearing_date.strip().split()[0].split('T')[0]
            if not date_str:
                continue

            hearing_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            days_left = (hearing_date - today).days

            # Send reminders exactly 5, 2, or 1 day before the hearing
            if days_left in [5, 2, 1]:
                subject = f"🔔 Hearing Reminder: {case.case_title}"
                from app.utils.email_templates import build_hearing_reminder_email
                body = build_hearing_reminder_email(
                    client_name=case.client_name or "Client",
                    days_left=days_left,
                    case_title=case.case_title,
                    case_no=case.case_no,
                    court_name=case.court_name,
                    hearing_date_str=hearing_date.strftime("%B %d, %Y")
                )

                # Send client email
                if case.email_id:
                    try:
                        logger.info(f"Sending hearing reminder to client {case.email_id} for case: {case.case_title}")
                        asyncio.run(send_email(case.email_id, subject, body))
                        logger.info(f"Hearing reminder email successfully sent to client: {case.email_id}")
                    except Exception as email_err:
                        logger.error(f"Failed to send email to client {case.email_id}: {email_err}")

                # Send junior advocate email
                if hasattr(case, "junior_advocate_email") and case.junior_advocate_email:
                    try:
                        logger.info(f"Sending hearing reminder to junior advocate {case.junior_advocate_email} for case: {case.case_title}")
                        asyncio.run(send_email(case.junior_advocate_email, subject, body))
                        logger.info(f"Hearing reminder email successfully sent to junior advocate: {case.junior_advocate_email}")
                    except Exception as email_err:
                        logger.error(f"Failed to send email to junior advocate {case.junior_advocate_email}: {email_err}")

        except ValueError as parse_err:
            logger.warning(f"Could not parse next_hearing_date '{case.next_hearing_date}' for case ID {case.id}: {parse_err}")
        except Exception as case_err:
            logger.error(f"Error processing case ID {case.id}: {case_err}")

    db.close()


def start_scheduler():
    # Runs the check_hearing_reminders job immediately once, then schedules it daily
    scheduler.add_job(check_hearing_reminders, "interval", days=1)
    scheduler.start()
    logger.info("Hearing reminder scheduler started successfully.")