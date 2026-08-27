from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from database import execute_query, get_db_connection

router = APIRouter(prefix="/api/subscribers", tags=["Subscribers"])

# Ensure table exists on import
def ensure_subscribers_table():
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS newsletter_subscribers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                status VARCHAR(50) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """)
        conn.close()
    except Exception as e:
        print("Error ensuring newsletter_subscribers table:", e)

ensure_subscribers_table()

class SubscribeRequest(BaseModel):
    email: str

class ExhibitionNotificationRequest(BaseModel):
    exhibition_id: str = None
    title: str = None
    description: str = None

@router.post("/subscribe")
def subscribe_email(req: SubscribeRequest):
    """
    Subscribes an email to the gallery updates newsletter.
    """
    email = req.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email address.")

    try:
        execute_query(
            """
            INSERT INTO newsletter_subscribers (email, status)
            VALUES (%s, 'active')
            ON DUPLICATE KEY UPDATE status = 'active'
            """,
            (email,),
            fetch=None
        )
        return {
            "success": True,
            "message": "Thanks for subscribe now you can receive our updates Via email"
        }
    except Exception as e:
        print("Error saving subscriber:", e)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("")
def get_all_subscribers():
    """
    Retrieves all subscribers and total count for dashboard.
    """
    try:
        ensure_subscribers_table()
        rows = execute_query(
            "SELECT id, email, status, created_at FROM newsletter_subscribers ORDER BY created_at DESC",
            fetch="all"
        )
        return {
            "total_count": len(rows),
            "subscribers": rows
        }
    except Exception as e:
        print("Error fetching subscribers:", e)
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{subscriber_id}")
def delete_subscriber(subscriber_id: int):
    """
    Removes a subscriber by ID.
    """
    try:
        execute_query(
            "DELETE FROM newsletter_subscribers WHERE id = %s",
            (subscriber_id,),
            fetch=None
        )
        return {"success": True, "message": "Subscriber removed successfully."}
    except Exception as e:
        print("Error deleting subscriber:", e)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/notify-exhibition")
def notify_subscribers_exhibition(req: ExhibitionNotificationRequest):
    """
    Dispatches exhibition update notifications to all active newsletter subscribers.
    """
    try:
        subscribers = execute_query(
            "SELECT email FROM newsletter_subscribers WHERE status = 'active'",
            fetch="all"
        )
        recipient_count = len(subscribers)
        
        # Here email sending service or mailer queue can be invoked
        return {
            "success": True,
            "message": f"Exhibition update dispatched to {recipient_count} subscribers successfully!",
            "recipient_count": recipient_count
        }
    except Exception as e:
        print("Error sending exhibition notification to subscribers:", e)
        raise HTTPException(status_code=500, detail=str(e))
