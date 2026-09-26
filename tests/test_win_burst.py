import time, json, sys
sys.path.insert(0, 'tests')
from util import *
with sync_playwright() as pw:
    s = Session(pw, dpr=1)
    s.open(); s.tap('#title'); s.pg.fill('input.name', 'W'); s.tap('[data-a=create]')
    s.ev("__game.setQuality(1)")
    s.ev("__app.progress.cur.look.char = 'biene'; __app.progress.cur.look.hat = 'krone'; __app.setLookFromProfile()")
    s.ev("__game.start('1-1', 'leicht')"); time.sleep(1)
    s.ev("__app.player.pos.y += 3")
    for i in range(20):
        if json.loads(s.state())['game'] == 'won': break
        s.ev("__game.step()"); time.sleep(0.15)
    t0 = s.ev("__app.t"); k = 0
    while k < 6:
        if s.ev("__app.t") - t0 >= k * 0.35:
            s.ev("__game.freeze(true)"); s.shot(f'win_{k}'); s.ev("__game.freeze(false)"); k += 1
        time.sleep(0.02)
    print(s.errors[:5])
    s.close()
