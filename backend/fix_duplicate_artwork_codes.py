import re
from database import execute_query, get_db_connection

def extract_artist_prefix(artist_id: str, default_prefix: str = "ART") -> str:
    if not artist_id:
        return default_prefix
    artist = execute_query(
        "SELECT first_name, last_name FROM art_artists WHERE id = %s AND deleted = 0;",
        (artist_id,),
        fetch="one"
    )
    if not artist:
        return default_prefix
    first_name = (artist.get("first_name") or "").strip()
    last_name = (artist.get("last_name") or "").strip()
    full_name = f"{first_name} {last_name}".strip()
    name_clean = full_name.replace('"', '').replace("'", '').strip()
    
    m = re.match(r'^([A-Za-z]\.[A-Za-z])', name_clean)
    if m:
        return m.group(1).upper()
    tokens = [t.strip() for t in re.split(r'[\s.]+', name_clean) if t.strip()]
    if len(tokens) >= 2 and len(tokens[0]) == 1 and len(tokens[1]) == 1:
        return f"{tokens[0]}.{tokens[1]}".upper()
    elif len(tokens) >= 1 and len(tokens[0]) >= 3:
        return tokens[0][:3].upper()
    elif len(tokens) >= 2:
        return f"{tokens[0][:2]}{tokens[1][:1]}".upper()
    elif len(tokens) == 1:
        return tokens[0][:3].upper()
    return default_prefix

def fix_duplicate_and_repeated_codes():
    print("=== Scanning database for duplicate & repeated artwork codes ===")
    
    # 1. Fetch all active artworks along with artist and custom code
    query = """
        SELECT 
            c.id, 
            c.document_name, 
            c.date_entered,
            cstm.code_c,
            rel.art_artists_art_collectionsart_artists_ida as artist_id
        FROM art_collections c
        LEFT JOIN art_collections_cstm cstm ON c.id = cstm.id_c
        LEFT JOIN art_artists_art_collections_c rel ON c.id = rel.art_artists_art_collectionsart_collections_idb AND rel.deleted = 0
        WHERE c.deleted = 0
        ORDER BY c.date_entered ASC;
    """
    artworks = execute_query(query)
    print(f"Total active artworks scanned: {len(artworks)}")
    
    # Find all codes that appear more than once
    code_counts = {}
    for a in artworks:
        doc_code = (a.get("document_name") or "").strip()
        if doc_code:
            code_counts[doc_code] = code_counts.get(doc_code, 0) + 1
            
    duplicate_codes = {c: cnt for c, cnt in code_counts.items() if cnt > 1}
    print(f"Duplicate codes found: {duplicate_codes}")
    
    if not duplicate_codes:
        print("No duplicate codes found! All artwork codes are unique.")
        return

    # Find highest sequence number currently in database
    global_res = execute_query("""
        SELECT MAX(CAST(SUBSTRING_INDEX(document_name, '-', -1) AS UNSIGNED)) as max_val
        FROM art_collections
        WHERE deleted = 0 AND document_name REGEXP '-[0-9]+$';
    """, fetch="one")
    
    current_max = (global_res.get("max_val") if global_res else 0) or 5006
    print(f"Current highest sequential number: {current_max}")
    
    seen_codes = set()
    updates = []
    
    next_seq = current_max + 1
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            for a in artworks:
                doc_code = (a.get("document_name") or "").strip()
                art_id = a["id"]
                artist_id = a.get("artist_id")
                
                # If this code is a duplicate and we've already kept one instance:
                if doc_code in duplicate_codes and doc_code in seen_codes:
                    prefix = doc_code.rsplit("-", 1)[0].strip().upper() if "-" in doc_code else extract_artist_prefix(artist_id)
                    new_code = f"{prefix}-{next_seq}"
                    next_seq += 1
                    
                    print(f"Fixing duplicate: Artwork ID {art_id} ({doc_code}) -> {new_code}")
                    cursor.execute("UPDATE art_collections SET document_name = %s WHERE id = %s;", (new_code, art_id))
                    cursor.execute("UPDATE art_collections_cstm SET code_c = %s WHERE id_c = %s;", (new_code, art_id))
                    seen_codes.add(new_code)
                else:
                    if doc_code:
                        seen_codes.add(doc_code)
                        
        conn.commit()
        print("=== Successfully updated duplicate artwork codes to unique sequential numbers! ===")
    except Exception as e:
        conn.rollback()
        print(f"Error updating database: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    fix_duplicate_and_repeated_codes()
