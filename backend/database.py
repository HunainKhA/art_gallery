import pymysql
import pymysql.cursors
from config import Config

def get_db_connection():
    """
    Establishes and returns a connection to the MySQL database.
    Remember to close the connection after queries.
    """
    connection = pymysql.connect(
        host=Config.DB_HOST,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        database=Config.DB_NAME,
        port=Config.DB_PORT,
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True
    )
    return connection

def execute_query(query, params=None, fetch="all"):
    """
    Utility function to execute a database query and automatically manage connection closing.
    """
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(query, params or ())
            if fetch == "all":
                return cursor.fetchall()
            elif fetch == "one":
                return cursor.fetchone()
            return None
    finally:
        connection.close()
