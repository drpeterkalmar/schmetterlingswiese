# v2.5 Zielpfeil hoch am Himmel: Bildschirm-Lage per Projektion (hoch 412×915 und quer), Abstand zur Figuren-Box, nie
# über HUD/Figur/Ringen, Größe, Neigung bei tiefem Ziel, nie „runder Fleck“ (Ziel hinten), Ausblenden in Zielnähe und über
# einem Ring; Screenshots in allen Welten (tests/shots/v25/pfeil_<welt>_<hoch|quer>.jpg) + Kontrast Pfeil/Himmel.
import time, json, sys, os, math
sys.path.insert(0, 'tests')
from util import *
from PIL import Image, ImageStat
OUT = 'tests/shots/v25'
os.makedirs(OUT, exist_ok=True); os.makedirs('tests/out', exist_ok=True)
WORLDS = [('1-1', 'wiese'), ('2-1', 'sonne'), ('3-1', 'teich'), ('4-1', 'kirsch'), ('5-1', 'abend')]

def sim_wait(s, sec):
    t0 = s.ev("__app.t")
    while s.ev("__app.t") - t0 < sec: time.sleep(0.02)

MEASURE = """(() => { const g = __app.game, A = g.arrow, cam = __app.camera, THREE = __app.THREE, W = innerWidth, H = innerHeight;
  const bend = (p) => { const v = p.clone(); v.y -= 0.0009 * ((p.x - cam.position.x) ** 2 + (p.z - cam.position.z) ** 2); return v; };
  const px = (p) => { const v = bend(p).project(cam); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H, v.z]; };
  const rectOf = (obj) => { const b = new THREE.Box3().setFromObject(obj, true), r = [1e9, 1e9, -1e9, -1e9];
    for (let i = 0; i < 8; i++) { const [x, y] = px(new THREE.Vector3(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z)); r[0] = Math.min(r[0], x); r[1] = Math.min(r[1], y); r[2] = Math.max(r[2], x); r[3] = Math.max(r[3], y); }
    return r; };
  A.updateMatrixWorld(true);
  const ar = rectOf(g.arrow), fr = rectOf(__app.player.critter.root);
  const dom = (sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return r.width ? [r.left, r.top, r.right, r.bottom] : null; };
  const ov = (a, b) => !!a && !!b && a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
  const gap = (a, b) => Math.max(b[0] - a[2], a[0] - b[2], b[1] - a[3], a[1] - b[3]);
  const hud = { top: dom('.hudtop'), pause: dom('#bPause'), tasks: dom('#tasks'), timer: dom('#timer'), show: dom('#bShow'), steigen: dom('#zones .zu i'), sinken: dom('#zones .zd i') };
  // Spitze/Schwanz im Bild (Pfeil zeigt in +z)
  const tip = px(new THREE.Vector3(0, 0, 0.53).applyMatrix4(A.matrixWorld)), tail = px(new THREE.Vector3(0, 0, -0.31).applyMatrix4(A.matrixWorld));
  const dir = new THREE.Vector3(0, 0, 1).transformDirection(A.matrixWorld);
  // v2.4-Lage zum Vergleich: 2,4 m vor und 1,25 m über der Figur, Größe 0,9–1 (Geometrie 0,77 m lang)
  const p = __app.player, f = new THREE.Vector3(Math.sin(p.yaw), 0, Math.cos(p.yaw));
  const old = px(p.pos.clone().addScaledVector(f, 2.4).add(new THREE.Vector3(0, 1.25, 0)));
  const oldD = cam.position.distanceTo(p.pos.clone().addScaledVector(f, 2.4).add(new THREE.Vector3(0, 1.25, 0)));
  const fpx = H / 2 / Math.tan(cam.fov * Math.PI / 360);
  const tg = g.guideTarget();
  return { W, H, td: tg ? +tg.distanceTo(__app.player.pos).toFixed(1) : null, vis: A.visible, a: +g.arrowA.toFixed(3), rect: ar.map(v => +v.toFixed(1)), cy: +((ar[1] + ar[3]) / 2).toFixed(1), cx: +((ar[0] + ar[2]) / 2).toFixed(1),
    third: +(((ar[1] + ar[3]) / 2) / H).toFixed(3), fig: fr.map(v => +v.toFixed(1)), gapFig: +gap(ar, fr).toFixed(1),
    hudHit: Object.entries(hud).filter(([k, r]) => ov(ar, r)).map(([k]) => k), hudBottom: hud.top ? +hud.top[3].toFixed(1) : null,
    lenPx: +Math.hypot(tip[0] - tail[0], tip[1] - tail[1]).toFixed(1), sizePx: +Math.max(ar[2] - ar[0], ar[3] - ar[1]).toFixed(1),
    tipDown: +(tip[1] - tail[1]).toFixed(1), dirY: +dir.y.toFixed(3), camDist: +A.position.distanceTo(cam.position).toFixed(2), scale: +A.scale.x.toFixed(3),
    old: { cy: +old[1].toFixed(1), third: +(old[1] / H).toFixed(3), lenPx: +(0.77 * 0.95 / oldD * fpx).toFixed(1) } };
})()"""

def fly(s, alt=4.0):
    s.ev(f"""(() => {{ const g = __app.game, p = __app.player; p.stunt = null; if (p.landed) p.takeoff();
      p.pos.copy(g.spawn); p.pos.y = __H(p.pos.x, p.pos.z) + {alt}; p.yaw = g.spawnYaw; p.yawRate = 0; p.pitch = 0; p.camInit = false;
      __app.input.injected = {{turn: 0, climb: 0}}; }})()""")

def contrast(png, rect, dpr):
    im = Image.open(png).convert('L'); x0, y0, x1, y1 = [int(v * dpr) for v in rect]
    inner = im.crop((x0, y0, x1, y1)); pad = int(24 * dpr)
    ring = [im.crop((max(0, x0 - pad), max(0, y0 - pad), x0, y1)), im.crop((x1, y0, min(im.width, x1 + pad), y1))]
    bg = sum(ImageStat.Stat(r).mean[0] for r in ring) / 2
    st = ImageStat.Stat(inner)
    # Anteil der Pfeil-Pixel, die sich deutlich vom Himmel abheben (hell oder dunkel)
    px = list(inner.get_flattened_data() if hasattr(inner, 'get_flattened_data') else inner.getdata()); far = sum(1 for v in px if abs(v - bg) > 45) / max(1, len(px))
    return {'bg': round(bg), 'min': st.extrema[0][0], 'max': st.extrema[0][1], 'far': round(far, 2)}

res = {'hoch': {}, 'quer': {}}
with sync_playwright() as pw:
    for ori, dev in [('hoch', PIXEL7), ('quer', PIXEL7_LAND)]:
        s = Session(pw, device=dev, dpr=1.5)
        s.open(); s.tap('#title'); s.pg.fill('input.name', 'Pfeil'); s.tap('[data-a=create]')
        s.ev("__game.setQuality(1)")
        s.ev("import('./js/world/terrain.js').then(m => { window.__H = m.height; })"); time.sleep(0.3)
        R = res[ori]
        for lid, wid in WORLDS:
            s.ev(f"__game.start('{lid}', 'leicht')"); sim_wait(s, 0.5)
            fly(s); sim_wait(s, 1.6)
            ms = []
            for k in range(7):  # geradeaus fliegen, mehrfach messen
                ms.append(s.ev(MEASURE)); sim_wait(s, 0.35)
            m = ms[-1]
            s.ev("__game.freeze(true)"); time.sleep(0.2)
            png = f'{OUT}/pfeil_{wid}_{ori}.png'; s.pg.screenshot(path=png)
            m['contrast'] = contrast(png, m['rect'], 1.5)
            s.ev("__game.freeze(false)")
            Image.open(png).convert('RGB').save(png[:-4] + '.jpg', quality=86); os.remove(png)
            use = [x for x in ms if (x['td'] or 0) > 10]  # in Zielnähe (< 9 m) blendet der Pfeil gewollt aus
            ok = len(use) >= 2 and all(x['vis'] and x['a'] > 0.9 and x['third'] < 1 / 3 and x['gapFig'] > 8 and not x['hudHit'] for x in use)
            R[wid] = {'ok': ok, 'samples': ms}
            print(ori, wid, 'ok' if ok else 'FEHLER', json.dumps({k: m[k] for k in ['cy', 'third', 'gapFig', 'hudHit', 'hudBottom', 'lenPx', 'sizePx', 'camDist', 'contrast', 'old']}), flush=True)
        # --- Ziel tief unten: Pfeil neigt sich sichtbar nach unten
        s.ev("__game.start('1-1', 'leicht')"); sim_wait(s, 0.5)
        s.ev("""(() => { const t = __app.game.tasks[0], it = t.items.find(i => !i.taken), p = __app.player; t.items.forEach(i => { if (i !== it) i.taken = true; });
          p.pos.set(it.pos.x - 16, it.pos.y + 16, it.pos.z); p.yaw = Math.PI / 2; p.camInit = false; __app.input.injected = {turn: 0, climb: 0}; })()""")
        sim_wait(s, 0.3)
        s.ev("__app.player.pos.y = __app.game.tasks[0].items.find(i => !i.taken).pos.y + 16")
        m = s.ev(MEASURE); s.ev("__game.freeze(true)"); time.sleep(0.2); s.pg.screenshot(path=f'{OUT}/pfeil_tief_{ori}.png'); s.ev("__game.freeze(false)")
        R['tief'] = {'dirY': m['dirY'], 'tipDown': m['tipDown'], 'third': m['third'], 'ok': m['dirY'] < -0.6 and m['tipDown'] > 0.3 * m['lenPx'] and m['third'] < 1 / 3}
        print(ori, 'tief', R['tief'], flush=True)
        # --- Ziel genau hinten: nie ein runder Fleck (Spitze/Schwanz im Bild deutlich getrennt)
        s.ev("""(() => { const it = __app.game.tasks[0].items.find(i => !i.taken), p = __app.player;
          p.pos.set(it.pos.x - 20, it.pos.y, it.pos.z); p.yaw = -Math.PI / 2; p.camInit = false; })()""")
        sim_wait(s, 0.3); s.ev("(() => { const it = __app.game.tasks[0].items.find(i => !i.taken), p = __app.player; p.pos.set(it.pos.x - 20, it.pos.y, it.pos.z); })()")
        m = s.ev(MEASURE)
        R['hinten'] = {'lenPx': m['lenPx'], 'sizePx': m['sizePx'], 'ok': m['lenPx'] > 0.45 * m['sizePx'] and m['vis']}
        s.ev("__game.freeze(true)"); time.sleep(0.2); s.pg.screenshot(path=f'{OUT}/pfeil_hinten_{ori}.jpg', quality=86); s.ev("__game.freeze(false)")
        print(ori, 'hinten', R['hinten'], flush=True)
        # --- Zielnähe: ausgeblendet unter 6 m, sichtbar ab 9 m
        s.ev("__app.game.diffCfg = { ...__app.game.diffCfg, magnet: 0 }")  # Magnet aus, sonst wird der Tropfen eingesammelt
        s.ev("(() => { const it = __app.game.tasks[0].items.find(i => !i.taken), p = __app.player; p.pos.set(it.pos.x - 5, it.pos.y + 1, it.pos.z); p.yaw = Math.PI / 2; })()")
        near = []
        for k in range(12):
            s.ev("(() => { const it = __app.game.tasks[0].items.find(i => !i.taken), p = __app.player; p.pos.set(it.pos.x - 5, it.pos.y + 1, it.pos.z); })()")
            sim_wait(s, 0.05); near.append(s.ev("__app.game.arrowA"))
        R['nah'] = {'a': round(near[-1], 3), 'ok': near[-1] < 0.05}
        print(ori, 'nah', R['nah'], flush=True)
        # --- Ring genau hinter dem Pfeil (Level 1-3): Pfeil blendet aus, statt ihn zu verdecken
        s.ev("__game.start('1-3', 'leicht')"); sim_wait(s, 0.5); fly(s)
        s.ev("__app.player.yaw += 1.4; __app.player.camInit = false")  # nächster Ring seitlich außerhalb des Bildes → Pfeil sichtbar
        sim_wait(s, 1.2)
        a0 = s.ev("__app.game.arrowA")
        s.ev("""window.__ringHold = setInterval(() => { const g = __app.game, t = g.tasks[0], A = g.arrow; if (t.cur + 1 < t.max) t.pts[t.cur + 1].copy(A.position); }, 16);""")
        sim_wait(s, 1.0); a1 = s.ev("__app.game.arrowA"); s.ev("clearInterval(window.__ringHold)")
        R['ring'] = {'a_vorher': round(a0, 3), 'a_ring': round(a1, 3), 'ok': a0 > 0.9 and a1 < 0.1}
        print(ori, 'ring', R['ring'], flush=True)
        R['errors'] = s.errors[:5]
        s.close()
# Kontaktbogen aller Welten (hoch | quer)
try:
    ims = [Image.open(f'{OUT}/pfeil_{w}_hoch.jpg') for _, w in WORLDS]
    w, h = ims[0].size; sc = 0.4
    out = Image.new('RGB', (int(w * sc) * 5, int(h * sc)))
    for i, im in enumerate(ims): out.paste(im.resize((int(w * sc), int(h * sc))), (i * int(w * sc), 0))
    out.save(f'{OUT}/pfeil_welten_hoch.jpg', quality=84)
    ims = [Image.open(f'{OUT}/pfeil_{w}_quer.jpg') for _, w in WORLDS]
    w, h = ims[0].size; sc = 0.5
    out = Image.new('RGB', (int(w * sc), int(h * sc) * 5))
    for i, im in enumerate(ims): out.paste(im.resize((int(w * sc), int(h * sc))), (0, i * int(h * sc)))
    out.save(f'{OUT}/pfeil_welten_quer.jpg', quality=84)
except Exception as e:
    print('bogen', e)
json.dump(res, open('tests/out/v25_pfeil.json', 'w'), indent=1)
ok = all(v['ok'] for o in res.values() for k, v in o.items() if k != 'errors') and not any(o['errors'] for o in res.values())
print('errors', [o['errors'] for o in res.values()])
print('ok', ok)
