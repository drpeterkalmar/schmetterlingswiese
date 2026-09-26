# Live-Prüfung gegen GitHub Pages: Boot, Ton nach Tap, Level spielen, 0 Fehler, Offline-Neustart
import time, json, sys, os
sys.path.insert(0, 'tests')
os.environ['BASE'] = 'https://drpeterkalmar.github.io/schmetterlingswiese/'
import util
util.BASE = os.environ['BASE']
from util import *
res = {}
with sync_playwright() as pw:
    s = Session(pw, dpr=1)
    s.open('')   # mit Service-Worker
    res['build'] = s.ev("import('./js/build.js').then(m => m.BUILD)")
    res['ac_before'] = s.ev("__game.ac()")
    s.tap('#title'); time.sleep(0.8)
    res['ac_after_tap'] = s.ev("__game.ac()")
    s.pg.fill('input.name', 'Live'); s.tap('[data-a=create]'); time.sleep(2)
    s.tap('[data-a=level][data-v="1-1"]'); s.tap('[data-a=go]'); time.sleep(2)
    for i in range(30):
        if json.loads(s.state())['game'] == 'won': break
        s.ev("__game.step()"); time.sleep(0.25)
    time.sleep(4); s.shot('live_result')
    st = json.loads(s.state()); res['won'] = st['game'] == 'won'; res['stars'] = st['stars']
    res['audio_ready'] = s.ev("__app.audio.ready"); res['voices_played'] = s.ev("__app.audio.stats.played")
    time.sleep(3)
    res['sw'] = s.ev("!!navigator.serviceWorker.controller")
    s.ctx.set_offline(True); s.pg.reload(); s.pg.wait_for_function("window.__app && window.__app.frames > 3", timeout=120000)
    res['offline_reload'] = s.ev("JSON.stringify({screen: __app.ui.current, profile: __app.progress.cur && __app.progress.cur.name, stars: __app.progress.stars()})")
    res['errors'] = s.errors
    s.close()
print(json.dumps(res, indent=1, ensure_ascii=False))
