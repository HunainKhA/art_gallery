import os
from PIL import Image

assets_dir = r"d:\art_gallery\website\src\assets"
cutout_path = os.path.join(assets_dir, "gallery_girl_cutout.png")
clean_cutout_path = os.path.join(assets_dir, "gallery_girl_cutout_clean.png")
output_path = os.path.join(assets_dir, "gallery_girl_2d.png")

# STEP 1: Isolate the girl from cutout
with Image.open(cutout_path) as img:
    width, height = img.size
    result = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    
    img_data = img.load()
    result_data = result.load()
    
    for y in range(height):
        for x in range(width):
            p = img_data[x, y]
            # Check if transparent or black
            is_bg = (len(p) > 3 and p[3] == 0) or (p[0] == 0 and p[1] == 0 and p[2] == 0)
            
            if is_bg:
                # Background -> Transparent
                result_data[x, y] = (0, 0, 0, 0)
            else:
                # Girl -> Keep original color
                result_data[x, y] = p[:3] + (255,)
                
    result.save(clean_cutout_path, "PNG")
    print(f"Isolated girl cutout saved to {clean_cutout_path}")

# STEP 2: Crop and paste onto the high-resolution canvas
with Image.open(clean_cutout_path) as cutout:
    girl_cropped = cutout.crop((0, 84, 261, 947))
    
    canvas_w = 2878
    canvas_h = 2064
    highres_canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    
    paste_x = 498
    paste_y = 970
    
    highres_canvas.paste(girl_cropped, (paste_x, paste_y), girl_cropped)
    highres_canvas.save(output_path, "PNG")
    print(f"High-resolution 2D girl canvas successfully saved to: {output_path}")
