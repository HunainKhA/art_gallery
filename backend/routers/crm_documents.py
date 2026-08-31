import uuid
import os
import json
import shutil
from datetime import datetime
try:
    from PIL import Image, ImageOps
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel
from database import execute_query, get_db_connection
from config import Config

def optimize_and_save_image(file_obj, output_path, max_dimension=1920, quality=82):
    """
    Auto-resizes and optimizes any uploaded image (even 20MB raw/phone photos)
    to a crisp, ultra-fast web-ready file under ~500KB-1MB with auto-orientation.
    """
    if not HAS_PIL:
        try:
            file_obj.seek(0)
        except Exception:
            pass
        with open(output_path, "wb") as buffer:
            shutil.copyfileobj(file_obj, buffer)
        return True

    try:
        image = Image.open(file_obj)
        # Auto-orient based on EXIF (fixes sideways mobile phone photos)
        image = ImageOps.exif_transpose(image)
        
        # Proportional resize if larger than max_dimension
        width, height = image.size
        if width > max_dimension or height > max_dimension:
            if width > height:
                new_width = max_dimension
                new_height = int(height * (max_dimension / width))
            else:
                new_height = max_dimension
                new_width = int(width * (max_dimension / height))
            image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
        ext = os.path.splitext(output_path)[1].lower()
        if ext in ['.jpg', '.jpeg']:
            if image.mode in ('RGBA', 'P', 'LA'):
                image = image.convert('RGB')
            image.save(output_path, format='JPEG', quality=quality, optimize=True, progressive=True)
        elif ext == '.webp':
            image.save(output_path, format='WEBP', quality=quality, method=6)
        elif ext == '.png':
            image.save(output_path, format='PNG', optimize=True)
        else:
            image.save(output_path, quality=quality, optimize=True)
        return True
    except Exception as e:
        print(f"PIL optimization failed, fallback to raw copy: {e}")
        try:
            file_obj.seek(0)
        except Exception:
            pass
        with open(output_path, "wb") as buffer:
            shutil.copyfileobj(file_obj, buffer)
        return False


router = APIRouter(prefix="/api/crm", tags=["CRM Unified Documents"])

class DocumentRequest(BaseModel):
    document_name: str
    filename: str = ""
    description: str = ""
    active_date: str = None  # YYYY-MM-DD
    exp_date: str = None  # YYYY-MM-DD
    category_id: str = None
    is_featured_c: int = 0
    artist_id: str = None
    artwork_ids: str = None
    guest_pics: str = None
    show_type: str = "solo"
    group_artist_ids: str = None
    video_url: str = None

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
    elif module.lower() == "exhibitions" and cstm_table:
        query = f"""
            SELECT t.id, t.document_name, t.filename, t.description, t.active_date, t.exp_date, t.date_entered, t.category_id,
                   c.artist_id_c AS artist_id, c.artwork_ids_c AS artwork_ids, c.guest_pics_c AS guest_pics,
                   c.show_type_c AS show_type, c.group_artist_ids_c AS group_artist_ids, c.video_url_c AS video_url,
                   CONCAT(COALESCE(a.first_name, ''), ' ', COALESCE(a.last_name, '')) AS artist_name
            FROM {table} t
            LEFT JOIN {cstm_table} c ON t.id = c.id_c
            LEFT JOIN art_artists a ON c.artist_id_c = a.id AND a.deleted = 0
            WHERE t.deleted = 0
            ORDER BY t.date_entered DESC;
        """
    elif module.lower() == "catalogues" and cstm_table:
        query = f"""
            SELECT t.id, t.document_name, t.filename, t.description, t.active_date, t.exp_date, t.date_entered, t.category_id,
                   c.artist_id_c AS artist_id, c.artwork_ids_c AS artwork_ids, NULL AS guest_pics,
                   CONCAT(COALESCE(a.first_name, ''), ' ', COALESCE(a.last_name, '')) AS artist_name
            FROM {table} t
            LEFT JOIN {cstm_table} c ON t.id = c.id_c
            LEFT JOIN art_artists a ON c.artist_id_c = a.id AND a.deleted = 0
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
        # Convert date objects to string for JSON serialization and filter out missing files
        filtered_results = []
        upload_dir = Config.UPLOAD_DIR
        for r in results:
            if r.get("active_date"):
                r["active_date"] = str(r["active_date"])
            if r.get("exp_date"):
                r["exp_date"] = str(r["exp_date"])
            if r.get("is_featured_c") is not None:
                # Convert tinyint/boolean to integer 0/1 for response consistency
            filtered_results.append(r)
            
        return filtered_results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error on fetching {module}: {str(e)}")

@router.get("/exhibitions/{exhibition_id}/artworks")
def get_exhibition_artworks(exhibition_id: str):
    """
    Fetches all artworks associated with a specific exhibition (Active, Upcoming, or Past).
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
            m.name AS medium_name,
            a.id AS artist_id,
            CONCAT(COALESCE(a.first_name, ''), ' ', COALESCE(a.last_name, '')) AS artist_name,
            COALESCE(cstm_a.artist_biography_c, a.description) AS artist_bio,
            a.filename AS artist_profile_image
        FROM art_collections c
        LEFT JOIN art_collections_cstm cstm ON c.id = cstm.id_c
        INNER JOIN art_exhibitions_art_collections_1_c rel
            ON c.id = rel.art_exhibitions_art_collections_1art_collections_idb AND rel.deleted = 0
        LEFT JOIN art_artists_art_collections_c art_rel 
            ON c.id = art_rel.art_artists_art_collectionsart_collections_idb AND art_rel.deleted = 0
        LEFT JOIN art_artists a 
            ON art_rel.art_artists_art_collectionsart_artists_ida = a.id AND a.deleted = 0
        LEFT JOIN art_artists_cstm cstm_a
            ON a.id = cstm_a.id_c
        LEFT JOIN art_medium_art_collections_c med_rel
            ON c.id = med_rel.art_medium_art_collectionsart_collections_idb AND med_rel.deleted = 0
        LEFT JOIN art_medium m
            ON med_rel.art_medium_art_collectionsart_medium_ida = m.id AND m.deleted = 0
        WHERE rel.art_exhibitions_art_collections_1art_exhibitions_ida = %s AND c.deleted = 0
        ORDER BY c.date_entered DESC;
    """
    try:
        artworks = execute_query(query, (exhibition_id,))
        
        # Fallback 1: Check artwork_ids_c CSV in art_exhibitions_cstm (e.g. newly created upcoming shows)
        if not artworks:
            cstm_res = execute_query("SELECT artwork_ids_c FROM art_exhibitions_cstm WHERE id_c = %s;", (exhibition_id,), fetch="one")
            if cstm_res and cstm_res.get("artwork_ids_c"):
                csv_ids = [aid.strip() for aid in cstm_res["artwork_ids_c"].split(",") if aid.strip()]
                if csv_ids:
                    placeholders = ', '.join(['%s'] * len(csv_ids))
                    fallback_query = f"""
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
                            m.name AS medium_name,
                            a.id AS artist_id,
                            CONCAT(COALESCE(a.first_name, ''), ' ', COALESCE(a.last_name, '')) AS artist_name,
                            COALESCE(cstm_a.artist_biography_c, a.description) AS artist_bio,
                            a.filename AS artist_profile_image
                        FROM art_collections c
                        LEFT JOIN art_collections_cstm cstm ON c.id = cstm.id_c
                        LEFT JOIN art_artists_art_collections_c art_rel 
                            ON c.id = art_rel.art_artists_art_collectionsart_collections_idb AND art_rel.deleted = 0
                        LEFT JOIN art_artists a 
                            ON art_rel.art_artists_art_collectionsart_artists_ida = a.id AND a.deleted = 0
                        LEFT JOIN art_artists_cstm cstm_a
                            ON a.id = cstm_a.id_c
                        LEFT JOIN art_medium_art_collections_c med_rel
                            ON c.id = med_rel.art_medium_art_collectionsart_collections_idb AND med_rel.deleted = 0
                        LEFT JOIN art_medium m
                            ON med_rel.art_medium_art_collectionsart_medium_ida = m.id AND m.deleted = 0
                        WHERE c.id IN ({placeholders}) AND c.deleted = 0
                        ORDER BY FIELD(c.id, {placeholders});
                    """
                    artworks = execute_query(fallback_query, tuple(csv_ids + csv_ids))
        
        # Fallback 2: Check artist_id_c if solo exhibition
        if not artworks:
            ex_cstm = execute_query("SELECT artist_id_c FROM art_exhibitions_cstm WHERE id_c = %s;", (exhibition_id,), fetch="one")
            if ex_cstm and ex_cstm.get("artist_id_c"):
                artist_id = ex_cstm["artist_id_c"]
                artist_query = """
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
                        m.name AS medium_name,
                        a.id AS artist_id,
                        CONCAT(COALESCE(a.first_name, ''), ' ', COALESCE(a.last_name, '')) AS artist_name,
                        COALESCE(cstm_a.artist_biography_c, a.description) AS artist_bio,
                        a.filename AS artist_profile_image
                    FROM art_collections c
                    LEFT JOIN art_collections_cstm cstm ON c.id = cstm.id_c
                    INNER JOIN art_artists_art_collections_c art_rel 
                        ON c.id = art_rel.art_artists_art_collectionsart_collections_idb AND art_rel.deleted = 0
                    INNER JOIN art_artists a 
                        ON art_rel.art_artists_art_collectionsart_artists_ida = a.id AND a.deleted = 0
                    LEFT JOIN art_artists_cstm cstm_a
                        ON a.id = cstm_a.id_c
                    LEFT JOIN art_medium_art_collections_c med_rel
                        ON c.id = med_rel.art_medium_art_collectionsart_collections_idb AND med_rel.deleted = 0
                    LEFT JOIN art_medium m
                        ON med_rel.art_medium_art_collectionsart_medium_ida = m.id AND m.deleted = 0
                    WHERE a.id = %s AND c.deleted = 0
                    ORDER BY c.date_entered DESC
                    LIMIT 50;
                """
                artworks = execute_query(artist_query, (artist_id,))

        for art in artworks:
            try:
                art["price"] = float(art["price"]) if art["price"] else 0.0
            except (ValueError, TypeError):
                art["price"] = 0.0
        return artworks
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error on fetching exhibition artworks: {str(e)}")

@router.get("/exhibitions/image/{exhibition_id}")
def get_exhibition_cover_image(exhibition_id: str):
    """
    Serves the cover image for an exhibition. Searches by exhibition ID, filename,
    or falls back to the first artwork's image in the exhibition.
    """
    import os
    from fastapi.responses import RedirectResponse, FileResponse
    
    upload_dir = Config.UPLOAD_DIR
    
    def find_file(name):
        if not name:
            return None
        direct = os.path.join(upload_dir, name)
        if os.path.exists(direct) and os.path.isfile(direct):
            return direct
        name_lower = name.lower()
        try:
            for root, dirs, files in os.walk(upload_dir):
                for f in files:
                    if f.lower() == name_lower:
                        return os.path.join(root, f)
        except Exception:
            pass
        return None

    def try_serve(filename):
        if not filename:
            return None
        path = find_file(filename)
        if path:
            ext = os.path.splitext(path)[1].lower()
            media_type = "image/jpeg"
            if ext == ".png":
                media_type = "image/png"
            elif ext == ".webp":
                media_type = "image/webp"
            elif ext == ".gif":
                media_type = "image/gif"
            return FileResponse(path, media_type=media_type)
        return None

    # 1. Check exhibition ID directly or with extensions
    match = try_serve(exhibition_id)
    if match:
        return match
    for ext in ['.jpg', '.jpeg', '.png', '.webp', '.JPG', '.PNG']:
        match = try_serve(f"{exhibition_id}{ext}")
        if match:
            return match

    # 2. Query the exhibition document to get the uploaded cover filename
    try:
        ex_query = "SELECT filename, document_name FROM art_exhibitions WHERE id = %s AND deleted = 0;"
        ex_res = execute_query(ex_query, (exhibition_id,), fetch="one")
        if ex_res:
            if ex_res.get("filename"):
                match = try_serve(ex_res["filename"])
                if match:
                    return match
            if ex_res.get("document_name"):
                doc_name = ex_res["document_name"].strip()
                for ext in ['.jpg', '.jpeg', '.png', '.webp', '.JPG', '.PNG']:
                    match = try_serve(f"{doc_name}{ext}")
                    if match:
                        return match
    except Exception as e:
        print(f"Error checking exhibition filename: {e}")

    # 3. Query linked artworks in this exhibition
    try:
        art_query = """
            SELECT c.id, c.filename, c.document_name 
            FROM art_collections c
            INNER JOIN art_exhibitions_art_collections_1_c rel
                ON c.id = rel.art_exhibitions_art_collections_1art_collections_idb AND rel.deleted = 0
            WHERE rel.art_exhibitions_art_collections_1art_exhibitions_ida = %s AND c.deleted = 0
            ORDER BY c.date_entered ASC
            LIMIT 20;
        """
        art_rows = execute_query(art_query, (exhibition_id,))
        for art in art_rows:
            # Try art id
            match = try_serve(art["id"])
            if match:
                return match
            for ext in ['.jpg', '.jpeg', '.png', '.webp', '.JPG', '.PNG']:
                match = try_serve(f"{art['id']}{ext}")
                if match:
                    return match
            # Try art filename
            if art.get("filename"):
                match = try_serve(art["filename"])
                if match:
                    return match
    except Exception as e:
        print(f"Error checking exhibition artwork filename: {e}")

    # 4. Check custom CSV artwork_ids_c in art_exhibitions_cstm
    try:
        cstm_query = "SELECT artwork_ids_c FROM art_exhibitions_cstm WHERE id_c = %s;"
        cstm_res = execute_query(cstm_query, (exhibition_id,), fetch="one")
        if cstm_res and cstm_res.get("artwork_ids_c"):
            csv_ids = [aid.strip() for aid in cstm_res["artwork_ids_c"].split(",") if aid.strip()]
            for aid in csv_ids:
                match = try_serve(aid)
                if match:
                    return match
                for ext in ['.jpg', '.jpeg', '.png', '.webp', '.JPG', '.PNG']:
                    match = try_serve(f"{aid}{ext}")
                    if match:
                        return match
    except Exception as e:
        print(f"Error checking exhibition custom artwork_ids: {e}")

    # 5. Fallback placeholder
    return RedirectResponse(url="https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=500")


@router.get("/catalogues/{catalogue_id}/artworks")
def get_catalogue_artworks(catalogue_id: str):
    """
    Fetches all artworks associated with a specific custom catalogue.
    """
    query = "SELECT artwork_ids_c FROM art_catalogues_cstm WHERE id_c = %s;"
    try:
        res = execute_query(query, (catalogue_id,), fetch="one")
        artwork_ids = []
        if res and res.get("artwork_ids_c"):
            artwork_ids = [aid.strip() for aid in res["artwork_ids_c"].split(",") if aid.strip()]
            
        # Fallback: If not found directly, check by document_name or ID in art_exhibitions
        if not artwork_ids:
            cat_info = execute_query("SELECT document_name FROM art_catalogues WHERE id = %s;", (catalogue_id,), fetch="one")
            if cat_info and cat_info.get("document_name"):
                doc_name = cat_info["document_name"]
                ex_match = execute_query("SELECT id FROM art_exhibitions WHERE document_name = %s AND deleted = 0 LIMIT 1;", (doc_name,), fetch="one")
                if ex_match and ex_match.get("id"):
                    ex_id = ex_match["id"]
                    rel_arts = execute_query("""
                        SELECT art_exhibitions_art_collections_1art_collections_idb AS aid 
                        FROM art_exhibitions_art_collections_1_c 
                        WHERE art_exhibitions_art_collections_1art_exhibitions_ida = %s AND deleted = 0
                    """, (ex_id,), fetch="all")
                    if rel_arts:
                        artwork_ids = [r["aid"] for r in rel_arts if r.get("aid")]
                    else:
                        ex_cstm = execute_query("SELECT artwork_ids_c FROM art_exhibitions_cstm WHERE id_c = %s;", (ex_id,), fetch="one")
                        if ex_cstm and ex_cstm.get("artwork_ids_c"):
                            artwork_ids = [aid.strip() for aid in ex_cstm["artwork_ids_c"].split(",") if aid.strip()]
                            
        if not artwork_ids:
            return []
            
        format_strings = ','.join(['%s'] * len(artwork_ids))
        art_query = f"""
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
            LEFT JOIN art_artists_art_collections_c art_rel 
                ON c.id = art_rel.art_artists_art_collectionsart_collections_idb AND art_rel.deleted = 0
            LEFT JOIN art_artists a 
                ON art_rel.art_artists_art_collectionsart_artists_ida = a.id AND a.deleted = 0
            WHERE c.id IN ({format_strings}) AND c.deleted = 0
            ORDER BY c.date_entered DESC;
        """
        artworks = execute_query(art_query, tuple(artwork_ids))
        
        # Order the artworks to match the selection sequence
        found_artworks = {art["id"]: art for art in artworks}
        ordered_artworks = []
        for aid in artwork_ids:
            if aid in found_artworks:
                ordered_artworks.append(found_artworks[aid])
                
        for art in ordered_artworks:
            try:
                art["price"] = float(art["price"]) if art["price"] else 0.0
            except (ValueError, TypeError):
                art["price"] = 0.0
        return ordered_artworks
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error on fetching catalogue artworks: {str(e)}")

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
                elif module.lower() == "exhibitions":
                    cursor.execute(
                        f"INSERT INTO {cstm_table} (id_c, artist_id_c, artwork_ids_c, guest_pics_c, show_type_c, group_artist_ids_c, video_url_c) VALUES (%s, %s, %s, %s, %s, %s, %s);",
                        (doc_id, data.artist_id or None, data.artwork_ids or None, data.guest_pics or None,
                         data.show_type or 'solo', data.group_artist_ids or None, data.video_url or None)
                    )
                elif module.lower() == "catalogues":
                    cursor.execute(
                        f"INSERT INTO {cstm_table} (id_c, artist_id_c, artwork_ids_c) VALUES (%s, %s, %s);",
                        (doc_id, data.artist_id or None, data.artwork_ids or None)
                    )
                else:
                    cursor.execute(f"INSERT INTO {cstm_table} (id_c) VALUES (%s);", (doc_id,))
            
            if module.lower() == "exhibitions":
                # Automatically create a corresponding catalogue record
                cat_id = str(uuid.uuid4())
                cursor.execute(
                    """
                    INSERT INTO art_catalogues (
                        id, date_entered, date_modified, modified_user_id, created_by, 
                        description, deleted, document_name, filename, active_date, exp_date
                    ) VALUES (%s, %s, %s, '1', '1', %s, 0, %s, %s, %s, %s);
                    """,
                    (cat_id, now, now, data.description, data.document_name, data.filename,
                     data.active_date or None, data.exp_date or None)
                )
                cursor.execute(
                    "INSERT INTO art_catalogues_cstm (id_c) VALUES (%s);",
                    (cat_id,)
                )
                
                # Sync relationships in art_exhibitions_art_collections_1_c
                if data.artwork_ids:
                    art_ids = [aid.strip() for aid in data.artwork_ids.split(",") if aid.strip()]
                    for art_id in art_ids:
                        rel_id = str(uuid.uuid4())
                        cursor.execute(
                            """
                            INSERT INTO art_exhibitions_art_collections_1_c (
                                id, date_modified, deleted, 
                                art_exhibitions_art_collections_1art_exhibitions_ida, 
                                art_exhibitions_art_collections_1art_collections_idb
                            ) VALUES (%s, %s, 0, %s, %s);
                            """,
                            (rel_id, now, doc_id, art_id)
                        )
                
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
                elif module.lower() == "exhibitions":
                    cursor.execute(f"SELECT 1 FROM {cstm_table} WHERE id_c = %s;", (doc_id,))
                    exists = cursor.fetchone()
                    if exists:
                        cursor.execute(
                            f"UPDATE {cstm_table} SET artist_id_c = %s, artwork_ids_c = %s, guest_pics_c = %s, show_type_c = %s, group_artist_ids_c = %s, video_url_c = %s WHERE id_c = %s;",
                            (data.artist_id or None, data.artwork_ids or None, data.guest_pics or None,
                             data.show_type or 'solo', data.group_artist_ids or None, data.video_url or None, doc_id)
                        )
                    else:
                        cursor.execute(
                            f"INSERT INTO {cstm_table} (id_c, artist_id_c, artwork_ids_c, guest_pics_c, show_type_c, group_artist_ids_c, video_url_c) VALUES (%s, %s, %s, %s, %s, %s, %s);",
                            (doc_id, data.artist_id or None, data.artwork_ids or None, data.guest_pics or None,
                             data.show_type or 'solo', data.group_artist_ids or None, data.video_url or None)
                        )
                elif module.lower() == "catalogues":
                    cursor.execute(f"SELECT 1 FROM {cstm_table} WHERE id_c = %s;", (doc_id,))
                    exists = cursor.fetchone()
                    if exists:
                        cursor.execute(
                            f"UPDATE {cstm_table} SET artist_id_c = %s, artwork_ids_c = %s WHERE id_c = %s;",
                            (data.artist_id or None, data.artwork_ids or None, doc_id)
                        )
                    else:
                        cursor.execute(
                            f"INSERT INTO {cstm_table} (id_c, artist_id_c, artwork_ids_c) VALUES (%s, %s, %s);",
                            (doc_id, data.artist_id or None, data.artwork_ids or None)
                        )
            
            if module.lower() == "exhibitions":
                # Clear existing relationships for this exhibition
                cursor.execute(
                    "UPDATE art_exhibitions_art_collections_1_c SET deleted = 1 WHERE art_exhibitions_art_collections_1art_exhibitions_ida = %s;",
                    (doc_id,)
                )
                # Insert new relationships if artwork_ids is provided
                if data.artwork_ids:
                    art_ids = [aid.strip() for aid in data.artwork_ids.split(",") if aid.strip()]
                    for art_id in art_ids:
                        rel_id = str(uuid.uuid4())
                        cursor.execute(
                            """
                            INSERT INTO art_exhibitions_art_collections_1_c (
                                id, date_modified, deleted, 
                                art_exhibitions_art_collections_1art_exhibitions_ida, 
                                art_exhibitions_art_collections_1art_collections_idb
                            ) VALUES (%s, %s, 0, %s, %s);
                            """,
                            (rel_id, now, doc_id, art_id)
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
                    elif module.lower() == "exhibitions":
                        cursor.execute(
                            f"INSERT INTO {cstm_table} (id_c, artist_id_c, artwork_ids_c, show_type_c, group_artist_ids_c, video_url_c) VALUES (%s, %s, %s, %s, %s, %s);",
                            (doc_id, doc.artist_id or None, doc.artwork_ids or None,
                             doc.show_type or 'solo', doc.group_artist_ids or None, doc.video_url or None)
                        )
                    elif module.lower() == "catalogues":
                        cursor.execute(
                            f"INSERT INTO {cstm_table} (id_c, artist_id_c, artwork_ids_c) VALUES (%s, %s, %s);",
                            (doc_id, doc.artist_id or None, doc.artwork_ids or None)
                        )
                    else:
                        cursor.execute(f"INSERT INTO {cstm_table} (id_c) VALUES (%s);", (doc_id,))
                
                if module.lower() == "exhibitions":
                    # Automatically create a corresponding catalogue record
                    cat_id = str(uuid.uuid4())
                    cursor.execute(
                        """
                        INSERT INTO art_catalogues (
                            id, date_entered, date_modified, modified_user_id, created_by, 
                            description, deleted, document_name, filename, active_date, exp_date
                        ) VALUES (%s, %s, %s, '1', '1', %s, 0, %s, %s, %s, %s);
                        """,
                        (cat_id, now, now, doc.description, doc.document_name, doc.filename,
                         doc.active_date or None, doc.exp_date or None)
                    )
                    cursor.execute(
                        "INSERT INTO art_catalogues_cstm (id_c) VALUES (%s);",
                        (cat_id,)
                    )
                    
                    # Sync relationships in art_exhibitions_art_collections_1_c
                    if doc.artwork_ids:
                        art_ids = [aid.strip() for aid in doc.artwork_ids.split(",") if aid.strip()]
                        for art_id in art_ids:
                            rel_id = str(uuid.uuid4())
                            cursor.execute(
                                """
                                INSERT INTO art_exhibitions_art_collections_1_c (
                                    id, date_modified, deleted, 
                                    art_exhibitions_art_collections_1art_exhibitions_ida, 
                                    art_exhibitions_art_collections_1art_collections_idb
                                ) VALUES (%s, %s, 0, %s, %s);
                                """,
                                (rel_id, now, doc_id, art_id)
                            )
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
        optimize_and_save_image(file.file, file_path, max_dimension=1920, quality=82)
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

@router.post("/exhibitions/upload-guest-pic")
def upload_guest_pic(file: UploadFile = File(...)):
    """
    Uploads a guest photo for an exhibition, auto-resizes & optimizes it to under ~500KB-1MB, and saves it.
    """
    upload_dir = Config.UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)
    
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ['.jpg', '.jpeg', '.png', '.webp']:
        raise HTTPException(status_code=400, detail="Only JPG, JPEG, PNG, and WEBP image files are allowed.")
        
    unique_filename = f"guest_{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(upload_dir, unique_filename)
    
    try:
        optimize_and_save_image(file.file, file_path, max_dimension=1920, quality=82)
        return {"success": True, "filename": unique_filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save guest image: {str(e)}")

@router.get("/exhibitions/guest-pic/{filename}")
def serve_guest_pic(filename: str):
    """
    Serves a guest photo from the upload directory.
    """
    upload_dir = Config.UPLOAD_DIR
    file_path = os.path.join(upload_dir, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image not found")
        
    media_type = "image/png"
    if filename.lower().endswith(".jpg") or filename.lower().endswith(".jpeg"):
        media_type = "image/jpeg"
    elif filename.lower().endswith(".webp"):
        media_type = "image/webp"
        
    return FileResponse(file_path, media_type=media_type)

@router.post("/exhibitions/upload-video")
def upload_exhibition_video(file: UploadFile = File(...)):
    """
    Uploads an exhibition video and saves it in the upload directory.
    """
    upload_dir = Config.UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)
    
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ['.mp4', '.webm', '.ogg', '.mov']:
        raise HTTPException(status_code=400, detail="Only MP4, WebM, OGG, and MOV video files are allowed.")
        
    unique_filename = f"exh_video_{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(upload_dir, unique_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return {"success": True, "filename": unique_filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save video file: {str(e)}")

@router.get("/exhibitions/video/{filename}")
def serve_exhibition_video(filename: str):
    """
    Serves an exhibition video from the upload directory.
    """
    upload_dir = Config.UPLOAD_DIR
    file_path = os.path.join(upload_dir, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Video not found")
        
    media_type = "video/mp4"
    if filename.lower().endswith(".webm"):
        media_type = "video/webm"
    elif filename.lower().endswith(".ogg"):
        media_type = "video/ogg"
    elif filename.lower().endswith(".mov"):
        media_type = "video/quicktime"
        
    return FileResponse(file_path, media_type=media_type)

@router.delete("/exhibitions/video/{filename}")
def delete_video_file(filename: str):
    """
    Physically deletes a video file from the upload directory.
    """
    upload_dir = Config.UPLOAD_DIR
    file_path = os.path.join(upload_dir, filename)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
            return {"success": True, "message": "Video file deleted from server disk."}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to delete video file: {str(e)}")
    raise HTTPException(status_code=404, detail="Video file not found")
