// Natur: Gras, Blumen, Bäume, Sonnenblumen, Seerosen, Wolken, Wasser, Pilze …
import * as THREE from 'three';
import { G, toonMat, grassMat } from '../engine/gfx.js';
import { Build, P, petalGeo, clumpGeo, rng } from '../engine/geo.js';
import { height, pond } from './terrain.js';

const _o = new THREE.Object3D();
const _c = new THREE.Color();

// ---------------------------------------------------------------- Gras
export function buildGrass(count, field = 48, rnd = Math.random) {
  const blade = clumpGeo(0.12);
  const g = new THREE.InstancedBufferGeometry();
  g.index = blade.index;
  g.attributes.position = blade.attributes.position;
  g.attributes.normal = blade.attributes.normal;
  const off = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    off[i * 4] = rnd(); off[i * 4 + 1] = rnd(); off[i * 4 + 2] = rnd();
    off[i * 4 + 3] = 0.3 + rnd() * 0.25 + rnd() * rnd() * 0.45;
  }
  g.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 4));
  g.instanceCount = count;
  const m = new THREE.Mesh(g, grassMat(field));
  m.frustumCulled = false;
  m.userData.setCount = (n) => { g.instanceCount = Math.min(n, count); };
  m.userData.max = count;
  return m;
}

// ---------------------------------------------------------------- Streuen
export function scatter(n, rnd, o = {}) {
  const out = [];
  const rMin = o.rMin ?? 4, rMax = o.rMax ?? 110;
  const P0 = pond();
  let tries = 0;
  while (out.length < n && tries++ < n * 30) {
    const r = rMin + (rMax - rMin) * Math.sqrt(rnd()), a = rnd() * Math.PI * 2;
    const x = Math.cos(a) * r + (o.cx || 0), z = Math.sin(a) * r + (o.cz || 0);
    const y = height(x, z);
    if (y < (o.minY ?? 0.25) && P0[2] > 1) continue;
    if (o.inPond && Math.hypot(x - P0[0], z - P0[1]) > P0[2] * 0.62) continue;
    if (o.avoid && o.avoid(x, z)) continue;
    if (o.minDist) { let ok = true; for (const q of out) if ((q.x - x) ** 2 + (q.z - z) ** 2 < o.minDist ** 2) { ok = false; break; } if (!ok) continue; }
    out.push({ x, y, z, s: (o.sMin ?? 0.7) + rnd() * ((o.sMax ?? 1.3) - (o.sMin ?? 0.7)), rot: rnd() * Math.PI * 2, k: rnd() });
  }
  return out;
}

function instanced(geo, mat, pts, colorFn, extra) {
  const im = new THREE.InstancedMesh(geo, mat, Math.max(1, pts.length));
  im.count = pts.length;
  pts.forEach((p, i) => {
    _o.position.set(p.x, p.y + (p.dy || 0), p.z);
    _o.rotation.set(p.rx || 0, p.rot, p.rz || 0);
    if (p.sv) _o.scale.set(p.sv[0], p.sv[1], p.sv[2]); else _o.scale.setScalar(p.s);
    _o.updateMatrix();
    im.setMatrixAt(i, _o.matrix);
    if (colorFn) im.setColorAt(i, _c.set(colorFn(p, i)));
    if (extra) extra(p, i);
  });
  im.instanceMatrix.needsUpdate = true;
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.computeBoundingSphere();
  return im;
}

// ---------------------------------------------------------------- Blumen (Deko)
function flowerGeos() {
  const types = {};
  const leaf = (b, y, a, l = 0.2) => b.add(petalGeo(l, l * 0.45, 0.03, 3), 0x5aa844, { p: [0, y, 0], r: [0, a, 0.55], order: 'YXZ' });
  // 1) Margerite: viele schmale Blätter, gelbe Mitte
  {
    const b = new Build();
    b.add(new THREE.CylinderGeometry(0.016, 0.024, 0.34, 4, 1, true), 0x4f9a3a, { p: [0, 0.17, 0] });
    b.add(P.sphere(0.075, 6, 4), 0xffc92e, { p: [0, 0.35, 0], s: [1, 0.55, 1], unlit: 0.15 });
    const pg = petalGeo(0.2, 0.085, 0.025, 2);
    for (let i = 0; i < 9; i++) b.add(pg, 0xffffff, { p: [0, 0.34, 0], r: [0, i / 9 * Math.PI * 2, 0.12], order: 'YXZ', tint: 1 });
    leaf(b, 0.06, 1.2);
    types.daisy = b.build();
  }
  // 2) Tulpe: Kelch aus 6 Blättern
  {
    const b = new Build();
    b.add(new THREE.CylinderGeometry(0.018, 0.026, 0.42, 4, 1, true), 0x4f9a3a, { p: [0, 0.21, 0] });
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2;
      b.add(petalGeo(0.24, 0.17, 0.06, 3), 0xffffff, { p: [0, 0.4, 0], r: [0, a, 1.15 + (i % 2) * 0.12], order: 'YXZ', tint: 1 });
    }
    b.add(petalGeo(0.34, 0.12, 0.04, 3), 0x5aa844, { p: [0, 0.03, 0], r: [0, 0.3, 1.0], order: 'YXZ' });
    b.add(petalGeo(0.3, 0.11, 0.04, 3), 0x5aa844, { p: [0, 0.03, 0], r: [0, 3.5, 1.1], order: 'YXZ' });
    types.tulip = b.build();
  }
  // 3) Runde Fünfblattblüte (Primel)
  {
    const b = new Build();
    b.add(new THREE.CylinderGeometry(0.016, 0.022, 0.3, 4, 1, true), 0x4f9a3a, { p: [0, 0.15, 0] });
    b.add(P.sphere(0.06, 6, 4), 0xfff1a8, { p: [0, 0.31, 0], s: [1, 0.6, 1], unlit: 0.3 });
    for (let i = 0; i < 5; i++) b.add(petalGeo(0.2, 0.19, 0.04, 3), 0xffffff, { p: [0, 0.3, 0], r: [0, i / 5 * Math.PI * 2, 0.2], order: 'YXZ', tint: 1 });
    leaf(b, 0.04, 0.4, 0.22); leaf(b, 0.04, 3.2, 0.2);
    types.round = b.build();
  }
  // 4) Lupine/Lavendel-Rispe
  {
    const b = new Build();
    b.add(new THREE.CylinderGeometry(0.014, 0.022, 0.5, 4, 1, true), 0x4f9a3a, { p: [0, 0.25, 0] });
    for (let i = 0; i < 7; i++) {
      const y = 0.3 + i * 0.042, a = i * 2.3, r = 0.045 - i * 0.004;
      b.add(P.sphere(0.042 - i * 0.003, 5, 3), 0xffffff, { p: [Math.cos(a) * r, y, Math.sin(a) * r], s: [1, 1.2, 1], tint: 1 });
      b.add(P.sphere(0.04 - i * 0.003, 5, 3), 0xffffff, { p: [-Math.cos(a) * r, y + 0.02, -Math.sin(a) * r], s: [1, 1.2, 1], tint: 1 });
    }
    leaf(b, 0.05, 0.9, 0.2);
    types.spike = b.build();
  }
  return types;
}

export function buildFlowers(world, rnd, count) {
  const grp = new THREE.Group();
  const geos = flowerGeos();
  const mat = toonMat({ vc: true, tint: true, sway: 0.45, rim: 0.5, soft: 0.15 });
  const mix = world.flowerMix || { daisy: 0.3, tulip: 0.2, round: 0.35, spike: 0.15 };
  const pal = world.flowers;
  for (const k of Object.keys(mix)) {
    const n = Math.round(count * mix[k]);
    const pts = scatter(n, rnd, { rMin: 3, rMax: 120, sMin: 1.6, sMax: 3.0 });
    // kleine Grüppchen für natürlicheres Bild
    pts.forEach(p => { if (p.k < 0.35) { const q = pts[(Math.random() * pts.length) | 0]; if (q) { p.x = q.x + (rnd() - 0.5) * 3; p.z = q.z + (rnd() - 0.5) * 3; p.y = height(p.x, p.z); } } });
    grp.add(instanced(geos[k], mat, pts, (p) => k === 'daisy' && p.k > 0.4 ? 0xffffff : pal[(p.k * 997 | 0) % pal.length]));
  }
  return grp;
}

// ---------------------------------------------------------------- Bäume
function treeGeo(kind, rnd) {
  const b = new Build();
  if (kind === 'cherry') {
    b.add(P.cyl(0.22, 0.42, 3.6, 7), 0x7b5140, { p: [0, 1.8, 0], r: [0, 0, 0.08] });
    b.add(P.cyl(0.12, 0.2, 2.0, 6), 0x7b5140, { p: [0.7, 3.4, 0], r: [0, 0, -0.7] });
    b.add(P.cyl(0.1, 0.18, 1.8, 6), 0x7b5140, { p: [-0.6, 3.3, 0.3], r: [0.3, 0, 0.8] });
    const blobs = [[0, 4.6, 0, 2.1], [1.6, 4.1, 0.4, 1.5], [-1.5, 4.0, 0.6, 1.5], [0.4, 4.3, -1.5, 1.4], [-0.3, 5.5, 0.2, 1.4], [0.9, 3.6, 1.4, 1.1]];
    blobs.forEach(([x, y, z, r], i) => b.add(P.ico(r, i ? 1 : 2), i % 2 ? 0xffc2d6 : 0xffd7e4, { p: [x, y, z], s: [1, 0.85, 1], tint: 1 }));
  } else if (kind === 'birch') {
    b.add(P.cyl(0.14, 0.24, 5.2, 7), 0xf2efe6, { p: [0, 2.6, 0] });
    for (let i = 0; i < 6; i++) b.add(P.cyl(0.25, 0.25, 0.08, 7), 0x3a3530, { p: [0, 0.6 + i * 0.75, 0], s: [1, 1, 0.6] });
    [[0, 5.6, 0, 1.6], [0.9, 4.8, 0.3, 1.2], [-0.8, 4.9, -0.2, 1.2], [0.1, 6.5, 0, 1.1]].forEach(([x, y, z, r], i) => b.add(P.ico(r, i ? 1 : 2), 0xffffff, { p: [x, y, z], s: [1, 1.2, 1], tint: 1 }));
  } else {
    b.add(P.cyl(0.26, 0.44, 3.4, 7), 0x7a5232, { p: [0, 1.7, 0] });
    const blobs = [[0, 4.4, 0, 2.2], [1.4, 3.8, 0.3, 1.5], [-1.3, 3.9, -0.4, 1.6], [0.2, 3.7, 1.4, 1.4], [-0.2, 5.4, 0.1, 1.5], [0.3, 3.8, -1.4, 1.3]];
    blobs.forEach(([x, y, z, r], i) => b.add(P.ico(r, i ? 1 : 2), i % 3 ? 0xffffff : 0xe8f0d0, { p: [x, y, z], s: [1, 0.9, 1], tint: 1 }));
  }
  return b.build();
}
export function buildTrees(world, rnd, avoid) {
  const grp = new THREE.Group();
  const mat = toonMat({ vc: true, tint: true, rim: 0.7, soft: 0.25, sway: 0.012 });
  for (const t of world.trees) {
    const pts = scatter(t.n, rnd, { rMin: t.rMin ?? 22, rMax: t.rMax ?? 150, sMin: 0.75, sMax: 1.45, minDist: 7, avoid });
    grp.add(instanced(treeGeo(t.kind, rnd), mat, pts, (p) => t.colors[(p.k * 31 | 0) % t.colors.length]));
    grp.userData[t.kind] = pts;
  }
  return grp;
}

// ---------------------------------------------------------------- Büsche (mit Beeren)
export function buildBushes(world, rnd, n, avoid) {
  const b = new Build();
  [[0, 0.7, 0, 1.0], [0.8, 0.55, 0.2, 0.75], [-0.75, 0.55, -0.1, 0.8], [0.1, 0.5, 0.75, 0.7], [0, 0.5, -0.7, 0.7]].forEach(([x, y, z, r], i) => b.add(P.ico(r, i ? 1 : 2), 0xffffff, { p: [x, y, z], tint: 1 }));
  const geo = b.build();
  const mat = toonMat({ vc: true, tint: true, rim: 0.6, soft: 0.2 });
  const pts = scatter(n, rnd, { rMin: 12, rMax: 140, sMin: 0.8, sMax: 1.8, minDist: 4, avoid });
  return instanced(geo, mat, pts, (p) => world.bush[(p.k * 13 | 0) % world.bush.length]);
}

// ---------------------------------------------------------------- Pilze & Steine
export function buildMushrooms(rnd, n, avoid) {
  const b = new Build();
  b.add(P.cyl(0.09, 0.12, 0.3, 8), 0xfff4e6, { p: [0, 0.15, 0] });
  b.add(new THREE.SphereGeometry(0.26, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), 0xffffff, { p: [0, 0.28, 0], s: [1, 0.75, 1], tint: 1 });
  for (let i = 0; i < 6; i++) { const a = i * 1.1, r = 0.12 + (i % 2) * 0.06; b.add(P.sphere(0.035, 6, 4), 0xfffaf0, { p: [Math.cos(a) * r, 0.43 - r * 0.5, Math.sin(a) * r], s: [1, 0.5, 1] }); }
  const pts = scatter(n, rnd, { rMin: 6, rMax: 120, sMin: 0.8, sMax: 1.8, avoid });
  return instanced(b.build(), toonMat({ vc: true, tint: true, rim: 0.5, gloss: 0.3 }), pts, (p) => [0xe8453c, 0xf07b3f, 0xc86bd6][(p.k * 7 | 0) % 3]);
}
export function buildRocks(world, rnd, n) {
  const g = P.ico(1, 1);
  const pa = g.attributes.position;
  for (let i = 0; i < pa.count; i++) { const f = 0.85 + 0.3 * Math.sin(pa.getX(i) * 5.1 + pa.getZ(i) * 3.3); pa.setXYZ(i, pa.getX(i) * f, pa.getY(i) * f * 0.7, pa.getZ(i) * f); }
  g.computeVertexNormals();
  const pts = scatter(n, rnd, { rMin: 10, rMax: 130, sMin: 0.4, sMax: 1.6 });
  pts.forEach(p => { p.dy = -0.15; });
  return instanced(g, toonMat({ color: world.rock || 0xb9b3c8, rim: 0.5, soft: 0.2 }), pts);
}

// ---------------------------------------------------------------- Sonnenblumen (schauen zur Sonne)
export function sunflowerGeo() {
  const b = new Build();
  b.add(P.cyl(0.05, 0.08, 2.2, 5), 0x4f8f33, { p: [0, 1.1, 0] });
  b.add(petalGeo(0.5, 0.3, 0.06, 3), 0x5c9e3c, { p: [0, 0.8, 0], r: [0, 0.4, 0.5], order: 'YXZ' });
  b.add(petalGeo(0.45, 0.28, 0.06, 3), 0x5c9e3c, { p: [0, 1.35, 0], r: [0, 3.4, 0.5], order: 'YXZ' });
  // Kopf: Scheibe senkrecht, Gesicht zeigt in +Z
  const head = new THREE.Matrix4().makeRotationX(-0.25).premultiply(new THREE.Matrix4().makeTranslation(0, 2.25, 0.1));
  const disc = P.cyl(0.36, 0.3, 0.16, 16); disc.rotateX(Math.PI / 2);
  b.add(disc, 0x4f8a30, { post: head });
  b.add(P.sphere(0.34, 12, 5), 0x5a3214, { post: head, p: [0, 0, 0.07], s: [1, 1, 0.3] });
  b.add(P.sphere(0.2, 8, 4), 0x3e220c, { post: head, p: [0, 0, 0.14], s: [1, 1, 0.3] });
  for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 11; i++) {
    const a = (i + ring * 0.5) / 11 * Math.PI * 2;
    const pg = petalGeo(0.46 - ring * 0.06, 0.24, 0.04, 2);
    pg.rotateX(Math.PI / 2);
    const m = new THREE.Matrix4().makeRotationZ(a).premultiply(head);
    b.add(pg, ring ? 0xffd23a : 0xffb81a, { post: m, p: [0.28, 0, 0.03 - ring * 0.03], r: [0, -0.18, 0] });
  }
  return b.build();
}
export function buildSunflowers(rnd, n, cx = 0, cz = 0, R = 60, avoid) {
  const pts = scatter(n, rnd, { cx, cz, rMin: 0, rMax: R, sMin: 0.85, sMax: 1.4, minDist: 2.2, avoid });
  const sy = Math.atan2(G.uSunDir.value.x, G.uSunDir.value.z);
  pts.forEach(p => { p.rot = sy + (p.k - 0.5) * 0.7; p.rx = -0.1; });
  const im = instanced(sunflowerGeo(), toonMat({ vc: true, rim: 0.6, soft: 0.2, sway: 0.03, side: THREE.DoubleSide }), pts);
  im.userData.pts = pts;
  return im;
}

// ---------------------------------------------------------------- Seerosen, Schilf, Wasser
export function buildPondStuff(rnd, nPads) {
  const grp = new THREE.Group();
  const P0 = pond();
  // Wasser
  const wg = new THREE.CircleGeometry(P0[2] * 1.3, 64); wg.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(wg, waterMat());
  water.position.set(P0[0], 0, P0[1]);
  grp.add(water);
  // Seerosenblätter
  const b = new Build();
  const disc = new THREE.CircleGeometry(1, 20, 0.35, Math.PI * 2 - 0.7); disc.rotateX(-Math.PI / 2);
  b.add(disc, 0x4f9c45, { p: [0, 0.03, 0] });
  const pads = scatter(nPads, rnd, { cx: P0[0], cz: P0[1], rMin: 0, rMax: P0[2] * 0.62, sMin: 1.0, sMax: 2.1, minY: -99, minDist: 3.2 });
  pads.forEach(p => { p.y = 0; });
  grp.add(instanced(b.build(), toonMat({ vc: true, rim: 0.4, gloss: 0.25, soft: 0.1 }), pads));
  // Lotusblüten auf einigen Blättern
  const lb = new Build();
  for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 8; i++) {
    lb.add(petalGeo(0.34 - ring * 0.08, 0.17, 0.05, 4), ring ? 0xffffff : 0xffffff, { p: [0, 0.08, 0], r: [0, i / 8 * Math.PI * 2 + ring * 0.4, -0.35 - ring * 0.5], order: 'YXZ', tint: ring ? 0.6 : 1 });
  }
  lb.add(P.sphere(0.08, 8, 6), 0xffd23a, { p: [0, 0.14, 0], s: [1, 0.6, 1], unlit: 0.2 });
  const lotus = pads.filter((p, i) => i % 3 === 0);
  grp.add(instanced(lb.build(), toonMat({ vc: true, tint: true, rim: 0.6, soft: 0.1 }), lotus, (p) => [0xff9ec4, 0xffc0dc, 0xf7a8ff][(p.k * 5 | 0) % 3]));
  // Schilf/Rohrkolben am Ufer
  const rb = new Build();
  for (let i = 0; i < 5; i++) {
    const a = i * 1.3, x = Math.cos(a) * 0.25, z = Math.sin(a) * 0.25, h = 1.4 + (i % 3) * 0.35;
    rb.add(petalGeo(h, 0.07, 0.02, 3), 0x6a9f40, { p: [x, 0, z], r: [0, a, Math.PI / 2 - 0.1 * (i % 3)], order: 'YXZ' });
    if (i % 2 === 0) { rb.add(P.cyl(0.015, 0.02, h, 4), 0x6a9f40, { p: [x * 0.5, h / 2, z * 0.5] }); rb.add(P.capsule(0.06, 0.22, 3, 6), 0x7a4a26, { p: [x * 0.5, h - 0.05, z * 0.5] }); }
  }
  const reeds = [];
  for (let i = 0; i < 44; i++) {
    const a = rnd() * Math.PI * 2, r = P0[2] * (0.78 + rnd() * 0.3);
    const x = P0[0] + Math.cos(a) * r, z = P0[1] + Math.sin(a) * r;
    reeds.push({ x, y: Math.max(height(x, z), -0.2), z, s: 0.7 + rnd() * 0.7, rot: rnd() * 6.28, k: rnd() });
  }
  grp.add(instanced(rb.build(), toonMat({ vc: true, rim: 0.5, sway: 0.06 }), reeds));
  grp.userData.pads = pads;
  return grp;
}

const WATER_V = /* glsl */`
uniform float uBend; uniform vec3 uCam;
varying vec3 vWP;
void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vWP = wp.xyz;
  vec2 d = wp.xz - uCam.xz; wp.y -= uBend * dot(d, d);
  gl_Position = projectionMatrix * viewMatrix * wp; }`;
const WATER_F = /* glsl */`
uniform vec3 uSunDir, uSunCol, uSkyAmb, uFogCol, uFogSun, uCam, uWDeep, uWShallow; uniform vec4 uFog; uniform float uTime; uniform vec4 uPond;
varying vec3 vWP;
float n2(vec2 p){ return sin(p.x) * sin(p.y); }
void main(){
  vec3 V = normalize(uCam - vWP);
  vec2 p = vWP.xz;
  float w = n2(p * 0.9 + uTime * vec2(0.4, 0.3)) + n2(p * 1.7 - uTime * vec2(0.5, -0.2)) * 0.5;
  vec3 N = normalize(vec3(w * 0.08, 1.0, n2(p.yx * 1.2 + uTime * 0.35) * 0.08));
  float dc = distance(p, uPond.xy) / uPond.z;
  vec3 base = mix(uWDeep, uWShallow, smoothstep(0.3, 1.0, dc));
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  vec3 c = mix(base, uSkyAmb * 1.25, fres * 0.7);
  vec3 H = normalize(uSunDir + V);
  float s = pow(max(dot(N, H), 0.0), 180.0);
  c += uSunCol * smoothstep(0.3, 0.5, s) * 1.6;
  // Glitzerlinien
  float lines = smoothstep(0.92, 1.0, sin((p.x + p.y) * 2.0 + w * 3.0 + uTime) * 0.5 + 0.5);
  c += vec3(1.0) * lines * 0.12 * (1.0 - fres);
  // Uferschaum
  c = mix(c, vec3(0.95, 0.98, 1.0), smoothstep(0.92, 1.0, dc) * 0.6 * (0.6 + 0.4 * sin(uTime * 2.0 + atan(p.y - uPond.y, p.x - uPond.x) * 9.0)));
  float dist = length(vWP - uCam);
  float f = clamp((dist - uFog.x) / (uFog.y - uFog.x), 0.0, 1.0); f = f * f * (3.0 - 2.0 * f) * uFog.w;
  c = mix(c, uFogCol, f);
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
function waterMat() {
  return new THREE.ShaderMaterial({
    uniforms: { ...G, uWDeep: { value: new THREE.Color(0x2f8fa8) }, uWShallow: { value: new THREE.Color(0x7fd6d0) } },
    vertexShader: WATER_V, fragmentShader: WATER_F,
  });
}

// ---------------------------------------------------------------- Wolken (weiche Cumulus)
export function buildClouds(world, rnd, n) {
  const grp = new THREE.Group();
  const mat = toonMat({ vc: true, rim: 1.0, soft: 0.45, emis: 0.0 });
  mat.uniforms.uColor.value.set(world.cloud || 0xffffff);
  mat.uniforms.uFog = { value: new THREE.Vector4(150, 700, 0, 0.55) };
  // Unterseiten lavendel statt grasgrün (kein Boden-Widerschein)
  const k = world.amb.k;
  mat.uniforms.uGndAmb = { value: new THREE.Color(world.sky.zenith).lerp(new THREE.Color(0xd8cff0), 0.6).multiplyScalar(0.62 * k / 0.62) };
  mat.uniforms.uSkyAmb = { value: new THREE.Color(0xffffff).lerp(new THREE.Color(world.sky.horizon), 0.3).multiplyScalar(0.7 * k / 0.62) };
  const shapes = [];
  for (let s = 0; s < 3; s++) {
    const b = new Build();
    const W = 14 + s * 6, D = 8 + s * 2;
    b.add(P.ico(W * 0.42, 2), 0xffffff, { p: [0, W * 0.12, 0], s: [1, 0.8, 0.8] });
    const k = 7 + s * 2;
    for (let i = 0; i < k; i++) {
      const a = i / k * Math.PI * 2 + rnd() * 0.4;
      const rx = Math.cos(a) * W * 0.55, rz = Math.sin(a) * D * 0.5;
      const r = W * (0.18 + rnd() * 0.12) * (1 - Math.abs(Math.cos(a)) * 0.3);
      b.add(P.ico(r, 1), 0xffffff, { p: [rx, r * 0.35, rz] });
    }
    for (let i = 0; i < 3; i++) b.add(P.ico(W * (0.2 + rnd() * 0.08), 1), 0xffffff, { p: [(rnd() - 0.5) * W * 0.5, W * 0.3 + rnd() * W * 0.1, (rnd() - 0.5) * D * 0.3] });
    const geo = b.build();
    // flacher Boden
    const pa = geo.attributes.position, na = geo.attributes.normal;
    for (let i = 0; i < pa.count; i++) if (pa.getY(i) < 0) { pa.setY(i, pa.getY(i) * 0.15); na.setXYZ(i, na.getX(i) * 0.5, -1, na.getZ(i) * 0.5); }
    geo.computeBoundingSphere();
    shapes.push(geo);
  }
  const all = [];
  shapes.forEach((geo, si) => {
    const pts = [];
    for (let i = 0; i < Math.ceil(n / 3); i++) {
      const a = rnd() * Math.PI * 2, r = 120 + rnd() * 230;
      pts.push({ x: Math.cos(a) * r, y: 60 + rnd() * 60, z: Math.sin(a) * r, s: 0.8 + rnd() * 0.9, rot: rnd() * 6.28, k: rnd(), vx: 0.6 + rnd() * 0.8 });
    }
    const im = instanced(geo, mat, pts);
    im.frustumCulled = false;
    im.userData.pts = pts;
    grp.add(im); all.push(im);
  });
  grp.userData.update = (dt) => {
    for (const im of all) {
      const pts = im.userData.pts;
      pts.forEach((p, i) => {
        p.x += p.vx * dt; if (p.x > 380) p.x = -380;
        _o.position.set(p.x, p.y, p.z); _o.rotation.set(0, p.rot, 0); _o.scale.setScalar(p.s); _o.updateMatrix();
        im.setMatrixAt(i, _o.matrix);
      });
      im.instanceMatrix.needsUpdate = true;
    }
  };
  return grp;
}
