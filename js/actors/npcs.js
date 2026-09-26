// NPCs: Luft-Freunde (Falter, Marienkäfer), Tierbabys (Bär, Capybara, Häschen, Entchen), freche Wespen
import * as THREE from 'three';
import { toonMat } from '../engine/gfx.js';
import { Build, P, petalGeo } from '../engine/geo.js';
import { wingMask } from '../engine/textures.js';
import { face, surf } from './characters.js';
import { height } from '../world/terrain.js';

const _o = new THREE.Object3D();
const _c = new THREE.Color();
const _v = new THREE.Vector3();
const angDiff = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// ---------------------------------------------------------------- Luft-Freunde
let NPC_WING = null; // einmalig erzeugt, über Level hinweg geteilt
export class Flyers {
  constructor(rnd, nB = 10, nL = 10, area = 90) {
    this.group = new THREE.Group();
    this.items = [];
    // Falter: Körper + Flügel (Flügelschlag im Shader)
    const bb = new Build();
    bb.add(P.sphere(0.13, 10, 8), 0x3a2838, { p: [0, 0.03, 0.2] });
    bb.add(P.sphere(0.08, 8, 6), 0x3a2838, { p: [0, 0, -0.1], s: [1, 1, 2.6] });
    face(bb, bb, new Build(), [0, 0.03, 0.2], 0.13, { eye: 0.42, lod: 1 });
    const wg = new THREE.PlaneGeometry(0.8, 0.8); wg.rotateX(Math.PI / 2); wg.translate(0.4, 0, -0.1);
    const wl = wg.clone(); wl.rotateZ(Math.PI);
    const wgeo = new Build(); wgeo.add(wg, 0xffffff); wgeo.add(wl, 0xffffff);
    const tex = NPC_WING || (NPC_WING = wingMask('verlauf'));
    this.bBody = new THREE.InstancedMesh(bb.build(), toonMat({ vc: true, rim: 0.5 }), nB);
    this.bWing = new THREE.InstancedMesh(wgeo.build(), toonMat({ map: tex, wing: true, instWing: true, alphaTest: 0.5, side: THREE.DoubleSide, flap: [0.35, 0.9, 13], wc: 0x2a1a30 }), nB);
    // Marienkäfer: runder Panzer + Glasflügel
    const lb = new Build();
    lb.add(P.sphere(0.2, 12, 8), 0xe8303a, { s: [1, 0.8, 1.1], cf: (x, y, z) => (Math.abs(x) < 0.012 && y > 0 ? 0x1c1418 : ((((x * 30 | 0) + (z * 30 | 0)) % 3 === 0 && y > 0.1) ? 0x1c1418 : undefined)) });
    lb.add(P.sphere(0.12, 10, 8), 0x1c1418, { p: [0, -0.01, 0.2] });
    face(lb, lb, new Build(), [0, -0.01, 0.2], 0.12, { eye: 0.44, lod: 1 });
    const lw = new Build(); const g1 = new THREE.PlaneGeometry(0.4, 0.25); g1.rotateX(Math.PI / 2); g1.translate(0.2, 0.1, 0);
    const g2 = g1.clone(); g2.rotateZ(Math.PI); g2.translate(0, 0.2, 0);
    lw.add(g1, 0xffffff); lw.add(g2, 0xffffff);
    this.lBody = new THREE.InstancedMesh(lb.build(), toonMat({ vc: true, rim: 0.5, gloss: 0.7 }), nL);
    this.lWing = new THREE.InstancedMesh(lw.build(), toonMat({ color: 0xeaf6ff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, flap: [0.4, 0.6, 30], rim: 1.2 }), nL);
    [this.bBody, this.bWing, this.lBody, this.lWing].forEach(m => { m.frustumCulled = false; this.group.add(m); });
    const fams = [0x7c4dff, 0x2196f3, 0xff6090, 0x00bfa5, 0xfdd835, 0xff9636, 0x9ccc65];
    for (let i = 0; i < nB + nL; i++) {
      const isB = i < nB;
      const r = 10 + area * Math.sqrt(rnd()), a = rnd() * 6.283;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const it = { isB, idx: isB ? i : i - nB, x, z, h: 1.4 + rnd() * 4, r1: 2.5 + rnd() * 3.5, r2: 1.2 + rnd() * 2,
        w1: rnd() * 6.28, w2: rnd() * 6.28, sp1: (0.35 + rnd() * 0.4) * (rnd() < 0.5 ? 1 : -1), sp2: 0.8 + rnd(),
        s: isB ? 1.3 + rnd() * 0.8 : 1.4 + rnd() * 0.6, yaw: 0, ph: rnd() * 6.28, pos: new THREE.Vector3() };
      if (isB) this.bWing.setColorAt(it.idx, _c.set(fams[i % fams.length]));
      this.items.push(it);
    }
    if (this.bWing.instanceColor) this.bWing.instanceColor.needsUpdate = true;
  }
  update(dt, t) {
    for (const it of this.items) {
      it.w1 += it.sp1 * dt; it.w2 += it.sp2 * dt;
      const x = it.x + Math.cos(it.w1) * it.r1, z = it.z + Math.sin(it.w1) * it.r1 * 0.8;
      let y = height(x, z) + it.h + Math.sin(it.w2) * 0.5 + Math.sin(t * 2.3 + it.ph) * 0.15;
      it.pos.set(x, y, z);
      const vx = -Math.sin(it.w1) * it.sp1, vz = Math.cos(it.w1) * it.sp1 * 0.8;
      const hd = Math.atan2(vx, vz);
      it.yaw += angDiff(hd - it.yaw) * Math.min(1, dt * 4);
      _o.position.copy(it.pos); _o.rotation.set(0.12, it.yaw, THREE.MathUtils.clamp(-it.sp1 * 0.3, -0.3, 0.3)); _o.scale.setScalar(it.s); _o.updateMatrix();
      if (it.isB) { this.bBody.setMatrixAt(it.idx, _o.matrix); this.bWing.setMatrixAt(it.idx, _o.matrix); }
      else { this.lBody.setMatrixAt(it.idx, _o.matrix); this.lWing.setMatrixAt(it.idx, _o.matrix); }
    }
    [this.bBody, this.bWing, this.lBody, this.lWing].forEach(m => { m.instanceMatrix.needsUpdate = true; });
  }
}

// ---------------------------------------------------------------- Tierbabys
function animalGeo(kind, sleepy) {
  const b = new Build();
  const dummy = new Build();
  const eyes = (c, r, o) => { if (sleepy) face(b, dummy, b, c, r, o); else face(b, b, dummy, c, r, o); };
  if (kind === 'baer') {
    const fur = 0xa0703f, light = 0xe7c79c, dark = 0x6a4424;
    b.add(P.sphere(0.46, 12, 9), fur, { p: [0, 0.48, -0.05], s: [1, 0.95, 1.1] });
    b.add(P.sphere(0.3, 12, 8), light, { p: [0, 0.44, 0.24], s: [1, 1.1, 0.6] });
    const hc = [0, 0.98, 0.18];
    b.add(P.sphere(0.4, 14, 10), fur, { p: hc });
    for (const s of [-1, 1]) {
      b.add(P.sphere(0.13, 10, 8), fur, { p: [s * 0.3, 1.32, 0.12] });
      b.add(P.sphere(0.075, 8, 6), 0xf0a0a8, { p: [s * 0.3, 1.33, 0.2], s: [1, 1, 0.5] });
      b.add(P.sphere(0.13, 10, 8), dark, { p: [s * 0.24, 0.12, 0.2], s: [1, 0.8, 1.2] });
      b.add(P.sphere(0.13, 10, 8), dark, { p: [s * 0.24, 0.12, -0.3], s: [1, 0.8, 1.2] });
      b.add(P.sphere(0.12, 10, 8), fur, { p: [s * 0.4, 0.55, 0.22], s: [0.8, 1.2, 0.8] });
    }
    b.add(P.sphere(0.16, 12, 8), light, { p: [0, 0.9, 0.52], s: [1.1, 0.8, 0.7] });
    b.add(P.sphere(0.055, 8, 6), 0x2a1a14, { p: [0, 0.95, 0.63], s: [1.2, 0.8, 0.8] });
    b.add(P.sphere(0.08, 8, 6), fur, { p: [0, 0.4, -0.55] });
    eyes(hc, 0.4, { eye: 0.26, sep: 0.4, up: 0.28, iris: 0x2a1a14, cheek: 0xff9aa8 });
  } else if (kind === 'capy') {
    const fur = 0xb9814c, dark = 0x8a5a32;
    b.add(P.sphere(0.45, 12, 9), fur, { p: [0, 0.5, -0.1], s: [0.95, 0.85, 1.4] });
    const hc = [0, 0.78, 0.5];
    b.add(P.sphere(0.3, 12, 9), fur, { p: hc, s: [0.9, 0.9, 1.25] });
    b.add(P.sphere(0.2, 12, 8), dark, { p: [0, 0.72, 0.8], s: [1, 0.85, 0.7] });
    for (const s of [-1, 1]) {
      b.add(P.sphere(0.07, 8, 6), dark, { p: [s * 0.2, 1.04, 0.36] });
      b.add(P.sphere(0.035, 6, 4), 0x2a1a10, { p: [s * 0.06, 0.8, 0.94] });
      b.add(P.cyl(0.1, 0.09, 0.25, 8), dark, { p: [s * 0.25, 0.12, 0.3] });
      b.add(P.cyl(0.1, 0.09, 0.25, 8), dark, { p: [s * 0.25, 0.12, -0.5] });
    }
    // kleine Augen, entspannt
    for (const s of [-1, 1]) {
      const e = surf(hc, 0.3, [s * 0.65, 0.35, 0.65], 0.95);
      if (sleepy) b.add(P.torus(0.04, 0.012, 4, 8, Math.PI), 0x2a1a10, { p: e, r: [0, s * 0.8, Math.PI] });
      else { b.add(P.sphere(0.05, 8, 6), 0x2a1a10, { p: e }); b.add(P.sphere(0.017, 6, 4), 0xffffff, { p: [e[0] - 0.01, e[1] + 0.025, e[2] + 0.035], unlit: 1 }); }
      b.add(P.sphere(0.05, 8, 6), 0xff9a9a, { p: surf(hc, 0.3, [s * 0.7, -0.15, 0.7], 0.98), s: [1, 0.6, 0.5], unlit: 0.3 });
    }
    // Yuzu auf dem Kopf!
    b.add(P.sphere(0.12, 12, 10), 0xffa726, { p: [0, 1.12, 0.45] });
    b.add(petalGeo(0.1, 0.06, 0.01, 2), 0x4f9a3a, { p: [0, 1.23, 0.45], r: [0, 0.5, 0.4], order: 'YXZ' });
  } else if (kind === 'hase') {
    const fur = 0xf4eee8, pink = 0xffb6c8;
    b.add(P.sphere(0.36, 12, 9), fur, { p: [0, 0.38, -0.05], s: [1, 1, 1.1] });
    const hc = [0, 0.82, 0.14];
    b.add(P.sphere(0.32, 14, 10), fur, { p: hc });
    for (const s of [-1, 1]) {
      b.add(P.sphere(0.1, 10, 8), fur, { p: [s * 0.12, 1.28, 0.05], s: [0.8, 2.6, 0.5], r: [0, 0, -s * 0.18] });
      b.add(P.sphere(0.06, 8, 6), pink, { p: [s * 0.12, 1.28, 0.1], s: [0.7, 2.6, 0.3], r: [0, 0, -s * 0.18] });
      b.add(P.sphere(0.11, 8, 6), fur, { p: [s * 0.2, 0.08, 0.25], s: [1, 0.7, 1.5] });
    }
    b.add(P.sphere(0.04, 6, 4), pink, { p: [0, 0.8, 0.46] });
    b.add(P.sphere(0.12, 10, 8), 0xffffff, { p: [0, 0.35, -0.45] });
    eyes(hc, 0.32, { eye: 0.3, sep: 0.42, up: 0.18, iris: 0x3a2030, cheek: 0xff9ab8 });
  } else { // Entchen
    const y = 0xffd84a;
    b.add(P.sphere(0.3, 16, 12), y, { p: [0, 0.2, -0.05], s: [1, 0.85, 1.25] });
    const hc = [0, 0.56, 0.2];
    b.add(P.sphere(0.22, 16, 12), y, { p: hc });
    b.add(P.sphere(0.09, 10, 8), 0xff9a2a, { p: [0, 0.52, 0.42], s: [1.3, 0.5, 1.2] });
    b.add(P.sphere(0.12, 8, 6), y, { p: [0, 0.3, -0.42], s: [1, 0.7, 1] });
    eyes(hc, 0.22, { eye: 0.3, sep: 0.42, up: 0.25, iris: 0x2a1a10, cheek: 0xffa0a0 });
  }
  return b.build();
}

export class Animals {
  constructor() { this.group = new THREE.Group(); this.list = []; this.meshes = {}; }
  // specs: [{kind, x, z, home radius}], sleepy: Abendmodus
  setup(specs, rnd, sleepy = false) {
    this.clear();
    const kinds = [...new Set(specs.map(s => s.kind))];
    const mat = toonMat({ vc: true, rim: 0.55, soft: 0.12 });
    this.mat = mat;
    for (const k of kinds) {
      const n = specs.filter(s => s.kind === k).length;
      const im = new THREE.InstancedMesh(animalGeo(k, sleepy), mat, n);
      im.frustumCulled = false; this.meshes[k] = im; this.group.add(im); im.userData.n = 0;
    }
    for (const s of specs) {
      const im = this.meshes[s.kind];
      const a = {
        kind: s.kind, idx: im.userData.n++, home: new THREE.Vector3(s.x, 0, s.z), pos: new THREE.Vector3(s.x, height(s.x, s.z), s.z),
        yaw: rnd() * 6.28, tgt: null, wait: rnd() * 3, hop: 0, hopV: 0, happyT: 0, visited: false, scale: s.scale || (0.9 + rnd() * 0.3),
        roam: s.roam ?? 6, speed: s.kind === 'hase' ? 1.6 : s.kind === 'ente' ? 0.9 : 0.7, lookP: 0, sleepy,
        onWater: s.kind === 'ente',
      };
      this.list.push(a);
    }
    return this.list;
  }
  clear() {
    for (const k in this.meshes) { const m = this.meshes[k]; this.group.remove(m); m.geometry.dispose(); }
    if (this.mat) this.mat.dispose();
    this.meshes = {}; this.list = [];
  }
  cheer(a) { a.happyT = 1.6; a.hopV = 4.2; }
  update(dt, t, player) {
    for (const a of this.list) {
      const dp = player ? _v.subVectors(player, a.pos) : null;
      const near = dp && Math.hypot(dp.x, dp.z) < 7 && dp.y < 6;
      if (a.happyT > 0) { a.happyT -= dt; if (a.hop <= 0.001 && a.happyT > 0.3) a.hopV = 3.2; a.yaw += dt * 5; }
      else if (near && !a.sleepy) {
        const want = Math.atan2(dp.x, dp.z);
        a.yaw += angDiff(want - a.yaw) * Math.min(1, dt * 4);
      } else if (!a.sleepy) {
        if (!a.tgt || a.wait > 0) {
          a.wait -= dt;
          if (a.wait <= 0 && !a.tgt) { const r = Math.random() * a.roam, an = Math.random() * 6.28; a.tgt = new THREE.Vector3(a.home.x + Math.cos(an) * r, 0, a.home.z + Math.sin(an) * r); }
        }
        if (a.tgt) {
          const dx = a.tgt.x - a.pos.x, dz = a.tgt.z - a.pos.z, d = Math.hypot(dx, dz);
          if (d < 0.3) { a.tgt = null; a.wait = 1.5 + Math.random() * 3; }
          else {
            const want = Math.atan2(dx, dz); a.yaw += angDiff(want - a.yaw) * Math.min(1, dt * 3);
            const sp = a.speed * dt;
            a.pos.x += Math.sin(a.yaw) * sp; a.pos.z += Math.cos(a.yaw) * sp;
            if (a.kind === 'hase' && a.hop <= 0.001) a.hopV = 2.2;
          }
        }
      }
      a.hopV -= 14 * dt; a.hop = Math.max(0, a.hop + a.hopV * dt); if (a.hop <= 0 && a.hopV < 0) a.hopV = 0;
      const gy = a.onWater ? 0.02 : height(a.pos.x, a.pos.z);
      a.pos.y = gy;
      const walk = a.tgt && !near && a.happyT <= 0 ? Math.abs(Math.sin(t * 9 + a.idx)) * 0.04 : 0;
      const breathe = Math.sin(t * 2 + a.idx) * 0.02;
      const sq = a.hopV > 0 ? 0.12 : (a.hop > 0 ? -0.05 : 0);
      _o.position.set(a.pos.x, gy + a.hop + walk, a.pos.z);
      _o.rotation.set(0, a.yaw, a.tgt && a.happyT <= 0 ? Math.sin(t * 9 + a.idx) * 0.06 : 0);
      _o.scale.set(a.scale * (1 - sq * 0.5), a.scale * (1 + sq + breathe), a.scale * (1 - sq * 0.5));
      _o.updateMatrix();
      this.meshes[a.kind].setMatrixAt(a.idx, _o.matrix);
    }
    for (const k in this.meshes) this.meshes[k].instanceMatrix.needsUpdate = true;
  }
}

// ---------------------------------------------------------------- Wespen (frech, schubsen nur)
export class Wasps {
  constructor(max = 4) {
    this.group = new THREE.Group(); this.list = [];
    const b = new Build();
    const y = 0xffd02a, k = 0x2a2018;
    const bands = [y, k, y, k, y];
    bands.forEach((col, i) => { const g = new THREE.SphereGeometry(0.2, 12, 3, 0, Math.PI * 2, i / 5 * Math.PI, Math.PI / 5); g.rotateX(Math.PI / 2); b.add(g, col, { p: [0, 0, -0.22], s: [1, 1, 1.4] }); });
    b.add(P.sphere(0.12, 10, 8), k, { p: [0, 0.02, 0.05] });
    const hc = [0, 0.06, 0.22];
    b.add(P.sphere(0.16, 14, 10), y, { p: hc });
    face(b, b, new Build(), hc, 0.16, { eye: 0.36, sep: 0.44, iris: 0x2a1010, cheek: 0xff8060, lod: 1 });
    // freche Augenbrauen
    for (const s of [-1, 1]) b.add(P.box(0.08, 0.018, 0.02), k, { p: surf(hc, 0.16, [s * 0.4, 0.62, 1], 1.02), r: [0, 0, s * 0.35] });
    b.add(P.cone(0.03, 0.08, 6), k, { p: [0, -0.02, -0.52], r: [-Math.PI / 2, 0, 0] });
    const wb = new Build(); const g1 = new THREE.PlaneGeometry(0.34, 0.16); g1.rotateX(Math.PI / 2); g1.translate(0.17, 0.12, 0); const g2 = g1.clone(); g2.rotateZ(Math.PI); g2.translate(0, 0.24, 0);
    wb.add(g1, 0xffffff); wb.add(g2, 0xffffff);
    this.body = new THREE.InstancedMesh(b.build(), toonMat({ vc: true, rim: 0.6, gloss: 0.4 }), max);
    this.wing = new THREE.InstancedMesh(wb.build(), toonMat({ color: 0xeef6ff, transparent: true, opacity: 0.4, side: THREE.DoubleSide, flap: [0.4, 0.5, 45], rim: 1.2 }), max);
    this.body.count = 0; this.wing.count = 0;
    [this.body, this.wing].forEach(m => { m.frustumCulled = false; this.group.add(m); });
  }
  setup(spots, strength = 1) {
    this.list = spots.map((s, i) => ({ c: new THREE.Vector3(s.x, s.y, s.z), r: s.r || 5, w: Math.random() * 6, sp: (0.6 + Math.random() * 0.4) * (i % 2 ? 1 : -1), pos: new THREE.Vector3(), yaw: 0, cd: 0, chase: 0 }));
    this.strength = strength;
    this.body.count = this.wing.count = this.list.length;
  }
  update(dt, t, player, onBump) {
    for (let i = 0; i < this.list.length; i++) {
      const w = this.list[i];
      w.cd = Math.max(0, w.cd - dt);
      w.w += w.sp * dt;
      const tx = w.c.x + Math.cos(w.w) * w.r, tz = w.c.z + Math.sin(w.w) * w.r;
      const ty = Math.max(height(tx, tz) + 1.5, w.c.y + Math.sin(t * 1.3 + i) * 1.2);
      _v.set(tx, ty, tz);
      // kurzes Hinterherbrummen, wenn der Spieler nah ist
      if (player && w.cd <= 0 && player.pos.distanceTo(w.pos) < 6) _v.lerp(player.pos, 0.6);
      const prev = w.pos.clone();
      if (w.pos.lengthSq() === 0) w.pos.copy(_v);
      w.pos.lerp(_v, Math.min(1, dt * 2.2));
      const mv = _v.subVectors(w.pos, prev);
      if (mv.lengthSq() > 1e-6) w.yaw += angDiff(Math.atan2(mv.x, mv.z) - w.yaw) * Math.min(1, dt * 8);
      if (player && w.cd <= 0 && !player.landed && player.pos.distanceTo(w.pos) < 1.3) {
        w.cd = 2.5;
        const push = new THREE.Vector3().subVectors(player.pos, w.pos).setY(0.4).normalize().multiplyScalar(9 * this.strength);
        onBump && onBump(w, push);
      }
      _o.position.copy(w.pos); _o.position.y += Math.sin(t * 7 + i) * 0.06;
      _o.rotation.set(0.15, w.yaw, Math.sin(t * 3 + i) * 0.15); _o.scale.setScalar(1.6); _o.updateMatrix();
      this.body.setMatrixAt(i, _o.matrix); this.wing.setMatrixAt(i, _o.matrix);
    }
    this.body.instanceMatrix.needsUpdate = true; this.wing.instanceMatrix.needsUpdate = true;
  }
}
