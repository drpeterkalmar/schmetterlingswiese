// Gelände: Höhenfunktion (identisch zum GLSL in gfx.js), Mesh, ferne Bergkulissen
import * as THREE from 'three';
import { G, terrainMat, farMat } from '../engine/gfx.js';
import { rng } from '../engine/geo.js';

let T1 = [2.2, 0.035, 0.041, 1.7], T2 = [1.3, 0.09, 0.075, 2.0], T3 = [0.7, 0.15, 0.17, 0.4];
let POND = [9999, 9999, 0.001, 0], EDGE = [120, 180, 22];
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function height(x, z) {
  let h = T1[0] * Math.sin(x * T1[1] + T1[3]) * Math.cos(z * T1[2] + T1[3] * 1.7)
        + T2[0] * Math.sin(x * T2[1] + T2[3]) * Math.sin(z * T2[2] + T2[3] * 0.6)
        + T3[0] * Math.cos(x * T3[1] + T3[3]) * Math.cos(z * T3[2] - T3[3]);
  const dP = Math.hypot(x - POND[0], z - POND[1]);
  h *= 0.2 + 0.8 * ss(POND[2] * 0.9, POND[2] * 2.4, dP);
  const k = 1 - ss(POND[2] * 0.55, POND[2] * 1.05, dP);
  h = (h + 0.5) * (1 - k) + (-POND[3]) * k;
  const e = ss(EDGE[0], EDGE[1], Math.hypot(x, z));
  return h + EDGE[2] * e * e;
}
export function normalAt(x, z, out = new THREE.Vector3()) {
  const e = 0.5;
  return out.set(height(x - e, z) - height(x + e, z), 2 * e, height(x, z - e) - height(x, z + e)).normalize();
}

// v2.3: Sand-/Pfad-Flecken (identisch zu patchAmt() im Gras-Shader)
let PATCH = [0, 1, 0, 0];
export function setPatch(p) { PATCH = p || [0, 1, 0, 0]; G.uPatch.value.fromArray(PATCH); }
export function patchAmt(x, z) {
  const k = PATCH[1];
  const s = Math.sin(x * 0.061 * k + 1.3 + PATCH[2] + Math.sin(z * 0.031) * 1.7) * Math.sin(z * 0.057 * k - 0.7 + PATCH[3] + Math.sin(x * 0.027) * 1.9);
  return ss(0.62, 0.92, s) * PATCH[0];
}
export function setTerrain(t) {
  T1 = t.t1; T2 = t.t2; T3 = t.t3; POND = t.pond || [9999, 9999, 0.001, 0]; EDGE = t.edge || [120, 180, 22];
  G.uT1.value.fromArray(T1); G.uT2.value.fromArray(T2); G.uT3.value.fromArray(T3);
  G.uPond.value.fromArray(POND); G.uEdge.value.fromArray(EDGE);
}
export function pond() { return POND; }

// Gelände-Mesh mit radialer Auflösung (innen fein, außen grob)
export function buildTerrain(world) {
  const R = 260, rings = 96, segs = 160;
  const pos = [], col = [], idx = [];
  const cA = new THREE.Color(world.ground[0]), cB = new THREE.Color(world.ground[1]), cC = new THREE.Color(world.ground[2]);
  const sand = new THREE.Color(world.sand || 0xd9c79a);
  const patchC = new THREE.Color(world.patchCol || 0xd8c898);
  const tc = new THREE.Color();
  pos.push(0, height(0, 0), 0); col.push(cA.r, cA.g, cA.b);
  for (let i = 1; i <= rings; i++) {
    const r = R * Math.pow(i / rings, 1.6);
    for (let j = 0; j < segs; j++) {
      const a = j / segs * Math.PI * 2;
      const x = Math.cos(a) * r, z = Math.sin(a) * r, y = height(x, z);
      pos.push(x, y, z);
      const p = 0.5 + 0.5 * Math.sin(x * 0.05 + Math.sin(z * 0.07) * 2);
      tc.copy(cA).lerp(cB, p);
      if (Math.sin(x * 0.021 + 3) * Math.cos(z * 0.019 - 1) > 0.5) tc.lerp(cC, 0.45);
      const pa = patchAmt(x, z); if (pa > 0) tc.lerp(patchC, pa * 0.8);
      if (POND[2] > 1 && Math.hypot(x - POND[0], z - POND[1]) < POND[2] * 1.3) tc.lerp(sand, THREE.MathUtils.clamp((0.6 - y) * 1.4, 0, 1));
      col.push(tc.r, tc.g, tc.b);
    }
  }
  for (let j = 0; j < segs; j++) idx.push(0, 1 + (j + 1) % segs, 1 + j);
  for (let i = 1; i < rings; i++) {
    const a0 = 1 + (i - 1) * segs, b0 = 1 + i * segs;
    for (let j = 0; j < segs; j++) {
      const j1 = (j + 1) % segs;
      idx.push(a0 + j, a0 + j1, b0 + j, a0 + j1, b0 + j1, b0 + j);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, terrainMat());
  m.frustumCulled = false;
  return m;
}

// Drei Schichten weicher Bergsilhouetten am Horizont
export function buildFar(world, seed = 7) {
  const r = rng(seed);
  const pos = [], col = [], uv = [], idx = [];
  const layers = world.far;
  let base = 0;
  layers.forEach((L, li) => {
    const R = 330 + li * 90, n = 180;
    const c = new THREE.Color(L.color);
    const ph = [r() * 6, r() * 6, r() * 6];
    for (let j = 0; j <= n; j++) {
      const a = j / n * Math.PI * 2;
      let h = L.h * (0.55 + 0.25 * Math.sin(a * 3 + ph[0]) + 0.15 * Math.sin(a * 7 + ph[1]) + 0.08 * Math.sin(a * 17 + ph[2]));
      if (L.round) h = L.h * (0.5 + 0.5 * Math.pow(Math.abs(Math.sin(a * L.round + ph[0])), 0.6));
      const x = Math.cos(a) * R, z = Math.sin(a) * R;
      pos.push(x, h, z, x, -30, z);
      col.push(c.r, c.g, c.b, c.r, c.g, c.b);
      uv.push(j / n, 1, j / n, L.mist ?? 0);
      if (j < n) { const k = base + j * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    base += (n + 1) * 2;
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  const m = new THREE.Mesh(g, farMat());
  m.material.side = THREE.DoubleSide;
  m.frustumCulled = false;
  m.renderOrder = -1;
  return m;
}
