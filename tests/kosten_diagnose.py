# v2.9 Kosten-Aufschlüsselung: je Variante (URL-Regler + optional JS-Eingriff) Rechenzeit (Update, Zeichnen-Aufruf) und
# GPU-Zeit (EXT_disjoint_timer_query) bei CPU ×4, Level 1-1 mit Test-Autopilot. Browser per `open`, einer zur Zeit.
# Aufruf: python3 tests/kosten_diagnose.py <stufe> <gerät> 'name=query[::js]' …
import sys, os, time, json, statistics
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from perf_gate import OffenerBrowser, Server, profil, GPU_ARGS, REPO
from playwright.sync_api import sync_playwright
MESS = """async (sek) => { const g = __app.renderer.gpu, cu = [], cr = [], gp = [], ft = []; let last = performance.now();
  await new Promise(res => { const t0 = last; const f = (now) => { ft.push(now - last); last = now;
    cu.push(__app._cU || 0); cr.push(__app._cR || 0); if (g && g.ms != null) gp.push(g.ms);
    if (now - t0 < sek * 1000) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
  const m = a => a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(3) : null;
  return { frame: m(ft), cpuUpd: +__app.cpuUpd.toFixed(3), cpuRen: +__app.cpuRen.toFixed(3), gpu: m(gp), n: ft.length }; }"""
q, g = sys.argv[1], sys.argv[2]
var = [a.split('=', 1) for a in sys.argv[3:]]
runden = int(os.environ.get('RUNDEN', '2'))
res = {n: [] for n, _ in var}
with Server(REPO) as srv, sync_playwright() as pw:
    for r in range(runden):
        for n, rest in (var if r % 2 == 0 else var[::-1]):
            qs, js = (rest.split('::', 1) + [''])[:2]
            b = OffenerBrowser(pw, GPU_ARGS + ['--disable-gpu-vsync', '--disable-frame-rate-limit'])
            try:
                ctx = b.new_context(**profil(g, 2.6)); pg = ctx.new_page()
                pg.goto(srv.base + 'index.html?nosw&startprobe=0' + qs); pg.wait_for_function('window.__app && __app.frames > 3', timeout=120000)
                pg.evaluate(f"__game.progress.create('K'); __game.setQuality({q}); __game.start('1-1', 'leicht'); __game.autopilot(true)")
                if js: pg.evaluate(js)
                time.sleep(3)
                cdp = ctx.new_cdp_session(pg); cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4}); time.sleep(1)
                res[n].append(pg.evaluate(MESS, 6))
            finally: b.close()
for n, L in res.items():
    med = {k: round(statistics.median([l[k] for l in L if l[k] is not None]), 3) if any(l[k] is not None for l in L) else None for k in L[0]}
    print(f'{n:14s}', json.dumps(med))
