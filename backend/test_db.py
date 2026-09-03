import os
import pymysql
from config import Config

print(f"Testing DB Connection to: Host={Config.DB_HOST}, User={Config.DB_USER}, DB={Config.DB_NAME}...")

try:
    conn = pymysql.connect(
        host=Config.DB_HOST,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        database=Config.DB_NAME,
        port=Config.DB_PORT,
        cursorclass=pymysql.cursors.DictCursor
    )
    with conn.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) as total FROM art_collections;")
        res = cursor.fetchone()
        print(f"SUCCESS: Connected! Total artworks in DB: {res.get('total')}")
    conn.close()
except Exception as e:
    print(f"FAILED: {e}")
