# v2.9 E3: Kachel-Culling der Gras-Ringe und Hüllkugeln (frustumCulled) im echten Browser – „kein sichtbarer Halm und
# keine sichtbare Figur fehlt“. Während schneller Drehungen (links/rechts, steigen/sinken) wird mehrmals eingefroren und
# dasselbe Bild zweimal fotografiert: A mit Culling, B mit allen Kacheln/ohne frustumCulled. A und B müssen gleich sein.
# Hoch + quer, Mittel + Hoch, Welten Wiese (flach/hügelig) und Kirsch. Browser per `open` (perf_gate.OffenerBrowser).
# Aufruf: python3 tests/test_culling.py
import os, sys, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from perf_gate import OffenerBrowser, Server, profil, GPU_ARGS, REPO
from playwright.sync_api import sync_playwright

AUS = """(() => { const W = __app.world, c = [__app.world.ringe ? 0 : 0];
  const rc = window.__rcMerk; window.__culled = [];
  for (const m of W.ringe || []) { m.userData.cull([rc.x, rc.z], null); }
  __app.scene.traverse(o => { if (o.isMesh && o.frustumCulled) { window.__culled.push(o); o.frustumCulled = false; } });
  return window.__culled.length; })()"""
MERK = "(() => { const G = __app.world.ringe[0].material.uniforms.uCenter.value; window.__rcMerk = { x: G.x, z: G.z }; return __app.world.ringe.map(m => [m.geometry.instanceCount, m.userData.kacheln]); })()"
AN = """(() => { for (const o of window.__culled || []) o.frustumCulled = true; window.__culled = []; })()"""

# Zeichenpuffer direkt lesen (ohne HUD, das per CSS weiter animiert): einmal zeichnen, sofort readPixels
LESEN = """(() => { const r = __app.renderer, gl = r.r.getContext(); r.render(__app.scene, __app.camera);
  const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); window.__px = window.__px || []; window.__px.push(px); return [w, h]; })()"""
VERGLEICH = """(() => { const [a, b] = window.__px; window.__px = []; let n = 0;
  for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) > 8 || Math.abs(a[i + 1] - b[i + 1]) > 8 || Math.abs(a[i + 2] - b[i + 2]) > 8) n++;
  return n; })()"""

fails = []
with Server(REPO) as srv, sync_playwright() as pw:
    for g in ['hoch', 'quer']:
        for q in [1, 2]:
            b = OffenerBrowser(pw, GPU_ARGS)
            try:
                ctx = b.new_context(**profil(g, 2.0)); pg = ctx.new_page(); err = []
                pg.on('pageerror', lambda e: err.append(str(e)))
                pg.goto(srv.base + 'index.html?nosw&startprobe=0'); pg.wait_for_function('window.__app && __app.frames > 3', timeout=120000)
                pg.evaluate(f"__game.progress.create('C'); __game.setQuality({q})")
                # Gegenprobe: misst der Vergleich überhaupt etwas? Nahring ausblenden → Pixel müssen sich unterscheiden
                pg.evaluate("__game.start('1-1', 'leicht'); __app.input.injected = {turn: 0, climb: 0}"); time.sleep(1.5)
                pg.evaluate("__game.freeze(true)"); pg.evaluate(LESEN); pg.evaluate("__app.world.ringe[0].visible = false")
                pg.evaluate(LESEN); gp = pg.evaluate(VERGLEICH); pg.evaluate("__app.world.ringe[0].visible = true; __game.freeze(false)")
                print(('OK   ' if gp > 1000 else 'FEHLER ') + f'{g} Stufe {q} Gegenprobe (Nahring aus): {gp} Pixel verschieden', flush=True)
                if gp <= 1000: fails.append(f'{g} q{q} Gegenprobe')
                for lid in ['1-1', '4-1']:
                    pg.evaluate(f"__game.start('{lid}', 'leicht')"); time.sleep(1.5)
                    for k, inj in enumerate([(1, 0), (-1, 0.6), (1, -0.8), (-1, 0), (1, 1), (0, -1)]):
                        pg.evaluate(f"__app.input.injected = {{turn: {inj[0]}, climb: {inj[1]}}}"); time.sleep(0.7 + 0.13 * k)
                        pg.evaluate("__game.freeze(true)"); time.sleep(0.15)
                        z = pg.evaluate(MERK); pg.evaluate(LESEN)
                        n = pg.evaluate(AUS); pg.evaluate(LESEN); px = pg.evaluate(VERGLEICH)
                        pg.evaluate(AN); pg.evaluate("__game.freeze(false)")
                        ok = px == 0
                        if not ok: fails.append(f'{g} q{q} {lid} #{k}')
                        print(('OK   ' if ok else 'FEHLER ') + f'{g} Stufe {q} Level {lid} Drehung {k}: Ringe [Halme, Kacheln] {z}, {n} Meshes mit Culling, Pixel verschieden: {px}', flush=True)
                if err: fails.append(f'{g} q{q} Fehler {err[:2]}'); print('FEHLER Seitenfehler', err[:2])
                ctx.close()
            finally:
                b.close()
print('ALLE OK' if not fails else f'{len(fails)} FEHLER: {fails}')
sys.exit(1 if fails else 0)
