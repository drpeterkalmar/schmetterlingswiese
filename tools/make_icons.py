# Erzeugt die App-Icons (selbst gezeichnet, keine fremden Assets)
from PIL import Image, ImageDraw, ImageFilter
import math

def icon(size, maskable=False):
    S = size * 4
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    bg = Image.new('RGBA', (S, S))
    px = bg.load()
    for y in range(S):
        for x in range(S):
            t = (x + y) / (2 * S)
            r = int(255 * (1 - t) + 255 * t); g = int(160 * (1 - t) + 205 * t); b = int(205 * (1 - t) + 130 * t)
            px[x, y] = (r, g, b, 255)
    mask = Image.new('L', (S, S), 0)
    md = ImageDraw.Draw(mask)
    if maskable: md.rectangle([0, 0, S, S], fill=255)
    else: md.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.22), fill=255)
    im.paste(bg, (0, 0), mask)
    d = ImageDraw.Draw(im)
    # sanfter Hügel
    d.ellipse([-S * 0.3, S * 0.72, S * 1.3, S * 1.6], fill=(126, 206, 110, 255))
    d.ellipse([S * 0.35, S * 0.78, S * 1.5, S * 1.5], fill=(98, 186, 92, 255))
    sc = 0.78 if maskable else 1.0
    cx, cy = S / 2, S * 0.47
    def E(x0, y0, x1, y1, col):
        d.ellipse([cx + (x0) * S * sc, cy + (y0) * S * sc, cx + (x1) * S * sc, cy + (y1) * S * sc], fill=col)
    # Flügel (hinten dunkler Rand)
    for sgn in (-1, 1):
        def W(x0, y0, x1, y1, col):
            a, b = sorted([sgn * x0, sgn * x1]); E(a, y0, b, y1, col)
        W(0.02, -0.30, 0.36, 0.04, (90, 50, 90, 255)); W(0.04, -0.27, 0.33, 0.01, (255, 150, 60, 255)); W(0.08, -0.22, 0.28, -0.04, (255, 210, 90, 255))
        W(0.02, -0.02, 0.28, 0.24, (90, 50, 90, 255)); W(0.04, 0.0, 0.25, 0.21, (255, 120, 170, 255)); W(0.08, 0.04, 0.2, 0.16, (255, 190, 215, 255))
    # Körper + Kopf
    E(-0.045, -0.17, 0.045, 0.2, (74, 48, 72, 255))
    E(-0.1, -0.33, 0.1, -0.13, (74, 48, 72, 255))
    for sgn in (-1, 1):
        E(sgn * 0.045 - 0.035, -0.28, sgn * 0.045 + 0.035, -0.2, (255, 255, 255, 255))
        E(sgn * 0.045 - 0.022, -0.265, sgn * 0.045 + 0.022, -0.215, (30, 18, 38, 255))
        E(sgn * 0.045 - 0.013, -0.26, sgn * 0.045 + 0.0, -0.247, (255, 255, 255, 255))
        E(sgn * 0.075 - 0.02, -0.2, sgn * 0.075 + 0.02, -0.175, (255, 140, 180, 255))
        # Fühler
        x0, y0 = cx + sgn * 0.04 * S * sc, cy - 0.32 * S * sc
        x1, y1 = cx + sgn * 0.14 * S * sc, cy - 0.45 * S * sc
        d.line([x0, y0, x1, y1], fill=(74, 48, 72, 255), width=int(S * 0.018 * sc))
        d.ellipse([x1 - S * 0.03 * sc, y1 - S * 0.03 * sc, x1 + S * 0.03 * sc, y1 + S * 0.03 * sc], fill=(255, 150, 60, 255))
    im = im.resize((size, size), Image.LANCZOS)
    return im

icon(192).save('icons/icon-192.png')
icon(512).save('icons/icon-512.png')
icon(512, True).save('icons/icon-maskable-512.png')
icon(180).save('icons/apple-touch-icon.png')
print('ok')
