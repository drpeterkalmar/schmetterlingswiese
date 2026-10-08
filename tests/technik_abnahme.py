# v2.9 Technik-Abnahme: dieselben Szenen in mehreren Varianten (Stand/Ordner + URL-Regler) fotografieren, nebeneinander
# legen und den Pixel-Unterschied messen. Browser per `open` wie tests/perf_gate.py (sonst 15 Bilder/s durch die geerbte
# macOS-Drosselung), genau EIN Browser zur Zeit.
# Aufruf: python3 tests/technik_abnahme.py --out tests/shots/technik/r186 --var main=../butterfly_vorher::?nosw \
#           --var r186=.::?nosw&skala=0&ringe=0 … [--szenen menue,wiese,teich] [--geraete hoch,quer] [--q 1]
# Ergebnis: <out>/<szene>_<gerät>_<variante>.png, <out>/vergleich_<gerät>.jpg, Unterschiede + Fehler auf stdout.
import os, sys, json, time, argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from perf_gate import OffenerBrowser, Server, profil, GPU_ARGS, REPO
from playwright.sync_api import sync_playwright

# Hilfen im Spiel: Zeit festsetzen (Menü-Schaukasten ist dann bis auf frei fliegende Tiere deterministisch)
INIT = """window.__fixZeit = (T) => { __game.freeze(true); __app.t = T;
  let u = null; __app.scene.traverse(o => { const m = o.material; if (!u && m && m.uniforms && m.uniforms.uTime) u = m.uniforms.uTime; });
  if (u) u.value = T; if (__app.mode !== 'game') __app.showcaseUpdate(0, T);
  __app.world.update(0, __app.camera, __app.player.pos); };"""

def menue(wid, T=7.0):
    return [f"__app.menuWorld('{wid}')", {'warte': 2.5}, f"__fixZeit({T})", {'warte': 0.6}]
def flug(lid, sek=2.6, gegen=False, extra=None):
    s = [f"__game.start('{lid}', 'leicht')", {'warte': 1.5}]
    if gegen: s.append("__app.player.yaw = __app.world.def.sun.az")
    s += ["__app.input.injected = {turn: 0, climb: 0}", {'warte': sek}]
    if extra: s += extra
    s += ["__game.freeze(true)", {'warte': 0.5}]
    return s

SZENEN = {
    'menue': menue('wiese'), 'menue_teich': menue('teich'), 'menue_kirsch': menue('kirsch'), 'menue_abend': menue('abend'),
    'menue_sonne': menue('sonne'),
    'wiese': flug('1-1'), 'sonne': flug('2-1'), 'teich': flug('3-1'), 'kirsch': flug('4-1'), 'abend': flug('5-1'),
    'kirschgegen': flug('4-1', gegen=True), 'wiesegegen': flug('1-1', gegen=True),
    # Figur dicht über dem Boden (Kontaktschatten), Kamera von schräg oben
    'boden': flug('1-1', sek=2.0, extra=["__app.input.injected = {turn: 0, climb: -1}", {'warte': 1.6}]),
}

def foto(pw, base, query, steps, geraet, dpr, pfad, q):
    b = OffenerBrowser(pw, GPU_ARGS)
    try:
        ctx = b.new_context(**profil(geraet, dpr)); ctx.add_init_script(INIT)
        pg = ctx.new_page(); fehler = []
        pg.on('pageerror', lambda e: fehler.append('PAGEERROR ' + str(e)))
        pg.on('console', lambda m: fehler.append(m.type.upper() + ' ' + m.text) if m.type in ('error', 'warning') else None)
        pg.goto(base + 'index.html' + query)
        pg.wait_for_function('window.__app && window.__game && window.__app.frames > 3', timeout=120000)
        pg.evaluate(f"__game.progress.create('Bild'); __game.setQuality({q})"); time.sleep(0.8)
        for s in steps:
            if isinstance(s, str): pg.evaluate(s)
            else: time.sleep(s['warte'])
        pg.screenshot(path=pfad)
        info = pg.evaluate("(() => { const i = __game.info(); return { calls: i.calls, tier: i.tier, skala: i.skala, rt: i.rt }; })()")
        return fehler, info
    finally:
        try: ctx.close()
        except Exception: pass
        b.close()

def unterschied(a, b):
    import numpy as np
    from PIL import Image
    A = np.asarray(Image.open(a).convert('RGB'), dtype=np.int16); B = np.asarray(Image.open(b).convert('RGB'), dtype=np.int16)
    if A.shape != B.shape: return None
    d = np.abs(A - B).max(axis=2)
    return round(float(d.mean()), 2), round(float((d > 24).mean() * 100), 2)

def collage(out, geraet, szenen, varianten, breite):
    from PIL import Image, ImageDraw, ImageFont
    try: F = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 17)
    except Exception: F = ImageFont.load_default()
    ims = {(s, v): Image.open(f'{out}/{s}_{geraet}_{v}.png').convert('RGB') for s in szenen for v in varianten if os.path.exists(f'{out}/{s}_{geraet}_{v}.png')}
    if not ims: return
    f0 = next(iter(ims.values())); h = int(f0.height * breite / f0.width)
    S = Image.new('RGB', (len(varianten) * breite, len(szenen) * (h + 26)), 'white'); d = ImageDraw.Draw(S)
    for i, s in enumerate(szenen):
        for j, v in enumerate(varianten):
            if (s, v) in ims: S.paste(ims[(s, v)].resize((breite, h)), (j * breite, i * (h + 26) + 26))
            d.text((j * breite + 6, i * (h + 26) + 4), f'{v} · {s}', fill='black', font=F)
    p = f'{out}/vergleich_{geraet}.jpg'; S.save(p, quality=84); print('→', p, S.size)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', required=True); ap.add_argument('--var', action='append', required=True, metavar='NAME=ORDNER::QUERY')
    ap.add_argument('--szenen', default='menue,wiese,teich'); ap.add_argument('--geraete', default='hoch,quer')
    ap.add_argument('--dpr', type=float, default=2.625); ap.add_argument('--q', default='1'); ap.add_argument('--breite', type=int, default=0)
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    var = []
    for x in a.var:
        n, rest = x.split('=', 1); w, q = rest.split('::', 1)
        var.append((n, os.path.abspath(os.path.join(REPO, w)), q))
    szenen = a.szenen.split(',')
    from contextlib import ExitStack
    with ExitStack() as st, sync_playwright() as pw:
        srv = {w: st.enter_context(Server(w)) for w in set(v[1] for v in var)}
        for g in a.geraete.split(','):
            for s in szenen:
                for n, w, q in var:
                    p = f'{a.out}/{s}_{g}_{n}.png'
                    try: fe, info = foto(pw, srv[w].base, q, SZENEN[s], g, a.dpr, p, a.q)
                    except Exception as e: fe, info = ['FEHLER ' + str(e)[:200]], None
                    d = unterschied(f'{a.out}/{s}_{g}_{var[0][0]}.png', p) if n != var[0][0] and os.path.exists(p) else None
                    print(f'{s} {g} {n}: info {json.dumps(info)}' + (f' | Δ zu {var[0][0]}: Mittel {d[0]}/255, {d[1]} % Pixel > 24' if d else '') + (f' | {fe[:4]}' if fe else ''), flush=True)
            collage(a.out, g, szenen, [v[0] for v in var], a.breite or (300 if g == 'hoch' else 560))

if __name__ == '__main__':
    main()
