# Vergleichscollagen vorher/nachher (v2.8 Deko) → tests/shots/deko/vergleich_hoch.jpg, vergleich_quer.jpg (+ A/B mit ?deko=0)
from PIL import Image, ImageDraw, ImageFont
import os
D = 'tests/shots/deko'
SC = [('menue', 'Menü'), ('wiese', 'Frühlingswiese'), ('sonne', 'Sonnenblumenfeld'), ('teich', 'Seerosenteich'), ('kirsch', 'Kirschblütenhain'),
      ('kirschgegen', 'Kirsch, Gegenlicht'), ('wiesegegen', 'Wiese, Gegenlicht'), ('abend', 'Glühwürmchen-Abend'), ('sieg', 'Sieger-Einlage')]
try: F = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 17)
except Exception: F = ImageFont.load_default()
def collage(orient, labels, names, out, w):
    ims = {}
    for n, _ in SC:
        for l in labels:
            p = f'{D}/{l}_{n}_{orient}.png'
            if os.path.exists(p): ims[(l, n)] = Image.open(p).convert('RGB')
    first = next(iter(ims.values())); h = int(first.height * w / first.width)
    rows = [n for n, _ in SC if all((l, n) in ims for l in labels)]
    if orient == 'hoch':  # Szenen nebeneinander, Varianten untereinander
        S = Image.new('RGB', (len(rows) * w, len(labels) * (h + 34)), 'white'); d = ImageDraw.Draw(S)
        for j, l in enumerate(labels):
            for i, n in enumerate(rows):
                S.paste(ims[(l, n)].resize((w, h)), (i * w, j * (h + 34) + 34))
                d.text((i * w + 6, j * (h + 34) + 0), names[j], fill='#a0306a', font=F)
                d.text((i * w + 6, j * (h + 34) + 16), dict(SC)[n], fill='black', font=F)
    else:  # Szenen untereinander, Varianten nebeneinander
        S = Image.new('RGB', (len(labels) * w, len(rows) * (h + 34)), 'white'); d = ImageDraw.Draw(S)
        for i, n in enumerate(rows):
            for j, l in enumerate(labels):
                S.paste(ims[(l, n)].resize((w, h)), (j * w, i * (h + 34) + 34))
                d.text((j * w + 8, i * (h + 34) + 4), f'{names[j]} · {dict(SC)[n]}', fill='black', font=F)
    S.save(out, quality=82); print(out, S.size)
collage('hoch', ['vorher', 'nachher'], ['vorher 2.7', 'nachher 2.8'], f'{D}/vergleich_hoch.jpg', 330)
collage('quer', ['vorher', 'nachher'], ['vorher 2.7', 'nachher 2.8'], f'{D}/vergleich_quer.jpg', 640)
collage('hoch', ['vorher', 'alt'], ['vorher 2.7', '2.8 mit ?deko=0'], f'{D}/vergleich_ab_deko0_hoch.jpg', 220)
