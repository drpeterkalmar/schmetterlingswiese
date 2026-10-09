// v3.0 Kunstflug-Figuren: Bahn-Test ohne Browser – genau die gemeinsame Bahnberechnung des Spiels (showOffset/showOrient,
// Hub showLift) im festen 60-Hz-Takt, je Figur normal (🎪) und als Sieger-Version (Bahn ×1,2, Dauer ×1,25), bei allen drei
// Reisetempos (Leicht/Mittel/Schwer) und beiden Seiten:
//   Start/Ende auf der Fluglinie (Abstand < 1 cm, Winkel 0), Ende = alte Flugrichtung, nie unter der Sicherheitshöhe,
//   keine NaN, kein Sprung zwischen zwei Bildern (Lage- und Winkeländerung je Bild begrenzt und gemessen),
//   Tempo an Anfang/Ende = Reisetempo (kein Tempo-Sprung), Hochziehen langsamer als Runterstürzen.
// KUNSTFLUG_BERICHT=1 → Messwerte als Tabelle (für V30_BERICHT.md)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { STUNTS, SAFE_H, showOffset, showOrient, showLift, liftAt, FINALE_AMP, FINALE_DUR, stuntTitle } from '../../js/game/stunts.js';
import { KUNSTFLUG, FLUGSHOW } from '../../js/game/kunstflug.js';

const H = 1 / 60;
const BASES = { leicht: 6.3, mittel: 7.0, schwer: 7.8 };
// Bahn wie Player.update (Zweig 'show'): Position schrittweise aus showOffset + Hub, Drehung aus showOrient
export function fliege(def, { base = 7, side = 1, grand = false, alt = 3.2, ground = 0 } = {}) {
  const dur = def.dur * (grand ? FINALE_DUR : 1), sp = base * (def.spd || 1.15);
  const S = { type: 'show', def, id: def.id, t: 0, dur, L: sp * dur, side, yaw: 0, amp: grand ? FINALE_AMP : 1,
    prev: new THREE.Vector3(), qt: new THREE.Quaternion(), q: new THREE.Quaternion(), p: 0 };
  const pos = new THREE.Vector3(0, ground + alt, 0), v = new THREE.Vector3();
  S.lift = showLift(S, 0, pos.y, 0, () => ground);
  const out = []; const q = new THREE.Quaternion();
  out.push({ t: 0, p: 0, pos: pos.clone(), q: new THREE.Quaternion() });
  for (let i = 0; i < 100000; i++) {
    S.t += H; const p = S.p = Math.min(1, S.t / S.dur);
    showOffset(S, p, v); v.y += S.lift * liftAt(p, S);
    pos.x += v.x - S.prev.x; pos.y += v.y - S.prev.y; pos.z += v.z - S.prev.z; S.prev.copy(v);
    showOrient(S, p, S.q);
    out.push({ t: S.t, p, pos: pos.clone(), q: S.q.clone() });
    if (p >= 1 - 1e-9) break;
  }
  return { S, out, sp, base };
}
const ang = (a, b) => 2 * Math.acos(Math.min(1, Math.abs(a.dot(b))));
const FWD = new THREE.Vector3(0, 0, 1);
export function messe(def, o = {}) {
  const { S, out, sp, base } = fliege(def, o);
  let maxStep = 0, maxRot = 0, maxRotP = 0, nan = false, minY = 1e9;
  const dtOf = (a, b) => (b.p - a.p) * S.dur;
  const N = out.length, sp0 = out[1].pos.distanceTo(out[0].pos) / dtOf(out[0], out[1]), spN = out[N - 1].pos.distanceTo(out[N - 2].pos) / dtOf(out[N - 2], out[N - 1]);
  let vMin = 1e9, vMax = 0;
  for (let i = 1; i < out.length; i++) {
    const a = out[i - 1], b = out[i];
    if (![b.pos.x, b.pos.y, b.pos.z, b.q.x, b.q.y, b.q.z, b.q.w].every(Number.isFinite)) nan = true;
    const d = b.pos.distanceTo(a.pos); maxStep = Math.max(maxStep, d); vMin = Math.min(vMin, d / H); vMax = Math.max(vMax, d / H);
    const r = ang(a.q, b.q); if (r > maxRot) { maxRot = r; maxRotP = b.p; }
    if (b.p > 0) minY = Math.min(minY, b.pos.y - (o.ground || 0));
  }
  const e = out[out.length - 1], s = out[0];
  const lat = Math.abs(e.pos.x - s.pos.x), endAng = ang(e.q, new THREE.Quaternion());
  const nose = FWD.clone().applyQuaternion(e.q);
  // Seitenversatz zur Fluglinie und Höhe (ohne Hub) am Ende
  const C = S._kf;
  return { S, out, sp, base, maxStep, maxRotDeg: maxRot * 180 / Math.PI, maxRotP, nan, minY, lat, endAng, noseEnd: nose, sp0, spN, vMin, vMax,
    endUp: e.pos.y - s.pos.y - S.lift, x: C.x, a: C.a, b: C.b, pC1: C.pC1, pC0: C.pC0, frames: out.length };
}

test('Kunstflug-Katalog: mindestens 8 neue Figuren, alte 11 Einlagen unverändert vorn, Name + Untertitel', () => {
  assert.ok(KUNSTFLUG.length >= 8, 'Anzahl ' + KUNSTFLUG.length);
  assert.deepEqual(STUNTS.slice(0, 11).map(d => d.id), ['doppel', 'korkenzieher', 'salto', 'bumerang', 'zickzack', 'rakete', 'sternschnuppe', 'tauchen', 'wackeltanz', 'superschraube', 'wirbel']);
  for (const d of KUNSTFLUG) {
    assert.ok(STUNTS.includes(d));
    assert.ok(d.sub && d.name && d.emoji, d.id);
    assert.match(stuntTitle(d, 'wiese'), / – /);
    assert.ok(d.hi > 0.15 && d.hi < 0.85, d.id + ' hi ' + d.hi);
  }
});

const rows = [];
for (const d of [...KUNSTFLUG, FLUGSHOW]) {
  test(`Bahn ${d.id}: Fluglinie, Sicherheitshöhe, kein Sprung, Reisetempo an den Enden`, () => {
    for (const [diff, base] of Object.entries(BASES)) for (const grand of [false, true]) for (const side of [1, -1]) {
      const r = messe(d, { base, grand, side });
      const tag = `${d.id} ${diff} ${grand ? 'Sieger' : '🎪'} Seite ${side}`;
      if (diff === 'mittel' && side === 1) rows.push({ id: d.id, grand, dur: r.S.dur, x: r.x, maxStep: r.maxStep, maxRot: r.maxRotDeg, maxRotP: r.maxRotP, minY: r.minY, vMin: r.vMin / base, vMax: r.vMax / base, pC0: r.pC0, pC1: r.pC1, lift: r.S.lift });
      assert.ok(!r.nan, tag + ': NaN');
      assert.ok(r.lat < 0.01, `${tag}: Seitenversatz ${r.lat.toFixed(4)} m`);
      assert.ok(Math.abs(r.endUp) < 0.01, `${tag}: Höhe am Ende ${r.endUp.toFixed(4)} m`);
      assert.ok(r.endAng < 1e-3, `${tag}: Winkel am Ende ${r.endAng}`);
      assert.ok(r.minY >= SAFE_H - 0.05, `${tag}: Tiefster Punkt ${r.minY.toFixed(2)} m < Sicherheitshöhe`);
      assert.ok(Math.abs(r.sp0 / base - 1) < 0.03 && Math.abs(r.spN / base - 1) < 0.03, `${tag}: Tempo an den Enden ${r.sp0.toFixed(2)}/${r.spN.toFixed(2)} statt ${base}`);
      assert.ok(r.maxStep < 0.4, `${tag}: Lage-Sprung ${r.maxStep.toFixed(3)} m/Bild`);
      assert.ok(r.maxRotDeg < (d.snap ? 32 : 22), `${tag}: Winkel-Sprung ${r.maxRotDeg.toFixed(1)}°/Bild bei p=${r.maxRotP.toFixed(3)}`);
      assert.ok((1 - r.pC1) * r.S.dur > 0.35, `${tag}: Ausleit-Gerade nur ${((1 - r.pC1) * r.S.dur).toFixed(2)} s (Rest-Verdrillung braucht sie)`);
      assert.ok(r.x > 0.55 && r.x < 1.8, `${tag}: Tempo-Maß ${r.x.toFixed(2)} (Figur zu schnell/langsam gegenüber Reisetempo)`);
    }
  });
}
test('Bericht', { concurrency: false }, () => {
  if (!process.env.KUNSTFLUG_BERICHT) return;
  console.log('id grand dur x maxStep maxRot° @p minY vMin vMax pC0 pC1 lift');
  for (const r of rows) console.log([r.id, r.grand ? 'S' : '-', r.dur.toFixed(2), r.x.toFixed(2), r.maxStep.toFixed(3), r.maxRot.toFixed(1), r.maxRotP.toFixed(3), r.minY.toFixed(2), r.vMin.toFixed(2), r.vMax.toFixed(2), r.pC0.toFixed(2), r.pC1.toFixed(2), r.lift.toFixed(2)].join(' '));
});
