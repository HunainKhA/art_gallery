from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from email_service import send_gallery_email
from datetime import datetime

router = APIRouter(prefix="/api/contact", tags=["Contact"])

class ContactMessageRequest(BaseModel):
    name: str
    email: str
    message: str
    phone: str = None

@router.post("")
@router.post("/")
def submit_contact_message(data: ContactMessageRequest):
    name = data.name.strip()
    email = data.email.strip()
    message = data.message.strip()
    phone = (data.phone or "").strip()

    if not name or not email or not message:
        raise HTTPException(status_code=400, detail="Name, email, and message are required.")

    subject = f"Website Contact Inquiry: {name}"

    text_body = f"""New Message Received from Mainframe The Gallery Website Contact Form:

Sender Name: {name}
Sender Email: {email}
Sender Phone: {phone or 'Not Provided'}

Message / Inquiry:
------------------
{message}

Submitted at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""

    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; border-bottom: 2px solid #d4af37; padding-bottom: 15px; margin-bottom: 20px;">
            <h2 style="color: #1a202c; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 1px;">MAINFRAME THE GALLERY</h2>
            <p style="color: #d4af37; margin: 5px 0 0 0; font-size: 13px; font-weight: 600; text-transform: uppercase;">Website Contact Us Message</p>
        </div>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <h3 style="color: #1e293b; margin-top: 0; margin-bottom: 10px; font-size: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">Sender Information</h3>
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                <tr><td style="padding: 6px 0; color: #64748b; width: 100px;">Name:</td><td style="padding: 6px 0; font-weight: 600; color: #1e293b;">{name}</td></tr>
                <tr><td style="padding: 6px 0; color: #64748b;">Email:</td><td style="padding: 6px 0; font-weight: 600; color: #2563eb;"><a href="mailto:{email}" style="color: #2563eb; text-decoration: none;">{email}</a></td></tr>
                <tr><td style="padding: 6px 0; color: #64748b;">Phone:</td><td style="padding: 6px 0; color: #1e293b;">{phone or 'N/A'}</td></tr>
            </table>
        </div>

        <div style="background-color: #fefce8; border: 1px solid #fef08a; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <h3 style="color: #854d0e; margin-top: 0; margin-bottom: 8px; font-size: 14px;">Message:</h3>
            <p style="margin: 0; font-size: 14px; color: #713f12; line-height: 1.5; white-space: pre-wrap;">{message}</p>
        </div>

        <div style="text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px;">
            This message was submitted via the Contact Us form on <a href="https://mainframethegallery.com" style="color: #d4af37; text-decoration: none;">mainframethegallery.com</a>.
        </div>
    </div>
    """

    res = send_gallery_email(subject=subject, text_body=text_body, html_body=html_body, reply_to=email)
    
    return {
        "success": True,
        "email_sent": res.get("success", False),
        "email_error": res.get("error"),
        "message": "Thank you! Your message has been sent to our gallery team."
    }
