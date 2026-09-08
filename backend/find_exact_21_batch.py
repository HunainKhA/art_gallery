import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import execute_query

# Query active artworks matching the 21 recent items by their prices / titles / date_entered
rows = execute_query("""
    SELECT c.id, c.document_name, cstm.code_c, c.date_entered, c.price,
           a.first_name, a.last_name
    FROM art_collections c
    LEFT JOIN art_collections_cstm cstm ON c.id = cstm.id_c
    LEFT JOIN art_artists_art_collections_c rel 
        ON c.id = rel.art_artists_art_collectionsart_collections_idb
    LEFT JOIN art_artists a 
        ON rel.art_artists_art_collectionsart_artists_ida = a.id
    WHERE c.deleted = 0 AND (
        (c.document_name LIKE 'ANW-%%' OR cstm.code_c LIKE 'ANW-%%') OR
        (c.document_name LIKE 'GHU-%%' OR cstm.code_c LIKE 'GHU-%%') OR
        (c.document_name LIKE 'AMN-%%' OR cstm.code_c LIKE 'AMN-%%') OR
        (c.document_name LIKE 'JAM-%%' OR cstm.code_c LIKE 'JAM-%%') OR
        (c.document_name LIKE 'SHA-%%' OR cstm.code_c LIKE 'SHA-%%')
    );
""")

# Let's filter the 21 items in the exact recent batch
recent_21_items = []
for r in rows:
    code = (r.get("code_c") or r.get("document_name") or "").strip()
    if "-" in code:
        num_str = code.rsplit("-", 1)[1]
        if num_str.isdigit():
            num = int(num_str)
            # Match recent numbers: 5007..5017, 5937..5947, 5062, 5645..5684
            if num in range(5007, 5018) or num in range(5937, 5948) or num == 5062 or num in range(5645, 5685):
                recent_21_items.append(r)

print(f"Found {len(recent_21_items)} items in the recent 21 batch!")
for idx, r in enumerate(recent_21_items):
    print(f"{idx+1}. ID: {r['id']} | CurrentCode: {r['code_c']} | Artist: {r['first_name']} {r['last_name']} | Date: {r['date_entered']}")
