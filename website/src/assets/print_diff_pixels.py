import os
from PIL import Image

assets_dir = r"d:\art_gallery\website\src\assets"
bg_path = os.path.join(assets_dir, "gallery_wall_bg.png")
cutout_path = os.path.join(assets_dir, "gallery_girl_cutout.png")

with Image.open(bg_path) as bg, Image.open(cutout_path) as cutout:
    count = 0
    for y in range(1024):
        for x in range(261):
            p_bg = bg.getpixel((x, y))
            p_co = cutout.getpixel((x, y))
            if p_bg[:3] != p_co[:3]:
                print(f"Diff at ({x}, {y}): bg={p_bg[:3]}, cutout={p_co[:3]}")
                count += 1
                if count >= 20:
                    break
        if count >= 20:
            break
