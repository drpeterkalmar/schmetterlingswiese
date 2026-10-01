# v2.5.1 Nektar-Landung leichter: Bot-Anflüge mit zufälligem Versatz 0–5 m und Höhe 1–8 m über der Landemarke,
# ▼ nur 0,3 s getippt bzw. gehalten → Landequote je Blumenart (Sonnenblume 2-1, Seerose 3-1, Mondblume 5-2).
# Dazu: nie auf eine erledigte Blume einrasten, keine Fehllandung am Wasser/Boden, Abbruch mit ▲ wirkt.
# Aufruf: python3 tests/test_v251_fang.py [sun|lily|big ...] [--landen=<faktor>] [--n=<versuche>] [--tag=<name>]
import time, json, sys, os, math, random
sys.path.insert(0, 'tests')
from util import *
os.makedirs('tests/out', exist_ok=True)
KINDS = [a for a in sys.argv[1:] if a in ('sun', 'lily', 'big')] or ['sun', 'lily', 'big']
ARG = {a.split('=')[0][2:]: a.split('=')[1] for a in sys.argv[1:] if a.startswith('--') and '=' in a}
N = int(ARG.get('n', 30)); LANDEN = ARG.get('landen'); TAG = ARG.get('tag', 'neu' if not LANDEN else f'landen{LANDEN}')
LEVEL = {'sun': '2-1', 'lily': '3-1', 'big': '5-2'}

def sim_wait(s, sec):
    t0 = s.ev("__app.t")
    while s.ev("__app.t") - t0 < sec: time.sleep(0.01)

def trial(s, k, d, h, a, mode, done=False):
    # Start: d m seitlich, h m über der Marke, Blick ungefähr zur Marke (±0,4 rad), volle Fluggeschwindigkeit
    r = s.ev(f"""(() => {{ const g = __app.game, t = g.tasks.find(t => t.cfg.type === 'land'), p = __app.player;
      t.spots.forEach(q => {{ q.done = false; }}); t.cur = 0; t.sip = null; t.autoOff = 0;
      if (p.landed) p.takeoff(); p.stunt = null; p.landing = null; p.lockT = 0; p.ext.set(0, 0, 0);
      const c = p.critter; if (c) {{ c.rollAng = 0; c.rollTarget = 0; c.rollVel = 0; }} g.rollQ = null;
      const sp = t.spots[{k} % t.spots.length]; sp.done = {str(done).lower()}; window.__tgt = sp;
      p.pos.set(sp.pos.x + Math.sin({a}) * {d}, sp.pos.y + {h}, sp.pos.z + Math.cos({a}) * {d});
      p.yaw = Math.atan2(sp.pos.x - p.pos.x, sp.pos.z - p.pos.z) + ({d} > 0.3 ? {random.uniform(-0.4, 0.4)} : 0);
      p.yawRate = 0; p.pitch = 0; p.speed = p.baseSpeed; p.camInit = false; p.airT = 9;
      __app.input.injected = {{turn: 0, climb: -1}}; return true; }})()""")
    if mode == 'tipp':
        sim_wait(s, 0.3); s.ev("__app.input.injected = {turn: 0, climb: 0}")
    t0 = s.ev("__app.t")
    while s.ev("__app.t") - t0 < 6:
        if s.ev("__app.player.landed"): break
        time.sleep(0.02)
    res = s.ev("""(() => { const p = __app.player; return { landed: p.landed, target: p.landed && p.landSpot === window.__tgt,
      other: p.landed && !!p.landSpot && p.landSpot !== window.__tgt, ground: p.landed && !p.landSpot,
      water: p.landed && !p.landSpot && !!__app.world.pond && p.pos.y < 0.4, y: +p.pos.y.toFixed(2) }; })()""")
    s.ev("__app.input.injected = {turn: 0, climb: 0}")
    if res['landed']: s.ev("__app.player.takeoff()")
    return res

def run_kind(s, kind, rnd):
    s.ev(f"__game.start('{LEVEL[kind]}', 'leicht')"); sim_wait(s, 1.0)
    s.ev("__app.game.diffCfg = { ...__app.game.diffCfg }")
    nsp = s.ev("__app.game.tasks.find(t => t.cfg.type === 'land').spots.length")
    out = {}
    for mode in ['tipp', 'halten']:
        rows = []
        for i in range(N):
            d = rnd.uniform(0, 5); h = rnd.uniform(1, 8); a = rnd.uniform(0, 2 * math.pi)
            r = trial(s, i, d, h, a, mode); r.update(d=round(d, 2), h=round(h, 2)); rows.append(r)
        q = lambda rs: round(100 * sum(1 for r in rs if r['target']) / max(1, len(rs)))
        out[mode] = {'quote_alle': q(rows), 'quote_bis4m': q([r for r in rows if r['d'] <= 4]), 'n_bis4m': sum(1 for r in rows if r['d'] <= 4),
                     'fehl_boden': sum(1 for r in rows if r['ground']), 'fehl_wasser': sum(1 for r in rows if r['water']), 'andere_blume': sum(1 for r in rows if r['other']), 'rows': rows}
        print(kind, mode, {k: v for k, v in out[mode].items() if k != 'rows'}, flush=True)
    # erledigte Blume: nie einrasten/landen (auch mit ▼ gehalten, direkt darüber)
    dn = [trial(s, i, rnd.uniform(0, 2), rnd.uniform(1, 4), rnd.uniform(0, 6.28), 'halten', done=True) for i in range(6)]
    out['erledigt_gelandet'] = sum(1 for r in dn if r['target'])
    # Abbruch: ▼ tippen, dann ▲ halten → kein Aufsetzen
    s.ev("window.__abort = 0")
    ab = []
    for i in range(4):
        s.ev(f"""(() => {{ const t = __app.game.tasks.find(t => t.cfg.type === 'land'), p = __app.player; t.spots.forEach(q => q.done = false);
          if (p.landed) p.takeoff(); const sp = t.spots[{i} % t.spots.length]; window.__tgt = sp;
          p.pos.set(sp.pos.x + 3, sp.pos.y + 4, sp.pos.z); p.yaw = Math.atan2(-3, 0); p.speed = p.baseSpeed; p.pitch = 0;
          __app.input.injected = {{turn: 0, climb: -1}}; }})()""")
        sim_wait(s, 0.3); s.ev("__app.input.injected = {turn: 0, climb: 1}"); sim_wait(s, 2.0)
        ab.append(s.ev("__app.player.landed")); s.ev("__app.input.injected = {turn: 0, climb: 0}")
        if ab[-1]: s.ev("__app.player.takeoff()")
    out['abbruch_ok'] = not any(ab)
    out['spots'] = nsp
    return out

if __name__ == '__main__':
    fn = f'tests/out/v251_fang_{TAG}.json'
    res = json.load(open(fn)) if os.path.exists(fn) else {}
    rnd = random.Random(2511)
    with sync_playwright() as pw:
        s = Session(pw, dpr=1)
        s.open('?nosw' + (f'&landen={LANDEN}' if LANDEN else '')); s.tap('#title'); s.pg.fill('input.name', 'Fang'); s.tap('[data-a=create]')
        s.ev("__game.setQuality(1)")
        res['landK'] = s.ev("__app.player.landK || 1")
        for kind in KINDS:
            random.seed(hash(kind) & 0xffff)
            res[kind] = run_kind(s, kind, random.Random({'sun': 1, 'lily': 2, 'big': 3}[kind]))
        res['errors'] = s.errors[:5]
        s.close()
    json.dump(res, open(fn, 'w'), indent=1)
    ks = [k for k in ('sun', 'lily', 'big') if k in res]
    ok = all(res[k]['tipp']['quote_bis4m'] >= 90 and res[k]['halten']['quote_bis4m'] >= 90 and res[k]['erledigt_gelandet'] == 0
             and res[k]['tipp']['fehl_wasser'] == 0 and res[k]['halten']['fehl_wasser'] == 0 and res[k]['abbruch_ok'] for k in ks) and not res['errors']
    print('errors', res['errors'])
    print('ok', ok)
