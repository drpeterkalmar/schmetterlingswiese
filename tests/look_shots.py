# v3.2 Look-Posen (Vorbild crimson-loong): Start, Tiefflug Wiese, Sonnenblume, Abend, Hochformat.
# Aufruf: py tests/look_shots.py <label> [query]  → tests/shots/look/<label>_<pose>.png
import time, sys, os
sys.path.insert(0, 'tests')
from util import *
LABEL = sys.argv[1] if len(sys.argv) > 1 else 'nachher'
Q = sys.argv[2] if len(sys.argv) > 2 else '?nosw'
OUT = 'tests/shots/look'
os.makedirs(OUT, exist_ok=True)

def sim_wait(s, sec, timeout=30):
    t0 = s.ev("__app.t"); w0 = time.time()
    while s.ev("__app.t") - t0 < sec and time.time() - w0 < timeout: time.sleep(0.04)

def fly(s, lid, sec=2.6, sun=False, tief=False):
    s.ev(f"__game.start('{lid}', 'leicht')")
    if sun: s.ev("(() => { __app.player.yaw = __app.world.def.sun.az; })()")
    s.ev("__app.input.injected = {turn: 0, climb: %s}" % ('-1' if tief else '0'))
    sim_wait(s, sec)
    s.ev("__game.freeze(true)"); time.sleep(0.5)

def ui_aus(s): s.ev("(() => { const st = document.createElement('style'); st.id = 'uiaus'; st.textContent = 'body > *:not(canvas) { opacity: 0 !important; visibility: hidden !important } body > *:not(canvas) * { opacity: 0 !important }'; document.head.appendChild(st); })()"); time.sleep(0.2)

def run(pw, device, orient, posen):
    s = Session(pw, device=device)
    s.open(Q); s.ev("__game.setQuality(1)"); time.sleep(2.5)
    if 'start' in posen: s.pg.screenshot(path=f'{OUT}/{LABEL}_start_{orient}.jpg', quality=82)
    s.tap('#title'); s.pg.fill('input.name', 'Bild'); s.tap('[data-a=create]'); s.ev("__game.setQuality(1)"); time.sleep(1.0)
    for name, lid, kw in posen.get('flug', []):
        fly(s, lid, **kw); ui_aus(s)
        s.pg.screenshot(path=f'{OUT}/{LABEL}_{name}_{orient}.jpg', quality=82)
        s.ev("__game.freeze(false); document.getElementById('uiaus').remove()")
    print(orient, 'errors', s.errors[:5], flush=True)
    s.close()

with sync_playwright() as pw:
    run(pw, PIXEL7_LAND, 'quer', {'start': 1, 'flug': [('wiese', '1-1', {}), ('tiefflug', '1-1', dict(sec=3.2, tief=True)),
        ('sonnenblume', '2-1', {}), ('gegenlicht', '1-1', dict(sun=True)), ('abend', '5-1', {})]})
    if os.environ.get('HOCH', '1') != '0': run(pw, PIXEL7, 'hoch', {'flug': [('wiese', '1-1', {})]})
