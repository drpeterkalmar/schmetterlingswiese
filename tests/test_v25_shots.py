# v2.5 Bilder: jede Figur sitzend auf jeder Landeblume (4 Blickwinkel: Spielkamera, Seite flach, hinten oben, vorn nah),
# hoch und quer → Kontaktbögen tests/shots/v25/landen_<blume>_<hoch|quer>_<n>.jpg (+ Einzelbilder der Spielkamera).
# Aufruf: python3 tests/test_v25_shots.py [hoch|quer] [sun|lily|big ...]
import time, json, sys, os, math
sys.path.insert(0, 'tests')
from util import *
from PIL import Image
OUT = 'tests/shots/v25'
os.makedirs(OUT, exist_ok=True)
ORI = [a for a in sys.argv[1:] if a in ('hoch', 'quer')] or ['hoch', 'quer']
KINDS = [a for a in sys.argv[1:] if a in ('sun', 'lily', 'big')] or ['sun', 'lily', 'big']
LEVEL = {'sun': '2-1', 'lily': '3-1', 'big': '5-2'}
FIGS = [('schmetterling', 'm', 'kranz', 'none'), ('marienkaefer', 'm', 'party', 'brille'), ('biene', 'm', 'none', 'none'),
        ('libelle', 'm', 'schleife', 'none'), ('hummel', 'm', 'stroh', 'bart'), ('mondfalter', 'm', 'krone', 'none'),
        ('drache', 'm', 'zauber', 'umhang'), ('einhorn', 'm', 'heiligenschein', 'none'), ('katze', 'm', 'pizza', 'brille'),
        ('schmetterling', 'xl', 'helm', 'umhang'), ('biene', 'xs', 'propeller', 'none')]
VIEWS = ['spiel', 'seite', 'oben', 'vorn']

def sim_wait(s, sec):
    t0 = s.ev("__app.t")
    while s.ev("__app.t") - t0 < sec: time.sleep(0.02)

def sit(s, k, fig, size, hat, extra):
    s.ev(f"__app.player.setCharacter('{fig}', {json.dumps({'size': size, 'hat': hat, 'extra': extra})})")
    s.ev("""(() => { const t = __app.game.tasks.find(t => t.cfg.type === 'land'); t.spots.forEach(q => { q.done = false; }); t.cur = 0; t.sip = null; t.autoOff = 0; })()""")
    s.ev(f"""(() => {{ const t = __app.game.tasks.find(t => t.cfg.type === 'land'), sp = t.spots[{k} % t.spots.length], p = __app.player;
      if (p.landed) p.takeoff(); const a = (sp.seat.rot || 0) + 0.5; p.stunt = null;
      p.pos.set(sp.pos.x - Math.sin(a) * 1.0, sp.pos.y + 1.2, sp.pos.z - Math.cos(a) * 1.0); p.yaw = a; p.yawRate = 0; p.pitch = 0; p.camInit = false;
      __app.input.injected = {{turn: 0, climb: -1}}; }})()""")
    t0 = time.time()
    while not s.ev("__app.player.landed") and time.time() - t0 < 8: time.sleep(0.03)
    s.ev("__app.input.injected = {turn: 0, climb: 0}")
    # länger sitzen lassen (Nektar-Zeit zurückdrehen), bis die Kamera ausgeschwenkt hat
    s.ev("(() => { const t = __app.game.tasks.find(t => t.cfg.type === 'land'); if (t.sip) t.sip.t = -2.6; })()")
    sim_wait(s, 2.6)

def views(s, base):
    s.ev("__game.freeze(true)"); time.sleep(0.25)
    files = []
    for v in VIEWS:
        if v != 'spiel':
            s.ev(f"""(() => {{ const p = __app.player, c = __app.camera, k = Math.max(1, p.critter.size || 1), fx = Math.sin(p.yaw), fz = Math.cos(p.yaw), rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw);
              window.__camSave = window.__camSave || [c.position.clone(), c.quaternion.clone(), c.fov];
              const P = p.pos, T = P.clone(); T.y += 0.1 * k;
              if ('{v}' === 'seite') c.position.set(P.x + rx * 3.0 * k, P.y + 0.15 * k, P.z + rz * 3.0 * k);
              if ('{v}' === 'oben') c.position.set(P.x - fx * 2.0 * k - rx * 0.7 * k, P.y + 2.4 * k, P.z - fz * 2.0 * k - rz * 0.7 * k);
              if ('{v}' === 'vorn') {{ c.position.set(P.x + fx * 2.5 * k + rx * 1.0 * k, P.y + 0.5 * k, P.z + fz * 2.5 * k + rz * 1.0 * k); }}
              c.fov = 2 * Math.atan(Math.tan(0.46) / Math.min(1, c.aspect)) * 180 / Math.PI; c.updateProjectionMatrix(); c.lookAt(T); c.updateMatrixWorld(); }})()""")
            time.sleep(0.35)
        f = f'{base}_{v}.png'
        s.pg.screenshot(path=f)
        files.append((f, s.ev("(() => { const v = __app.player.pos.clone().project(__app.camera); return [v.x, v.y]; })()")))
    s.ev("""(() => { const c = __app.camera, S = window.__camSave; if (S) { c.position.copy(S[0]); c.quaternion.copy(S[1]); c.fov = S[2]; c.updateProjectionMatrix(); } window.__camSave = null; })()""")
    s.ev("__game.freeze(false)")
    s.ev("(() => { const t = __app.game.tasks.find(t => t.cfg.type === 'land'); if (t.sip) t.sip.t = 0.99; })()")
    t0 = time.time()
    while s.ev("__app.player.landed") and time.time() - t0 < 6: time.sleep(0.03)
    return files

def tile(f, xy, T=230):
    im = Image.open(f).convert('RGB'); w, h = im.size
    side = int(min(w, h) * (0.62 if 'spiel' in f else 1.0))
    cx = (xy[0] + 1) / 2 * w if 'spiel' in f else w / 2; cy = (1 - xy[1]) / 2 * h if 'spiel' in f else h / 2
    x0 = int(max(0, min(w - side, cx - side / 2))); y0 = int(max(0, min(h - side, cy - side * 0.55)))
    return im.crop((x0, y0, x0 + side, y0 + side)).resize((T, T))

def sheet(rows, name, T=230):
    out = Image.new('RGB', (T * 4, T * len(rows)), (255, 255, 255))
    for r, files in enumerate(rows):
        for c, (f, xy) in enumerate(files): out.paste(tile(f, xy, T), (c * T, r * T))
    out.save(name, quality=85)

res = {}
with sync_playwright() as pw:
    for ori in ORI:
        s = Session(pw, device=PIXEL7 if ori == 'hoch' else PIXEL7_LAND, dpr=1.5)
        s.open(); s.tap('#title'); s.pg.fill('input.name', 'Bilder'); s.tap('[data-a=create]')
        s.ev("__game.setQuality(1)")
        for kind in KINDS:
            s.ev(f"__game.start('{LEVEL[kind]}', 'leicht')"); sim_wait(s, 1.2)
            s.ev("document.getElementById('hud').style.visibility = 'hidden'")
            rows = []
            for i, (fig, size, hat, extra) in enumerate(FIGS):
                sit(s, i, fig, size, hat, extra)
                rows.append(views(s, f'{OUT}/raw_{kind}_{ori}_{fig}_{size}'))
            for n, part in enumerate([rows[:6], rows[6:]]):
                sheet(part, f'{OUT}/landen_{kind}_{ori}_{n + 1}.jpg')
            # Spielkamera-Einzelbild der ersten Figur behalten (volle Größe)
            Image.open(rows[0][0][0]).convert('RGB').save(f'{OUT}/landen_{kind}_{ori}_spiel.jpg', quality=88)
            s.ev("document.getElementById('hud').style.visibility = ''")
            print(ori, kind, 'ok', flush=True)
        res[ori] = s.errors[:5]
        s.close()
for f in os.listdir(OUT):
    if f.startswith('raw_'): os.remove(os.path.join(OUT, f))
print('errors', res)
