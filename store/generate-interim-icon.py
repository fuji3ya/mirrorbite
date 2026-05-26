"""
Mirrorbite — Interim App Icon Generator (PIL) v2

Day 7 朝に gpt-image-2 で polished version に差し替えるまでの **暫定 icon**。
Expo default (青い react logo) を脱却して App Store Review reject を回避する。

v2 design (2026-05-20): "Plate with a bite missing"
- 旧 v1: 2 crescents on plate → 結果が mustache/wings に見えた → 廃案
- 新 v2: 単一 plate + 右上から bite wedge を引いた crescent moon shape
  → "Mirrorbite" = mirror (reflection circle) + bite (wedge missing) を素直に表現
  → Apple Design Awards / iOS 18 style minimal glyph-first

仕様:
- 1024 × 1024 PNG, no alpha (Apple HIG)
- background: gradient teal400 (#6FD0C2) top → teal600 (#2A9A8A) bottom
- plate: white circle, radius ≈ 32% of canvas, centered
- bite wedge: gradient-color circle positioned upper-right that "eats" into the plate
- subtle drop shadow under plate for depth

Run:
    cd C:/workspace/apps/mirrorbite/store
    python generate-interim-icon.py
"""
from PIL import Image, ImageDraw, ImageFilter
import os

THIS_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.normpath(os.path.join(THIS_DIR, '..', 'assets', 'images'))

TEAL_TOP    = (0x6F, 0xD0, 0xC2)
TEAL_BOTTOM = (0x2A, 0x9A, 0x8A)
TEAL_500    = (0x3D, 0xB8, 0xA8)
TEAL_700    = (0x1C, 0x6A, 0x5E)
WHITE       = (0xFF, 0xFF, 0xFF)


def gradient_bg(w, h, top=TEAL_TOP, bottom=TEAL_BOTTOM):
    img = Image.new('RGB', (w, h), WHITE)
    px = img.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        r = round(top[0] + (bottom[0] - top[0]) * t)
        g = round(top[1] + (bottom[1] - top[1]) * t)
        b = round(top[2] + (bottom[2] - top[2]) * t)
        for x in range(w):
            px[x, y] = (r, g, b)
    return img


def sample_bg_color_at(size, x, y):
    """gradient_bg と同じ色を 1 点だけ計算 (bite wedge を gradient 色で 'えぐり取る' 用)。"""
    t = y / max(size - 1, 1)
    r = round(TEAL_TOP[0] + (TEAL_BOTTOM[0] - TEAL_TOP[0]) * t)
    g = round(TEAL_TOP[1] + (TEAL_BOTTOM[1] - TEAL_TOP[1]) * t)
    b = round(TEAL_TOP[2] + (TEAL_BOTTOM[2] - TEAL_TOP[2]) * t)
    return (r, g, b)


def compose_plate_bite(size, with_bg=True, plate_color=WHITE, bg=None):
    """
    plate + bite wedge を返す。with_bg=True なら gradient 背景込み、
    False なら透明背景に plate のみ (alpha 必須シーン用)。
    """
    if with_bg:
        img = gradient_bg(size, size)
    else:
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))

    cx, cy = size // 2, size // 2
    plate_r = int(size * 0.31)

    # --- drop shadow ---
    shadow = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    ds = ImageDraw.Draw(shadow)
    ds.ellipse(
        [cx - plate_r, cy - plate_r + int(size * 0.014),
         cx + plate_r, cy + plate_r + int(size * 0.014)],
        fill=(0, 0, 0, 60),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(int(size * 0.018)))
    img.paste(shadow, (0, 0), shadow)

    # --- plate (solid white circle) on an intermediate RGBA layer
    plate_layer = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    dp = ImageDraw.Draw(plate_layer)
    if with_bg:
        pcol = (*plate_color, 255)
    else:
        pcol = (*plate_color, 255)
    dp.ellipse(
        [cx - plate_r, cy - plate_r, cx + plate_r, cy + plate_r],
        fill=pcol
    )

    # --- bite wedge: punch a smaller circle out of the upper-right of the plate.
    # The "bite" looks like a crescent missing chunk → reads as "took a bite".
    bite_r = int(size * 0.18)
    bite_offset_x = int(size * 0.205)
    bite_offset_y = int(size * 0.205)
    # Erase pixels by drawing alpha=0
    dp.ellipse(
        [cx + bite_offset_x - bite_r, cy - bite_offset_y - bite_r,
         cx + bite_offset_x + bite_r, cy - bite_offset_y + bite_r],
        fill=(0, 0, 0, 0)
    )
    # PIL の ellipse(fill alpha=0) は paste 時に "transparent" として効く
    # ただし dp.ellipse fill=(0,0,0,0) は単にそのピクセルを透明色で描く → 効果は alpha=0 で上書き

    # Re-mask plate_layer to enforce alpha
    # Use the same mask trick: composite via paste
    img.paste(plate_layer, (0, 0), plate_layer)

    return img


def build_icon_1024():
    img = compose_plate_bite(1024, with_bg=True)
    # icon.png は no alpha 必須
    if img.mode == 'RGBA':
        bg = Image.new('RGB', img.size, WHITE)
        bg.paste(img, mask=img.split()[-1])
        img = bg
    elif img.mode != 'RGB':
        img = img.convert('RGB')
    return img


def build_splash_800():
    img = compose_plate_bite(800, with_bg=False)
    return img


def build_android_foreground_432():
    img = Image.new('RGBA', (432, 432), (0, 0, 0, 0))
    plate_size = 260
    plate_img = compose_plate_bite(plate_size, with_bg=False)
    offset = (432 - plate_size) // 2
    img.paste(plate_img, (offset, offset), plate_img)
    return img


def build_android_background_432():
    return Image.new('RGB', (432, 432), TEAL_500)


def build_android_monochrome_432():
    img = Image.new('RGBA', (432, 432), (0, 0, 0, 0))
    plate_size = 260
    inner = Image.new('RGBA', (plate_size, plate_size), (0, 0, 0, 0))
    d = ImageDraw.Draw(inner)
    cx = cy = plate_size // 2
    plate_r = int(plate_size * 0.31)
    d.ellipse([cx - plate_r, cy - plate_r, cx + plate_r, cy + plate_r], fill=(0, 0, 0, 255))
    # bite
    bite_r = int(plate_size * 0.18)
    bite_offset = int(plate_size * 0.205)
    d.ellipse(
        [cx + bite_offset - bite_r, cy - bite_offset - bite_r,
         cx + bite_offset + bite_r, cy - bite_offset + bite_r],
        fill=(0, 0, 0, 0)
    )
    img.paste(inner, ((432 - plate_size) // 2, (432 - plate_size) // 2), inner)
    return img


def build_favicon_192():
    img = compose_plate_bite(192, with_bg=True)
    return img


def main():
    os.makedirs(ASSETS, exist_ok=True)
    targets = {
        'icon.png':                       (build_icon_1024(),               False),
        'splash-icon.png':                (build_splash_800(),              True),
        'android-icon-foreground.png':    (build_android_foreground_432(),  True),
        'android-icon-background.png':    (build_android_background_432(),  False),
        'android-icon-monochrome.png':    (build_android_monochrome_432(),  True),
        'favicon.png':                    (build_favicon_192(),             False),
    }
    for name, (img, has_alpha) in targets.items():
        out = os.path.join(ASSETS, name)
        if not has_alpha:
            if img.mode == 'RGBA':
                bg_img = Image.new('RGB', img.size, WHITE)
                bg_img.paste(img, mask=img.split()[-1])
                img = bg_img
            elif img.mode != 'RGB':
                img = img.convert('RGB')
        img.save(out, 'PNG', optimize=True)
        size_kb = os.path.getsize(out) / 1024
        print(f'  {name:40s} {img.size[0]}x{img.size[1]:4d}  mode={img.mode:5s}  {size_kb:6.1f} KB')


if __name__ == '__main__':
    main()
