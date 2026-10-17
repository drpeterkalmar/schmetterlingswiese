// v3.1 Referenz-Flugbahn: dasselbe 10-s-Eingabeskript je Stufe durch Player.update (fester 60-Hz-Takt, ohne Browser).
// Erzeugt (auf dem v3.0-Stand ausgeführt) tests/node/v30_flugbahn.json; test_flugschule.mjs vergleicht damit, dass
// alle Regler auf 0 genau die v3.0-Bahn ergeben (Messgröße 12: ±1 cm nach 10 s).
// Aufruf: node --import ./tests/node/umgebung.mjs tests/node/flugbahn_ref.mjs [ausgabe.json]
import * as THREE from 'three';
import { writeFileSync } from 'node:fs';
import { Player } from '../../js/actors/player.js';
import { height } from '../../js/world/terrain.js';

export const STUFEN = { leicht: [6.3, 1.8], mittel: [7.0, 1.9], schwer: [7.8, 2.0] };
// Eingabe über die Zeit: geradeaus, steigen, links, rechts + sinken, Kurve + steigen, geradeaus, Sturz, Steigen
export function eingabe(t) {
  if (t < 1) return { turn: 0, climb: 0 };
  if (t < 3) return { turn: 0, climb: 1 };
  if (t < 5) return { turn: -1, climb: 0 };
  if (t < 6.5) return { turn: 1, climb: -0.6 };
  if (t < 8) return { turn: 0.5, climb: 0.7 };
  if (t < 9) return { turn: 0, climb: -1 };
  return { turn: 0, climb: 0 };
}
export function fliegeRef(stufe, skript = eingabe, sek = 10) {
  const [v, tr] = STUFEN[stufe];
  const pl = new Player(new THREE.Scene());
  pl.baseSpeed = v; pl.turnRate = tr; pl.speed = v; pl.landK = 1.9;
  pl.reset(new THREE.Vector3(3, height(3, 5) + 12, 5), 0.4);
  const out = [], dt = 1 / 60;
  let t = 0;
  for (let i = 0; i < sek * 60; i++) {
    const inp = skript(t);
    pl.update(dt, t, inp); t += dt;
    if ((i + 1) % 30 === 0) out.push({ t: +t.toFixed(3), x: pl.pos.x, y: pl.pos.y, z: pl.pos.z, v: pl.speed, yaw: pl.yaw });
  }
  return out;
}
if (process.argv[1] && process.argv[1].endsWith('flugbahn_ref.mjs')) {
  const res = {};
  for (const s of Object.keys(STUFEN)) res[s] = fliegeRef(s);
  const ziel = process.argv[2] || 'tests/node/v30_flugbahn.json';
  writeFileSync(ziel, JSON.stringify(res, null, 1));
  console.log('geschrieben', ziel, res.mittel[res.mittel.length - 1]);
}
