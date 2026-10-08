// E3/#7 (v2.9): frustumCulled wieder an – Hüllkugel über alle Instanzen (js/engine/huelle.js), nach Bewegung neu.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { huelle, HUELLE_RAND, CULL_AN } from '../../js/engine/huelle.js';

const sicht = (cam, obj) => { cam.updateMatrixWorld(); obj.updateMatrixWorld(); return new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse)).intersectsObject(obj); };

test('Hüllkugel umfasst alle Instanzen + Rand, folgt der Bewegung, Culling greift', () => {
  assert.equal(CULL_AN, true);
  const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.5), new THREE.MeshBasicMaterial(), 3);
  const m = new THREE.Matrix4(), P = [[10, 1, 0], [-20, 2, 5], [3, 0, 40]];
  P.forEach((p, i) => im.setMatrixAt(i, m.makeTranslation(...p)));
  im.frustumCulled = false;
  huelle(im);
  assert.equal(im.frustumCulled, true);
  for (const p of P) assert.ok(im.boundingSphere.distanceToPoint(new THREE.Vector3(...p)) <= -HUELLE_RAND + 1e-6, 'Instanz tief in der Kugel');
  const cam = new THREE.PerspectiveCamera(60, 1, 0.1, 1400);
  cam.position.set(0, 2, -60); cam.lookAt(0, 2, 0);
  assert.equal(sicht(cam, im), true, 'Blick auf die Gruppe');
  cam.lookAt(0, 2, -200);
  assert.equal(sicht(cam, im), false, 'Blick weg → nicht zeichnen');
  // Instanz wandert hinter die Kamera → nach huelle() wieder sichtbar
  im.setMatrixAt(0, m.makeTranslation(0, 2, -120));
  huelle(im);
  assert.equal(sicht(cam, im), true, 'Kugel folgt der Bewegung');
});

test('leere Gruppe (count 0) bekommt eine gültige kleine Kugel', () => {
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial(), 4);
  im.count = 0;
  huelle(im);
  assert.ok(im.boundingSphere.radius >= 0 && Number.isFinite(im.boundingSphere.center.x));
});
