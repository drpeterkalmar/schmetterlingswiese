# v3.1 Live-Prüfung gegen GitHub Pages (mit Service-Worker, wie am Handy): Version 3.1.0 + Build wie lokal,
# Flatter-Tipp (echt getippt), Aufwind-Säulen im Level, Rückenwind nach einem Ring, keine JS-Fehler. Bilder: tests/shots/v31/live_*.png
import time, json, sys, os, re
sys.path.insert(0, 'tests')
os.environ['BASE'] = 'https://drpeterkalmar.github.io/schmetterlingswiese/'
import util
util.BASE = os.environ['BASE']
from util import *
OUT = 'tests/shots/v31'
os.makedirs(OUT, exist_ok=True)
res = {'build_lokal': re.search(r"VERSION = '(\w+)'", open('sw.js').read()).group(1)}
with sync_playwright() as pw:
    s = Session(pw, dpr=1)
    s.open('')
    res['version'] = s.ev("__game.version")
    res['build'] = s.ev("import('./js/build.js').then(m => m.BUILD)")
    s.tap('#title'); s.pg.fill('input.name', 'Live'); s.tap('[data-a=create]'); time.sleep(1)
    s.ev("__game.start('1-3', 'mittel')"); time.sleep(1.5)
    s.ev("__app.player.pos.y += 3")
    s.pg.touchscreen.tap(206, 230); time.sleep(0.4)
    res['flatter_stoesse'] = s.ev("__app.player.flat.stoesse")
    res['aufwind_saeulen'] = s.ev("__app.player.aufwinde.length")
    s.ev("__app.game.tasks[0].debugNext()"); time.sleep(0.35)
    res['rueckenwind'] = round(s.ev("__app.player.wind.wert"), 3)
    s.pg.screenshot(path=f'{OUT}/live_ring.png')
    res['errors'] = list(s.errors[:5])
    s.close()
res['ok'] = (res['version'] == '3.1.0' and res['build'] == res['build_lokal'] and res['flatter_stoesse'] >= 1
             and res['aufwind_saeulen'] >= 2 and res['rueckenwind'] > 0.05 and not res['errors'])
print(json.dumps(res, ensure_ascii=False))
sys.exit(0 if res['ok'] else 1)
