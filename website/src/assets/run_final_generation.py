import os
from PIL import Image

assets_dir = r"d:\art_gallery\website\src\assets"
bg_path = os.path.join(assets_dir, "gallery_wall_bg.png")
cutout_path = os.path.join(assets_dir, "gallery_girl_cutout.png")
output_paths = [
    os.path.join(assets_dir, "gallery_girl_2d.png"),
    os.path.join(assets_dir, "gallery_girl_2d_v2.png")
]

# STEP 1: Isolate the girl's colors from bg using the cutout's black pixels as the mask
with Image.open(bg_path) as bg_img, Image.open(cutout_path) as cutout_img:
    width, height = cutout_img.size  # 261x1024
    clean_cutout = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    
    bg_data = bg_img.load()
    cutout_data = cutout_img.load()
    clean_data = clean_cutout.load()
    
    for y in range(height):
        for x in range(width):
            p_co = cutout_data[x, y]
            p_bg = bg_data[x, y]
            
            # Check if cutout pixel is black or transparent (indicating the girl silhouette)
            is_girl = (len(p_co) > 3 and p_co[3] == 0) or (p_co[0] == 0 and p_co[1] == 0 and p_co[2] == 0)
            
            if is_girl:
                # Copy the girl's color from the bg image
                clean_data[x, y] = p_bg[:3] + (255,)
            else:
                # Background wall -> transparent
                clean_data[x, y] = (0, 0, 0, 0)
                
    # Crop to the girl's vertical box: rows 84 to 947
    girl_cropped = clean_cutout.crop((0, 84, 261, 947))
    
    # STEP 2: Paste onto the high-resolution transparent canvas (2878x2064)
    canvas_w = 2878
    canvas_h = 2064
    highres_canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    
    # Scaled position corresponding to original 647x464 layout
    paste_x = 498
    paste_y = 970
    
    highres_canvas.paste(girl_cropped, (paste_x, paste_y), girl_cropped)
    
    # Save the final image to both output paths
    for path in output_paths:
        highres_canvas.save(path, "PNG")
        print(f"Correctly isolated and assembled image saved to {path}")
