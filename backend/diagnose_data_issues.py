import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import execute_query

print('=== ISSUE 1: S.M-2065 - 3 DUPLICATE ROWS TO SAME ARTIST ===')
sm = execute_query(
    'SELECT rel.id, a.first_name, a.last_name, rel.deleted '
    'FROM art_artists_art_collections_c rel '
    'JOIN art_collections c ON c.id = rel.art_artists_art_collectionsart_collections_idb '
    'LEFT JOIN art_artists a ON a.id = rel.art_artists_art_collectionsart_artists_ida '
    'WHERE c.document_name = %s ORDER BY rel.deleted',
    ('S.M-2065',)
)
for s in sm:
    print(f'  rel_id={s["id"][:12]} | {s["first_name"]} {s["last_name"]} | deleted={s["deleted"]}')

print('\n=== ISSUE 2: MUN-994 - 2 SEPARATE ARTWORK ROWS IN DATABASE ===')
mun = execute_query(
    'SELECT c.id, c.document_name, c.date_entered, c.collection_status '
    'FROM art_collections c WHERE c.document_name = %s AND c.deleted = 0',
    ('MUN-994',)
)
for m in mun:
    print(f'  id={m["id"][:12]} | date_entered={m["date_entered"]} | status={m["collection_status"]}')

print('\n=== ISSUE 3: Artworks with NO artist (orphaned - will show in ALL artists) ===')
orphans = execute_query(
    'SELECT c.document_name, c.id FROM art_collections c '
    'WHERE c.deleted = 0 AND c.id NOT IN ('
    '  SELECT DISTINCT art_artists_art_collectionsart_collections_idb '
    '  FROM art_artists_art_collections_c WHERE deleted = 0'
    ') ORDER BY c.document_name LIMIT 30'
)
print(f'Total orphaned artworks: {len(orphans)}')
for o in orphans:
    print(f'  {o["document_name"]}')

print('\n=== ISSUE 4: MAN prefix ambiguity (Mansur Aye vs MANSOOR RAHI) ===')
man = execute_query(
    'SELECT SUBSTRING_INDEX(c.document_name, "-", 1) as prefix, c.document_name, '
    'TRIM(CONCAT(COALESCE(a.first_name,""), " ", COALESCE(a.last_name,""))) as artist '
    'FROM art_collections c '
    'JOIN art_artists_art_collections_c rel ON c.id = rel.art_artists_art_collectionsart_collections_idb AND rel.deleted = 0 '
    'JOIN art_artists a ON rel.art_artists_art_collectionsart_artists_ida = a.id AND a.deleted = 0 '
    'WHERE c.deleted = 0 AND c.document_name LIKE %s AND ('
    '  TRIM(CONCAT(COALESCE(a.first_name,""), " ", COALESCE(a.last_name,""))) LIKE %s OR '
    '  TRIM(CONCAT(COALESCE(a.first_name,""), " ", COALESCE(a.last_name,""))) LIKE %s'
    ') LIMIT 10',
    ('MAN-%', '%Mansur%', '%MANSOOR%')
)
print('MAN- artworks with their artists:')
for m in man:
    print(f'  {m["document_name"]} -> {m["artist"]}')

print('\n=== SUMMARY OF ALL 3 REAL PROBLEMS ===')
print('''
PROBLEM 1 - DOUBLING (Artwork dono jagah dikhna):
  => S.M-2065 ka 1 artwork 3 separate link rows rakha hai art_artists_art_collections_c mein
  => Yani jab koi artist ka folder open karta hai, S.M.FAWAD artist mein S.M-2065 DOUBLE/TRIPLE dikhta hai
  => Fix: Un duplicate rows ko delete karo, sirf 1 rakho

PROBLEM 2 - TRUE DUPLICATE ARTWORK (Same code, 2 rows):  
  => MUN-994 naam ke 2 ALAG artworks hain database mein (alag IDs)
  => Dono not_sold status mein hain
  => Fix: Purana wala soft-delete karo (deleted=1)

PROBLEM 3 - CROSS-FOLDER (Kisi or ka kaam or ke folder mein):
  => Sirf 3 artworks orphaned hain (AAM-3762, Ria-1392, Ria-1393) - kisi artist se linked nahi
  => MAN-1042 etc. Mansur Aye ke hain, MAN-1986 MANSOOR RAHI ke - ye DIFFERENT artists hain, sahi hai
  => A.Q artworks A.Q.ARIF ke hain - correct, artist ka first_name NULL hai sirf
''')
