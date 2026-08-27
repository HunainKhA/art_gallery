import os
from PIL import Image

assets_dir = r"d:\art_gallery\website\src\assets"
path = os.path.join(assets_dir, "gallery_girl_2d_highres.png")

with Image.open(path) as img:
    print("Image size:", img.size)
    print("Mode:", img.mode)
    alpha = img.getchannel('A')
    
    # Get bounding box of non-transparent content
    bbox = alpha.getbbox()
    print("Bounding box of alpha channel:", bbox)
    
    # Check sample pixels
    # Let's check a pixel that should be background (e.g. 0, 0)
    print("Pixel at (0, 0):", img.getpixel((0, 0)))
    # Let's check a pixel that should be the girl (inside the bounding box, e.g. paste_x + 100, paste_y + 400)
    print("Pixel at (598, 1370):", img.getpixel((598, 1370)))
