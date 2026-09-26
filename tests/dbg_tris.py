import time, json, sys
sys.path.insert(0, 'tests')
from util import *
with sync_playwright() as pw:
    s = Session(pw, dpr=1)
    s.open()
    s.tap('#title'); s.pg.fill('input.name', 'P'); s.tap('[data-a=create]')
    s.ev("__game.setQuality(1)"); s.ev("__game.start('2-1', 'mittel')"); time.sleep(1.5)
    print(s.ev("""(() => { const out = []; __app.scene.traverse(o => { if (!o.geometry || !o.visible) return; const g = o.geometry; let tri = (g.index ? g.index.count : g.attributes.position.count) / 3;
      let n = o.isInstancedMesh ? o.count : (g.isInstancedBufferGeometry ? g.instanceCount : 1); if (o.isPoints) tri = 0;
      out.push([o.type + (o.material && o.material.defines ? Object.keys(o.material.defines).join('+') : ''), Math.round(tri), n, Math.round(tri * n)]); });
      out.sort((a, b) => b[3] - a[3]); return JSON.stringify(out.slice(0, 25)); })()"""))
    s.close()
