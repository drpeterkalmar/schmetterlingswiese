# v2.7 Test-Flieger im Zeitraffer: derselbe Autopilot wie test_v25_wettflug --flieger (fliegt echt über die Eingabe),
# aber in festen 1/60-s-Schritten ohne Zeichnen → ca. 10–20× schneller als Echtzeit. Grundlage für par und Wettflug-Zeiten.
# Aufruf: python3 tests/flieger.py [--diffs leicht,mittel] [--rennen] [--q 0|1] [level ...]   (ohne Level: alle)
# Ergebnis: tests/out/v27_flieger.json  (je Level/Stufe/Modus: Zustand, Spielzeit in s, Sterne)
# v3.1: --seeds N fliegt jedes Level N-mal mit festem Zufall (Math.random geseedet je Level/Stufe/Lauf) → Median je Level;
#        der Autopilot ist chaotisch (Tiere laufen zufällig, Wespen, Stunts) – ein Einzellauf streut bis ±30 %.
#        Ausgabe dann zusätzlich je Lauf unter '<level>_<stufe>_<modus>#<k>'.
import time, json, sys, os
sys.path.insert(0, 'tests')
from util import *

SIM = """(async ([lid, diff, park, maxT, seed]) => {
  const a = __app, dt = 1 / 60, rnd0 = Math.random;
  let s0 = seed >>> 0;
  const rndS = () => { s0 = (s0 + 0x6D2B79F5) >>> 0; let t = s0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  // fester Zufall nur in den eigenen Rechenblöcken (zwischendurch zeichnet die Hauptschleife mit echtem Zufall)
  const an = () => { if (seed) Math.random = rndS; }, aus = () => { Math.random = rnd0; };
  if (seed) a.t = 0;
  an();
  __game.start(lid, diff);
  if (park && a.game.race) a.game.race.start = () => {};       // Rivalin geparkt → reine Flugzeit
  a.autopilot = true; window.__freeze = 1;                     // Hauptschleife zeichnet nur noch
  let n = 0;
  try {
    while (!['won', 'failed'].includes(a.game.state) && a.game.time < maxT) {
      an();
      for (let k = 0; k < 600 && !['won', 'failed'].includes(a.game.state); k++) {
        a.t += dt; a.autoSteer(); a.input.update(dt); a.realDt = dt;
        a.game.update(dt * a.timeScale, a.t, a.input);
        a.bursts.update(dt); a.focus.copy(a.player.pos); a.world.update(dt, a.camera, a.focus); n++;
      }
      aus(); await new Promise(r => setTimeout(r, 0));
    }
  } finally { window.__freeze = undefined; a.autopilot = false; a.input.injected = null; Math.random = rnd0; }
  return { state: a.game.state, t: +a.game.time.toFixed(1), stars: a.game.stars || 0, steps: n,
    tasks: a.game.tasks.map(t => t.cfg.type + ' ' + t.cur + '/' + t.max) };
})"""

def fly(s, lid, diff, park=True, max_t=400, seed=0):
    return s.ev(SIM, [lid, diff, park, max_t, seed])

if __name__ == '__main__':
    args = sys.argv[1:]
    diffs = ['mittel']; rennen = False; q = 0; lids = []; seeds = 0
    i = 0
    while i < len(args):
        if args[i] == '--diffs': diffs = args[i + 1].split(','); i += 2
        elif args[i] == '--rennen': rennen = True; i += 1
        elif args[i] == '--q': q = int(args[i + 1]); i += 2
        elif args[i] == '--seeds': seeds = int(args[i + 1]); i += 2
        else: lids.append(args[i]); i += 1
    os.makedirs('tests/out', exist_ok=True)
    out = {}
    with sync_playwright() as pw:
        s = Session(pw, dpr=1)
        s.open(); s.tap('#title'); s.pg.fill('input.name', 'Flieger'); s.tap('[data-a=create]')
        s.ev(f"__game.setQuality({q})")
        if not lids: lids = s.ev("__game.levels()")
        for lid in lids:
            for d in diffs:
                modes = ['frei'] + (['rennen'] if rennen and s.ev(f"(async () => (await import('./js/game/levels.js')).isRace((await import('./js/game/levels.js')).levelById('{lid}')))()") else [])
                for m in modes:
                    if seeds:
                        runs = []
                        for k in range(seeds):
                            r = fly(s, lid, d, park=(m == 'frei'), seed=1000 * (k + 1) + sum(map(ord, lid + d + m)))
                            out[f'{lid}_{d}_{m}#{k}'] = r; runs.append(r)
                        won = sorted(x['t'] for x in runs if x['state'] == 'won')
                        r = dict(runs[0]); r['t'] = won[len(won) // 2] if won else runs[0]['t']
                        r['state'] = 'won' if len(won) * 2 > len(runs) else runs[0]['state']
                        r['ts'] = [x['t'] for x in runs]; r['states'] = [x['state'] for x in runs]
                        out[f'{lid}_{d}_{m}'] = r
                        print(lid, d, m, r['state'], r['ts'], flush=True)
                        continue
                    t0 = time.time()
                    r = fly(s, lid, d, park=(m == 'frei'))
                    r['wall'] = round(time.time() - t0, 1)
                    out[f'{lid}_{d}_{m}'] = r
                    print(lid, d, m, r, flush=True)
        print('errors', s.errors[:5])
        s.close()
    old = {}
    try: old = json.load(open('tests/out/v27_flieger.json'))
    except Exception: pass
    old.update(out)
    json.dump(old, open('tests/out/v27_flieger.json', 'w'), indent=1, ensure_ascii=False)
