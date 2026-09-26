# Heldenbilder mit handy-realistischen Einstellungen (Pixel 7, DPR 2.625, Qualität Auto)
import time, json, sys
sys.path.insert(0, 'tests')
from util import *
dev = PIXEL7_LAND if len(sys.argv) > 1 and sys.argv[1] == 'land' else PIXEL7
tag = 'L' if dev is PIXEL7_LAND else 'P'
with sync_playwright() as pw:
    s = Session(pw, device=dev)
    s.open(); s.tap('#title'); s.pg.fill('input.name', 'H'); s.tap('[data-a=create]')
    print('tier', s.ev("JSON.stringify(__game.info())"))
    for lid, char in [('1-1', 'schmetterling'), ('2-2', 'biene'), ('3-1', 'marienkaefer'), ('4-3', 'schmetterling'), ('5-1', 'libelle')]:
        s.ev(f"__app.progress.cur.look.char = '{char}'; __app.setLookFromProfile()")
        s.ev(f"__game.start('{lid}', 'leicht')"); s.ev("__game.autopilot(true)")
        t0 = s.ev("__app.t")
        while s.ev("__app.t") - t0 < 5: time.sleep(0.3)
        s.shot(f'hero_{tag}_{lid}')
    print(s.errors[:5])
    s.close()
