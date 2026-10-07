# Deko-Leistung (v2.8): Handy-Viewport (Pixel 7), CPU-Drosselung 4× (CDP), je Szene ≥ 10 s:
# Bildabstand (rAF) p50/p95, CPU je Bild (ganze Hauptschleife) p50/p95, GPU je Bild (Timer-Query) p50/p95, renderer.info.
# Aufruf: python3 tests/deko_perf.py <label> [query] [port]  → tests/out/deko_perf_<label>.json
#   QUAL=1,0 (Stufen), SCENES=wiese,teich,kirsch,abend,karte, SEC=10, RATE=4
import time, sys, os, json
sys.path.insert(0, 'tests')
import util
from util import *
LABEL = sys.argv[1] if len(sys.argv) > 1 else 'nachher'
Q = sys.argv[2] if len(sys.argv) > 2 else '?nosw'
if len(sys.argv) > 3: util.BASE = f'http://localhost:{sys.argv[3]}/'
# Ohne VSync/Bildraten-Deckel: rAF-Abstand = echte Bildzeit (headless sonst 15–20 rAF/s, unabhängig von der Last)
if os.environ.get('FREE', '1') == '1': util.ARGS.extend(['--disable-gpu-vsync', '--disable-frame-rate-limit'])
SEC = float(os.environ.get('SEC', 10)); RATE = float(os.environ.get('RATE', 4))
QUALS = [int(x) for x in os.environ.get('QUAL', '1,0').split(',')]
SC = {'wiese': '1-1', 'teich': '3-1', 'kirsch': '4-1', 'abend': '5-1', 'sonne': '2-1', 'karte': None}
SCENES = os.environ.get('SCENES', 'wiese,teich,kirsch,abend,karte').split(',')
os.makedirs('tests/out', exist_ok=True)

HOOK = """(() => {
  const app = __app, gl = app.renderer.r.getContext(), ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  window.__m = { cpu: [], gpu: [], raf: [], on: false, ext: !!ext };
  const pend = [];
  const orig = app.renderer.render.bind(app.renderer);
  app.renderer.render = (s, c) => {
    let q = null;
    if (ext && __m.on && pend.length < 6) { q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q); }
    orig(s, c);
    if (q) { gl.endQuery(ext.TIME_ELAPSED_EXT); pend.push(q); }
    while (pend.length && gl.getQueryParameter(pend[0], gl.QUERY_RESULT_AVAILABLE)) {
      const r = gl.getQueryParameter(pend[0], gl.QUERY_RESULT);
      if (!gl.getParameter(ext.GPU_DISJOINT_EXT) && __m.on) __m.gpu.push(r / 1e6);
      gl.deleteQuery(pend.shift());
    }
  };
  const L = Object.getPrototypeOf(app).loop;
  let last = 0;
  app.loop = function (n) { const t0 = performance.now(); L.call(this, n); const t1 = performance.now();
    if (__m.on) { __m.cpu.push(t1 - t0); if (last) __m.raf.push(n - last); } last = n; };
})()"""

def pct(a, p):
    if not a: return None
    a = sorted(a); return round(a[min(len(a) - 1, int(len(a) * p))], 2)

res = {'label': LABEL, 'query': Q, 'rate': RATE, 'sec': SEC, 'scenes': {}}
with sync_playwright() as pw:
    s = Session(pw)
    s.open(Q)
    s.tap('#title'); s.pg.fill('input.name', 'Mess'); s.tap('[data-a=create]')
    s.ev(HOOK)
    cdp = s.ctx.new_cdp_session(s.pg)
    cdp.send('Emulation.setCPUThrottlingRate', {'rate': RATE})
    for q in QUALS:
        s.ev(f"__game.setQuality({q})")
        for sc in SCENES:
            lid = SC[sc]
            if lid: s.ev(f"__game.start('{lid}', 'leicht')"); s.ev("__game.autopilot(true)")
            else: s.ev("__game.autopilot(false)"); s.ev("__app.toShowcase(); __game.show('map')")
            if os.environ.get('PRE'): s.ev(os.environ['PRE'])  # Messhilfe: z. B. Deko-Teile zur Laufzeit abschalten
            time.sleep(2.5)
            s.ev("__m.cpu.length = 0; __m.gpu.length = 0; __m.raf.length = 0; __m.on = true")
            time.sleep(SEC)
            m = json.loads(s.ev("(__m.on = false, JSON.stringify(__m))"))
            info = json.loads(s.ev("JSON.stringify(__game.info())"))
            r = {'frames': len(m['raf']), 'raf_p50': pct(m['raf'], .5), 'raf_p95': pct(m['raf'], .95),
                 'cpu_p50': pct(m['cpu'], .5), 'cpu_p95': pct(m['cpu'], .95), 'gpu_n': len(m['gpu']), 'gpu_p50': pct(m['gpu'], .5), 'gpu_p95': pct(m['gpu'], .95),
                 'calls': info['calls'], 'tris': info['tris'], 'tex': info['tex'], 'geos': info['geos'], 'tier': info['tier'], 'dpr': info['dpr']}
            res['scenes'][f'q{q}_{sc}'] = r
            if os.environ.get('RAW'): res.setdefault('raw', {})[f'q{q}_{sc}'] = {'raf': [round(x, 2) for x in m['raf']], 'cpu': [round(x, 3) for x in m['cpu']], 'gpu': [round(x, 3) for x in m['gpu']]}
            print(f'q{q} {sc:7s}', r, flush=True)
            if lid: s.ev("__game.autopilot(false)"); s.ev("__app.quit()")
    cdp.send('Emulation.setCPUThrottlingRate', {'rate': 1})
    res['errors'] = s.errors[:10]
    s.close()
json.dump(res, open(f'tests/out/deko_perf_{LABEL}.json', 'w'), indent=1)
print('errors', res['errors'])
