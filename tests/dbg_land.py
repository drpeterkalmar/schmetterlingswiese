import time, json, sys
sys.path.insert(0, 'tests')
from util import *
with sync_playwright() as pw:
    s = Session(pw, dpr=1)
    s.open()
    s.tap('#title'); s.pg.fill('input.name', 'L'); s.tap('[data-a=create]')
    s.ev("__game.setQuality(0)")
    s.ev("__game.start('3-1', 'leicht')"); s.ev("__game.autopilot(true)")
    for i in range(40):
        print(s.ev("""(() => { const a = __app, p = a.player, tg = a.game.guideTarget(); const inj = a.input.injected || {};
          return JSON.stringify({t: a.t.toFixed(1), p: [p.pos.x.toFixed(1), p.pos.y.toFixed(1), p.pos.z.toFixed(1)], tg: tg && [tg.x.toFixed(1), tg.y.toFixed(1), tg.z.toFixed(1)],
          dh: tg && Math.hypot(tg.x - p.pos.x, tg.z - p.pos.z).toFixed(1), landing: !!p.landing, landed: p.landed, inj: [inj.turn && inj.turn.toFixed(2), inj.climb && inj.climb.toFixed(2)], climb: a.input.climb.toFixed(2), nL: p.landables.length, sp: p.speed.toFixed(1) }); })()"""))
        time.sleep(0.5)
    s.close()
