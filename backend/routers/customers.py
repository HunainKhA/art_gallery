from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import execute_query, get_db_connection
from datetime import datetime
from typing import Optional

router = APIRouter(prefix="/api/customers", tags=["Customers Management"])

class CustomerRequest(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    is_active: int = 1

class CustomerImportList(BaseModel):
    customers: list[CustomerRequest]

@router.get("")
def get_all_customers():
    """
    Fetches all customers from the database.
    """
    query = "SELECT id, name, email, phone, address, is_active, created_on FROM customers ORDER BY name ASC;"
    try:
        customers = execute_query(query)
        return customers
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/search")
def search_customers(q: str):
    """
    Searches customers by name, phone, or email.
    """
    query = """
        SELECT id, name, email, phone, address, is_active, created_on 
        FROM customers 
        WHERE name LIKE %s OR phone LIKE %s OR email LIKE %s
        ORDER BY name ASC;
    """
    like_q = f"%{q}%"
    try:
        results = execute_query(query, (like_q, like_q, like_q))
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@router.get("/names")
def get_customer_names():
    """
    Returns a flat list of all customer names (for POS autocomplete).
    """
    query = "SELECT DISTINCT name FROM customers WHERE name IS NOT NULL AND name != '' ORDER BY name ASC;"
    try:
        rows = execute_query(query)
        return [row["name"] for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch names: {str(e)}")

@router.get("/phones")
def get_customer_phones():
    """
    Returns a flat list of all customer phone numbers (for POS autocomplete).
    """
    query = "SELECT DISTINCT phone FROM customers WHERE phone IS NOT NULL AND phone != '' ORDER BY phone ASC;"
    try:
        rows = execute_query(query)
        return [row["phone"] for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch phones: {str(e)}")

@router.post("")
def add_new_customer(data: CustomerRequest):
    """
    Creates a new customer.
    """
    query = """
        INSERT INTO customers (name, email, phone, address, is_active, created_on)
        VALUES (%s, %s, %s, %s, %s, NOW());
    """
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(query, (
                data.name,
                data.email,
                data.phone,
                data.address,
                data.is_active
            ))
            customer_id = cursor.lastrowid
            connection.commit()
            return {"success": True, "id": customer_id, "message": "Customer created successfully."}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create customer: {str(e)}")
    finally:
        connection.close()

@router.put("/{customer_id}")
def update_customer(customer_id: int, data: CustomerRequest):
    """
    Updates details of an existing customer.
    """
    query = """
        UPDATE customers 
        SET name = %s, email = %s, phone = %s, address = %s, is_active = %s
        WHERE id = %s;
    """
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(query, (
                data.name,
                data.email,
                data.phone,
                data.address,
                data.is_active,
                customer_id
            ))
            connection.commit()
            return {"success": True, "message": "Customer updated successfully."}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update customer: {str(e)}")
    finally:
        connection.close()

@router.delete("/{customer_id}")
def delete_customer(customer_id: int):
    """
    Deletes a customer from the database.
    """
    query = "DELETE FROM customers WHERE id = %s;"
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(query, (customer_id,))
            connection.commit()
            return {"success": True, "message": "Customer deleted successfully."}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete customer: {str(e)}")
    finally:
        connection.close()

@router.post("/import")
def import_customers(data: CustomerImportList):
    """
    Batch imports multiple customers from a list.
    """
    query = """
        INSERT INTO customers (name, email, phone, address, is_active, created_on)
        VALUES (%s, %s, %s, %s, %s, NOW());
    """
    connection = get_db_connection()
    success_count = 0
    try:
        with connection.cursor() as cursor:
            for cust in data.customers:
                cursor.execute(query, (
                    cust.name,
                    cust.email,
                    cust.phone,
                    cust.address,
                    cust.is_active
                ))
                success_count += 1
            connection.commit()
            return {"success": True, "message": f"Successfully imported {success_count} customers."}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Batch import failed: {str(e)}")
    finally:
        connection.close()
