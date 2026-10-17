// v3.1 Messgrößen der Flugschule ohne Browser (Datenblatt Abschnitt 5, Nr. 1–3, 5): läuft auf jedem Stand – Teile, die
// es dort noch nicht gibt, kommen als null. Ausgabe: JSON auf stdout (für den Bericht vorher/nachher).
// Aufruf: node --import ./tests/node/umgebung.mjs tests/node/flugschule_mess.mjs
import * as THREE from 'three';
import { Player } from '../../js/actors/player.js';
import { height } from '../../js/world/terrain.js';
import { STUFEN } from './flugbahn_ref.mjs';

let FS = null;
try { FS = await import('../../js/game/flugschule.js'); } catch (e) { FS = null; }
const dt = 1 / 60;

function neu(stufe = 'mittel', y = 10) {
  const [v, tr] = STUFEN[stufe];
  const pl = new Player(new THREE.Scene());
  pl.baseSpeed = v; pl.turnRate = tr; pl.speed = v; pl.diffId = stufe; pl.landK = 1.9;
  pl.reset(new THREE.Vector3(3, height(3, 5) + y, 5), 0.4);
  return pl;
}
// Tempo-Modell allein (ohne Boden/Decke): 10 s Vollausschlag, danach loslassen
function tempoVerlauf(stufe, climb) {
  const v0 = STUFEN[stufe][0];
  let pitch = 0, v = v0, t = 0, min = v, max = v, back = null;
  const schritt = (c) => {
    pitch += (c * 0.58 - pitch) * Math.min(1, dt * 4);
    if (FS && FS.FLUG.schwung.an) v = FS.tempoSchritt(v, v0, pitch, dt, stufe === 'leicht');
    else v += (v0 * (1 - pitch * 0.28) - v) * Math.min(1, dt * 2);
  };
  for (let i = 0; i < 600; i++) { schritt(climb); min = Math.min(min, v); max = Math.max(max, v); }
  const ende = v;
  for (let i = 0; i < 600; i++) { schritt(0); t += dt; if (back === null && Math.abs(v - v0) <= 0.05 * v0) back = t; }
  return { ende: +(ende / v0).toFixed(3), min: +(min / v0).toFixed(3), max: +(max / v0).toFixed(3), zurueck5: back === null ? null : +back.toFixed(2) };
}
// Höhengewinn beim Halten ▲ (Player, echte Eingabe-Glättung wie Input.update: Lerp 9/s)
function halten(stufe, sek) {
  const pl = neu(stufe), y0 = pl.pos.y; let c = 0, t = 0;
  for (let i = 0; i < sek * 60; i++) { c += (1 - c) * Math.min(1, dt * 9); pl.update(dt, t, { turn: 0, climb: c }); t += dt; }
  return +(pl.pos.y - y0).toFixed(3);
}
// Flatter-Tipps: Tipp = 0,1 s ▲ (Eingabe), Stoß beim Loslassen (wie Input); Höhengewinn gegenüber Geradeausflug
function tipps(stufe, zeiten, sek = 1.2) {
  const lauf = (mitStoss) => {
    const pl = neu(stufe), y0 = pl.pos.y; let c = 0, t = 0, stoesse = 0;
    for (let i = 0; i < sek * 60; i++) {
      const roh = zeiten.some(z => t >= z && t < z + 0.1) ? 1 : 0;
      c += (roh - c) * Math.min(1, dt * 9);
      if (mitStoss && pl.flatter && zeiten.some(z => Math.abs(t - (z + 0.1)) < dt / 2)) stoesse += pl.flatter(t) ? 1 : 0;
      pl.update(dt, t, { turn: 0, climb: c }); t += dt;
    }
    return { dy: pl.pos.y - y0, stoesse };
  };
  const ohne = lauf(false).dy, mit = lauf(true);
  return { mitTipps: +mit.dy.toFixed(3), nurEingabe: +ohne.toFixed(3), stoesse: mit.stoesse };
}
// Aufwind: Figur fliegt ohne Eingabe in eine Säule (Mitte vor ihr), Höhe nach 6 s; Hub in der Mitte/am Rand
function aufwind(stufe) {
  if (!FS || !FS.FLUG.aufwind.an) return null;
  const A = FS.FLUG.aufwind, W = stufe === 'leicht' ? A.Wleicht : A.W;
  const mitte = FS.aufwindProfil(0, 10, W).hub, rand = FS.aufwindProfil(A.R * 0.97, 10, W).hub;
  const pl = neu(stufe, 4), y0 = pl.pos.y;
  if (!pl.aufwinde) return { mitte: +mitte.toFixed(2), rand: +rand.toFixed(2), hoehe6s: null };
  const fx = Math.sin(pl.yaw), fz = Math.cos(pl.yaw);
  const ax = pl.pos.x + fx * 8, az = pl.pos.z + fz * 8;
  pl.aufwinde = [{ x: ax, z: az, gy: height(ax, az), W }];
  let t = 0, t15 = null;
  for (let i = 0; i < 600; i++) { pl.update(dt, t, { turn: 0, climb: 0 }); t += dt; if (t15 === null && pl.pos.y - y0 >= 15) t15 = t; }
  return { mitte: +mitte.toFixed(2), rand: +rand.toFixed(2), t15m: t15 === null ? null : +t15.toFixed(2) };
}

const res = { stand: FS ? 'v3.1' : 'v3.0', regler: process.env.URLQ || '' };
for (const s of Object.keys(STUFEN)) {
  res[s] = {
    sturz: tempoVerlauf(s, -1), steigen: tempoVerlauf(s, 1),
    halten1s: halten(s, 1), halten3s: halten(s, 3),
    tipp1: tipps(s, [0]), tipp3: tipps(s, [0, 0.3, 0.6]), tipp4: tipps(s, [0, 0.3, 0.6, 0.7]),
    aufwind: aufwind(s),
  };
}
console.log(JSON.stringify(res, null, 1));
