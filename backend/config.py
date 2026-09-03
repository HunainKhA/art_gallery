import os
from dotenv import load_dotenv

# Load variables from .env file
load_dotenv()

# Find the workspace root dynamically (parent directory of backend folder)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WORKSPACE_ROOT = os.path.dirname(BASE_DIR)

class Config:
    WORKSPACE_ROOT = WORKSPACE_ROOT

    # Database Settings
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_USER = os.getenv("DB_USER", "u556062534_ahsan21")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "asdfM!1234")
    DB_NAME = os.getenv("DB_NAME", "mf_db")
    DB_PORT = int(os.getenv("DB_PORT", 3306))

    # Dynamic fallback to all possible upload directories across environments
    @staticmethod
    def get_upload_dirs():
        candidates = [
            os.getenv("UPLOAD_DIR", ""),
            "/var/www/html/uploads/upload",
            "/var/www/html/uploads",
            "/var/www/uploads/upload",
            "/var/www/uploads",
            "/var/www/mfadashboard/upload",
            "/var/www/mfadashboard/mfadashboard/upload",
            "/var/www/html/mfadashboard/upload",
            "/var/www/html/upload",
            "/var/www/upload",
            os.path.join(WORKSPACE_ROOT, "mfadashboard", "mfadashboard", "upload"),
            os.path.join(WORKSPACE_ROOT, "mfadashboard", "upload"),
            os.path.join(WORKSPACE_ROOT, "upload"),
            os.path.join(BASE_DIR, "upload"),
            "/root/art_gallery/mfadashboard/upload",
            "/root/art_gallery/mfadashboard/mfadashboard/upload",
            "/root/art_gallery/upload",
            "/root/mfadashboard/upload"
        ]
        valid = []
        seen = set()
        for c in candidates:
            if c and os.path.exists(c) and os.path.isdir(c):
                norm = os.path.abspath(c).replace("\\", "/")
                if norm not in seen:
                    seen.add(norm)
                    valid.append(norm)
        if not valid:
            fallback = os.path.join(WORKSPACE_ROOT, "mfadashboard", "upload").replace("\\", "/")
            return [fallback]
        return valid

    DEFAULT_UPLOAD_DIR = os.path.join(WORKSPACE_ROOT, "mfadashboard", "upload").replace("\\", "/")
    UPLOAD_DIR = os.getenv("UPLOAD_DIR", DEFAULT_UPLOAD_DIR)

    # Stripe Settings (Sandbox keys default)
    STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "sk_test_51PTestKeyHere...")
    
    # CORS Origins (Allowed Frontend URL)
    ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
