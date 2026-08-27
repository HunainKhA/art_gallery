import pymysql
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import get_db_connection

def run_migration():
    print("Connecting to database to check art_exhibitions_cstm for guest_pics_c...")
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("DESCRIBE art_exhibitions_cstm;")
            columns = [row['Field'] for row in cursor.fetchall()]
            
            if 'guest_pics_c' not in columns:
                print("Adding guest_pics_c column...")
                cursor.execute("ALTER TABLE art_exhibitions_cstm ADD COLUMN guest_pics_c TEXT DEFAULT NULL;")
                print("Successfully added guest_pics_c column.")
            else:
                print("guest_pics_c column already exists.")
                
            connection.commit()
            print("Migration completed successfully!")
    except Exception as e:
        print(f"Migration failed: {e}")
        connection.rollback()
    finally:
        connection.close()

if __name__ == "__main__":
    run_migration()
