# v2.1 Vorher/Nachher-Bilder: Wolken, Glühwürmchen-Abend, Garderobe (hoch/quer), Flügel-Nahaufnahme
# Aufruf: [BASE=...] python3 tests/test_v21_shots.py <label>   → tests/shots/v21/<label>_*.png
import time, sys, os
sys.path.insert(0, 'tests')
from util import *
LABEL = sys.argv[1] if len(sys.argv) > 1 else 'nachher'
OUT = 'tests/shots/v21'
os.makedirs(OUT, exist_ok=True)

def shot(s, name):
    s.pg.screenshot(path=f'{OUT}/{LABEL}_{name}.png')

def cam(s, js_pos, js_look, fov=55):
    s.ev(f"""(() => {{ __game.freeze(true); const c = __app.camera; const P = {js_pos}, L = {js_look};
      c.position.set(P[0], P[1], P[2]); c.lookAt(L[0], L[1], L[2]); c.fov = {fov}; c.updateProjectionMatrix();
      __app.world.update(0.016, c, c.position); }})()""")
    time.sleep(1.0)

def ward(s, tab, bottom):
    s.ev("__app.ui.show('map')"); time.sleep(0.3)
    s.tap('[data-a=wardrobe]'); time.sleep(0.4)
    s.tap(f'[data-a=wtab][data-v={tab}]'); time.sleep(0.4)
    if bottom: s.ev("(() => { const g = document.querySelector('#wardrobe .grid'); g.scrollTop = g.scrollHeight; })()")
    time.sleep(0.6)

with sync_playwright() as pw:
    s = Session(pw, dpr=1.5)
    s.open(); s.tap('#title'); s.pg.fill('input.name', 'Bild'); s.tap('[data-a=create]')
    s.ev("__game.setQuality(1)")
    # --- Garderobe hoch
    ward(s, 'hut', False); shot(s, 'garderobe_hut_P')
    ward(s, 'hut', True); shot(s, 'garderobe_hut_unten_P')
    # Tab-Leiste: sind alle Tabs vollständig sichtbar?
    tabs = s.ev("""[...document.querySelectorAll('#wardrobe .tabs button')].map(b => { const r = b.getBoundingClientRect(), c = b.parentElement.getBoundingClientRect(); return [b.textContent.trim(), Math.round(r.left), Math.round(r.right), r.left >= c.left - 0.5 && r.right <= c.right + 0.5 && r.left >= 0 && r.right <= innerWidth]; })""")
    last = s.ev("""(() => { const g = document.querySelector('#wardrobe .grid'), it = [...g.querySelectorAll('.item')].pop(), b = document.querySelector('[data-a=wdone]');
      const ri = it.getBoundingClientRect(), rg = g.getBoundingClientRect(), rb = b.getBoundingClientRect();
      return { itemBottom: Math.round(ri.bottom), gridBottom: Math.round(rg.bottom), buttonTop: Math.round(rb.top), sichtbar: ri.bottom <= rg.bottom + 0.5 && ri.bottom <= rb.top }; })()""")
    print('Hoch – Tabs', tabs, 'letzte Reihe', last, flush=True)
    s.ev("__app.ui.show('map')")
    # Flügel (Randpunkte, Flügelansatz): Kamera relativ zur Figur
    s.ev("__game.start('1-1', 'leicht')"); time.sleep(2.0)
    for name, loc in [('oben', [0, 6.5, -2.5]), ('seite', [6, 1.2, 0.8]), ('schraeg', [4, 4, -4])]:
        s.ev(f"""(() => {{ __game.freeze(true); const r = __app.player.critter.root, c = __app.camera; r.updateMatrixWorld(true);
          const V = c.position.constructor, p = r.localToWorld(new V({loc[0]}, {loc[1]}, {loc[2]})), t = r.localToWorld(new V(0, 0.05, 0));
          c.position.copy(p); c.lookAt(t); c.fov = 45; c.updateProjectionMatrix(); }})()""")
        time.sleep(1.0)
        s.pg.screenshot(path=f'{OUT}/{LABEL}_fluegel_{name}.png', clip={'x': 56, 'y': 240, 'width': 300, 'height': 420})
    s.ev("__game.freeze(false)")
    # --- Wolken (Frühlingswiese, Kirschhain): Blick vom Spieler zur nächsten Wolke, halb von unten
    for lid in ['1-1', '4-1']:
        s.ev(f"__game.start('{lid}', 'leicht')"); time.sleep(2.0)
        near = """(() => { let best = null, bd = 1e9; for (const im of __app.world.clouds.children) for (const p of im.userData.pts) { const d = Math.hypot(p.x, p.z); if (d < bd) { bd = d; best = p; } } return best; })()"""
        s.ev(f"window.__cl = {near}")
        cam(s, "[__cl.x * 0.35, __cl.y * 0.35 + 8, __cl.z * 0.35]", "[__cl.x, __cl.y + 4, __cl.z]", 50)
        shot(s, f'wolke_{lid}')
        s.ev("__game.freeze(false)")
        s.ev("__game.autopilot(true)"); t0 = s.ev("__app.t")
        while s.ev("__app.t") - t0 < 4: time.sleep(0.3)
        s.ev("""(() => { const c = __app.camera; c.rotation.x += 0.25; })()""")
        s.ev("__game.freeze(true)"); time.sleep(0.4)
        s.ev("(() => { const c = __app.camera; c.lookAt(c.position.x + Math.sin(__app.player.yaw) * 100, c.position.y + 38, c.position.z + Math.cos(__app.player.yaw) * 100); })()")
        time.sleep(0.8); shot(s, f'himmel_{lid}')
        s.ev("__game.freeze(false)"); s.ev("__game.autopilot(false)")
    # --- Glühwürmchen-Abend: Spielansicht + Horizont
    s.ev("__game.start('5-1', 'leicht')"); time.sleep(1.5)
    s.ev("__game.autopilot(true)"); t0 = s.ev("__app.t")
    while s.ev("__app.t") - t0 < 5: time.sleep(0.3)
    shot(s, 'abend_spiel')
    s.ev("__game.freeze(true)")
    s.ev("(() => { const c = __app.camera; c.lookAt(c.position.x + Math.sin(__app.player.yaw) * 100, c.position.y + 12, c.position.z + Math.cos(__app.player.yaw) * 100); })()")
    time.sleep(0.8); shot(s, 'abend_horizont')
    s.ev("__game.freeze(false)"); s.ev("__game.autopilot(false)")
    s.ev("__app.ui.show('map')")
    s.close()
    # --- Garderobe quer
    s = Session(pw, device=PIXEL7_LAND, dpr=1.5)
    s.open(); s.tap('#title'); s.pg.fill('input.name', 'Bild'); s.tap('[data-a=create]')
    s.ev("__game.setQuality(1)")
    ward(s, 'hut', False); shot(s, 'garderobe_hut_L')
    ward(s, 'hut', True); shot(s, 'garderobe_hut_unten_L')
    tabs = s.ev("""[...document.querySelectorAll('#wardrobe .tabs button')].map(b => { const r = b.getBoundingClientRect(), c = b.parentElement.getBoundingClientRect(); return [b.textContent.trim(), Math.round(r.left), Math.round(r.right), r.left >= c.left - 0.5 && r.right <= c.right + 0.5]; })""")
    last = s.ev("""(() => { const g = document.querySelector('#wardrobe .grid'), it = [...g.querySelectorAll('.item')].pop(), b = document.querySelector('[data-a=wdone]');
      const ri = it.getBoundingClientRect(), rg = g.getBoundingClientRect(), rb = b.getBoundingClientRect();
      return { itemBottom: Math.round(ri.bottom), gridBottom: Math.round(rg.bottom), buttonTop: Math.round(rb.top), sichtbar: ri.bottom <= rg.bottom + 0.5 && ri.bottom <= rb.top }; })()""")
    print('Quer – Tabs', tabs, 'letzte Reihe', last, flush=True)
    print('errors', s.errors[:5])
    s.close()
