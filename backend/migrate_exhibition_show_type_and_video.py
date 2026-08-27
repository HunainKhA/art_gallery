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
            
            # Add show_type_c if not exists
            if 'show_type_c' not in columns:
                print("Adding show_type_c column...")
                cursor.execute("ALTER TABLE art_exhibitions_cstm ADD COLUMN show_type_c VARCHAR(10) DEFAULT 'solo';")
                print("Successfully added show_type_c column.")
            else:
                print("show_type_c column already exists.")

            # Add group_artist_ids_c if not exists
            if 'group_artist_ids_c' not in columns:
                print("Adding group_artist_ids_c column...")
                cursor.execute("ALTER TABLE art_exhibitions_cstm ADD COLUMN group_artist_ids_c TEXT DEFAULT NULL;")
                print("Successfully added group_artist_ids_c column.")
            else:
                print("group_artist_ids_c column already exists.")

            # Add video_url_c if not exists
            if 'video_url_c' not in columns:
                print("Adding video_url_c column...")
                cursor.execute("ALTER TABLE art_exhibitions_cstm ADD COLUMN video_url_c TEXT DEFAULT NULL;")
                print("Successfully added video_url_c column.")
            else:
                print("video_url_c column already exists.")
                
            connection.commit()
            print("Migration completed successfully!")
    except Exception as e:
        print(f"Migration failed: {e}")
        connection.rollback()
    finally:
        connection.close()

if __name__ == "__main__":
    run_migration()
