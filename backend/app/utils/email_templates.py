"""
Email Template System for Legal-Tech.
Provides styled HTML email templates for credentials, OTPs, tasks, finance, and consultations.
"""

def render_base_template(
    title: str,
    badge_label: str,
    content_html: str,
    footer_note: str = "This is an automated system notification from Legal-Tech. Please do not reply directly to this email."
) -> str:
    """
    Renders a unified responsive HTML wrapper with Legal-Tech branding.
    """
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F1F5F9; padding: 40px 15px; font-family: 'Inter', sans-serif;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04); border: 1px solid #E2E8F0;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding: 32px 36px; text-align: center; border-bottom: 3px solid #2563EB;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background: rgba(37, 99, 235, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 12px; padding: 10px 16px; margin-bottom: 12px;">
                      <span style="color: #60A5FA; font-weight: 800; font-size: 20px; letter-spacing: 2px; font-family: 'Orbitron', 'Space Grotesk', 'Rajdhani', sans-serif;">⚖️ LEGAL-TECH</span>
                    </div>
                    <div>
                      <span style="background: linear-gradient(90deg, #2563EB, #3B82F6); color: #FFFFFF; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; display: inline-block;">
                        {badge_label}
                      </span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 36px; color: #334155; font-size: 15px; line-height: 1.6;">
              {content_html}
            </td>
          </tr>

          <!-- Security Footer Callout -->
          <tr>
            <td style="padding: 0 36px 24px 36px;">
              <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 18px; text-align: center; color: #64748B; font-size: 12px; line-height: 1.5;">
                🛡️ <strong>Security Tip:</strong> Always check that the URL begins with your authorized Legal-Tech domain before logging in.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 24px 36px; border-top: 1px solid #F1F5F9; text-align: center; color: #64748B; font-size: 12px; line-height: 1.6;">
              <p style="margin: 0 0 6px 0;">{footer_note}</p>
              <p style="margin: 0; color: #94A3B8;">&copy; 2026 Legal-Tech Management System. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def build_credentials_email(
    name: str,
    role: str,
    login_url: str = "http://localhost:3000/login",
    email: str = "",
    password: str = ""
) -> str:
    """
    Generates a high-end email template for advocate/user credentials onboarding.
    """
    display_name = name or "User"
    role_title = role or "Advocate"
    
    content_html = f"""
    <h2 style="color: #0F172A; font-size: 22px; font-weight: 700; margin-top: 0; margin-bottom: 8px;">Welcome to Legal-Tech</h2>
    <p style="margin-top: 0; color: #64748B; font-size: 15px;">Your official account credentials have been generated.</p>
    
    <p style="margin-top: 20px;">Dear <strong>{display_name}</strong>,</p>
    <p>Your <strong>{role_title}</strong> account is ready. You now have access to the Legal-Tech practice management workspace. Below are your initial login credentials:</p>
    
    <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 24px; margin: 24px 0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td style="padding-bottom: 14px; color: #64748B; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;" width="35%">Login Portal</td>
          <td style="padding-bottom: 14px;" width="65%">
            <a href="{login_url}" target="_blank" style="color: #2563EB; font-weight: 600; text-decoration: none;">{login_url}</a>
          </td>
        </tr>
        <tr>
          <td style="padding-bottom: 14px; color: #64748B; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Username / Email</td>
          <td style="padding-bottom: 14px;">
            <code style="background: #FFFFFF; border: 1px solid #CBD5E1; color: #0F172A; padding: 4px 10px; border-radius: 6px; font-size: 14px; font-weight: 600; font-family: monospace;">{email}</code>
          </td>
        </tr>
        <tr>
          <td style="color: #64748B; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Temporary Password</td>
          <td>
            <code style="background: #EFF6FF; border: 1px solid #BFDBFE; color: #1D4ED8; padding: 6px 12px; border-radius: 6px; font-size: 15px; font-weight: 700; font-family: monospace; letter-spacing: 1px; display: inline-block;">{password}</code>
          </td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin: 32px 0 24px 0;">
      <a href="{login_url}" target="_blank" style="background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%); color: #FFFFFF; text-decoration: none; font-weight: 600; font-size: 15px; padding: 14px 32px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);">
        Log In to Legal-Tech &rarr;
      </a>
    </div>

    <div style="background-color: #FFFBEB; border-left: 4px solid #F59E0B; padding: 14px 18px; border-radius: 0 8px 8px 0; margin-top: 20px; color: #92400E; font-size: 13px; line-height: 1.5;">
      <strong>⚠️ Action Required:</strong> Please log in and immediately change your temporary password under Profile Settings.
    </div>

    <p style="margin-top: 28px; margin-bottom: 0; color: #475569;">Best regards,<br/><strong style="color: #0F172A;">The Legal-Tech Team</strong></p>
    """
    
    return render_base_template(
        title=f"Your {role_title} Credentials",
        badge_label="Account Credentials",
        content_html=content_html
    )


def build_otp_email(username: str, otp: str, expire_minutes: int = 10) -> str:
    """
    Generates a styled OTP password reset email.
    """
    content_html = f"""
    <h2 style="color: #0F172A; font-size: 22px; font-weight: 700; margin-top: 0; margin-bottom: 8px;">Password Reset Request</h2>
    <p style="margin-top: 0; color: #64748B;">Use the verification code below to complete your password reset.</p>

    <p style="margin-top: 20px;">Hi <strong>{username}</strong>,</p>
    <p>We received a request to reset your password. Your One-Time Verification Code (OTP) is:</p>

    <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
      <span style="font-family: monospace; font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #2563EB; display: inline-block; background: #EFF6FF; border: 1px solid #BFDBFE; padding: 12px 28px; border-radius: 10px;">
        {otp}
      </span>
      <p style="margin-bottom: 0; margin-top: 14px; color: #64748B; font-size: 13px;">
        This code is valid for <strong>{expire_minutes} minutes</strong>. Do not share this code with anyone.
      </p>
    </div>

    <p style="color: #64748B; font-size: 13px;">If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
    """
    return render_base_template(
        title="Password Reset Verification Code",
        badge_label="Security Code",
        content_html=content_html
    )


def build_task_assignment_email(
    senior_name: str,
    task_title: str,
    priority: str,
    due_date: str = "N/A",
    case_title: str = ""
) -> str:
    """
    Generates an email for new task assignments.
    """
    priority_color = "#DC2626" if priority.lower() == "high" else "#D97706" if priority.lower() == "medium" else "#16A34A"
    
    case_row = f"""
    <tr>
      <td style="padding-bottom: 12px; color: #64748B; font-size: 13px; font-weight: 600; text-transform: uppercase;">Linked Case</td>
      <td style="padding-bottom: 12px; color: #0F172A; font-weight: 600;">{case_title}</td>
    </tr>
    """ if case_title else ""

    content_html = f"""
    <h2 style="color: #0F172A; font-size: 22px; font-weight: 700; margin-top: 0; margin-bottom: 8px;">New Task Assigned</h2>
    <p style="margin-top: 0; color: #64748B;">You have been assigned a new task by <strong>{senior_name}</strong>.</p>

    <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 24px; margin: 24px 0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td style="padding-bottom: 12px; color: #64748B; font-size: 13px; font-weight: 600; text-transform: uppercase;" width="35%">Task Title</td>
          <td style="padding-bottom: 12px; color: #0F172A; font-weight: 700; font-size: 16px;" width="65%">{task_title}</td>
        </tr>
        <tr>
          <td style="padding-bottom: 12px; color: #64748B; font-size: 13px; font-weight: 600; text-transform: uppercase;">Priority</td>
          <td style="padding-bottom: 12px;">
            <span style="background: {priority_color}15; color: {priority_color}; border: 1px solid {priority_color}40; padding: 3px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; text-transform: uppercase;">
              {priority}
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding-bottom: 12px; color: #64748B; font-size: 13px; font-weight: 600; text-transform: uppercase;">Due Date</td>
          <td style="padding-bottom: 12px; color: #0F172A; font-weight: 600;">{due_date or 'N/A'}</td>
        </tr>
        {case_row}
      </table>
    </div>

    <div style="text-align: center; margin: 28px 0;">
      <a href="http://localhost:3000/dashboard" target="_blank" style="background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%); color: #FFFFFF; text-decoration: none; font-weight: 600; font-size: 15px; padding: 12px 28px; border-radius: 8px; display: inline-block;">
        View Task Board &rarr;
      </a>
    </div>
    """
    return render_base_template(
        title="New Task Assignment",
        badge_label="Task Assignment",
        content_html=content_html
    )


def build_task_status_email(task_title: str, changed_by: str, new_status_label: str) -> str:
    content_html = f"""
    <h2 style="color: #0F172A; font-size: 20px; font-weight: 700; margin-top: 0;">Task Status Updated</h2>
    <p><strong>{changed_by}</strong> updated the status of task <strong>"{task_title}"</strong> to:</p>
    
    <div style="text-align: center; margin: 24px 0;">
      <span style="background: #EFF6FF; border: 1px solid #BFDBFE; color: #1D4ED8; font-size: 16px; font-weight: 700; padding: 10px 24px; border-radius: 8px; display: inline-block;">
        {new_status_label}
      </span>
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="http://localhost:3000/dashboard" target="_blank" style="background: #0F172A; color: #FFFFFF; text-decoration: none; font-weight: 600; font-size: 14px; padding: 10px 22px; border-radius: 8px; display: inline-block;">
        Open Dashboard &rarr;
      </a>
    </div>
    """
    return render_base_template(
        title="Task Status Updated",
        badge_label="Task Update",
        content_html=content_html
    )


def build_task_message_email(task_title: str, sender_name: str, message_text: str) -> str:
    content_html = f"""
    <h2 style="color: #0F172A; font-size: 20px; font-weight: 700; margin-top: 0;">New Task Comment</h2>
    <p><strong>{sender_name}</strong> left a message on <strong>"{task_title}"</strong>:</p>

    <blockquote style="border-left: 4px solid #2563EB; background: #F8FAFC; margin: 20px 0; padding: 16px 20px; border-radius: 0 8px 8px 0; color: #1E293B; font-style: italic;">
      "{message_text}"
    </blockquote>

    <div style="text-align: center; margin-top: 24px;">
      <a href="http://localhost:3000/dashboard" target="_blank" style="background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%); color: #FFFFFF; text-decoration: none; font-weight: 600; font-size: 14px; padding: 10px 22px; border-radius: 8px; display: inline-block;">
        Reply on Task Board &rarr;
      </a>
    </div>
    """
    return render_base_template(
        title="New Task Comment",
        badge_label="Discussion",
        content_html=content_html
    )


def build_document_review_email(junior_name: str, doc_title: str, case_title: str, status: str, feedback: str = "") -> str:
    status_bg = "#DCFCE7" if status.lower() == "approved" else "#FEF2F2" if "reject" in status.lower() else "#FEF3C7"
    status_fg = "#166534" if status.lower() == "approved" else "#991B1B" if "reject" in status.lower() else "#92400E"

    feedback_block = f"""
    <div style="margin-top: 16px; background: #FFFFFF; border: 1px solid #E2E8F0; padding: 14px; border-radius: 8px;">
      <strong style="color: #475569; font-size: 13px;">Reviewer Feedback:</strong>
      <p style="margin: 6px 0 0 0; color: #1E293B;">{feedback}</p>
    </div>
    """ if feedback else ""

    content_html = f"""
    <h2 style="color: #0F172A; font-size: 22px; font-weight: 700; margin-top: 0;">Document Review Update</h2>
    <p>Dear <strong>{junior_name or 'Advocate'}</strong>,</p>
    <p>Your document draft <strong>"{doc_title}"</strong> for Case <strong>"{case_title}"</strong> has been reviewed.</p>

    <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <div style="margin-bottom: 12px;">
        <span style="color: #64748B; font-size: 13px; font-weight: 600;">STATUS:</span>
        <span style="background: {status_bg}; color: {status_fg}; font-weight: 700; padding: 4px 12px; border-radius: 6px; font-size: 13px; margin-left: 8px;">
          {status}
        </span>
      </div>
      {feedback_block}
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="http://localhost:3000/dashboard" target="_blank" style="background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%); color: #FFFFFF; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 8px; display: inline-block;">
        View Document Details &rarr;
      </a>
    </div>
    """
    return render_base_template(
        title="Document Review Status",
        badge_label="Document Review",
        content_html=content_html
    )


def build_payment_request_email(client_name: str, payment_url: str = "") -> str:
    content_html = f"""
    <h2 style="color: #0F172A; font-size: 22px; font-weight: 700; margin-top: 0;">Legal Fee Invoice & Payment Request</h2>
    <p>Dear <strong>{client_name or 'Valued Client'}</strong>,</p>
    <p>Please find attached your invoice for legal services rendered. You can securely make your payment online using the button below:</p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="{payment_url}" target="_blank" style="background: linear-gradient(135deg, #16A34A 0%, #15803D 100%); color: #FFFFFF; text-decoration: none; font-weight: 700; font-size: 16px; padding: 14px 32px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 12px rgba(22, 163, 74, 0.3);">
        💳 Open Secure Payment Portal &rarr;
      </a>
    </div>

    <p style="color: #64748B; font-size: 13px;">If you have any questions regarding this invoice, please do not hesitate to contact our billing team.</p>
    <p style="margin-top: 20px;">Best regards,<br/><strong>Senior Advocate Team</strong></p>
    """
    return render_base_template(
        title="Legal Fee Invoice & Payment Request",
        badge_label="Billing Notification",
        content_html=content_html
    )


def build_consultation_email(
    client_name: str,
    advocate_name: str,
    date_str: str,
    time_str: str,
    meeting_link: str,
    consultation_id: int,
    frontend_url: str = "http://localhost:3000"
) -> str:
    content_html = f"""
    <h2 style="color: #0F172A; font-size: 22px; font-weight: 700; margin-top: 0;">Legal Consultation Scheduled</h2>
    <p>Dear <strong>{client_name or 'Client'}</strong>,</p>
    <p>Advocate <strong>{advocate_name}</strong> has scheduled a legal consultation session with you.</p>

    <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 24px; margin: 24px 0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td style="padding-bottom: 12px; color: #64748B; font-size: 13px; font-weight: 600; text-transform: uppercase;" width="35%">Date & Time</td>
          <td style="padding-bottom: 12px; color: #0F172A; font-weight: 700;" width="65%">{date_str} at {time_str}</td>
        </tr>
        <tr>
          <td style="padding-bottom: 12px; color: #64748B; font-size: 13px; font-weight: 600; text-transform: uppercase;">Meeting Link</td>
          <td style="padding-bottom: 12px;">
            <a href="{meeting_link}" target="_blank" style="color: #2563EB; font-weight: 600;">{meeting_link}</a>
          </td>
        </tr>
      </table>
    </div>

    <p style="font-weight: 600; color: #0F172A;">Please confirm your availability:</p>
    <div style="margin: 20px 0; text-align: center;">
      <a href="{frontend_url}/client-action?id={consultation_id}&action=approve" target="_blank" style="background: #16A34A; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; margin-right: 10px;">
        ✓ Confirm Appointment
      </a>
      <a href="{frontend_url}/client-action?id={consultation_id}&action=reschedule" target="_blank" style="background: #D97706; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block;">
        🗓️ Request Reschedule
      </a>
    </div>
    """
    return render_base_template(
        title="Legal Consultation Scheduled",
        badge_label="Consultation",
        content_html=content_html
    )


def build_hearing_reminder_email(
    client_name: str,
    days_left: int,
    case_title: str,
    case_no: str,
    court_name: str,
    hearing_date_str: str
) -> str:
    content_html = f"""
    <h2 style="color: #0F172A; font-size: 22px; font-weight: 700; margin-top: 0;">Upcoming Court Hearing Reminder</h2>
    <p>Dear <strong>{client_name or 'Client'}</strong>,</p>
    <p>This is an automated reminder that your case has an upcoming court hearing in <strong style="color: #DC2626;">{days_left} day(s)</strong>.</p>

    <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 24px; margin: 24px 0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td style="padding-bottom: 12px; color: #64748B; font-size: 13px; font-weight: 600; text-transform: uppercase;" width="35%">Case Title</td>
          <td style="padding-bottom: 12px; color: #0F172A; font-weight: 700;" width="65%">{case_title}</td>
        </tr>
        <tr>
          <td style="padding-bottom: 12px; color: #64748B; font-size: 13px; font-weight: 600; text-transform: uppercase;">Case Number</td>
          <td style="padding-bottom: 12px; color: #0F172A; font-weight: 600;">{case_no}</td>
        </tr>
        <tr>
          <td style="padding-bottom: 12px; color: #64748B; font-size: 13px; font-weight: 600; text-transform: uppercase;">Court Name</td>
          <td style="padding-bottom: 12px; color: #0F172A; font-weight: 600;">{court_name}</td>
        </tr>
        <tr>
          <td style="color: #64748B; font-size: 13px; font-weight: 600; text-transform: uppercase;">Hearing Date</td>
          <td style="color: #DC2626; font-weight: 700; font-size: 16px;">{hearing_date_str}</td>
        </tr>
      </table>
    </div>

    <p style="color: #64748B; font-size: 13px;">Please ensure you have coordinated with your advocate beforehand and prepared all necessary documents.</p>
    """
    return render_base_template(
        title="Upcoming Court Hearing Reminder",
        badge_label="Hearing Reminder",
        content_html=content_html
    )
