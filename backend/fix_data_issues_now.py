import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import execute_query, get_db_connection

print('=== FIXING S.M-2065: 3 duplicate link rows -> keep only 1 ===')

# Get all active rel rows for S.M-2065 linked to S.M.FAWAD
dups = execute_query("""
    SELECT rel.id 
    FROM art_artists_art_collections_c rel
    JOIN art_collections c ON c.id = rel.art_artists_art_collectionsart_collections_idb
    JOIN art_artists a ON a.id = rel.art_artists_art_collectionsart_artists_ida
    WHERE c.document_name = 'S.M-2065' 
    AND rel.deleted = 0
    ORDER BY rel.id ASC
""")
print(f'Found {len(dups)} active links for S.M-2065')
if len(dups) > 1:
    # Keep first one, soft-delete the rest
    keep_id = dups[0]['id']
    delete_ids = [d['id'] for d in dups[1:]]
    print(f'Keeping: {keep_id[:12]}...')
    for del_id in delete_ids:
        print(f'Deleting: {del_id[:12]}...')
        execute_query(
            "UPDATE art_artists_art_collections_c SET deleted = 1 WHERE id = %s",
            (del_id,)
        )
    print(f'Fixed! Removed {len(delete_ids)} duplicate rows.')
else:
    print('No duplicate rows found (already fixed or only 1 active).')

print()
print('=== FIXING MUN-994: 2 duplicate artwork rows -> soft-delete older one ===')
mun = execute_query("""
    SELECT id, date_entered FROM art_collections 
    WHERE document_name = 'MUN-994' AND deleted = 0
    ORDER BY date_entered ASC
""")
print(f'Found {len(mun)} active MUN-994 rows')
if len(mun) > 1:
    old_id = mun[0]['id']
    print(f'Soft-deleting older: {old_id[:12]}... (entered: {mun[0]["date_entered"]})')
    execute_query(
        "UPDATE art_collections SET deleted = 1, date_modified = NOW() WHERE id = %s",
        (old_id,)
    )
    print(f'Kept newer: {mun[1]["id"][:12]}... (entered: {mun[1]["date_entered"]})')
    print('Fixed!')
else:
    print('No duplicate found (already fixed or only 1 row).')

print()
print('=== VERIFICATION ===')
sm_check = execute_query("""
    SELECT COUNT(*) as c FROM art_artists_art_collections_c rel
    JOIN art_collections c ON c.id = rel.art_artists_art_collectionsart_collections_idb
    WHERE c.document_name = 'S.M-2065' AND rel.deleted = 0
""", fetch='one')
print(f'S.M-2065 active links now: {sm_check["c"]}')

mun_check = execute_query("""
    SELECT COUNT(*) as c FROM art_collections WHERE document_name = 'MUN-994' AND deleted = 0
""", fetch='one')
print(f'MUN-994 active rows now: {mun_check["c"]}')
print()
print('All fixes done!')
