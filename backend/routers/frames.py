from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import execute_query, get_db_connection

router = APIRouter(prefix="/api/frames", tags=["Frames Inventory"])

class FrameRequest(BaseModel):
    item_id: str
    description: str = None
    quantity: float = 0.0
    buying_cost: float = 0.0
    selling_price: float = 0.0
    min_inventory: float = 0.0
    thickness: float = 0.0
    branch_id: int = 1
    is_local: int = 1
    color: str = None
    style: str = None
    fsize: str = None

@router.get("")
def get_all_frames(branch_id: int = 1):
    """
    Fetches all frames (local and imported) for a specific branch.
    """
    query = """
        SELECT 
            frame_id, item_id, description, quantity, buying_cost, 
            selling_price, min_inventory, thickness, branch_id, is_local, 
            color, style, fsize
        FROM frame
        WHERE branch_id = %s;
    """
    try:
        frames = execute_query(query, (branch_id,))
        return frames
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("")
def add_new_frame(data: FrameRequest):
    """
    Adds a new frame to the inventory.
    """
    query = """
        INSERT INTO frame (item_id, description, quantity, buying_cost, selling_price, min_inventory, thickness, branch_id, is_local, color, style, fsize, date)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_DATE());
    """
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(query, (
                data.item_id,
                data.description,
                data.quantity,
                data.buying_cost,
                data.selling_price,
                data.min_inventory,
                data.thickness,
                data.branch_id,
                data.is_local,
                data.color,
                data.style,
                data.fsize
            ))
            connection.commit()
            return {"success": True, "message": "Frame successfully added to inventory."}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to add frame: {str(e)}")
    finally:
        connection.close()

@router.delete("/{frame_id}")
def delete_frame(frame_id: int):
    """
    Deletes a frame from the inventory.
    """
    query = "DELETE FROM frame WHERE frame_id = %s;"
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(query, (frame_id,))
            connection.commit()
            return {"success": True, "message": "Frame deleted successfully."}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete frame: {str(e)}")
    finally:
        connection.close()

@router.put("/{frame_id}")
def update_frame(frame_id: int, data: FrameRequest):
    """
    Updates details of an existing frame.
    """
    query = """
        UPDATE frame
        SET item_id = %s, description = %s, quantity = %s, buying_cost = %s, 
            selling_price = %s, min_inventory = %s, thickness = %s, color = %s, 
            style = %s, fsize = %s
        WHERE frame_id = %s;
    """
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(query, (
                data.item_id,
                data.description,
                data.quantity,
                data.buying_cost,
                data.selling_price,
                data.min_inventory,
                data.thickness,
                data.color,
                data.style,
                data.fsize,
                frame_id
            ))
            connection.commit()
            return {"success": True, "message": "Frame rates updated successfully."}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update frame: {str(e)}")
    finally:
        connection.close()
