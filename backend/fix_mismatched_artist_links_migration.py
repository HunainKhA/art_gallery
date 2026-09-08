import sys
import os

sys.path.insert(0, os.path.dirname(__file__))
from database import execute_query

def run_migration():
    print("=== RUNNING ARTIST LINK & ARCHIVED STATUS MIGRATION ===")
    
    # 1. Soft-delete A.H Rizvi link for ANO-4775 if present
    try:
        execute_query("""
            UPDATE art_artists_art_collections_c 
            SET deleted = 1 
            WHERE art_artists_art_collectionsart_collections_idb IN (
                SELECT id FROM art_collections WHERE document_name LIKE '%%ANO-4775%%' OR id = '4080ebec-ad02-bd4d-f614-69faf14dbc72'
            )
            AND art_artists_art_collectionsart_artists_ida IN (
                SELECT id FROM art_artists WHERE last_name LIKE '%%Rizvi%%' OR last_name LIKE '%%A.H%%'
            );
        """)
        print("Updated ANO-4775 artist link: removed A.H Rizvi link.")
    except Exception as e:
        print("Error soft-deleting Rizvi link:", e)

    # 2. Update status to 'archived' for ANO-4775
    try:
        execute_query("""
            UPDATE art_collections 
            SET collection_status = 'archived' 
            WHERE document_name LIKE '%%ANO-4775%%' OR id = '4080ebec-ad02-bd4d-f614-69faf14dbc72';
        """)
        print("Updated ANO-4775 collection_status to 'archived'.")
    except Exception as e:
        print("Error updating status for ANO-4775:", e)

    # 3. Fix other multi-link prefix mismatches
    fixes = [
        ("MAN-2057", "%BUKHARI%"),
        ("NIS-3358", "%AZEEMI%"),
        ("S.M-2065", "%RAHI%"),
        ("QAS-4195", "%MUNEEB%")
    ]
    for code, wrong_artist_pattern in fixes:
        try:
            execute_query("""
                UPDATE art_artists_art_collections_c 
                SET deleted = 1 
                WHERE art_artists_art_collectionsart_collections_idb IN (
                    SELECT id FROM art_collections WHERE document_name = %s
                )
                AND art_artists_art_collectionsart_artists_ida IN (
                    SELECT id FROM art_artists WHERE last_name LIKE %s
                );
            """, (code, wrong_artist_pattern))
            print(f"Cleaned wrong artist link for {code}.")
        except Exception as e:
            print(f"Note for {code}:", e)

if __name__ == "__main__":
    run_migration()
