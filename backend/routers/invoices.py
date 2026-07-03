from fastapi import APIRouter, HTTPException
from database import execute_query

router = APIRouter(prefix="/api/invoices", tags=["Invoices (CRM)"])

@router.get("")
def get_all_crm_invoices():
    """
    Fetches all invoices recorded in SugarCRM (art_invoices).
    """
    query = """
        SELECT id, name, amount, date_entered, date_modified, sales_stage, description
        FROM art_invoices
        WHERE deleted = 0
        ORDER BY date_entered DESC;
    """
    try:
        invoices = execute_query(query)
        # Convert date objects to string
        for inv in invoices:
            if inv.get("date_entered"):
                inv["date_entered"] = str(inv["date_entered"])
            if inv.get("date_modified"):
                inv["date_modified"] = str(inv["date_modified"])
        return invoices
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
