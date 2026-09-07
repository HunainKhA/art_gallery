import sys
import os
import uuid

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import get_db_connection
from fix_duplicate_artwork_codes import determine_correct_prefix

def fix_archived_and_unlinked_artworks():
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # 1. Update collection_status = 'archived' or 'archive' to 'not_sold' for all non-deleted artworks
            cursor.execute("""
                UPDATE art_collections 
                SET collection_status = 'not_sold' 
                WHERE deleted = 0 
                  AND LOWER(TRIM(COALESCE(collection_status, ''))) IN ('archived', 'archive');
            """)
            updated_status_count = cursor.rowcount
            print(f"1. Updated {updated_status_count} artworks from 'archived' to 'not_sold'.")

            # 2. Fix relationship rows in art_artists_art_collections_c where rel.deleted = 1 but both artwork and artist are active
            cursor.execute("""
                UPDATE art_artists_art_collections_c rel
                JOIN art_collections c ON rel.art_artists_art_collectionsart_collections_idb = c.id
                JOIN art_artists a ON rel.art_artists_art_collectionsart_artists_ida = a.id
                SET rel.deleted = 0
                WHERE rel.deleted = 1 AND c.deleted = 0 AND a.deleted = 0;
            """)
            fixed_rel_count = cursor.rowcount
            print(f"2. Restored {fixed_rel_count} soft-deleted relationship links between active artists and artworks.")

            # 3. Build map of prefix -> active artist ID
            cursor.execute("SELECT id, first_name, last_name FROM art_artists WHERE deleted = 0;")
            artists = cursor.fetchall()

            prefix_map = {}
            for a in artists:
                aid = a["id"]
                first = a.get("first_name") or ""
                last = a.get("last_name") or ""
                
                # Check sample linked artwork for prefix
                cursor.execute("""
                    SELECT cstm.code_c, c.document_name
                    FROM art_artists_art_collections_c rel
                    JOIN art_collections c ON rel.art_artists_art_collectionsart_collections_idb = c.id
                    LEFT JOIN art_collections_cstm cstm ON c.id = cstm.id_c
                    WHERE rel.art_artists_art_collectionsart_artists_ida = %s AND c.deleted = 0
                    LIMIT 1;
                """, (aid,))
                sample = cursor.fetchone()
                if sample:
                    code = (sample.get("code_c") or sample.get("document_name") or "").strip()
                    if "-" in code:
                        pfix = code.rsplit("-", 1)[0].upper()
                        prefix_map[pfix] = aid

                # Fallback prefix
                calc_pfix = determine_correct_prefix("", first, last)
                if calc_pfix not in prefix_map:
                    prefix_map[calc_pfix] = aid

            # 4. Find active artworks with NO relationship row at all
            cursor.execute("""
                SELECT c.id, c.document_name, cstm.code_c
                FROM art_collections c
                LEFT JOIN art_collections_cstm cstm ON c.id = cstm.id_c
                WHERE c.deleted = 0
                  AND c.id NOT IN (
                      SELECT art_artists_art_collectionsart_collections_idb 
                      FROM art_artists_art_collections_c 
                      WHERE deleted = 0
                  );
            """)
            unlinked = cursor.fetchall()
            print(f"3. Found {len(unlinked)} active artworks with missing artist links.")

            linked_count = 0
            for u in unlinked:
                art_id = u["id"]
                code = (u.get("code_c") or u.get("document_name") or "").strip()
                if "-" in code:
                    pfix = code.rsplit("-", 1)[0].upper()
                    if pfix in prefix_map:
                        aid = prefix_map[pfix]
                        rel_id = str(uuid.uuid4())
                        cursor.execute("""
                            INSERT INTO art_artists_art_collections_c 
                            (id, date_modified, deleted, art_artists_art_collectionsart_artists_ida, art_artists_art_collectionsart_collections_idb)
                            VALUES (%s, NOW(), 0, %s, %s);
                        """, (rel_id, aid, art_id))
                        linked_count += 1

            print(f"4. Successfully auto-linked {linked_count} unlinked artworks to their respective artists.")

            conn.commit()
            print("\nSUCCESSFULLY COMPLETED ARTIST & ARTWORK ALIGNMENT!")

    except Exception as e:
        conn.rollback()
        print(f"Error during alignment: {e}")
        import traceback
        traceback.print_exc()
        raise e
    finally:
        conn.close()

if __name__ == "__main__":
    fix_archived_and_unlinked_artworks()
