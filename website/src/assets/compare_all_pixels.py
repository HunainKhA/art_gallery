import os
from PIL import Image

assets_dir = r"d:\art_gallery\website\src\assets"
bg_path = os.path.join(assets_dir, "gallery_wall_bg.png")
cutout_path = os.path.join(assets_dir, "gallery_girl_cutout.png")

with Image.open(bg_path) as bg, Image.open(cutout_path) as cutout:
    print("bg size:", bg.size)
    print("cutout size:", cutout.size)
    
    # Check pixels at x=220, y=500 in both
    print("bg(220,500):", bg.getpixel((220, 500)))
    print("cutout(220,500):", cutout.getpixel((220, 500)))
    
    # Check pixels at a background coordinate (e.g. x=50, y=500)
    print("bg(50,500):", bg.getpixel((50, 500)))
    print("cutout(50,500):", cutout.getpixel((50, 500)))
    
    # Let's count how many pixels are EXACTLY identical between bg (left 261 columns) and cutout
    identical = 0
    different = 0
    for y in range(1024):
        for x in range(261):
            p_bg = bg.getpixel((x, y))
            p_co = cutout.getpixel((x, y))
            if p_bg[:3] == p_co[:3]:
                identical += 1
            else:
                different += 1
    print(f"Identical pixels in left 261 columns: {identical}")
    print(f"Different pixels in left 261 columns: {different}")
