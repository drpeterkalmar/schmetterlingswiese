# v3.1 Ring-Schub, Ringkette, Einsaugen im Spiel (Autopilot fliegt echt über die Eingabe, feste 1/60-s-Schritte):
#   Messgröße 6 (Rückenwind +20 % nach 0,25 s, < 2 % nach 1,9 s), 9 (Tropfen erreicht Figur in 0,15–0,25 s, Pling danach
#   Δ ≤ 1 Bild), 11 (FOV-Änderung ≤ 40°/s; reduzierte Bewegung ≤ +3°), Ringkette (5 Ringe → Rückenwind, Ton steigt).
import time, json, sys
sys.path.insert(0, 'tests')
from util import *

SIM = """(async ([lid, diff, maxT]) => {
  const a = __app, g = a.game, dt = 1 / 60;
  __game.start(lid, diff);
  const log = { hits: [], plings: [], kette: 0, fov: [], wind: [], tempo: [], items: [] };
  const hit0 = g.hit.bind(g); g.hit = (pos, kind, col) => { log.hits.push({ t: g.time, kind, d: pos.distanceTo(a.player.pos) }); return hit0(pos, kind, col); };
  const col0 = a.audio.collect.bind(a.audio); a.audio.collect = (c, p, k, r) => { log.plings.push({ t: g.time, k, r: r || 1 }); return col0(c, p, k, r); };
  const rw0 = g.rueckenwind.bind(g); g.rueckenwind = (p) => { log.kette++; return rw0(p); };
  a.autopilot = true; window.__freeze = 1;
  try {
    while (!['won', 'failed'].includes(g.state) && g.time < maxT) {
      for (let k = 0; k < 300 && !['won', 'failed'].includes(g.state); k++) {
        a.t += dt; a.autoSteer(); a.input.update(dt); a.realDt = dt;
        g.update(dt * a.timeScale, a.t, a.input);
        a.bursts.update(dt); a.focus.copy(a.player.pos); a.world.update(dt, a.camera, a.focus);
        if (g.state === 'play') { log.fov.push(+a.camera.fov.toFixed(3)); log.wind.push(+a.player.wind.wert.toFixed(4)); log.tempo.push(+(a.player.tempo / a.player.baseSpeed).toFixed(4)); }
      }
      await new Promise(r => setTimeout(r, 0));
    }
  } finally { window.__freeze = undefined; a.autopilot = false; a.input.injected = null; }
  for (const tk of g.tasks) if (tk.items) for (const it of tk.items) if (it.takeT != null) log.items.push({ s0: it.suckT0 ?? null, t: it.takeT });
  log.state = g.state; log.time = g.time;
  return log;
})"""

def auswerten(log, dt=1 / 60):
    r = {'state': log['state'], 'zeit': round(log['time'], 1)}
    rings = [h for h in log['hits'] if h['kind'] == 'ring']
    r['ringe'] = len(rings); r['kette'] = log['kette']
    # Rückenwind-Verlauf am ersten Ring ohne Nachbar-Ring in 2 s
    W = log['wind']; frei = None
    for k, h in enumerate(rings):
        if all(abs(o['t'] - h['t']) > 2.0 for o in rings if o is not h): frei = h; break
    if frei is None and rings: frei = rings[0]
    if frei:
        i0 = int(round(frei['t'] / dt))
        get = lambda s: W[min(len(W) - 1, i0 + int(round(s / dt)))]
        r['wind_025'] = round(get(0.25), 3); r['wind_19'] = round(get(1.9), 3); r['wind_max'] = round(max(W[i0:i0 + 150] or [0]), 3)
        r['tempo_vor'] = log['tempo'][max(0, i0 - 2)]; r['tempo_025'] = log['tempo'][min(len(W) - 1, i0 + 15)]
    F = log['fov']
    rates = [abs(F[i + 1] - F[i]) / dt for i in range(len(F) - 1)]
    r['fov_rate_max'] = round(max(rates), 1) if rates else 0
    r['fov_rate_max_t'] = round(rates.index(max(rates)) * dt, 2) if rates else 0
    r['fov_rate_p99'] = round(sorted(rates)[int(len(rates) * 0.99)], 1) if rates else 0
    # Rate allein um Ring-Durchflüge (0–2 s danach) – hier wirkt der neue Rückenwind-FOV
    rr = [rates[i] for h in rings for i in range(int(h['t'] / dt), min(len(rates), int(h['t'] / dt) + 120))]
    r['fov_rate_ringe'] = round(max(rr), 1) if rr else 0
    r['fov_spanne'] = round(max(F) - min(F), 2) if F else 0
    # Rington: Tonhöhe je Kettenglied
    r['ring_raten'] = [round(p['r'], 3) for p in log['plings'] if p['k'] == 'ring'][:7]
    it = [x for x in log['items'] if x['s0'] is not None]
    if it:
        d = [x['t'] - x['s0'] for x in it]; r['saug_min'] = round(min(d), 3); r['saug_max'] = round(max(d), 3); r['saug_n'] = len(d)
        pl = [p['t'] for p in log['plings'] if p['k'] in ('collect', 'fireflies', 'blossoms')]
        r['pling_delta_max_bilder'] = round(max(min(abs(p - x['t']) for p in pl) for x in it) / dt, 2) if pl else None
        r['pling_vor_ankunft'] = sum(1 for p in pl if not any(abs(p - x['t']) < 1e-6 for x in it))
    r['hit_abstand_max'] = round(max((h['d'] for h in log['hits'] if h['kind'] != 'ring'), default=0), 3)
    return r

ok = True; out = {}
with sync_playwright() as pw:
    for name, q, lid, diff in [('ringe', '', '1-3', 'mittel'), ('ringe_leicht', '', '2-2', 'leicht'), ('sammeln', '', '1-1', 'leicht'),
                               ('gluehw', '', '5-1', 'mittel'), ('ringe_rm', '&rm=1', '1-3', 'mittel'), ('ringe_aus', '&ringschub=0&kette=0&saugen=0', '1-3', 'mittel')]:
        s = Session(pw, dpr=1)
        s.open('?nosw' + q); s.tap('#title'); s.pg.fill('input.name', 'Ringe'); s.tap('[data-a=create]')
        r = auswerten(s.ev(SIM, [lid, diff, 300])); r['errors'] = s.errors[:3]; s.close()
        out[name] = r
        print(name, json.dumps(r, ensure_ascii=False), flush=True)
chk = []
R = out['ringe']; chk += [('Ringe geschafft', R['state'] == 'won'), ('Schub +20 % nach 0,25 s', abs(R['wind_025'] - 0.2) < 0.01),
    ('Schub < 2 % nach 1,9 s', R['wind_19'] < 0.02 or R['wind_max'] > 0.2), ('Kette ausgelöst', R['kette'] >= 1),
    ('Ton steigt', R['ring_raten'][:5] == sorted(R['ring_raten'][:5]) and R['ring_raten'][1] > 1.0),
    ('FOV ≤ 40°/s an Ringen', R['fov_rate_ringe'] <= 40)]
for k in ('sammeln', 'gluehw'):
    S = out[k]; chk += [(f'{k}: geschafft', S['state'] == 'won'), (f'{k}: Saugen 0,15–0,25 s', 0.15 <= S['saug_min'] and S['saug_max'] <= 0.25),
        (f'{k}: Pling Δ ≤ 1 Bild', S['pling_delta_max_bilder'] <= 1), (f'{k}: kein Pling vor Ankunft', S['pling_vor_ankunft'] == 0)]
A = out['ringe_aus']; chk += [('aus: kein Schub', A.get('wind_max', 0) == 0 and A['kette'] == 0), ('aus: Ton gleich', set(A['ring_raten']) <= {1})]
M = out['ringe_rm']; chk += [('reduzierte Bewegung: FOV ≤ 40°/s an Ringen', M['fov_rate_ringe'] <= 40)]
chk += [(f'{k}: keine Fehler', not v['errors']) for k, v in out.items()]
for n, v in chk: print(('OK   ' if v else 'FEHL ') + n); ok = ok and v
json.dump(out, open('tests/out/v31_ringe.json', 'w'), indent=1, ensure_ascii=False)
print('RINGE OK' if ok else 'RINGE FEHLER')
sys.exit(0 if ok else 1)
