import os
from PIL import Image

path = r"d:\art_gallery\website\src\assets\gallery_girl_2d_v2.png"
with Image.open(path) as img:
    alpha = img.getchannel('A')
    # Count pixels by opacity and color
    opaque_colors = {}
    for y in range(img.height):
        for x in range(img.width):
            p = img.getpixel((x, y))
            if p[3] == 255:  # Opaque
                rgb = p[:3]
                opaque_colors[rgb] = opaque_colors.get(rgb, 0) + 1
                
    print("Total opaque pixels:", sum(opaque_colors.values()))
    print("Top 10 opaque colors and their counts:")
    sorted_colors = sorted(opaque_colors.items(), key=lambda x: x[1], reverse=True)
    for color, count in sorted_colors[:10]:
        print(f"Color {color}: {count} pixels")
