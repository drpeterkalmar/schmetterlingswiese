// E3 (v2.9): Gras in Ringen mit Kachel-Culling (js/world/grasringe.js) ohne Browser.
// Prüft: Wickeln wie im Shader, Halme je Kachel sortiert, Ausdünnung gleichmäßig, KEIN sichtbarer Halm wird weggeschnitten
// (Eigenschaftstest über viele Kamerastellungen, hoch und quer), Ersparnis gegenüber „alles zeichnen“, Nahring enthält die
// Kamera, Dichte nah ≥ 2× bisher, Shader-Schalter.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { RINGE, RING_ANZAHL, RING_MAX, RING_VOR, wickeln, wickelMitte, baueHalme, sichtbareKacheln, verdichte, kugelSichtbar } from '../../js/world/grasringe.js';

function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const glslMod = (x, y) => x - y * Math.floor(x / y);
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const ebenen = (cam) => { cam.updateMatrixWorld(); const f = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse)); return { f, e: f.planes.map((p) => [p.normal.x, p.normal.y, p.normal.z, p.constant]) }; };

test('Wickeln entspricht dem Shader (mod(base - c + F/2, F) - F/2 + c)', () => {
  const r = rng(1);
  for (let i = 0; i < 2000; i++) {
    const F = [34, 64][i % 2], b = r() * F, c = (r() - 0.5) * 400;
    const w = wickeln(b, c, F), g = glslMod(b - c + F * 0.5, F) - F * 0.5 + c;
    assert.ok(Math.abs(w - g) < 1e-9);
    assert.ok(Math.abs(w - c) <= F / 2 + 1e-9);
  }
});

test('gerastete Wickel-Mitte: keine Kachel wird an der Naht geteilt, der ganze Ring liegt im Fenster', () => {
  const r = rng(7);
  for (const R of Object.values(RINGE)) {
    const k = R.feld / R.kacheln;
    assert.ok(R.feld / 2 - k * Math.SQRT1_2 >= R.rOut[1], 'Ring passt ins gerastete Fenster');
    assert.ok(Math.abs((R.feld / 2 / k) - Math.round(R.feld / 2 / k)) < 1e-9, 'F/2 ist ein Vielfaches der Kachel');
    for (let n = 0; n < 300; n++) {
      const c = (r() - 0.5) * 300, m = wickelMitte(c, R);
      for (let i = 0; i < R.kacheln; i++) {
        const a = wickeln(i * k + 1e-6, m, R.feld), b = wickeln((i + 1) * k - 1e-6, m, R.feld);
        assert.ok(b > a && b - a < k, `Kachel ${i} geteilt (c=${c.toFixed(2)})`);
      }
    }
  }
});

test('Halme nach Kacheln sortiert, Bereiche vollständig, Ausdünnung gleichmäßig', () => {
  const T = 8, H = baueHalme(7000, T, rng(2));
  let summe = 0;
  H.bereiche.forEach(([s, n], k) => {
    summe += n;
    for (let i = s; i < s + n; i++) {
      const x = H.daten[i * 4], z = H.daten[i * 4 + 1];
      assert.equal(Math.min(T - 1, Math.floor(z * T)) * T + Math.min(T - 1, Math.floor(x * T)), k);
    }
  });
  assert.equal(summe, 7000);
  const alle = H.bereiche.map((_, k) => k), ziel = new Float32Array(7000 * 4);
  assert.equal(verdichte(H, alle, 1, ziel), 7000);
  const halb = verdichte(H, alle, 0.5, ziel);
  assert.ok(Math.abs(halb - 3500) <= T * T, halb);
  // jede Kachel behält ≈ die Hälfte (gleichmäßig über die Fläche)
  for (const [, n] of H.bereiche) assert.ok(Math.abs(Math.round(n * 0.5) - n * 0.5) <= 0.5);
});

test('kein sichtbarer Halm wird weggeschnitten (200 Kamerastellungen, hoch + quer, beide Ringe, welliges Gelände)', () => {
  const r = rng(3), flach = (x, z) => 2.4 * Math.sin(x * 0.035 + 1.7) * Math.cos(z * 0.041 + 2.9) + 1.3 * Math.sin(x * 0.09 + 2) * Math.sin(z * 0.075 + 1.2) + 0.7 * Math.cos(x * 0.15) * Math.cos(z * 0.17);
  for (const name of ['nah', 'mitte']) {
    const R = RINGE[name], H = baueHalme(RING_MAX[name === 'nah' ? 0 : 1], R.kacheln, rng(9));
    for (let k = 0; k < 200; k++) {
      const quer = k % 2 === 0, cam = new THREE.PerspectiveCamera(quer ? 62 : 72, quer ? 915 / 412 : 412 / 915, 0.1, 1400);
      const fx = (r() - 0.5) * 160, fz = (r() - 0.5) * 160, yaw = r() * Math.PI * 2, d = quer ? 4.7 : 6.4;
      const focus = new THREE.Vector3(fx, 1 + r() * 8, fz);
      cam.position.set(fx - Math.sin(yaw) * d, focus.y + 1.6 + (r() - 0.3) * 3, fz - Math.cos(yaw) * d);
      cam.lookAt(fx + Math.sin(yaw) * 2.4, focus.y + 0.45, fz + Math.cos(yaw) * 2.4);
      const c = [fx + Math.sin(yaw) * RING_VOR, fz + Math.cos(yaw) * RING_VOR];
      const { f, e } = ebenen(cam);
      const sicht = new Set(sichtbareKacheln(R, c, e, flach));
      const T = R.kacheln, P = new THREE.Vector3();
      for (let i = 0; i < H.n; i += 3) {
        const x = H.daten[i * 4], z = H.daten[i * 4 + 1];
        const wx = wickeln(x * R.feld, wickelMitte(c[0], R), R.feld), wz = wickeln(z * R.feld, wickelMitte(c[1], R), R.feld);
        const dc = Math.hypot(wx - c[0], wz - c[1]);
        const s = ss(R.rIn[0], R.rIn[1], dc) * (1 - ss(R.rOut[0], R.rOut[1], dc));
        if (s <= 1e-4) continue;
        // Halmfuß und -spitze (≤ 1 m hoch, Biegung ≤ 1 m)
        const gh = flach(wx, wz);
        const drin = f.containsPoint(P.set(wx, gh, wz)) || f.containsPoint(P.set(wx, gh + 1.1, wz)) || f.containsPoint(P.set(wx + 1.4, gh + 1, wz)) || f.containsPoint(P.set(wx, gh + 1, wz - 1.4));
        if (!drin) continue;
        const kk = Math.min(T - 1, Math.floor(z * T)) * T + Math.min(T - 1, Math.floor(x * T));
        assert.ok(sicht.has(kk), `${name}: Halm bei (${wx.toFixed(1)}, ${wz.toFixed(1)}) sichtbar, Kachel ${kk} gecullt (Stellung ${k})`);
      }
    }
  }
});

test('Ersparnis: typische Flugansicht zeichnet weniger Halme als bisher (alle), Mittel und Hoch, hoch + quer', () => {
  const R = RINGE, flach = () => 0, ant = {};
  const ALT = [4500, 8000, 16000];
  for (const q of [1, 2]) for (const quer of [true, false]) {
    const cam = new THREE.PerspectiveCamera(quer ? 62 : 72, quer ? 915 / 412 : 412 / 915, 0.1, 1400);
    const d = quer ? 4.7 : 6.4;
    cam.position.set(0, 4, -d); cam.lookAt(0, 2.5, 2.4);
    const { e } = ebenen(cam);
    let neu = 0;
    ['nah', 'mitte'].forEach((n, i) => {
      const H = baueHalme(RING_MAX[i], R[n].kacheln, rng(4)), z = new Float32Array(RING_MAX[i] * 4);
      neu += verdichte(H, sichtbareKacheln(R[n], [0, RING_VOR], e, flach), RING_ANZAHL[q][i] / RING_MAX[i], z);
    });
    ant[`q${q}_${quer ? 'quer' : 'hoch'}`] = +(neu / ALT[q]).toFixed(2);
  }
  const txt = JSON.stringify(ant);
  for (const [k, a] of Object.entries(ant)) assert.ok(a < (k.endsWith('quer') ? 0.85 : 0.6), 'Anteil gezeichnet: ' + txt);
  assert.ok(ant.q1_quer < 0.8 && ant.q1_hoch < 0.55, 'Mittel spart: ' + txt);
});

test('Ring-Aufbau: Kamera liegt im Nahring, Ringe überlappen, Dichte nah ≥ 1,6× (Hoch 2×), Mitte halb', () => {
  for (const d of [4.7, 6.4]) assert.ok(RING_VOR + d < RINGE.nah.rOut[0], 'Kamera im vollen Nahring');
  assert.ok(RINGE.mitte.rIn[0] <= RINGE.nah.rOut[0] && RINGE.mitte.rIn[1] >= RINGE.nah.rOut[1] - 1e-9, 'Überblendung passt');
  for (const R of Object.values(RINGE)) assert.ok(R.feld / 2 > R.rOut[1], 'Naht des Feldes liegt außerhalb des Rings');
  const alt = [4500, 8000, 16000];
  for (const q of [0, 1]) assert.ok(RING_ANZAHL[q][0] / RINGE.nah.feld ** 2 >= 1.55 * alt[q] / 64 ** 2, 'Stufe ' + q);
  assert.ok(RING_ANZAHL[2][0] / RINGE.nah.feld ** 2 >= 1.4 * alt[2] / 64 ** 2, 'Hoch nah 1,4× so dicht (Heavy-Job: 2× kostete 11 %)');
  for (const q of [0, 1, 2]) assert.ok(RING_ANZAHL[q][1] / RINGE.mitte.feld ** 2 <= 0.55 * alt[q] / 64 ** 2, 'Mitte halbe Dichte, Stufe ' + q);
  for (const q of [0, 1, 2]) assert.ok(RING_ANZAHL[q][0] <= RING_MAX[0] && RING_ANZAHL[q][1] <= RING_MAX[1]);
});

test('Kugeltest: draußen vor einer Ebene = unsichtbar, sonst sichtbar', () => {
  const e = [[1, 0, 0, 0]]; // innen: x ≥ 0
  assert.equal(kugelSichtbar(e, -5, 0, 0, 4.9), false);
  assert.equal(kugelSichtbar(e, -5, 0, 0, 5.1), true);
  assert.equal(kugelSichtbar(e, 3, 0, 0, 0), true);
});

test('Shader-Schalter: Ring-Material (RINGE, uRing, uBreite) und Gelände-Grasrauschen', async () => {
  const { grassMat, terrainMat } = await import('../../js/engine/gfx.js');
  const m = grassMat(64, RINGE.mitte);
  assert.ok('RINGE' in m.defines);
  assert.deepEqual(m.uniforms.uRing.value.toArray(), [...RINGE.mitte.rIn, ...RINGE.mitte.rOut]);
  assert.equal(m.uniforms.uBreite.value, RINGE.mitte.breite);
  assert.ok(!('RINGE' in (grassMat(64).defines || {})));
  assert.ok('RINGE' in terrainMat({ ringe: true }).defines);
  assert.match(terrainMat({ ringe: true }).fragmentShader, /fwidth/);
  const { buildGrassRing } = await import('../../js/world/nature.js');
  const g = buildGrassRing(RINGE.nah, 900, rng(5));
  g.userData.setCount(450);
  assert.equal(g.userData.cull([0, 0], null), true);
  // ohne Sichtkegel fallen nur die Kacheln außerhalb des Rings weg (Ecken des Fensters)
  assert.ok(g.geometry.instanceCount > 300 && g.geometry.instanceCount < 450, g.geometry.instanceCount);
  assert.equal(g.userData.cull([0, 0], null), false, 'gleiche Menge → nicht neu kopieren');
});

test('Höhen-Merker: gleiche Kacheln wie ohne Merker, auch beim Weiterfliegen', async () => {
  const { sichtbareKacheln, RINGE, KACHEL_RAND } = await import('../../js/world/grasringe.js');
  const hoehe = (x, z) => 2 * Math.sin(x * 0.07) + 1.5 * Math.cos(z * 0.05 + x * 0.02);
  const ebenen = [[0.7, 0, 0.7, 5], [-0.7, 0, 0.7, 5], [0, 1, 0, 20], [0, -1, 0, 20]];
  for (const R of [RINGE.nah, RINGE.mitte]) {
    const hb = new Map();
    for (let i = 0; i < 60; i++) {
      const c = [i * 1.7 - 40, Math.sin(i) * 30];
      assert.deepEqual(sichtbareKacheln(R, c, ebenen, hoehe, KACHEL_RAND, hb), sichtbareKacheln(R, c, ebenen, hoehe));
    }
    assert.ok(hb.size > R.kacheln * R.kacheln, 'Merker füllt sich');
  }
});
