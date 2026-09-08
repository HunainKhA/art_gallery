import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import execute_query

# What does the API actually return for ANO-4775's artist_name?
print('=== What the API query returns for ANO-4775 ===')
result = execute_query("""
    SELECT 
        c.id AS id,
        c.document_name AS title,
        CASE 
            WHEN LOWER(TRIM(COALESCE(c.collection_status, ''))) IN ('sold', 'soldout', 'sold_out') THEN 'Sold'
            WHEN LOWER(TRIM(COALESCE(c.collection_status, ''))) IN ('return', 'returned') THEN 'Archived'
            WHEN LOWER(TRIM(COALESCE(c.collection_status, ''))) IN ('archive', 'archived') THEN 'Archived'
            ELSE 'Available'
        END AS status,
        rel_artist.artist_id AS artist_id,
        rel_artist.artist_name AS artist_name
    FROM art_collections c
    LEFT JOIN art_collections_cstm cstm ON c.id = cstm.id_c
    LEFT JOIN (
        SELECT 
            rel.art_artists_art_collectionsart_collections_idb AS art_id,
            MAX(a.id) AS artist_id,
            MAX(CONCAT(COALESCE(a.first_name, ''), ' ', COALESCE(a.last_name, ''))) AS artist_name
        FROM art_artists_art_collections_c rel
        JOIN art_artists a ON rel.art_artists_art_collectionsart_artists_ida = a.id AND a.deleted = 0
        WHERE rel.deleted = 0
        GROUP BY rel.art_artists_art_collectionsart_collections_idb
    ) rel_artist ON c.id = rel_artist.art_id
    WHERE c.document_name = 'ANO-4775' AND c.deleted = 0
""")
for r in result:
    print(f'  title: {r["title"]}')
    print(f'  artist_name: [{r["artist_name"]}]')
    print(f'  artist_id: {r["artist_id"]}')
    print(f'  status: {r["status"]}')

print()
print('=== Raw rel table for ANO-4775 art_id ===')
art_id = '4080ebec-ad02-bd4d-f614-69faf14dbc72'
rels = execute_query("""
    SELECT rel.id, rel.deleted, 
           TRIM(CONCAT(COALESCE(a.first_name,''), ' ', COALESCE(a.last_name,''))) as artist,
           a.id as artist_id
    FROM art_artists_art_collections_c rel
    JOIN art_artists a ON rel.art_artists_art_collectionsart_artists_ida = a.id
    WHERE rel.art_artists_art_collectionsart_collections_idb = %s
""", (art_id,))
for r in rels:
    print(f'  rel_id: {r["id"][:12]}... | artist: {r["artist"]} | deleted: {r["deleted"]}')

# The problem: MAX(a.id) + MAX(CONCAT(...)) can pick DIFFERENT rows!
# MAX picks the max value independently - so artist_id might be from Rizvi but name from Anoosha
print()
print('=== THE BUG EXPLAINED ===')
print('MAX(a.id) and MAX(CONCAT(...)) are independent MAX calls.')
print('If A.H Rizvi id > ANOOSHA KHALID id alphabetically, it picks Rizvi ID')
print('If ANOOSHA KHALID name > A.H Rizvi alphabetically, it picks Anoosha name')
print('They can return DIFFERENT rows!')
print()

# Check which ID is "MAX"
rizvi_id = '755a3d98-7db8-98ea-4c86-5e2bf9c6ddea'
anoosha_id = '8833cba9-315a-ecc5-0efa-69fae6e58a8f'
print(f'A.H Rizvi id:     {rizvi_id}')
print(f'ANOOSHA KHALID id: {anoosha_id}')
print(f'MAX would be: {max(rizvi_id, anoosha_id)}')
