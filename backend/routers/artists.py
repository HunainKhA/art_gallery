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
        WHERE a.deleted = 0
        ORDER BY a.first_name ASC, a.last_name ASC;
    """
    try:
        artists = execute_query(query)
        # Combine first and last name
        for artist in artists:
            artist["name"] = f"{artist['first_name'] or ''} {artist['last_name'] or ''}".strip()
            # Convert decimal fields to float
            artist["artist_advance"] = float(artist["artist_advance"]) if artist["artist_advance"] is not None else 0.0
            artist["pending_amount"] = float(artist["pending_amount"]) if artist["pending_amount"] is not None else 0.0
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
            c.collection_status AS status
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
            alt_address_street = %s, alt_address_city = %s, alt_address_state = %s, alt_address_postalcode = %s, alt_address_country = %s, filename = %s
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
    categorized by Sold and Unsold artworks with totals and metrics.
    """
    from fastapi.responses import HTMLResponse
    
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
    
    # 2. Fetch all artworks with size, status, code, price, and created date
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
            m.name AS medium_name
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
        
        artworks = execute_query(artworks_query, (artist_id,))
        
        # Split into Sold and Unsold
        sold_list = []
        unsold_list = []
        
        total_sold_value = 0.0
        total_unsold_value = 0.0
        total_artist_share = 0.0
        total_gallery_share = 0.0
        
        for art in artworks:
            # Parse price (Retail Price)
            try:
                price = float(art["price"]) if art["price"] else 0.0
            except:
                price = 0.0
            art["parsed_price"] = price
            
            # Parse purchase price
            try:
                purchase_price = float(art["purchase_price"]) if art["purchase_price"] else 0.0
            except:
                purchase_price = 0.0
            art["parsed_purchase_price"] = purchase_price
            
            # Deal type
            deal_type = art["deal_type"] if art["deal_type"] else "Sale_Basis"
            art["parsed_deal_type"] = "Sale Basis" if deal_type == "Sale_Basis" else "Gallery Purchase"
            
            # Format dimensions
            try:
                l = float(art["length"]) if art["length"] else 0.0
                w = float(art["width"]) if art["width"] else 0.0
                dim = f'{int(l) if l.is_integer() else l}" x {int(w) if w.is_integer() else w}"' if (l > 0 or w > 0) else 'N/A'
            except:
                dim = 'N/A'
            art["dimensions"] = dim
            
            # Format date
            if art["date_added"]:
                try:
                    art["date_str"] = datetime.strptime(str(art["date_added"]), "%Y-%m-%d %H:%M:%S").strftime("%b %d, %Y")
                except:
                    art["date_str"] = "N/A"
            else:
                art["date_str"] = "N/A"
                
            # Classify
            if art["status"] == "Sold":
                sold_list.append(art)
                total_sold_value += price
                
                # Calculate payout share
                if deal_type == "Sale_Basis":
                    gallery_cut = 0.40 * price
                    artist_share = 0.60 * price
                else:  # Purchase_Basis
                    artist_share = purchase_price
                    gallery_cut = max(0.0, price - purchase_price)
                    
                art["gallery_cut"] = gallery_cut
                art["artist_share"] = artist_share
                
                total_artist_share += artist_share
                total_gallery_share += gallery_cut
            else:
                unsold_list.append(art)
                total_unsold_value += price
                
        # Total counts
        total_artworks = len(artworks)
        sold_count = len(sold_list)
        unsold_count = len(unsold_list)
        
        # Advance & Pending Payments
        try:
            advance = float(artist["artist_advance"]) if artist["artist_advance"] else 0.0
        except:
            advance = 0.0
            
        outstanding_val = total_artist_share - advance
            
        # Build Sold and Unsold HTML tables
        sold_rows = ""
        for art in sold_list:
            art_id = art.get("id")
            code_val = art.get("code") or "N/A"
            title_val = art.get("title") or "Untitled"
            medium_val = art.get("medium_name") or "N/A"
            dims_val = art.get("dimensions") or "N/A"
            deal_type_val = art.get("parsed_deal_type")
            price_val = f"{art.get('parsed_price'):,.2f}"
            cut_val = f"{art.get('gallery_cut'):,.2f}"
            share_val = f"{art.get('artist_share'):,.2f}"
            sold_rows += f"""
            <tr>
                <td><strong>{code_val}</strong></td>
                <td style="text-align: center; vertical-align: middle; padding: 5px; width: 80px;">
                    <img src="/api/artworks/image/{art_id}" style="max-height: 45px; max-width: 70px; object-fit: contain; border-radius: 4px; border: 1px solid #eee; display: block; margin: 0 auto;" onerror="this.style.display='none'">
                </td>
                <td>{title_val}</td>
                <td>{medium_val}</td>
                <td>{dims_val}</td>
                <td>{deal_type_val}</td>
                <td style="text-align: right;">{price_val}</td>
                <td style="text-align: right; color: #888;">{cut_val}</td>
                <td style="text-align: right; font-weight: 600; color: #10b981;">{share_val}</td>
            </tr>
            """
            
        unsold_rows = ""
        for art in unsold_list:
            art_id = art.get("id")
            code_val = art.get("code") or "N/A"
            title_val = art.get("title") or "Untitled"
            medium_val = art.get("medium_name") or "N/A"
            dims_val = art.get("dimensions") or "N/A"
            deal_type_val = art.get("parsed_deal_type")
            price_val = f"{art.get('parsed_price'):,.2f}"
            unsold_rows += f"""
            <tr>
                <td><strong>{code_val}</strong></td>
                <td style="text-align: center; vertical-align: middle; padding: 5px; width: 80px;">
                    <img src="/api/artworks/image/{art_id}" style="max-height: 45px; max-width: 70px; object-fit: contain; border-radius: 4px; border: 1px solid #eee; display: block; margin: 0 auto;" onerror="this.style.display='none'">
                </td>
                <td>{title_val}</td>
                <td>{medium_val}</td>
                <td>{dims_val}</td>
                <td>{deal_type_val}</td>
                <td style="text-align: right; font-weight: 600;">{price_val}</td>
            </tr>
            """
            
        sold_table_html = f"""
        <table class="item-table">
            <thead>
                <tr>
                    <th style="width: 10%">Code</th>
                    <th style="width: 12%; text-align: center;">Photo</th>
                    <th style="width: 22%">Artwork Title</th>
                    <th style="width: 14%">Medium</th>
                    <th style="width: 12%">Size</th>
                    <th style="width: 10%">Type</th>
                    <th style="width: 10%; text-align: right;">Worth</th>
                    <th style="width: 10%; text-align: right;">Gallery Cut</th>
                    <th style="width: 10%; text-align: right;">Artist Share</th>
                </tr>
            </thead>
            <tbody>
                {sold_rows}
            </tbody>
        </table>
        """ if sold_list else '<div class="empty-msg">No sold paintings recorded for this artist.</div>'
        
        unsold_table_html = f"""
        <table class="item-table">
            <thead>
                <tr>
                    <th style="width: 12%">Code</th>
                    <th style="width: 15%; text-align: center;">Photo</th>
                    <th style="width: 25%">Artwork Title</th>
                    <th style="width: 15%">Medium</th>
                    <th style="width: 11%">Size</th>
                    <th style="width: 10%">Type</th>
                    <th style="width: 12%; text-align: right;">Price (PKR)</th>
                </tr>
            </thead>
            <tbody>
                {unsold_rows}
            </tbody>
        </table>
        """ if unsold_list else '<div class="empty-msg">No unsold/available paintings recorded for this artist.</div>'
        
        # Compile beautiful report html
        # Escaping curly brackets for Python f-string
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Portfolio Report - {full_name}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap');
                
                body {{
                    margin: 0;
                    padding: 0;
                    background-color: #f5f5f5;
                    font-family: 'Montserrat', sans-serif;
                    color: #111;
                }}
                
                .print-controls {{
                    max-width: 210mm;
                    margin: 15px auto;
                    padding: 12px 20px;
                    background: #fff;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    box-sizing: border-box;
                }}
                
                .btn {{
                    padding: 8px 16px;
                    font-family: 'Montserrat', sans-serif;
                    font-size: 13px;
                    font-weight: 600;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    text-decoration: none;
                    transition: all 0.2s;
                }}
                
                .btn-print {{
                    background-color: #bda04c;
                    color: #fff;
                }}
                
                .btn-print:hover {{
                    background-color: #a48539;
                }}
                
                .report-container {{
                    width: 210mm;
                    min-height: 297mm;
                    margin: 20px auto;
                    background-color: #fff;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                    box-sizing: border-box;
                    padding: 0.5in 0.6in;
                    display: flex;
                    flex-direction: column;
                }}
                
                .header-section {{
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    border-bottom: 2px solid #bda04c;
                    padding-bottom: 15px;
                    margin-bottom: 25px;
                }}
                
                .artist-info h1 {{
                    margin: 0;
                    font-size: 26px;
                    font-weight: 700;
                    color: #111;
                }}
                
                .artist-info p {{
                    margin: 5px 0 0 0;
                    font-size: 14px;
                    color: #555;
                }}
                
                .gallery-branding {{
                    text-align: right;
                }}
                
                .gallery-branding img {{
                    height: 50px;
                    object-fit: contain;
                    margin-bottom: 5px;
                }}
                
                .gallery-branding div {{
                    font-size: 11px;
                    color: #666;
                    font-weight: 500;
                }}
                
                .metrics-grid {{
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 15px;
                    margin-bottom: 30px;
                }}
                
                .metric-card {{
                    background-color: #f9f9f9;
                    border: 1px solid #eee;
                    border-radius: 6px;
                    padding: 15px;
                    text-align: center;
                }}
                
                .metric-card.highlight {{
                    background-color: rgba(212, 175, 55, 0.05);
                    border-color: rgba(212, 175, 55, 0.2);
                }}
                
                .metric-label {{
                    font-size: 11px;
                    text-transform: uppercase;
                    color: #666;
                    font-weight: 600;
                    letter-spacing: 0.5px;
                    margin-bottom: 6px;
                }}
                
                .metric-val {{
                    font-size: 20px;
                    font-weight: 700;
                    color: #111;
                }}
                
                .section-title {{
                    font-size: 16px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-top: 10px;
                    margin-bottom: 12px;
                    color: #000;
                    border-bottom: 1.5px solid #000;
                    padding-bottom: 5px;
                }}
                
                .item-table {{
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 12px;
                    margin-bottom: 30px;
                }}
                
                .item-table th {{
                    background-color: #f5f5f5;
                    border: 1px solid #ddd;
                    padding: 8px 10px;
                    font-weight: 700;
                    text-align: left;
                    color: #333;
                }}
                
                .item-table td {{
                    border: 1px solid #ddd;
                    padding: 8px 10px;
                    color: #444;
                }}
                
                .item-table tr:nth-child(even) {{
                    background-color: #fafafa;
                }}
                
                .empty-msg {{
                    text-align: center;
                    padding: 20px;
                    color: #777;
                    font-style: italic;
                    background-color: #fafafa;
                    border: 1px solid #eee;
                    border-radius: 4px;
                    margin-bottom: 30px;
                }}
                
                .footer {{
                    margin-top: auto;
                    border-top: 1px solid #ddd;
                    padding-top: 15px;
                    text-align: center;
                    font-size: 10px;
                    color: #777;
                }}
                
                @media print {{
                    body {{
                        background-color: #fff;
                        margin: 0;
                        padding: 0;
                    }}
                    
                    .print-controls {{
                        display: none;
                    }}
                    
                    .report-container {{
                        margin: 0;
                        box-shadow: none;
                        width: 100%;
                        min-height: auto;
                        padding: 0.2in 0;
                    }}
                    
                    @page {{
                        size: A4 portrait;
                        margin: 15mm;
                    }}
                }}
            </style>
        </head>
        <body>
            <div class="print-controls">
                <span style="font-weight:600; font-size:14px; color:#333;">Artist Portfolio Statement: {full_name}</span>
                <button class="btn btn-print" onclick="window.print()">Print Statement</button>
            </div>
            
            <div class="report-container">
                <div class="header-section">
                    <div class="artist-info">
                        <h1>{full_name}</h1>
                        <p>{artist.get("title") or "Professional Artist"}</p>
                        <p style="font-size: 12px; color: #777; margin-top: 5px;">
                            Email: {artist.get("email") or "N/A"} &nbsp;|&nbsp; Mobile: {artist.get("phone_mobile") or "N/A"}
                        </p>
                    </div>
                    <div class="gallery-branding">
                        <img src="/api/artworks/logo" alt="Mainframe Logo">
                        <div>MAINFRAME THE GALLERY</div>
                        <div style="font-size: 9px; margin-top: 3px;">Portfolio Account Statement</div>
                    </div>
                </div>
                
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-label">Total Artworks</div>
                        <div class="metric-val">{total_artworks}</div>
                    </div>
                    <div class="metric-card highlight">
                        <div class="metric-label">Sold Paintings (Retail)</div>
                        <div class="metric-val">{sold_count} <span style="font-size: 11px; font-weight: normal; color: #666;"><br>({total_sold_value:,.2f} PKR)</span></div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Unsold / Available</div>
                        <div class="metric-val">{unsold_count} <span style="font-size: 11px; font-weight: normal; color: #666;"><br>({total_unsold_value:,.2f} PKR)</span></div>
                    </div>
                </div>
                
                <div class="metrics-grid" style="margin-top: -15px; margin-bottom: 30px;">
                    <div class="metric-card">
                        <div class="metric-label">Total Artist Share</div>
                        <div class="metric-val" style="font-size: 18px; font-weight: 700; color: #333;">{total_artist_share:,.2f} PKR</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Paid Advances</div>
                        <div class="metric-val" style="color: #666; font-size: 16px; font-weight: 600;">{advance:,.2f} PKR</div>
                    </div>
                    <div class="metric-card highlight" style="background-color: rgba(16, 185, 129, 0.03); border-color: rgba(16, 185, 129, 0.15);">
                        <div class="metric-label" style="color: #10b981;">Net Outstanding balance</div>
                        <div class="metric-val" style="color: #10b981; font-size: 18px;">{outstanding_val:,.2f} PKR</div>
                    </div>
                </div>
                
                <!-- SOLD SECTION -->
                <div class="section-title">Sold Artworks ({sold_count})</div>
                {sold_table_html}
                
                <!-- UNSOLD SECTION -->
                <div class="section-title">Unsold / Available Artworks ({unsold_count})</div>
                {unsold_table_html}
                
                <div class="footer">
                    MainFrame The Gallery &nbsp;|&nbsp; F-73/9, Block-4, Clifton Karachi Pakistan &nbsp;|&nbsp; +92 21 3582 4155
                    <div style="margin-top: 5px; font-size: 8px; color: #999;">Generated on {datetime.now().strftime("%B %d, %Y at %I:%M %p")}</div>
                </div>
            </div>
        </body>
        </html>
        """
        return HTMLResponse(content=html_content)
    except Exception as e:
        return HTMLResponse(f"<h3>Error generating artist report: {str(e)}</h3>", status_code=500)
