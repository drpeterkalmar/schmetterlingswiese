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
    # v2.2: Überraschung → Freischalt-Karte → anziehen → Werkstatt (alle Reiter, Hummel ab Start)
    res['unlocks'] = s.ev("__app.lastResult.unlocks.map(u => u.id)")
    if res['unlocks']:
        s.tap('[data-a=surprise]'); time.sleep(2.5); s.shot('live_unlock')
        res['unlock_screen'] = s.ev("__app.ui.current")
        while s.ev("__app.ui.current") == 'unlock': s.tap('[data-a=unlwear]'); time.sleep(0.8)
        res['worn'] = s.ev("__app.progress.lookOf().trail")
        if s.ev("__app.ui.current") != 'map': s.tap('[data-a=map]')
    s.tap('[data-a=wardrobe]'); time.sleep(1)
    for t in ['figur', 'farbe', 'form', 'fluegel', 'hut', 'spur']: s.tap(f'[data-a=wtab][data-v={t}]'); time.sleep(0.4)
    s.tap('[data-a=wtab][data-v=figur]'); s.tap('[data-a=wchar][data-v=hummel]'); time.sleep(1.5); s.shot('live_werkstatt')
    res['hummel'] = s.ev("__app.player.critter.kind")
    s.tap('[data-a=wdone]')
    time.sleep(3)
    res['sw'] = s.ev("!!navigator.serviceWorker.controller")
    s.ctx.set_offline(True); s.pg.reload(); s.pg.wait_for_function("window.__app && window.__app.frames > 3", timeout=120000)
    res['offline_reload'] = s.ev("JSON.stringify({screen: __app.ui.current, profile: __app.progress.cur && __app.progress.cur.name, stars: __app.progress.stars(), char: __app.player.critter.kind, trail: __app.player.critter.look.trail})")
    res['errors'] = s.errors
    s.close()
print(json.dumps(res, indent=1, ensure_ascii=False))
