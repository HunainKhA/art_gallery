import pymysql
from config import Config
from database import get_db_connection, execute_query

print("Testing local database connection settings...")
print(f"Host: {Config.DB_HOST}")
print(f"User: {Config.DB_USER}")
print(f"Database: {Config.DB_NAME}")
print(f"Port: {Config.DB_PORT}")

try:
    conn = get_db_connection()
    print("SUCCESS: Connection established!")
    
    print("Testing artwork query...")
    query = """
        SELECT 
            c.id AS id,
            c.document_name AS title
        FROM art_collections c
        LIMIT 5;
    """
    with conn.cursor() as cursor:
        cursor.execute(query)
        res = cursor.fetchall()
        print(f"SUCCESS: Fetched {len(res)} artworks!")
        for row in res:
            print(f"- {row['title']}")
            
    conn.close()
except Exception as e:
    print(f"FAILED: An error occurred:")
    import traceback
    traceback.print_exc()
