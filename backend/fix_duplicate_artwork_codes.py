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

            valid_nums = []
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
                r["prefix"] = prefix
                r["num"] = num
                
                if num and 100 <= num < 6000:
                    valid_nums.append(num)

            max_valid = max(valid_nums) if valid_nums else 5006
            print(f"Highest valid historical number found: {max_valid}")

            # Collect items needing 5007+ re-indexing (items with num >= 6000 or missing num)
            items_to_reindex = []
            updates = []

            for r in rows:
                num = r["num"]
                prefix = r["prefix"]
                orig_code = (r.get("code_c") or r.get("document_name") or "").strip()
                orig_prefix = orig_code.rsplit("-", 1)[0].strip().upper() if "-" in orig_code else ""

                if num and 100 <= num <= max_valid:
                    # Keep historical <= max_valid untouched (only fix prefix if ANO -> A.H needed)
                    if orig_prefix != prefix:
                        new_code = f"{prefix}-{num}"
                        updates.append((new_code, r["id"]))
                else:
                    items_to_reindex.append(r)

            # Sort 6000s items by original numeric order so 6134 comes before 6136, 6137, etc.
            items_to_reindex.sort(key=lambda x: x["num"] if x["num"] is not None else 999999)

            next_seq = max_valid + 1
            print(f"Reassigning {len(items_to_reindex)} items sequentially starting at {next_seq}...")

            for item in items_to_reindex:
                new_code = f"{item['prefix']}-{next_seq}"
                updates.append((new_code, item["id"]))
                next_seq += 1

            print(f"Total artworks being updated: {len(updates)}")
            
            for new_code, row_id in updates:
                cursor.execute("UPDATE art_collections SET document_name = %s WHERE id = %s;", (new_code, row_id))
                cursor.execute("SELECT id_c FROM art_collections_cstm WHERE id_c = %s;", (row_id,))
                cstm_exists = cursor.fetchone()
                if cstm_exists:
                    cursor.execute("UPDATE art_collections_cstm SET code_c = %s WHERE id_c = %s;", (new_code, row_id))
                else:
                    cursor.execute("INSERT INTO art_collections_cstm (id_c, code_c) VALUES (%s, %s);", (row_id, new_code))

            conn.commit()
            print(f"SUCCESSFULLY updated {len(updates)} artworks to clean sequential codes starting from {max_valid + 1}!")
            return len(updates)
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
