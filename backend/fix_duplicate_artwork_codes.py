import sys
import os
import re

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import get_db_connection

def generate_artist_prefix(first_name, last_name):
    first = (first_name or '').strip()
    last = (last_name or '').strip()
    full = f"{first} {last}".strip()
    
    # Check for dotted initials at start (e.g. A.H Rizvi -> A.H, A.Q. Arif -> A.Q, A.S. Rind -> A.S)
    m = re.match(r'^([A-Za-z]\.[A-Za-z])', full)
    if m:
        return m.group(1).upper()
        
    m_space = re.match(r'^([A-Za-z]\s+[A-Za-z])\b', full)
    if m_space:
        parts = full.split()
        if len(parts[0]) == 1 and len(parts[1]) == 1:
            return f"{parts[0]}.{parts[1]}".upper()

    clean_first = re.sub(r'[^A-Za-z]', '', first).upper()
    clean_last = re.sub(r'[^A-Za-z]', '', last).upper()
    clean_full = re.sub(r'[^A-Za-z]', '', full).upper()
    
    if clean_first and clean_last:
        return f"{clean_first[:2]}{clean_last[0]}"
    elif len(clean_full) >= 3:
        return clean_full[:3]
    return "ART"

def fix_all_duplicate_codes():
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            print("Fetching all artworks ordered chronologically by date_entered ASC...")
            query = """
                SELECT 
                    c.id, 
                    c.document_name, 
                    cstm.code_c, 
                    c.date_entered, 
                    a.id AS artist_id,
                    a.first_name, 
                    a.last_name
                FROM art_collections c
                LEFT JOIN art_collections_cstm cstm ON c.id = cstm.id_c
                LEFT JOIN art_artists_art_collections_c rel 
                    ON c.id = rel.art_artists_art_collectionsart_collections_idb AND rel.deleted = 0
                LEFT JOIN art_artists a 
                    ON rel.art_artists_art_collectionsart_artists_ida = a.id AND a.deleted = 0
                WHERE c.deleted = 0
                ORDER BY COALESCE(c.date_entered, c.date_modified, c.id) ASC, c.id ASC;
            """
            cursor.execute(query)
            rows = cursor.fetchall()
            print(f"Total active artworks found: {len(rows)}")

            # 1. Group artworks by artist
            artist_artworks = {}
            for r in rows:
                art_id = r["artist_id"] or "unknown_artist"
                prefix = generate_artist_prefix(r["first_name"], r["last_name"])
                if art_id not in artist_artworks:
                    artist_artworks[art_id] = {
                        "prefix": prefix,
                        "items": []
                    }
                artist_artworks[art_id]["items"].append(r)

            all_codes_seen = set()
            updates = []

            for art_id, group in artist_artworks.items():
                prefix = group["prefix"]
                items = group["items"]
                
                # Determine highest valid sequence number >= 5000 for this artist
                max_num = 5008
                for item in items:
                    code = (item.get("code_c") or item.get("document_name") or "").strip()
                    if code and "-" in code:
                        p, num_str = code.rsplit("-", 1)
                        if num_str.isdigit():
                            n = int(num_str)
                            if n > max_num:
                                max_num = n

                next_seq = max_num + 1
                for item in items:
                    current_code = (item.get("code_c") or item.get("document_name") or "").strip()
                    
                    needs_new_code = False
                    if not current_code or current_code in all_codes_seen:
                        needs_new_code = True
                    else:
                        # Check if code is single digit / low number (e.g. AMN-1 to AMN-6) or wrong prefix
                        if "-" in current_code:
                            p, num_str = current_code.rsplit("-", 1)
                            if num_str.isdigit() and int(num_str) < 100:
                                needs_new_code = True
                            elif p.upper() != prefix.upper():
                                needs_new_code = True

                    if needs_new_code:
                        new_code = f"{prefix}-{next_seq}"
                        while new_code in all_codes_seen:
                            next_seq += 1
                            new_code = f"{prefix}-{next_seq}"
                        all_codes_seen.add(new_code)
                        next_seq += 1
                        updates.append((new_code, item["id"]))
                    else:
                        all_codes_seen.add(current_code)

            print(f"Total artworks requiring unique 5009+ sequence update: {len(updates)}")
            
            # 3. Apply updates to database
            updated_count = 0
            for new_code, row_id in updates:
                cursor.execute("UPDATE art_collections SET document_name = %s WHERE id = %s;", (new_code, row_id))
                cursor.execute("""
                    INSERT INTO art_collections_cstm (id_c, code_c) 
                    VALUES (%s, %s) 
                    ON DUPLICATE KEY UPDATE code_c = VALUES(code_c);
                """, (row_id, new_code))
                updated_count += 1

            conn.commit()
            print(f"SUCCESSFULLY updated {updated_count} artworks with sequential 5009+ codes!")
    except Exception as e:
        conn.rollback()
        print(f"Error during code fix: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

if __name__ == "__main__":
    fix_all_duplicate_codes()
