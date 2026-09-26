# Burst-Screenshots: Looping + Schraube (6 Bilder, ~160 ms Simzeit-Abstand) + Messung der Modell-Orientierung
import time, json, sys
sys.path.insert(0, 'tests')
from util import *
with sync_playwright() as pw:
    s = Session(pw, dpr=1)
    s.open()
    s.tap('#title'); s.pg.fill('input.name', 'S'); s.tap('[data-a=create]')
    s.ev("__game.setQuality(1)")
    for kind in ['schmetterling', 'marienkaefer', 'biene']:
        s.ev(f"__app.progress.cur.look.char = '{kind}'; __app.setLookFromProfile()")
        s.ev("__game.start('4-2', 'leicht')")
        time.sleep(1)
        s.ev("__app.player.pos.y += 5")
        for typ in ['loop', 'roll']:
            s.ev(f"__app.input.actions.push('{typ}')")
            t0 = s.ev("__app.t"); k = 0
            while k < 6:
                if s.ev("__app.t") - t0 >= k * (0.2 if typ == 'loop' else 0.16):
                    s.ev("__game.freeze(true)"); s.shot(f'burst_{kind}_{typ}_{k}'); s.ev("__game.freeze(false)"); k += 1
                time.sleep(0.02)
            time.sleep(1.5)
            # nach dem Stunt: Winkel wieder genullt?
            print(kind, typ, s.ev("JSON.stringify({rx: __app.player.critter.tilt.rotation.x.toFixed(3), rz: __app.player.critter.tilt.rotation.z.toFixed(3), stunt: !!__app.player.stunt, loops: __app.player.stats.loops, rolls: __app.player.stats.rolls})"))
    # Flugrichtung: Blickvektor des Modells · Flugrichtung
    print('dot', s.ev("""(() => { const c = __app.player.critter; const v = new c.root.position.constructor(0, 0, 1).applyQuaternion(c.root.quaternion); const f = __app.player.forward(); return (v.x * f.x + v.z * f.z) / Math.hypot(f.x, f.z); })()"""))
    print('errors', s.errors[:5])
    s.close()
