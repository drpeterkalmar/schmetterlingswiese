# v2.9 E5: fester Simulationstakt im echten Browser (Ergänzung zu tests/node/test_takt.mjs).
#   1. Gleiche Flugbahn bei 60 Bildern/s (vsync) und ungedeckelt (mehrere hundert Bilder/s, wie ein 120/144-Hz-Schirm
#      und mehr): Lage der Figur nach 6 s Simulationszeit bei fester Eingabe (drehen + steigen). Mit Takt: Abstand < 2 cm;
#      zum Vergleich ?takt=0 (variables dt) – dort weicht die Bahn ab.
#   2. Ruhige Darstellung bei hoher Bildrate: Kamerageschwindigkeit je Bild (Weg / Bildzeit) schwankt mit Interpolation
#      nicht stärker als mit ?takt=0 (ohne Interpolation gäbe es Sprünge: abwechselnd 0 und 2 Schritte je Bild).
#   3. Pause/Weiter und Level mitten im Flug verlassen + neu starten: keine Fehler, Takt läuft weiter.
# Browser per `open` (perf_gate.OffenerBrowser), einer zur Zeit.
import os, sys, time, json, statistics
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from perf_gate import OffenerBrowser, Server, profil, GPU_ARGS, REPO
from playwright.sync_api import sync_playwright

UNGEDECKELT = ['--disable-gpu-vsync', '--disable-frame-rate-limit']
fails = []
def check(c, m):
    print(('OK   ' if c else 'FEHLER ') + m, flush=True)
    if not c: fails.append(m)

# Lage der Figur bei Simulationszeit 6 s (ab Spielbeginn), feste Eingabe; game.update mitschreiben (Zeit, Lage)
BAHN = """async () => { const a = __app, g = a.game, log = []; __game.start('1-1', 'leicht');
  const up = g.update.bind(g); let t = 0;
  g.update = (dt, T, inp) => { up(dt, T, inp); if (g.state === 'play') { t += dt; const p = a.player.pos; log.push([t, p.x, p.y, p.z]); } };
  a.input.injected = { turn: 0.6, climb: 0.25 };
  await new Promise(r => { const f = () => (t >= 6.2 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
  g.update = up;
  // Lage bei genau 6,0 s (lineare Interpolation zwischen den Einträgen)
  let i = log.findIndex(e => e[0] >= 6.0); const A = log[i - 1], B = log[i], k = (6.0 - A[0]) / (B[0] - A[0]);
  return { pos: [0, 1, 2].map(j => A[j + 1] + (B[j + 1] - A[j + 1]) * k), eintraege: log.length, fps: __game.info().fps }; }"""
# Kamera je Bild: Geschwindigkeit = Weg / Bildzeit; Schwankung = Variationskoeffizient der Geschwindigkeit
RUHE = """async () => { const a = __app, c = a.camera, v = [], ft = []; let last = performance.now(), p0 = c.position.clone();
  a.input.injected = { turn: 0, climb: 0 };
  await new Promise(r => setTimeout(r, 600));
  await new Promise(r => { let n = 0; const f = (now) => { const dt = now - last; last = now;
    // gezeichnete Kameralage (GEZEICHNET schreibt sie in render() mit – danach wird der Simulationsstand zurückgesetzt)
    const p = (a._gezeichnet || c.position).clone(); if (n++ > 2) { v.push(p.distanceTo(p0) / dt); ft.push(dt); } p0 = p;
    if (n < 400) requestAnimationFrame(f); else r(); }; requestAnimationFrame(f); });
  const m = v.reduce((x, y) => x + y, 0) / v.length, sd = Math.sqrt(v.reduce((x, y) => x + (y - m) ** 2, 0) / v.length);
  return { cv: +(sd / m).toFixed(3), bildMs: +(ft.reduce((x, y) => x + y, 0) / ft.length).toFixed(2) }; }"""
# gezeichnete Kameralage mitschreiben (vor dem Zurücksetzen): render() umhüllen
GEZEICHNET = """(() => { const a = __app, r = a.renderer, rd = r.render.bind(r); a._gezeichnet = a.camera.position.clone();
  r.render = (s, c) => { a._gezeichnet.copy(c.position); rd(s, c); }; })()"""

def lauf(pw, base, q, frei, js, start=True):
    b = OffenerBrowser(pw, GPU_ARGS + (UNGEDECKELT if frei else []))
    try:
        ctx = b.new_context(**profil('quer', 2.0)); pg = ctx.new_page(); err = []
        pg.on('pageerror', lambda e: err.append(str(e)))
        pg.goto(base + 'index.html?nosw&startprobe=0' + q); pg.wait_for_function('window.__app && __app.frames > 3', timeout=120000)
        pg.evaluate("__game.progress.create('T'); __game.setQuality(1)")
        if start: pg.evaluate("__game.start('1-1', 'leicht')"); time.sleep(0.4)
        r = pg.evaluate(js) if isinstance(js, str) else js(pg)
        return r, err
    finally:
        b.close()

def dist(a, b): return sum((x - y) ** 2 for x, y in zip(a, b)) ** 0.5

with Server(REPO) as srv, sync_playwright() as pw:
    # 1. Bahn
    res = {}
    for q, name in [('', 'takt'), ('&takt=0', 'takt0')]:
        for frei in [False, True]:
            r, e = lauf(pw, srv.base, q, frei, BAHN, start=False)
            res[(name, frei)] = r
            print(f'  {name} {"ungedeckelt" if frei else "60 Hz"}: Lage {[round(x, 3) for x in r["pos"]]}, {r["fps"]} Bilder/s, {r["eintraege"]} Schritte/Bilder', flush=True)
            if e: check(False, f'Fehler {e[:2]}')
    d1 = dist(res[('takt', False)]['pos'], res[('takt', True)]['pos'])
    d0 = dist(res[('takt0', False)]['pos'], res[('takt0', True)]['pos'])
    check(d1 < 0.02, f'Takt: Bahn 60 Hz gegen ungedeckelt nach 6 s: {d1 * 100:.2f} cm (variables dt: {d0 * 100:.1f} cm)')
    check(dist(res[('takt', False)]['pos'], res[('takt0', False)]['pos']) < 0.25, f'Takt fliegt bei 60 Hz wie bisher: {dist(res[("takt", False)]["pos"], res[("takt0", False)]["pos"]) * 100:.1f} cm Abstand zu ?takt=0')
    # 2. Ruhe bei hoher Bildrate
    ru = {}
    for q, name in [('', 'takt'), ('&takt=0', 'takt0'), ('', 'takt_ohneInterp')]:
        def f(pg, name=name):
            pg.evaluate(GEZEICHNET)
            if name == 'takt_ohneInterp': pg.evaluate("__app.darst.anwenden = () => {}")
            return pg.evaluate(RUHE)
        r, e = lauf(pw, srv.base, q, True, f)
        ru[name] = r; print(f'  Ruhe {name}: Schwankung der Kamerageschwindigkeit {r["cv"]}, Bildzeit {r["bildMs"]} ms', flush=True)
    check(ru['takt']['cv'] <= max(0.15, ru['takt0']['cv'] * 1.5) and ru['takt']['cv'] < ru['takt_ohneInterp']['cv'] * 0.5,
          f'Darstellung ruhig: Takt {ru["takt"]["cv"]}, ?takt=0 {ru["takt0"]["cv"]}, ohne Interpolation {ru["takt_ohneInterp"]["cv"]}')
    # 3. Pause/Weiter, Level verlassen, neu starten
    def ablauf(pg):
        pg.evaluate("__app.input.injected = { turn: 0.3, climb: 0.2 }"); time.sleep(1.0)
        s0 = pg.evaluate("__game.info().takt.schritte")
        pg.evaluate('__app.pause()'); time.sleep(0.8); p1 = pg.evaluate("[__app.game.state, __game.info().takt.schritte, __app.player.pos.x]")
        time.sleep(0.6); p2 = pg.evaluate("[__app.game.state, __game.info().takt.schritte, __app.player.pos.x]")
        pg.evaluate('__app.resume()'); time.sleep(1.0); p3 = pg.evaluate("[__app.game.state, __game.info().takt.schritte]")
        pg.evaluate("__app.toShowcase()"); time.sleep(0.8); m = pg.evaluate("[__app.mode, __game.info().takt.aktiv]")
        pg.evaluate("__game.start('2-1', 'leicht')"); time.sleep(1.5); n = pg.evaluate("[__app.mode, __app.game.state, __game.info().takt.aktiv, __game.info().takt.schritte]")
        return {'s0': s0, 'pause': [p1, p2], 'weiter': p3, 'menue': m, 'neu': n}
    r, e = lauf(pw, srv.base, '', False, ablauf)
    print('  Ablauf', json.dumps(r))
    check(r['pause'][0][2] == r['pause'][1][2] and r['weiter'][1] > r['pause'][1][1], f'Pause hält die Figur an, Weiter läuft weiter ({r["pause"]}, {r["weiter"]})')
    check(r['menue'][0] == 'showcase' and r['menue'][1] is False and r['neu'][2] is True and r['neu'][1] in ('play', 'countdown', 'intro'), f'Level verlassen → Menü (Takt aus), neu starten → Takt an ({r["menue"]}, {r["neu"]})')
    check(not e, f'0 Fehler ({e[:2]})')
print('ALLE OK' if not fails else f'{len(fails)} FEHLER')
sys.exit(1 if fails else 0)
