# Frame-Zeiten (rAF-Intervalle) je Qualitätsstufe + JS-CPU-Zeit pro Frame (Update / Render-Submit)
import time, json, sys
sys.path.insert(0, 'tests')
from util import *
res = {}
with sync_playwright() as pw:
    s = Session(pw, dpr=1)
    s.open(); s.tap('#title'); s.pg.fill('input.name', 'F'); s.tap('[data-a=create]')
    for q in [0, 1, 2]:
        s.ev(f"__game.setQuality({q})"); s.ev("__game.start('2-1', 'mittel')"); s.ev("__game.autopilot(true)"); time.sleep(3)
        r = s.ev("""new Promise(res => { const d = []; let last = 0; const f = (t) => { if (last) d.push(t - last); last = t; if (d.length < 60) requestAnimationFrame(f); else { d.sort((a, b) => a - b);
            res({ p50: +d[30].toFixed(1), p95: +d[57].toFixed(1), max: +d[59].toFixed(1) }); } }; requestAnimationFrame(f); })""")
        info = json.loads(s.ev("JSON.stringify(__game.info())"))
        res[f'q{q}'] = {**r, 'cpuUpdateMs': info['cpuUpdateMs'], 'cpuRenderSubmitMs': info['cpuRenderSubmitMs'], 'calls': info['calls'], 'tris': info['tris']}
        print(f'q{q}', res[f'q{q}'], flush=True)
    res['errors'] = s.errors[:5]
    json.dump(res, open('tests/out/frametimes.json', 'w'), indent=1)
    s.close()
