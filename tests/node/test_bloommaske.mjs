// E4/#9 (v2.9): Bloom nur auf Glanz – Alpha im Szenen-Ziel = Leucht-Maske. Prüft ohne GPU die Shader-Schalter und die
// Mischregeln je Material (deckend → Alpha 0 bzw. Maske, durchsichtig → Alpha bleibt, additiv → Maske steigt).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

test('Toon deckend schreibt die Maske, durchsichtig nicht; Himmel und Glühen haben MASKE', async () => {
  const G = await import('../../js/engine/gfx.js');
  assert.equal(G.BLOOMMASKE, true);
  assert.ok('MASKE' in G.toonMat({ vc: true }).defines);
  assert.ok(!('MASKE' in G.toonMat({ transparent: true }).defines));
  assert.match(G.skyMat().fragmentShader, /#define MASKE/);
  const gl = G.glowMat();
  assert.ok('MASKE' in gl.defines && gl.blending === THREE.CustomBlending && gl.blendSrc === THREE.OneFactor && gl.blendDstAlpha === THREE.OneFactor);
});

test('Mischregeln je Material (einmalig, ohne Shader-Neuübersetzung)', async () => {
  const G = await import('../../js/engine/gfx.js');
  const fake = { getContext: () => ({}), extensions: { has: () => true }, capabilities: { isWebGL2: true } };
  const P = new G.Post(fake);
  assert.equal(P.maske, true);
  assert.ok(P.mComp.uniforms.uThresh.value < 0.9, 'eigene Schwelle für die gewichtete Quelle');
  const sc = new THREE.Scene(), geo = new THREE.PlaneGeometry();
  const toon = new THREE.Mesh(geo, G.toonMat({ vc: true }));
  const gelaende = new THREE.Mesh(geo, G.terrainMat());
  const glas = new THREE.Mesh(geo, G.toonMat({ transparent: true, opacity: 0.4 }));
  const schatten = new THREE.Mesh(geo, G.blobShadowMat());
  const glueh = new THREE.Mesh(geo, G.glowMat());
  const add = new THREE.Mesh(geo, new THREE.ShaderMaterial({ transparent: true, blending: THREE.AdditiveBlending }));
  const strahl = new THREE.Mesh(geo, new THREE.ShaderMaterial({ transparent: true, blending: THREE.AdditiveBlending })); strahl.material.userData.keinBloom = true;
  const punkte = new THREE.Points(geo, new THREE.ShaderMaterial({ transparent: true }));
  const funken = new THREE.Points(geo, new THREE.ShaderMaterial({ transparent: true })); funken.material.userData.glueht = true;
  sc.add(toon, gelaende, glas, schatten, glueh, add, strahl, punkte, funken);
  P.maskeVorbereiten(sc);
  const R = (o) => [o.material.blending, o.material.blendSrc, o.material.blendDst, o.material.blendSrcAlpha, o.material.blendDstAlpha];
  const C = THREE.CustomBlending, ONE = THREE.OneFactor, ZERO = THREE.ZeroFactor, SA = THREE.SrcAlphaFactor, OMSA = THREE.OneMinusSrcAlphaFactor;
  assert.deepEqual(R(toon), [C, ONE, ZERO, ONE, ZERO], 'Toon: Alpha = Maske aus dem Shader');
  assert.deepEqual(R(gelaende), [C, ONE, ZERO, ZERO, ZERO], 'Gelände: Alpha 0');
  assert.deepEqual(R(glas), [C, SA, OMSA, ZERO, ONE], 'Glas: Alpha bleibt');
  assert.deepEqual(R(schatten), [C, SA, OMSA, ZERO, ONE], 'Schatten: Alpha bleibt');
  assert.deepEqual(R(glueh), [C, ONE, ONE, ONE, ONE], 'Glühen: unverändert vorbereitet');
  assert.equal(add.material.blending, THREE.AdditiveBlending, 'additiv: zählt zur Maske');
  assert.deepEqual(R(strahl), [C, SA, ONE, ZERO, ONE], 'Lichtstrahl: additiv, Alpha bleibt');
  assert.deepEqual(R(punkte), [C, SA, OMSA, ZERO, ONE], 'Pollen: Alpha bleibt');
  assert.equal(funken.material.blending, THREE.NormalBlending, 'Funken: Deckung zählt');
  // zweiter Lauf ändert nichts mehr (einmal je Material)
  toon.material.blendSrcAlpha = THREE.DstColorFactor; P.maskeVorbereiten(sc);
  assert.equal(toon.material.blendSrcAlpha, THREE.DstColorFactor);
});

test('Endbild: Glüh-Quelle getrennt (tBloom), Abwärts-Stufe kann gewichten', async () => {
  const G = await import('../../js/engine/gfx.js');
  const fake = { getContext: () => ({}), extensions: { has: () => true }, capabilities: { isWebGL2: true } };
  const P = new G.Post(fake);
  assert.match(P.mComp.fragmentShader, /texture2D\(tBloom, vUv\)/);
  assert.match(P.mComp.fragmentShader, /max\(bb - uThresh/);
  assert.match(P.mDown.fragmentShader, /mix\(1\.0, s\.a, uMaske\)/);
});
