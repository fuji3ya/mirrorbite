"""
Mirrorbite — Derive splash / android / favicon from the final icon.png

Final icon.png is ChatGPT-generated (Mirrorbite_icon source, plate-with-bite design).
This script derives all auxiliary assets from that single source so they stay visually consistent.

Run:
    cd C:/workspace/apps/mirrorbite/store
    python derive-assets-from-icon.py

Output:
    ../assets/images/splash-icon.png            (800x800, alpha)
    ../assets/images/android-icon-foreground.png (432x432 center 60%, alpha)
    ../assets/images/android-icon-background.png (432x432, solid teal)
    ../assets/images/android-icon-monochrome.png (432x432 silhouette, alpha)
    ../assets/images/favicon.png                (192x192, RGB)
"""
from PIL import Image, ImageDraw, ImageFilter, ImageOps
import os

THIS_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.normpath(os.path.join(THIS_DIR, '..', 'assets', 'images'))
SOURCE_ICON = os.path.join(ASSETS, 'icon.png')

TEAL_500 = (0x3D, 0xB8, 0xA8)
WHITE    = (0xFF, 0xFF, 0xFF)


def crop_to_plate(im, padding=0.10):
    """
    icon.png はキャンバス全体に teal 背景があるので、plate (白) 部分だけ取り出して
    透明背景の RGBA に変換。adaptive icon / splash / favicon は plate のみが見える
    のが望ましい。
    """
    rgba = im.convert('RGBA')
    w, h = rgba.size

    # plate を抽出: 白に近い pixel だけ keep、他は透明
    # plate の白は ~ #FFFFFF、teal background は ~ #3DB8A8 (とその gradient)
    px = rgba.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            # 白に近い (r,g,b 全部 > 200) → keep
            # teal 系 (g > r and g > 100 で blueish) → 透明化
            if r >= 200 and g >= 200 and b >= 200:
                # keep as is (white plate)
                px[x, y] = (r, g, b, 255)
            else:
                # teal background → fully transparent
                px[x, y] = (0, 0, 0, 0)
    return rgba


def build_splash_800(source_rgba):
    """Splash: 800×800 alpha PNG、plate のみ表示 (app.json で背景白指定)。"""
    # source は 1024x1024、800x800 に縮小
    return source_rgba.resize((800, 800), Image.LANCZOS)


def build_android_foreground_432(source_rgba):
    """Android adaptive icon foreground: 432×432 中央 60% に plate を配置。"""
    canvas = Image.new('RGBA', (432, 432), (0, 0, 0, 0))
    # plate は中央 60% (= 260px) box に収める
    plate_size = 260
    plate = source_rgba.resize((plate_size, plate_size), Image.LANCZOS)
    offset = (432 - plate_size) // 2
    canvas.paste(plate, (offset, offset), plate)
    return canvas


def build_android_background_432():
    """Android adaptive icon background: solid teal 432×432。"""
    return Image.new('RGB', (432, 432), TEAL_500)


def build_android_monochrome_432(source_rgba):
    """Android themed icon: silhouette (single color, alpha)。"""
    # plate の alpha mask だけ取って、その上で黒の RGBA を作る
    plate_size = 260
    plate = source_rgba.resize((plate_size, plate_size), Image.LANCZOS)
    # alpha mask 抽出
    alpha = plate.split()[-1]
    # 黒で塗りつぶした layer + alpha
    silhouette = Image.new('RGBA', (plate_size, plate_size), (0, 0, 0, 0))
    black = Image.new('RGBA', (plate_size, plate_size), (0, 0, 0, 255))
    silhouette.paste(black, (0, 0), alpha)

    canvas = Image.new('RGBA', (432, 432), (0, 0, 0, 0))
    offset = (432 - plate_size) // 2
    canvas.paste(silhouette, (offset, offset), silhouette)
    return canvas


def build_favicon_192(source_im_rgb):
    """Web favicon: 192×192 RGB、icon.png をそのまま縮小 (teal 背景込み)。"""
    return source_im_rgb.resize((192, 192), Image.LANCZOS)


def main():
    if not os.path.exists(SOURCE_ICON):
        print(f'icon.png not found: {SOURCE_ICON}')
        return
    src = Image.open(SOURCE_ICON)
    print(f'Source icon: {src.size} mode={src.mode}')

    # plate 抽出版 (透明背景)
    plate_rgba = crop_to_plate(src.copy())

    targets = {
        'splash-icon.png':                (build_splash_800(plate_rgba),               True),
        'android-icon-foreground.png':    (build_android_foreground_432(plate_rgba),   True),
        'android-icon-background.png':    (build_android_background_432(),             False),
        'android-icon-monochrome.png':    (build_android_monochrome_432(plate_rgba),   True),
        'favicon.png':                    (build_favicon_192(src.convert('RGB')),      False),
    }
    for name, (img, has_alpha) in targets.items():
        out = os.path.join(ASSETS, name)
        if not has_alpha:
            if img.mode == 'RGBA':
                bg = Image.new('RGB', img.size, WHITE)
                bg.paste(img, mask=img.split()[-1])
                img = bg
            elif img.mode != 'RGB':
                img = img.convert('RGB')
        img.save(out, 'PNG', optimize=True)
        size_kb = os.path.getsize(out) / 1024
        print(f'  {name:40s} {img.size[0]}x{img.size[1]:4d}  mode={img.mode:5s}  {size_kb:6.1f} KB')


if __name__ == '__main__':
    main()
