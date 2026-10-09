# v3.0 Kunstflug: Bildfolge je Figur (8 Bilder über die Figur, gleichmäßig in p) → Collage tests/shots/v30/<id>_grid.jpg
# Aufruf: python3 tests/v30_shots.py [id,id,…] [--grand] [--quer] [--alt 5]
import time, json, sys, os, math
sys.path.insert(0, 'tests')
from util import *
OUT = 'tests/shots/v30'
os.makedirs(OUT, exist_ok=True)
args = sys.argv[1:]
grand = '--grand' in args; quer = '--quer' in args
alt = float(args[args.index('--alt') + 1]) if '--alt' in args else 4.0
ids = [a for a in args if not a.startswith('--') and not a.replace('.', '').isdigit()]
ids = ids[0].split(',') if ids else None
NF = 8

def sim_wait(s, sec):
    t0 = s.ev("__app.t")
    while s.ev("__app.t") - t0 < sec: time.sleep(0.02)

def place(s):
    s.ev(f"""(() => {{ const g = __app.game, p = __app.player; p.stunt = null; p.landed = false; p.hover = false;
      p.pos.copy(g.spawn); p.pos.y = __H(p.pos.x, p.pos.z) + {alt}; p.yaw = g.spawnYaw; p.yawRate = 0; p.pitch = 0; p.ext.set(0, 0, 0);
      p.camInit = false; __app.input.injected = {{turn: 0, climb: 0}}; }})()""")
    sim_wait(s, 0.8)

def grid(name, n):
    from PIL import Image, ImageDraw
    ims = [Image.open(f'{OUT}/{name}_{k}.png') for k in range(n)]
    w, h = ims[0].size; sc = 0.5 if h > w else 0.42
    cols = 4 if h > w else 4
    rows = (n + cols - 1) // cols
    W, Hh = int(w * sc), int(h * sc)
    out = Image.new('RGB', (W * cols, Hh * rows), (20, 20, 20))
    for k, im in enumerate(ims):
        out.paste(im.resize((W, Hh)), ((k % cols) * W, (k // cols) * Hh))
        ImageDraw.Draw(out).text(((k % cols) * W + 6, (k // cols) * Hh + 6), str(k + 1), fill=(255, 255, 255))
    out.save(f'{OUT}/{name}_grid.jpg', quality=84)

with sync_playwright() as pw:
    s = Session(pw, device=PIXEL7_LAND if quer else PIXEL7, dpr=1)
    s.open('?nosw'); s.tap('#title'); s.pg.fill('input.name', 'Sternchen'); s.tap('[data-a=create]')
    s.ev("__game.setQuality(1)")
    s.ev("import('./js/world/terrain.js').then(m => { window.__H = m.height; })"); time.sleep(0.3)
    s.ev("__app.album = () => {}; __app.ui.hint = () => {}")  # Album-/Hinweis-Einblendungen stören die Collage
    s.ev("__game.start('1-1', 'leicht')"); sim_wait(s, 1.0)
    stunts = s.ev("__game.stunts()")
    res = {}
    for i, d in enumerate(stunts):
        if ids and d['id'] not in ids: continue
        if not ids and not d.get('kf'): continue
        place(s)
        if grand:
            s.ev(f"""(() => {{ const pl = __app.player, def = __game.stuntDef('{d['id']}'); pl.tryShow(def, 1, {{ grand: true, amp: 1.2, durK: 1.25 }}); const S = pl.stunt; S.ev = {{}}; S.acc = 0; }})()""")
        else:
            s.ev(f"__game.stunt('{d['id']}')")
        name = d['id'] + ('_sieger' if grand else '') + ('_quer' if quer else '')
        k = 0; view = []
        t1 = time.time()
        while k < NF and time.time() - t1 < 40:
            p = s.ev("__app.player.stunt ? __app.player.stunt.p : 2")
            if p >= 0.06 + k * 0.86 / (NF - 1) or p > 1.5:
                s.ev("__game.freeze(true)")
                s.pg.screenshot(path=f'{OUT}/{name}_{k}.png')
                v = s.ev("(() => { const p = __app.player.pos.clone().project(__app.camera); return [p.x, p.y]; })()")
                if '--cam' in args: print(k, s.ev("""(() => { const pl = __app.player, S = pl.stunt, c = __app.camera.position; if (!S || !S.start) return null;
                  const y = S.yaw, f = [Math.sin(y), Math.cos(y)], r = [Math.cos(y), -Math.sin(y)];
                  const loc = (v) => { const dx = v.x - S.start.x, dz = v.z - S.start.z; return [+(dx * r[0] + dz * r[1]).toFixed(2), +(v.y - S.start.y).toFixed(2), +(dx * f[0] + dz * f[1]).toFixed(2)]; };
                  return { p: +S.p.toFixed(2), cam: loc(c), fig: loc(pl.pos), C: S.c ? loc(S.c) : null, D: S.cam ? +S.cam.r.toFixed(2) : null, lift: S.lift }; })()"""), flush=True)
                view.append([round(v[0], 2), round(v[1], 2)])
                s.ev("__game.freeze(false)"); k += 1
            time.sleep(0.005)
        while s.ev("!!__app.player.stunt") and time.time() - t1 < 40: time.sleep(0.03)
        grid(name, k)
        res[name] = {'view': view, 'in_view': all(abs(x) < 0.95 and abs(y) < 0.95 for x, y in view)}
        print(name, json.dumps(res[name]), flush=True)
        sim_wait(s, 0.4)
    print('errors', s.errors[:5])
    s.close()
