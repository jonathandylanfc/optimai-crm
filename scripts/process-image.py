#!/usr/bin/env python3
"""
Process a product image for storefront presentation.
Reads raw image bytes from stdin, writes result PNG to stdout.

Usage:
  python3 process-image.py remove-bg  < input.jpg > output.png
  python3 process-image.py enhance    < input.jpg > output.png
"""

import sys
import io
from PIL import Image

def remove_bg(img_bytes: bytes) -> bytes:
    from rembg import remove
    return remove(img_bytes)

def enhance(img_bytes: bytes, size: int = 800, padding: int = 60) -> bytes:
    from rembg import remove
    from PIL import ImageEnhance, ImageFilter

    # 1. AI background removal
    transparent = remove(img_bytes)
    fg = Image.open(io.BytesIO(transparent)).convert("RGBA")

    # 2. Boost sharpness, contrast, colour saturation, brightness on the RGB channels
    r, g, b, a = fg.split()
    rgb = Image.merge("RGB", (r, g, b))
    rgb = ImageEnhance.Sharpness(rgb).enhance(2.0)    # crisp edges
    rgb = ImageEnhance.Contrast(rgb).enhance(1.2)     # punchy tones
    rgb = ImageEnhance.Color(rgb).enhance(1.25)       # vivid colours
    rgb = ImageEnhance.Brightness(rgb).enhance(1.08)  # lift shadows slightly
    r2, g2, b2 = rgb.split()
    fg = Image.merge("RGBA", (r2, g2, b2, a))

    # 3. Scale to fill the canvas (up or down)
    max_dim = size - 2 * padding
    ratio = min(max_dim / fg.width, max_dim / fg.height)
    new_w = max(1, int(fg.width * ratio))
    new_h = max(1, int(fg.height * ratio))
    fg = fg.resize((new_w, new_h), Image.LANCZOS)

    # 4. Composite onto white canvas with a soft drop-shadow
    canvas = Image.new("RGBA", (size, size), (255, 255, 255, 255))
    cx = (size - new_w) // 2
    cy = (size - new_h) // 2

    # Shadow: offset copy of the alpha mask, blurred
    shadow_canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    shadow_mask = fg.split()[3]
    shadow_fill = Image.new("RGBA", (new_w, new_h), (0, 0, 0, 80))
    shadow_canvas.paste(shadow_fill, (cx + 10, cy + 14), shadow_mask)
    shadow_canvas = shadow_canvas.filter(ImageFilter.GaussianBlur(18))
    canvas = Image.alpha_composite(canvas, shadow_canvas)

    # Paste the enhanced product on top
    canvas.paste(fg, (cx, cy), fg)

    out = io.BytesIO()
    canvas.convert("RGB").save(out, format="PNG", optimize=True)
    return out.getvalue()

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "remove-bg"
    raw = sys.stdin.buffer.read()
    if mode == "enhance":
        sys.stdout.buffer.write(enhance(raw))
    else:
        sys.stdout.buffer.write(remove_bg(raw))
