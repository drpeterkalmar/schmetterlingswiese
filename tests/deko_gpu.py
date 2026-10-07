# GPU-Zeit je Bild in FESTER Ansicht (Spiel eingefroren, gleiche Kamera) – A/B ohne Autopilot-Streuung.
# Aufruf: python3 tests/deko_gpu.py <label> [query] [port]  → tests/out/deko_gpu_<label>.json
#   VARIANTS=1 misst zusätzlich je Deko-Schicht ausgeblendet (Blüten, Strahlen, Schirmchen) → Kosten je Schicht
import time, sys, os, json
sys.path.insert(0, 'tests')
import util
from util import *
LABEL = sys.argv[1] if len(sys.argv) > 1 else 'neu'
Q = sys.argv[2] if len(sys.argv) > 2 else '?nosw'
if len(sys.argv) > 3: util.BASE = f'http://localhost:{sys.argv[3]}/'
util.ARGS.extend(['--disable-gpu-vsync', '--disable-frame-rate-limit'])
N = int(os.environ.get('N', 400)); QUAL = int(os.environ.get('QUAL', 1))
SC = [('wiese', '1-1', False), ('teich', '3-1', False), ('kirschgegen', '4-1', True), ('abend', '5-1', False), ('abendhimmel', '5-1', 'sky')]

HOOK = """(() => {
  const app = __app, gl = app.renderer.r.getContext(), ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  window.__g = { gpu: [], on: false }; const pend = [];
  const orig = app.renderer.render.bind(app.renderer);
  app.renderer.render = (s, c) => {
    let q = null;
    if (__g.on && pend.length < 3) { q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q); }
    for (let i = 0; i < __REP; i++) orig(s, c); // REP>1: Szene mehrfach je Bild → GPU-gebunden, rAF-Abstand = GPU-Last
    if (q) { gl.endQuery(ext.TIME_ELAPSED_EXT); pend.push(q); }
    while (pend.length && gl.getQueryParameter(pend[0], gl.QUERY_RESULT_AVAILABLE)) {
      const r = gl.getQueryParameter(pend[0], gl.QUERY_RESULT);
      if (!gl.getParameter(ext.GPU_DISJOINT_EXT) && __g.on) __g.gpu.push(r / 1e6);
      gl.deleteQuery(pend.shift());
    }
  };
})()"""

def sim_wait(s, sec, timeout=30):
    t0 = s.ev("__app.t"); w0 = time.time()
    while s.ev("__app.t") - t0 < sec and time.time() - w0 < timeout: time.sleep(0.04)

SEC = float(os.environ.get('SEC', 4))
def measure(s):
    # Bildabstand (rAF, ohne VSync) bei eingefrorener Szene: mit BIG=1 GPU-gebunden → echte GPU-Bildzeit inkl. Taktverhalten
    s.ev("__g.raf = []; __g.last = 0; __g.rafOn = true; (function f(n){ if (!__g.rafOn) return; if (__g.last) __g.raf.push(n - __g.last); __g.last = n; requestAnimationFrame(f); })(0)")
    time.sleep(SEC)
    g = sorted(s.ev("(__g.rafOn = false, __g.raf.slice(5))"))
    return {'n': len(g), 'p50': round(g[len(g) // 2], 3), 'p95': round(g[int(len(g) * 0.95)], 3), 'mean': round(sum(g) / len(g), 3)}

res = {'label': LABEL, 'query': Q, 'scenes': {}}
with sync_playwright() as pw:
    # BIG=1: doppelte Kantenlänge (4× Pixel) → GPU voll ausgelastet, stabile Takte, Pixel-Shader-Kosten dominieren
    dev = dict(PIXEL7, viewport={'width': 824, 'height': 1830}, device_scale_factor=2) if os.environ.get('BIG') else PIXEL7
    s = Session(pw, device=dev)
    s.open(Q); s.tap('#title'); s.pg.fill('input.name', 'GPU'); s.tap('[data-a=create]')
    s.ev(f"__game.setQuality({QUAL})"); s.ev(f"window.__REP = {int(os.environ.get('REP', 1))}"); s.ev(HOOK)
    for name, lid, sun in SC:
        s.ev(f"__game.start('{lid}', 'leicht')")
        if sun is True: s.ev("__app.player.yaw = __app.world.def.sun.az")
        s.ev("__app.input.injected = {turn: 0, climb: 0}")
        sim_wait(s, 2.0); s.ev("__game.freeze(true)")
        if sun == 'sky':  # Blick zum Mond, 35° nach oben (Himmels-Shader)
            s.ev("""(() => { const c = __app.camera, a = __app.world.def.sun.az; c.lookAt(c.position.x + Math.sin(a), c.position.y + 0.7, c.position.z + Math.cos(a)); })()""")
        time.sleep(0.5)
        r = {'alles': measure(s)}
        if os.environ.get('VARIANTS') and s.ev("!!__app.world.deko"):
            for part in ['bloom', 'shaft', 'fluff']:
                if not s.ev(f"!!(__app.world.deko.{part} && __app.world.deko.{part}.visible)"): continue
                s.ev(f"__app.world.deko.{part}.visible = false"); time.sleep(0.2)
                r['ohne_' + part] = measure(s)
                s.ev(f"__app.world.deko.{part}.visible = true")
            s.ev("__app.world.deko.group.visible = false"); time.sleep(0.2)
            r['ohne_schichten'] = measure(s)
            s.ev("__app.world.deko.group.visible = true")
        res['scenes'][name] = r
        print(f'{name:12s}', json.dumps(r), flush=True)
        s.ev("__game.freeze(false)")
    res['errors'] = s.errors[:5]
    s.close()
os.makedirs('tests/out', exist_ok=True)
json.dump(res, open(f'tests/out/deko_gpu_{LABEL}.json', 'w'), indent=1)
print('errors', res['errors'])
