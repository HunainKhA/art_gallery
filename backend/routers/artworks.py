import uuid
import os
import shutil
import time
from datetime import datetime
from fastapi import APIRouter, HTTPException, UploadFile, File, Response, Form
from pydantic import BaseModel
from database import execute_query, get_db_connection
from config import Config

router = APIRouter(prefix="/api/artworks", tags=["Artworks"])

class ArtworkRequest(BaseModel):
    title: str
    description: str = ""
    status: str = "Available"
    price: float = 0.0
    length: float = 0.0
    width: float = 0.0
    with_frame: str = "0"
    frame_charges: float = 0.0
    code: str = ""
    artist_id: str = None
    category_id: str = None
    medium_id: str = None
    image: str = ""
    authenticity_letter: str = ""
    deal_type: str = "Sale_Basis"
    purchase_price: float = 0.0

class ArtworkImportList(BaseModel):
    artworks: list[ArtworkRequest]

class ArtworkStatusRequest(BaseModel):
    status: str


@router.get("/categories")
def get_artwork_categories():
    """
    Fetches all unique categories and their artwork counts dynamically.
    """
    query = """
        SELECT 
            t.name AS name,
            COUNT(c.id) AS count,
            MIN(c.id) AS image_id
        FROM art_collections c
        LEFT JOIN art_collectionstype_art_collections_c type_rel
            ON c.id = type_rel.art_collectionstype_art_collectionsart_collections_idb AND type_rel.deleted = 0
        LEFT JOIN art_collectionstype t
            ON type_rel.art_collectionstype_art_collectionsart_collectionstype_ida = t.id AND t.deleted = 0
        WHERE c.deleted = 0 AND t.name IS NOT NULL AND t.deleted = 0
        GROUP BY t.name
        ORDER BY t.name ASC;
    """
    try:
        categories = execute_query(query)
        return categories
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("")
def get_all_artworks(category: str = None, artist_id: str = None, medium_id: str = None, status: str = None, code: str = None, search: str = None, page: int = 1, limit: int = 10000):
    """
    Fetches artworks from the database with pagination, filtering by category, artist, code, or search term.
    """
    cache_key = f"{category}_{artist_id}_{medium_id}_{status}_{code}_{search}_{limit}_{page}"
    
    def run_query():
        where_clauses = ["c.deleted = 0"]
        params = []
        
        if category:
            where_clauses.append("(t.id = %s OR t.name = %s)")
            params.extend([category, category])
            
        if artist_id:
            where_clauses.append("a.id = %s")
            params.append(artist_id)
            
        if medium_id:
            where_clauses.append("m.id = %s")
            params.append(medium_id)
            
        if status:
            where_clauses.append("c.collection_status = %s")
            params.append(status)
            
        if code:
            where_clauses.append("cstm.code_c = %s")
            params.append(code)
            
        if search:
            where_clauses.append("(c.document_name LIKE %s OR cstm.code_c LIKE %s OR a.first_name LIKE %s OR a.last_name LIKE %s)")
            search_param = f"%{search}%"
            params.extend([search_param, search_param, search_param, search_param])
            
        where_str = " AND ".join(where_clauses)
        offset = (page - 1) * limit
        
        query = f"""
            SELECT 
                c.id AS id,
                c.document_name AS title,
                c.filename AS image,
                c.description AS description,
                c.collection_status AS status,
                COALESCE(NULLIF(cstm.sale_gallery_price_c, ''), NULLIF(cstm.purchase_price_c, ''), 0) AS price,
                cstm.collection_size_length_c AS length,
                cstm.collection_size_width_c AS width,
                cstm.with_frame_c AS with_frame,
                cstm.frame_charges_c AS frame_charges,
                cstm.code_c AS code,
                cstm.authenticity_letter_field_c AS authenticity_letter,
                cstm.sale_c AS deal_type,
                cstm.purchase_price_c AS purchase_price,
                a.id AS artist_id,
                CONCAT(COALESCE(a.first_name, ''), ' ', COALESCE(a.last_name, '')) AS artist_name,
                t.id AS category_id,
                t.name AS category_name,
                m.id AS medium_id,
                m.name AS medium_name,
                IF(exh_rel.art_id IS NOT NULL, 1, 0) AS is_exhibited
            FROM art_collections c
            LEFT JOIN art_collections_cstm cstm ON c.id = cstm.id_c
            LEFT JOIN art_artists_art_collections_c rel 
                ON c.id = rel.art_artists_art_collectionsart_collections_idb AND rel.deleted = 0
            LEFT JOIN art_artists a 
                ON rel.art_artists_art_collectionsart_artists_ida = a.id AND a.deleted = 0
            LEFT JOIN art_collectionstype_art_collections_c type_rel
                ON c.id = type_rel.art_collectionstype_art_collectionsart_collections_idb AND type_rel.deleted = 0
            LEFT JOIN art_collectionstype t
                ON type_rel.art_collectionstype_art_collectionsart_collectionstype_ida = t.id AND t.deleted = 0
            LEFT JOIN art_medium_art_collections_c med_rel
                ON c.id = med_rel.art_medium_art_collectionsart_collections_idb AND med_rel.deleted = 0
            LEFT JOIN art_medium m
                ON med_rel.art_medium_art_collectionsart_medium_ida = m.id AND m.deleted = 0
            LEFT JOIN (
                SELECT DISTINCT art_exhibitions_art_collections_1art_collections_idb AS art_id
                FROM art_exhibitions_art_collections_1_c
                WHERE deleted = 0
            ) exh_rel ON c.id = exh_rel.art_id
            WHERE {where_str}
            ORDER BY c.date_entered DESC
            LIMIT %s OFFSET %s;
        """
        params.extend([limit, offset])
        
        artworks = execute_query(query, tuple(params))
        for art in artworks:
            try:
                raw_p = str(art["price"]).replace(",", "").replace("$", "").replace("Rs.", "").replace("PKR", "").strip() if art["price"] else "0"
                art["price"] = float(raw_p) if raw_p else 0.0
            except (ValueError, TypeError):
                art["price"] = 0.0
            
            try:
                art["purchase_price"] = float(art["purchase_price"]) if art["purchase_price"] else 0.0
            except ValueError:
                art["purchase_price"] = 0.0
                
            art["deal_type"] = art["deal_type"] if art["deal_type"] else "Sale_Basis"
            
            try:
                art["length"] = float(art["length"]) if art["length"] else 0.0
                art["width"] = float(art["width"]) if art["width"] else 0.0
            except ValueError:
                art["length"] = 0.0
                art["width"] = 0.0
                
        return artworks

    try:
        return run_query()
    except Exception as e:
        import traceback
        print(f"[ERROR in get_all_artworks]: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/global-template")
def get_global_template():
    """
    Serves the global template image.
    """
    from fastapi.responses import RedirectResponse
    upload_dir = Config.UPLOAD_DIR
    
    for ext in [".png", ".jpg", ".jpeg", ".webp"]:
        file_path = os.path.join(upload_dir, f"global_authenticity_template{ext}")
        if os.path.exists(file_path):
            media_type = "image/png" if ext == ".png" else "image/webp" if ext == ".webp" else "image/jpeg"
            with open(file_path, "rb") as f:
                return Response(content=f.read(), media_type=media_type)
            
    # Return transparent 1x1 image fallback directly if not configured
    import base64
    transparent_gif = base64.b64decode("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7")
    return Response(content=transparent_gif, media_type="image/gif", headers={"Cache-Control": "no-cache, must-revalidate"})

@router.get("/logo")
def get_mainframe_logo():
    """
    Serves the logo from the uploads or assets folder.
    """
    from fastapi.responses import HTMLResponse
    import os
    
    # 1. Search in configured UPLOAD_DIR and frontend roots (Prioritizing the official square logo)
    search_paths = [
        "/var/www/html/website/favicon.png",
        "/var/www/html/dashboard/favicon.png",
        os.path.join(Config.WORKSPACE_ROOT, "website", "public", "favicon.png"),
        os.path.join(Config.WORKSPACE_ROOT, "dashboard", "public", "favicon.png"),
        os.path.join(Config.UPLOAD_DIR, "logo.png"),
        os.path.join(Config.UPLOAD_DIR, "logo.jpg"),
        os.path.join(Config.UPLOAD_DIR, "logo.svg"),
        os.path.join(Config.WORKSPACE_ROOT, "website", "logo.jpg"),
        os.path.join(Config.WORKSPACE_ROOT, "website", "logo.png"),
        os.path.join(Config.WORKSPACE_ROOT, "dashboard", "logo.jpg"),
        "/var/www/html/website/logo.jpg",
        "/var/www/html/dashboard/logo.jpg",
        "/var/www/html/uploads/logo.jpg"
    ]
    
    for logo_path in search_paths:
        if os.path.exists(logo_path):
            media_type = (
                "image/svg+xml" if logo_path.endswith(".svg") 
                else "image/png" if logo_path.endswith(".png") 
                else "image/jpeg"
            )
            with open(logo_path, "rb") as f:
                return Response(content=f.read(), media_type=media_type)
                
    return HTMLResponse(content="<h1>Logo not found</h1>", status_code=404)

@router.get("/signature")
def get_mainframe_signature():
    """
    Serves the owner's signature image.
    """
    import os
    search_paths = [
        "/var/www/html/website/signature.png",
        "/var/www/html/website/signature.jpg",
        "/var/www/html/website/signature.svg",
        "/var/www/html/dashboard/signature.png",
        "/var/www/html/dashboard/signature.jpg",
        "/var/www/html/dashboard/signature.svg",
        "/var/www/html/uploads/signature.png",
        "/var/www/html/uploads/signature.jpg",
        "/var/www/html/uploads/signature.svg",
        os.path.join(Config.UPLOAD_DIR, "signature.png"),
        os.path.join(Config.UPLOAD_DIR, "signature.jpg"),
        os.path.join(Config.UPLOAD_DIR, "signature.svg"),
        os.path.join(Config.WORKSPACE_ROOT, "website", "public", "signature.svg"),
        os.path.join(Config.WORKSPACE_ROOT, "website", "public", "signature.png"),
        os.path.join(Config.WORKSPACE_ROOT, "website", "public", "signature.jpg"),
        os.path.join(Config.WORKSPACE_ROOT, "dashboard", "public", "signature.svg"),
        os.path.join(Config.WORKSPACE_ROOT, "dashboard", "public", "signature.png"),
        os.path.join(Config.WORKSPACE_ROOT, "dashboard", "public", "signature.jpg"),
        os.path.join(Config.WORKSPACE_ROOT, "signature.png"),
        os.path.join(Config.WORKSPACE_ROOT, "signature.jpg"),
        os.path.join(Config.WORKSPACE_ROOT, "signature.svg")
    ]
    
    for sig_path in search_paths:
        if os.path.exists(sig_path):
            media_type = (
                "image/svg+xml" if sig_path.endswith(".svg") 
                else "image/png" if sig_path.endswith(".png") 
                else "image/jpeg"
            )
            with open(sig_path, "rb") as f:
                return Response(content=f.read(), media_type=media_type)
                
    return HTMLResponse(content="<h1>Signature not found</h1>", status_code=404)

@router.post("/upload-signature")
def upload_mainframe_signature(file: UploadFile = File(...)):
    """
    Uploads the owner's signature image file and saves it across public/upload paths.
    """
    import os
    import shutil
    
    allowed_extensions = {".jpg", ".jpeg", ".png", ".svg"}
    filename = file.filename
    ext = os.path.splitext(filename)[1].lower()
    
    if ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Only JPG, JPEG, PNG, and SVG signature images are allowed.")
        
    try:
        target_dirs = [
            Config.UPLOAD_DIR,
            "/var/www/uploads",
            "/var/www/html/website",
            "/var/www/html/dashboard",
            os.path.join(Config.WORKSPACE_ROOT, "website", "public"),
            os.path.join(Config.WORKSPACE_ROOT, "dashboard", "public")
        ]
        
        saved_count = 0
        for d in target_dirs:
            try:
                os.makedirs(d, exist_ok=True)
                for existing_ext in allowed_extensions:
                    old_file = os.path.join(d, f"signature{existing_ext}")
                    if os.path.exists(old_file):
                        os.remove(old_file)
                        
                target_file = os.path.join(d, f"signature{ext}")
                file.file.seek(0)
                with open(target_file, "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)
                saved_count += 1
            except Exception as e:
                print(f"Skipping write to {d}: {e}")
                
        return {"success": True, "message": "Signature uploaded successfully.", "filename": f"signature{ext}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save signature: {str(e)}")

@router.get("/{artwork_id}")
def get_artwork_by_id(artwork_id: str):
    """
    Fetches the details of a single artwork.
    """

    query = """
        SELECT 
            c.id AS id,
            c.document_name AS title,
            c.filename AS image,
            c.description AS description,
            c.collection_status AS status,
            COALESCE(NULLIF(cstm.sale_gallery_price_c, ''), NULLIF(cstm.purchase_price_c, ''), 0) AS price,
            cstm.collection_size_length_c AS length,
            cstm.collection_size_width_c AS width,
            cstm.with_frame_c AS with_frame,
            cstm.frame_charges_c AS frame_charges,
            cstm.code_c AS code,
            cstm.authenticity_letter_field_c AS authenticity_letter,
            cstm.sale_c AS deal_type,
            cstm.purchase_price_c AS purchase_price,
            a.id AS artist_id,
            CONCAT(COALESCE(a.first_name, ''), ' ', COALESCE(a.last_name, '')) AS artist_name,
            a.description AS artist_bio,
            t.id AS category_id,
            t.name AS category_name,
            m.id AS medium_id,
            m.name AS medium_name
        FROM art_collections c
        LEFT JOIN art_collections_cstm cstm ON c.id = cstm.id_c
        LEFT JOIN art_artists_art_collections_c rel 
            ON c.id = rel.art_artists_art_collectionsart_collections_idb AND rel.deleted = 0
        LEFT JOIN art_artists a 
            ON rel.art_artists_art_collectionsart_artists_ida = a.id AND a.deleted = 0
        LEFT JOIN art_collectionstype_art_collections_c type_rel
            ON c.id = type_rel.art_collectionstype_art_collectionsart_collections_idb AND type_rel.deleted = 0
        LEFT JOIN art_collectionstype t
            ON type_rel.art_collectionstype_art_collectionsart_collectionstype_ida = t.id AND t.deleted = 0
        LEFT JOIN art_medium_art_collections_c med_rel
            ON c.id = med_rel.art_medium_art_collectionsart_collections_idb AND med_rel.deleted = 0
        LEFT JOIN art_medium m
            ON med_rel.art_medium_art_collectionsart_medium_ida = m.id AND m.deleted = 0
        WHERE c.id = %s AND c.deleted = 0;
    """
    try:
        artwork = execute_query(query, (artwork_id,), fetch="one")
        if not artwork:
            raise HTTPException(status_code=404, detail="Artwork not found")
            
        try:
            raw_p = str(artwork["price"]).replace(",", "").replace("$", "").replace("Rs.", "").replace("PKR", "").strip() if artwork["price"] else "0"
            artwork["price"] = float(raw_p) if raw_p else 0.0
        except (ValueError, TypeError):
            artwork["price"] = 0.0
            
        try:
            artwork["purchase_price"] = float(artwork["purchase_price"]) if artwork["purchase_price"] else 0.0
        except ValueError:
            artwork["purchase_price"] = 0.0
            
        artwork["deal_type"] = artwork["deal_type"] if artwork["deal_type"] else "Sale_Basis"
            
        try:
            artwork["length"] = float(artwork["length"]) if artwork["length"] else 0.0
            artwork["width"] = float(artwork["width"]) if artwork["width"] else 0.0
        except ValueError:
            artwork["length"] = 0.0
            artwork["width"] = 0.0
            
        return artwork
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

_UPLOAD_FILES_MAP = {}
_LAST_MAP_TIME = 0

def get_upload_map():
    global _UPLOAD_FILES_MAP, _LAST_MAP_TIME
    now = time.time()
    if not _UPLOAD_FILES_MAP or (now - _LAST_MAP_TIME > 300):
        m = {}
        try:
            for entry in os.scandir(Config.UPLOAD_DIR):
                if entry.is_file():
                    m[entry.name.lower()] = entry.path
        except Exception:
            pass
        _UPLOAD_FILES_MAP = m
        _LAST_MAP_TIME = now
    return _UPLOAD_FILES_MAP

@router.get("/image/{artwork_id}")
def get_artwork_image(artwork_id: str):
    """
    Serves the actual image file from SugarCRM's upload directory with ultra-fast memory index and browser cache.
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
        fmap = get_upload_map()
        if name_lower in fmap:
            return fmap[name_lower]
        return None
    
    # Helper to check if file exists and return response with cache header
    def try_serve(filename):
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
            elif ext == ".pdf":
                media_type = "application/pdf"
            return FileResponse(
                path, 
                media_type=media_type,
                headers={"Cache-Control": "public, max-age=2592000, immutable"}
            )
        return None

    # 1. Direct ID match
    direct_match = try_serve(artwork_id)
    if direct_match:
        return direct_match

    # 2. ID with extensions
    for ext in ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.JPG', '.JPEG', '.PNG']:
        match = try_serve(f"{artwork_id}{ext}")
        if match:
            return match

    # 3. Lookup filename and title/code from database
    try:
        query = "SELECT filename, document_name FROM art_collections WHERE (id = %s OR filename = %s) AND deleted = 0;"
        res = execute_query(query, (artwork_id, artwork_id), fetch="one")
        if res:
            if res.get("filename"):
                orig_filename = res["filename"].strip()
                match = try_serve(orig_filename)
                if match:
                    return match
                match = try_serve(os.path.basename(orig_filename))
                if match:
                    return match
            if res.get("document_name"):
                doc_name = res["document_name"].strip()
                for ext in ['.jpg', '.jpeg', '.png', '.webp', '.JPG', '.JPEG', '.PNG']:
                    match = try_serve(f"{doc_name}{ext}")
                    if match:
                        return match
    except Exception as e:
        print(f"Database query failed in get_artwork_image: {e}")

    # 4. If image not found or artwork_id is an artist ID, find artist and scan ALL their paintings on disk
    try:
        artist_match = execute_query("""
            SELECT rel.art_artists_art_collectionsart_artists_ida AS artist_id
            FROM art_artists_art_collections_c rel
            JOIN art_collections col ON rel.art_artists_art_collectionsart_collections_idb = col.id
            WHERE (col.id = %s OR col.filename = %s) AND rel.deleted = 0
            LIMIT 1;
        """, (artwork_id, artwork_id), fetch="one")
        
        target_artist_id = artist_match["artist_id"] if artist_match else artwork_id
        
        artist_arts = execute_query("""
            SELECT col.id, col.filename, col.document_name
            FROM art_collections col
            JOIN art_artists_art_collections_c r2 
              ON col.id = r2.art_artists_art_collectionsart_collections_idb AND r2.deleted = 0
            WHERE r2.art_artists_art_collectionsart_artists_ida = %s AND col.deleted = 0
            ORDER BY col.date_entered DESC;
        """, (target_artist_id,))
        for a_art in (artist_arts or []):
            for cand in [a_art.get("filename"), a_art.get("id"), a_art.get("document_name")]:
                if not cand:
                    continue
                cand_str = str(cand).strip()
                match = try_serve(cand_str)
                if match:
                    return match
                for ext in ['.jpg', '.jpeg', '.png', '.webp', '.JPG', '.JPEG', '.PNG', '_R.jpg']:
                    match = try_serve(f"{cand_str}{ext}")
                    if match:
                        return match
    except Exception as e:
        print(f"Artist fallback scan failed: {e}")
        
    placeholder_svg = """<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
      <rect width="100%" height="100%" fill="#141416" />
      <circle cx="300" cy="300" r="180" fill="none" stroke="#d4af37" stroke-width="1.5" stroke-dasharray="6,4" opacity="0.4" />
      <text x="50%" y="48%" font-family="Montserrat, sans-serif" font-size="28" font-weight="500" fill="#d4af37" text-anchor="middle" letter-spacing="3">MAINFRAME</text>
      <text x="50%" y="54%" font-family="Montserrat, sans-serif" font-size="14" font-weight="300" fill="#a0a0a0" text-anchor="middle" letter-spacing="4">THE GALLERY</text>
    </svg>"""
    return Response(content=placeholder_svg, media_type="image/svg+xml")

@router.post("")
def create_artwork(data: ArtworkRequest):
    """
    Creates a new artwork in the SugarCRM tables.
    """
    artwork_id = str(uuid.uuid4())
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    insert_art = """
        INSERT INTO art_collections (
            id, date_entered, date_modified, modified_user_id, created_by, 
            description, deleted, document_name, filename, collection_status
        ) VALUES (%s, %s, %s, '1', '1', %s, 0, %s, %s, %s);
    """
    insert_cstm = """
        INSERT INTO art_collections_cstm (
            id_c, collection_size_length_c, collection_size_width_c, with_frame_c, 
            frame_charges_c, sale_gallery_price_c, code_c, authenticity_letter_field_c,
            sale_c, purchase_price_c
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
    """
    
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # 1. Main table
            cursor.execute(insert_art, (artwork_id, now, now, data.description, data.title, data.image, data.status))
            # 2. Custom fields table
            cursor.execute(insert_cstm, (
                artwork_id, str(data.length), str(data.width), data.with_frame,
                str(data.frame_charges), str(data.price), data.code, data.authenticity_letter,
                data.deal_type, str(data.purchase_price)
            ))
            # 3. Relation with artist
            if data.artist_id:
                cursor.execute("""
                    INSERT INTO art_artists_art_collections_c (id, date_modified, deleted, art_artists_art_collectionsart_artists_ida, art_artists_art_collectionsart_collections_idb)
                    VALUES (%s, %s, 0, %s, %s);
                """, (str(uuid.uuid4()), now, data.artist_id, artwork_id))
            # 4. Relation with category
            if data.category_id:
                cursor.execute("""
                    INSERT INTO art_collectionstype_art_collections_c (id, date_modified, deleted, art_collectionstype_art_collectionsart_collectionstype_ida, art_collectionstype_art_collectionsart_collections_idb)
                    VALUES (%s, %s, 0, %s, %s);
                """, (str(uuid.uuid4()), now, data.category_id, artwork_id))
            # 5. Relation with medium
            if data.medium_id:
                cursor.execute("""
                    INSERT INTO art_medium_art_collections_c (id, date_modified, deleted, art_medium_art_collectionsart_medium_ida, art_medium_art_collectionsart_collections_idb)
                    VALUES (%s, %s, 0, %s, %s);
                """, (str(uuid.uuid4()), now, data.medium_id, artwork_id))
                
            connection.commit()
            return {"success": True, "id": artwork_id, "message": "Artwork successfully created."}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create artwork: {str(e)}")
    finally:
        connection.close()

@router.put("/{artwork_id}")
def update_artwork(artwork_id: str, data: ArtworkRequest):
    """
    Updates an existing artwork and its relationships.
    """
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    update_art = """
        UPDATE art_collections
        SET date_modified = %s, description = %s, document_name = %s, filename = %s, collection_status = %s
        WHERE id = %s AND deleted = 0;
    """
    update_cstm = """
        UPDATE art_collections_cstm
        SET collection_size_length_c = %s, collection_size_width_c = %s, with_frame_c = %s, frame_charges_c = %s, sale_gallery_price_c = %s, code_c = %s, authenticity_letter_field_c = %s, sale_c = %s, purchase_price_c = %s
        WHERE id_c = %s;
    """
    
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # 1. Update tables
            cursor.execute(update_art, (now, data.description, data.title, data.image, data.status, artwork_id))
            cursor.execute(update_cstm, (str(data.length), str(data.width), data.with_frame, str(data.frame_charges), str(data.price), data.code, data.authenticity_letter, data.deal_type, str(data.purchase_price), artwork_id))
            
            # 2. Clear old relationships
            cursor.execute("UPDATE art_artists_art_collections_c SET deleted = 1, date_modified = %s WHERE art_artists_art_collectionsart_collections_idb = %s", (now, artwork_id))
            cursor.execute("UPDATE art_collectionstype_art_collections_c SET deleted = 1, date_modified = %s WHERE art_collectionstype_art_collectionsart_collections_idb = %s", (now, artwork_id))
            cursor.execute("UPDATE art_medium_art_collections_c SET deleted = 1, date_modified = %s WHERE art_medium_art_collectionsart_collections_idb = %s", (now, artwork_id))
            
            # 3. Insert new relations
            if data.artist_id:
                cursor.execute("""
                    INSERT INTO art_artists_art_collections_c (id, date_modified, deleted, art_artists_art_collectionsart_artists_ida, art_artists_art_collectionsart_collections_idb)
                    VALUES (%s, %s, 0, %s, %s);
                """, (str(uuid.uuid4()), now, data.artist_id, artwork_id))
            if data.category_id:
                cursor.execute("""
                    INSERT INTO art_collectionstype_art_collections_c (id, date_modified, deleted, art_collectionstype_art_collectionsart_collectionstype_ida, art_collectionstype_art_collectionsart_collections_idb)
                    VALUES (%s, %s, 0, %s, %s);
                """, (str(uuid.uuid4()), now, data.category_id, artwork_id))
            if data.medium_id:
                cursor.execute("""
                    INSERT INTO art_medium_art_collections_c (id, date_modified, deleted, art_medium_art_collectionsart_medium_ida, art_medium_art_collectionsart_collections_idb)
                    VALUES (%s, %s, 0, %s, %s);
                """, (str(uuid.uuid4()), now, data.medium_id, artwork_id))
                
            connection.commit()
            return {"success": True, "message": "Artwork successfully updated."}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update artwork: {str(e)}")
    finally:
        connection.close()

@router.delete("/{artwork_id}")
def delete_artwork(artwork_id: str):
    """
    Soft-deletes an artwork.
    """
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    query = "UPDATE art_collections SET deleted = 1, date_modified = %s WHERE id = %s;"
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(query, (now, artwork_id))
            connection.commit()
            return {"success": True, "message": "Artwork deleted successfully."}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete artwork: {str(e)}")
    finally:
        connection.close()

@router.post("/import")
def import_artworks(data: ArtworkImportList):
    """
    Batch imports multiple artworks.
    """
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    connection = get_db_connection()
    success_count = 0
    try:
        with connection.cursor() as cursor:
            for art in data.artworks:
                artwork_id = str(uuid.uuid4())
                cursor.execute("""
                    INSERT INTO art_collections (
                        id, date_entered, date_modified, modified_user_id, created_by, 
                        description, deleted, document_name, filename, collection_status
                    ) VALUES (%s, %s, %s, '1', '1', %s, 0, %s, %s, %s);
                """, (artwork_id, now, now, art.description, art.title, art.image, art.status))
                
                cursor.execute("""
                    INSERT INTO art_collections_cstm (
                        id_c, collection_size_length_c, collection_size_width_c, with_frame_c, 
                        frame_charges_c, sale_gallery_price_c, code_c, authenticity_letter_field_c,
                        sale_c, purchase_price_c
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                """, (artwork_id, str(art.length), str(art.width), art.with_frame, str(art.frame_charges), str(art.price), art.code, art.authenticity_letter, art.deal_type, str(art.purchase_price)))
                
                if art.artist_id:
                    cursor.execute("""
                        INSERT INTO art_artists_art_collections_c (id, date_modified, deleted, art_artists_art_collectionsart_artists_ida, art_artists_art_collectionsart_collections_idb)
                        VALUES (%s, %s, 0, %s, %s);
                    """, (str(uuid.uuid4()), now, art.artist_id, artwork_id))
                if art.category_id:
                    cursor.execute("""
                        INSERT INTO art_collectionstype_art_collections_c (id, date_modified, deleted, art_collectionstype_art_collectionsart_collectionstype_ida, art_collectionstype_art_collectionsart_collections_idb)
                        VALUES (%s, %s, 0, %s, %s);
                    """, (str(uuid.uuid4()), now, art.category_id, artwork_id))
                if art.medium_id:
                    cursor.execute("""
                        INSERT INTO art_medium_art_collections_c (id, date_modified, deleted, art_medium_art_collectionsart_medium_ida, art_medium_art_collectionsart_collections_idb)
                        VALUES (%s, %s, 0, %s, %s);
                    """, (str(uuid.uuid4()), now, art.medium_id, artwork_id))
                success_count += 1
            connection.commit()
            return {"success": True, "message": f"Successfully imported {success_count} artworks."}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Batch import failed: {str(e)}")
    finally:
        connection.close()


class ImportedArtworkDetail(BaseModel):
    temp_image_id: str
    title: str
    code: str
    price: float = 0.0
    length: float = 0.0
    width: float = 0.0
    deal_type: str = "Sale_Basis"
    purchase_price: float = 0.0

class CommitImportRequest(BaseModel):
    artist_id: str
    category_id: str | None = None
    medium_id: str | None = None
    artworks: list[ImportedArtworkDetail]


@router.post("/preview-pdf")
async def preview_pdf_catalog(
    file: UploadFile = File(...),
    artist_id: str = Form(...)
):
    """
    Splits the uploaded PDF catalog into pages, saves them temporarily, 
    and returns a list of preview artwork details with suggested names/codes.
    """
    import fitz
    import re
    from collections import Counter

    try:
        file_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read uploaded PDF: {str(e)}")

    # 1. Open PDF
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid PDF catalog format: {str(e)}")

    total_pages = len(doc)
    if total_pages == 0:
        raise HTTPException(status_code=400, detail="The uploaded PDF file has 0 pages.")

    # 2. Get code prefix and number from database
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # Get artist name
            cursor.execute("SELECT first_name, last_name FROM art_artists WHERE id = %s AND deleted = 0", (artist_id,))
            artist = cursor.fetchone()
            if not artist:
                raise HTTPException(status_code=404, detail="Artist not found")
                
            first_name = artist.get("first_name") or ""
            last_name = artist.get("last_name") or ""
            full_name = f"{first_name} {last_name}".strip()
            
            # Fetch existing artwork titles
            cursor.execute("""
                SELECT c.document_name 
                FROM art_collections c
                JOIN art_artists_art_collections_c rel ON c.id = rel.art_artists_art_collectionsart_collections_idb
                WHERE rel.art_artists_art_collectionsart_artists_ida = %s 
                  AND c.deleted = 0 
                  AND c.document_name LIKE '%%-%%'
            """, (artist_id,))
            
            titles = [row["document_name"] for row in cursor.fetchall()]
            
            prefix_numbers = []
            for t in titles:
                match = re.match(r"^(.+?)-(\d+)$", t.strip())
                if match:
                    prefix = match.group(1)
                    num = int(match.group(2))
                    prefix_numbers.append((prefix, num))
            
            if prefix_numbers:
                prefixes = [p[0] for p in prefix_numbers]
                best_prefix = Counter(prefixes).most_common(1)[0][0]
                max_num = max(num for p, num in prefix_numbers if p == best_prefix)
                next_num = max_num + 1
                code_prefix = best_prefix
            else:
                cleaned_name = re.sub(r'[^a-zA-Z\s]', '', full_name)
                parts = [p.strip() for p in cleaned_name.split() if p.strip()]
                if len(parts) >= 2:
                    code_prefix = ".".join([p[0].upper() for p in parts[:3]])
                elif len(parts) == 1:
                    code_prefix = parts[0][:3].upper()
                else:
                    code_prefix = "ART"
                next_num = 101
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database lookup failed: {str(e)}")
    finally:
        connection.close()

    # 3. Save images to temp folder
    temp_dir = os.path.join(Config.UPLOAD_DIR, "temp_import")
    os.makedirs(temp_dir, exist_ok=True)

    preview_items = []
    
    for page_num in range(total_pages):
        temp_image_id = str(uuid.uuid4())
        current_num = next_num + page_num
        suggested_code = f"{code_prefix}-{current_num}"
        suggested_title = f"{code_prefix}-{current_num}"
        
        # Render page
        page = doc.load_page(page_num)
        
        # Try to parse dimensions in INCHES from page text (e.g. 17" x 18" or 17 x 18 in, strictly ignoring cm)
        extracted_length = 0.0
        extracted_width = 0.0
        try:
            page_text = page.get_text()
            # 1. First priority: look for numbers explicitly marked with inch symbols (" or ” or in or inches)
            inch_match = re.search(r'(\d+(?:\.\d+)?)\s*["\u201d\u201c\']?\s*(?:x|X|\*)\s*(\d+(?:\.\d+)?)\s*(?:["\u201d\u201c\']|\bin\b|\binch\b|\binches\b)', page_text, re.IGNORECASE)
            if inch_match:
                len_val = float(inch_match.group(1))
                wid_val = float(inch_match.group(2))
                if len_val >= 1.0 and wid_val >= 1.0:
                    extracted_length = len_val
                    extracted_width = wid_val
            else:
                # 2. Find AxB patterns, strictly skipping any followed by cm/cms
                all_matches = re.finditer(r'(\d+(?:\.\d+)?)\s*(?:x|X|\*)\s*(\d+(?:\.\d+)?)(?:\s*([a-zA-Z"\'\u201d\u201c]+))?', page_text, re.IGNORECASE)
                for m in all_matches:
                    unit = (m.group(3) or "").lower().strip()
                    if "cm" in unit or "centimeter" in unit:
                        continue
                    len_val = float(m.group(1))
                    wid_val = float(m.group(2))
                    if len_val >= 1.0 and wid_val >= 1.0 and len_val <= 120 and wid_val <= 120:
                        extracted_length = len_val
                        extracted_width = wid_val
                        break
        except Exception as txt_err:
            print(f"Failed to extract dimensions on page {page_num + 1}: {txt_err}")
        zoom = 150 / 72
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        img_bytes = pix.tobytes("jpeg")
        
        # Auto-crop extra white borders around the painting
        try:
            from PIL import Image, ImageChops
            import io
            
            image = Image.open(io.BytesIO(img_bytes))
            if image.mode != "RGB":
                image = image.convert("RGB")
                
            # Create a comparison background image (pure white)
            bg = Image.new("RGB", image.size, (255, 255, 255))
            diff = ImageChops.difference(image, bg)
            
            # Convert difference to grayscale and threshold compression noise
            gray_diff = diff.convert("L")
            thresholded = gray_diff.point(lambda p: 255 if p > 15 else 0)
            bbox = thresholded.getbbox()
            
            if bbox:
                # Add a safe margin of 12 pixels around the artwork content
                pad = 12
                left = max(0, bbox[0] - pad)
                top = max(0, bbox[1] - pad)
                right = min(image.width, bbox[2] + pad)
                bottom = min(image.height, bbox[3] + pad)
                
                # Check that cropped region is valid size to avoid cropping blank pages
                if (right - left) > 50 and (bottom - top) > 50:
                    cropped_image = image.crop((left, top, right, bottom))
                    out_io = io.BytesIO()
                    cropped_image.save(out_io, format="JPEG", quality=95)
                    img_bytes = out_io.getvalue()
        except Exception as crop_err:
            print(f"Failed to auto-crop page {page_num + 1}: {crop_err}")
            
        # Save temp file
        temp_file_path = os.path.join(temp_dir, temp_image_id)
        with open(temp_file_path, "wb") as f:
            f.write(img_bytes)
            
        preview_items.append({
            "temp_image_id": temp_image_id,
            "page": page_num + 1,
            "title": suggested_title,
            "code": suggested_code,
            "price": 0.0,
            "length": extracted_length,
            "width": extracted_width,
            "deal_type": "Sale_Basis",
            "purchase_price": 0.0
        })

    return {
        "success": True,
        "artworks": preview_items
    }


@router.get("/temp-image/{temp_id}")
def get_temp_artwork_image(temp_id: str):
    """
    Serves a temporary artwork image from the temp import directory.
    """
    temp_dir = os.path.join(Config.UPLOAD_DIR, "temp_import")
    file_path = os.path.join(temp_dir, temp_id)
    if os.path.exists(file_path):
        with open(file_path, "rb") as f:
            return Response(content=f.read(), media_type="image/jpeg")
    raise HTTPException(status_code=404, detail="Temporary image not found")


@router.post("/commit-import")
def commit_imported_artworks(data: CommitImportRequest):
    """
    Commits the reviewed artwork items to the database and transfers files.
    """
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    upload_dir = Config.UPLOAD_DIR
    temp_dir = os.path.join(upload_dir, "temp_import")
    
    connection = get_db_connection()
    success_count = 0
    imported_list = []
    
    try:
        with connection.cursor() as cursor:
            for art in data.artworks:
                artwork_id = str(uuid.uuid4())
                
                # Check temp file
                temp_file = os.path.join(temp_dir, art.temp_image_id)
                if not os.path.exists(temp_file):
                    continue
                    
                # Move to final location
                final_file = os.path.join(upload_dir, artwork_id)
                shutil.move(temp_file, final_file)
                
                nice_filename = f"{art.code}.jpg"
                
                # 1. Main collections table
                cursor.execute("""
                    INSERT INTO art_collections (
                        id, date_entered, date_modified, modified_user_id, created_by, 
                        description, deleted, document_name, filename, collection_status
                    ) VALUES (%s, %s, %s, '1', '1', %s, 0, %s, %s, 'Available');
                """, (artwork_id, now, now, f"Imported sequentially from PDF Catalog", art.title, nice_filename))
                
                # 2. Custom fields table
                cursor.execute("""
                    INSERT INTO art_collections_cstm (
                        id_c, collection_size_length_c, collection_size_width_c, with_frame_c, 
                        frame_charges_c, sale_gallery_price_c, code_c, authenticity_letter_field_c,
                        sale_c, purchase_price_c
                    ) VALUES (%s, %s, %s, '0', '0.0', %s, %s, 'auto', %s, %s);
                """, (artwork_id, str(art.length), str(art.width), str(art.price), art.code, art.deal_type, str(art.purchase_price)))
                
                # 3. Artist relationship
                cursor.execute("""
                    INSERT INTO art_artists_art_collections_c (id, date_modified, deleted, art_artists_art_collectionsart_artists_ida, art_artists_art_collectionsart_collections_idb)
                    VALUES (%s, %s, 0, %s, %s);
                """, (str(uuid.uuid4()), now, data.artist_id, artwork_id))
                
                # 4. Category relationship
                if data.category_id:
                    cursor.execute("""
                        INSERT INTO art_collectionstype_art_collections_c (id, date_modified, deleted, art_collectionstype_art_collectionsart_collectionstype_ida, art_collectionstype_art_collectionsart_collections_idb)
                        VALUES (%s, %s, 0, %s, %s);
                    """, (str(uuid.uuid4()), now, data.category_id, artwork_id))
                    
                # 5. Medium relationship
                if data.medium_id:
                    cursor.execute("""
                        INSERT INTO art_medium_art_collections_c (id, date_modified, deleted, art_medium_art_collectionsart_medium_ida, art_medium_art_collectionsart_collections_idb)
                        VALUES (%s, %s, 0, %s, %s);
                    """, (str(uuid.uuid4()), now, data.medium_id, artwork_id))
                    
                imported_list.append({
                    "id": artwork_id,
                    "title": art.title,
                    "code": art.code
                })
                success_count += 1
                
            connection.commit()
            
            # Clean up temp folder if empty
            try:
                if os.path.exists(temp_dir) and not os.listdir(temp_dir):
                    os.rmdir(temp_dir)
            except:
                pass
                
            return {
                "success": True, 
                "message": f"Successfully imported {success_count} artworks to database.",
                "artworks": imported_list
            }
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to commit batch artworks: {str(e)}")
    finally:
        connection.close()


@router.post("/upload-image")
def upload_artwork_image(file: UploadFile = File(...)):
    """
    Uploads an artwork image to the SugarCRM upload directory.
    """
    upload_dir = Config.UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)
    
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".pdf"]:
        raise HTTPException(status_code=400, detail="Only JPG, JPEG, PNG, WEBP, and PDF files are allowed.")
        
    unique_filename = f"art_{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(upload_dir, unique_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return {"success": True, "filename": unique_filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded image: {str(e)}")


@router.post("/upload-letter")
def upload_authenticity_letter(file: UploadFile = File(...)):
    """
    Uploads a custom authenticity letter file (image or PDF).
    """
    upload_dir = Config.UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)
    
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".pdf"]:
        raise HTTPException(status_code=400, detail="Only JPG, JPEG, PNG, WEBP, and PDF files are allowed.")
        
    unique_filename = f"auth_{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(upload_dir, unique_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return {"success": True, "filename": unique_filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded letter: {str(e)}")


@router.post("/upload-global-template")
def upload_global_template(file: UploadFile = File(...)):
    """
    Uploads or updates the global letter template background image.
    """
    upload_dir = Config.UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)
    
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        raise HTTPException(status_code=400, detail="Only JPG, JPEG, PNG, and WEBP template images are allowed.")
        
    # We save as a fixed filename to overwrite
    filename = f"global_authenticity_template{ext}"
    
    # Remove existing global template files to prevent conflicting extensions
    for item in os.listdir(upload_dir):
        if item.startswith("global_authenticity_template."):
            try:
                os.remove(os.path.join(upload_dir, item))
            except:
                pass
                
    file_path = os.path.join(upload_dir, filename)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return {"success": True, "filename": filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save global template: {str(e)}")




@router.put("/{artwork_id}/status")
def update_artwork_status(artwork_id: str, data: ArtworkStatusRequest):
    """
    Updates the status of an artwork.
    """
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    update_query = """
        UPDATE art_collections
        SET date_modified = %s, collection_status = %s
        WHERE id = %s AND deleted = 0;
    """
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(update_query, (now, data.status, artwork_id))
            connection.commit()
            return {"success": True, "message": "Artwork status updated successfully."}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update artwork status: {str(e)}")
    finally:
        connection.close()




@router.put("/{artwork_id}/toggle-letter")
def toggle_authenticity_letter(artwork_id: str):
    """
    Toggles the authenticity letter issuance for a specific artwork.
    """
    # Fetch current value
    check_query = "SELECT authenticity_letter_field_c FROM art_collections_cstm WHERE id_c = %s;"
    update_query = "UPDATE art_collections_cstm SET authenticity_letter_field_c = %s WHERE id_c = %s;"
    
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(check_query, (artwork_id,))
            res = cursor.fetchone()
            current = res["authenticity_letter_field_c"] if res else ""
            
            # Toggle logic
            new_value = "" if current and current != "NULL" else "auto"
            cursor.execute(update_query, (new_value, artwork_id))
            connection.commit()
            return {"success": True, "issued": new_value == "auto"}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to toggle letter status: {str(e)}")
    finally:
        connection.close()


@router.get("/{artwork_id}/authenticity-letter")
def get_artwork_authenticity_letter(artwork_id: str):
    """
    Serves the print-ready portrait authenticity letter/certificate for the artwork.
    """
    from fastapi.responses import HTMLResponse
    import os
    
    query = """
        SELECT 
            c.id AS id,
            c.document_name AS title,
            c.filename AS image,
            c.date_entered AS date_added,
            cstm.collection_size_length_c AS length,
            cstm.collection_size_width_c AS width,
            cstm.code_c AS code,
            cstm.authenticity_letter_field_c AS letter,
            CONCAT(COALESCE(a.first_name, ''), ' ', COALESCE(a.last_name, '')) AS artist_name,
            m.name AS medium_name
        FROM art_collections c
        LEFT JOIN art_collections_cstm cstm ON c.id = cstm.id_c
        LEFT JOIN art_artists_art_collections_c rel ON c.id = rel.art_artists_art_collectionsart_collections_idb AND rel.deleted = 0
        LEFT JOIN art_artists a ON rel.art_artists_art_collectionsart_artists_ida = a.id AND a.deleted = 0
        LEFT JOIN art_medium_art_collections_c med_rel ON c.id = med_rel.art_medium_art_collectionsart_collections_idb AND med_rel.deleted = 0
        LEFT JOIN art_medium m ON med_rel.art_medium_art_collectionsart_medium_ida = m.id AND m.deleted = 0
        WHERE c.id = %s AND c.deleted = 0;
    """
    
    try:
        artwork = execute_query(query, (artwork_id,), fetch="one")
        if not artwork or not artwork["letter"]:
            return HTMLResponse("<h3>Authenticity letter not found or not issued for this artwork.</h3>", status_code=404)
            
        letter_val = artwork["letter"]
        
        # If it is an uploaded file name, serve it directly if it exists
        upload_dir = Config.UPLOAD_DIR
        if letter_val != "auto" and letter_val != "NULL" and letter_val != "":
            file_path = os.path.join(upload_dir, letter_val)
            if os.path.exists(file_path):
                ext = os.path.splitext(letter_val)[1].lower()
                media_type = "application/pdf" if ext == ".pdf" else "image/jpeg"
                with open(file_path, "rb") as f:
                    return Response(content=f.read(), media_type=media_type)
        
        # Parse dynamic info
        title = artwork["title"] or "Untitled"
        artist = (artwork["artist_name"] or "Unknown Artist").strip()
        medium = artwork["medium_name"] or "Original Medium"
        code = artwork["code"] or "N/A"
        date_str = datetime.strptime(str(artwork["date_added"]), "%Y-%m-%d %H:%M:%S").strftime("%B %d, %Y") if artwork["date_added"] else datetime.now().strftime("%B %d, %Y")
        
        # Parse and calculate dimensions in cm
        try:
            length_inch = float(artwork["length"]) if artwork["length"] else 0.0
            width_inch = float(artwork["width"]) if artwork["width"] else 0.0
        except:
            length_inch = 0.0
            width_inch = 0.0
            
        length_cm = int(round(length_inch * 2.54))
        width_cm = int(round(width_inch * 2.54))
        
        # Format inches part nicely (remove decimals if integers)
        len_str = str(int(length_inch)) if length_inch.is_integer() else str(length_inch)
        wid_str = str(int(width_inch)) if width_inch.is_integer() else str(width_inch)
        
        dimensions_inch = f'{wid_str}"x{len_str}"' if (length_inch > 0 or width_inch > 0) else 'N/A'
        dimensions_cm = f'{width_cm}x{length_cm} cm' if (length_cm > 0 or width_cm > 0) else 'N/A'
        
        if dimensions_inch != 'N/A' and dimensions_cm != 'N/A':
            dimensions = f"{dimensions_inch} | {dimensions_cm}"
        else:
            dimensions = "N/A"

        # Resolve signature as base64 or fallback url
        import base64
        sig_src = "/api/artworks/signature"
        sig_search_paths = [
            "/var/www/html/website/signature.png",
            "/var/www/html/website/signature.jpg",
            "/var/www/html/website/signature.svg",
            "/var/www/html/dashboard/signature.png",
            "/var/www/html/dashboard/signature.jpg",
            "/var/www/html/dashboard/signature.svg",
            "/var/www/html/uploads/signature.png",
            "/var/www/html/uploads/signature.jpg",
            "/var/www/html/uploads/signature.svg",
            os.path.join(Config.UPLOAD_DIR, "signature.png"),
            os.path.join(Config.UPLOAD_DIR, "signature.jpg"),
            os.path.join(Config.UPLOAD_DIR, "signature.svg"),
            os.path.join(Config.WORKSPACE_ROOT, "website", "public", "signature.svg"),
            os.path.join(Config.WORKSPACE_ROOT, "website", "public", "signature.png"),
            os.path.join(Config.WORKSPACE_ROOT, "website", "public", "signature.jpg"),
            os.path.join(Config.WORKSPACE_ROOT, "dashboard", "public", "signature.svg"),
            os.path.join(Config.WORKSPACE_ROOT, "dashboard", "public", "signature.png"),
            os.path.join(Config.WORKSPACE_ROOT, "dashboard", "public", "signature.jpg"),
            os.path.join(Config.WORKSPACE_ROOT, "signature.png"),
            os.path.join(Config.WORKSPACE_ROOT, "signature.jpg"),
            os.path.join(Config.WORKSPACE_ROOT, "signature.svg")
        ]
        for sp in sig_search_paths:
            if os.path.exists(sp):
                try:
                    with open(sp, "rb") as sf:
                        mime = "image/svg+xml" if sp.endswith(".svg") else "image/png" if sp.endswith(".png") else "image/jpeg"
                        b64 = base64.b64encode(sf.read()).decode("utf-8")
                        sig_src = f"data:{mime};base64,{b64}"
                        break
                except Exception:
                    pass
            
        # HTML template matching exact user PDF certificate design
        artist_display = artist.title() if artist else "Unknown Artist"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Certificate of Authenticity - {title}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Questrial&display=swap');
                
                * {{
                    box-sizing: border-box;
                    margin: 0;
                    padding: 0;
                }}
                
                body {{
                    background-color: #f1f3f5;
                    font-family: 'Century Gothic', CenturyGothic, AppleGothic, 'Questrial', sans-serif;
                    color: #000000;
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: flex-start;
                    padding: 15px 15px 40px;
                }}
                
                .print-controls {{
                    width: 100%;
                    max-width: 210mm;
                    margin: 10px auto 16px;
                    padding: 10px 18px;
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 10px;
                    flex-wrap: wrap;
                }}
                
                .checkbox-container {{
                    font-size: 13.5px;
                    font-weight: 500;
                    color: #333;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                }}
                
                .btn {{
                    padding: 8px 16px;
                    font-family: 'Century Gothic', CenturyGothic, sans-serif;
                    font-size: 13px;
                    font-weight: 600;
                    border: 1px solid transparent;
                    border-radius: 6px;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    transition: all 0.2s ease;
                }}
                
                .btn-print {{
                    background-color: #111827;
                    color: #ffffff;
                }}
                .btn-print:hover {{
                    background-color: #374151;
                    transform: translateY(-1px);
                }}
                
                .btn-edit {{
                    background-color: #ffffff;
                    color: #0f172a;
                    border: 1px solid #cbd5e1;
                }}
                .btn-edit:hover {{
                    background-color: #f8fafc;
                    border-color: #94a3b8;
                }}
                .btn-edit.active {{
                    background-color: #b45309;
                    color: #ffffff;
                    border-color: #b45309;
                }}
                
                /* Certificate Container (A4 Portrait) */
                .certificate-container {{
                    width: 210mm;
                    min-height: 297mm;
                    height: 297mm;
                    margin: 0 auto;
                    background-color: #ffffff;
                    box-shadow: 0 10px 35px rgba(0, 0, 0, 0.08);
                    position: relative;
                    padding: 20mm 20mm 26mm 20mm;
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-start;
                    font-family: 'Century Gothic', CenturyGothic, AppleGothic, 'Questrial', sans-serif;
                }}
                
                .logo-container {{
                    width: 100%;
                    display: flex;
                    justify-content: flex-end;
                    margin-top: 5px;
                    margin-bottom: 20px;
                }}
                
                .logo {{
                    height: 68px;
                    width: auto;
                    max-width: 170px;
                    object-fit: contain;
                    display: block;
                }}
                
                .certificate-title {{
                    font-size: 27px;
                    font-weight: 400;
                    letter-spacing: 0.5px;
                    color: #000000;
                    text-align: center;
                    margin-top: 10px;
                    margin-bottom: 30px;
                }}
                
                /* Table with Solid Black Borders */
                .details-table {{
                    width: 100%;
                    border-collapse: collapse;
                    border: 2px solid #000000;
                    margin-bottom: 10px;
                }}
                
                .details-table td {{
                    border: 2px solid #000000;
                    padding: 8px 12px;
                    vertical-align: middle;
                }}
                
                .cell-label {{
                    width: 165px;
                    font-weight: 700;
                    font-size: 14px;
                    color: #000000;
                    text-align: center;
                }}
                
                .cell-val {{
                    font-size: 14px;
                    color: #000000;
                    text-align: center;
                }}
                
                .cell-artist {{
                    font-weight: 400;
                    font-size: 15px;
                }}
                
                .cell-size {{
                    font-weight: 400;
                    font-size: 14px;
                }}
                
                .cell-medium {{
                    font-weight: 400;
                    font-size: 13.5px;
                    line-height: 1.4;
                }}
                
                .cell-display {{
                    font-weight: 400;
                    font-size: 14px;
                    text-align: left !important;
                    padding-left: 16px !important;
                }}
                
                .cell-img-val {{
                    padding: 14px 10px;
                    text-align: center;
                    background-color: #ffffff;
                }}
                
                .painting-image {{
                    max-width: 100%;
                    max-height: 290px;
                    width: auto;
                    height: auto;
                    object-fit: contain;
                    display: block;
                    margin: 0 auto;
                }}
                
                /* Statement Text */
                .statement-container {{
                    font-size: 15px;
                    font-weight: 400;
                    color: #000000;
                    text-align: left;
                    line-height: 1.55;
                    margin: 22px 0 65px 0;
                    padding: 4px 6px;
                }}
                
                .statement-container strong {{
                    font-weight: 700;
                    color: #000000;
                }}
                
                /* Inline Editing Support */
                .editable-text {{
                    transition: all 0.15s ease;
                }}
                body.editing-active .editable-text {{
                    outline: 1.5px dashed #d97706 !important;
                    background-color: rgba(254, 240, 138, 0.25) !important;
                    border-radius: 3px;
                    cursor: text;
                }}
                body.editing-active .editable-text:focus {{
                    outline: 2px solid #b45309 !important;
                    background-color: rgba(254, 240, 138, 0.45) !important;
                }}
                
                /* Signature Section */
                .signature-section {{
                    display: flex;
                    justify-content: flex-start;
                    align-items: flex-end;
                    margin-bottom: 45px;
                    padding-left: 0;
                }}
                
                .sig-line-container {{
                    display: flex;
                    align-items: flex-end;
                    gap: 8px;
                }}
                
                .sig-label {{
                    font-weight: 700;
                    font-size: 14.5px;
                    color: #000000;
                    padding-bottom: 3px;
                }}
                
                .sig-line {{
                    position: relative;
                    border-bottom: 1.5px solid #000000;
                    width: 320px;
                    height: 38px;
                }}
                
                #sig-img {{
                    position: absolute;
                    bottom: 2px;
                    left: 15px;
                    height: 50px;
                    width: 145px;
                    object-fit: fill;
                    display: block;
                }}
                
                /* Footer - strictly pinned to the very bottom end of page */
                .footer-container {{
                    position: absolute;
                    bottom: 6mm;
                    left: 0;
                    right: 0;
                    width: 100%;
                    text-align: center;
                    font-size: 9.5px;
                    font-weight: 400;
                    color: #222222;
                    line-height: 1.65;
                }}
                
                .footer-address {{
                    font-weight: 400;
                    margin-bottom: 3px;
                    letter-spacing: 0.2px;
                    padding: 2px 4px;
                }}
                
                .footer-links {{
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 16px;
                }}
                
                .footer-link-item {{
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    color: #333333;
                    text-decoration: none;
                }}
                
                .footer-icon-inline {{
                    width: 11px;
                    height: 11px;
                }}
                
                @media print {{
                    html, body {{
                        background-color: #ffffff !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 210mm !important;
                        height: 297mm !important;
                        overflow: hidden !important;
                    }}
                    
                    .print-controls {{
                        display: none !important;
                    }}
                    
                    .editable-text {{
                        outline: none !important;
                        background-color: transparent !important;
                    }}
                    
                    .certificate-container {{
                        margin: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                        width: 210mm !important;
                        height: 297mm !important;
                        max-height: 297mm !important;
                        padding: 18mm 20mm 24mm 20mm !important;
                        page-break-after: avoid !important;
                        page-break-before: avoid !important;
                        page-break-inside: avoid !important;
                        box-sizing: border-box !important;
                    }}
                    
                    .painting-image {{
                        max-height: 280px !important;
                    }}

                    .statement-container {{
                        font-size: 14.8px !important;
                        line-height: 1.55 !important;
                        margin: 20px 0 58px 0 !important;
                        padding: 0 !important;
                    }}
                    
                    .signature-section {{
                        margin-bottom: 40px !important;
                    }}
                    
                    .footer-container {{
                        position: absolute !important;
                        bottom: 6mm !important;
                        left: 0 !important;
                        right: 0 !important;
                        width: 100% !important;
                    }}
                    
                    @page {{
                        size: A4 portrait;
                        margin: 0;
                    }}
                }}
            </style>
        </head>
        <body>
            <div class="print-controls">
                <div style="display: flex; align-items: center; gap: 16px;">
                    <label class="checkbox-container">
                        <input type="checkbox" id="sig-toggle" checked onchange="toggleSignature(this.checked)">
                        Include Owner Signature
                    </label>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <button id="btn-edit" class="btn btn-edit" onclick="toggleEditMode()">✏️ Edit Certificate</button>
                    <button class="btn btn-print" onclick="window.print()">Print Certificate</button>
                </div>
            </div>
            
            <div class="certificate-container">
                <div class="logo-container">
                    <img class="logo" src="/api/artworks/logo" alt="MainFrame The Gallery">
                </div>
                
                <div class="certificate-title editable-text" contenteditable="true" title="Click to edit">Certificate of Authenticity</div>
                
                <table class="details-table">
                    <tr>
                        <td class="cell-label editable-text" contenteditable="true">Painting by:</td>
                        <td class="cell-val cell-artist editable-text" contenteditable="true">{artist_display}</td>
                    </tr>
                    <tr>
                        <td class="cell-label editable-text" contenteditable="true">Size:</td>
                        <td class="cell-val cell-size editable-text" contenteditable="true">{dimensions}</td>
                    </tr>
                    <tr>
                        <td class="cell-label editable-text" contenteditable="true">Medium:</td>
                        <td class="cell-val cell-medium editable-text" contenteditable="true">{medium}</td>
                    </tr>
                    <tr>
                        <td class="cell-label">Image:</td>
                        <td class="cell-img-val">
                            <img class="painting-image" src="/api/artworks/image/{artwork_id}" alt="{title}">
                        </td>
                    </tr>
                    <tr>
                        <td class="cell-label editable-text" contenteditable="true">Painting display</td>
                        <td class="cell-val cell-display editable-text" contenteditable="true">MainFrame The Gallery</td>
                    </tr>
                </table>
                
                <div class="statement-container editable-text" contenteditable="true" title="Click to edit statement">
                    The Mainframe The Gallery assumes full responsibility for this Artwork being a genuine and<br>
                    authentic painting by <strong>{artist_display}</strong>.
                </div>
                
                <div class="signature-section">
                    <div class="sig-line-container">
                        <span class="sig-label">Signature:</span>
                        <div class="sig-line">
                            <img id="sig-img" src="{sig_src}" alt="Signature">
                        </div>
                    </div>
                </div>
                
                <div class="footer-container">
                    <div class="footer-address editable-text" contenteditable="true">
                        F-73/9, Block 4 , Clifton Karachi Pakistan. &nbsp;
                        <span style="display: inline-flex; align-items: center; gap: 4px;">
                            <svg class="footer-icon-inline" xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                            +92 21 3582 4455
                        </span>
                        &nbsp;|&nbsp;
                        <span style="display: inline-flex; align-items: center; gap: 4px;">
                            <svg class="footer-icon-inline" xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                            +92 300 828 5600
                        </span>
                    </div>
                    <div class="footer-links">
                        <div class="footer-link-item">
                            <svg class="footer-icon-inline" xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                            mainframethegallery@gmail.com
                        </div>
                        <div class="footer-link-item">
                            <svg class="footer-icon-inline" xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                            www.mainframethegallery.com
                        </div>
                    </div>
                </div>
            </div>
            
            <script>
                function toggleSignature(show) {{
                    const sigImg = document.getElementById('sig-img');
                    if (sigImg) {{
                        sigImg.style.display = show ? 'block' : 'none';
                    }}
                }}
                
                let isEditing = false;
                function toggleEditMode() {{
                    isEditing = !isEditing;
                    const btn = document.getElementById('btn-edit');
                    const elements = document.querySelectorAll('.editable-text');
                    
                    if (isEditing) {{
                        document.body.classList.add('editing-active');
                        btn.classList.add('active');
                        btn.innerHTML = '💾 Done Editing';
                        elements.forEach(el => el.setAttribute('contenteditable', 'true'));
                    }} else {{
                        document.body.classList.remove('editing-active');
                        btn.classList.remove('active');
                        btn.innerHTML = '✏️ Edit Certificate';
                    }}
                }}
            </script>
        </body>
        </html>
        """
        return HTMLResponse(content=html_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database or rendering error: {str(e)}")

@router.get("/{artwork_id}/tag")
def get_artwork_tag(artwork_id: str):
    """
    Serves the print-ready landscape tag/card for the artwork.
    """
    from fastapi.responses import HTMLResponse
    import os
    
    query = """
        SELECT 
            c.id AS id,
            c.document_name AS title,
            c.filename AS image,
            c.date_entered AS date_added,
            cstm.collection_size_length_c AS length,
            cstm.collection_size_width_c AS width,
            cstm.code_c AS code,
            cstm.sale_gallery_price_c AS price,
            CONCAT(COALESCE(a.first_name, ''), ' ', COALESCE(a.last_name, '')) AS artist_name,
            m.name AS medium_name
        FROM art_collections c
        LEFT JOIN art_collections_cstm cstm ON c.id = cstm.id_c
        LEFT JOIN art_artists_art_collections_c rel ON c.id = rel.art_artists_art_collectionsart_collections_idb AND rel.deleted = 0
        LEFT JOIN art_artists a ON rel.art_artists_art_collectionsart_artists_ida = a.id AND a.deleted = 0
        LEFT JOIN art_medium_art_collections_c med_rel ON c.id = med_rel.art_medium_art_collectionsart_collections_idb AND med_rel.deleted = 0
        LEFT JOIN art_medium m ON med_rel.art_medium_art_collectionsart_medium_ida = m.id AND m.deleted = 0
        WHERE c.id = %s AND c.deleted = 0;
    """
    
    try:
        artwork = execute_query(query, (artwork_id,), fetch="one")
        if not artwork:
            return HTMLResponse("<h3>Artwork not found.</h3>", status_code=404)
            
        title = artwork["title"] or "Untitled"
        artist = (artwork["artist_name"] or "Unknown Artist").strip()
        medium = artwork["medium_name"] or "Original Medium"
        
        # Parse and calculate dimensions in cm
        try:
            length_inch = float(artwork["length"]) if artwork["length"] else 0.0
            width_inch = float(artwork["width"]) if artwork["width"] else 0.0
        except:
            length_inch = 0.0
            width_inch = 0.0
            
        length_cm = int(round(length_inch * 2.54))
        width_cm = int(round(width_inch * 2.54))
        
        # Format inches part nicely (remove decimals if integers)
        len_str = str(int(length_inch)) if length_inch.is_integer() else str(length_inch)
        wid_str = str(int(width_inch)) if width_inch.is_integer() else str(width_inch)
        
        dimensions_inch = f'{wid_str}"x{len_str}"' if (length_inch > 0 or width_inch > 0) else 'N/A'
        dimensions_cm = f'{width_cm}x{length_cm} cm' if (length_cm > 0 or width_cm > 0) else 'N/A'
        
        if dimensions_inch != 'N/A' and dimensions_cm != 'N/A':
            dimensions = f"{dimensions_inch} | {dimensions_cm}"
        else:
            dimensions = "N/A"
            
        # Parse price and code
        price_val = artwork["price"]
        if price_val:
            try:
                price_float = float(price_val)
                price_formatted = f"{int(price_float):,}" if price_float.is_integer() else f"{price_float:,}"
            except:
                price_formatted = str(price_val)
        else:
            price_formatted = ""
            
        # Format code and price separately (price at the bottom)
        code_val = (artwork["code"] or "").strip()
        price_val = artwork["price"]
        if price_val is not None and str(price_val).strip() != "":
            try:
                price_float = float(price_val)
                price_formatted = f"{int(price_float):,}" if price_float.is_integer() else f"{price_float:,}"
            except:
                price_formatted = str(price_val)
        else:
            price_formatted = ""

        # Safe file name using painting title
        file_base_name = (title or "Artwork").replace("'", "").replace('"', "").replace('/', '-').replace('\\', '-').strip()
        show_title = bool(title and title.lower() != "untitled")

        # HTML template
        html_content = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
            <title>{file_base_name}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap');
                
                * {{
                    box-sizing: border-box;
                    margin: 0;
                    padding: 0;
                }}

                body {{
                    background-color: #f1f3f5;
                    font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    color: #111;
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: flex-start;
                    padding: 10px 15px 30px;
                }}
                
                .print-controls {{
                    width: 100%;
                    max-width: 1050px;
                    margin: 10px auto 18px;
                    padding: 10px 18px;
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
                    display: flex;
                    justify-content: flex-end;
                    align-items: center;
                    gap: 10px;
                    flex-wrap: wrap;
                }}
                
                .btn {{
                    padding: 8px 16px;
                    font-family: 'Montserrat', sans-serif;
                    font-size: 13px;
                    font-weight: 600;
                    border: 1px solid transparent;
                    border-radius: 6px;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    text-decoration: none;
                    transition: all 0.2s ease;
                }}
                
                .btn-print {{
                    background-color: #111827;
                    color: #ffffff;
                    border-color: #111827;
                }}
                .btn-print:hover {{
                    background-color: #374151;
                    transform: translateY(-1px);
                }}
                
                .btn-pdf {{
                    background-color: #cfa15c;
                    color: #ffffff;
                    border-color: #cfa15c;
                }}
                .btn-pdf:hover {{
                    background-color: #b58943;
                    transform: translateY(-1px);
                }}

                .btn-image-tag {{
                    background-color: #ffffff;
                    color: #1f2937;
                    border-color: #d1d5db;
                }}
                .btn-image-tag:hover {{
                    background-color: #f3f4f6;
                    border-color: #9ca3af;
                    transform: translateY(-1px);
                }}
                
                .btn-raw-img {{
                    background-color: #4b5563;
                    color: #ffffff;
                    border-color: #4b5563;
                }}
                .btn-raw-img:hover {{
                    background-color: #374151;
                    transform: translateY(-1px);
                }}

                /* Certificate / Tag Card - iPad & Screen Layout */
                .certificate-container {{
                    width: fit-content;
                    max-width: 96vw;
                    margin: 0 auto;
                    background-color: #ffffff;
                    border-radius: 6px;
                    box-shadow: 0 10px 35px rgba(0, 0, 0, 0.08);
                    padding: 24px 30px;
                    display: inline-flex;
                    align-items: stretch;
                    justify-content: flex-start;
                    position: relative;
                }}
                
                .tag-content-row {{
                    display: flex;
                    flex-direction: row;
                    align-items: stretch;
                    justify-content: flex-start;
                    width: 100%;
                    height: 100%;
                    gap: 28px;
                }}

                .left-col {{
                    flex: 0 0 auto;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 0;
                }}
                
                .painting-wrapper {{
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    max-height: 100%;
                }}

                .painting-image {{
                    max-width: 100%;
                    max-height: 520px;
                    width: auto;
                    height: auto;
                    object-fit: contain;
                    box-shadow: 10px 12px 28px rgba(0, 0, 0, 0.18);
                    border: 1px solid rgba(0, 0, 0, 0.08);
                    border-radius: 2px;
                    display: block;
                }}
                
                .right-col {{
                    flex: 0 0 250px;
                    width: 250px;
                    min-width: 230px;
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-end;
                    align-items: flex-start;
                    box-sizing: border-box;
                    padding-left: 0;
                }}
                
                .logo-container {{
                    position: absolute;
                    top: 24px;
                    right: 30px;
                    display: flex;
                    justify-content: flex-end;
                    align-items: flex-start;
                    z-index: 5;
                }}
                
                .logo {{
                    height: 70px;
                    width: auto;
                    max-width: 170px;
                    object-fit: contain;
                    display: block;
                }}
                
                .details-container {{
                    width: 100%;
                    text-align: left;
                    margin-top: auto;
                    margin-bottom: 0;
                }}
                
                .detail-line {{
                    display: flex;
                    align-items: baseline;
                    gap: 6px;
                    margin-bottom: 4.5px;
                    font-size: 12.5px;
                    line-height: 1.35;
                }}

                .detail-line:last-child {{
                    margin-bottom: 0;
                }}
                
                .detail-label {{
                    font-weight: 400;
                    color: #555555;
                    white-space: nowrap;
                    font-size: 12px;
                    min-width: 80px;
                }}
                
                .detail-value {{
                    font-weight: 600;
                    color: #111111;
                    font-size: 12.5px;
                    word-break: break-word;
                }}

                .detail-line.price-line .detail-label {{
                    font-weight: 500;
                    color: #333333;
                }}

                .detail-line.price-line .detail-value {{
                    font-weight: 700;
                    color: #000000;
                    font-size: 13.5px;
                }}

                /* iPad / Tablet Responsiveness */
                @media screen and (max-width: 1024px) {{
                    .certificate-container {{
                        padding: 16px 20px;
                        min-height: 460px;
                    }}
                    .painting-image {{
                        max-height: 420px;
                    }}
                    .right-col {{
                        flex: 0 0 215px;
                        width: 215px;
                        min-width: 195px;
                    }}
                    .logo-container {{
                        top: 16px !important;
                        right: 20px !important;
                    }}
                    .logo {{
                        height: 58px;
                    }}
                    .detail-line {{
                        font-size: 11.5px;
                        margin-bottom: 3.5px;
                    }}
                    .detail-label {{
                        font-size: 11px;
                        min-width: 70px;
                    }}
                    .detail-value {{
                        font-size: 11.5px;
                    }}
                    .detail-line.price-line .detail-value {{
                        font-size: 12.5px;
                    }}
                }}

                /* Print Styles for A4 Landscape */
                @media print {{
                    html, body {{
                        background-color: #ffffff !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 297mm !important;
                        height: 210mm !important;
                    }}
                    
                    .print-controls {{
                        display: none !important;
                    }}
                    
                    .certificate-container {{
                        margin: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                        border-radius: 0 !important;
                        width: 297mm !important;
                        height: 210mm !important;
                        max-width: 297mm !important;
                        min-height: 210mm !important;
                        aspect-ratio: auto !important;
                        padding: 10mm 14mm !important;
                        page-break-after: avoid !important;
                        page-break-before: avoid !important;
                        page-break-inside: avoid !important;
                    }}

                    .tag-content-row {{
                        display: flex !important;
                        flex-direction: row !important;
                        gap: 8mm !important;
                    }}

                    .painting-wrapper {{
                        display: inline-flex !important;
                        max-height: 155mm !important;
                    }}

                    .painting-image {{
                        max-height: 155mm !important;
                        max-width: 100% !important;
                        width: auto !important;
                        height: auto !important;
                        object-fit: contain !important;
                    }}

                    .right-col {{
                        flex: 0 0 65mm !important;
                        width: 65mm !important;
                    }}

                    .logo-container {{
                        top: 10mm !important;
                        right: 14mm !important;
                    }}

                    .logo {{
                        height: 20mm !important;
                    }}

                    .detail-line {{
                        font-size: 9.5pt !important;
                        margin-bottom: 2mm !important;
                    }}
                    .detail-label {{
                        font-size: 9pt !important;
                    }}
                    .detail-value {{
                        font-size: 9.5pt !important;
                    }}
                    .detail-line.price-line .detail-value {{
                        font-size: 10.5pt !important;
                    }}
                    
                    @page {{
                        size: A4 landscape;
                        margin: 0;
                    }}
                }}
            </style>
            <!-- Libraries for high quality PDF and Image export -->
            <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
            <script>
                // Align details column bottom precisely with rendered image bottom
                function alignDetailsWithPainting() {{
                    const img = document.getElementById('artworkImg');
                    const rightCol = document.getElementById('rightCol');
                    const leftCol = document.getElementById('leftCol');
                    if (img && rightCol && leftCol) {{
                        const imgRect = img.getBoundingClientRect();
                        const leftColRect = leftCol.getBoundingClientRect();
                        const imgBottomRelativeToCol = imgRect.bottom - leftColRect.top;
                        if (imgBottomRelativeToCol > 50) {{
                            rightCol.style.height = imgBottomRelativeToCol + 'px';
                        }}
                    }}
                }}

                window.addEventListener('load', function() {{
                    alignDetailsWithPainting();
                    setTimeout(alignDetailsWithPainting, 100);
                    setTimeout(alignDetailsWithPainting, 400);
                }});

                window.addEventListener('resize', alignDetailsWithPainting);

                // Download high quality PDF
                function downloadPDF() {{
                    const element = document.getElementById('tagCard');
                    const opt = {{
                        margin:       0,
                        filename:     '{file_base_name}_tag.pdf',
                        image:        {{ type: 'jpeg', quality: 0.98 }},
                        html2canvas:  {{ scale: 2.5, useCORS: true, logging: false }},
                        jsPDF:        {{ unit: 'mm', format: 'a4', orientation: 'landscape' }}
                    }};
                    html2pdf().from(element).set(opt).save();
                }}

                // Download high-res Complete Tag Image (Canvas with Painting + Matter + Logo)
                function downloadTagImage() {{
                    const element = document.getElementById('tagCard');
                    html2canvas(element, {{
                        scale: 3,
                        useCORS: true,
                        allowTaint: true,
                        backgroundColor: '#ffffff',
                        logging: false
                    }}).then(canvas => {{
                        const link = document.createElement('a');
                        link.download = '{file_base_name}_tag.jpg';
                        link.href = canvas.toDataURL('image/jpeg', 0.98);
                        link.click();
                    }}).catch(err => {{
                        console.error("Canvas export failed:", err);
                    }});
                }}
            </script>
        </head>
        <body>
            <div class="print-controls">
                <button class="btn btn-raw-img" onclick="downloadTagImage()">Download</button>
                <button class="btn btn-pdf" onclick="downloadPDF()">Download In PDF</button>
                <button class="btn btn-print" onclick="window.print()">Print</button>
            </div>
            
            <div class="certificate-container" id="tagCard">
                <div class="logo-container">
                    <img class="logo" src="/api/artworks/logo" alt="Mainframe The Gallery">
                </div>
                
                <div class="tag-content-row">
                    <div class="left-col" id="leftCol">
                        <div class="painting-wrapper">
                            <img id="artworkImg" class="painting-image" src="/api/artworks/image/{artwork_id}" alt="{title}" onload="alignDetailsWithPainting()">
                        </div>
                    </div>
                    
                    <div class="right-col" id="rightCol">
                        <div class="details-container">
                            <div class="detail-line"><span class="detail-label">Artist Name:</span> <span class="detail-value">{artist}</span></div>
                            {f'<div class="detail-line"><span class="detail-label">Title:</span> <span class="detail-value">{title}</span></div>' if show_title else ''}
                            <div class="detail-line"><span class="detail-label">Medium:</span> <span class="detail-value">{medium}</span></div>
                            <div class="detail-line"><span class="detail-label">Size:</span> <span class="detail-value">{dimensions}</span></div>
                            {f'<div class="detail-line price-line"><span class="detail-label">Price:</span> <span class="detail-value">{price_formatted}</span></div>' if price_formatted else ''}
                        </div>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        return HTMLResponse(content=html_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database or rendering error: {str(e)}")

@router.get("/next-code/{artist_id}")
def get_next_artwork_code(artist_id: str):
    """
    Calculates and returns the next sequential code for an artist.
    """
    import re
    from collections import Counter
    
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # 1. Fetch artist details
            cursor.execute("SELECT first_name, last_name FROM art_artists WHERE id = %s AND deleted = 0", (artist_id,))
            artist = cursor.fetchone()
            if not artist:
                raise HTTPException(status_code=404, detail="Artist not found")
                
            first_name = artist.get("first_name") or ""
            last_name = artist.get("last_name") or ""
            full_name = f"{first_name} {last_name}".strip()
            
            # 2. Fetch existing artwork titles
            cursor.execute("""
                SELECT c.document_name 
                FROM art_collections c
                JOIN art_artists_art_collections_c rel ON c.id = rel.art_artists_art_collectionsart_collections_idb
                WHERE rel.art_artists_art_collectionsart_artists_ida = %s 
                  AND c.deleted = 0 
                  AND c.document_name LIKE '%%-%%'
            """, (artist_id,))
            
            titles = [row["document_name"] for row in cursor.fetchall()]
            
            # 3. Parse existing titles
            prefix_numbers = []
            for t in titles:
                match = re.match(r"^(.+?)-(\d+)$", t.strip())
                if match:
                    prefix = match.group(1)
                    num = int(match.group(2))
                    prefix_numbers.append((prefix, num))
            
            if prefix_numbers:
                prefixes = [p[0] for p in prefix_numbers]
                best_prefix = Counter(prefixes).most_common(1)[0][0]
                max_num = max(num for p, num in prefix_numbers if p == best_prefix)
                next_num = max_num + 1
                next_code = f"{best_prefix}-{next_num}"
                return {"next_code": next_code, "numeric_part": str(next_num)}
                
            # 4. Generate new prefix from name
            cleaned_name = re.sub(r'[^a-zA-Z\s]', '', full_name)
            parts = [p.strip() for p in cleaned_name.split() if p.strip()]
            if len(parts) >= 2:
                prefix = ".".join([p[0].upper() for p in parts[:3]])
            elif len(parts) == 1:
                prefix = parts[0][:3].upper()
            else:
                prefix = "ART"
                
            return {"next_code": f"{prefix}-101", "numeric_part": "101"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        connection.close()


class InquiryCreate(BaseModel):
    artwork_id: str
    name: str
    email: str
    phone: str = ""
    mobile: str
    city: str = ""
    country: str = ""
    address: str = ""
    message: str = ""


@router.post("/inquiry")
def submit_artwork_inquiry(data: InquiryCreate):
    """
    Submits a new inquiry for an artwork, saves it to the database,
    and tries to send an email notification to mainframethegallery@gmail.com.
    """
    import smtplib
    from email.mime.text import MIMEText
    from email.header import Header

    # 1. Fetch artwork details first to include in the email
    art_query = """
        SELECT 
            c.id AS id,
            c.document_name AS title,
            cstm.code_c AS code,
            CONCAT(COALESCE(a.first_name, ''), ' ', COALESCE(a.last_name, '')) AS artist_name
        FROM art_collections c
        LEFT JOIN art_collections_cstm cstm ON c.id = cstm.id_c
        LEFT JOIN art_artists_art_collections_c rel 
            ON c.id = rel.art_artists_art_collectionsart_collections_idb AND rel.deleted = 0
        LEFT JOIN art_artists a 
            ON rel.art_artists_art_collectionsart_artists_ida = a.id AND a.deleted = 0
        WHERE c.id = %s AND c.deleted = 0;
    """
    artwork = execute_query(art_query, (data.artwork_id,), fetch="one")
    if not artwork:
        raise HTTPException(status_code=404, detail="Artwork not found")

    inquiry_id = str(uuid.uuid4())
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Split name into first and last name
    name_parts = data.name.strip().split(" ", 1)
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else ""

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # 2. Insert into art_collectioninquiry
            insert_inquiry = """
                INSERT INTO art_collectioninquiry (
                    id, date_entered, date_modified, modified_user_id, created_by,
                    first_name, last_name, phone_home, phone_mobile, 
                    primary_address_street, primary_address_city, primary_address_country,
                    description, deleted
                ) VALUES (%s, %s, %s, '1', '1', %s, %s, %s, %s, %s, %s, %s, %s, 0);
            """
            cursor.execute(insert_inquiry, (
                inquiry_id, now, now, first_name, last_name, data.phone or "", data.mobile,
                data.address or "", data.city or "", data.country or "", data.message or ""
            ))

            # 3. Handle email address in CRM
            email_caps = data.email.strip().upper()
            cursor.execute("SELECT id FROM email_addresses WHERE email_address_caps = %s AND deleted = 0 LIMIT 1;", (email_caps,))
            email_row = cursor.fetchone()
            
            if email_row:
                email_id = email_row["id"]
            else:
                email_id = str(uuid.uuid4())
                cursor.execute(
                    "INSERT INTO email_addresses (id, email_address, email_address_caps, date_created, date_modified, deleted) VALUES (%s, %s, %s, %s, %s, 0);",
                    (email_id, data.email.strip(), email_caps, now, now)
                )

            # Link email address to inquiry record
            rel_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO email_addr_bean_rel (
                    id, email_address_id, bean_id, bean_module, primary_address, reply_to_address, date_created, date_modified, deleted
                ) VALUES (%s, %s, %s, 'art_CollectionInquiry', 1, 0, %s, %s, 0);
            """, (rel_id, email_id, inquiry_id, now, now))

            # 4. Insert into art_collectioninquiry_cstm to link it to the artwork
            cursor.execute(
                "INSERT INTO art_collectioninquiry_cstm (id_c, art_collections_id_c) VALUES (%s, %s);",
                (inquiry_id, data.artwork_id)
            )

            connection.commit()
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Database failed to store inquiry: {str(e)}")
    finally:
        connection.close()

    # 5. Send SMTP email notification (try-except block so frontend always gets success if DB store works)
    # Construct email body
    email_body = f"""New Inquiry Received from Gallery Website:

Artwork Details:
----------------
Title: {artwork['title']}
Code: {artwork['code'] or 'N/A'}
Artist: {artwork['artist_name'] or 'N/A'}
Image Link: http://localhost:8000/api/artworks/image/{artwork['id']}

Customer Details:
-----------------
Name: {data.name}
Email: {data.email}
Phone (Landline): {data.phone or 'N/A'}
Mobile: {data.mobile}
City: {data.city or 'N/A'}
Country: {data.country or 'N/A'}
Address: {data.address or 'N/A'}

Customer Message:
-----------------
{data.message}
"""
    
    to_email = "mainframethegallery@gmail.com"
    subject = f"Website Inquiry: {artwork['title']} (Code: {artwork['code'] or 'N/A'})"
    
    msg = MIMEText(email_body, 'plain', 'utf-8')
    msg['Subject'] = Header(subject, 'utf-8')
    msg['From'] = "info@mainframethegallery.com"
    msg['To'] = to_email
    
    email_sent = False
    try:
        # Try local SMTP relay
        with smtplib.SMTP('localhost', 25, timeout=5) as server:
            server.sendmail(msg['From'], [to_email], msg.as_string())
            email_sent = True
    except Exception as e:
        print(f"SMTP send failed: {str(e)}")

    return {
        "success": True, 
        "inquiry_id": inquiry_id, 
        "email_sent": email_sent,
        "message": "Inquiry submitted successfully and recorded in CRM."
    }
