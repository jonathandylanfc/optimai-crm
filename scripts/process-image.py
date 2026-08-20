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

def _rect_to_box(rect: dict, W: int, H: int):
    """Normalized rect {x, y, w, h} (fractions 0-1) -> pixel box."""
    left = max(0, int(rect.get("x", 0) * W))
    top = max(0, int(rect.get("y", 0) * H))
    right = min(W, int((rect.get("x", 0) + rect.get("w", 1)) * W))
    bottom = min(H, int((rect.get("y", 0) + rect.get("h", 1)) * H))
    return (left, top, right, bottom)

def cutout_regions(img_bytes: bytes, rects: list) -> bytes:
    """Keep only the selected regions, background removed, composited back onto
    one transparent canvas in their original relative positions.

    Each region is segmented on its own rather than masking the full frame in a
    single pass: a tight crop around one subject is what the model handles best,
    and it stops a large subject's mask from swallowing a smaller one beside it.
    The canvas is the union bounding box of the selections, so the pieces keep
    their spacing and alignment instead of being jammed together.
    """
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    W, H = img.size

    boxes = [_rect_to_box(r, W, H) for r in rects if isinstance(r, dict)]
    boxes = [b for b in boxes if b[2] - b[0] >= 2 and b[3] - b[1] >= 2]
    if not boxes:
        return _remove(img_bytes)  # degenerate selection — fall back to whole image

    min_x = min(b[0] for b in boxes)
    min_y = min(b[1] for b in boxes)
    max_x = max(b[2] for b in boxes)
    max_y = max(b[3] for b in boxes)

    canvas = Image.new("RGBA", (max_x - min_x, max_y - min_y), (0, 0, 0, 0))
    for b in boxes:
        buf = io.BytesIO()
        img.crop(b).save(buf, format="PNG")
        try:
            piece = Image.open(io.BytesIO(_remove(buf.getvalue()))).convert("RGBA")
        except Exception as e:  # noqa: BLE001
            # One bad region shouldn't lose the others — keep it un-cut.
            print(f"region segmentation failed, keeping as-is: {e}", file=sys.stderr)
            piece = img.crop(b).convert("RGBA")
        canvas.alpha_composite(piece, (b[0] - min_x, b[1] - min_y))

    out = io.BytesIO()
    canvas.save(out, format="PNG")
    return out.getvalue()

def remove_bg(img_bytes: bytes) -> bytes:
    return _remove(img_bytes)

def enhance(img_bytes: bytes, size: int = 800, padding: int = 60) -> bytes:
    """Background-remove the whole frame, then style it."""
    return style(Image.open(io.BytesIO(_remove(img_bytes))).convert("RGBA"), size, padding)

def style(fg: Image.Image, size: int = 800, padding: int = 60) -> bytes:
    """Studio treatment for an already-transparent cutout: trim, sharpen, scale
    to the canvas and drop a soft shadow. Split out from enhance() so a
    multi-region cutout can be styled the same way."""
    from PIL import ImageEnhance, ImageFilter

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

    # The selection argument is a list of regions to keep. A bare object is
    # still accepted so an older client sending one rect keeps working.
    rects = []
    if crop_arg:
        try:
            parsed = json.loads(crop_arg)
            rects = parsed if isinstance(parsed, list) else [parsed]
        except Exception as e:  # noqa: BLE001
            print(f"selection skipped: {e}", file=sys.stderr)

    transparent = cutout_regions(raw, rects) if rects else _remove(raw)

    if mode == "enhance":
        sys.stdout.buffer.write(style(Image.open(io.BytesIO(transparent)).convert("RGBA")))
    else:
        sys.stdout.buffer.write(transparent)
