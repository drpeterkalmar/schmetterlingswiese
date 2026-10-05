# v2.7 Test-Flieger im Zeitraffer: derselbe Autopilot wie test_v25_wettflug --flieger (fliegt echt über die Eingabe),
# aber in festen 1/60-s-Schritten ohne Zeichnen → ca. 10–20× schneller als Echtzeit. Grundlage für par und Wettflug-Zeiten.
# Aufruf: python3 tests/flieger.py [--diffs leicht,mittel] [--rennen] [--q 0|1] [level ...]   (ohne Level: alle)
# Ergebnis: tests/out/v27_flieger.json  (je Level/Stufe/Modus: Zustand, Spielzeit in s, Sterne)
import time, json, sys, os
sys.path.insert(0, 'tests')
from util import *

SIM = """(async ([lid, diff, park, maxT]) => {
  const a = __app, dt = 1 / 60;
  __game.start(lid, diff);
  if (park && a.game.race) a.game.race.start = () => {};       // Rivalin geparkt → reine Flugzeit
  a.autopilot = true; window.__freeze = 1;                     // Hauptschleife zeichnet nur noch
  let n = 0;
  try {
    while (!['won', 'failed'].includes(a.game.state) && a.game.time < maxT) {
      for (let k = 0; k < 600 && !['won', 'failed'].includes(a.game.state); k++) {
        a.t += dt; a.autoSteer(); a.input.update(dt); a.realDt = dt;
        a.game.update(dt * a.timeScale, a.t, a.input);
        a.bursts.update(dt); a.focus.copy(a.player.pos); a.world.update(dt, a.camera, a.focus); n++;
      }
      await new Promise(r => setTimeout(r, 0));
    }
  } finally { window.__freeze = undefined; a.autopilot = false; a.input.injected = null; }
  return { state: a.game.state, t: +a.game.time.toFixed(1), stars: a.game.stars || 0, steps: n,
    tasks: a.game.tasks.map(t => t.cfg.type + ' ' + t.cur + '/' + t.max) };
})"""

def fly(s, lid, diff, park=True, max_t=400):
    return s.ev(SIM, [lid, diff, park, max_t])

if __name__ == '__main__':
    args = sys.argv[1:]
    diffs = ['mittel']; rennen = False; q = 0; lids = []
    i = 0
    while i < len(args):
        if args[i] == '--diffs': diffs = args[i + 1].split(','); i += 2
        elif args[i] == '--rennen': rennen = True; i += 1
        elif args[i] == '--q': q = int(args[i + 1]); i += 2
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
