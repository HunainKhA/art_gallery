import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import execute_query

artists = execute_query("SELECT id, first_name, last_name FROM art_artists WHERE deleted = 0 AND (first_name LIKE '%%Rizvi%%' OR last_name LIKE '%%Rizvi%%' OR first_name LIKE '%%A.H%%');")
print("Artists found:")
for a in artists:
    print(a)
    artworks = execute_query("""
        SELECT c.id, c.document_name, cstm.code_c, c.date_entered 
        FROM art_collections c
        JOIN art_artists_art_collections_c rel ON c.id = rel.art_artists_art_collectionsart_collections_idb
        LEFT JOIN art_collections_cstm cstm ON c.id = cstm.id_c
        WHERE rel.art_artists_art_collectionsart_artists_ida = %s AND c.deleted = 0;
    """, (a["id"],))
    print(f"  Artworks ({len(artworks)}):")
    for art in artworks:
        print("   ", art)
