# Deko-Rundgang (v2.8): Menü, Weltkarte, alle 5 Welten im Flug, Sieger-Einlage + Ergebnis – hoch und quer.
# Aufruf: python3 tests/deko_shots.py <label> [query]   → tests/shots/deko/<label>_<szene>_<hoch|quer>.png
#   z. B. python3 tests/deko_shots.py vorher            (Stand v2.7)
#         python3 tests/deko_shots.py nachher
#         python3 tests/deko_shots.py alt '?nosw&deko=0' (A/B: altes Aussehen)
# ONLY=wiese,abend schränkt die Welten ein, LAND=0 lässt das Querformat weg.
import time, sys, os, json
sys.path.insert(0, 'tests')
import util
from util import *
LABEL = sys.argv[1] if len(sys.argv) > 1 else 'nachher'
Q = sys.argv[2] if len(sys.argv) > 2 else '?nosw'
if len(sys.argv) > 3: util.BASE = f'http://localhost:{sys.argv[3]}/'  # z. B. 8472 = Referenz v2.7
OUT = 'tests/shots/deko'
os.makedirs(OUT, exist_ok=True)
WORLDS = [('1-1', 'wiese'), ('2-1', 'sonne'), ('3-1', 'teich'), ('4-1', 'kirsch'), ('5-1', 'abend')]
ONLY = os.environ.get('ONLY')
errors = []

def sim_wait(s, sec, timeout=30):
    t0 = s.ev("__app.t"); w0 = time.time()
    while s.ev("__app.t") - t0 < sec and time.time() - w0 < timeout: time.sleep(0.04)

def fly_view(s, lid, sec=2.6, sun=False):
    # deterministisch genug: Level starten, geradeaus fliegen, einfrieren (Kamera hinter der Figur)
    s.ev(f"__game.start('{lid}', 'leicht')")
    if sun:  # Gegenlicht: Blick Richtung Sonne (Lichtstrahlen, Durchleuchten)
        s.ev("(() => { const d = __app.world.def.sun; __app.player.yaw = d.az; })()")
    s.ev("__app.input.injected = {turn: 0, climb: 0}")
    sim_wait(s, sec)
    s.ev("__game.freeze(true)"); time.sleep(0.4)

def win(s, tag, orient):
    s.ev("__game.finale('looping')")
    s.ev("__game.start('1-1', 'leicht')"); sim_wait(s, 1.0)
    s.ev("__app.player.pos.y += 3")
    for i in range(30):
        if s.ev("__app.game.state") == 'won': break
        s.ev("__game.step()"); time.sleep(0.08)
    t1 = time.time()
    while s.ev("__app.game.state") != 'won' and time.time() - t1 < 15: time.sleep(0.05)
    sim_wait(s, 1.6)
    s.ev("__game.freeze(true)"); time.sleep(0.4)
    s.pg.screenshot(path=f'{OUT}/{tag}_sieg_{orient}.png')
    s.ev("__game.freeze(false)")
    t1 = time.time()
    while s.ev("__app.ui.current") != 'result' and time.time() - t1 < 25: time.sleep(0.2)
    time.sleep(1.6)
    s.pg.screenshot(path=f'{OUT}/{tag}_ergebnis_{orient}.png')

def run(pw, device, orient):
    s = Session(pw, device=device)
    s.open(Q)
    s.ev("__game.setQuality(1)")  # Handy-Standard (Mittel)
    time.sleep(2.5)
    s.pg.screenshot(path=f'{OUT}/{LABEL}_menue_{orient}.png')
    s.tap('#title'); s.pg.fill('input.name', 'Bild'); s.tap('[data-a=create]')
    s.ev("__game.setQuality(1)")
    time.sleep(1.5)
    s.pg.screenshot(path=f'{OUT}/{LABEL}_karte_{orient}.png')
    for lid, wid in WORLDS:
        if ONLY and wid not in ONLY.split(','): continue
        fly_view(s, lid)
        s.pg.screenshot(path=f'{OUT}/{LABEL}_{wid}_{orient}.png')
        s.ev("__game.freeze(false)")
    for lid, wid in [('4-1', 'kirsch'), ('1-1', 'wiese')]:
        if ONLY and wid not in ONLY.split(','): continue
        fly_view(s, lid, sun=True)
        s.pg.screenshot(path=f'{OUT}/{LABEL}_{wid}gegen_{orient}.png')
        s.ev("__game.freeze(false)")
    if not ONLY: win(s, LABEL, orient)
    errors.extend(s.errors[:5])
    s.close()

with sync_playwright() as pw:
    run(pw, PIXEL7, 'hoch')
    if os.environ.get('LAND', '1') != '0': run(pw, PIXEL7_LAND, 'quer')
print('errors', errors)
