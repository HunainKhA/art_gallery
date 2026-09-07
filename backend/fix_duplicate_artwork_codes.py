import sys
import os
import re

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import get_db_connection

def determine_correct_prefix(orig_prefix, first_name, last_name):
    first = (first_name or '').strip()
    last = (last_name or '').strip()
    full = f"{first} {last}".strip()

    # 1. If artist is A.H Rizvi or has A.H / Rizvi / Anwer in name, prefix MUST be A.H
    if 'A.H' in full.upper() or 'A H ' in full.upper() or 'RIZVI' in full.upper() or 'ANWER' in full.upper():
        return 'A.H'
    
    # 2. Check for dotted initials (e.g. A.Q. Arif -> A.Q, A.S. Rind -> A.S)
    m = re.search(r'([A-Za-z]\.[A-Za-z])', full)
    if m:
        return m.group(1).upper()

    # 3. If existing prefix is valid (3+ letters or dotted like A.H, FAR, SHA, GHU, JAM, AMN, etc.), keep existing!
    if orig_prefix and orig_prefix.upper() not in ('ANO', 'ART'):
        return orig_prefix.upper()

    # 4. Fallback from name initials
    clean_first = re.sub(r'[^A-Za-z]', '', first).upper()
    clean_last = re.sub(r'[^A-Za-z]', '', last).upper()
    clean_full = re.sub(r'[^A-Za-z]', '', full).upper()
    
    if clean_first and clean_last:
        return f"{clean_first[:2]}{clean_last[0]}"
    elif len(clean_full) >= 3:
        return clean_full[:3]
    
    return orig_prefix.upper() if orig_prefix else "ART"

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
                    ON c.id = rel.art_artists_art_collectionsart_collections_idb
                LEFT JOIN art_artists a 
                    ON rel.art_artists_art_collectionsart_artists_ida = a.id
                WHERE c.deleted = 0
                ORDER BY COALESCE(c.date_entered, c.date_modified, c.id) ASC, c.id ASC;
            """
            cursor.execute(query)
            rows = cursor.fetchall()
            print(f"Total active artworks found: {len(rows)}")

            items_to_reindex = []
            updates = []

            for r in rows:
                code = (r.get("code_c") or r.get("document_name") or "").strip()
                
                orig_prefix = ""
                num = None
                if "-" in code:
                    orig_prefix, num_str = code.rsplit("-", 1)
                    orig_prefix = orig_prefix.strip().upper()
                    if num_str.isdigit():
                        num = int(num_str)

                prefix = determine_correct_prefix(orig_prefix, r.get("first_name"), r.get("last_name"))

                # Historical items <= 5006 stay unchanged (unless prefix fix like ANO -> A.H needed)
                if num and 100 <= num <= 5006:
                    if orig_prefix != prefix:
                        new_code = f"{prefix}-{num}"
                        updates.append((new_code, r["id"]))
                else:
                    # All recent/6000s/unassigned items are collected for linear 5007+ re-indexing
                    items_to_reindex.append({
                        "id": r["id"],
                        "prefix": prefix,
                        "orig_code": code,
                        "num": num
                    })

            # Sort 6000s/recent items strictly by their original numeric code (e.g. 6136, 6137, 6138...)
            # so that 6136 gets 5007, 6137 gets 5008, 6138 gets 5009, etc., right after 5006!
            items_to_reindex.sort(key=lambda x: x["num"] if x["num"] is not None else 999999)

            # Re-index all recent/6000s items strictly sequentially starting at 5007
            next_seq = 5007
            print(f"Reassigning {len(items_to_reindex)} recent artworks sequentially starting at {next_seq}...")

            for item in items_to_reindex:
                new_code = f"{item['prefix']}-{next_seq}"
                updates.append((new_code, item["id"]))
                next_seq += 1

            print(f"Total artworks requiring update: {len(updates)}")
            
            # Apply updates with clean parameterized SQL
            updated_count = 0
            for new_code, row_id in updates:
                cursor.execute("UPDATE art_collections SET document_name = %s WHERE id = %s;", (new_code, row_id))
                
                # Check if row exists in art_collections_cstm
                cursor.execute("SELECT id_c FROM art_collections_cstm WHERE id_c = %s;", (row_id,))
                cstm_exists = cursor.fetchone()
                if cstm_exists:
                    cursor.execute("UPDATE art_collections_cstm SET code_c = %s WHERE id_c = %s;", (new_code, row_id))
                else:
                    cursor.execute("INSERT INTO art_collections_cstm (id_c, code_c) VALUES (%s, %s);", (row_id, new_code))
                    
                updated_count += 1

            conn.commit()
            print(f"SUCCESSFULLY updated {updated_count} artworks to sequential codes starting from 5007!")
            return updated_count
    except Exception as e:
        conn.rollback()
        print(f"Error during code fix: {e}")
        import traceback
        traceback.print_exc()
        raise e
    finally:
        conn.close()

if __name__ == "__main__":
    fix_all_duplicate_codes()
