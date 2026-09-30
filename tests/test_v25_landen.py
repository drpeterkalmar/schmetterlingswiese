# v2.5 Nektar-Landung ohne Durchschneiden: numerischer Durchdringungs-Test über die ganze Sitzdauer (inkl. Wiegen)
# für alle Figuren × Größen × Landeblumen, dabei reihum alle Hüte, Schmuck-Teile, Flügelformen und Fühler.
# Unabhängig vom Spielcode gerechnet: Blüten-Geometrie so, wie sie gerendert wird (Instanz-Matrix aus dem Mesh), fein
# gerastert (5 mm, exakte Dreiecks-Höhe, senkrechte Säulen im Blumen-Rahmen = oberste Fläche); Figur-Punkte aus allen
# Meshes (Ecken + Flächen-Abtastung ≤ 2,5 cm) mit matrixWorld; jeder Punkt über der Blüte muss darüber liegen.
# Dazu: Wasser (Seerose), Nachbar-Sonnenblumen, Kamera nie in Blüten/Kronen.
# Aufruf: python3 tests/test_v25_landen.py [sun|lily|big ...]   (ohne Argument: alle drei nacheinander)
import time, json, sys, os
sys.path.insert(0, 'tests')
from util import *
os.makedirs('tests/out', exist_ok=True)
KINDS = [a for a in sys.argv[1:] if a in ('sun', 'lily', 'big')] or ['sun', 'lily', 'big']
LEVEL = {'sun': '2-1', 'lily': '3-1', 'big': '5-2'}
FIGS = ['schmetterling', 'marienkaefer', 'biene', 'libelle', 'hummel', 'mondfalter', 'drache', 'einhorn', 'katze']
SIZES = ['xs', 's', 'm', 'l', 'xl']
HATS = ['none', 'kranz', 'schleife', 'party', 'stroh', 'zauber', 'krone', 'heiligenschein', 'propeller', 'pizza', 'helm']
EXTRAS = ['none', 'brille', 'bart', 'umhang']
WINGS = ['rund', 'spitz', 'lang']
ANTS = ['kugel', 'herz', 'stern', 'ringel', 'feder']

HELP = r"""(() => {
  const THREE = __app.THREE, TILT = 1.13;
  const L = window.__LC = { rec: null, on: false };
  L.flower = (sp) => {
    const S = sp.seat, task = sp.task, M = new THREE.Matrix4(); let geo;
    if (S.kind === 'sun') { task.honey.getMatrixAt(S.hi, M); geo = task.honey.geometry; }
    else if (S.kind === 'lily') { const W = __app.world.pond, mesh = W.children.find(o => o.geometry === W.userData.padGeo); mesh.getMatrixAt(W.userData.pads.indexOf(S.src), M); geo = mesh.geometry; }
    else { const i = task.flowers.findIndex(f => f.p === S.src); task.fpool.mesh.getMatrixAt(i, M); geo = task.fpool.mesh.geometry; }
    return { M, geo };
  };
  // Höhenfeld im „oben“-Rahmen der Blüte (lokal, unskaliert), 5 mm, Höhe exakt aus der Dreiecksebene
  const HF = {};
  L.hf = (kind, geo) => {
    if (HF[kind]) return HF[kind];
    // senkrechte Säulen im lokalen Rahmen: oberste Blütenfläche (Stängel/Blätter liegen darunter)
    const q = new THREE.Quaternion();
    const ext = 1.3, cell = 0.005, n = Math.ceil(2 * ext / cell), h = new Float32Array(n * n).fill(-1e9);
    const pos = geo.attributes.position, idx = geo.index, T = idx ? idx.count / 3 : pos.count / 3;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    const put = (x, z, y) => { const i = Math.floor((x + ext) / cell), j = Math.floor((z + ext) / cell); if (i >= 0 && j >= 0 && i < n && j < n && y > h[j * n + i]) h[j * n + i] = y; };
    for (let t = 0; t < T; t++) {
      a.fromBufferAttribute(pos, idx ? idx.getX(3 * t) : 3 * t).applyQuaternion(q);
      b.fromBufferAttribute(pos, idx ? idx.getX(3 * t + 1) : 3 * t + 1).applyQuaternion(q);
      c.fromBufferAttribute(pos, idx ? idx.getX(3 * t + 2) : 3 * t + 2).applyQuaternion(q);
      // Kanten (auch senkrechte Dreiecke) + Zellmitten im Dreieck
      for (const [p, r] of [[a, b], [b, c], [c, a]]) { const m = Math.max(1, Math.ceil(Math.hypot(p.x - r.x, p.z - r.z) / (cell * 0.5))); for (let k = 0; k <= m; k++) { const u = k / m; put(p.x + (r.x - p.x) * u, p.z + (r.z - p.z) * u, p.y + (r.y - p.y) * u); } }
      const x0 = Math.min(a.x, b.x, c.x), x1 = Math.max(a.x, b.x, c.x), z0 = Math.min(a.z, b.z, c.z), z1 = Math.max(a.z, b.z, c.z);
      const d = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z); if (Math.abs(d) < 1e-12) continue;
      for (let j = Math.max(0, Math.floor((z0 + ext) / cell)); j <= Math.min(n - 1, Math.floor((z1 + ext) / cell)); j++)
        for (let i = Math.max(0, Math.floor((x0 + ext) / cell)); i <= Math.min(n - 1, Math.floor((x1 + ext) / cell)); i++) {
          const x = -ext + (i + 0.5) * cell, z = -ext + (j + 0.5) * cell;
          const l1 = ((b.z - c.z) * (x - c.x) + (c.x - b.x) * (z - c.z)) / d, l2 = ((c.z - a.z) * (x - c.x) + (a.x - c.x) * (z - c.z)) / d, l3 = 1 - l1 - l2;
          if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue;
          const y = l1 * a.y + l2 * b.y + l3 * c.y; if (y > h[j * n + i]) h[j * n + i] = y;
        }
    }
    return (HF[kind] = { h, n, ext, cell, q, at(x, z) { const i = Math.floor((x + ext) / cell), j = Math.floor((z + ext) / cell); return i < 0 || j < 0 || i >= n || j >= n ? -1e9 : h[j * n + i]; } });
  };
  // Figuren-Punkte je Mesh (lokal): Ecken + Flächen (≤ 2,5 cm)
  L.samples = (critter) => {
    if (L._c === critter && L._b === critter._seatPts) return L._s;
    const out = [];
    critter.root.traverse(o => {
      if (!o.isMesh || !o.geometry) return;
      const g = o.geometry, pos = g.attributes.position, idx = g.index, arr = [];
      const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) arr.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      const T = idx ? idx.count / 3 : pos.count / 3;
      for (let t = 0; t < T; t++) {
        a.fromBufferAttribute(pos, idx ? idx.getX(3 * t) : 3 * t); b.fromBufferAttribute(pos, idx ? idx.getX(3 * t + 1) : 3 * t + 1); c.fromBufferAttribute(pos, idx ? idx.getX(3 * t + 2) : 3 * t + 2);
        const Lm = Math.max(a.distanceTo(b), b.distanceTo(c), c.distanceTo(a)); if (Lm < 0.05) continue;
        const m = Math.ceil(Lm / 0.025);
        for (let i = 0; i <= m; i++) for (let j = 0; j <= m - i; j++) { const u = i / m, w = j / m, r = 1 - u - w; arr.push(a.x * r + b.x * u + c.x * w, a.y * r + b.y * u + c.y * w, a.z * r + b.z * u + c.z * w); }
      }
      out.push([o, new Float32Array(arr)]);
    });
    L._c = critter; L._b = critter._seatPts; L._s = out;
    return out;
  };
  const v = new THREE.Vector3(), inv = new THREE.Matrix4(), sc = new THREE.Vector3();
  L.check = () => {
    const pl = __app.player, sp = pl.landSpot; if (!pl.landed || !sp || !sp.seat) return null;
    const F = L.flower(sp), H = L.hf(sp.seat.kind, F.geo); inv.copy(F.M).invert(); sc.setFromMatrixScale(F.M);
    const s = sc.x; let clr = 1e9, nOver = 0, water = 1e9, neigh = 1e9, worst = null;
    const nb = (sp.seat.kind === 'sun' ? __app.world.sunflowers.userData.pts : []).filter(q => q !== sp.seat.src && (q.x - pl.pos.x) ** 2 + (q.z - pl.pos.z) ** 2 < 25)
      .map(q => [new THREE.Vector3(q.x + Math.sin(q.rot) * 0.1 * q.s, q.y + 2.25 * q.s, q.z + Math.cos(q.rot) * 0.1 * q.s), 0.76 * q.s]);
    pl.critter.root.updateMatrixWorld(true);
    for (const [o, arr] of L.samples(pl.critter)) {
      if (!o.visible || (o.parent && !o.parent.visible)) continue;
      const M = o.matrixWorld;
      for (let i = 0; i < arr.length; i += 3) {
        v.set(arr[i], arr[i + 1], arr[i + 2]).applyMatrix4(M);
        if (v.y < water) water = v.y;
        for (const [c, r] of nb) { const d = v.distanceTo(c) - r; if (d < neigh) neigh = d; }
        v.applyMatrix4(inv).applyQuaternion(H.q);
        const hh = H.at(v.x, v.z); if (hh < -1e8) continue;
        nOver++; const d = (v.y - hh) * s; if (d < clr) { clr = d; worst = o.name || o.parent && o.parent.type; }
      }
    }
    // Kamera: nie unter/in der eigenen Blüte, nie in Nachbar-Köpfen oder Baumkronen
    const cam = __app.camera.position; let camClr = 1e9;
    v.copy(cam).applyMatrix4(inv).applyQuaternion(H.q); const hc = H.at(v.x, v.z); if (hc > -1e8) camClr = Math.min(camClr, (v.y - hc) * s);
    for (const o of sp.camObs || []) if (!o.own) camClr = Math.min(camClr, cam.distanceTo(o.c) - o.r + 0.3);
    return { clr, nOver, water, neigh, camClr, seatK: pl.seatK, t: __app.t, roll: Math.abs(pl.critter.rollAng) };
  };
  L.start = () => { L.rec = []; L.on = true; (function f() { if (!L.on) return; if (!window.__freeze) { try { const r = L.check(); if (r) L.rec.push(r); } catch (e) { L.err = String(e && e.stack || e); } } requestAnimationFrame(f); })(); };
  L.stop = () => { L.on = false; return L.rec; };
  return true;
})()"""

def sim_wait(s, sec):
    t0 = s.ev("__app.t")
    while s.ev("__app.t") - t0 < sec: time.sleep(0.02)

def reset_spots(s):
    s.ev("""(() => { const t = __app.game.tasks.find(t => t.cfg.type === 'land'); t.spots.forEach(q => { q.done = false; }); t.cur = 0; t.sip = null; t.autoOff = 0; })()""")

def land_on(s, k, yaw_off=0.0):
    # 1,2 m über und 1 m vor der Landemarke, Blick zur Marke, dann „unten halten“
    s.ev(f"""(() => {{ const t = __app.game.tasks.find(t => t.cfg.type === 'land'), sp = t.spots[{k} % t.spots.length], p = __app.player;
      if (p.landed) p.takeoff(); p.stunt = null; const a = (sp.seat.rot || 0) + {yaw_off};
      p.pos.set(sp.pos.x - Math.sin(a) * 1.0, sp.pos.y + 1.2, sp.pos.z - Math.cos(a) * 1.0); p.yaw = a; p.yawRate = 0; p.pitch = 0; p.ext.set(0, 0, 0);
      __app.input.injected = {{turn: 0, climb: -1}}; }})()""")
    t0 = time.time()
    while not s.ev("__app.player.landed") and time.time() - t0 < 8: time.sleep(0.03)
    s.ev("__app.input.injected = {turn: 0, climb: 0}")
    return s.ev("__app.player.landed && !!__app.player.landSpot && !!__app.player.landSpot.seat")

def run_kind(s, kind):
    s.ev(f"__game.start('{LEVEL[kind]}', 'leicht')"); sim_wait(s, 1.0)
    s.ev(HELP)
    nsp = s.ev("__app.game.tasks.find(t => t.cfg.type === 'land').spots.filter(q => q.seat.kind === '%s').length" % kind)
    cases = []; i = 0
    for fig in FIGS:
        for size in SIZES:
            look = {'size': size, 'hat': HATS[i % len(HATS)], 'extra': EXTRAS[(i // 3) % len(EXTRAS)], 'wing': WINGS[i % 3], 'ant': ANTS[i % 5]}
            s.ev(f"__app.player.setCharacter('{fig}', {json.dumps(look)})")
            reset_spots(s)
            s.ev("__LC.start()")
            ok = land_on(s, i, yaw_off=(0.9 if i % 2 else -0.6))
            if ok and kind != 'sun' and i % 2 == 0:  # drehbare Sitze: während des Sitzens drehen (Sitzhöhe folgt)
                sim_wait(s, 0.45); s.ev("__app.input.injected = {turn: 1, climb: 0}"); sim_wait(s, 0.45); s.ev("__app.input.injected = {turn: 0, climb: 0}")
            t0 = time.time()
            while s.ev("__app.player.landed") and time.time() - t0 < 8: time.sleep(0.03)
            rec = s.ev("__LC.stop()")
            if s.ev("__LC.err || null"): print('  JS-Fehler', s.ev("__LC.err"), flush=True); s.ev("__LC.err = null")
            sit = [r for r in rec if r['seatK'] >= 1]; tr = [r for r in rec if r['seatK'] < 1]
            c = {'fig': fig, 'size': size, **look, 'landed': bool(ok), 'frames': len(sit), 'sit_s': round(sit[-1]['t'] - sit[0]['t'], 2) if len(sit) > 1 else 0,
                 'clr_sit': round(min(r['clr'] for r in sit), 4) if sit else None, 'over': max((r['nOver'] for r in sit), default=0),
                 'clr_trans': round(min(r['clr'] for r in tr), 3) if tr else None,
                 'water': round(min(r['water'] for r in sit), 3) if sit else None, 'neigh': round(min(r['neigh'] for r in sit), 3) if sit else None,
                 'cam': round(min(r['camClr'] for r in sit), 2) if sit else None, 'roll_sit': round(max((r['roll'] for r in sit), default=0), 3)}
            c['ok'] = (c['landed'] and c['frames'] >= 5 and c['sit_s'] >= 0.8 and c['clr_sit'] is not None and c['clr_sit'] >= 0.0 and c['over'] > 0
                       and (kind != 'lily' or c['water'] > 0.0) and c['neigh'] > 0 and c['cam'] > 0)
            cases.append(c); i += 1
            if not c['ok']: print('  FEHLER', json.dumps(c), flush=True)
    sits = [c for c in cases if c['clr_sit'] is not None]
    summ = {'level': LEVEL[kind], 'spots': nsp, 'cases': len(cases), 'ok': all(c['ok'] for c in cases) and nsp >= 3,
            'min_clr_sit_cm': round(min(c['clr_sit'] for c in sits) * 100, 1) if sits else None,
            'max_clr_sit_cm': round(max(c['clr_sit'] for c in sits) * 100, 1) if sits else None,
            'min_clr_trans_cm': round(min(c['clr_trans'] for c in cases if c['clr_trans'] is not None) * 100, 1) if any(c['clr_trans'] is not None for c in cases) else None,
            'frames': sum(c['frames'] for c in cases), 'min_cam_m': min(c['cam'] for c in sits) if sits else None,
            'min_neigh_m': min(c['neigh'] for c in sits) if sits else None, 'min_water_m': min(c['water'] for c in sits) if sits and kind == 'lily' else None}
    return summ, cases

if __name__ == '__main__':
    res = json.load(open('tests/out/v25_landen.json')) if os.path.exists('tests/out/v25_landen.json') and len(KINDS) < 3 else {}
    with sync_playwright() as pw:
        s = Session(pw, dpr=1)
        s.open(); s.tap('#title'); s.pg.fill('input.name', 'Landen'); s.tap('[data-a=create]')
        s.ev("__game.setQuality(1)")
        for kind in KINDS:
            t0 = time.time()
            summ, cases = run_kind(s, kind)
            res[kind] = {'summary': summ, 'cases': cases}
            print(kind, json.dumps(summ), f'{time.time() - t0:.0f}s', flush=True)
        res['errors'] = s.errors[:5]
        s.close()
    json.dump(res, open('tests/out/v25_landen.json', 'w'), indent=1)
    ok = all(res[k]['summary']['ok'] for k in ('sun', 'lily', 'big') if k in res) and not res['errors']
    print('errors', res['errors'])
    print('ok', ok)
