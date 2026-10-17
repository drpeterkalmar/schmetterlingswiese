# v3.1 Landewertung (Messgröße 8): Autopilot fliegt alle Lande-Missionen (feste 1/60-s-Schritte), jede Landung auf einer
# Blüte bekommt Lob – Ziel: ≥ 60 % „Sanft“ oder besser, nie ein negativer Text, Zähler im Album; ?landewertung=0 → kein Lob.
import time, json, sys
sys.path.insert(0, 'tests')
from util import *

SIM = """(async ([lid, diff, maxT]) => {
  const a = __app, g = a.game, dt = 1 / 60, toasts = [];
  __game.start(lid, diff);
  const ui0 = a.ui.toast.bind(a.ui); a.ui.toast = (m, d) => { toasts.push(m); return ui0(m, d); };
  a.autopilot = true; window.__freeze = 1;
  try {
    while (!['won', 'failed'].includes(g.state) && g.time < maxT) {
      for (let k = 0; k < 600 && !['won', 'failed'].includes(g.state); k++) {
        a.t += dt; a.autoSteer(); a.input.update(dt); a.realDt = dt; g.update(dt * a.timeScale, a.t, a.input);
        a.bursts.update(dt); a.focus.copy(a.player.pos); a.world.update(dt, a.camera, a.focus);
      }
      await new Promise(r => setTimeout(r, 0));
    }
  } finally { window.__freeze = undefined; a.autopilot = false; a.input.injected = null; a.ui.toast = ui0; }
  return { state: g.state, log: g.landeLog || [], toasts: toasts.filter(t => /landet|Federleicht/.test(t)), stats: a.progress.cur.stats };
})"""
LEVELS = ['2-1', '2-4', '2-6', '2-8', '3-1', '3-5', '3-6', '3-8', '5-2', '5-4', '5-8']
NEG = ['daneben', 'außerhalb', 'schlecht', 'hart', 'zu schnell', 'nochmal']
ok = True; res = {}
with sync_playwright() as pw:
    for q in ['', '&landewertung=0']:
        s = Session(pw, dpr=1)
        s.open('?nosw' + q); s.tap('#title'); s.pg.fill('input.name', 'Landen'); s.tap('[data-a=create]')
        s.ev("__game.setQuality(0)")
        alle, texte, n = [], [], 0
        for diff in ['leicht', 'mittel', 'schwer']:
            for lid in LEVELS:
                r = s.ev(SIM, [lid, diff, 300]); alle += r['log']; texte += r['toasts']; stats = r['stats']
                if len(alle) >= 60 and diff != 'leicht': break
            if len(alle) >= 60: break
        st = [x['w'] for x in alle]
        R = {'landungen': len(st), 'federleicht': st.count(2), 'sanft': st.count(1), 'gelandet': st.count(0),
             'sanft_oder_besser_pct': round(100 * (st.count(1) + st.count(2)) / max(1, len(st))),
             'q_median': sorted(x['q'] for x in alle)[len(alle) // 2] if alle else None,
             'texte': sorted(set(texte)), 'album_federleicht': stats.get('federleicht', 0), 'album_sanft': stats.get('sanft', 0), 'errors': s.errors[:3]}
        # Album-Zeile sichtbar
        if not q:
            s.ev("__app.ui.show('album')"); time.sleep(0.6)
            R['album_zeile'] = s.ev("(document.querySelector('.album .lande') || {}).textContent || ''")
        s.close()
        res[q or 'standard'] = R
        print(q or 'Standard', json.dumps(R, ensure_ascii=False), flush=True)
A, B = res['standard'], res['&landewertung=0']
chk = [('≥ 50 Landungen', A['landungen'] >= 50), ('≥ 60 % Sanft oder besser', A['sanft_oder_besser_pct'] >= 60),
       ('nur Lob-Texte', all(not any(w in t.lower() for w in NEG) for t in A['texte']) and len(A['texte']) > 0),
       ('Album zählt', A['album_federleicht'] == A['federleicht'] and A['album_sanft'] == A['sanft'] and f"Federleicht-Landungen: {A['album_federleicht']}" in A.get('album_zeile', '')),
       ('aus: kein Lob', B['landungen'] == 0 and not B['texte']), ('keine Fehler', not A['errors'] and not B['errors'])]
for n, v in chk: print(('OK   ' if v else 'FEHL ') + n); ok = ok and v
json.dump(res, open('tests/out/v31_landen.json', 'w'), indent=1, ensure_ascii=False)
print('LANDEN OK' if ok else 'LANDEN FEHLER')
sys.exit(0 if ok else 1)
