# Deko-Detailansichten (v2.8): Nachthimmel zum Mond, Milchstraße, Teich im Gegenlicht – je Label (A/B mit ?deko=0)
# Aufruf: python3 tests/deko_detail.py <label> [query]  → tests/shots/deko/<label>_detail_<name>.png
import time, sys, os
sys.path.insert(0, 'tests')
from util import *
LABEL = sys.argv[1] if len(sys.argv) > 1 else 'nachher'
Q = sys.argv[2] if len(sys.argv) > 2 else '?nosw'
OUT = 'tests/shots/deko'; os.makedirs(OUT, exist_ok=True)

def sim_wait(s, sec, timeout=30):
    t0 = s.ev("__app.t"); w0 = time.time()
    while s.ev("__app.t") - t0 < sec and time.time() - w0 < timeout: time.sleep(0.04)

def look(s, lid, yaw_js, pitch, name, dist=0):
    s.ev(f"__game.start('{lid}', 'leicht')"); sim_wait(s, 1.0)
    s.ev("__game.freeze(true)"); time.sleep(0.2)
    s.ev(f"""(() => {{ const c = __app.camera, p = __app.player.pos, yaw = {yaw_js};
      c.position.set(p.x - Math.sin(yaw) * {dist}, p.y + 1.5, p.z - Math.cos(yaw) * {dist});
      c.lookAt(c.position.x + Math.sin(yaw) * Math.cos({pitch}), c.position.y + Math.sin({pitch}), c.position.z + Math.cos(yaw) * Math.cos({pitch}));
      c.fov = 62; c.updateProjectionMatrix(); __app.world.update(0.016, c, p); }})()""")
    s.ev("__game.freeze(false)"); sim_wait(s, 0.05); s.ev("__game.freeze(true)")
    s.ev(f"""(() => {{ const c = __app.camera, p = __app.player.pos, yaw = {yaw_js};
      c.position.set(p.x - Math.sin(yaw) * {dist}, p.y + 1.5, p.z - Math.cos(yaw) * {dist});
      c.lookAt(c.position.x + Math.sin(yaw) * Math.cos({pitch}), c.position.y + Math.sin({pitch}), c.position.z + Math.cos(yaw) * Math.cos({pitch})); }})()""")
    time.sleep(0.5)
    s.pg.screenshot(path=f'{OUT}/{LABEL}_detail_{name}.png')
    s.ev("__game.freeze(false)")

with sync_playwright() as pw:
    s = Session(pw)
    s.open(Q); s.tap('#title'); s.pg.fill('input.name', 'Bild'); s.tap('[data-a=create]')
    s.ev("__game.setQuality(1)"); time.sleep(1)
    look(s, '5-1', "__app.world.def.sun.az", 0.45, 'mond')
    look(s, '5-1', "Math.atan2(-0.66, 0.42) + 1.57", 0.75, 'milchstrasse')
    look(s, '5-1', "Math.atan2(-0.66, 0.42) - 1.57", 0.55, 'milchstrasse2')
    look(s, '3-1', "Math.atan2(-__app.player.pos.x, -__app.player.pos.z)", -0.25, 'teich')
    look(s, '3-1', "__app.world.def.sun.az", -0.2, 'teichsonne')
    # Nektar naschen: Landeaufgabe per Debug-Schritt anfliegen lassen, im Sitzen fotografieren
    for lid in ['3-1', '2-1']:
        s.ev(f"__game.start('{lid}', 'leicht')"); sim_wait(s, 0.5)
        if 'land' not in s.ev("__app.game.tasks.map(t => t.cfg.type).join()"): continue
        s.ev("__app.game.tasks.forEach(t => { if (t.cfg.type !== 'land') t.done = false; })")
        s.ev("(() => { const t = __app.game.tasks.find(t => t.cfg.type === 'land'); const sp = t.spots.find(x => !x.done); const p = __app.player; p.pos.set(sp.pos.x, sp.pos.y + 1.2, sp.pos.z); })()")
        s.ev("__app.input.injected = {turn: 0, climb: -1}")
        t0 = time.time()
        while not s.ev("__app.player.landed") and time.time() - t0 < 12: time.sleep(0.05)
        s.ev("__app.input.injected = {turn: 0, climb: 0}")
        sim_wait(s, 0.55); s.ev("__game.freeze(true)"); time.sleep(0.4)
        s.pg.screenshot(path=f'{OUT}/{LABEL}_detail_nektar.png'); s.ev("__game.freeze(false)")
        break
    print('errors', s.errors[:5]); s.close()
