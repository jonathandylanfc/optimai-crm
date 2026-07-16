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
    transparent = remove(img_bytes)
    fg = Image.open(io.BytesIO(transparent)).convert("RGBA")

    canvas = Image.new("RGBA", (size, size), (255, 255, 255, 255))

    max_dim = size - 2 * padding
    # Scale to fill the target area (both up and down)
    ratio = min(max_dim / fg.width, max_dim / fg.height)
    new_w = max(1, int(fg.width * ratio))
    new_h = max(1, int(fg.height * ratio))
    fg = fg.resize((new_w, new_h), Image.LANCZOS)

    x = (size - fg.width) // 2
    y = (size - fg.height) // 2
    canvas.paste(fg, (x, y), fg)

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
