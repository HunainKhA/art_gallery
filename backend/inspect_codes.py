import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import execute_query

query = """
SELECT 
    c.id, 
    c.document_name, 
    cstm.code_c, 
    c.date_entered, 
    CONCAT(COALESCE(a.first_name, ''), ' ', COALESCE(a.last_name, '')) as artist
FROM art_collections c
LEFT JOIN art_collections_cstm cstm ON c.id = cstm.id_c
LEFT JOIN art_artists_art_collections_c rel ON c.id = rel.art_artists_art_collectionsart_collections_idb AND rel.deleted = 0
LEFT JOIN art_artists a ON rel.art_artists_art_collectionsart_artists_ida = a.id AND a.deleted = 0
WHERE c.deleted = 0 AND (c.document_name LIKE '%%5009%%' OR cstm.code_c LIKE '%%5009%%')
ORDER BY c.date_entered ASC;
"""

rows = execute_query(query)
print(f"=== ALL {len(rows)} ARTWORKS WITH 5009 IN CODE ===")
for r in rows:
    print(f"Date: {r['date_entered']} | Artist: {r['artist']} | DocName: {r['document_name']} | CodeC: {r['code_c']}")
