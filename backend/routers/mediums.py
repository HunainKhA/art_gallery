import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import execute_query, get_db_connection

router = APIRouter(prefix="/api/mediums", tags=["Mediums"])

class MediumRequest(BaseModel):
    name: str
    description: str = ""

class MediumImportList(BaseModel):
    mediums: list[MediumRequest]

@router.get("")
def get_all_mediums():
    """
    Fetches all mediums from SugarCRM art_medium.
    """
    query = "SELECT id, name, description FROM art_medium WHERE deleted = 0 ORDER BY name ASC;"
    try:
        mediums = execute_query(query)
        return mediums
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("")
def create_medium(data: MediumRequest):
    """
    Creates a new artwork medium.
    """
    medium_id = str(uuid.uuid4())
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    query = """
        INSERT INTO art_medium (
            id, name, description, date_entered, date_modified, modified_user_id, created_by, deleted
        ) VALUES (%s, %s, %s, %s, %s, '1', '1', 0);
    """
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(query, (medium_id, data.name, data.description, now, now))
            connection.commit()
            return {"success": True, "id": medium_id, "message": "Medium successfully created."}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create medium: {str(e)}")
    finally:
        connection.close()

@router.put("/{medium_id}")
def update_medium(medium_id: str, data: MediumRequest):
    """
    Updates details of an existing medium.
    """
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    query = """
        UPDATE art_medium 
        SET name = %s, description = %s, date_modified = %s
        WHERE id = %s AND deleted = 0;
    """
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(query, (data.name, data.description, now, medium_id))
            connection.commit()
            return {"success": True, "message": "Medium successfully updated."}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update medium: {str(e)}")
    finally:
        connection.close()

@router.delete("/{medium_id}")
def delete_medium(medium_id: str):
    """
    Soft-deletes a medium from the database.
    """
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    query = "UPDATE art_medium SET deleted = 1, date_modified = %s WHERE id = %s;"
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(query, (now, medium_id))
            connection.commit()
            return {"success": True, "message": "Medium deleted successfully."}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete medium: {str(e)}")
    finally:
        connection.close()

@router.post("/import")
def import_mediums(data: MediumImportList):
    """
    Batch imports multiple mediums.
    """
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    connection = get_db_connection()
    success_count = 0
    try:
        with connection.cursor() as cursor:
            for item in data.mediums:
                medium_id = str(uuid.uuid4())
                query = """
                    INSERT INTO art_medium (
                        id, name, description, date_entered, date_modified, modified_user_id, created_by, deleted
                    ) VALUES (%s, %s, %s, %s, %s, '1', '1', 0);
                """
                cursor.execute(query, (medium_id, item.name, item.description, now, now))
                success_count += 1
            connection.commit()
            return {"success": True, "message": f"Successfully imported {success_count} Mediums."}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Batch import failed: {str(e)}")
    finally:
        connection.close()
