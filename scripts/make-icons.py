#!/usr/bin/env python3
"""Build the People's Register icons.

The desktop and taskbar icon is a gold flared cross on a jewel-tone
medallion, saved at every size Windows asks for. The generated parish
emblem is copied beside it for the register window.
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
RENDERER = ROOT / "renderer"
EMBLEM_SOURCE = ASSETS / "emblem.png"

# Flared Latin cross in a 100 by 140 box.
CROSS = [
    (24, 4), (76, 4), (64, 20), (64, 40), (78, 40), (96, 28), (96, 80),
    (78, 68), (64, 68), (64, 118), (76, 136), (24, 136), (36, 118),
    (36, 68), (22, 68), (4, 80), (4, 28), (22, 40), (36, 40), (36, 20),
]


def lerp(a, b, t):
    return a * (1 - t) + b * t


def master_icon(size=1024):
    y, x = np.mgrid[0:size, 0:size]
    u = x / (size - 1)
    t = y / (size - 1)
    top = np.array([32, 58, 150], dtype=np.float32)
    bottom = np.array([104, 36, 132], dtype=np.float32)
    teal = np.array([18, 128, 132], dtype=np.float32)
    rose = np.array([140, 42, 78], dtype=np.float32)
    vertical = lerp(top, bottom, t[..., None])
    teal_weight = np.clip((1 - u) * np.clip(t * 1.2, 0, 1), 0, 1)[..., None] * 0.72
    rose_weight = np.clip(u * (1 - t), 0, 1)[..., None] * 0.38
    colour = vertical * (1 - teal_weight - rose_weight) + teal * teal_weight + rose * rose_weight
    colour = np.clip(colour, 0, 255).astype(np.uint8)

    base = Image.fromarray(colour, "RGB").convert("RGBA")
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [1, 1, size - 2, size - 2],
        radius=int(size * 0.22),
        fill=255,
    )
    icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    icon.paste(base, (0, 0), mask)

    draw = ImageDraw.Draw(icon)
    cx = cy = size / 2
    radius = size * 0.40
    ring = max(8, int(size * 0.028))
    box = [cx - radius, cy - radius, cx + radius, cy + radius]
    draw.ellipse(box, outline=(246, 208, 110, 255), width=ring)
    inner = radius - ring * 0.65
    draw.ellipse(
        [cx - inner, cy - inner, cx + inner, cy + inner],
        outline=(255, 236, 180, 90),
        width=max(2, ring // 5),
    )

    height = size * 0.60
    width = height * (92 / 132)
    left = cx - width / 2
    top_y = cy - height / 2
    points = [(left + (px - 4) / 92 * width, top_y + (py - 4) / 132 * height) for px, py in CROSS]
    center = (cx, cy + size * 0.01)
    outline = [((px - center[0]) * 1.045 + center[0], (py - center[1]) * 1.045 + center[1]) for px, py in points]
    draw.polygon(outline, fill=(138, 84, 24, 255))
    draw.polygon(points, fill=(255, 220, 130, 255))
    return icon


def save_ico(images, dest):
    ordered = sorted(images, key=lambda im: im.size[0])
    ordered[-1].save(
        dest,
        format="ICO",
        sizes=[im.size for im in ordered],
        append_images=ordered[:-1],
    )


def main():
    ASSETS.mkdir(parents=True, exist_ok=True)
    RENDERER.mkdir(parents=True, exist_ok=True)
    master = master_icon(1024)
    master.resize((512, 512), Image.Resampling.LANCZOS).save(ASSETS / "icon.png")
    master.resize((256, 256), Image.Resampling.LANCZOS).save(RENDERER / "icon.png")

    sizes = {
        s: master.resize((s, s), Image.Resampling.LANCZOS)
        for s in (16, 24, 32, 48, 64, 128, 256)
    }
    save_ico(list(sizes.values()), ASSETS / "icon.ico")

    if EMBLEM_SOURCE.exists():
        emblem = Image.open(EMBLEM_SOURCE).convert("RGB")
        emblem.resize((512, 512), Image.Resampling.LANCZOS).save(RENDERER / "emblem.png", quality=92)

    preview = Path("/tmp/icon-preview")
    preview.mkdir(parents=True, exist_ok=True)
    for s, im in sizes.items():
        im.save(preview / f"crisp-{s}.png")
    master.resize((256, 256), Image.Resampling.LANCZOS).save(preview / "crisp-master-256.png")
    print(f"Wrote {ASSETS / 'icon.ico'} and {ASSETS / 'icon.png'}")


if __name__ == "__main__":
    main()
