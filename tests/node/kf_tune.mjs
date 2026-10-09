// v3.0 Abstimm-Hilfe für Kunstflug-Figuren: sucht spd so, dass die Figur bei Mittel (7 m/s) mit ≈ 0,93 × Figurtempo fliegt,
// und zeigt Tempo-Maß, größte Drehung je Schritt und Länge der Ausleit-Geraden. Aufruf (Dauer vorher in kunstflug.js setzen):
//   node --import ./tests/node/umgebung.mjs tests/node/kf_tune.mjs immelmann,hammerhead
import { messe } from './test_kunstflug.mjs';
import { KUNSTFLUG } from '../../js/game/kunstflug.js';
const ids = process.argv[2].split(',');
for (const d of KUNSTFLUG.filter(d => ids.includes(d.id))) {
  const dur0 = d.dur;
  let lo = 0.02, hi = 0.98;
  for (let i = 0; i < 30; i++) { d.spd = (lo + hi) / 2; const r = messe(d, { base: 7 }); if (r.x > 0.93) lo = d.spd; else hi = d.spd; }
  d.spd = +((lo + hi) / 2).toFixed(2);
  const r = messe(d, { base: 7 }), l = messe(d, { base: 6.3 }), g = messe(d, { base: 7.8, grand: true });
  console.log(d.id, 'dur', d.dur, 'spd', d.spd, 'x', r.x.toFixed(2), l.x.toFixed(2), g.x.toFixed(2), 'rot', Math.max(r.maxRotDeg, l.maxRotDeg, g.maxRotDeg).toFixed(1), 'pC1', r.pC1.toFixed(2), 'exit s', ((1 - r.pC1) * r.S.dur).toFixed(2));
}
