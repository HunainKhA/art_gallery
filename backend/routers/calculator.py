from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import execute_query, get_db_connection

router = APIRouter(prefix="/api/calculator", tags=["Sizing Calculator"])

class SizingRequest(BaseModel):
    artwork_length: float
    artwork_width: float
    margin: float = 1.5 # Default border margin of 1.5 inches on all 4 sides

@router.post("/suggest-sheet")
def suggest_best_sheet(data: SizingRequest):
    """
    Finds the best standard sheet size for the given artwork dimensions
    to minimize wastage and ensure margins are maintained.
    """
    artwork_l = data.artwork_length
    artwork_w = data.artwork_width
    margin = data.margin
    
    # Calculate required sheet size including borders on both sides
    required_l = artwork_l + (2 * margin)
    required_w = artwork_w + (2 * margin)
    
    # Get standard sheet sizes from database
    query = "SELECT id, name, length, width, unit, price FROM art_sheet_sizes;"
    try:
        sheets = execute_query(query)
        if not sheets:
            raise HTTPException(status_code=404, detail="No standard glass sheet sizes configured in database.")
            
        compatible_sheets = []
        artwork_area = artwork_l * artwork_w
        
        for sheet in sheets:
            sheet_l = float(sheet["length"])
            sheet_w = float(sheet["width"])
            sheet_price = float(sheet["price"])
            
            # Check both orientations (Portrait and Landscape)
            portrait_fit = (sheet_l >= required_l and sheet_w >= required_w)
            landscape_fit = (sheet_l >= required_w and sheet_w >= required_l)
            
            if portrait_fit or landscape_fit:
                sheet_area = sheet_l * sheet_w
                wastage_area = sheet_area - artwork_area
                wastage_percent = (wastage_area / sheet_area) * 100
                
                # Determine margins left on each orientation
                if portrait_fit:
                    margin_l = (sheet_l - artwork_l) / 2
                    margin_w = (sheet_w - artwork_w) / 2
                    orientation = "Portrait"
                else:
                    margin_l = (sheet_l - artwork_w) / 2
                    margin_w = (sheet_w - artwork_l) / 2
                    orientation = "Landscape"
                    
                compatible_sheets.append({
                    "id": sheet["id"],
                    "name": sheet["name"],
                    "length": sheet_l,
                    "width": sheet_w,
                    "price": sheet_price,
                    "wastage_percent": round(wastage_percent, 2),
                    "margin_length": round(margin_l, 2),
                    "margin_width": round(margin_w, 2),
                    "suggested_orientation": orientation,
                    "sheet_area": sheet_area
                })
                
        if not compatible_sheets:
            # If no standard size fits, suggest a custom size
            return {
                "fit_found": False,
                "message": "Artwork is too large for standard glass sheets. A custom glass sheet size is required.",
                "suggested_custom_size": f"{required_l:.1f} x {required_w:.1f} inches"
            }
            
        # Sort compatible sheets by sheet area (smallest size first = least wastage)
        compatible_sheets.sort(key=lambda x: x["sheet_area"])
        
        best_fit = compatible_sheets[0]
        
        return {
            "fit_found": True,
            "best_fit": {
                "name": best_fit["name"],
                "length": best_fit["length"],
                "width": best_fit["width"],
                "price": best_fit["price"],
                "wastage_percent": best_fit["wastage_percent"],
                "margin_length": best_fit["margin_length"],
                "margin_width": best_fit["margin_width"],
                "suggested_orientation": best_fit["suggested_orientation"]
            },
            "all_compatible_sheets": [
                {
                    "name": s["name"],
                    "length": s["length"],
                    "width": s["width"],
                    "price": s["price"],
                    "wastage_percent": s["wastage_percent"]
                } for s in compatible_sheets
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Calculator calculation error: {str(e)}")


class YieldRequest(BaseModel):
    sheet_id: int = None
    custom_length: float = None
    custom_width: float = None
    artwork_length: float
    artwork_width: float
    include_margin: bool = True
    margin: float = 1.5

@router.post("/calculate-yield")
def calculate_yield(data: YieldRequest):
    """
    Calculates how many smaller cuts of a given artwork size can be
    extracted from a standard glass sheet preset or custom sheet size.
    """
    artwork_l = data.artwork_length
    artwork_w = data.artwork_width
    margin = data.margin if data.include_margin else 0.0
    
    # Required cut dimensions (including border margins on all 4 sides if checked)
    cut_l = artwork_l + (2 * margin)
    cut_w = artwork_w + (2 * margin)
    
    sheet_l = 0.0
    sheet_w = 0.0
    sheet_name = "Custom Sheet"
    
    if data.sheet_id is not None:
        query = "SELECT name, length, width FROM art_sheet_sizes WHERE id = %s;"
        sheet = execute_query(query, (data.sheet_id,), fetch="one")
        if not sheet:
            raise HTTPException(status_code=404, detail="Glass sheet preset not found.")
        sheet_l = float(sheet["length"])
        sheet_w = float(sheet["width"])
        sheet_name = sheet["name"]
    else:
        if not data.custom_length or not data.custom_width:
            raise HTTPException(status_code=400, detail="Must provide custom_length and custom_width if sheet_id is not specified.")
        sheet_l = data.custom_length
        sheet_w = data.custom_width
        
    if cut_l <= 0 or cut_w <= 0 or sheet_l <= 0 or sheet_w <= 0:
        raise HTTPException(status_code=400, detail="Dimensions must be greater than zero.")
        
    # Option 1: Portrait orientation
    cols1 = int(sheet_l // cut_l)
    rows1 = int(sheet_w // cut_w)
    yield1 = cols1 * rows1
    
    # Option 2: Landscape orientation
    cols2 = int(sheet_l // cut_w)
    rows2 = int(sheet_w // cut_l)
    yield2 = cols2 * rows2
    
    if yield1 >= yield2:
        best_yield = yield1
        best_layout = "Portrait"
        cols = cols1
        rows = rows1
    else:
        best_yield = yield2
        best_layout = "Landscape"
        cols = cols2
        rows = rows2
        
    sheet_area = sheet_l * sheet_w
    cut_area = cut_l * cut_w
    total_cut_area = best_yield * cut_area
    wastage_area = sheet_area - total_cut_area
    
    utilization_percent = (total_cut_area / sheet_area) * 100 if sheet_area > 0 else 0.0
    wastage_percent = 100.0 - utilization_percent
    
    return {
        "success": True,
        "sheet_name": sheet_name,
        "sheet_length": sheet_l,
        "sheet_width": sheet_w,
        "cut_length": round(cut_l, 2),
        "cut_width": round(cut_w, 2),
        "total_yield": best_yield,
        "layout_orientation": best_layout,
        "cols": cols,
        "rows": rows,
        "utilization_percent": round(utilization_percent, 2),
        "wastage_percent": round(wastage_percent, 2),
        "wastage_area": round(wastage_area, 2),
        "sheet_area": round(sheet_area, 2)
    }


class SheetRequest(BaseModel):
    name: str
    length: float
    width: float
    unit: str = "inches"
    price: float = 0.0

@router.get("/sheets")
def get_all_sheets():
    """
    Fetches all standard sheet sizes from the database.
    """
    query = "SELECT id, name, length, width, unit, price FROM art_sheet_sizes ORDER BY id ASC;"
    try:
        sheets = execute_query(query)
        return sheets
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/sheets")
def add_new_sheet(data: SheetRequest):
    """
    Adds a new standard glass sheet size preset to the database.
    """
    query = """
        INSERT INTO art_sheet_sizes (name, length, width, unit, price)
        VALUES (%s, %s, %s, %s, %s);
    """
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(query, (
                data.name,
                data.length,
                data.width,
                data.unit,
                data.price
            ))
            connection.commit()
            return {"success": True, "message": "Glass sheet size preset successfully added."}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to add sheet size preset: {str(e)}")
    finally:
        connection.close()

@router.delete("/sheets/{sheet_id}")
def delete_sheet(sheet_id: int):
    """
    Deletes a standard glass sheet size preset from the database.
    """
    query = "DELETE FROM art_sheet_sizes WHERE id = %s;"
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(query, (sheet_id,))
            connection.commit()
            return {"success": True, "message": "Glass sheet size preset deleted successfully."}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete sheet size preset: {str(e)}")
    finally:
        connection.close()

@router.put("/sheets/{sheet_id}")
def update_sheet(sheet_id: int, data: SheetRequest):
    """
    Updates details (name, length, width, price) of an existing standard glass sheet size preset.
    """
    query = """
        UPDATE art_sheet_sizes
        SET name = %s, length = %s, width = %s, price = %s, unit = %s
        WHERE id = %s;
    """
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(query, (
                data.name,
                data.length,
                data.width,
                data.price,
                data.unit,
                sheet_id
            ))
            connection.commit()
            return {"success": True, "message": "Glass sheet size preset successfully updated."}
    except Exception as e:
        connection.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update sheet size preset: {str(e)}")
    finally:
        connection.close()

