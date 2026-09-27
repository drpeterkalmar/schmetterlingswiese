# v2.2 Frame-Messung vorher/nachher: Standard-Aussehen vs. schwerstes Outfit (A/B/A/B, Stufe Niedrig → CPU sichtbar)
import time, json, sys
sys.path.insert(0, 'tests')
from util import *
FT = """new Promise(res => { const d = []; let last = 0; const f = (t) => { if (last) d.push(t - last); last = t; if (d.length < 60) requestAnimationFrame(f); else { d.sort((a, b) => a - b);
    res({ p50: +d[30].toFixed(1), p95: +d[57].toFixed(1) }); } }; requestAnimationFrame(f); })"""
HEAVY = "{char: 'katze', look: {hat: 'propeller', extra: 'umhang', skin: 'disco', trail: 'schweif', size: 'xl', eyes: 'wimpern'}}"
NOTRAIL = "{char: 'katze', look: {hat: 'propeller', extra: 'umhang', skin: 'disco', size: 'xl', eyes: 'wimpern'}}"
BASE = "{char: 'schmetterling', look: {}}"
with sync_playwright() as pw:
    s = Session(pw, dpr=1)
    s.open(); s.tap('#title'); s.pg.fill('input.name', 'Perf'); s.tap('[data-a=create]')
    s.ev("__app.progress.cur.levels['t'] = {leicht: {stars: 135}}; __app.progress.save()")
    out = {'A': [], 'B': [], 'C': []}
    for q in [0]:
        s.ev(f"__game.setQuality({q})")
        for rnd in range(2):
            for tag, cfg in [('A', BASE), ('B', HEAVY), ('C', NOTRAIL)]:
                s.ev(f"(() => {{ const c = {cfg}; __app.progress.cur.look.char = c.char; __app.progress.cur.look.per[c.char] = c.look; __app.setLookFromProfile(); }})()")
                s.ev("__game.start('1-1', 'mittel')"); s.ev("__game.autopilot(true)"); time.sleep(3.5)
                ft = s.ev(FT); info = json.loads(s.ev("JSON.stringify(__game.info())"))
                row = {**ft, 'cpuUpdateMs': info['cpuUpdateMs'], 'cpuRenderSubmitMs': info['cpuRenderSubmitMs'], 'calls': info['calls'], 'tris': info['tris'], 'partikel': s.ev("__app.bursts.n")}
                out[tag].append(row); print(tag, row, flush=True)
    avg = lambda t, k: round(sum(r[k] for r in out[t]) / len(out[t]), 2)
    summary = {k: (avg('A', k), avg('B', k), avg('C', k)) for k in ['p50', 'p95', 'cpuUpdateMs', 'cpuRenderSubmitMs', 'calls', 'partikel']}
    print('Mittel A (Standard) / B (schwerstes Outfit mit Regenbogen-Schweif) / C (dasselbe ohne Spur):', summary)
    print('DRAW-CALLS OK' if max(r['calls'] for r in out['B']) < 150 else 'DRAW-CALLS ÜBER BUDGET')
    print('errors', s.errors[:5])
    json.dump({'rows': out, 'summary': summary}, open('tests/out/v22_perf.json', 'w'), indent=1)
    s.close()
