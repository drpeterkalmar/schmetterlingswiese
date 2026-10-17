# v3.1 Flugschule: Bildfolgen der neuen Mechaniken (hoch + quer) für die Bildprüfung → tests/shots/v31/<szene>_<format>.jpg
# Die Simulation läuft in festen 1/60-s-Schritten (Hauptschleife eingefroren, zeichnet nur), Bild nach jedem Abschnitt.
# Aufruf: python3 tests/v31_shots.py [szene,szene] [--nur hoch|quer] [--q "&kurve=0"]
#   Szenen: kurve, sturz, flatter, ringschub, kette, saugen, aufwind, schweif, landen, rolle
import time, json, sys, os
sys.path.insert(0, 'tests')
from util import *
OUT = 'tests/shots/v31'
os.makedirs(OUT, exist_ok=True)
args = sys.argv[1:]
nur = args[args.index('--nur') + 1] if '--nur' in args else None
zusatz = args[args.index('--q') + 1] if '--q' in args else ''
tag = args[args.index('--tag') + 1] if '--tag' in args else ''
namen = [a for a in args if not a.startswith('--') and a not in (nur, zusatz, tag)]
namen = namen[0].split(',') if namen else None

STEP = """(([n, turn, climb, acts]) => { const a = __app, dt = 1 / 60;
  window.__freeze = 1; a.autopilot = false;
  for (let i = 0; i < n; i++) {
    a.input.injected = { turn, climb };
    if (i === 0) for (const x of acts || []) a.input.actions.push(x);
    a.t += dt; a.input.update(dt); a.realDt = dt; a.game.update(dt * a.timeScale, a.t, a.input);
    a.trailUpdate(dt); a.bursts.update(dt); a.focus.copy(a.player.pos); a.world.update(dt, a.camera, a.focus);
  }
  const p = a.player; return { y: +p.pos.y.toFixed(2), v: +p.speed.toFixed(2), fov: +a.camera.fov.toFixed(1), roll: +(p.critter ? p.critter.tilt.rotation.z : 0).toFixed(2) };
})"""

# Autopilot in Echtzeit (die Hauptschleife rechnet und zeichnet wie im Spiel), danach wieder eingefroren
def auto_bis(s, cond, sek=60):
    s.ev("(() => { __app.autopilot = true; window.__freeze = undefined; })()")
    try: s.pg.wait_for_function(cond, timeout=sek * 1000, polling=16)
    finally: s.ev("(() => { window.__freeze = 1; __app.autopilot = false; })()")
def auto(s, sek):
    t0 = s.ev("__app.t")
    if sek > 0: auto_bis(s, f"__app.t - {t0} >= {sek}", sek * 20 + 10)

def step(s, sek, turn=0, climb=0, acts=None):
    return s.ev(STEP, [int(round(sek * 60)), turn, climb, acts or []])

def bild(s, name):
    time.sleep(0.25)
    s.pg.screenshot(path=f'{OUT}/_{name}.png')
    return f'{OUT}/_{name}.png'

def start(s, lid, diff, alt=6.0):
    s.ev(f"__game.start('{lid}', '{diff}')")
    s.pg.wait_for_function("__app.game.state === 'play' || __app.game.state === 'countdown'", timeout=30000)
    s.ev(f"""(() => {{ const g = __app.game, p = __app.player; g.state = 'play'; p.frozen = false; p.stunt = null; p.landed = false;
      p.pos.copy(g.spawn); p.pos.y = __H(p.pos.x, p.pos.z) + {alt}; p.yaw = g.spawnYaw; p.yawRate = 0; p.pitch = 0;
      p.camInit = false; }})()""")
    step(s, 0.6)

def collage(name, bilder, texte):
    from PIL import Image, ImageDraw
    ims = [Image.open(b) for b in bilder]
    w, h = ims[0].size; sc = 0.5 if h > w else 0.42
    cols = min(4, len(ims)); rows = (len(ims) + cols - 1) // cols
    W, H = int(w * sc), int(h * sc)
    out = Image.new('RGB', (cols * W, rows * (H + 22)), (255, 255, 255)); d = ImageDraw.Draw(out)
    from PIL import ImageFont
    try: font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 14)
    except Exception: font = None
    for k, im in enumerate(ims):
        x, y = (k % cols) * W, (k // cols) * (H + 22)
        out.paste(im.convert('RGB').resize((W, H)), (x, y + 22)); d.text((x + 6, y + 4), texte[k], fill=(20, 20, 20), font=font)
    out.save(f'{OUT}/{name}.jpg', quality=82)
    for b in bilder: os.remove(b)
    print('Collage', f'{OUT}/{name}.jpg')

# ------------------------------------------------------------------ Szenen (je: Liste (Bild, Beschriftung))
def sz_kurve(s, f):
    start(s, '1-3', 'mittel', 6); out = []
    for k, (sek, txt) in enumerate([(0.4, 'geradeaus'), (0.5, '0,5 s drehen'), (0.5, '1,0 s (Eng-Kurve kommt)'), (0.6, '1,6 s Eng-Kurve')]):
        r = step(s, sek, 0 if k == 0 else 1, 0); out.append((bild(s, f'kurve{k}'), f'{txt} · Lage {abs(r["roll"]) * 57.3:.0f}°'))
    return out
def sz_sturz(s, f):
    start(s, '1-3', 'mittel', 26); out = []
    r = step(s, 0.5); out.append((bild(s, 'st0'), f'Reiseflug {r["v"]} m/s'))
    for k in range(3):
        r = step(s, 1.0, 0, -1); out.append((bild(s, f'st{k+1}'), f'Sturz {k+1} s: {r["v"]} m/s, FOV {r["fov"]}'))
    return out
def sz_flatter(s, f):
    start(s, '1-1', 'leicht', 4); out = []
    r = step(s, 0.3); out.append((bild(s, 'fl0'), f'vorher Höhe {r["y"]}'))
    for k in range(3):
        step(s, 0.1, 0, 1); r = step(s, 0.02, 0, 0, ['flap']); r = step(s, 0.18)
        out.append((bild(s, f'fl{k+1}'), f'Tipp {k+1}: Höhe {r["y"]}'))
    r = step(s, 0.6); out.append((bild(s, 'fl4'), f'danach: Höhe {r["y"]}'))
    return out

def sz_ringschub(s, f):
    start(s, '1-3', 'mittel', 5); out = []
    auto_bis(s, "__app.game.tasks[0].cur >= 1", 40)
    for k, (sek, txt) in enumerate([(0.0, 'Ring durchflogen'), (0.25, '+0,25 s'), (0.6, '+0,85 s'), (1.05, '+1,9 s')]):
        auto(s, sek); w = s.ev("({ w: __app.player.wind.wert, f: __app.camera.fov })")
        out.append((bild(s, f'rs{k}'), f'{txt}: Rückenwind +{w["w"] * 100:.0f} %, FOV {w["f"]:.1f}°'))
    return out
def sz_kette(s, f):
    start(s, '2-2', 'leicht', 4); out = []
    auto_bis(s, "__app.game.tasks[0].cur >= 5", 60)
    for k, sek in enumerate([0.05, 0.4, 1.2, 2.4]):
        auto(s, sek); w = s.ev("__app.player.wind.wert")
        out.append((bild(s, f'ke{k}'), f'Kette voll +{sum([0.05, 0.4, 1.2, 2.4][:k + 1]):.1f} s: +{w * 100:.0f} %'))
    return out
def sz_saugen(s, f):
    start(s, '1-1', 'leicht', 4); out = []
    auto_bis(s, "__app.game.tasks[0].items.some(i => i.suck != null)", 40)
    for k in range(4):
        r = s.ev("(() => { const it = __app.game.tasks[0].items.find(i => i.suck != null) || __app.game.tasks[0].items.filter(i => i.taken).at(-1); return { t: it.suck, s: it.s, d: it.pos.distanceTo(__app.player.pos) }; })()")
        out.append((bild(s, f'sa{k}'), (f'Einsaugen {r["t"]:.2f} s' if r['t'] is not None else 'gezählt') + f' · Größe {r["s"]:.2f} · {r["d"]:.2f} m'))
        step(s, 0.05)
    return out

def lauf(s, sek, turn=0, climb=0):
    # Echtzeit mit fester Eingabe
    s.ev(f"(() => {{ __app.input.injected = {{ turn: {turn}, climb: {climb} }}; window.__freeze = undefined; }})()")
    t0 = s.ev("__app.t")
    try: s.pg.wait_for_function(f"__app.t - {t0} >= {sek}", timeout=sek * 20000 + 10000, polling=16)
    finally: s.ev("window.__freeze = 1")
def sz_aufwind(s, f):
    start(s, '1-3', 'mittel', 3); out = []
    n = s.ev("""(() => { const p = __app.player, A = p.aufwinde[0]; if (!A) return 0;
      const a = Math.atan2(p.pos.x - A.x, p.pos.z - A.z) || 0.5; p.pos.set(A.x + Math.sin(a) * 30, A.gy + 3.5, A.z + Math.cos(a) * 30);
      p.yaw = Math.atan2(A.x - p.pos.x, A.z - p.pos.z); p.yawRate = 0; p.camInit = false; return p.aufwinde.length; })()""")
    lauf(s, 0.3)
    out.append((bild(s, 'aw0'), f'{n} Säulen · Säule 28 m voraus'))
    lauf(s, 2.6)
    out.append((bild(s, 'awa'), 'Säule 9 m voraus'))
    y0 = s.ev("__app.player.pos.y")
    for k, sek in enumerate([1.5, 2.0, 2.5]):
        lauf(s, sek); y = s.ev("__app.player.pos.y")
        out.append((bild(s, f'aw{k+1}'), f'ohne Eingabe +{sum([1.5, 2.0, 2.5][:k + 1]):.1f} s: {y - y0:+.1f} m'))
    return out

SZENEN = {'kurve': sz_kurve, 'sturz': sz_sturz, 'flatter': sz_flatter}
for extra in ['ringschub', 'kette', 'saugen', 'aufwind', 'schweif', 'landen', 'rolle']:
    fn = globals().get('sz_' + extra)
    if fn: SZENEN[extra] = fn

if __name__ == '__main__':
    with sync_playwright() as pw:
        for fmt, dev in [('hoch', PIXEL7), ('quer', PIXEL7_LAND)]:
            if nur and fmt != nur: continue
            s = Session(pw, device=dev, dpr=1.5)
            s.open('?nosw' + zusatz)
            s.tap('#title'); s.pg.fill('input.name', 'Bildprobe'); s.tap('[data-a=create]')
            s.ev("window.__H = (x, z) => __app.world.heightAt ? __app.world.heightAt(x, z) : 0")
            s.ev("(async () => { const T = await import('./js/world/terrain.js'); window.__H = T.height; })()")
            s.ev("__game.setQuality(1)")  # feste Stufe Mittel (lange Rechenblöcke würden die Grafik-Automatik sonst herunterregeln)
            for n in (namen or SZENEN.keys()):
                if n not in SZENEN: continue
                r = SZENEN[n](s, fmt)
                collage(f'{n}{tag}_{fmt}', [b for b, _ in r], [t for _, t in r])
            s.ev("window.__freeze = undefined")
            print('errors', s.errors[:5])
            s.close()
