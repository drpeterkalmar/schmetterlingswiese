# v2.2 Werkstatt: alle Reiter in Hoch- und Querformat (412 px), Touch-Ziele ≥ 48 px, Reiter ganz sichtbar,
# letzte Reihe über „Fertig“, Vorschau-Figur ganz im Bild (nicht von der Karte verdeckt, nicht abgeschnitten)
import time, json, sys
sys.path.insert(0, 'tests')
from util import *
from test_ui import CHECK, WARD
FIG = """(() => { const c = __app.player.critter, cam = __app.camera; c.root.updateMatrixWorld(true);
  const v = new __app.THREE.Vector3(); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  c.root.traverse(o => { if (!o.isMesh || !o.visible || o.material.transparent) return; const a = o.geometry.attributes.position;
    for (let i = 0; i < a.count; i += 3) { v.fromBufferAttribute(a, i).applyMatrix4(o.matrixWorld).project(cam);
      const px = (v.x + 1) / 2 * innerWidth, py = (1 - v.y) / 2 * innerHeight; x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py); } });
  const card = document.querySelector('.screen .card').getBoundingClientRect();
  const bad = [];
  if (x0 < -2 || y0 < -2 || x1 > innerWidth + 2 || y1 > innerHeight + 2) bad.push('figur-abgeschnitten:' + [x0, y0, x1, y1].map(Math.round));
  const ov = Math.max(0, Math.min(x1, card.right) - Math.max(x0, card.left)) * Math.max(0, Math.min(y1, card.bottom) - Math.max(y0, card.top));
  if (ov > (x1 - x0) * (y1 - y0) * 0.2) bad.push('figur-unter-karte:' + Math.round(ov / ((x1 - x0) * (y1 - y0)) * 100) + '%');
  return bad; })()"""
def run(dev, tag):
    res = {}
    with sync_playwright() as pw:
        s = Session(pw, device=dev, dpr=1)
        s.open(); s.tap('#title'); s.pg.fill('input.name', 'Werkstatt'); s.tap('[data-a=create]')
        s.ev("__app.progress.cur.levels['1-1'] = {leicht: {stars: 3}, mittel: {stars: 3}, schwer: {stars: 3}}; __app.progress.cur.levels['1-2'] = {leicht: {stars: 3}}; __app.progress.save()")
        s.tap('[data-a=wardrobe]'); time.sleep(1)
        for char in ['schmetterling', 'katze']:
            if char == 'katze': s.ev("__app.progress.cur.levels['9'] = {leicht: {stars: 200}}; __app.progress.save()"); s.tap('[data-a=wtab][data-v=figur]'); s.tap('[data-a=wchar][data-v=katze]')
            for t in ['figur', 'farbe', 'form', 'fluegel', 'hut', 'spur']:
                s.tap(f'[data-a=wtab][data-v={t}]'); time.sleep(1.4)
                s.shot(f'v22/werkstatt_{tag}_{char}_{t}')
                r = s.ev(CHECK) + s.ev(WARD) + s.ev(FIG)
                res[f'{char}_{t}'] = r
        # Farbwahl: Palette antippen → Farbe am 3D-Modell
        s.tap('[data-a=wtab][data-v=farbe]'); s.tap('[data-a=wslot][data-v=a]'); s.tap('.sw >> nth=11')
        res['farbe_gesetzt'] = s.ev("__app.player.critter.look.a === 0x3f6fff") or ['farbe-nicht-am-modell']
        s.tap('[data-a=wrandom]'); time.sleep(1); s.shot(f'v22/werkstatt_{tag}_zufall')
        res['zufall'] = s.ev(CHECK) + s.ev(FIG)
        print(tag, json.dumps({k: v for k, v in res.items() if v and v is not True}, ensure_ascii=False))
        print(tag, 'errors', s.errors[:10])
        s.close()
if __name__ == '__main__':
    run(PIXEL7, 'P')
    run(PIXEL7_LAND, 'L')
