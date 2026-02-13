from PIL import Image, ImageDraw, ImageFont
import os

def generate_icon(size, filename):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded rect background
    r = int(size * 0.18)
    draw.rounded_rectangle([0, 0, size-1, size-1], radius=r, fill='#4A90D9')

    # White card shape
    m = int(size * 0.2)
    w = size - m * 2
    h = int(w * 0.7)
    y = (size - h) // 2
    cr = int(size * 0.05)
    draw.rounded_rectangle([m, y, m+w, y+h], radius=cr, fill='white')

    # Text "闪"
    font_size = int(size * 0.3)
    try:
        # Try common CJK fonts
        for fname in ['/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc',
                      '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
                      '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc',
                      '/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf']:
            if os.path.exists(fname):
                font = ImageFont.truetype(fname, font_size)
                break
        else:
            font = ImageFont.load_default()
    except:
        font = ImageFont.load_default()

    bbox = draw.textbbox((0, 0), '闪', font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = (size - tw) // 2 - bbox[0]
    ty = (size - th) // 2 - bbox[1]
    draw.text((tx, ty), '闪', fill='#4A90D9', font=font)

    img.save(filename, 'PNG')
    print(f'Generated {filename} ({size}x{size})')

generate_icon(192, 'icon-192.png')
generate_icon(512, 'icon-512.png')
