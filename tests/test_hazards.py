# Sichtprüfung Hindernisse auf Schwer: Wespen, Regenwolke, Windböe
import time, json, sys
sys.path.insert(0, 'tests')
from util import *
with sync_playwright() as pw:
    s = Session(pw, device=PIXEL7_LAND, dpr=1)
    s.open(); s.tap('#title'); s.pg.fill('input.name', 'H'); s.tap('[data-a=create]')
    s.ev("__game.setQuality(1)")
    s.ev("__game.start('3-1', 'schwer')"); time.sleep(1)
    # Wespe: vor den Spieler setzen
    s.ev("""(() => { const g = __app.game, p = __app.player; const w = g.wasps.list[0]; const f = p.forward();
       w.c.set(p.pos.x + f.x * 6, p.pos.y, p.pos.z + f.z * 6); w.r = 0.5; w.pos.set(p.pos.x + f.x * 6, p.pos.y, p.pos.z + f.z * 6); })()""")
    for k in range(4): time.sleep(0.5); s.shot(f'hz_wasp_{k}')
    print('bumps', s.ev("__app.game.bumps"), 'dizzy', s.ev("__app.player.dizzyT.toFixed(2)"))
    # Regenwolke direkt über den Spieler
    s.ev("""(() => { const g = __app.game, p = __app.player; const r = g.rains[0]; r.cx = p.pos.x + 4; r.cz = p.pos.z + 4; })()""")
    for k in range(3): time.sleep(0.6); s.shot(f'hz_rain_{k}')
    print('wet', s.ev("__app.player.wetT.toFixed(2)"))
    # Böe
    s.ev("__app.game.gustT = 0")
    for k in range(3): time.sleep(0.5); s.shot(f'hz_gust_{k}')
    print('gust', s.ev("!!__app.game.gust"), s.ev("__app.player.ext.length().toFixed(2)"))
    print('errors', s.errors[:5])
    s.close()
