# v2.6 Zielanzeige statt 3D-Pfeil: Stern-Marker über dem Ziel (Ziel im Bild) bzw. Randpfeil links/rechts (Ziel außerhalb/
# hinten), Höhe nur als ▲/▼-Abzeichen. Alle 5 Welten, hoch (412×915) und quer (915×412). Fälle: voraus (Marker über dem
# Ziel, Abstand in px), links/rechts außerhalb (richtige Seite, unabhängig aus der Kamera gerechnet), genau hinten (3 s hin-
# und herdrehen: kein Seitenwechsel; dem Pfeil folgen bringt das Ziel ins Bild), tief/hoch (Abzeichen, nie senkrecht), nah
# (aus), Schwer (nichts). Kriterium: kein Element zeigt nach oben, wenn das Ziel auf gleicher Höhe voraus liegt.
# Bilder: tests/shots/v26/ziel_<fall>_<hoch|quer>.jpg + alt (?ziel=pfeil) für die Vergleichs-Collage vergleich_<ori>.jpg
# Aufruf: python3 tests/test_v26_ziel.py [hoch|quer] [--noalt]
import time, json, sys, os, math
sys.path.insert(0, 'tests')
from util import *
from PIL import Image, ImageDraw, ImageFont
OUT = 'tests/shots/v26'
os.makedirs(OUT, exist_ok=True); os.makedirs('tests/out', exist_ok=True)
WORLDS = [('1-1', 'wiese'), ('2-1', 'sonne'), ('3-1', 'teich'), ('4-3', 'kirsch'), ('5-1', 'abend')]
ORIS = [o for o in ('hoch', 'quer') if o in sys.argv[1:]] or ['hoch', 'quer']
ALT = '--noalt' not in sys.argv
DPR = 1.5

def sim_wait(s, sec):
    t0 = s.ev("__app.t")
    while s.ev("__app.t") - t0 < sec: time.sleep(0.02)

# Figur relativ zum aktuellen Ziel hinstellen: Abstand D waagrecht, dy = Figur minus Ziel (m), Blick = Zielrichtung + off (rad);
# mindestens 2,6 m über dem Boden (sonst steckt die Figur quer im hohen Gras und ist auf den Bildern nicht zu sehen)
PLACE = """([D, dy, off]) => { const g = __app.game, p = __app.player, tg = g.guideTarget(); if (!tg) return null;
  p.stunt = null; if (p.landed) p.takeoff(); p.frozen = false; p.baseSpeed = p.speed = 0.01; // fast stehend (Figur-Mesh folgt mit)
  const a = Math.atan2(tg.x - p.pos.x, tg.z - p.pos.z) || 0;
  const x = tg.x - Math.sin(a) * D, z = tg.z - Math.cos(a) * D;
  p.pos.set(x, Math.max(tg.y + dy, __H(x, z) + 2.6), z); p.yaw = a + off; p.yawRate = 0; p.pitch = 0; p.camInit = false;
  __app.input.injected = {turn: 0, climb: 0}; return [+tg.x.toFixed(2), +tg.y.toFixed(2), +tg.z.toFixed(2)]; }"""

MEASURE = """(() => { const g = __app.game, S = g.guide, cam = __app.camera, THREE = __app.THREE, W = innerWidth, H = innerHeight, p = __app.player;
  const tg = g.guideTarget();
  const bend = (q) => { const v = q.clone(); v.y -= 0.0009 * ((q.x - cam.position.x) ** 2 + (q.z - cam.position.z) ** 2); return v; };
  const px = (q) => { const v = bend(q).project(cam); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H, v.z]; };
  const rc = (sel) => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return b.width ? [b.left, b.top, b.right, b.bottom].map(v => +v.toFixed(1)) : null; };
  const shown = (sel) => { const e = document.querySelector(sel), cs = getComputedStyle(e); return cs.visibility === 'visible' && +cs.opacity > 0.05 && cs.display !== 'none'; };
  const op = (sel) => +getComputedStyle(document.querySelector(sel)).opacity;
  const t = tg ? px(tg) : null, top = tg ? px(tg.clone().setY(tg.y + g.guideMarks(tg))) : null; // Oberkante Ziel (Ring-Radius …)
  // Seite unabhängig vom Spielcode: Kamera-Rechts-Vektor · (Ziel − Kamera)
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion), fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
  const rel = tg ? tg.clone().sub(cam.position) : null;
  const m = { on: shown('#guide .gm'), op: op('#guide .gm'), rect: rc('#guide .gm'), star: rc('#guide .gm .st'), tip: rc('#guide .gm .tip'), badge: shown('#guide .gm .bdg') ? document.querySelector('#guide .gm .bdg').textContent : '' };
  const e = { on: shown('#guide .ge'), op: op('#guide .ge'), rect: rc('#guide .ge svg'), left: document.querySelector('#guide .ge').classList.contains('l'), badge: shown('#guide .ge .bdg') ? document.querySelector('#guide .ge .bdg').textContent : '', brect: rc('#guide .ge .bdg') };
  const hud = { top: rc('.hudtop'), pause: rc('#bPause'), tasks: rc('#tasks'), timer: rc('#timer'), show: rc('#bShow'), zu: rc('#zones .zu i'), zd: rc('#zones .zd i'), zl: rc('#zones .zl i'), zr: rc('#zones .zr i') };
  const ov = (a, b) => !!a && !!b && a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
  const hits = (r) => Object.entries(hud).filter(([k, h]) => ov(r, h)).map(([k]) => k);
  return { W, H, mode: S.mode, side: S.side, clamp: S.clamp, aM: +S.aM.toFixed(3), aE: +S.aE.toFixed(3), size: +S.size.toFixed(1),
    td: tg ? +tg.distanceTo(p.pos).toFixed(1) : null, dy: tg ? +(tg.y - p.pos.y).toFixed(2) : null,
    t: t && t.map(v => +v.toFixed(1)), top: top && top.map(v => +v.toFixed(1)), expSide: rel ? Math.sign(rel.dot(right)) : 0, ahead: rel ? +rel.clone().setY(0).normalize().dot(fwd.clone().setY(0).normalize()).toFixed(3) : 0,
    m, e, mHit: m.on ? hits(m.rect) : [], eHit: e.on ? hits(e.rect) : [], toast: document.querySelector('#toast').classList.contains('show') };
})()"""

# Ziel (Tropfen) anheben/absenken: Grundlage + aktuelle Lage (sonst setzt das Wippen es sofort zurück)
RAISE = "(() => { const g = __app.game, tg = g.guideTarget(), it = g.tasks[0].items.find(i => i.pos === tg); it.base.y += %s; it.pos.y += %s; })()"

def shot(s, name):
    s.ev("__game.freeze(true)"); time.sleep(0.25)
    png = f'{OUT}/{name}.png'; s.pg.screenshot(path=png); s.ev("__game.freeze(false)")
    Image.open(png).convert('RGB').save(png[:-4] + '.jpg', quality=86); os.remove(png)

def setup(s, lid, diff='leicht', solo=False):
    s.ev(f"__game.start('{lid}', '{diff}')"); sim_wait(s, 0.5)
    if solo:  # nur ein Tropfen offen → das Ziel bleibt dasselbe, egal wo die Figur steht
        s.ev("(() => { const t = __app.game.tasks[0], it = t.items.find(i => !i.taken); t.items.forEach(i => { if (i !== it) i.taken = true; }); })()")
    s.ev("__app.game.diffCfg = { ...__app.game.diffCfg, magnet: 0 }")
    s.ev("__app.ui.hideHints()")

def place(s, D, dy, off, settle=0.7):
    r = s.ev(PLACE, [D, dy, off]); s.ev("__app.ui.hideHints()"); sim_wait(s, settle); s.ev("__app.ui.hideHints()"); sim_wait(s, 0.15)
    return r

def marker_ok(m, strict=True):
    """Marker sichtbar, Spitze unten mittig über der Ziel-Projektion, nichts zeigt nach oben."""
    M = m['m']
    if not (m['mode'] == 'marker' and M['on'] and M['tip'] and M['star'] and m['t']): return False, None
    tipx = (M['tip'][0] + M['tip'][2]) / 2; tipb = M['tip'][3]
    gap = min(m['t'][1], m['top'][1]) - tipb     # px zwischen Spitze und Oberkante des Ziels (Spitze liegt darüber)
    dx = tipx - m['t'][0]
    down = (M['tip'][1] + M['tip'][3]) / 2 > (M['star'][1] + M['star'][3]) / 2  # Spitze unter dem Stern = zeigt aufs Ziel
    ok = tipb <= m['t'][1] + 4 and gap < 40 and abs(dx) < 4 and down and M['badge'] != '▲' and not m['e']['on'] and not m['mHit']
    return ok, {'gap': round(gap, 1), 'dx': round(dx, 1), 'down': down}

res = {}
with sync_playwright() as pw:
    for ori in ORIS:
        dev = PIXEL7 if ori == 'hoch' else PIXEL7_LAND
        R = res[ori] = {}
        for variant in (['neu', 'alt'] if ALT else ['neu']):
            s = Session(pw, device=dev, dpr=DPR)
            s.open('?nosw' + ('&ziel=pfeil' if variant == 'alt' else '')); s.tap('#title'); s.pg.fill('input.name', 'Ziel'); s.tap('[data-a=create]')
            s.ev("__game.setQuality(1)")
            s.ev("import('./js/world/terrain.js').then(m => { window.__H = m.height; })"); time.sleep(0.3)
            if variant == 'alt':
                # gleiche Fälle mit dem v2.5-Pfeil, nur Bilder (Collage alt/neu)
                setup(s, '1-1', solo=True); place(s, 20, 0, 0); shot(s, f'ziel_alt_voraus_{ori}')
                place(s, 20, 0, -math.pi / 2); shot(s, f'ziel_alt_links_{ori}')
                place(s, 20, 0, math.pi); shot(s, f'ziel_alt_hinten_{ori}')
                place(s, 16, 16, 0); shot(s, f'ziel_alt_tief_{ori}')
                R['alt_errors'] = s.errors[:5]; s.close(); continue
            # --- Ziel voraus, gleiche Höhe, 20 m: in allen Welten
            for lid, wid in WORLDS:
                setup(s, lid)
                ms = []
                for D in (24, 16, 11):
                    place(s, D, 0, 0); ms.append(s.ev(MEASURE))
                    if D == 16: shot(s, f'ziel_voraus_{wid}_{ori}')
                chk = [marker_ok(m) for m in ms]
                ok = all(c[0] for c in chk)
                R['voraus_' + wid] = {'ok': ok, 'detail': [c[1] for c in chk], 'size': [m['size'] for m in ms], 'td': [m['td'] for m in ms],
                                      'op': [m['m']['op'] for m in ms], 'mHit': [m['mHit'] for m in ms]}
                print(ori, 'voraus', wid, 'ok' if ok else 'FEHLER', json.dumps(R['voraus_' + wid]), flush=True)
                if not ok: print('   ', json.dumps(ms[-1]))
            # --- Ziel links / rechts außerhalb (90° seitlich), in Wiese und Abend
            for lid, wid in [('1-1', 'wiese'), ('5-1', 'abend')]:
                setup(s, lid, solo=True)
                for name, off in [('links', -math.pi / 2), ('rechts', math.pi / 2)]:
                    place(s, 20, 0, off); m = s.ev(MEASURE)
                    E = m['e']; cx = (E['rect'][0] + E['rect'][2]) / 2 if E['rect'] else -1
                    exp = m['expSide']
                    ok = (m['mode'] == 'edge' and E['on'] and not m['m']['on'] and m['side'] == exp and E['left'] == (exp < 0)
                          and (cx < m['W'] * 0.3 if exp < 0 else cx > m['W'] * 0.7) and not m['eHit'] and E['badge'] == '')
                    R[f'{name}_{wid}'] = {'ok': ok, 'expSide': exp, 'side': m['side'], 'cx': round(cx), 'W': m['W'], 'eHit': m['eHit'], 'y': E['rect'] and round((E['rect'][1] + E['rect'][3]) / 2)}
                    print(ori, name, wid, 'ok' if ok else 'FEHLER', json.dumps(R[f'{name}_{wid}']), flush=True)
                    if wid == 'wiese': shot(s, f'ziel_{name}_{ori}')
            # --- Ziel genau hinten: 3 s hin- und herdrehen (±0,35 rad um „genau hinten“) → nie Seitenwechsel
            setup(s, '1-1', solo=True)
            # (Figur ±0,25 rad → Kamera-Winkel zum Ziel ±≈0,35 rad, die Kamera sitzt 6 m hinter der Figur; Hysterese 0,5 rad)
            for start in (0.05, -0.05):
                place(s, 22, 0, math.pi + start)
                s.ev("""(() => { const p = __app.player, tg = __app.game.guideTarget(), a0 = Math.atan2(tg.x - p.pos.x, tg.z - p.pos.z) + Math.PI, t0 = __app.t;
                  window.__sides = []; window.__sweep = setInterval(() => { const k = __app.t - t0; p.yaw = a0 + %f + 0.25 * Math.sin(k * 2.2);
                    const S = __app.game.guide; window.__sides.push([S.mode, S.side, +S.ang.toFixed(3)]); }, 8); })()""" % start)
                sim_wait(s, 3.0); s.ev("clearInterval(window.__sweep)")
                sides = s.ev("window.__sides")
                modes = set(x[0] for x in sides); sw = sum(1 for a, b in zip(sides, sides[1:]) if a[1] != b[1])
                key = 'hinten' + ('_a' if start > 0 else '_b')
                abw = max(math.pi - abs(x[2]) for x in sides)  # größte Abweichung von „genau hinten“ (rad)
                R[key] = {'ok': sw == 0 and modes == {'edge'} and len(sides) > 100 and abw > 0.25, 'wechsel': sw, 'modes': sorted(modes), 'n': len(sides),
                          'side': sides[-1][1], 'abweichung_rad': round(abw, 3)}
                print(ori, key, 'ok' if R[key]['ok'] else 'FEHLER', json.dumps(R[key]), flush=True)
                if start > 0: shot(s, f'ziel_hinten_{ori}')
            # dem Randpfeil folgen (Lenkzone auf der gezeigten Seite halten) → Ziel kommt ins Bild, ohne Seitenwechsel
            place(s, 26, 0, math.pi + 0.05)
            side = s.ev("__app.game.guide.side")
            s.ev("""((side) => { window.__fol = []; __app.input.injected = {turn: side, climb: 0};
              window.__folI = setInterval(() => { const S = __app.game.guide; window.__fol.push([S.mode, S.side, +__app.t.toFixed(2)]); }, 8); })""" + f"({side})")
            sim_wait(s, 3.0); s.ev("clearInterval(window.__folI); __app.input.injected = {turn: 0, climb: 0}")
            fol = s.ev("window.__fol")
            first = next((x[2] for x in fol if x[0] == 'marker'), None)
            sw = sum(1 for a, b in zip(fol, fol[1:]) if a[0] == 'edge' and b[0] == 'edge' and a[1] != b[1])
            R['folgen'] = {'ok': first is not None and sw == 0, 'side': side, 'marker_nach_s': first and round(first - fol[0][2], 2), 'wechsel': sw}
            print(ori, 'folgen', 'ok' if R['folgen']['ok'] else 'FEHLER', json.dumps(R['folgen']), flush=True)
            # --- Ziel tief unten / hoch oben, seitlich außerhalb: Randpfeil + ▼/▲, Haupt-Anzeige waagrecht
            setup(s, '1-1', solo=True)
            for name, dy, badge in [('tief', 12, '▼'), ('hoch', -10, '▲')]:
                if dy < 0:  # Ziel 10 m über die Figur heben (Figur bleibt über dem Boden)
                    s.ev(RAISE % (14, 14))
                place(s, 18, dy, -math.pi / 2); m = s.ev(MEASURE)
                E = m['e']
                below = E['brect'] and E['rect'] and (E['brect'][1] > E['rect'][3] - 4 if badge == '▼' else E['brect'][3] < E['rect'][1] + 4)
                ok = m['mode'] == 'edge' and E['on'] and E['badge'] == badge and bool(below) and not m['eHit'] and (m['dy'] < -3 if badge == '▼' else m['dy'] > 3)
                R[name] = {'ok': ok, 'dy': m['dy'], 'badge': E['badge'], 'side': m['side'], 'eHit': m['eHit']}
                print(ori, name, 'ok' if ok else 'FEHLER', json.dumps(R[name]), flush=True)
                shot(s, f'ziel_{name}_{ori}')
                if dy < 0: s.ev(RAISE % (-14, -14))
            # tief voraus / hoch voraus (über bzw. unter dem Bildrand): Stern am Rand ohne Spitze + ▼/▲; liegt das Ziel
            # doch noch im Bild, zeigt der Stern ganz normal darauf (ohne Abzeichen). Nie ein senkrechter Pfeil.
            for name, D, dy, lift, badge in [('tiefvoraus', 3, 25, 0, '▼'), ('hochvoraus', 7, -1, 30, '▲')]:
                if lift: s.ev(RAISE % (lift, lift))
                place(s, D, dy - lift if lift else dy, 0, settle=0.9); m = s.ev(MEASURE)
                M = m['m']
                if m['mode'] == 'marker' and m['clamp']:
                    ok = M['on'] and not M['tip'] and M['badge'] == badge and not m['mHit']
                elif m['mode'] == 'marker':
                    ok = marker_ok(m)[0] and M['badge'] == ''
                else:
                    ok = m['e']['on'] and m['e']['badge'] == badge
                R[name] = {'ok': ok, 'mode': m['mode'], 'clamp': m['clamp'], 'tip': bool(M['tip']), 'badge': M['badge'] or m['e']['badge'], 'dy': m['dy'], 't': m['t'], 'H': m['H'], 'mHit': m['mHit']}
                print(ori, name, 'ok' if ok else 'FEHLER', json.dumps(R[name]), flush=True)
                shot(s, f'ziel_{name}_{ori}')
                if lift: s.ev(RAISE % (-lift, -lift))
            # --- nah: unter 6 m ausgeblendet
            place(s, 4.5, 0.5, 0, settle=1.0); m = s.ev(MEASURE)
            R['nah'] = {'ok': not m['m']['on'] and not m['e']['on'] and m['aM'] < 0.05, 'td': m['td'], 'aM': m['aM'], 'aE': m['aE']}
            print(ori, 'nah', 'ok' if R['nah']['ok'] else 'FEHLER', json.dumps(R['nah']), flush=True)
            shot(s, f'ziel_nah_{ori}')
            # --- Toast über dem Stern → ausgeblendet (wie beim alten Pfeil): Höhe suchen, bei der der Stern genau unter der
            # Meldung läge, dann Meldung zeigen
            tr = s.ev("(() => { const b = document.querySelector('#toast').getBoundingClientRect(); return [b.left, b.top, b.right, b.top + 54]; })()")
            hit = None
            s.ev(RAISE % (25, 25))  # Ziel hoch in die Luft, damit die Figur auch weit darunter fliegen kann
            for D, dy in [(D, x * -0.5) for D in (14, 22) for x in range(0, 50)]:
                place(s, D, dy, 0, settle=0.4); m = s.ev(MEASURE); r = m['m']['rect']
                if m['m']['on'] and r and r[1] < tr[3] and r[3] > tr[1] and r[0] < tr[2] and r[2] > tr[0]: hit = dy; break
            s.ev("__app.ui.toast('✨ Probe-Meldung für den Test ✨')"); sim_wait(s, 0.8)
            m = s.ev(MEASURE)
            R['toast'] = {'ok': hit is not None and not m['m']['on'] and m['aM'] < 0.05, 'dy': hit, 'on': m['m']['on'], 'aM': m['aM'], 'toast': [round(v) for v in tr]}
            print(ori, 'toast', 'ok' if R['toast']['ok'] else 'FEHLER', json.dumps(R['toast']), flush=True)
            shot(s, f'ziel_toast_{ori}')
            s.ev("__app.ui.hideHints()"); s.ev(RAISE % (-25, -25))
            # --- Joystick-Steuerung: Randpfeil am Bildrand auf Figurenhöhe
            s.ev("__app.setSetting('control', 'stick')"); sim_wait(s, 0.7)
            place(s, 20, 0, -math.pi / 2); m = s.ev(MEASURE); E = m['e']
            cx = (E['rect'][0] + E['rect'][2]) / 2 if E['rect'] else -1
            R['stick'] = {'ok': E['on'] and m['side'] == m['expSide'] and (cx < m['W'] * 0.2 if m['expSide'] < 0 else cx > m['W'] * 0.8) and not m['eHit'], 'cx': round(cx), 'side': m['side']}
            print(ori, 'stick', 'ok' if R['stick']['ok'] else 'FEHLER', json.dumps(R['stick']), flush=True)
            s.ev("__app.setSetting('control', 'zones')")
            # --- Schwer: keine Anzeige
            setup(s, '1-1', 'schwer', solo=True)
            seen = []
            for off in (0, -math.pi / 2, math.pi):
                place(s, 20, 0, off); m = s.ev(MEASURE); seen.append(m['m']['on'] or m['e']['on'])
            R['schwer'] = {'ok': not any(seen), 'seen': seen}
            print(ori, 'schwer', 'ok' if R['schwer']['ok'] else 'FEHLER', json.dumps(R['schwer']), flush=True)
            shot(s, f'ziel_schwer_{ori}')
            R['errors'] = s.errors[:5]
            s.close()

def label(im, txt):
    d = ImageDraw.Draw(im)
    try: f = ImageFont.truetype('arial.ttf' if sys.platform == 'win32' else '/System/Library/Fonts/Supplemental/Arial Bold.ttf', 22)
    except Exception: f = ImageFont.load_default()
    d.rectangle([0, 0, im.width, 34], fill=(255, 255, 255)); d.text((10, 6), txt, fill=(40, 20, 50), font=f)
    return im

# Kontaktbögen + Vergleich alt/neu
for ori in ORIS:
    try:
        sc = 0.42 if ori == 'hoch' else 0.5
        ims = [Image.open(f'{OUT}/ziel_voraus_{w}_{ori}.jpg') for _, w in WORLDS]
        w, h = [int(v * sc) for v in ims[0].size]
        if ori == 'hoch':
            out = Image.new('RGB', (w * 5, h))
            for i, im in enumerate(ims): out.paste(im.resize((w, h)), (i * w, 0))
        else:
            out = Image.new('RGB', (w, h * 5))
            for i, im in enumerate(ims): out.paste(im.resize((w, h)), (0, i * h))
        out.save(f'{OUT}/ziel_welten_{ori}.jpg', quality=84)
        if ALT:
            cases = [('voraus', 'Ziel voraus', 'ziel_voraus_wiese'), ('links', 'Ziel links', 'ziel_links'), ('hinten', 'Ziel hinten', 'ziel_hinten'), ('tief', 'Ziel tief unten', 'ziel_tief')]
            cols = []
            for c, txt, neu in cases:
                a = label(Image.open(f'{OUT}/ziel_alt_{c}_{ori}.jpg').resize((w, h)), 'ALT v2.5: ' + txt)
                n = label(Image.open(f'{OUT}/{neu}_{ori}.jpg').resize((w, h)), 'NEU v2.6: ' + txt)
                cols.append((a, n))
            if ori == 'hoch':
                out = Image.new('RGB', (w * 4, h * 2), 'white')
                for i, (a, n) in enumerate(cols): out.paste(a, (i * w, 0)); out.paste(n, (i * w, h))
            else:
                out = Image.new('RGB', (w * 2, h * 4), 'white')
                for i, (a, n) in enumerate(cols): out.paste(a, (0, i * h)); out.paste(n, (w, i * h))
            out.save(f'{OUT}/vergleich_{ori}.jpg', quality=84)
    except Exception as e:
        print('bogen', ori, e)

json.dump(res, open('tests/out/v26_ziel.json', 'w'), indent=1)
bad = [f'{o}:{k}' for o, r in res.items() for k, v in r.items() if isinstance(v, dict) and not v.get('ok')]
errs = [e for r in res.values() for k in ('errors', 'alt_errors') for e in r.get(k, [])]
print('fehler', bad)
print('errors', errs)
print('ok', not bad and not errs)
