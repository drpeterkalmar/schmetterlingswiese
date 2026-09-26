# Spielt jedes Level in jedem Schwierigkeitsgrad per Debug-API durch, prüft Sieg + Speicherung + Reload.
import time, json, sys
sys.path.insert(0, 'tests')
from util import *

def frames(s): return s.ev("__app.frames")
def wait_frames(s, n=2, timeout=20):
    f0 = frames(s); t0 = time.time()
    while frames(s) < f0 + n and time.time() - t0 < timeout: time.sleep(0.03)

def play(s, lid, diff):
    s.ev(f"__game.start('{lid}', '{diff}')")
    wait_frames(s, 3)
    st = json.loads(s.state())
    if st['game'] == 'countdown':
        t0 = time.time()
        while json.loads(s.state())['game'] == 'countdown' and time.time() - t0 < 30: time.sleep(0.2)
    for i in range(80):
        st = json.loads(s.state())
        if st['game'] in ('won', 'failed'): break
        s.ev("__game.step()"); wait_frames(s, 2)
    wait_frames(s, 2)
    return json.loads(s.state())

with sync_playwright() as pw:
    s = Session(pw, dpr=1)
    s.open()
    s.tap('#title'); s.pg.fill('input.name', 'Tester'); s.tap('[data-a=create]')
    s.ev("__game.setQuality(0)")
    levels = s.ev("__game.levels()") + [s.ev("__game.daily()")]
    results = []
    ok = True
    for lid in levels:
        for diff in ['leicht', 'mittel', 'schwer']:
            if lid.startswith('daily') and diff != 'mittel': continue
            t0 = time.time()
            st = play(s, lid, diff)
            won = st['game'] == 'won'
            ok &= won
            results.append((lid, diff, st['game'], st['stars'], round(time.time() - t0, 1)))
            print(lid, diff, st['game'], 'stars', st['stars'], 'tasks', [(t['type'], t['cur'], t['max']) for t in st['tasks']], f"{time.time()-t0:.1f}s", flush=True)
            if lid == '2-3' and diff == 'mittel': s.shot('lv_race_won')
    # Fortschritt vor Reload
    before = s.ev("JSON.stringify({stars: __game.progress.stars(), levels: Object.keys(__game.progress.cur.levels).length, daily: Object.keys(__game.progress.cur.daily.done).length})")
    s.pg.reload(); s.pg.wait_for_function("window.__app && window.__app.frames > 3", timeout=90000)
    after = s.ev("JSON.stringify({stars: __game.progress.stars(), levels: Object.keys(__game.progress.cur.levels).length, daily: Object.keys(__game.progress.cur.daily.done).length, unlocked: __game.levels().filter(id => __game.progress.unlocked(id)).length, badges: Object.keys(__game.progress.cur.badges).length})")
    print('vor Reload', before); print('nach Reload', after)
    print('ALLE GEWONNEN' if ok else 'FEHLER: nicht alle gewonnen')
    print('errors', s.errors[:20])
    json.dump({'results': results, 'before': json.loads(before), 'after': json.loads(after), 'errors': s.errors}, open('tests/out_levels.json', 'w'), indent=1)
    s.close()
