import uuid
import urllib.request
import json
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import stripe
from config import Config
from database import execute_query, get_db_connection

router = APIRouter(prefix="/api/payments", tags=["Payments & Purchases"])

# Initialize Stripe API Key
stripe.api_key = Config.STRIPE_SECRET_KEY

# Static fallback rates relative to PKR (1 PKR to target currency)
FALLBACK_RATES = {
    "PKR": 1.0,
    "USD": 0.0036,
    "EUR": 0.0033,
    "GBP": 0.0028,
    "AED": 0.0132
}

def fetch_exchange_rates():
    """
    Fetches real-time exchange rates relative to PKR from the public API.
    Returns exchange rates with static fallbacks if the API call fails.
    """
    url = "https://open.er-api.com/v6/latest/PKR"
    try:
        req = urllib.request.Request(
            url,
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            if data and data.get("result") == "success":
                rates = data.get("rates", {})
                return {
                    "PKR": 1.0,
                    "USD": rates.get("USD", FALLBACK_RATES["USD"]),
                    "EUR": rates.get("EUR", FALLBACK_RATES["EUR"]),
                    "GBP": rates.get("GBP", FALLBACK_RATES["GBP"]),
                    "AED": rates.get("AED", FALLBACK_RATES["AED"])
                }
    except Exception as e:
        print(f"Error fetching real-time exchange rates securely: {e}")
    
    return FALLBACK_RATES

class PaymentIntentRequest(BaseModel):
    artwork_ids: list[str]
    currency: str = "pkr"

class OrderConfirmationRequest(BaseModel):
    customer_name: str
    customer_email: str
    customer_phone: str = None
    artwork_ids: list[str]
    total_amount: float
    currency: str = "PKR"
    stripe_charge_id: str

@router.post("/create-payment-intent")
def create_payment_intent(data: PaymentIntentRequest):
    """
    Creates a Stripe PaymentIntent based on the total price of artworks in the cart,
    securely converted server-side to prevent client-side pricing tampering.
    """
    if not data.artwork_ids:
        raise HTTPException(status_code=400, detail="Shopping cart is empty.")
        
    # Query database to get price of each artwork in cart
    format_strings = ','.join(['%s'] * len(data.artwork_ids))
    query = f"""
        SELECT c.id, cstm.sale_gallery_price_c AS price 
        FROM art_collections c
        LEFT JOIN art_collections_cstm cstm ON c.id = cstm.id_c
        WHERE c.id IN ({format_strings}) AND c.deleted = 0 AND c.collection_status IN ('Available', 'not_sold');
    """
    try:
        artworks = execute_query(query, tuple(data.artwork_ids))
        if len(artworks) != len(data.artwork_ids):
            raise HTTPException(
                status_code=400, 
                detail="One or more artworks in your cart are no longer available for purchase."
            )
            
        total_pkr = 0.0
        for art in artworks:
            try:
                total_pkr += float(art["price"]) if art["price"] else 0.0
            except ValueError:
                pass
                
        if total_pkr < 0:
            raise HTTPException(status_code=400, detail="Invalid total checkout amount.")
            
        # Get real-time exchange rates securely on the server side
        rates = fetch_exchange_rates()
        req_currency = data.currency.upper()
        if req_currency not in rates:
            raise HTTPException(status_code=400, detail=f"Unsupported currency: {data.currency}")
            
        rate = rates[req_currency]
        converted_amount = total_pkr * rate
        # Round to nearest integer to match formatPrice frontend formatting
        rounded_amount = round(converted_amount)
        
        # Stripe expects amount in smallest currency unit (cents/subunits)
        stripe_amount = int(rounded_amount * 100)
        
        # Check if dummy key is used or if the amount is zero, and fallback to a mock client secret
        if stripe_amount == 0 or not stripe.api_key or "sk_test_51PTestKey" in stripe.api_key:
            return {
                "clientSecret": f"pi_mock_{uuid.uuid4().hex}_secret_{uuid.uuid4().hex}",
                "totalAmount": rounded_amount,
                "currency": req_currency
            }
            
        intent = stripe.PaymentIntent.create(
            amount=stripe_amount,
            currency=req_currency.lower(),
            metadata={"artwork_ids": ",".join(data.artwork_ids)}
        )
        
        return {
            "clientSecret": intent.client_secret,
            "totalAmount": rounded_amount,
            "currency": req_currency
        }
        
    except HTTPException:
        raise
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe Error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Checkout initiation failed: {str(e)}")


@router.post("/confirm-order")
def confirm_order(data: OrderConfirmationRequest):
    """
    Logs the successful transaction, creates local order records, 
    and automatically syncs them to the client's SugarCRM tables.
    """
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # 1. Insert main order into art_orders
            order_query = """
                INSERT INTO art_orders (customer_name, customer_email, customer_phone, total_amount, currency, stripe_charge_id)
                VALUES (%s, %s, %s, %s, %s, %s);
            """
            cursor.execute(order_query, (
                data.customer_name,
                data.customer_email,
                data.customer_phone,
                data.total_amount,
                data.currency,
                data.stripe_charge_id
            ))
            order_id = cursor.lastrowid
            
            # 2. Insert items into art_order_items & get price details
            for artwork_id in data.artwork_ids:
                # Fetch artwork price
                price_query = "SELECT sale_gallery_price_c AS price FROM art_collections_cstm WHERE id_c = %s;"
                cursor.execute(price_query, (artwork_id,))
                art_data = cursor.fetchone()
                art_price = float(art_data["price"]) if art_data and art_data["price"] else 0.0
                
                item_query = "INSERT INTO art_order_items (order_id, artwork_id, price) VALUES (%s, %s, %s);"
                cursor.execute(item_query, (order_id, artwork_id, art_price))
                
                # 3. Update artwork status in SugarCRM table (from 'Available' to 'Sold')
                update_status_query = "UPDATE art_collections SET collection_status = 'Sold' WHERE id = %s;"
                cursor.execute(update_status_query, (artwork_id,))
                
                # 4. Generate a clean SugarCRM Invoice entry for this item
                crm_invoice_id = str(uuid.uuid4())
                crm_invoice_name = f"Online Sale: {data.customer_name}"
                now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                
                crm_invoice_query = """
                    INSERT INTO art_invoices (id, name, date_entered, date_modified, deleted, amount, sales_stage)
                    VALUES (%s, %s, %s, %s, 0, %s, 'Closed Won');
                """
                cursor.execute(crm_invoice_query, (
                    crm_invoice_id,
                    crm_invoice_name,
                    now_str,
                    now_str,
                    art_price
                ))
            
            # Commit the transaction
            connection.commit()
            
            return {
                "success": True,
                "order_id": order_id,
                "message": "Order successfully recorded and synchronized to SugarCRM dashboard."
            }
            
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Order logging failed: {str(e)}")
    finally:
        connection.close()


class PaymentRecordRequest(BaseModel):
    name: str
    amount: float
    bank_name: str = ""
    cheque_number: str = ""
    sales_stage: str = "Closed Won"
    description: str = ""

class PaymentRecordImportList(BaseModel):
    payments: list[PaymentRecordRequest]

@router.get("/records")
def get_all_payment_records():
    """
    Fetches all CRM payment records.
    """
    query = """
        SELECT id, name, date_entered, amount, bank_name_c AS bank_name, cheque_number_c AS cheque_number, sales_stage, description
        FROM art_payments
        WHERE deleted = 0
        ORDER BY date_entered DESC;
    """
    try:
        records = execute_query(query)
        return records
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/records")
def create_payment_record(data: PaymentRecordRequest):
    """
    Creates a new CRM payment record.
    """
    payment_id = str(uuid.uuid4())
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    query = """
        INSERT INTO art_payments (
            id, name, date_entered, date_modified, modified_user_id, created_by, 
            deleted, amount, bank_name_c, cheque_number_c, sales_stage, description
        ) VALUES (%s, %s, %s, %s, '1', '1', 0, %s, %s, %s, %s, %s);
    """
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(query, (
                payment_id, data.name, now, now, data.amount, data.bank_name, 
                data.cheque_number, data.sales_stage, data.description
            ))
            connection.commit()
            return {"success": True, "id": payment_id, "message": "Payment record successfully created."}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create payment record: {str(e)}")
    finally:
        connection.close()

@router.delete("/records/{payment_id}")
def delete_payment_record(payment_id: str):
    """
    Soft-deletes a CRM payment record.
    """
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    query = "UPDATE art_payments SET deleted = 1, date_modified = %s WHERE id = %s;"
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(query, (now, payment_id))
            connection.commit()
            return {"success": True, "message": "Payment record deleted successfully."}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete payment record: {str(e)}")
    finally:
        connection.close()

@router.post("/records/import")
def import_payment_records(data: PaymentRecordImportList):
    """
    Batch imports CRM payment records.
    """
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    connection = get_db_connection()
    success_count = 0
    try:
        with connection.cursor() as cursor:
            for pay in data.payments:
                payment_id = str(uuid.uuid4())
                query = """
                    INSERT INTO art_payments (
                        id, name, date_entered, date_modified, modified_user_id, created_by, 
                        deleted, amount, bank_name_c, cheque_number_c, sales_stage, description
                    ) VALUES (%s, %s, %s, %s, '1', '1', 0, %s, %s, %s, %s, %s);
                """
                cursor.execute(query, (
                    payment_id, pay.name, now, now, pay.amount, pay.bank_name, 
                    pay.cheque_number, pay.sales_stage, pay.description
                ))
                success_count += 1
            connection.commit()
            return {"success": True, "message": f"Successfully imported {success_count} payment records."}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Batch import failed: {str(e)}")
    finally:
        connection.close()

