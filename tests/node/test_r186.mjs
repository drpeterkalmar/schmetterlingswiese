// E1 (v2.9): three.js r180 → r186. Prüft ohne Browser, was sich ohne GPU prüfen lässt:
// Version, alle Shader-#includes existieren in r186, alle verwendeten THREE-Namen gibt es noch, und die Spiel-Materialien
// und -Geometrien lassen sich mit r186 bauen (ShaderMaterial, InstancedBufferGeometry, Gelände, Gras, Himmel).
// Ob die Shader auf der GPU übersetzen und das Bild gleich bleibt, prüft der Heavy-Job im Browser (Screenshot-Vergleich).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';

const WURZEL = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const alleJs = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? alleJs(path.join(d, e.name)) : e.name.endsWith('.js') ? [path.join(d, e.name)] : []);
const QUELLEN = alleJs(path.join(WURZEL, 'js')).map((f) => [f, fs.readFileSync(f, 'utf8')]);

test('lib ist three.js r186 (core + module gleich)', () => {
  assert.equal(THREE.REVISION, '186');
  const core = fs.readFileSync(path.join(WURZEL, 'lib/three.core.min.js'), 'utf8');
  assert.match(core, /"186"/);
});

test('alle Shader-#include-Bausteine gibt es in r186', () => {
  const namen = new Set();
  for (const [, s] of QUELLEN) for (const m of s.matchAll(/#include <([a-z_0-9]+)>/g)) namen.add(m[1]);
  assert.ok(namen.size >= 2, 'mindestens tonemapping/colorspace');
  for (const n of namen) assert.ok(typeof THREE.ShaderChunk[n] === 'string', `ShaderChunk fehlt: ${n}`);
});

test('alle im Spiel verwendeten THREE-Namen existieren in r186', () => {
  const namen = new Set();
  for (const [, s] of QUELLEN) for (const m of s.matchAll(/THREE\.([A-Za-z0-9_]+)/g)) namen.add(m[1]);
  const fehlt = [...namen].filter((n) => !(n in THREE));
  assert.deepEqual(fehlt, []);
});

test('Spiel-Materialien und Geometrien lassen sich mit r186 bauen', async () => {
  const gfx = await import('../../js/engine/gfx.js');
  const { WORLDS } = await import('../../js/game/worlds.js');
  const T = await import('../../js/world/terrain.js');
  const N = await import('../../js/world/nature.js');
  const mats = [
    gfx.toonMat({ vc: true, rim: 0.5 }), gfx.toonMat({ wing: true, map: new THREE.Texture(), instWing: true, alphaTest: 0.5, flap: [0.3, 0.9, 13] }),
    gfx.toonMat({ rig: true, vc: true }), gfx.toonMat({ sway: 0.2, tint: true, iri: true, transparent: true }),
    gfx.terrainMat(), gfx.grassMat(64), gfx.skyMat(), gfx.farMat(), gfx.glowMat(), gfx.blobShadowMat(),
  ];
  for (const m of mats) {
    assert.ok(m.isShaderMaterial);
    assert.ok(m.vertexShader.includes('void main') && m.fragmentShader.includes('void main'));
  }
  T.setTerrain(WORLDS[2].terrain); T.setPatch(WORLDS[2].patch);
  const terr = T.buildTerrain(WORLDS[2]);
  assert.ok(terr.geometry.attributes.position.count > 10000);
  const gras = N.buildGrass(500, 64, () => 0.5);
  assert.equal(gras.geometry.instanceCount, 500);
  assert.ok(Number.isFinite(T.height(3, 4)));
});
