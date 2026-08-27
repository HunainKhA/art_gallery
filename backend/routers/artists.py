import uuid
import os
import shutil
from datetime import datetime
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, UploadFile, File
from database import execute_query, get_db_connection
from config import Config

router = APIRouter(prefix="/api/artists", tags=["Artists"])

class ArtistRequest(BaseModel):
    first_name: str
    last_name: str = ""
    title: str = ""
    bio: str = ""
    profile_image: str = ""
    phone_mobile: str = ""
    phone_other: str = ""
    email: str = ""
    primary_address_street: str = ""
    primary_address_city: str = ""
    primary_address_state: str = ""
    primary_address_postalcode: str = ""
    primary_address_country: str = ""
    alt_address_street: str = ""
    alt_address_city: str = ""
    alt_address_state: str = ""
    alt_address_postalcode: str = ""
    alt_address_country: str = ""
    artist_advance: float = 0.0
    pending_amount: float = 0.0
    artist_biography: str = ""

class ArtistImportList(BaseModel):
    artists: list[ArtistRequest]


@router.get("")
def get_all_artists():
    """
    Fetches all active artists from the SugarCRM database.
    """
    query = """
        SELECT 
            a.id,
            a.first_name,
            a.last_name,
            a.title,
            COALESCE(c.artist_biography_c, a.description) AS bio,
            a.filename AS profile_image,
            a.phone_mobile,
            a.phone_other,
            a.primary_address_street,
            a.primary_address_city,
            a.primary_address_state,
            a.primary_address_postalcode,
            a.primary_address_country,
            a.alt_address_street,
            a.alt_address_city,
            a.alt_address_state,
            a.alt_address_postalcode,
            a.alt_address_country,
            c.artist_advance_c AS artist_advance,
            c.pending_amount_c AS pending_amount,
            c.artist_biography_c AS artist_biography,
            e.email_address AS email
        FROM art_artists a
        LEFT JOIN art_artists_cstm c ON a.id = c.id_c
        LEFT JOIN email_addr_bean_rel r ON a.id = r.bean_id AND r.bean_module = 'art_Artists' AND r.primary_address = 1 AND r.deleted = 0
        LEFT JOIN email_addresses e ON r.email_address_id = e.id AND e.deleted = 0
        WHERE a.deleted = 0;
    """
    try:
        artists = execute_query(query)
        # Combine first and last name
        for artist in artists:
            artist["name"] = f"{artist['first_name'] or ''} {artist['last_name'] or ''}".strip()
            # Convert decimal fields to float
            artist["artist_advance"] = float(artist["artist_advance"]) if artist["artist_advance"] is not None else 0.0
            artist["pending_amount"] = float(artist["pending_amount"]) if artist["pending_amount"] is not None else 0.0
        
        # Robust Alphabetical sorting (A-Z) by display name
        artists.sort(key=lambda x: (x['name'] or '').strip().upper())
        return artists
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/{artist_id}")
def get_artist_by_id(artist_id: str):
    """
    Fetches details of a single artist along with all their artworks/paintings.
    """
    artist_query = """
        SELECT 
            a.id,
            a.first_name,
            a.last_name,
            a.title,
            COALESCE(c.artist_biography_c, a.description) AS bio,
            a.filename AS profile_image,
            a.phone_mobile,
            a.phone_other,
            a.primary_address_street,
            a.primary_address_city,
            a.primary_address_state,
            a.primary_address_postalcode,
            a.primary_address_country,
            a.alt_address_street,
            a.alt_address_city,
            a.alt_address_state,
            a.alt_address_postalcode,
            a.alt_address_country,
            c.artist_advance_c AS artist_advance,
            c.pending_amount_c AS pending_amount,
            c.artist_biography_c AS artist_biography,
            e.email_address AS email
        FROM art_artists a
        LEFT JOIN art_artists_cstm c ON a.id = c.id_c
        LEFT JOIN email_addr_bean_rel r ON a.id = r.bean_id AND r.bean_module = 'art_Artists' AND r.primary_address = 1 AND r.deleted = 0
        LEFT JOIN email_addresses e ON r.email_address_id = e.id AND e.deleted = 0
        WHERE a.id = %s AND a.deleted = 0;
    """
    artworks_query = """
        SELECT 
            c.id AS id,
            c.document_name AS title,
            c.filename AS image,
            cstm.sale_gallery_price_c AS price,
            c.collection_status AS status,
            cstm.collection_size_length_c AS length,
            cstm.collection_size_width_c AS width
        FROM art_collections c
        LEFT JOIN art_collections_cstm cstm ON c.id = cstm.id_c
        LEFT JOIN art_artists_art_collections_c rel 
            ON c.id = rel.art_artists_art_collectionsart_collections_idb AND rel.deleted = 0
        WHERE rel.art_artists_art_collectionsart_artists_ida = %s AND c.deleted = 0;
    """
    try:
        artist = execute_query(artist_query, (artist_id,), fetch="one")
        if not artist:
            raise HTTPException(status_code=404, detail="Artist not found")
            
        artist["name"] = f"{artist['first_name'] or ''} {artist['last_name'] or ''}".strip()
        artist["artist_advance"] = float(artist["artist_advance"]) if artist["artist_advance"] is not None else 0.0
        artist["pending_amount"] = float(artist["pending_amount"]) if artist["pending_amount"] is not None else 0.0
        
        artworks = execute_query(artworks_query, (artist_id,))
        for art in artworks:
            try:
                art["price"] = float(art["price"]) if art["price"] else 0.0
            except ValueError:
                art["price"] = 0.0
                
        artist["artworks"] = artworks
        return artist
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


def set_bean_email(cursor, bean_id, bean_module, email_str, now):
    if not email_str:
        # Soft delete any existing links
        cursor.execute("UPDATE email_addr_bean_rel SET deleted = 1, date_modified = %s WHERE bean_id = %s AND bean_module = %s;", (now, bean_id, bean_module))
        return
    
    email_caps = email_str.upper()
    # Check if email address already exists
    cursor.execute("SELECT id FROM email_addresses WHERE email_address_caps = %s AND deleted = 0 LIMIT 1;", (email_caps,))
    email_row = cursor.fetchone()
    if email_row:
        email_id = email_row["id"]
    else:
        email_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO email_addresses (id, email_address, email_address_caps, invalid_email, opt_out, date_created, date_modified, deleted)
            VALUES (%s, %s, %s, 0, 0, %s, %s, 0);
        """, (email_id, email_str, email_caps, now, now))
        
    # Check if link already exists
    cursor.execute("""
        SELECT id, email_address_id FROM email_addr_bean_rel 
        WHERE bean_id = %s AND bean_module = %s AND primary_address = 1 AND deleted = 0 
        LIMIT 1;
    """, (bean_id, bean_module))
    link_row = cursor.fetchone()
    if link_row:
        if link_row["email_address_id"] != email_id:
            cursor.execute("""
                UPDATE email_addr_bean_rel SET email_address_id = %s, date_modified = %s 
                WHERE id = %s;
            """, (email_id, now, link_row["id"]))
    else:
        link_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO email_addr_bean_rel (id, email_address_id, bean_id, bean_module, primary_address, reply_to_address, date_created, date_modified, deleted)
            VALUES (%s, %s, %s, %s, 1, 1, %s, %s, 0);
        """, (link_id, email_id, bean_id, bean_module, now, now))

@router.post("")
def create_artist(data: ArtistRequest):
    """
    Creates a new artist in the SugarCRM tables.
    """
    artist_id = str(uuid.uuid4())
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    insert_artist = """
        INSERT INTO art_artists (
            id, date_entered, date_modified, modified_user_id, created_by, 
            description, deleted, first_name, last_name, title, phone_mobile, phone_other,
            primary_address_street, primary_address_city, primary_address_state, primary_address_postalcode, primary_address_country,
            alt_address_street, alt_address_city, alt_address_state, alt_address_postalcode, alt_address_country, filename
        ) VALUES (%s, %s, %s, '1', '1', %s, 0, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
    """
    insert_cstm = """
        INSERT INTO art_artists_cstm (id_c, artist_advance_c, pending_amount_c, artist_biography_c, enter_advance_c)
        VALUES (%s, %s, %s, %s, %s);
    """
    
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(insert_artist, (
                artist_id, now, now, data.bio, data.first_name, data.last_name, 
                data.title, data.phone_mobile, data.phone_other,
                data.primary_address_street, data.primary_address_city, data.primary_address_state, data.primary_address_postalcode, data.primary_address_country,
                data.alt_address_street, data.alt_address_city, data.alt_address_state, data.alt_address_postalcode, data.alt_address_country,
                data.profile_image
            ))
            
            bio_text = data.artist_biography or data.bio
            cursor.execute(insert_cstm, (artist_id, data.artist_advance, data.pending_amount, bio_text, data.artist_advance))
            
            # Link primary email address
            if data.email:
                set_bean_email(cursor, artist_id, "art_Artists", data.email, now)
                
            connection.commit()
            return {"success": True, "id": artist_id, "message": "Artist successfully created."}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create artist: {str(e)}")
    finally:
        connection.close()


@router.put("/{artist_id}")
def update_artist(artist_id: str, data: ArtistRequest):
    """
    Updates details of an existing artist.
    """
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    update_artist_query = """
        UPDATE art_artists 
        SET 
            date_modified = %s, description = %s, first_name = %s, last_name = %s, 
            title = %s, phone_mobile = %s, phone_other = %s,
            primary_address_street = %s, primary_address_city = %s, primary_address_state = %s, primary_address_postalcode = %s, primary_address_country = %s,
            alt_address_street = %s, alt_address_city = %s, alt_address_state = %s, alt_address_postalcode = %s, alt_address_country = %s, filename = COALESCE(NULLIF(%s, ''), filename)
        WHERE id = %s AND deleted = 0;
    """
    update_cstm_query = """
        UPDATE art_artists_cstm 
        SET artist_advance_c = %s, pending_amount_c = %s, artist_biography_c = %s
        WHERE id_c = %s;
    """
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(update_artist_query, (
                now, data.bio, data.first_name, data.last_name, data.title, 
                data.phone_mobile, data.phone_other,
                data.primary_address_street, data.primary_address_city, data.primary_address_state, data.primary_address_postalcode, data.primary_address_country,
                data.alt_address_street, data.alt_address_city, data.alt_address_state, data.alt_address_postalcode, data.alt_address_country,
                data.profile_image, artist_id
            ))
            
            bio_text = data.artist_biography or data.bio
            cursor.execute(update_cstm_query, (data.artist_advance, data.pending_amount, bio_text, artist_id))
            
            # Update primary email
            set_bean_email(cursor, artist_id, "art_Artists", data.email, now)
            
            connection.commit()
            return {"success": True, "message": "Artist successfully updated."}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update artist: {str(e)}")
    finally:
        connection.close()


@router.delete("/{artist_id}")
def delete_artist(artist_id: str):
    """
    Soft-deletes an artist from the database.
    """
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    query = "UPDATE art_artists SET deleted = 1, date_modified = %s WHERE id = %s;"
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(query, (now, artist_id))
            connection.commit()
            return {"success": True, "message": "Artist deleted successfully."}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete artist: {str(e)}")
    finally:
        connection.close()

@router.post("/import")
def import_artists(data: ArtistImportList):
    """
    Batch imports multiple artists from a CSV list.
    """
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    connection = get_db_connection()
    success_count = 0
    try:
        with connection.cursor() as cursor:
            for artist_data in data.artists:
                artist_id = str(uuid.uuid4())
                insert_artist = """
                    INSERT INTO art_artists (
                        id, date_entered, date_modified, modified_user_id, created_by, 
                        description, deleted, first_name, last_name, title, phone_mobile, phone_other,
                        primary_address_street, primary_address_city, primary_address_state, primary_address_postalcode, primary_address_country,
                        alt_address_street, alt_address_city, alt_address_state, alt_address_postalcode, alt_address_country, filename
                    ) VALUES (%s, %s, %s, '1', '1', %s, 0, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                """
                insert_cstm = """
                    INSERT INTO art_artists_cstm (id_c, artist_advance_c, pending_amount_c, artist_biography_c, enter_advance_c)
                    VALUES (%s, %s, %s, %s, %s);
                """
                cursor.execute(insert_artist, (
                    artist_id, now, now, artist_data.bio, artist_data.first_name, artist_data.last_name, 
                    artist_data.title, artist_data.phone_mobile, artist_data.phone_other,
                    artist_data.primary_address_street, artist_data.primary_address_city, artist_data.primary_address_state, artist_data.primary_address_postalcode, artist_data.primary_address_country,
                    artist_data.alt_address_street, artist_data.alt_address_city, artist_data.alt_address_state, artist_data.alt_address_postalcode, artist_data.alt_address_country,
                    artist_data.profile_image
                ))
                
                bio_text = artist_data.artist_biography or artist_data.bio
                cursor.execute(insert_cstm, (artist_id, artist_data.artist_advance, artist_data.pending_amount, bio_text, artist_data.artist_advance))
                
                if artist_data.email:
                    set_bean_email(cursor, artist_id, "art_Artists", artist_data.email, now)
                
                success_count += 1
            connection.commit()
            return {"success": True, "message": f"Successfully imported {success_count} artists."}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Batch import failed: {str(e)}")
    finally:
        connection.close()


@router.post("/upload-image")
def upload_artist_image(file: UploadFile = File(...)):
    """
    Uploads an artist profile image to the SugarCRM upload directory.
    """
    upload_dir = Config.UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)
    
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        raise HTTPException(status_code=400, detail="Only JPG, JPEG, PNG, and WEBP images are allowed.")
        
    unique_filename = f"artist_{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(upload_dir, unique_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return {"success": True, "filename": unique_filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded image: {str(e)}")


@router.get("/image/{filename}")
def get_artist_image(filename: str):
    """
    Serves an artist profile image from SugarCRM's upload directory.
    """
    from fastapi.responses import FileResponse, RedirectResponse
    upload_dir = Config.UPLOAD_DIR
    file_path = os.path.join(upload_dir, filename)
    if os.path.exists(file_path):
        return FileResponse(file_path)
    
    try:
        query = "SELECT filename FROM art_artists WHERE id = %s AND deleted = 0;"
        res = execute_query(query, (filename,), fetch="one")
        if res and res["filename"]:
            alt_path = os.path.join(upload_dir, res["filename"])
            if os.path.exists(alt_path):
                return FileResponse(alt_path)
    except:
        pass
        
    return RedirectResponse(url="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300")


@router.get("/{artist_id}/portfolio-report")
def get_artist_portfolio_report(artist_id: str):
    """
    Serves a print-ready PDF/HTML report of the artist's full portfolio
    with customizable selection, 10 paintings per page, exact column layout:
    S# | Code & Type | Painting | Medium | Size | Price | Invoice | Status
    """
    from fastapi.responses import HTMLResponse
    import json
    
    # 1. Fetch artist profile
    artist_query = """
        SELECT 
            a.id,
            a.first_name,
            a.last_name,
            a.title,
            a.description AS bio,
            a.filename AS profile_image,
            a.phone_mobile,
            e.email_address AS email,
            c.artist_advance_c AS artist_advance,
            c.pending_amount_c AS pending_amount
        FROM art_artists a
        LEFT JOIN art_artists_cstm c ON a.id = c.id_c
        LEFT JOIN email_addr_bean_rel r ON a.id = r.bean_id AND r.bean_module = 'art_Artists' AND r.primary_address = 1 AND r.deleted = 0
        LEFT JOIN email_addresses e ON r.email_address_id = e.id AND e.deleted = 0
        WHERE a.id = %s AND a.deleted = 0;
    """
    
    # 2. Fetch all artworks with size, status, code, price, invoice, and type
    artworks_query = """
        SELECT 
            c.id AS id,
            c.document_name AS title,
            c.filename AS image,
            c.collection_status AS status,
            c.date_entered AS date_added,
            cstm.sale_gallery_price_c AS price,
            cstm.collection_size_length_c AS length,
            cstm.collection_size_width_c AS width,
            cstm.code_c AS code,
            cstm.sale_c AS deal_type,
            cstm.purchase_price_c AS purchase_price,
            m.name AS medium_name,
            (
                SELECT inv.invoice_id1 
                FROM saleinvoicedetail d 
                JOIN saleinvoice inv ON d.invoice_id = inv.invoice_id1 AND d.branch_id = inv.branch_id
                WHERE (d.paintingId = c.id OR (cstm.code_c IS NOT NULL AND cstm.code_c != '' AND d.code = cstm.code_c)) 
                  AND inv.is_cancel = 0
                ORDER BY inv.invoice_id1 DESC 
                LIMIT 1
            ) AS invoice_number
        FROM art_collections c
        LEFT JOIN art_collections_cstm cstm ON c.id = cstm.id_c
        LEFT JOIN art_artists_art_collections_c rel 
            ON c.id = rel.art_artists_art_collectionsart_collections_idb AND rel.deleted = 0
        LEFT JOIN art_medium_art_collections_c med_rel ON c.id = med_rel.art_medium_art_collectionsart_collections_idb AND med_rel.deleted = 0
        LEFT JOIN art_medium m ON med_rel.art_medium_art_collectionsart_medium_ida = m.id AND m.deleted = 0
        WHERE rel.art_artists_art_collectionsart_artists_ida = %s AND c.deleted = 0
        ORDER BY c.date_entered DESC;
    """
    
    try:
        artist = execute_query(artist_query, (artist_id,), fetch="one")
        if not artist:
            return HTMLResponse("<h3>Artist not found</h3>", status_code=404)
            
        full_name = f"{artist['first_name'] or ''} {artist['last_name'] or ''}".strip()
        artworks_raw = execute_query(artworks_query, (artist_id,))
        
        total_sold_value = 0.0
        total_unsold_value = 0.0
        total_artist_share = 0.0
        
        artworks_data = []
        for idx, art in enumerate(artworks_raw, 1):
            # Parse price
            try:
                price_num = float(art["price"]) if art["price"] else 0.0
                price_str = f"{int(price_num):,}" if price_num.is_integer() else f"{price_num:,.2f}"
            except:
                price_num = 0.0
                price_str = "0"
                
            try:
                purchase_price = float(art["purchase_price"]) if art["purchase_price"] else 0.0
            except:
                purchase_price = 0.0
            
            # Deal type
            deal_raw = (art.get("deal_type") or "").strip()
            if "gallery" in deal_raw.lower() or "purchase" in deal_raw.lower():
                deal_display = "Gallery Purchase"
            else:
                deal_display = "Sale Basis"
            
            # Dimensions
            try:
                l = float(art["length"]) if art["length"] else 0.0
                w = float(art["width"]) if art["width"] else 0.0
                dim = f'{int(l) if l.is_integer() else l}" x {int(w) if w.is_integer() else w}"' if (l > 0 or w > 0) else 'N/A'
            except:
                dim = 'N/A'
                
            # Status normalization (Available, Sold, Return)
            raw_status = (art.get("status") or "").strip()
            if raw_status.lower() in ["sold"]:
                norm_status = "Sold"
                total_sold_value += price_num
                if "gallery" in deal_raw.lower() or "purchase" in deal_raw.lower():
                    total_artist_share += purchase_price
                else:
                    total_artist_share += (0.60 * price_num)
            elif raw_status.lower() in ["return", "returned"]:
                norm_status = "Return"
                total_unsold_value += price_num
            else:
                norm_status = "Available"
                total_unsold_value += price_num
                
            inv_no = art.get("invoice_number")
            inv_display = f"#{inv_no}" if inv_no else ""
            
            artworks_data.append({
                "id": str(art.get("id")),
                "index": idx,
                "code": art.get("code") or "N/A",
                "deal_type": deal_display,
                "title": art.get("title") or "Untitled",
                "medium": art.get("medium_name") or "Original Medium",
                "size": dim,
                "price": price_str,
                "price_num": price_num,
                "invoice": inv_display,
                "status": norm_status
            })
            
        json_artworks = json.dumps(artworks_data)
        
        # Advance & Metrics
        try:
            advance = float(artist["artist_advance"]) if artist["artist_advance"] else 0.0
        except:
            advance = 0.0
            
        total_items = len(artworks_data)
        sold_items = len([a for a in artworks_data if a["status"] == "Sold"])
        avail_items = len([a for a in artworks_data if a["status"] == "Available"])
        return_items = len([a for a in artworks_data if a["status"] == "Return"])
        outstanding_val = total_artist_share - advance
        
        html_content = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Portfolio Report - {full_name}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap');
                
                * {{ box-sizing: border-box; margin: 0; padding: 0; }}
                body {{ background-color: #f1f3f5; font-family: 'Montserrat', sans-serif; color: #111; padding: 15px; }}
                
                .controls-bar {{ max-width: 1050px; margin: 0 auto 20px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); display: flex; flex-direction: column; gap: 12px; }}
                .controls-top-row {{ display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }}
                .report-title-badge {{ font-size: 16px; font-weight: 700; color: #111827; display: flex; align-items: center; gap: 8px; }}
                .report-title-badge span {{ color: #bda04c; }}
                .controls-actions {{ display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }}
                .btn {{ padding: 8px 16px; font-family: 'Montserrat', sans-serif; font-size: 13px; font-weight: 600; border-radius: 6px; border: 1px solid transparent; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s ease; }}
                .btn-print {{ background-color: #111827; color: #ffffff; }}
                .btn-gold {{ background-color: #bda04c; color: #ffffff; }}
                .btn-secondary {{ background-color: #f3f4f6; color: #374151; border-color: #d1d5db; }}
                
                .controls-bottom-row {{ display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; border-top: 1px solid #f1f5f9; padding-top: 10px; }}
                .filter-tabs {{ display: flex; gap: 6px; flex-wrap: wrap; }}
                .filter-btn {{ padding: 5px 12px; font-size: 12px; font-weight: 600; border: 1px solid #e2e8f0; background: #f8fafc; color: #475569; border-radius: 4px; cursor: pointer; transition: all 0.15s ease; }}
                .filter-btn.active {{ background: #111827; color: #ffffff; border-color: #111827; }}
                .selection-counter {{ font-size: 13px; font-weight: 600; color: #64748b; }}
                .selection-counter b {{ color: #0f172a; }}

                .report-page {{ width: 100%; max-width: 1050px; margin: 0 auto 30px; background-color: #ffffff; border-radius: 6px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); padding: 26px 32px 20px; box-sizing: border-box; display: flex; flex-direction: column; }}

                .page-header {{ display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #bda04c; padding-bottom: 10px; margin-bottom: 12px; }}
                .compact-header {{ border-bottom: 1.5px solid #d1d5db; padding-bottom: 6px; margin-bottom: 10px; }}

                .artist-header-info h1 {{ font-size: 22px; font-weight: 700; color: #111; margin-bottom: 2px; }}
                .artist-header-info p {{ font-size: 12.5px; color: #555; }}
                .gallery-header-branding {{ text-align: right; }}
                .gallery-header-branding img {{ height: 40px; object-fit: contain; margin-bottom: 2px; }}
                .gallery-header-branding .brand-title {{ font-size: 10.5px; font-weight: 700; letter-spacing: 0.5px; color: #333; }}
                .page-number-indicator {{ font-size: 11.5px; color: #111; margin-top: 2px; font-weight: 700; }}

                .metrics-grid {{ display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-bottom: 14px; }}
                .metric-card {{ background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 5px; padding: 8px 6px; text-align: center; }}
                .metric-card.highlight {{ background-color: rgba(16, 185, 129, 0.05); border-color: rgba(16, 185, 129, 0.25); }}
                .metric-label {{ font-size: 9.5px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.3px; margin-bottom: 3px; }}
                .metric-val {{ font-size: 14px; font-weight: 800; color: #0f172a; }}
                .metric-sub {{ font-size: 9.5px; color: #64748b; margin-top: 2px; font-weight: 500; }}

                .report-table {{ width: 100%; border-collapse: collapse; font-size: 12px; color: #1f2937; margin-bottom: 12px; border: 1px solid #cbd5e1; }}
                .report-table th {{ background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 7px 6px; font-weight: 700; color: #0f172a; text-align: left; font-size: 11.5px; letter-spacing: 0.2px; }}
                .report-table td {{ border: 1px solid #e2e8f0; padding: 6px 7px; vertical-align: middle; font-size: 12px; }}
                .report-table tr:nth-child(even) {{ background-color: #fafbfd; }}

                .col-select {{ width: 30px; text-align: center; }}
                .col-sno {{ width: 36px; text-align: center; font-weight: 600; color: #64748b; }}
                .col-code {{ width: 130px; }}
                .code-title {{ font-weight: 700; color: #0f172a; font-size: 12px; }}
                .deal-type-badge {{ display: inline-block; font-size: 9.5px; font-weight: 600; color: #000000; text-transform: uppercase; letter-spacing: 0.3px; margin-top: 1px; }}
                .col-photo {{ width: 75px; text-align: center; }}
                .painting-thumb {{ max-height: 44px; max-width: 65px; object-fit: contain; border-radius: 2px; border: 1px solid #cbd5e1; display: block; margin: 0 auto; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }}
                .col-medium {{ width: 135px; color: #334155; }}
                .col-size {{ width: 95px; font-weight: 500; color: #334155; white-space: nowrap; }}
                .col-price {{ width: 110px; text-align: right; font-weight: 700; color: #0f172a; white-space: nowrap; }}
                .col-invoice {{ width: 80px; text-align: center; font-weight: 600; color: #475569; }}
                .col-status {{ width: 90px; text-align: center; }}
                
                .status-text {{ font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; background: transparent !important; border: none !important; display: inline-block; }}
                .status-available {{ color: #16a34a !important; }}
                .status-sold {{ color: #dc2626 !important; }}
                .status-return {{ color: #7c3aed !important; }}

                .page-footer {{ margin-top: auto; border-top: 1px solid #e2e8f0; padding-top: 6px; display: flex; justify-content: space-between; font-size: 9.5px; color: #94a3b8; }}

                @media print {{
                    body {{ background-color: #ffffff !important; margin: 0 !important; padding: 0 !important; }}
                    .controls-bar, .col-select, .no-print {{ display: none !important; }}
                    .report-page {{ box-shadow: none !important; border-radius: 0 !important; margin: 0 !important; padding: 8mm 10mm !important; width: 100% !important; max-width: 100% !important; min-height: 280mm !important; page-break-after: always !important; break-after: page !important; }}
                    .report-page:last-child {{ page-break-after: auto !important; break-after: auto !important; }}
                    .report-table {{ border: 1.5px solid #000000 !important; width: 100% !important; }}
                    .report-table th {{ border: 1px solid #000000 !important; background-color: #eeeeee !important; color: #000000 !important; font-weight: 700 !important; -webkit-print-color-adjust: exact !important; }}
                    .report-table td {{ border: 1px solid #333333 !important; color: #000000 !important; padding: 3px 5px !important; }}
                    .painting-thumb {{ max-height: 38px !important; border: 1px solid #000 !important; -webkit-print-color-adjust: exact !important; }}
                    .status-text {{ border: none !important; background: transparent !important; -webkit-print-color-adjust: exact !important; }}
                    .status-available {{ color: #16a34a !important; }}
                    .status-sold {{ color: #dc2626 !important; }}
                    .status-return {{ color: #7c3aed !important; }}
                    @page {{ size: A4 portrait; margin: 4mm; }}
                }}
            </style>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
        </head>
        <body>
            <div class="controls-bar no-print">
                <div class="controls-top-row">
                    <div class="report-title-badge"><span>Mainframe</span> Portfolio Report: {full_name}</div>
                    <div class="controls-actions">
                        <button class="btn btn-secondary" onclick="selectAll(true)">Select All</button>
                        <button class="btn btn-secondary" onclick="selectAll(false)">Deselect All</button>
                        <button class="btn btn-secondary" onclick="selectFirstN(10)">Select First 10</button>
                        <button class="btn btn-gold" onclick="downloadPDF()">Download PDF</button>
                        <button class="btn btn-print" onclick="window.print()">Print Inventory</button>
                    </div>
                </div>
                <div class="controls-bottom-row">
                    <div class="filter-tabs">
                        <button class="filter-btn active" onclick="setFilter('all', this)">All ({total_items})</button>
                        <button class="filter-btn" onclick="setFilter('Available', this)">Available ({avail_items})</button>
                        <button class="filter-btn" onclick="setFilter('Sold', this)">Sold ({sold_items})</button>
                        <button class="filter-btn" onclick="setFilter('Return', this)">Return ({return_items})</button>
                    </div>
                    <div class="selection-counter">Selected: <b id="selectedCountText">{total_items}</b> of {total_items} items (<b id="pagesCountText">0</b> pages @ 10/page)</div>
                </div>
            </div>

            <div id="pagesContainer"></div>

            <script>
                const allArtworks = {json_artworks};
                const artistName = "{full_name}";
                const artistTitle = "{artist.get('title') or 'Professional Artist'}";
                const totalArtworksCount = {total_items};
                const statsTotalWorth = "{(total_sold_value + total_unsold_value):,.0f}";
                const statsTotalSoldVal = "{total_sold_value:,.0f}";
                const statsTotalUnsoldVal = "{total_unsold_value:,.0f}";
                const statsAdvance = "{advance:,.0f}";
                
                let selectedIds = new Set(allArtworks.map(a => a.id));
                let currentStatusFilter = 'all';

                function renderPages() {{
                    const container = document.getElementById('pagesContainer');
                    container.innerHTML = '';
                    const filtered = allArtworks.filter(a => (currentStatusFilter === 'all' || a.status === currentStatusFilter) && selectedIds.has(a.id));
                    document.getElementById('selectedCountText').innerText = filtered.length;
                    if (filtered.length === 0) {{ container.innerHTML = '<div class="report-page" style="text-align: center; padding: 60px 20px;"><h3>No paintings selected</h3></div>'; return; }}

                    const pageSize = 10;
                    const totalPages = Math.ceil(filtered.length / pageSize);
                    document.getElementById('pagesCountText').innerText = totalPages;

                    for (let p = 0; p < totalPages; p++) {{
                        const pageItems = filtered.slice(p * pageSize, (p + 1) * pageSize);
                        const pageNum = p + 1;
                        let rowsHtml = '';
                        pageItems.forEach((art, idx) => {{
                            const globalIndex = p * pageSize + idx + 1;
                            const statusClass = art.status === 'Sold' ? 'status-sold' : (art.status === 'Return' ? 'status-return' : 'status-available');
                            rowsHtml += `
                                <tr>
                                    <td class="col-select no-print"><input type="checkbox" checked onchange="toggleItem('${{art.id}}', this.checked)" style="cursor:pointer;"></td>
                                    <td class="col-sno">${{globalIndex}}</td>
                                    <td class="col-code"><div class="code-title">${{art.code}}</div><div class="deal-type-badge">${{art.deal_type}}</div></td>
                                    <td class="col-photo"><img class="painting-thumb" src="/api/artworks/image/${{art.id}}" onerror="this.src='https://placehold.co/70x50?text=Artwork'"></td>
                                    <td class="col-medium">${{art.medium}}</td>
                                    <td class="col-size">${{art.size}}</td>
                                    <td class="col-price">${{art.price}} PKR</td>
                                    <td class="col-invoice">${{art.invoice}}</td>
                                    <td class="col-status"><span class="status-text ${{statusClass}}">${{art.status}}</span></td>
                                </tr>`;
                        }});

                        let headerHtml = (pageNum === 1) ? `
                            <div class="page-header">
                                <div class="artist-header-info"><h1>${{artistName}}</h1><p>${{artistTitle}} &bull; Portfolio Statement</p></div>
                                <div class="gallery-header-branding"><img src="/api/artworks/logo" alt="Logo"><div class="brand-title">MAINFRAME THE GALLERY</div><div class="page-number-indicator">Page 1 of ${{totalPages}}</div></div>
                            </div>
                            <div class="metrics-grid">
                                <div class="metric-card"><div class="metric-label">Total Paintings</div><div class="metric-val">${{totalArtworksCount}}</div></div>
                                <div class="metric-card"><div class="metric-label">Total Worth</div><div class="metric-val" style="color:#0f172a;">${{statsTotalWorth}} PKR</div></div>
                                <div class="metric-card"><div class="metric-label">Sold Paintings</div><div class="metric-val" style="color:#dc2626;">${{allArtworks.filter(a => a.status === 'Sold').length}}</div><div class="metric-sub">${{statsTotalSoldVal}} PKR</div></div>
                                <div class="metric-card"><div class="metric-label">Available / Unsold</div><div class="metric-val" style="color:#16a34a;">${{allArtworks.filter(a => a.status === 'Available').length}}</div><div class="metric-sub">${{statsTotalUnsoldVal}} PKR</div></div>
                                <div class="metric-card"><div class="metric-label">Paid Advances</div><div class="metric-val">${{statsAdvance}} PKR</div></div>
                                <div class="metric-card highlight"><div class="metric-label" style="color:#059669;">Available Stock Value</div><div class="metric-val" style="color:#059669;">${{statsTotalUnsoldVal}} PKR</div></div>
                            </div>` : `
                            <div class="page-header compact-header"><div style="font-size: 13px; font-weight: 700;">${{artistName}} &bull; <span style="font-weight: 500; color: #64748b;">Portfolio</span></div><div class="page-number-indicator">Page ${{pageNum}} of ${{totalPages}}</div></div>`;

                        container.innerHTML += `<div class="report-page">${{headerHtml}}<table class="report-table"><thead><tr><th class="col-select no-print">#</th><th class="col-sno">S#</th><th class="col-code">Code</th><th class="col-photo">Painting</th><th class="col-medium">Medium</th><th class="col-size">Size</th><th class="col-price">Price</th><th class="col-invoice">Invoice</th><th class="col-status">Status</th></tr></thead><tbody>${{rowsHtml}}</tbody></table><div class="page-footer"><div>MainFrame The Gallery &bull; Karachi</div><div>${{new Date().toLocaleDateString()}}</div></div></div>`;
                    }}
                }}
                function toggleItem(id, isChecked) {{ isChecked ? selectedIds.add(id) : selectedIds.delete(id); renderPages(); }}
                function selectAll(state) {{ state ? allArtworks.forEach(a => selectedIds.add(a.id)) : selectedIds.clear(); renderPages(); }}
                function selectFirstN(n) {{ selectedIds.clear(); allArtworks.slice(0, n).forEach(a => selectedIds.add(a.id)); renderPages(); }}
                function setFilter(status, btnElem) {{ currentStatusFilter = status; document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active')); btnElem.classList.add('active'); renderPages(); }}
                function downloadPDF() {{ html2pdf().from(document.getElementById('pagesContainer')).set({{ margin: [4, 4, 4, 4], filename: 'Portfolio_{artist_id}.pdf', jsPDF: {{ unit: 'mm', format: 'a4', orientation: 'portrait' }} }}).save(); }}
                window.addEventListener('DOMContentLoaded', renderPages);
            </script>
        </body>
        </html>
        """
        return HTMLResponse(content=html_content)
    except Exception as e:
        return HTMLResponse(f"<h3>Error generating artist report: {str(e)}</h3>", status_code=500)
