# 12 Level-Starts hintereinander: Geometrien/Texturen/Audio-Stimmen dürfen nicht wachsen
import time, json, sys
sys.path.insert(0, 'tests')
from util import *
with sync_playwright() as pw:
    s = Session(pw, dpr=1)
    s.open(); s.tap('#title'); s.pg.fill('input.name', 'M'); s.tap('[data-a=create]'); s.ev("__game.setQuality(0)")
    seq = ['1-1', '2-1', '3-2', '4-1', '5-2', '2-3', '1-1', '2-1', '3-2', '4-1', '5-2', '2-3']
    rows = []
    for i, lid in enumerate(seq):
        s.ev(f"__game.start('{lid}', 'mittel')"); time.sleep(1.2)
        m = s.ev("JSON.stringify({g: __app.renderer.r.info.memory.geometries, t: __app.renderer.r.info.memory.textures, p: __app.renderer.r.info.programs.length, sceneObjs: (() => { let n = 0; __app.scene.traverse(() => n++); return n; })(), heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : -1, voices: __app.audio.voices.length })")
        rows.append((lid, json.loads(m))); print(lid, m, flush=True)
    a, b = rows[5][1], rows[11][1]
    print('Runde1 vs Runde2 (gleiche Level):', {k: (a[k], b[k]) for k in a})
    print('errors', s.errors[:5])
    s.close()
