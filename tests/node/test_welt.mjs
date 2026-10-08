// v2.9: Alle fünf Welten bauen in Node mit den neuen Teilen (Gras-Ringe, Gelände-Grasrauschen) und laufen ein Bild
// world.update() – fängt Tippfehler/fehlende Importe in der Verdrahtung ab, ohne Browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

test('jede Welt baut mit Gras-Ringen, Ringe zeichnen nur sichtbare Kacheln', async () => {
  const { World, RINGE_AN } = await import('../../js/world/world.js');
  const { WORLDS } = await import('../../js/game/worlds.js');
  const { QUALITY, GRASS_MAX } = await import('../../js/engine/renderer.js');
  assert.equal(RINGE_AN, true);
  const w = new World(new THREE.Scene());
  w.fx = { bursts: { emit() {} }, audio: { sfx() {} }, pan: () => 0 };
  for (const wd of WORLDS) for (const q of [0, 1, 2]) {
    w.build(wd, { ...QUALITY[q], grassMax: GRASS_MAX, dekoK: 1 }, 'x');
    const cam = new THREE.PerspectiveCamera(70, 0.45, 0.1, 1400); cam.position.set(0, 5, -6); cam.lookAt(0, 3, 2);
    w.update(1 / 60, cam, new THREE.Vector3(0, 3, 0));
    assert.equal(w.grass, null);
    assert.equal(w.ringe.length, 2);
    for (const m of w.ringe) {
      assert.ok(m.geometry.instanceCount > 0, `${wd.id}/q${q}: Ring leer`);
      assert.ok(m.userData.kacheln < m.userData.ring.kacheln ** 2, `${wd.id}/q${q}: Culling wirkt`);
    }
    assert.ok('RINGE' in w.terrain.material.defines);
  }
});
