# Alle Screens in Hoch- und Querformat: Screenshots + Prüfung Touch-Ziele >= 48 px + abgeschnittene Elemente
import time, json, sys
sys.path.insert(0, 'tests')
from util import *
CHECK = """(() => { const bad = []; const vw = innerWidth, vh = innerHeight;
  document.querySelectorAll('#ui button, #ui [data-a], #hud button').forEach(b => { const r = b.getBoundingClientRect(); if (!r.width || !r.height) return;
    const st = getComputedStyle(b); if (st.visibility === 'hidden' || st.display === 'none') return;
    if (Math.min(r.width, r.height) < 47.5) bad.push('klein:' + (b.dataset.a || b.id || b.className) + ':' + Math.round(r.width) + 'x' + Math.round(r.height));
    const sc = b.closest('.worlds, .card'); const clip = sc ? sc.getBoundingClientRect() : null;
    if (!sc && (r.right > vw + 1 || r.bottom > vh + 1 || r.left < -1 || r.top < -1)) bad.push('raus:' + (b.dataset.a || b.id));
  }); return bad; })()"""
# Garderobe: alle Tabs ganz sichtbar (kein Wegscrollen) und die letzte Reihe ganz über dem Fertig-Knopf
WARD = """(() => { const bad = [], t = document.querySelector('#wardrobe .tabs'); if (!t) return bad; const tr = t.getBoundingClientRect();
  t.querySelectorAll('button').forEach(b => { const r = b.getBoundingClientRect(); if (r.left < tr.left - 0.5 || r.right > tr.right + 0.5 || r.left < 0 || r.right > innerWidth) bad.push('tab-abgeschnitten:' + b.dataset.v); });
  const g = document.querySelector('#wardrobe .grid'); g.scrollTop = g.scrollHeight;
  const it = [...g.querySelectorAll('.item')].pop(), ri = it.getBoundingClientRect(), rg = g.getBoundingClientRect(), rb = document.querySelector('[data-a=wdone]').getBoundingClientRect();
  if (ri.bottom > rg.bottom - 8 || ri.bottom > rb.top) bad.push('letzte-reihe-verdeckt:' + Math.round(ri.bottom) + '>' + Math.round(Math.min(rg.bottom - 8, rb.top)));
  g.scrollTop = 0; return bad; })()"""
def run(dev, tag):
    with sync_playwright() as pw:
        s = Session(pw, device=dev, dpr=1)
        s.open(); time.sleep(1)
        out = {}
        def snap(name):
            time.sleep(0.9); s.shot(f'ui_{tag}_{name}'); out[name] = s.ev(CHECK)
        snap('title')
        s.tap('#title'); snap('newprofile')
        s.pg.fill('input.name', 'Kind A'); s.tap('[data-a=create]'); snap('map')
        s.ev("__app.progress.cur.levels['1-1'] = {leicht: {stars: 3}}; __app.progress.save()")
        s.tap('[data-a=profiles]'); snap('profiles')
        s.tap('[data-a=newp]'); s.pg.fill('input.name', 'Kind B'); s.tap('[data-a=create]')
        s.tap('[data-a=profiles]'); s.tap('.pcard .edit'); snap('editprofile')
        s.tap('[data-a=profiles]'); s.tap('.pcard >> nth=0')
        s.tap('[data-a=level][data-v="1-2"]'); snap('levelcard')
        s.tap('[data-a=go]'); time.sleep(1.5); snap('hud')
        s.tap('#bPause'); snap('pause')
        s.tap('[data-a=settings]'); snap('settings')
        s.tap('[data-a=help]'); snap('help')
        s.tap('[data-a=helpback]'); s.tap('[data-a=setback]'); s.tap('[data-a=resume]')
        for i in range(30):
            if json.loads(s.state())['game'] == 'won': break
            s.ev("__game.step()"); time.sleep(0.2)
        time.sleep(3.5); snap('result')
        s.tap('[data-a=map]'); s.tap('[data-a=wardrobe]'); snap('wardrobe_figur')
        s.ev("__app.progress.cur.stats.loops = 0"); 
        for t in ['farbe', 'muster', 'hut']:
            s.tap(f'[data-a=wtab][data-v={t}]'); snap('wardrobe_' + t); out['wardrobe_' + t] += s.ev(WARD)
        s.tap('[data-a=wdone]'); s.tap('[data-a=album]'); snap('album')
        s.tap('[data-a=map]'); s.tap('[data-a=badges]'); snap('badges')
        s.tap('[data-a=map]'); s.ev("__game.start('2-3','mittel')"); time.sleep(0.5); snap('countdown')
        s.ev("__app.game.fail('Flora war diesmal schneller! Nochmal?')"); time.sleep(1.5); snap('fail')
        print(tag, json.dumps({k: v for k, v in out.items() if v}, ensure_ascii=False))
        print(tag, 'errors', s.errors[:10])
        s.close()
run(PIXEL7, 'P')
run(PIXEL7_LAND, 'L')
