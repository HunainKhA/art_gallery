from database import execute_query

artists = execute_query("SELECT id, first_name, last_name, filename FROM art_artists WHERE (first_name LIKE %s OR last_name LIKE %s) AND deleted = 0;", ('%Jagdesh%', '%Kumar%'))
print('ARTISTS:', artists)
for a in artists:
    print('--- Artist ID:', a['id'], a['first_name'], a['last_name'], 'filename:', a['filename'])
    arts = execute_query('''
        SELECT col.id, col.document_name, col.filename, rel.deleted
        FROM art_artists_art_collections_c rel
        JOIN art_collections col ON rel.art_artists_art_collectionsart_collections_idb = col.id
        WHERE rel.art_artists_art_collectionsart_artists_ida = %s AND col.deleted = 0
    ''', (a['id'],))
    print('ARTWORKS LINKED TO JAGDESH (deleted=0):', len(arts), arts)
