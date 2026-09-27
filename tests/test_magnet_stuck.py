# Regression: Tropfen darf nicht unter dem Spieler "kleben" (Magnet nur waagrecht → lief mit, Zielpfeil aus)
import time, json, sys
sys.path.insert(0, 'tests')
from util import *
res = {}
with sync_playwright() as pw:
    s = Session(pw, dpr=1)
    s.open(); s.tap('#title'); s.pg.fill('input.name', 'M'); s.tap('[data-a=create]')
    s.ev("__game.setQuality(0)"); s.ev("__game.start('1-1', 'leicht')"); time.sleep(1.5)
    for dy in (3.4, 4.4, 5.2):
        s.ev(f"""(() => {{ const t = __app.game.tasks[0]; const it = t.items.find(i => !i.taken);
          const p = __app.player; p.pos.set(it.pos.x, it.pos.y + {dy}, it.pos.z); window.__it = it; }})()""")
        s.ev("__app.input.injected = {turn: 0, climb: 0}")
        c0 = s.ev("__app.game.tasks[0].cur")
        time.sleep(4)
        r = s.ev("""(() => { const it = window.__it, p = __app.player.pos;
          return {taken: it.taken, dxz: Math.hypot(it.pos.x - p.x, it.pos.z - p.z), dy: p.y - it.pos.y, cur: __app.game.tasks[0].cur}; })()""")
        r['collected'] = r['cur'] > c0
        res[f'dy_{dy}'] = r
        s.ev("__app.input.injected = null")
    s.shot('magnet_stuck')
    res['errors'] = s.errors[:5]
    s.close()
# ok: Tropfen entweder eingesammelt oder NICHT mitgeschleppt (waagrechter Abstand wächst mit dem Flug)
res['ok'] = all(v['taken'] or v['dxz'] > 6 for k, v in res.items() if k.startswith('dy_')) and not res['errors']
print(json.dumps(res, indent=1))
