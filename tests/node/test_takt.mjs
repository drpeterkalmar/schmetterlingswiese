// E5 (v2.9): fester Simulationstakt (js/engine/takt.js). Kern des Auftrags: gleiche Flugbahn bei 60, 90, 120 und 144 Hz
// (und mit Ruckeln) – geprüft am echten Flugmodell (js/actors/player.js) mit einem festen Eingabe-Drehbuch.
// Zum Vergleich: der alte Weg (variables dt, ?takt=0) weicht zwischen 60 und 120 Hz messbar ab.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Takt, Darstellung } from '../../js/engine/takt.js';

test('Schrittzahl: 60 Hz = 1 je Bild (auch mit Zittern), 120 Hz = abwechselnd 0/1, Rückstand gedeckelt', () => {
  const T = new Takt();
  let n = 0; for (let i = 0; i < 600; i++) { const s = T.schritte(1 / 60 + (i % 2 ? 0.0012 : -0.0012)); assert.equal(s, 1); n += s; }
  assert.equal(n, 600);
  const T2 = new Takt(); const f = []; for (let i = 0; i < 8; i++) f.push(T2.schritte(1 / 120));
  assert.deepEqual(f, [0, 1, 0, 1, 0, 1, 0, 1]);
  assert.ok(Math.abs(T2.alpha) < 1e-9 || Math.abs(T2.alpha - 0.5) < 1e-9);
  const T3 = new Takt(); assert.equal(T3.schritte(0.4), 3, 'Hänger: höchstens 3 Schritte (wie bisher dt ≤ 50 ms)'); assert.equal(T3.acc, 0);
  // Summe über lange Zeit stimmt bei 90/144 Hz (keine verlorene Zeit)
  for (const hz of [90, 144]) { const Tx = new Takt(); let m = 0; for (let i = 0; i < hz * 10; i++) m += Tx.schritte(1 / hz); assert.ok(Math.abs(m - 600) <= 1, `${hz} Hz: ${m}`); }
});

test('Darstellung: interpoliert Lage/Drehung/Sichtwinkel und stellt den Simulationszustand exakt (Euler) wieder her', () => {
  const cam = new THREE.PerspectiveCamera(60, 1, 0.1, 100), tilt = new THREE.Object3D();
  const D = new Darstellung(THREE.Vector3, THREE.Quaternion).hinzu(cam, { fov: true }).hinzu(tilt);
  cam.position.set(0, 0, 0); cam.fov = 60; tilt.rotation.set(0.3, 0, -0.2);
  D.merkeVorher();
  cam.position.set(2, 0, 0); cam.fov = 70; tilt.rotation.set(2.9, 0, 0.4); // große Neigung (Looping)
  D.merkeNachher();
  D.anwenden(0.5);
  assert.ok(Math.abs(cam.position.x - 1) < 1e-9 && Math.abs(cam.fov - 65) < 1e-9);
  D.zurueck();
  assert.equal(cam.position.x, 2); assert.equal(cam.fov, 70);
  assert.equal(tilt.rotation.x, 2.9); assert.equal(tilt.rotation.z, 0.4); assert.equal(tilt.rotation.y, 0);
});

// Flug-Drehbuch über die Simulationszeit: steigen, Kurve, sinken, Wechsel – Eingabe hängt nur an der Zeit
const eingabe = (t) => ({ turn: t < 2 ? 0 : t < 5 ? 0.8 : t < 7 ? -1 : Math.sin(t * 1.3) * 0.6, climb: t < 1.5 ? 1 : t < 4 ? 0 : t < 6 ? -0.25 : 0.4 * Math.cos(t * 0.7) });

async function fliege(hz, sek, mitTakt, zittern = 0) {
  const { Player } = await import('../../js/actors/player.js');
  const { setTerrain } = await import('../../js/world/terrain.js');
  const { WORLDS } = await import('../../js/game/worlds.js');
  setTerrain(WORLDS[0].terrain);
  const p = new Player(new THREE.Scene());
  p.reset(new THREE.Vector3(6, 6, 14), Math.PI * 0.85);
  const T = new Takt();
  let tSim = 0, tWand = 0, i = 0;
  const bahn = [];
  while (tWand < sek) {
    const dt = 1 / hz + (zittern ? (((i * 7919) % 13) / 13 - 0.5) * zittern : 0); i++;
    tWand += dt;
    if (mitTakt) {
      const n = T.schritte(dt);
      for (let k = 0; k < n; k++) { tSim += T.h; p.update(T.h, tSim, eingabe(tSim)); }
    } else { const d = Math.min(dt, 0.05); tSim += d; p.update(d, tSim, eingabe(tSim)); }
  }
  bahn.push(p.pos.x, p.pos.y, p.pos.z, p.yaw);
  return { bahn, tSim };
}

test('fester Takt: gleiche Flugbahn bei 60, 90, 120, 144 Hz und mit Ruckeln', async () => {
  const ref = await fliege(60, 12, true);
  for (const [hz, z] of [[90, 0], [120, 0], [144, 0], [60, 0.006], [120, 0.003]]) {
    const r = await fliege(hz, 12, true, z);
    // gleiche Schrittzahl bis auf höchstens einen Schritt Rest → gleiche Bahn bis auf einen Schritt (≈ 12 cm bei 7 m/s)
    const d = Math.hypot(r.bahn[0] - ref.bahn[0], r.bahn[1] - ref.bahn[1], r.bahn[2] - ref.bahn[2]);
    if (Math.abs(r.tSim - ref.tSim) < 1e-9) assert.ok(d < 1e-9, `${hz} Hz: exakt gleich erwartet, Abstand ${d}`);
    else assert.ok(d < 0.2, `${hz} Hz (Zittern ${z}): Abstand ${d.toFixed(3)} m nach 12 s`);
  }
});

test('Vergleich alter Weg (variables dt): 60 vs. 120 Hz weichen ab – genau das behebt der feste Takt', async () => {
  const a = await fliege(60, 12, false), b = await fliege(120, 12, false);
  const d = Math.hypot(a.bahn[0] - b.bahn[0], a.bahn[1] - b.bahn[1], a.bahn[2] - b.bahn[2]);
  const t1 = await fliege(60, 12, true), t2 = await fliege(120, 12, true);
  const dT = Math.hypot(t1.bahn[0] - t2.bahn[0], t1.bahn[1] - t2.bahn[1], t1.bahn[2] - t2.bahn[2]);
  console.log(`  Abstand nach 12 s: variables dt ${d.toFixed(3)} m, fester Takt ${dT.toFixed(6)} m`);
  assert.ok(dT < d, 'fester Takt näher beieinander');
});

test('Gefühl bei 60 Hz: fester Takt fliegt wie bisher (Abstand zur alten 60-Hz-Bahn klein)', async () => {
  const alt = await fliege(60, 12, false), neu = await fliege(60, 12, true);
  const d = Math.hypot(alt.bahn[0] - neu.bahn[0], alt.bahn[1] - neu.bahn[1], alt.bahn[2] - neu.bahn[2]);
  assert.ok(d < 0.05, `Abstand ${d}`);
});
