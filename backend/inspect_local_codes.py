import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import execute_query

rows = execute_query("""
    SELECT c.id, c.document_name, cstm.code_c, c.date_entered,
           CONCAT(COALESCE(a.first_name, ''), ' ', COALESCE(a.last_name, '')) as artist
    FROM art_collections c
    LEFT JOIN art_collections_cstm cstm ON c.id = cstm.id_c
    LEFT JOIN art_artists_art_collections_c rel 
        ON c.id = rel.art_artists_art_collectionsart_collections_idb
    LEFT JOIN art_artists a 
        ON rel.art_artists_art_collectionsart_artists_ida = a.id
    WHERE c.deleted = 0 AND (
        a.first_name LIKE '%%Shahana%%' OR a.last_name LIKE '%%Mashkoor%%' OR
        a.first_name LIKE '%%Ghulam%%' OR a.last_name LIKE '%%Rasul%%' OR
        a.first_name LIKE '%%JAMIL%%' OR a.last_name LIKE '%%NAQSH%%' OR
        a.first_name LIKE '%%AMNA%%' OR a.last_name LIKE '%%FAISAL%%' OR
        a.first_name LIKE '%%ANWAR%%' OR a.last_name LIKE '%%MAQSOOD%%' OR
        a.first_name LIKE '%%GHULAM%%' OR a.last_name LIKE '%%MUHAMMAD%%'
    )
    ORDER BY c.date_entered DESC;
""")

print(f"Total matching artworks in local DB: {len(rows)}")
for idx, r in enumerate(rows[:35]):
    print(f"{idx+1}. ID: {r['id']} | CodeC: {r['code_c']} | DocName: {r['document_name']} | Date: {r['date_entered']} | Artist: {r['artist']}")
