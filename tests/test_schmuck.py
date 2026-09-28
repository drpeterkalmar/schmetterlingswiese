# v2.3 Optik-Runde: jede neue Deko-/Tierart in allen 5 Welten rendern (Nahaufnahmen nach tests/shots/v23/schmuck_*),
# 0 Fehler, Draw-Calls/Dreiecke je Welt; Anatomie der neuen NPCs: Blickrichtung · Bewegungsrichtung > 0.
import time, json, sys, os, math
sys.path.insert(0, 'tests')
from util import *
OUT = 'tests/shots/v23'
os.makedirs(OUT, exist_ok=True); os.makedirs('tests/out', exist_ok=True)
WORLDS = [('1-1', 'wiese'), ('2-1', 'sonne'), ('3-1', 'teich'), ('4-1', 'kirsch'), ('5-1', 'abend')]
res = {'worlds': {}, 'anatomy': {}, 'shots': []}

def sim_wait(s, sec):
    t0 = s.ev("__app.t")
    while s.ev("__app.t") - t0 < sec: time.sleep(0.03)

def look(s, name, pos_js, tgt_js, fov=50):
    # Kamera frei setzen (eingefroren), Bild speichern
    s.ev(f"""(() => {{ __game.freeze(true); const c = __app.camera, P = {pos_js}, T = {tgt_js};
      c.position.set(P[0], P[1], P[2]); c.lookAt(T[0], T[1], T[2]); c.fov = {fov}; c.updateProjectionMatrix();
      __app.world.update(0.0001, c, __app.player.pos); }})()""")
    time.sleep(0.45)
    s.pg.screenshot(path=f'{OUT}/schmuck_{name}.png'); res['shots'].append(name)
    s.ev("__game.freeze(false)")

# Blick·Bewegung für alle neuen Tiere (Instanz-Matrix-Spalte z = Blickrichtung)
ANAT = """(() => { const L = __app.world.life, out = {};
  const fwd = (m, i) => { const e = m.instanceMatrix.array, k = i * 16; const x = e[k + 8], y = e[k + 9], z = e[k + 10], l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };
  const pos = (m, i) => { const e = m.instanceMatrix.array, k = i * 16; return [e[k + 12], e[k + 13], e[k + 14]]; };
  if (L.birdBody) out.vogel = L.birds.map((b, i) => [pos(L.birdBody, i), fwd(L.birdBody, i), b.fly]);
  out.falter = L.swarm.map((b, i) => [pos(L.swBody, i), fwd(L.swBody, i), true]);
  if (L.beeBody) out.biene = L.bees.map((b, i) => [pos(L.beeBody, i), fwd(L.beeBody, i), b.u < 1]);
  out.kaefer = L.bugs.map((b, i) => [pos(L.bugMesh, i), fwd(L.bugMesh, i), !!b.bush]);
  out.hase = L.bunnies.map((b, i) => [pos(L.bunMesh, i), fwd(L.bunMesh, i), b.run > 0]);
  if (L.fish && L.fish.m.visible) { const m = L.fish.m; m.updateMatrixWorld(); const e = m.matrixWorld.elements, l = Math.hypot(e[8], e[9], e[10]); out.fisch = [[[e[12], e[13], e[14]], [e[8] / l, e[9] / l, e[10] / l], true]]; }
  return JSON.stringify(out); })()"""

def anatomy(s, wid, sec=4.0):
    prev = None; dots = {}
    t0 = s.ev("__app.t")
    while s.ev("__app.t") - t0 < sec:
        cur = json.loads(s.ev(ANAT))
        if prev:
            for k, lst in cur.items():
                if k not in prev or len(prev[k]) != len(lst): continue
                for (p1, f1, mv1), (p0, f0, mv0) in zip(lst, prev[k]):
                    d = [p1[j] - p0[j] for j in range(3)]
                    if k != 'fisch': d[1] = d[1] if k in ('vogel', 'fisch') else 0  # Käfer/Hase/Falter/Biene: waagrecht
                    L = math.sqrt(sum(x * x for x in d))
                    if not mv1 or L < 0.03 or L > 6: continue
                    fw = f1 if k in ('vogel', 'fisch') else [f1[0], 0, f1[2]]
                    fl = math.sqrt(sum(x * x for x in fw)) or 1
                    dots.setdefault(k, []).append(sum(fw[j] * d[j] for j in range(3)) / (L * fl))
        prev = cur
        time.sleep(0.05)
    return {k: {'n': len(v), 'min': round(min(v), 3), 'mean': round(sum(v) / len(v), 3)} for k, v in dots.items()}

with sync_playwright() as pw:
    s = Session(pw, dpr=1.5)
    s.open(); s.tap('#title'); s.pg.fill('input.name', 'Schmuck'); s.tap('[data-a=create]')
    s.ev("__game.setQuality(1)")
    for lid, wid in WORLDS:
        s.ev(f"__game.start('{lid}', 'leicht')"); s.ev("__app.input.injected = {turn: 0, climb: 0}")
        sim_wait(s, 2.0)
        W = {'info': json.loads(s.ev("JSON.stringify(__game.info())"))}
        # Tiere anlocken: Spieler langsam kreisen lassen, damit Bienen/Häschen/Schwarm umziehen und sichtbar sind
        s.ev("__app.input.injected = {turn: 0.35, climb: 0}")
        W['anat'] = anatomy(s, wid, 5.0)
        s.ev("__app.input.injected = {turn: 0, climb: 0}")
        L = json.loads(s.ev("""JSON.stringify((() => { const L = __app.world.life; const v = (p) => p ? [p.x, p.y, p.z] : null;
          return { vogel: L.birds.map(b => [v(b.pos), b.fly]), falter: v(L.swC[0]), biene: L.bees.map(b => v(b.pos)), kaefer: L.bugs.filter(b => b.bush).map(b => [b.bush.x, b.bush.y, b.bush.z, b.bush.s]),
            hase: L.bunnies.map(b => v(b.pos)), bank: v(__app.world.benchPos), fisch: !!L.fish, player: v(__app.player.pos) }; })())"""))
        W['counts'] = {k: (len(v) if isinstance(v, list) else v) for k, v in L.items() if k != 'player'}
        # --- Nahaufnahmen
        if L['vogel']:
            b = L['vogel'][0][0]
            look(s, f'{wid}_vogel', f"[{b[0]} + 2.2, {b[1]} + 0.8, {b[2]} + 2.2]", f"[{b[0]}, {b[1]} + 0.1, {b[2]}]", 40)
        c = L['falter']
        look(s, f'{wid}_schwarm', f"[{c[0]} + 7, {c[1]} + 3.5, {c[2]} + 7]", f"[{c[0]}, {c[1]} + 1.4, {c[2]}]", 50)
        if L['biene']:
            b = L['biene'][0]
            look(s, f'{wid}_biene', f"[{b[0]} + 1.3, {b[1]} + 0.5, {b[2]} + 1.3]", f"[{b[0]}, {b[1]}, {b[2]}]", 40)
        if L['kaefer']:
            k = L['kaefer'][0]
            look(s, f'{wid}_kaefer', f"[{k[0]} + 1.8 * {k[3]}, {k[1]} + 3.2 * {k[3]}, {k[2]} + 1.8 * {k[3]}]", f"[{k[0]}, {k[1]} + 1.5 * {k[3]}, {k[2]}]", 45)
        h = L['hase'][0]
        look(s, f'{wid}_hase', f"[{h[0]} + 3, {h[1]} + 1.4, {h[2]} + 3]", f"[{h[0]}, {h[1]} + 0.5, {h[2]}]", 45)
        if L['bank']:
            b = L['bank']
            look(s, f'{wid}_bank', f"[{b[0]} + 4, {b[1]} + 2.2, {b[2]} + 4]", f"[{b[0]}, {b[1]} + 0.6, {b[2]}]", 50)
        # Boden-Nahbereich: Blumen, Teppich, Büschel (Kamera tief, Blick schräg nach unten)
        p = L['player']
        look(s, f'{wid}_boden', f"[{p[0]}, __app.heightAt ? 0 : 0, {p[2]}]".replace('__app.heightAt ? 0 : 0', f"{p[1]} - 1.2"), f"[{p[0]} + 6, {p[1]} - 3.2, {p[2]} + 6]", 60)
        # Baum-Nahaufnahme (Kronen-Verlauf, Blütenbüschel, Birkenrinde)
        tr = json.loads(s.ev("""JSON.stringify((() => { const T = Object.values(__app.world.trees.userData).flat(), p = __app.player.pos;
          const byKind = {}; for (const t of T) { const d = (t.x - p.x) ** 2 + (t.z - p.z) ** 2; if (!byKind[t.kind] || d < byKind[t.kind].d) byKind[t.kind] = { d, x: t.x, z: t.z, s: t.s, kind: t.kind }; } return Object.values(byKind); })())"""))
        for t in tr:
            s.ev(f"import('./js/world/terrain.js').then(m => {{ window.__gh = m.height({t['x']}, {t['z']}); }})"); time.sleep(0.2)
            gh = s.ev("window.__gh")
            look(s, f"{wid}_baum_{t['kind']}", f"[{t['x']} + 9 * {t['s']}, {gh} + 4 * {t['s']}, {t['z']} + 9 * {t['s']}]", f"[{t['x']}, {gh} + 3.6 * {t['s']}, {t['z']}]", 55)
        if wid == 'sonne':
            sf = json.loads(s.ev("""JSON.stringify((() => { const P = __app.world.sunflowers.userData.pts, p = __app.player.pos; let b = null, bd = 1e9;
              for (const q of P) { const d = (q.x - p.x) ** 2 + (q.z - p.z) ** 2; if (d < bd) { bd = d; b = q; } } return b; })())"""))
            hx, hz = sf['x'] + math.sin(sf['rot']) * 0.2 * sf['s'], sf['z'] + math.cos(sf['rot']) * 0.2 * sf['s']
            look(s, 'sonne_sonnenblume', f"[{hx} + Math.sin({sf['rot']}) * 1.6, {sf['y']} + 2.3 * {sf['s']}, {hz} + Math.cos({sf['rot']}) * 1.6]", f"[{hx}, {sf['y']} + 2.25 * {sf['s']}, {hz}]", 45)
        if wid == 'teich':
            # Fisch-Sprung erzwingen und im Flug ansehen; Wasserringe; Seerosen
            s.ev("(() => { const F = __app.world.life.fish; F.t = -1; F.wait = 0; })()"); sim_wait(s, 0.45)
            f = json.loads(s.ev("JSON.stringify(__app.world.life.fish.m.position)"))
            W['anat_fisch'] = anatomy(s, wid, 0.5)
            s.ev("(() => { const F = __app.world.life.fish; F.t = 0.3; })()")
            look(s, 'teich_fisch', f"[{f['x']} + 3.5, 1.6, {f['z']} + 3.5]", f"[{f['x']}, 0.5, {f['z']}]", 45)
            look(s, 'teich_wasserringe', "[18, 9, 18]", "[0, 0, 0]", 55)
        if wid == 'wiese':
            # Regenbogen: Blick gegenüber der Sonne, leicht über den Horizont; Wolkenschatten von oben
            s.ev("window.__sd = __app.camera.position.constructor ? null : null")
            look(s, 'wiese_regenbogen', "[__app.player.pos.x, __app.player.pos.y + 3, __app.player.pos.z]",
                 "(() => { const d = __app.world.sky.material.uniforms.uSunDir.value, p = __app.player.pos; return [p.x - d.x * 100, p.y + 3 + 28, p.z - d.z * 100]; })()", 75)
            look(s, 'wiese_wolkenschatten', "(() => { const v = __app.world.shadows[0]; return [v.x + 30, 38, v.y + 30]; })()", "(() => { const v = __app.world.shadows[0]; return [v.x, 0, v.y]; })()", 60)
        if wid == 'abend':
            s.ev("(() => { const W = __app.world; W.shootT = 0; W.shoot = -1; })()"); sim_wait(s, 0.05)
            s.ev("(() => { const W = __app.world; W.shoot = 0.55; W.sky.material.uniforms.uShootT.value = 0.55; })()")
            s.ev("__game.freeze(true)"); time.sleep(0.4); s.pg.screenshot(path=f'{OUT}/schmuck_abend_sternschnuppe.png'); s.ev("__game.freeze(false)")
            res['shots'].append('abend_sternschnuppe')
        W['errors'] = list(s.errors)
        res['worlds'][wid] = W
        print(wid, json.dumps({'calls': W['info']['calls'], 'tris': W['info']['tris'], 'counts': W['counts'], 'anat': W['anat'], 'fisch': W.get('anat_fisch')}), flush=True)
    res['errors'] = s.errors[:5]
    s.close()
anat_ok = True
for wid, W in res['worlds'].items():
    for k, v in list(W['anat'].items()) + list((W.get('anat_fisch') or {}).items()):
        if v['min'] <= 0: anat_ok = False
res['ok'] = not res['errors'] and anat_ok and all(W['info']['calls'] < 150 for W in res['worlds'].values())
json.dump(res, open('tests/out/schmuck.json', 'w'), indent=1)
print('shots', len(res['shots']), 'errors', res['errors'], 'ok', res['ok'])
