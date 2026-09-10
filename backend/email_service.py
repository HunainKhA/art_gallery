import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.header import Header
from config import Config

def send_gallery_email(subject: str, text_body: str, html_body: str, reply_to: str = None) -> dict:
    """
    Sends an email using configured SMTP settings (Gmail or Hostinger/Custom).
    Returns dict with { success: bool, error: str|None }.
    """
    to_email = Config.INQUIRY_RECIPIENT_EMAIL or "mainframethegallery@gmail.com"
    from_email = Config.SMTP_FROM_EMAIL or Config.SMTP_USER or "mainframethegallery@gmail.com"

    msg = MIMEMultipart("alternative")
    msg['Subject'] = Header(subject, 'utf-8')
    msg['From'] = from_email
    msg['To'] = to_email
    if reply_to:
        msg['Reply-To'] = reply_to

    msg.attach(MIMEText(text_body, 'plain', 'utf-8'))
    msg.attach(MIMEText(html_body, 'html', 'utf-8'))

    # Check if SMTP password is provided
    if not Config.SMTP_PASSWORD or not Config.SMTP_PASSWORD.strip():
        err_msg = "SMTP_PASSWORD is empty in backend .env! Gmail requires a 16-character Google App Password."
        print(f"[EMAIL ERROR]: {err_msg}")
        return {"success": False, "error": err_msg}

    try:
        if Config.SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(Config.SMTP_HOST, Config.SMTP_PORT, timeout=12)
        else:
            server = smtplib.SMTP(Config.SMTP_HOST, Config.SMTP_PORT, timeout=12)
            if Config.SMTP_USE_TLS:
                server.starttls()
        
        server.login(Config.SMTP_USER, Config.SMTP_PASSWORD.strip())
        server.sendmail(from_email, [to_email], msg.as_string())
        server.quit()
        print(f"[EMAIL SUCCESS]: Email sent to {to_email} via {Config.SMTP_HOST}")
        return {"success": True, "error": None}
    except Exception as e:
        err_str = str(e)
        print(f"[EMAIL SMTP ERROR]: Failed to send via {Config.SMTP_HOST}: {err_str}")
        return {"success": False, "error": err_str}
