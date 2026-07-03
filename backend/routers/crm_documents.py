import uuid
import os
import json
import shutil
from datetime import datetime
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel
from database import execute_query, get_db_connection
from config import Config


router = APIRouter(prefix="/api/crm", tags=["CRM Unified Documents"])

class DocumentRequest(BaseModel):
    document_name: str
    filename: str = ""
    description: str = ""
    active_date: str = None  # YYYY-MM-DD
    exp_date: str = None  # YYYY-MM-DD
    category_id: str = None
    is_featured_c: int = 0

class DocumentImportList(BaseModel):
    documents: list[DocumentRequest]

MODULE_TABLES = {
    "exhibitions": {"table": "art_exhibitions", "cstm_table": "art_exhibitions_cstm"},
    "framerheaven": {"table": "art_framerheaven", "cstm_table": "art_framerheaven_cstm"},
    "catalogues": {"table": "art_catalogues", "cstm_table": "art_catalogues_cstm"},
    "flashimages": {"table": "art_flashimages", "cstm_table": None},
    "videos": {"table": "art_videos", "cstm_table": "art_videos_cstm"}
}

def get_table_details(module: str):
    details = MODULE_TABLES.get(module.lower())
    if not details:
        raise HTTPException(status_code=400, detail=f"Invalid CRM document module: {module}")
    return details

@router.get("/{module}")
def get_crm_documents(module: str):
    """
    Fetches all active documents for a given CRM module.
    """
    details = get_table_details(module)
    table = details["table"]
    cstm_table = details["cstm_table"]
    
    if module.lower() == "framerheaven" and cstm_table:
        query = f"""
            SELECT t.id, t.document_name, t.filename, t.description, t.active_date, t.exp_date, t.date_entered, t.category_id, c.is_featured_c
            FROM {table} t
            LEFT JOIN {cstm_table} c ON t.id = c.id_c
            WHERE t.deleted = 0
            ORDER BY t.date_entered DESC;
        """
    else:
        query = f"""
            SELECT id, document_name, filename, description, active_date, exp_date, date_entered, category_id
            FROM {table}
            WHERE deleted = 0
            ORDER BY date_entered DESC;
        """
    try:
        results = execute_query(query)
        # Convert date objects to string for JSON serialization
        for r in results:
            if r.get("active_date"):
                r["active_date"] = str(r["active_date"])
            if r.get("exp_date"):
                r["exp_date"] = str(r["exp_date"])
            if r.get("is_featured_c") is not None:
                # Convert tinyint/boolean to integer 0/1 for response consistency
                r["is_featured_c"] = 1 if r["is_featured_c"] else 0
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error on fetching {module}: {str(e)}")

@router.get("/exhibitions/{exhibition_id}/artworks")
def get_exhibition_artworks(exhibition_id: str):
    """
    Fetches all artworks associated with a specific exhibition.
    """
    query = """
        SELECT 
            c.id AS id,
            c.document_name AS title,
            c.filename AS image,
            c.description AS description,
            c.collection_status AS status,
            cstm.sale_gallery_price_c AS price,
            cstm.collection_size_length_c AS length,
            cstm.collection_size_width_c AS width,
            cstm.code_c AS code,
            a.id AS artist_id,
            CONCAT(COALESCE(a.first_name, ''), ' ', COALESCE(a.last_name, '')) AS artist_name
        FROM art_collections c
        LEFT JOIN art_collections_cstm cstm ON c.id = cstm.id_c
        INNER JOIN art_exhibitions_art_collections_1_c rel
            ON c.id = rel.art_exhibitions_art_collections_1art_collections_idb AND rel.deleted = 0
        LEFT JOIN art_artists_art_collections_c art_rel 
            ON c.id = art_rel.art_artists_art_collectionsart_collections_idb AND art_rel.deleted = 0
        LEFT JOIN art_artists a 
            ON art_rel.art_artists_art_collectionsart_artists_ida = a.id AND a.deleted = 0
        WHERE rel.art_exhibitions_art_collections_1art_exhibitions_ida = %s AND c.deleted = 0
        ORDER BY c.date_entered DESC;
    """
    try:
        artworks = execute_query(query, (exhibition_id,))
        for art in artworks:
            try:
                art["price"] = float(art["price"]) if art["price"] else 0.0
            except (ValueError, TypeError):
                art["price"] = 0.0
        return artworks
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error on fetching exhibition artworks: {str(e)}")

@router.post("/{module}")
def create_crm_document(module: str, data: DocumentRequest):
    """
    Creates a new document entry in the specified CRM module.
    """
    details = get_table_details(module)
    table = details["table"]
    cstm_table = details["cstm_table"]
    
    doc_id = str(uuid.uuid4())
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    insert_query = f"""
        INSERT INTO {table} (
            id, date_entered, date_modified, modified_user_id, created_by, 
            description, deleted, document_name, filename, active_date, exp_date, category_id
        ) VALUES (%s, %s, %s, '1', '1', %s, 0, %s, %s, %s, %s, %s);
    """
    
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(insert_query, (
                doc_id, now, now, data.description, data.document_name, data.filename,
                data.active_date or None, data.exp_date or None, data.category_id or None
            ))
            
            if cstm_table:
                if module.lower() == "framerheaven":
                    cursor.execute(
                        f"INSERT INTO {cstm_table} (id_c, is_featured_c) VALUES (%s, %s);",
                        (doc_id, data.is_featured_c)
                    )
                else:
                    cursor.execute(f"INSERT INTO {cstm_table} (id_c) VALUES (%s);", (doc_id,))
                
            connection.commit()
            return {"success": True, "id": doc_id, "message": f"{module.capitalize()} record created successfully."}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create {module} document: {str(e)}")
    finally:
        connection.close()

@router.put("/{module}/{doc_id}")
def update_crm_document(module: str, doc_id: str, data: DocumentRequest):
    """
    Updates an existing document entry in the specified CRM module.
    """
    details = get_table_details(module)
    table = details["table"]
    cstm_table = details["cstm_table"]
    
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    update_query = f"""
        UPDATE {table} SET
            date_modified = %s,
            description = %s,
            document_name = %s,
            filename = %s,
            active_date = %s,
            exp_date = %s,
            category_id = %s
        WHERE id = %s AND deleted = 0;
    """
    
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(update_query, (
                now, data.description, data.document_name, data.filename,
                data.active_date or None, data.exp_date or None, data.category_id or None,
                doc_id
            ))
            
            if cstm_table:
                if module.lower() == "framerheaven":
                    cursor.execute(f"SELECT 1 FROM {cstm_table} WHERE id_c = %s;", (doc_id,))
                    exists = cursor.fetchone()
                    if exists:
                        cursor.execute(
                            f"UPDATE {cstm_table} SET is_featured_c = %s WHERE id_c = %s;",
                            (data.is_featured_c, doc_id)
                        )
                    else:
                        cursor.execute(
                            f"INSERT INTO {cstm_table} (id_c, is_featured_c) VALUES (%s, %s);",
                            (doc_id, data.is_featured_c)
                        )
                
            connection.commit()
            return {"success": True, "message": f"{module.capitalize()} record updated successfully."}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update {module} document: {str(e)}")
    finally:
        connection.close()

@router.delete("/{module}/{doc_id}")
def delete_crm_document(module: str, doc_id: str):
    """
    Soft-deletes a document record.
    """
    details = get_table_details(module)
    table = details["table"]
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    query = f"UPDATE {table} SET deleted = 1, date_modified = %s WHERE id = %s;"
    
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(query, (now, doc_id))
            connection.commit()
            return {"success": True, "message": f"{module.capitalize()} record deleted successfully."}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete {module} record: {str(e)}")
    finally:
        connection.close()

@router.post("/{module}/import")
def import_crm_documents(module: str, data: DocumentImportList):
    """
    Batch imports records into the specified module.
    """
    details = get_table_details(module)
    table = details["table"]
    cstm_table = details["cstm_table"]
    
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    success_count = 0
    
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            for doc in data.documents:
                doc_id = str(uuid.uuid4())
                insert_query = f"""
                    INSERT INTO {table} (
                        id, date_entered, date_modified, modified_user_id, created_by, 
                        description, deleted, document_name, filename, active_date, exp_date, category_id
                    ) VALUES (%s, %s, %s, '1', '1', %s, 0, %s, %s, %s, %s, %s);
                """
                cursor.execute(insert_query, (
                    doc_id, now, now, doc.description, doc.document_name, doc.filename,
                    doc.active_date or None, doc.exp_date or None, doc.category_id or None
                ))
                
                if cstm_table:
                    if module.lower() == "framerheaven":
                        cursor.execute(
                            f"INSERT INTO {cstm_table} (id_c, is_featured_c) VALUES (%s, %s);",
                            (doc_id, doc.is_featured_c)
                        )
                    else:
                        cursor.execute(f"INSERT INTO {cstm_table} (id_c) VALUES (%s);", (doc_id,))
                success_count += 1
            connection.commit()
            return {"success": True, "message": f"Successfully imported {success_count} {module} records."}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Batch import failed: {str(e)}")
    finally:
        connection.close()

# --- EXHIBITIONS BANNER CONFIGURATION & SERVICE ---

BANNER_CONFIG_PATH = os.path.join(Config.UPLOAD_DIR, "exhibition_banner_config.json").replace("\\", "/")

class BannerConfigRequest(BaseModel):
    mode: str
    title: str = ""
    subtitle: str = ""
    bgColor: str = "#ffffff"
    textColor: str = "#8fa499"
    subtitleColor: str = "#cfa15c"
    borderColor: str = "#8fa499"
    hasPlaneIllustration: bool = True
    customImage: str = ""
    illustrationImage: str = "default_pakistan_airplane_map.png"

def load_banner_config():
    if os.path.exists(BANNER_CONFIG_PATH):
        try:
            with open(BANNER_CONFIG_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error reading banner config: {e}")
    return {
        "mode": "template",
        "title": "WE DELIVER ARTWORKS WORLD WIDE.",
        "subtitle": "FREE DELIVERY ALL OVER PAKISTAN.",
        "bgColor": "#ffffff",
        "textColor": "#8fa499",
        "subtitleColor": "#cfa15c",
        "borderColor": "#8fa499",
        "hasPlaneIllustration": True,
        "customImage": "",
        "illustrationImage": "default_pakistan_airplane_map.png"
    }

def save_banner_config(config):
    os.makedirs(os.path.dirname(BANNER_CONFIG_PATH), exist_ok=True)
    with open(BANNER_CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2, ensure_ascii=False)

@router.get("/exhibitions/banner")
def get_exhibitions_banner():
    """
    Gets the current exhibitions page banner configuration.
    """
    return load_banner_config()

@router.post("/exhibitions/banner")
def update_exhibitions_banner(data: BannerConfigRequest):
    """
    Updates the exhibitions banner configuration.
    """
    config = data.dict()
    try:
        save_banner_config(config)
        return {"success": True, "message": "Banner configuration updated successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save banner configuration: {str(e)}")

@router.post("/exhibitions/banner/upload")
def upload_banner_asset(file: UploadFile = File(...)):
    """
    Uploads an image asset for the banner.
    """
    upload_dir = Config.UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)
    
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".png", ".jpg", ".jpeg", ".webp", ".gif"]:
        raise HTTPException(status_code=400, detail="Invalid image file format.")
        
    unique_filename = f"banner_asset_{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(upload_dir, unique_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return {"success": True, "filename": unique_filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded banner asset: {str(e)}")

@router.get("/exhibitions/banner/image/{filename}")
def get_banner_image(filename: str):
    """
    Serves a banner image from the upload directory.
    """
    upload_dir = Config.UPLOAD_DIR
    file_path = os.path.join(upload_dir, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Banner image not found.")
        
    media_type = "image/png"
    if filename.lower().endswith(".jpg") or filename.lower().endswith(".jpeg"):
        media_type = "image/jpeg"
    elif filename.lower().endswith(".webp"):
        media_type = "image/webp"
    elif filename.lower().endswith(".gif"):
        media_type = "image/gif"
        
    return FileResponse(file_path, media_type=media_type)

