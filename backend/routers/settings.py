from fastapi import APIRouter, HTTPException, UploadFile, File, Response
from pydantic import BaseModel
from database import execute_query
from config import Config
import os
import uuid
import shutil

router = APIRouter(prefix="/api/settings", tags=["Settings"])

class SettingsUpdate(BaseModel):
    hide_prices: bool
    hide_add_to_cart: bool
    about_title: str | None = None
    about_subtitle: str | None = None
    about_story_title: str | None = None
    about_story_content: str | None = None
    about_framing_title: str | None = None
    about_framing_content: str | None = None
    about_story_image: str | None = None
    about_framing_image: str | None = None
    about_vision_title: str | None = None
    about_vision_content: str | None = None
    about_mission_title: str | None = None
    about_mission_content: str | None = None
    about_vision_image: str | None = None
    about_mission_image: str | None = None

@router.get("")
def get_settings():
    """
    Fetches the global display settings from the database.
    """
    try:
        # Fetch configurations under category 'gallery_settings'
        rows = execute_query(
            "SELECT name, value FROM config WHERE category = 'gallery_settings'"
        )
        # Defaults
        settings = {
            "hide_prices": False,
            "hide_add_to_cart": False,
            "about_title": "About Mainframe",
            "about_subtitle": "A premier gallery for contemporary art collections and bespoke framing craftsmanship.",
            "about_story_title": "Our Story",
            "about_story_content": "Established with a mission to showcase fine art and foster dialogues between contemporary artists and curators, Mainframe The Gallery has stood as a hallmark of creativity in Karachi. We represent master painters, sketchers, and sculptors, and display collections ranging from historic calligraphy to avant-garde abstract works.",
            "about_framing_title": "Our Journey",
            "about_framing_content": "Since inception, Mainframe has grown from a humble passion project into a premier visual arts gallery. Over the years, we have hosted numerous exhibitions, supported emerging talents, and crafted a signature curation space that bridges local mastery with global art lovers.",
            "about_story_image": "",
            "about_framing_image": "",
            "about_vision_image": "",
            "about_mission_image": "",
            "about_vision_title": "Our Vision",
            "about_vision_content": "To connect individuals with exquisite art and foster an inclusive ecosystem that inspires creativity, supports local artists, and brings world-class visual culture into daily life.",
            "about_mission_title": "Our Mission",
            "about_mission_content": "To represent creative talent, preserve heritage through custom conservation-grade framing, and provide a premium, curation-first gallery space for art curators and collectors."
        }
        for row in rows:
            name = row["name"]
            val = row["value"]
            if name in ["hide_prices", "hide_add_to_cart"]:
                settings[name] = val == "1"
            elif name in settings:
                settings[name] = val
        return settings
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("")
def update_settings(payload: SettingsUpdate):
    """
    Updates the global display settings in the database.
    """
    try:
        # Delete existing entries first to avoid duplicates
        execute_query("DELETE FROM config WHERE category = 'gallery_settings' AND name = 'hide_prices'")
        execute_query("DELETE FROM config WHERE category = 'gallery_settings' AND name = 'hide_add_to_cart'")
        execute_query("DELETE FROM config WHERE category = 'gallery_settings' AND name LIKE 'about_%%'")
        
        hide_prices_val = "1" if payload.hide_prices else "0"
        hide_add_to_cart_val = "1" if payload.hide_add_to_cart else "0"
        
        execute_query(
            "INSERT INTO config (category, name, value) VALUES ('gallery_settings', 'hide_prices', %s)",
            (hide_prices_val,)
        )
        execute_query(
            "INSERT INTO config (category, name, value) VALUES ('gallery_settings', 'hide_add_to_cart', %s)",
            (hide_add_to_cart_val,)
        )
        
        # Save About Us fields
        about_fields = {
            "about_title": payload.about_title,
            "about_subtitle": payload.about_subtitle,
            "about_story_title": payload.about_story_title,
            "about_story_content": payload.about_story_content,
            "about_framing_title": payload.about_framing_title,
            "about_framing_content": payload.about_framing_content,
            "about_story_image": payload.about_story_image,
            "about_framing_image": payload.about_framing_image,
            "about_vision_title": payload.about_vision_title,
            "about_vision_content": payload.about_vision_content,
            "about_mission_title": payload.about_mission_title,
            "about_mission_content": payload.about_mission_content,
            "about_vision_image": payload.about_vision_image,
            "about_mission_image": payload.about_mission_image
        }
        for name, val in about_fields.items():
            if val is not None:
                execute_query(
                    "INSERT INTO config (category, name, value) VALUES ('gallery_settings', %s, %s)",
                    (name, val)
                )
        
        return {"status": "success", "message": "Settings updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/about/upload")
def upload_about_asset(file: UploadFile = File(...)):
    """
    Uploads an image asset for the About Us page.
    """
    upload_dir = Config.UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)
    
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".png", ".jpg", ".jpeg", ".webp", ".gif"]:
        raise HTTPException(status_code=400, detail="Invalid image file format.")
        
    unique_filename = f"about_asset_{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(upload_dir, unique_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return {"success": True, "filename": unique_filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded About Us asset: {str(e)}")

@router.get("/about/images")
def list_about_images():
    """
    Lists all previously uploaded About Us images from the upload folder.
    """
    try:
        upload_dir = Config.UPLOAD_DIR
        if not os.path.exists(upload_dir):
            return []
        files = os.listdir(upload_dir)
        about_files = [f for f in files if f.startswith("about_asset_") and os.path.isfile(os.path.join(upload_dir, f))]
        # Sort by modified time descending (newest first)
        about_files.sort(key=lambda f: os.path.getmtime(os.path.join(upload_dir, f)), reverse=True)
        return about_files
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list images: {str(e)}")

@router.get("/image/{filename}")
def get_about_image(filename: str):
    """
    Serves a settings image (e.g. About Us images) from the upload directory.
    """
    upload_dir = Config.UPLOAD_DIR
    file_path = os.path.join(upload_dir, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image not found.")
        
    media_type = "image/png"
    if filename.lower().endswith(".jpg") or filename.lower().endswith(".jpeg"):
        media_type = "image/jpeg"
    elif filename.lower().endswith(".webp"):
        media_type = "image/webp"
    elif filename.lower().endswith(".gif"):
        media_type = "image/gif"
        
    try:
        with open(file_path, "rb") as f:
            return Response(content=f.read(), media_type=media_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read image: {str(e)}")

@router.delete("/about/image/{filename}")
def delete_about_image(filename: str):
    """
    Deletes an uploaded About Us image from the upload folder.
    """
    try:
        # Validate that it's an about asset to prevent deleting arbitrary files
        if not filename.startswith("about_asset_"):
            raise HTTPException(status_code=400, detail="Invalid file target.")
            
        upload_dir = Config.UPLOAD_DIR
        file_path = os.path.join(upload_dir, filename)
        
        if os.path.exists(file_path):
            os.remove(file_path)
            return {"success": True, "message": "Image deleted successfully."}
        else:
            raise HTTPException(status_code=404, detail="Image not found on disk.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete image: {str(e)}")
