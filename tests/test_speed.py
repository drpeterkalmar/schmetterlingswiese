# Autopilot fliegt echt (über die Eingabe-Schicht) und misst die Level-Zeit (Spielzeit) je Schwierigkeit.
# Aufruf: BASE=http://localhost:8471/ python3 tests/test_speed.py <label> <diff> [level,level,...]
import time, json, sys, os
sys.path.insert(0, 'tests')
from util import *
LABEL = sys.argv[1] if len(sys.argv) > 1 else 'neu'
DIFF = sys.argv[2] if len(sys.argv) > 2 else 'leicht'
LEVELS = sys.argv[3].split(',') if len(sys.argv) > 3 else None
MAXSIM = 260
with sync_playwright() as pw:
    s = Session(pw, dpr=1)
    s.open()
    s.tap('#title'); s.pg.fill('input.name', 'Flieger'); s.tap('[data-a=create]')
    s.ev("__game.setQuality(0)")
    levels = LEVELS or s.ev("__game.levels()")
    res = []
    for lid in levels:
        s.ev(f"__game.start('{lid}', '{DIFF}')"); s.ev("__game.autopilot(true)")
        time.sleep(0.5)
        while json.loads(s.state())['game'] == 'countdown': time.sleep(0.2)
        while True:
            st = json.loads(s.state())
            if st['game'] in ('won', 'failed') or st['time'] > MAXSIM: break
            time.sleep(0.4)
        info = s.ev("({par: __app.game.par, limit: __app.game.limit, speed: __app.player.baseSpeed, bumps: __app.game.bumps})")
        r = dict(level=lid, diff=DIFF, result=st['game'], time=round(st['time'], 1), stars=st['stars'], **info,
                 tasks=[(t['type'], t['cur'], t['max']) for t in st['tasks']])
        res.append(r); print(json.dumps(r), flush=True)
        s.ev("__game.autopilot(false)")
    os.makedirs('tests/out', exist_ok=True)
    json.dump({'label': LABEL, 'diff': DIFF, 'results': res, 'errors': s.errors}, open(f'tests/out/speed_{LABEL}_{DIFF}_{levels[0]}.json', 'w'), indent=1)
    won = sum(r['result'] == 'won' for r in res)
    print(f'{LABEL} {DIFF}: {won}/{len(res)} gewonnen', 'errors', s.errors[:5])
    s.close()
