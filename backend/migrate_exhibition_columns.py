import pymysql
import sys
import os

# Add backend directory to path so we can import config & database
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import get_db_connection

def run_migration():
    print("Connecting to database to check art_exhibitions_cstm columns...")
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # Check columns in art_exhibitions_cstm
            cursor.execute("DESCRIBE art_exhibitions_cstm;")
            columns = [row['Field'] for row in cursor.fetchall()]
            
            # Add artist_id_c if not exists
            if 'artist_id_c' not in columns:
                print("Adding artist_id_c column...")
                cursor.execute("ALTER TABLE art_exhibitions_cstm ADD COLUMN artist_id_c VARCHAR(36) DEFAULT NULL;")
                print("Successfully added artist_id_c column.")
            else:
                print("artist_id_c column already exists.")

            # Add artwork_ids_c if not exists
            if 'artwork_ids_c' not in columns:
                print("Adding artwork_ids_c column...")
                cursor.execute("ALTER TABLE art_exhibitions_cstm ADD COLUMN artwork_ids_c TEXT DEFAULT NULL;")
                print("Successfully added artwork_ids_c column.")
            else:
                print("artwork_ids_c column already exists.")
                
            connection.commit()
            print("Migration completed successfully!")
    except Exception as e:
        print(f"Migration failed: {e}")
        connection.rollback()
    finally:
        connection.close()

if __name__ == "__main__":
    run_migration()
