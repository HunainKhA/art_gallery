import random
import uuid
import re
import urllib.parse
from typing import Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from database import execute_query

router = APIRouter(prefix="/api/guest", tags=["Guest Auth"])

# Request Validation Models
class GuestRegister(BaseModel):
    email: str
    phone: str

class GuestVerifySimulate(BaseModel):
    code: str

class GuestVerifyOtp(BaseModel):
    otp: str

class GuestLogin(BaseModel):
    code: Optional[str] = ""
    username: str
    password: str

class GuestCredentialCreate(BaseModel):
    username: str
    password: str

class WhatsAppNumberUpdate(BaseModel):
    whatsapp_number: str

@router.get("/whatsapp-number")
def get_whatsapp_number():
    """
    Fetches the configured WhatsApp business phone number.
    """
    try:
        row = execute_query(
            "SELECT value FROM config WHERE category = 'gallery_settings' AND name = 'whatsapp_number'",
            fetch="one"
        )
        whatsapp_number = row["value"] if row else "+923001234567"
        return {"whatsapp_number": whatsapp_number}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/whatsapp-number")
def update_whatsapp_number(payload: WhatsAppNumberUpdate):
    """
    Updates the configured WhatsApp business phone number.
    """
    number = payload.whatsapp_number.strip()
    if not number:
        raise HTTPException(status_code=400, detail="WhatsApp number cannot be empty.")
    try:
        # Delete existing entries first to avoid duplicates
        execute_query("DELETE FROM config WHERE category = 'gallery_settings' AND name = 'whatsapp_number'")
        execute_query(
            "INSERT INTO config (category, name, value) VALUES ('gallery_settings', 'whatsapp_number', %s)",
            (number,)
        )
        return {"status": "success", "message": "WhatsApp number updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/register")
def register_guest(payload: GuestRegister):
    """
    Registers a guest user and generates a VERIFY-XXXX code.
    Provides a pre-filled WhatsApp verification link.
    """
    email = payload.email.strip()
    phone = payload.phone.strip()
    if not email or not phone:
        raise HTTPException(status_code=400, detail="Email and phone number are required.")
    
    # Generate unique 4 digit verification code
    code = None
    for _ in range(15):
        temp_code = f"VERIFY-{random.randint(1000, 9999)}"
        existing = execute_query("SELECT id FROM guest_users WHERE verification_code = %s", (temp_code,), fetch="one")
        if not existing:
            code = temp_code
            break
            
    if not code:
        raise HTTPException(status_code=500, detail="Failed to generate verification code. Please try again.")
        
    try:
        # Save guest user with pending verification status
        execute_query(
            "INSERT INTO guest_users (email, phone, verification_code, verified) VALUES (%s, %s, %s, False)",
            (email, phone, code)
        )
        
        # Get configured WhatsApp business number (fallback to default placeholder)
        whatsapp_row = execute_query(
            "SELECT value FROM config WHERE category = 'gallery_settings' AND name = 'whatsapp_number'",
            fetch="one"
        )
        whatsapp_number = whatsapp_row["value"] if whatsapp_row else "+923001234567"
        
        # Build URL-encoded WhatsApp prompt link
        message = f"Verify my login code: {code}"
        encoded_message = urllib.parse.quote(message)
        whatsapp_link = f"https://wa.me/{whatsapp_number}?text={encoded_message}"
        
        return {
            "status": "success",
            "code": code,
            "whatsapp_link": whatsapp_link
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

def ensure_guest_credentials(code: str):
    """
    Ensures that a verified guest user has an auto-generated one-time credential.
    """
    row = execute_query(
        "SELECT verified, generated_username, generated_password FROM guest_users WHERE verification_code = %s",
        (code,),
        fetch="one"
    )
    if not row:
        return None, None
        
    if not row["verified"]:
        return None, None
        
    if row["generated_username"] and row["generated_password"]:
        return row["generated_username"], row["generated_password"]
        
    gen_username = None
    for _ in range(20):
        temp_user = f"guest_{random.randint(1000, 9999)}"
        existing = execute_query("SELECT id FROM guest_credentials WHERE username = %s", (temp_user,), fetch="one")
        if not existing:
            gen_username = temp_user
            break
            
    if not gen_username:
        gen_username = f"guest_{str(uuid.uuid4())[:6]}"
        
    gen_password = f"pass_{random.randint(1000, 9999)}"
    
    try:
        # Save to guest_credentials
        execute_query(
            "INSERT INTO guest_credentials (username, password, active) VALUES (%s, %s, True)",
            (gen_username, gen_password)
        )
        # Update guest_users
        execute_query(
            "UPDATE guest_users SET generated_username = %s, generated_password = %s WHERE verification_code = %s",
            (gen_username, gen_password, code)
        )
        return gen_username, gen_password
    except Exception as e:
        print(f"Error auto-generating credentials: {e}")
        return None, None

@router.get("/status/{code}")
def check_status(code: str):
    """
    Polls the verification status of a verification code and returns generated credentials if verified.
    """
    try:
        row = execute_query(
            "SELECT verified FROM guest_users WHERE verification_code = %s",
            (code,),
            fetch="one"
        )
        if not row:
            raise HTTPException(status_code=404, detail="Verification code not found.")
            
        verified = bool(row["verified"])
        gen_username, gen_password = None, None
        if verified:
            gen_username, gen_password = ensure_guest_credentials(code)
            
        return {
            "verified": verified,
            "username": gen_username,
            "password": gen_password
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/verify-simulate")
def verify_simulate(payload: GuestVerifySimulate):
    """
    Simulator endpoint to mark a verification code as verified and auto-generate credentials.
    """
    try:
        row = execute_query(
            "SELECT id FROM guest_users WHERE verification_code = %s",
            (payload.code,),
            fetch="one"
        )
        if not row:
            raise HTTPException(status_code=404, detail="Verification code not found.")
        
        execute_query(
            "UPDATE guest_users SET verified = True WHERE verification_code = %s",
            (payload.code,)
        )
        # Pre-generate credentials
        gen_username, gen_password = ensure_guest_credentials(payload.code)
        
        return {
            "status": "success", 
            "message": f"Code {payload.code} successfully marked as verified.",
            "username": gen_username,
            "password": gen_password
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/verify-otp")
def verify_otp(payload: GuestVerifyOtp):
    """
    Verifies the OTP code (either 4 digits or full VERIFY-XXXX code) and returns auto-generated login credentials.
    """
    otp_input = payload.otp.strip()
    if not otp_input:
        raise HTTPException(status_code=400, detail="OTP code cannot be blank.")
        
    code = otp_input.upper()
    if re.match(r"^\d{4}$", code):
        code = f"VERIFY-{code}"
        
    try:
        row = execute_query(
            "SELECT id FROM guest_users WHERE verification_code = %s",
            (code,),
            fetch="one"
        )
        if not row:
            raise HTTPException(status_code=400, detail="Invalid OTP code. Please enter the correct code.")
            
        session_token = str(uuid.uuid4())
        expiry_time = datetime.now() + timedelta(minutes=30) # 30-minute visitor session
        
        execute_query(
            "UPDATE guest_users SET verified = True, session_token = %s, session_expiry = %s WHERE verification_code = %s",
            (session_token, expiry_time.strftime("%Y-%m-%d %H:%M:%S"), code)
        )
        
        # Ensure credentials are generated
        gen_username, gen_password = ensure_guest_credentials(code)
        
        return {
            "status": "success",
            "message": "OTP verified successfully.",
            "code": code,
            "token": session_token,
            "expiry": expiry_time.isoformat(),
            "username": gen_username,
            "password": gen_password
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/whatsapp-webhook")
async def whatsapp_webhook(request: Request):
    """
    Flexible webhook endpoint that receives incoming WhatsApp texts (Twilio or Meta).
    Finds verification codes and marks them as verified.
    """
    body_text = ""
    try:
        content_type = request.headers.get("content-type", "")
        if "application/json" in content_type:
            data = await request.json()
            try:
                body_text = data['entry'][0]['changes'][0]['value']['messages'][0]['text']['body']
            except:
                body_text = str(data)
        else:
            form_data = await request.form()
            body_text = form_data.get("Body", "")
    except Exception:
        body_text = ""
        
    # Extract code e.g. VERIFY-8291
    match = re.search(r"VERIFY-\d{4}", body_text, re.IGNORECASE)
    if match:
        code = match.group(0).upper()
        execute_query(
            "UPDATE guest_users SET verified = True WHERE verification_code = %s",
            (code,)
        )
        print(f"WhatsApp Webhook successfully verified code: {code}")
        return {"status": "verified", "code": code}
        
    return {"status": "no_code_found"}

@router.post("/login")
def guest_login(payload: GuestLogin):
    """
    Validates credentials (direct admin-created or WhatsApp generated) and issues a 30-minute session token.
    """
    code = (payload.code or "").strip()
    username = payload.username.strip()
    password = payload.password.strip()
    
    try:
        # 1. Verify credentials against active guest credentials table
        cred_row = execute_query(
            "SELECT id FROM guest_credentials WHERE username = %s AND password = %s AND active = True",
            (username, password),
            fetch="one"
        )
        
        # 2. If not found in guest_credentials, check if generated in guest_users table
        if not cred_row:
            user_by_cred = execute_query(
                "SELECT id, verification_code FROM guest_users WHERE generated_username = %s AND generated_password = %s",
                (username, password),
                fetch="one"
            )
            if not user_by_cred:
                raise HTTPException(status_code=401, detail="Invalid username or password.")
            if not code:
                code = user_by_cred.get("verification_code") or ""
            
        session_token = str(uuid.uuid4())
        expiry_time = datetime.now() + timedelta(minutes=30) # 30-minute visitor session
        
        # 3. Update or create guest session
        if code and code != 'DIRECT':
            execute_query(
                "UPDATE guest_users SET session_token = %s, session_expiry = %s, verified = True WHERE verification_code = %s",
                (session_token, expiry_time.strftime("%Y-%m-%d %H:%M:%S"), code)
            )
        else:
            execute_query(
                """
                INSERT INTO guest_users (email, phone, verification_code, verified, session_token, session_expiry)
                VALUES (%s, %s, %s, True, %s, %s)
                ON DUPLICATE KEY UPDATE session_token = VALUES(session_token), session_expiry = VALUES(session_expiry), verified = True
                """,
                (f"{username}@mainframe.local", username, f"DIRECT-{username}", session_token, expiry_time.strftime("%Y-%m-%d %H:%M:%S"))
            )
        
        return {
            "status": "success",
            "token": session_token,
            "expiry": expiry_time.isoformat()
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/validate-token/{token}")
def validate_token(token: str):
    """
    Validates a guest session token and handles expiration.
    """
    try:
        row = execute_query(
            "SELECT session_expiry, email, phone FROM guest_users WHERE session_token = %s",
            (token,),
            fetch="one"
        )
        if not row:
            return {"valid": False, "message": "Token not found."}
            
        expiry = row["session_expiry"]
        if expiry and datetime.now() > expiry:
            # Clear expired session
            execute_query(
                "UPDATE guest_users SET session_token = NULL, session_expiry = NULL WHERE session_token = %s",
                (token,)
            )
            return {"valid": False, "message": "Session expired."}
            
        return {
            "valid": True,
            "email": row["email"],
            "phone": row["phone"],
            "expiry": expiry.isoformat() if expiry else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# Admin Portal APIs
@router.get("/users")
def get_guest_users():
    """
    Lists all guest user registrations for the admin portal.
    """
    try:
        rows = execute_query(
            "SELECT id, email, phone, verification_code, verified, session_expiry, created_at FROM guest_users ORDER BY created_at DESC"
        )
        for row in rows:
            if row["created_at"]:
                row["created_at"] = row["created_at"].strftime("%Y-%m-%d %H:%M:%S")
            if row["session_expiry"]:
                row["session_active"] = datetime.now() < row["session_expiry"]
                row["session_expiry"] = row["session_expiry"].strftime("%Y-%m-%d %H:%M:%S")
            else:
                row["session_active"] = False
                row["session_expiry"] = None
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/credentials")
def get_credentials():
    """
    Lists active one-time credentials for guest logins.
    """
    try:
        rows = execute_query(
            "SELECT id, username, password, active, created_at FROM guest_credentials ORDER BY created_at DESC"
        )
        for row in rows:
            if row["created_at"]:
                row["created_at"] = row["created_at"].strftime("%Y-%m-%d %H:%M:%S")
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/credentials")
def create_credential(payload: GuestCredentialCreate):
    """
    Creates new active one-time credentials.
    """
    username = payload.username.strip()
    password = payload.password.strip()
    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password are required.")
    try:
        execute_query(
            "INSERT INTO guest_credentials (username, password, active) VALUES (%s, %s, True)",
            (username, password)
        )
        return {"status": "success", "message": "Guest credentials created successfully."}
    except Exception as e:
        if "Duplicate entry" in str(e):
            raise HTTPException(status_code=400, detail="Username already exists.")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.delete("/credentials/{cred_id}")
def delete_credential(cred_id: int):
    """
    Deletes/revokes active guest credentials.
    """
    try:
        execute_query(
            "DELETE FROM guest_credentials WHERE id = %s",
            (cred_id,)
        )
        return {"status": "success", "message": "Guest credentials deleted/revoked successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
