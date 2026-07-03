import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import execute_query, get_db_connection

router = APIRouter(prefix="/api/collection-types", tags=["Collection Types"])

class CollectionTypeRequest(BaseModel):
    name: str
    description: str = ""

class CollectionTypeImportList(BaseModel):
    types: list[CollectionTypeRequest]

@router.get("")
def get_all_collection_types():
    """
    Fetches all collection types (categories) from SugarCRM art_collectionstype.
    """
    query = "SELECT id, name, description FROM art_collectionstype WHERE deleted = 0 ORDER BY name ASC;"
    try:
        types = execute_query(query)
        return types
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("")
def create_collection_type(data: CollectionTypeRequest):
    """
    Creates a new collection type preset.
    """
    type_id = str(uuid.uuid4())
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    query = """
        INSERT INTO art_collectionstype (
            id, name, description, date_entered, date_modified, modified_user_id, created_by, deleted
        ) VALUES (%s, %s, %s, %s, %s, '1', '1', 0);
    """
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(query, (type_id, data.name, data.description, now, now))
            connection.commit()
            return {"success": True, "id": type_id, "message": "Collection Type successfully created."}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create collection type: {str(e)}")
    finally:
        connection.close()

@router.put("/{type_id}")
def update_collection_type(type_id: str, data: CollectionTypeRequest):
    """
    Updates details of an existing collection type.
    """
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    query = """
        UPDATE art_collectionstype 
        SET name = %s, description = %s, date_modified = %s
        WHERE id = %s AND deleted = 0;
    """
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(query, (data.name, data.description, now, type_id))
            connection.commit()
            return {"success": True, "message": "Collection Type successfully updated."}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update collection type: {str(e)}")
    finally:
        connection.close()

@router.delete("/{type_id}")
def delete_collection_type(type_id: str):
    """
    Soft-deletes a collection type from the database.
    """
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    query = "UPDATE art_collectionstype SET deleted = 1, date_modified = %s WHERE id = %s;"
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(query, (now, type_id))
            connection.commit()
            return {"success": True, "message": "Collection Type deleted successfully."}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete collection type: {str(e)}")
    finally:
        connection.close()

@router.post("/import")
def import_collection_types(data: CollectionTypeImportList):
    """
    Batch imports multiple collection types.
    """
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    connection = get_db_connection()
    success_count = 0
    try:
        with connection.cursor() as cursor:
            for item in data.types:
                type_id = str(uuid.uuid4())
                query = """
                    INSERT INTO art_collectionstype (
                        id, name, description, date_entered, date_modified, modified_user_id, created_by, deleted
                    ) VALUES (%s, %s, %s, %s, %s, '1', '1', 0);
                """
                cursor.execute(query, (type_id, item.name, item.description, now, now))
                success_count += 1
            connection.commit()
            return {"success": True, "message": f"Successfully imported {success_count} Collection Types."}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Batch import failed: {str(e)}")
    finally:
        connection.close()
