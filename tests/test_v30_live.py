# v3.0 Live-Prüfung gegen GitHub Pages: neue Version lädt (3.0.0, Build wie lokal), ?stunt=immelmann legt den 🎪-Knopf
# auf den Immelmann (echt getippt, Einblende-Text, Figur fliegt, Rauchspur), ?finale=flugshow startet den Fan-Cam-Clip.
import time, json, sys, os, re
sys.path.insert(0, 'tests')
os.environ['BASE'] = 'https://drpeterkalmar.github.io/schmetterlingswiese/'
import util
util.BASE = os.environ['BASE']
from util import *
OUT = 'tests/shots/v30'
os.makedirs(OUT, exist_ok=True)
res = {'build_lokal': re.search(r"BUILD = '(\w+)'", open('js/build.js').read()).group(1)}

def sim_wait(s, sec):
    t0 = s.ev("__app.t")
    while s.ev("__app.t") - t0 < sec: time.sleep(0.02)

with sync_playwright() as pw:
    s = Session(pw, dpr=1)
    s.open('?stunt=immelmann')   # mit Service-Worker, wie am Handy
    res['version'] = s.ev("__game.version")
    res['build'] = s.ev("import('./js/build.js').then(m => m.BUILD)")
    s.tap('#title'); s.pg.fill('input.name', 'Live'); s.tap('[data-a=create]'); time.sleep(1)
    s.ev("__game.start('1-1', 'leicht')"); sim_wait(s, 1.5)
    s.ev("__app.player.pos.y += 3")
    box = s.pg.locator('#bShow').bounding_box()
    s.pg.touchscreen.tap(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
    sim_wait(s, 0.2)
    res['stunt'] = s.ev("__app.player.stunt && __app.player.stunt.id")
    res['toast'] = s.ev("document.getElementById('toast').textContent")
    k = 0; t1 = time.time()
    while s.ev("!!__app.player.stunt") and time.time() - t1 < 30:
        p = s.ev("__app.player.stunt.p")
        if k < 4 and p >= 0.2 + k * 0.17: s.pg.screenshot(path=f'{OUT}/live_immelmann_{k}.png'); k += 1
        time.sleep(0.05)
    res['shots'] = k
    res['end_rot'] = s.ev("(() => { const c = __app.player.critter.tilt.rotation; return Math.max(Math.abs(c.x), Math.abs(c.y), Math.abs(c.z)); })()")
    res['errors'] = list(s.errors[:5])
    s.close()
    s = Session(pw, dpr=1)
    s.open('?finale=flugshow')
    s.tap('#title'); s.pg.fill('input.name', 'Live'); s.tap('[data-a=create]'); time.sleep(1)
    s.ev("__game.start('1-1', 'leicht')"); sim_wait(s, 1.0)
    for i in range(30):
        if s.ev("__app.game.state") == 'won': break
        s.ev("__game.step()"); sim_wait(s, 0.05)
    time.sleep(1.5)
    res['clip'] = s.ev("__game.fancam().on && __app.game.finale.id")
    s.pg.screenshot(path=f'{OUT}/live_clip.png')
    t1 = time.time()
    while s.ev("__app.ui.current") != 'result' and time.time() - t1 < 40: time.sleep(0.2)
    res['clip_result'] = s.ev("__app.ui.current") == 'result' and s.ev("!!document.querySelector('[data-a=clip]')")
    res['errors'] += s.errors[:5]
    s.close()
res['ok'] = (res['version'] == '3.0.0' and res['build'] == res['build_lokal'] and res['stunt'] == 'immelmann'
             and 'Immelmann – halber Looping' in res['toast'] and res['shots'] >= 3 and res['end_rot'] < 0.02
             and res['clip'] == 'flugshow' and res['clip_result'] and not res['errors'])
print(json.dumps(res, indent=1, ensure_ascii=False))
print('ok', res['ok'])
