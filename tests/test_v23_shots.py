# v2.3 Vorher/Nachher: 5 Welten (Spielansicht, Nahbereich, Weitblick) hoch + Teich quer, dazu renderer.info
# je Welt und Qualitätsstufe (Draw-Calls/Dreiecke in fester Ansicht).
# Aufruf: python3 tests/test_v23_shots.py <label>   → tests/shots/v23/<label>_*.png + tests/out/v23_info_<label>.json
import time, sys, os, json
sys.path.insert(0, 'tests')
from util import *
LABEL = sys.argv[1] if len(sys.argv) > 1 else 'nachher'
OUT = 'tests/shots/v23'
os.makedirs(OUT, exist_ok=True); os.makedirs('tests/out', exist_ok=True)
WORLDS = [('1-1', 'wiese'), ('2-1', 'sonne'), ('3-1', 'teich'), ('4-1', 'kirsch'), ('5-1', 'abend')]
res = {'info': {}, 'errors': []}

def sim_wait(s, sec):
    t0 = s.ev("__app.t")
    while s.ev("__app.t") - t0 < sec: time.sleep(0.05)

def fly_view(s, lid, sec=2.0):
    # deterministisch: Level starten, geradeaus fliegen, dann einfrieren (Kamera hinter der Figur)
    s.ev(f"__game.start('{lid}', 'leicht')")
    s.ev("__app.input.injected = {turn: 0, climb: 0}")
    sim_wait(s, sec)
    s.ev("__game.freeze(true)"); time.sleep(0.5)

def cam(s, rel_pos, rel_look, fov=58):
    # Kamera relativ zur Spielerposition/-richtung (vorwärts = +f)
    s.ev(f"""(() => {{ const p = __app.player.pos, y = __app.player.yaw, c = __app.camera, H = __app.world.constructor;
      const fx = Math.sin(y), fz = Math.cos(y), rx = Math.cos(y), rz = -Math.sin(y);
      const P = {rel_pos}, L = {rel_look};
      const ph = (a) => [p.x + rx * a[0] + fx * a[2], a[1], p.z + rz * a[0] + fz * a[2]];
      const pp = ph(P), ll = ph(L);
      const gh = (x, z) => __app.heightAt(x, z);
      c.position.set(pp[0], gh(pp[0], pp[2]) + pp[1], pp[2]); c.lookAt(ll[0], gh(ll[0], ll[2]) + ll[1], ll[2]);
      c.fov = {fov}; c.updateProjectionMatrix(); __app.world.update(0.016, c, c.position); }})()""")
    time.sleep(0.6)

def info(s):
    return json.loads(s.ev("JSON.stringify(__game.info())"))

with sync_playwright() as pw:
    s = Session(pw)
    s.open(); s.tap('#title'); s.pg.fill('input.name', 'Bild'); s.tap('[data-a=create]')
    # Höhenfunktion aus dem (gleichen, gecachten) Modul – läuft auch gegen alte Stände
    s.ev("import('./js/world/terrain.js').then(m => { __app.heightAt = m.height; })"); time.sleep(0.5)
    # Draw-Calls/Dreiecke in fester Ansicht je Stufe
    for q in [0, 1, 2]:
        s.ev(f"__game.setQuality({q})")
        for lid, wid in WORLDS:
            fly_view(s, lid)
            res['info'][f'q{q}_{lid}'] = info(s)
            s.ev("__game.freeze(false)")
        print('q', q, {k: (v['calls'], v['tris']) for k, v in res['info'].items() if k.startswith(f'q{q}_')}, flush=True)
    # Bilder (Stufe Mittel = Handy-Standard)
    s.ev("__game.setQuality(1)")
    for lid, wid in WORLDS:
        fly_view(s, lid, 2.5)
        s.pg.screenshot(path=f'{OUT}/{LABEL}_{wid}_spiel.png')
        cam(s, "[0.6, 1.1, -1.5]", "[0, 0.1, 7]", 62)
        s.pg.screenshot(path=f'{OUT}/{LABEL}_{wid}_nah.png')
        cam(s, "[0, 9, -6]", "[0, 2, 40]", 60)
        s.pg.screenshot(path=f'{OUT}/{LABEL}_{wid}_weit.png')
        s.ev("__game.freeze(false)")
    res['errors'] += s.errors[:5]
    s.close()
    s = Session(pw, device=PIXEL7_LAND)
    s.open(); s.tap('#title'); s.pg.fill('input.name', 'Bild'); s.tap('[data-a=create]')
    s.ev("__game.setQuality(1)")
    for lid, wid in [('3-1', 'teich'), ('1-1', 'wiese')]:
        fly_view(s, lid, 2.5)
        s.pg.screenshot(path=f'{OUT}/{LABEL}_{wid}_quer.png')
        s.ev("__game.freeze(false)")
    res['errors'] += s.errors[:5]
    s.close()
json.dump(res, open(f'tests/out/v23_info_{LABEL}.json', 'w'), indent=1)
print('errors', res['errors'])
