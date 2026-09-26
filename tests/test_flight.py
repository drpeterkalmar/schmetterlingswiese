# Echtes Fliegen per Autopilot (über die Eingabe-Schicht): Erreichbarkeit + Szenen-Screenshots je Welt
import time, json, sys
sys.path.insert(0, 'tests')
from util import *
LEVELS = sys.argv[1].split(',') if len(sys.argv) > 1 else ['1-1', '2-1', '3-1', '4-1', '5-1']
SIM = float(sys.argv[2]) if len(sys.argv) > 2 else 60
dev = PIXEL7_LAND if (len(sys.argv) > 3 and sys.argv[3] == 'land') else PIXEL7
with sync_playwright() as pw:
    s = Session(pw, device=dev, dpr=1)
    s.open()
    s.tap('#title'); s.pg.fill('input.name', 'Flieger'); s.tap('[data-a=create]')
    s.ev("__game.setQuality(1)")
    for lid in LEVELS:
        s.ev(f"__game.start('{lid}', 'leicht')"); s.ev("__game.autopilot(true)")
        t0 = s.ev("__app.t"); shots = 0; nxt = 3
        while True:
            st = json.loads(s.state())
            simt = s.ev("__app.t") - t0
            if simt > nxt and shots < 4:
                s.shot(f'fl_{lid}_{"L" if dev is PIXEL7_LAND else "P"}_{shots}'); shots += 1; nxt += SIM / 4
            if st['game'] in ('won', 'failed') or simt > SIM: break
            time.sleep(0.3)
        done = [(t['type'], t['cur'], t['max']) for t in st['tasks']]
        print(lid, st['game'], f'sim {simt:.0f}s', done, 'fps', s.ev("__app.fps"), flush=True)
        if st['game'] == 'won':
            time.sleep(1.5); s.shot(f'fl_{lid}_won')
    print('errors', s.errors[:10])
    s.close()
