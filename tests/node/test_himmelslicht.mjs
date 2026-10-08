// E4/#5 (v2.9): weiches Himmelslicht – SH9-Projektion und Irradianz (js/engine/himmelslicht.js), Anschluss in world.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shProjektion, irradianzSH, auswerten, himmelsLicht, luma } from '../../js/engine/himmelslicht.js';

const nahe = (a, b, eps, m) => assert.ok(Math.abs(a - b) <= eps, `${m}: ${a} ≠ ${b}`);
const RICHT = [[0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0.6, 0.64, -0.48]];

test('konstanter Himmel → überall dieselbe Irradianz (= Strahldichte)', () => {
  const E = irradianzSH(shProjektion(() => [0.3, 0.5, 0.7]));
  for (const d of RICHT) { const e = auswerten(E, ...d); nahe(e[0], 0.3, 0.01, 'r'); nahe(e[2], 0.7, 0.01, 'b'); }
});

test('linearer Verlauf a + b·y → a + ⅔·b·n.y (Kosinus-Faltung)', () => {
  const E = irradianzSH(shProjektion((x, y) => [1 + 0.6 * y, 1 + 0.6 * y, 1 + 0.6 * y]));
  nahe(auswerten(E, 0, 1, 0)[0], 1.4, 0.01, 'oben');
  nahe(auswerten(E, 0, -1, 0)[0], 0.6, 0.01, 'unten');
  nahe(auswerten(E, 1, 0, 0)[0], 1.0, 0.01, 'seitlich');
});

test('Welthimmel: Helligkeits-Mittel wie bisher, Sonnenseite heller, oben himmelfarben, unten wiesenfarben, nie negativ', async () => {
  const THREE = await import('three');
  const { WORLDS } = await import('../../js/game/worlds.js');
  const c = new THREE.Color(), rgb = (h) => { c.set(h); return [c.r, c.g, c.b]; };
  for (const w of WORLDS) {
    const el = w.sun.el, az = w.sun.az;
    const S = [Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)];
    const boden = w.ground.map(rgb).reduce((a, b) => a.map((v, i) => v + b[i] / w.ground.length), [0, 0, 0]);
    const alt = { himmel: rgb(w.amb.sky).map((v) => v * w.amb.k), boden: rgb(w.amb.gnd).map((v) => v * w.amb.k) };
    const p = { zenit: rgb(w.sky.zenith), horizont: rgb(w.sky.horizon), glow: rgb(w.sky.glow), sonne: S,
      sonnenFarbe: rgb(w.sun.col).map((v) => v * w.sun.k), boden, alt };
    const E = himmelsLicht(p);
    // Mittel über viele Normalen ≈ Mittel der alten Halbkugel
    let summe = 0, n = 0, min = 1e9;
    for (let i = 0; i < 400; i++) {
      const y = 1 - 2 * (i + 0.5) / 400, r = Math.sqrt(1 - y * y), ph = i * 2.39996;
      const e = auswerten(E, r * Math.cos(ph), y, r * Math.sin(ph));
      summe += luma(e); n++; min = Math.min(min, ...e);
    }
    const altMittel = luma(alt.himmel.map((v, i) => (v + alt.boden[i]) / 2));
    nahe(summe / n, altMittel, altMittel * 0.03, `${w.id} Mittel`);
    assert.ok(min > -0.02 * altMittel, `${w.id}: negative Irradianz ${min}`);
    // Sonnenseite (waagrecht zur Sonne) heller als die Gegenseite
    const h = Math.hypot(S[0], S[2]), zu = auswerten(E, S[0] / h, 0, S[2] / h), weg = auswerten(E, -S[0] / h, 0, -S[2] / h);
    assert.ok(luma(zu) > luma(weg), `${w.id}: Sonnenseite`);
    // oben eher Himmelsfarbe (blau-Anteil relativ höher als unten), unten eher Wiese (grün-Anteil relativ höher)
    const o = auswerten(E, 0, 1, 0), u = auswerten(E, 0, -1, 0);
    assert.ok(o[2] / luma(o) > u[2] / luma(u), `${w.id}: oben blauer als unten`);
    assert.ok(luma(o) > luma(u), `${w.id}: oben heller als unten`);
  }
});

test('Anschluss: Welt setzt uSH und uHimmel, Wolken behalten ihr eigenes Licht', async () => {
  const THREE = await import('three');
  const { World, HIMMEL_AN, HIMMEL_ANTEIL } = await import('../../js/world/world.js');
  const { WORLDS } = await import('../../js/game/worlds.js');
  const { G, toonMat } = await import('../../js/engine/gfx.js');
  const { QUALITY, GRASS_MAX } = await import('../../js/engine/renderer.js');
  assert.equal(HIMMEL_AN, true);
  const w = new World(new THREE.Scene());
  w.fx = { bursts: { emit() {} }, audio: { sfx() {} }, pan: () => 0 };
  w.build(WORLDS[3], { ...QUALITY[1], grassMax: GRASS_MAX, dekoK: 1 }, 'x');
  assert.equal(G.uHimmel.value, HIMMEL_ANTEIL);
  assert.ok(G.uSH.value[0].length() > 0.1);
  assert.equal(toonMat().uniforms.uSH, G.uSH, 'Toon-Material teilt die Himmels-SH');
  const wolke = w.clouds.children[0].material;
  assert.equal(wolke.uniforms.uHimmel.value, 0);
  assert.match(toonMat().fragmentShader, /shIrr\(N\)/);
});
