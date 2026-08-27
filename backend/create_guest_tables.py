import pymysql
from config import Config
from database import get_db_connection

def create_guest_tables():
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # Create guest_users table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS guest_users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                phone VARCHAR(50) NOT NULL,
                verification_code VARCHAR(50) NOT NULL UNIQUE,
                verified BOOLEAN DEFAULT FALSE,
                session_token VARCHAR(255) NULL,
                session_expiry DATETIME NULL,
                generated_username VARCHAR(100) NULL,
                generated_password VARCHAR(100) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );
            """)
            print("Table 'guest_users' checked/created.")

            # Create guest_credentials table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS guest_credentials (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """)
            print("Table 'guest_credentials' checked/created.")
            
    except Exception as e:
        print("Error creating guest tables:", e)
    finally:
        connection.close()

if __name__ == "__main__":
    create_guest_tables()
