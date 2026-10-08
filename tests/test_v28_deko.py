# v2.8 Deko: Schalter ?deko=0 (altes Aussehen), Stückzahlen je Qualitätsstufe, Auto-Drosselung halbiert, Niedrig = aus,
# prefers-reduced-motion (Kamera ruckelt nicht, halber Partikelregen), keine Fehler in allen 5 Welten, keine neuen Requests.
import time, json, sys
sys.path.insert(0, 'tests')
from util import *
R = {}; fails = []
def ok(name, cond, info=''):
    R[name] = bool(cond); print(('  ok   ' if cond else '  FEHLER ') + name, info, flush=True)
    if not cond: fails.append(name)

def counts(s):
    return s.ev("""(() => { const d = __app.world.deko; if (!d) return null;
      return { bloom: d.bloom.visible ? d.bloom.geometry.instanceCount : 0, shaft: d.shaft && d.shaft.visible ? d.shaft.geometry.instanceCount : 0,
               fluff: d.fluff && d.fluff.visible ? d.fluff.geometry.drawRange.count : 0, dq: __app.world.constructor && window.__G ? 0 : 0 }; })()""")

with sync_playwright() as pw:
    # 1) Deko an: alle Welten bauen, Schichten da, Stufen
    s = Session(pw)
    reqs = []
    s.pg.on('request', lambda r: reqs.append(r.url))
    s.open('?nosw'); s.tap('#title'); s.pg.fill('input.name', 'Deko'); s.tap('[data-a=create]')
    s.ev("import('./js/engine/gfx.js').then(m => { window.__G = m.G; })"); time.sleep(0.3)
    for lid in ['1-1', '2-1', '3-1', '4-1', '5-1']:
        s.ev(f"__game.start('{lid}', 'leicht')"); time.sleep(0.8)
        ok(f'welt {lid}: Deko-Schichten gebaut', s.ev("!!__app.world.deko && __app.world.deko.bloom.visible"))
    ok('Nacht: Blüten glimmen (uNight=1)', s.ev("__G.uNight.value") == 1)
    ok('Himmel nach der Landschaft (renderOrder 2)', s.ev("__app.world.sky.renderOrder") == 2)
    ok('Titel-Hinweis neu', 'Blumenwiese' in s.ev("__app.ui.s_title()"))
    c = {}
    for q in [2, 1, 0]:
        s.ev(f"__game.setQuality({q})"); s.ev("__game.start('1-1', 'leicht')"); time.sleep(0.6)
        c[q] = s.ev("(() => { const d = __app.world.deko; return { bloom: d.bloom.visible ? d.bloom.geometry.instanceCount : 0, shaft: d.shaft.visible ? d.shaft.geometry.instanceCount : 0, fluff: d.fluff.visible ? d.fluff.geometry.drawRange.count : 0, dq: __G.uDq.value }; })()")
    ok('Stufen: Hoch ≥ Mittel ≥ Niedrig, Niedrig = aus', c[2]['bloom'] > c[1]['bloom'] > 0 and c[0] == {'bloom': 0, 'shaft': 0, 'fluff': 0, 'dq': 0}, json.dumps(c))
    # Auto-Drosselung: Auflösung unter die Stufe gesenkt → Deko halbiert (wie renderer.sample es tut)
    s.ev("__game.setQuality(1)"); s.ev("__game.start('1-1', 'leicht')"); time.sleep(0.5)
    full = s.ev("__app.world.deko.bloom.geometry.instanceCount")
    s.ev("(() => { const r = __app.renderer; r.mode = 'auto'; r.dpr = Math.min(r.q.dpr, devicePixelRatio) - 0.25; r.resize(true); r.onTier(r.q); })()"); time.sleep(0.3)
    half = s.ev("__app.world.deko.bloom.geometry.instanceCount"); dq = s.ev("__G.uDq.value")
    ok('Auto-Drosselung halbiert die Deko', half * 2 == full and dq == 0.5, f'{full} → {half}, uDq {dq}')
    s.ev("(() => { const r = __app.renderer; r.dpr = Math.min(r.q.dpr, devicePixelRatio); r.resize(true); r.onTier(r.q); })()"); time.sleep(0.3)
    ok('… und gibt sie wieder frei', s.ev("__app.world.deko.bloom.geometry.instanceCount") == full)
    # Spielen mit Deko: Sieg ohne Fehler, Flügelstaub läuft über den Partikel-Pool
    s.ev("__game.start('1-1', 'leicht')"); time.sleep(0.5)
    s.ev("__app.input.injected = {turn: 0, climb: 0}"); time.sleep(1.5)
    ok('Flügelstaub (Partikel leben)', s.ev("__app.bursts.n") > 0, s.ev("__app.bursts.n"))
    for i in range(30):
        if s.ev("__app.game.state") == 'won': break
        s.ev("__game.step()"); time.sleep(0.1)
    ok('Level mit Deko gewonnen', s.ev("__app.game.state") == 'won')
    ext = [u for u in reqs if not u.startswith(('http://localhost', BASE))]
    ok('keine externen Requests', not ext, ext[:3])
    ok('keine Fehler (Deko an)', not s.errors, s.errors[:3])
    s.close()
    # 2) ?deko=0: altes Aussehen (keine Schichten, alter Himmel, alter Titel)
    s = Session(pw)
    s.open('?nosw&deko=0'); s.tap('#title'); s.pg.fill('input.name', 'Alt'); s.tap('[data-a=create]')
    s.ev("import('./js/engine/gfx.js').then(m => { window.__G = m.G; })"); time.sleep(0.3)
    for lid in ['1-1', '5-1']:
        s.ev(f"__game.start('{lid}', 'leicht')"); time.sleep(0.8)
        ok(f'deko=0 {lid}: keine Deko-Schichten', s.ev("__app.world.deko") is None)
    ok('deko=0: Nachtblüten aus, alter Himmel', s.ev("__G.uNight.value") == 0 and s.ev("__app.world.sky.renderOrder") == -2 and s.ev("__app.world.sky.geometry.parameters.widthSegments") == 32)
    ok('deko=0: alter Titel-Hinweis', '8 Missionen' in s.ev("__app.ui.s_title()"))
    ok('deko=0: keine Fehler', not s.errors, s.errors[:3])
    s.close()
    # 3) prefers-reduced-motion: kein Kamera-Ruckeln, halber Partikelregen, langsamere Schirmchen
    s = Session(pw)
    s.ctx.close(); s.ctx = s.b.new_context(**PIXEL7, reduced_motion='reduce'); s.pg = s.ctx.new_page()
    s.errors = []; s.pg.on("pageerror", lambda e: s.errors.append(str(e)))
    s.open('?nosw'); s.tap('#title'); s.pg.fill('input.name', 'RM'); s.tap('[data-a=create]')
    s.ev("__game.start('1-1', 'leicht')"); time.sleep(0.6)
    s.ev("__game.freeze(true)"); s.ev("__app.bursts.clear()")
    s.ev("__app.bursts.emit({ n: 40, pos: __app.player.pos, colors: [0xffffff] })")
    n = s.ev("__app.bursts.n")
    ok('RM: halber Partikelregen', n == 20, n)
    s.ev("__game.freeze(false)")
    s.ev("__app.player.kick(4, 0.5)"); time.sleep(0.05)
    y = []
    for i in range(8):
        y.append(s.ev("(() => { const c = __app.camera, p = __app.player; return c.position.y - p.camPos.y; })()")); time.sleep(0.03)
    ok('RM: Kamera ruckelt nicht', max(abs(v) for v in y) < 1e-6, [round(v, 4) for v in y])
    ok('RM: Schirmchen langsamer', s.ev("__app.world.deko.fluff.material.uniforms.uSlow.value") < 1)
    ok('RM: keine Fehler', not s.errors, s.errors[:3])
    s.close()
print('fehler', fails)
print('ALLES OK' if not fails else 'FEHLER')
