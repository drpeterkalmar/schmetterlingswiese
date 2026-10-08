// E4/#6 (v2.9): gerichteter Kontaktschatten und gebackene Baumschatten (js/engine/schatten.js), Anschluss Figur/Welt.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kontaktParameter, backeBaumschatten, sonnenSchatten, KRONE, KONTAKT_AN } from '../../js/engine/schatten.js';

const sonne = (el, az) => [Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)];

test('Kontaktschatten: zur Schattenseite gestreckt/versetzt, flache Sonne länger, Höhe macht kleiner/blasser', () => {
  assert.equal(KONTAKT_AN, true);
  const S = sonne(0.42, 0.9), k0 = kontaktParameter(S, 0), k5 = kontaktParameter(S, 5);
  // Versatz zeigt weg von der Sonne
  assert.ok(k5.x * S[0] + k5.z * S[2] < 0, 'weg von der Sonne');
  assert.ok(Math.hypot(k5.x, k5.z) > Math.hypot(k0.x, k0.z), 'höher → weiter versetzt');
  assert.ok(Math.hypot(k5.x, k5.z) < 2.5, 'bleibt in der Nähe der Figur');
  assert.ok(k0.laenge > k0.breite, 'länglich');
  assert.ok(k5.breite < k0.breite && k5.alpha < k0.alpha, 'kleiner und blasser in der Höhe');
  // Mittagssonne fast rund, Morgensonne länger
  const mittag = kontaktParameter(sonne(1.3, 0.5), 0), abend = kontaktParameter(sonne(0.25, 0.5), 0);
  assert.ok(mittag.lang < 1.15 && abend.lang > mittag.lang + 0.4, `${mittag.lang} / ${abend.lang}`);
  // wie bisher am Boden: Größe 1,1, Deckkraft 0,4; ganz oben 0,35 / 0,05
  assert.equal(k0.breite, 1.1); assert.equal(k0.alpha, 0.4);
  const hoch = kontaktParameter(S, 40); assert.equal(hoch.breite, 0.35); assert.equal(hoch.alpha, 0.05);
  // Drehung: Längsachse (lokal z) zeigt in Schattenrichtung
  const D = sonnenSchatten(S); assert.ok(Math.abs(Math.sin(k0.yaw) - D.dx) < 1e-9 && Math.abs(Math.cos(k0.yaw) - D.dz) < 1e-9);
});

test('Baumschatten: Kronenschatten auf der sonnenabgewandten Seite, Fuß dunkel, sonst nichts', () => {
  const S = sonne(0.5, 2.0), W = 320, N = 512, px = W / N;
  const { daten } = backeBaumschatten([{ x: 20, z: -30, s: 1, kind: 'round' }], S, { groesse: N, welt: W });
  const wert = (x, z) => daten[Math.floor((z + W / 2) / px) * N + Math.floor((x + W / 2) / px)];
  const D = sonnenSchatten(S), off = KRONE.round.y * D.cot;
  assert.ok(wert(20 + D.dx * off, -30 + D.dz * off) > 150, 'Kronenmitte im Schatten');
  assert.ok(wert(20, -30) > 80, 'Fuß dunkel');
  assert.equal(wert(20 - D.dx * off, -30 - D.dz * off), 0, 'Sonnenseite hell');
  assert.equal(wert(-100, 100), 0, 'weit weg nichts');
  // Schwerpunkt des Schattens liegt auf der Schattenseite
  let sx = 0, sz = 0, sw = 0;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const v = daten[j * N + i]; if (v) { sx += ((i + 0.5) * px - W / 2) * v; sz += ((j + 0.5) * px - W / 2) * v; sw += v; } }
  assert.ok(((sx / sw - 20) * D.dx + (sz / sw + 30) * D.dz) > 2, 'Schwerpunkt verschoben');
  // leer → alles 0
  assert.ok(backeBaumschatten([], S, { groesse: 64 }).daten.every((v) => v === 0));
});

test('Anschluss: Welt backt Baumschatten-Textur, Figur hat gerichteten Kontaktschatten', async () => {
  const THREE = await import('three');
  const { World, BAUM_STAERKE } = await import('../../js/world/world.js');
  const { WORLDS } = await import('../../js/game/worlds.js');
  const { G } = await import('../../js/engine/gfx.js');
  const { QUALITY, GRASS_MAX } = await import('../../js/engine/renderer.js');
  const w = new World(new THREE.Scene());
  w.fx = { bursts: { emit() {} }, audio: { sfx() {} }, pan: () => 0 };
  w.build(WORLDS[0], { ...QUALITY[1], grassMax: GRASS_MAX, dekoK: 1 }, 'x');
  assert.ok(G.uBaumSh.value && G.uBaumSh.value.isDataTexture);
  assert.equal(G.uBaumShP.value.y, BAUM_STAERKE);
  assert.ok(G.uBaumSh.value.image.data.some((v) => v > 100), 'es gibt Schatten');
  w.build(WORLDS[4], { ...QUALITY[1], grassMax: GRASS_MAX, dekoK: 1 }, 'x');
  assert.equal(G.uBaumShP.value.y, BAUM_STAERKE * 0.5, 'nachts halb');
  const { Player } = await import('../../js/actors/player.js');
  const sc = new THREE.Scene(), p = new Player(sc);
  p.pos.set(3, 8, 4); p.updateShadow();
  assert.ok(p.shadow.material.uniforms.uOpacity.value < 0.4);
  assert.ok(p.shadow.scale.z > p.shadow.scale.x, 'gestreckt');
  p.updateShadow(0.3); assert.equal(p.shadow.material.uniforms.uOpacity.value, 0.3);
  assert.equal(p.shadow.material.userData.keinBloom, true);
});
