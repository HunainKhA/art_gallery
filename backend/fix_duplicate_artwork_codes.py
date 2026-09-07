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
            print("Fetching all active artworks...")
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

            parsed_items = []
            for r in rows:
                code = (r.get("code_c") or r.get("document_name") or "").strip()
                prefix = generate_artist_prefix(r["first_name"], r["last_name"])
                
                num = None
                if "-" in code:
                    _, num_str = code.rsplit("-", 1)
                    if num_str.isdigit():
                        num = int(num_str)
                
                parsed_items.append({
                    "id": r["id"],
                    "orig_code": code,
                    "prefix": prefix,
                    "num": num
                })

            assigned_numbers = set()
            updates = []
            items_to_reassign = []

            # Pass 1: Keep valid unique 4-digit numbers. Fix prefix if wrong (e.g. ANO-5010 -> A.H-5010).
            for item in parsed_items:
                num = item["num"]
                prefix = item["prefix"]
                orig_code = item["orig_code"]
                
                if num and num >= 1000 and num not in assigned_numbers:
                    assigned_numbers.add(num)
                    orig_prefix = orig_code.rsplit("-", 1)[0].upper() if "-" in orig_code else ""
                    if orig_prefix != prefix.upper():
                        new_code = f"{prefix}-{num}"
                        updates.append((new_code, item["id"]))
                else:
                    # Low number (<1000), duplicate number, or missing code
                    items_to_reassign.append(item)

            # Pass 2: For items needing reassign, assign unique numbers starting from 5009 upwards
            next_seq = 5009
            for item in items_to_reassign:
                prefix = item["prefix"]
                while next_seq in assigned_numbers:
                    next_seq += 1
                
                new_code = f"{prefix}-{next_seq}"
                assigned_numbers.add(next_seq)
                updates.append((new_code, item["id"]))
                next_seq += 1

            print(f"Total artworks requiring code/prefix update: {len(updates)}")
            
            # Apply updates
            updated_count = 0
            for new_code, row_id in updates:
                print(f"Updating artwork {row_id} -> {new_code}")
                cursor.execute("UPDATE art_collections SET document_name = %s WHERE id = %s;", (new_code, row_id))
                cursor.execute("""
                    INSERT INTO art_collections_cstm (id_c, code_c) 
                    VALUES (%s, %s) 
                    ON DUPLICATE KEY UPDATE code_c = VALUES(code_c);
                """, (row_id, new_code))
                updated_count += 1

            conn.commit()
            print(f"SUCCESSFULLY updated {updated_count} artworks with clean sequential codes!")
    except Exception as e:
        conn.rollback()
        print(f"Error during code fix: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

if __name__ == "__main__":
    fix_all_duplicate_codes()
