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
import os
import json
from PIL import Image

# Cache the model session within this process (script runs once per request).
_SESSION = None
_SESSION_TRIED = False

def _get_session():
    """Load a higher-quality segmentation model. isnet-general-use has
    noticeably cleaner edges than the default u2net. Falls back to the
    default model if it can't be loaded."""
    global _SESSION, _SESSION_TRIED
    if _SESSION_TRIED:
        return _SESSION
    _SESSION_TRIED = True
    try:
        from rembg import new_session
        _SESSION = new_session(os.environ.get("REMBG_MODEL", "isnet-general-use"))
    except Exception as e:  # noqa: BLE001
        print(f"model load failed, using default: {e}", file=sys.stderr)
        _SESSION = None
    return _SESSION

def _remove(img_bytes: bytes) -> bytes:
    """Remove the background to a transparent PNG. Uses alpha matting to
    clean up soft edges and halos, with a plain fallback if it errors."""
    from rembg import remove
    session = _get_session()
    kwargs = dict(
        alpha_matting=True,
        alpha_matting_foreground_threshold=240,
        alpha_matting_background_threshold=15,
        alpha_matting_erode_size=10,
        post_process_mask=True,
    )
    if session is not None:
        kwargs["session"] = session
    try:
        return remove(img_bytes, **kwargs)
    except Exception as e:  # noqa: BLE001
        print(f"alpha matting failed, retrying plain: {e}", file=sys.stderr)
        if session is not None:
            return remove(img_bytes, session=session, post_process_mask=True)
        return remove(img_bytes)

def apply_crop(img_bytes: bytes, crop: dict) -> bytes:
    """Crop to a normalized rect {x, y, w, h} (fractions 0-1) before processing.
    Lets the user isolate one item in a photo that has several."""
    img = Image.open(io.BytesIO(img_bytes))
    W, H = img.size
    left = max(0, int(crop.get("x", 0) * W))
    top = max(0, int(crop.get("y", 0) * H))
    right = min(W, int((crop.get("x", 0) + crop.get("w", 1)) * W))
    bottom = min(H, int((crop.get("y", 0) + crop.get("h", 1)) * H))
    if right - left < 2 or bottom - top < 2:
        return img_bytes  # degenerate selection — fall back to whole image
    cropped = img.crop((left, top, right, bottom))
    out = io.BytesIO()
    cropped.convert("RGBA").save(out, format="PNG")
    return out.getvalue()

def remove_bg(img_bytes: bytes) -> bytes:
    return _remove(img_bytes)

def enhance(img_bytes: bytes, size: int = 800, padding: int = 60) -> bytes:
    from PIL import ImageEnhance, ImageFilter

    # 1. AI background removal (better model + alpha-matted edges)
    transparent = _remove(img_bytes)
    fg = Image.open(io.BytesIO(transparent)).convert("RGBA")

    # 2. Crop out transparent border so we're working with just the product
    bbox = fg.getbbox()
    if bbox:
        fg = fg.crop(bbox)

    # 3. Boost sharpness, contrast, colour saturation, brightness on the RGB channels
    r, g, b, a = fg.split()
    rgb = Image.merge("RGB", (r, g, b))
    rgb = ImageEnhance.Sharpness(rgb).enhance(2.0)    # crisp edges
    rgb = ImageEnhance.Contrast(rgb).enhance(1.2)     # punchy tones
    rgb = ImageEnhance.Color(rgb).enhance(1.25)       # vivid colours
    rgb = ImageEnhance.Brightness(rgb).enhance(1.08)  # lift shadows slightly
    r2, g2, b2 = rgb.split()
    fg = Image.merge("RGBA", (r2, g2, b2, a))

    # 4. Scale to fill the canvas (up or down)
    max_dim = size - 2 * padding
    ratio = min(max_dim / fg.width, max_dim / fg.height)
    new_w = max(1, int(fg.width * ratio))
    new_h = max(1, int(fg.height * ratio))
    fg = fg.resize((new_w, new_h), Image.LANCZOS)

    # 5. Composite onto transparent canvas with a soft drop-shadow
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
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
    canvas.save(out, format="PNG", optimize=True)
    return out.getvalue()

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "remove-bg"
    crop_arg = sys.argv[2] if len(sys.argv) > 2 else None
    raw = sys.stdin.buffer.read()
    if crop_arg:
        try:
            crop = json.loads(crop_arg)
            raw = apply_crop(raw, crop)
        except Exception as e:  # noqa: BLE001
            print(f"crop skipped: {e}", file=sys.stderr)
    if mode == "enhance":
        sys.stdout.buffer.write(enhance(raw))
    else:
        sys.stdout.buffer.write(remove_bg(raw))
