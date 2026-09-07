import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import get_db_connection
from fix_duplicate_artwork_codes import determine_correct_prefix

def inspect_and_fix_sequence():
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
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
            print(f"Total active artworks: {len(rows)}")

            # Find the starting number of the sequence where unbroken numbering begins
            # We assign unbroken numbers starting after ARE-4966 or from the earliest clean sequence!
            # Let's inspect where 6000s series numbers exist and fix them to continue the 4966/5000 series smoothly!
            
            updates = []
            
            # Find the highest clean number before 6000s or start from 4967
            current_seq = None
            
            for index, r in enumerate(rows):
                code = (r.get("code_c") or r.get("document_name") or "").strip()
                orig_prefix = ""
                num = None
                if "-" in code:
                    orig_prefix, num_str = code.rsplit("-", 1)
                    orig_prefix = orig_prefix.strip().upper()
                    if num_str.isdigit():
                        num = int(num_str)

                prefix = determine_correct_prefix(orig_prefix, r.get("first_name"), r.get("last_name"))
                
                # If num is in 6000s range (like F.N-6134, ANW-6136, SHA-6156), it belongs to the sequence!
                # We fix 6000s range items to follow the smooth sequential number!
                if num and 6000 <= num <= 7000:
                    # Mark for re-indexing into clean sequence
                    r["needs_fix"] = True
                else:
                    r["needs_fix"] = False
                
                r["prefix"] = prefix
                r["num"] = num

            # Re-assign all 6000s items and any broken/unassigned items to continuous numbers
            # Starting from max valid clean code + 1
            valid_nums = [r["num"] for r in rows if r["num"] and 100 <= r["num"] < 6000]
            max_valid = max(valid_nums) if valid_nums else 5006
            print(f"Highest valid clean code number found: {max_valid}")

            next_seq = max_valid + 1
            print(f"Starting smooth sequential fix from {next_seq} onwards...")

            for r in rows:
                if r["needs_fix"] or not r["num"] or r["num"] >= 6000:
                    new_code = f"{r['prefix']}-{next_seq}"
                    updates.append((new_code, r["id"]))
                    next_seq += 1
                elif r["num"] and r["prefix"]:
                    # Ensure prefix is clean (e.g. ANO -> A.H)
                    clean_code = f"{r['prefix']}-{r['num']}"
                    if clean_code != (r.get("code_c") or ""):
                        updates.append((clean_code, r["id"]))

            print(f"Total rows being updated: {len(updates)}")
            for new_code, row_id in updates:
                cursor.execute("UPDATE art_collections SET document_name = %s WHERE id = %s;", (new_code, row_id))
                cursor.execute("SELECT id_c FROM art_collections_cstm WHERE id_c = %s;", (row_id,))
                if cursor.fetchone():
                    cursor.execute("UPDATE art_collections_cstm SET code_c = %s WHERE id_c = %s;", (new_code, row_id))
                else:
                    cursor.execute("INSERT INTO art_collections_cstm (id_c, code_c) VALUES (%s, %s);", (row_id, new_code))

            conn.commit()
            print(f"SUCCESSFULLY updated {len(updates)} artworks!")
            print(f"Next new artwork will automatically get code number: {next_seq}")
    finally:
        conn.close()

if __name__ == "__main__":
    inspect_and_fix_sequence()
