from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import execute_query, get_db_connection

router = APIRouter(prefix="/api/fittings", tags=["Fittings Inventory"])

class FittingRequest(BaseModel):
    name: str
    price: float = 0.0
    description: str = None
    branch_id: int = 1

@router.get("")
def get_all_fittings(branch_id: int = 1):
    """
    Fetches all fittings for a specific branch.
    """
    query = "SELECT fitting_id, name, price, description, branch_id FROM fitting WHERE branch_id = %s;"
    try:
        fittings = execute_query(query, (branch_id,))
        return fittings
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("")
def add_new_fitting(data: FittingRequest):
    """
    Adds a new fitting item.
    """
    query = """
        INSERT INTO fitting (name, price, description, branch_id, date)
        VALUES (%s, %s, %s, %s, CURRENT_DATE());
    """
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(query, (
                data.name,
                data.price,
                data.description,
                data.branch_id
            ))
            connection.commit()
            return {"success": True, "message": "Fitting added successfully."}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to add fitting: {str(e)}")
    finally:
        connection.close()

@router.put("/{fitting_id}")
def update_fitting(fitting_id: int, data: FittingRequest):
    """
    Updates details (name, price, description) of an existing fitting item.
    """
    query = """
        UPDATE fitting
        SET name = %s, price = %s, description = %s
        WHERE fitting_id = %s;
    """
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(query, (
                data.name,
                data.price,
                data.description,
                fitting_id
            ))
            connection.commit()
            return {"success": True, "message": "Fitting updated successfully."}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update fitting: {str(e)}")
    finally:
        connection.close()

@router.delete("/{fitting_id}")
def delete_fitting(fitting_id: int):
    """
    Deletes an existing fitting item.
    """
    query = "DELETE FROM fitting WHERE fitting_id = %s;"
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(query, (fitting_id,))
            connection.commit()
            return {"success": True, "message": "Fitting deleted successfully."}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete fitting: {str(e)}")
    finally:
        connection.close()
