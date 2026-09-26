// Aufgaben: Sammeln, Glühwürmchen, Blütenregen, Ringe, Landen, Besuchen, Füttern, Stunts, Wettflug
import * as THREE from 'three';
import { toonMat, glowMat } from '../engine/gfx.js';
import { Build, P, petalGeo } from '../engine/geo.js';
import { height, pond } from '../world/terrain.js';
import { Critter } from '../actors/characters.js';

const _o = new THREE.Object3D();
const _c = new THREE.Color();
const _v = new THREE.Vector3();
const _w = new THREE.Vector3();

// ---------------------------------------------------------------- gemeinsame Formen
function heartShape(s = 1) {
  const h = new THREE.Shape();
  h.moveTo(0, -0.9 * s);
  h.bezierCurveTo(-1.3 * s, 0.1 * s, -0.7 * s, 1.1 * s, 0, 0.45 * s);
  h.bezierCurveTo(0.7 * s, 1.1 * s, 1.3 * s, 0.1 * s, 0, -0.9 * s);
  return h;
}
function starShape(r = 1) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; i ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  return s;
}
const GEO = {};
function geo(name) {
  if (GEO[name]) return GEO[name];
  const b = new Build();
  if (name === 'drop') {
    b.add(P.sphere(0.3, 14, 10), 0xffffff, { s: [1, 1.05, 1], tint: 1 });
    b.add(P.cone(0.21, 0.36, 14), 0xffffff, { p: [0, 0.36, 0], tint: 1 });
    b.add(P.sphere(0.08, 8, 6), 0xffffff, { p: [-0.11, 0.1, 0.22], unlit: 1 });
  } else if (name === 'firefly') {
    b.add(P.sphere(0.16, 12, 8), 0xeaff7a, { p: [0, 0, -0.08], s: [1, 1, 1.3], unlit: 1 });
    b.add(P.sphere(0.1, 10, 8), 0x3a3048, { p: [0, 0.03, 0.14] });
    for (const s of [-1, 1]) b.add(P.sphere(0.035, 6, 4), 0xffffff, { p: [s * 0.045, 0.07, 0.22], unlit: 1 });
  } else if (name === 'blossom') {
    for (let i = 0; i < 5; i++) b.add(petalGeo(0.34, 0.3, 0.06, 3), 0xffffff, { r: [0, i / 5 * Math.PI * 2, 0.15], order: 'YXZ', tint: 1 });
    b.add(P.sphere(0.09, 8, 6), 0xfff0a0, { p: [0, 0.03, 0], unlit: 0.4 });
  } else if (name === 'ring') {
    b.add(P.torus(1, 0.085, 8, 40), 0xffffff, { tint: 1 });
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2;
      b.add(P.sphere(0.12, 8, 6), 0xffffff, { p: [Math.cos(a), Math.sin(a), 0], unlit: 0.4 });
    }
  } else if (name === 'marker') {
    b.add(P.torus(0.75, 0.07, 6, 28), 0xffffff, { r: [Math.PI / 2, 0, 0], tint: 1, unlit: 0.4 });
    b.add(P.cone(0.22, 0.4, 10), 0xffffff, { p: [0, 1.3, 0], r: [Math.PI, 0, 0], tint: 1, unlit: 0.25 });
  } else if (name === 'heart') {
    const g = new THREE.ExtrudeGeometry(heartShape(0.35), { depth: 0.12, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2, curveSegments: 8 });
    g.translate(0, 0, -0.06);
    b.add(g, 0xff5f9a, { unlit: 0.25 });
  } else if (name === 'star') {
    const g = new THREE.ExtrudeGeometry(starShape(0.55), { depth: 0.16, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 2 });
    g.translate(0, 0, -0.08);
    b.add(g, 0xffd23a, { unlit: 0.35 });
  } else if (name === 'berry') {
    [[0, 0, 0], [0.16, 0.05, 0.05], [-0.1, 0.1, -0.12], [0.05, 0.16, -0.05]].forEach(p => b.add(P.sphere(0.13, 10, 8), 0xe8304a, { p }));
    b.add(petalGeo(0.25, 0.14, 0.03, 3), 0x4f9a3a, { p: [0, 0.2, 0], r: [0, 0.8, -0.3], order: 'YXZ' });
    b.add(P.sphere(0.04, 6, 4), 0xffffff, { p: [-0.05, 0.07, 0.11], unlit: 1 });
  } else if (name === 'bigflower') {
    b.add(P.cyl(0.06, 0.09, 1.6, 6), 0x4f9a3a, { p: [0, 0.8, 0] });
    for (let i = 0; i < 8; i++) b.add(petalGeo(0.7, 0.5, 0.1, 3, 3), 0xffffff, { p: [0, 1.6, 0], r: [0, i / 8 * Math.PI * 2, -0.25], order: 'YXZ', tint: 1 });
    b.add(P.sphere(0.3, 14, 8), 0xffd84a, { p: [0, 1.62, 0], s: [1, 0.45, 1], unlit: 0.35 });
    b.add(petalGeo(0.6, 0.3, 0.06, 3), 0x5aa844, { p: [0, 0.35, 0], r: [0, 1, 0.6], order: 'YXZ' });
    b.add(petalGeo(0.55, 0.28, 0.06, 3), 0x5aa844, { p: [0, 0.6, 0], r: [0, 4, 0.6], order: 'YXZ' });
  } else if (name === 'bush') {
    [[0, 0.7, 0, 1.0], [0.8, 0.55, 0.2, 0.75], [-0.75, 0.55, -0.1, 0.8], [0.1, 0.5, 0.75, 0.7]].forEach(([x, y, z, r]) => b.add(P.ico(r, 2), 0x3f8f3a, { p: [x, y, z] }));
  }
  return (GEO[name] = b.build());
}

class Pool {
  // Instanziertes Objekt + Leucht-Billboard, per Index steuerbar
  constructor(scene, name, n, o = {}) {
    this.mesh = new THREE.InstancedMesh(geo(name), toonMat({ vc: true, tint: true, rim: o.rim ?? 0.9, emis: o.emis ?? 0.25, gloss: o.gloss ?? 0.5, side: o.side ?? THREE.FrontSide }), n);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    if (o.glow) {
      this.glow = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), glowMat(0xffffff, o.glowI ?? 0.9, o.pulse ?? 0.12), n);
      this.glow.frustumCulled = false; scene.add(this.glow);
    }
    this.n = n; this.scene = scene;
  }
  set(i, pos, rx, ry, rz, scale, color, glowScale = 2) {
    _o.position.copy(pos); _o.rotation.set(rx, ry, rz); _o.scale.setScalar(scale); _o.updateMatrix();
    this.mesh.setMatrixAt(i, _o.matrix);
    if (color !== undefined) this.mesh.setColorAt(i, _c.set(color));
    if (this.glow) {
      _o.rotation.set(0, 0, 0); _o.scale.setScalar(scale > 0.001 ? glowScale : 0); _o.updateMatrix();
      this.glow.setMatrixAt(i, _o.matrix);
      if (color !== undefined) this.glow.setColorAt(i, _c.set(color));
    }
  }
  flush() {
    this.mesh.instanceMatrix.needsUpdate = true; if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    if (this.glow) { this.glow.instanceMatrix.needsUpdate = true; if (this.glow.instanceColor) this.glow.instanceColor.needsUpdate = true; }
  }
  dispose() {
    this.scene.remove(this.mesh); this.mesh.material.dispose();
    if (this.glow) { this.scene.remove(this.glow); this.glow.material.dispose(); this.glow.geometry.dispose(); }
  }
}

// Zufallspunkt in der Welt mit Abstand zu Bäumen
function spot(g, o = {}) {
  const r = g.rnd;
  for (let k = 0; k < 60; k++) {
    const rad = (o.rMin ?? 14) + ((o.rMax ?? 78) - (o.rMin ?? 14)) * Math.sqrt(r()), a = r() * Math.PI * 2;
    const x = Math.cos(a) * rad + (o.cx || 0), z = Math.sin(a) * rad + (o.cz || 0);
    if (g.nearTree(x, z, o.treeGap ?? 4)) continue;
    const P0 = pond();
    const inPond = P0[2] > 1 && Math.hypot(x - P0[0], z - P0[1]) < P0[2] * 1.05;
    if (o.water === true && !inPond) continue;
    if (o.water === false && inPond) continue;
    if (o.others && o.others.some(p => (p.x - x) ** 2 + (p.z - z) ** 2 < (o.gap ?? 8) ** 2)) continue;
    return new THREE.Vector3(x, height(x, z), z);
  }
  return new THREE.Vector3((r() - 0.5) * 60, 0, (r() - 0.5) * 60);
}

// ================================================================ Aufgaben
class Task {
  constructor(g, cfg) { this.g = g; this.cfg = cfg; this.cur = 0; this.max = cfg.n || 1; }
  get done() { return this.cur >= this.max; }
  target() { return null; }
  update() { }
  debugNext() { }
  dispose() { }
}

// --- Sammeln (Nektar / Glühwürmchen / Blütenregen)
class CollectTask extends Task {
  constructor(g, cfg) {
    super(g, cfg);
    const kind = cfg.type;
    this.kind = kind;
    this.icon = kind === 'fireflies' ? '✨' : kind === 'blossoms' ? '🌸' : '💧';
    this.label = kind === 'fireflies' ? 'Glühwürmchen' : kind === 'blossoms' ? 'Blüten fangen' : 'Nektartropfen';
    const n = cfg.n, extra = kind === 'blossoms' ? 5 : 0;
    this.items = [];
    const cols = kind === 'fireflies' ? [0xd8ff6a] : kind === 'blossoms' ? [0xffb3cf, 0xffd0e0, 0xff9fc0, 0xffffff] : [0xffc83a, 0xff8fc8, 0x8fd8ff, 0xb89cff, 0x9cf07a];
    this.pool = new Pool(g.scene, kind === 'fireflies' ? 'firefly' : kind === 'blossoms' ? 'blossom' : 'drop', n + extra,
      { glow: true, glowI: kind === 'fireflies' ? 1.6 : 0.8, emis: kind === 'drop' ? 0.35 : 0.2, side: kind === 'blossoms' ? THREE.DoubleSide : THREE.FrontSide });
    const others = [];
    const hi = g.diff.id === 'schwer' ? 7 : 4.5;
    const trees = (g.world.trees.userData.cherry || g.world.trees.userData.round || []).filter(t => Math.hypot(t.x, t.z) < 85);
    for (let i = 0; i < n + extra; i++) {
      let p;
      if (kind === 'blossoms' && trees.length) {
        const t = trees[(g.rnd() * trees.length) | 0];
        const a = g.rnd() * Math.PI * 2, rr = 2.9 * t.s + 0.8 + g.rnd() * 2;
        p = new THREE.Vector3(t.x + Math.cos(a) * rr, 0, t.z + Math.sin(a) * rr);
        p.y = height(p.x, p.z) + 4 + g.rnd() * 3;
      } else {
        p = spot(g, { others, gap: 9, water: cfg.overWater ? true : undefined, rMax: cfg.overWater ? 30 : 80, rMin: cfg.overWater ? 0 : 14 });
        p.y += (cfg.overWater ? 1.2 : 1.4) + g.rnd() * (hi - 1.4);
        if (cfg.overWater) p.y = Math.max(p.y, 1.3);
      }
      others.push(p);
      this.items.push({ base: p.clone(), pos: p.clone(), taken: kind === 'blossoms' && i >= n ? false : false, col: cols[i % cols.length], ph: g.rnd() * 6.28, s: 1, fall: 0.5 + g.rnd() * 0.4 });
    }
  }
  update(dt, t) {
    const g = this.g, pl = g.player.pos, D = g.diff;
    const R = D.pickR + 0.4;
    this.items.forEach((it, i) => {
      if (it.taken) { it.s = Math.max(0, it.s - dt * 5); }
      else {
        if (this.kind === 'fireflies') {
          it.pos.set(it.base.x + Math.sin(t * 0.5 + it.ph) * 3, it.base.y + Math.sin(t * 0.9 + it.ph * 2) * 0.8, it.base.z + Math.cos(t * 0.43 + it.ph) * 3);
          if (D.id === 'schwer') { _v.subVectors(it.base, pl); const d = _v.length(); if (d < 6) it.base.addScaledVector(_v.normalize(), dt * 1.6); }
        } else if (this.kind === 'blossoms') {
          it.pos.y -= it.fall * dt; it.pos.x += Math.sin(t * 1.3 + it.ph) * dt * 0.8 + g.world.def.wind[0] * dt * 0.4; it.pos.z += Math.cos(t * 1.1 + it.ph) * dt * 0.8;
          if (it.pos.y < height(it.pos.x, it.pos.z) + 0.8) { it.pos.copy(it.base); it.pos.y += 2; }
        } else {
          it.pos.y = it.base.y + Math.sin(t * 1.8 + it.ph) * 0.18;
        }
        // Magnet
        _v.subVectors(pl, it.pos); const d = _v.length();
        if (d < D.magnet && d > 0.01 && !g.player.stunt) { it.pos.addScaledVector(_v, Math.min(1, dt * 4.5 / Math.max(0.6, d / D.magnet))); if (this.kind !== 'collect') it.base.addScaledVector(_v, Math.min(1, dt * 3)); }
        if (d < R && this.cur < this.max) this.take(it);
      }
      const spin = this.kind === 'blossoms' ? t * 1.5 + it.ph : t * 1.6 + it.ph;
      const bl = this.kind === 'blossoms';
      const pulse = this.kind === 'fireflies' ? 0.8 + 0.4 * Math.sin(t * 3 + it.ph) : 1;
      this.pool.set(i, it.pos, bl ? 0.5 * Math.sin(t + it.ph) : 0, spin, bl ? 0.3 : 0, it.s * (this.kind === 'blossoms' ? 1.25 : 1.1), it.col, (this.kind === 'fireflies' ? 3.2 : 2.3) * pulse * (it.s > 0.01 ? 1 : 0));
    });
    this.pool.flush();
  }
  take(it) {
    it.taken = true; this.cur++;
    this.g.hit(it.pos, this.kind, it.col);
  }
  target() {
    let best = null, bd = 1e9; const pl = this.g.player.pos;
    for (const it of this.items) if (!it.taken) { const d = it.pos.distanceToSquared(pl); if (d < bd) { bd = d; best = it.pos; } }
    return this.done ? null : best;
  }
  debugNext() { const it = this.items.find(i => !i.taken); if (it) { this.g.player.pos.copy(it.pos); } }
  dispose() { this.pool.dispose(); }
}

// --- Ringe (in Reihenfolge)
function ringCourse(g, n, o = {}) {
  const r = g.rnd;
  const pts = [];
  let p = g.spawn.clone(), yaw = g.spawnYaw;
  const lo = o.low ? 2.2 : 3, hiY = o.wild ? (g.diff.id === 'schwer' ? 13 : 10) : (o.low ? 4.5 : 8);
  for (let i = 0; i < n; i++) {
    let ok = false, q;
    for (let k = 0; k < 40 && !ok; k++) {
      const turn = (r() - 0.5) * (o.wild ? 1.5 : 1.0);
      const y2 = yaw + turn;
      const d = (i === 0 ? 20 : 16 + r() * 7);
      q = new THREE.Vector3(p.x + Math.sin(y2) * d, 0, p.z + Math.cos(y2) * d);
      const rad = Math.hypot(q.x, q.z);
      if (rad > 88) { yaw += 0.5; continue; }
      if (g.nearTree(q.x, q.z, 5)) continue;
      const P0 = pond();
      q.y = Math.max(height(q.x, q.z), P0[2] > 1 ? 0 : -99) + lo + r() * (hiY - lo);
      ok = true; yaw = y2;
    }
    pts.push(q); p = q;
  }
  return pts;
}
class RingTask extends Task {
  constructor(g, cfg, pts) {
    super(g, cfg);
    this.icon = '⭕'; this.label = 'Flugringe';
    this.pts = pts || ringCourse(g, cfg.n, cfg);
    this.max = this.pts.length;
    this.R = g.diff.ringR;
    this.pool = new Pool(g.scene, 'ring', this.max, { glow: true, glowI: 0.16, pulse: 0.2, rim: 1.2, emis: 0.35 });
    this.dirs = this.pts.map((p, i) => {
      const a = i > 0 ? this.pts[i - 1] : g.spawn, b = i < this.pts.length - 1 ? this.pts[i + 1] : p.clone().add(_v.subVectors(p, a));
      return new THREE.Vector3().subVectors(b, a).setY(0).normalize();
    });
    this.anim = this.pts.map(() => 0);
    this.prevSide = null;
  }
  update(dt, t) {
    const g = this.g, pl = g.player.pos;
    const i = this.cur;
    if (i < this.max) {
      const c = this.pts[i], n = this.dirs[i];
      _v.subVectors(pl, c);
      const side = _v.dot(n);
      const lat = _w.copy(_v).addScaledVector(n, -side).length();
      if (this.prevSide !== null && this.prevSide < 0 && side >= 0 && lat < this.R * 1.12) this.pass();
      else if (Math.abs(side) < 0.9 && lat < this.R * 0.95) this.pass();
      this.prevSide = side;
      // Hilfe: sanft zum Ringmittelpunkt ziehen (Leicht)
      const A = g.diff.ringAssist;
      if (A > 0 && side < 0 && side > -10 && lat < this.R * 2.6 && !g.player.stunt && !g.player.landed) {
        _w.copy(_v).addScaledVector(n, -side);
        pl.addScaledVector(_w, -Math.min(1, dt * 1.6 * A));
      }
    }
    this.pts.forEach((p, k) => {
      const state = k < this.cur ? 0 : k === this.cur ? 2 : 1;
      this.anim[k] += ((state === 0 ? 0 : 1) - this.anim[k]) * Math.min(1, dt * 6);
      const s = this.anim[k] * this.R * (state === 2 ? 1 + 0.06 * Math.sin(t * 5) : 0.92);
      const yaw = Math.atan2(this.dirs[k].x, this.dirs[k].z);
      const col = state === 2 ? 0xffd84a : (k === this.cur + 1 ? 0xff9fd0 : 0xbfe6ff);
      const vis = state === 0 ? s : (k <= this.cur + 3 ? s : s * 0.001);
      this.pool.set(k, p, 0, yaw, t * 0.4, vis, col, state === 2 ? this.R * 2.2 : 0.001);
    });
    this.pool.flush();
  }
  pass() {
    const p = this.pts[this.cur];
    this.cur++; this.prevSide = null;
    this.g.hit(p, 'ring', 0xffd84a);
  }
  target() { return this.done ? null : this.pts[this.cur]; }
  debugNext() { if (!this.done) { this.g.player.pos.copy(this.pts[this.cur]); this.pass(); } }
  dispose() { this.pool.dispose(); }
}

// --- Landen (Sonnenblumen, Seerosen, Nektar-/Mondblumen)
class LandTask extends Task {
  constructor(g, cfg) {
    super(g, cfg);
    this.icon = '🛬'; this.label = cfg.on === 'lily' ? 'Auf Seerosen landen' : cfg.on === 'sunflower' ? 'Auf Sonnenblumen landen' : 'Auf Mondblumen landen';
    this.spots = [];
    const others = [];
    if (cfg.on === 'sunflower' && g.world.sunflowers) {
      const pts = g.world.sunflowers.userData.pts.slice().sort(() => g.rnd() - 0.5);
      for (const p of pts) {
        if (this.spots.length >= cfg.n) break;
        if (others.some(o => (o.x - p.x) ** 2 + (o.z - p.z) ** 2 < 144)) continue;
        others.push(p);
        this.spots.push({ pos: new THREE.Vector3(p.x + Math.sin(p.rot) * 0.1 * p.s, p.y + 2.25 * p.s + 0.42 * p.s, p.z + Math.cos(p.rot) * 0.1 * p.s), r: 2.8, done: false, task: this });
      }
    } else if (cfg.on === 'lily' && g.world.pond) {
      const pads = g.world.pond.userData.pads.slice().sort(() => g.rnd() - 0.5);
      for (const p of pads) {
        if (this.spots.length >= cfg.n) break;
        if (p.s < 1.2 || others.some(o => (o.x - p.x) ** 2 + (o.z - p.z) ** 2 < 64)) continue;
        others.push(p);
        this.spots.push({ pos: new THREE.Vector3(p.x, 0.32, p.z), r: 2.6, done: false, task: this });
      }
    }
    // Rest: eigene große Blüten (Nektar-/Mondblumen)
    this.flowers = [];
    while (this.spots.length < cfg.n) {
      const p = spot(g, { others, gap: 14, water: false, rMin: 16, rMax: 75 });
      others.push(p);
      const s = 1.3;
      this.flowers.push({ p, s });
      this.spots.push({ pos: new THREE.Vector3(p.x, p.y + 1.66 * s + 0.35, p.z), r: 2.8, done: false, task: this });
    }
    if (this.flowers.length) {
      const moon = cfg.on === 'moonflower';
      this.fpool = new Pool(g.scene, 'bigflower', this.flowers.length, { glow: moon, glowI: 0.6, rim: 0.8, emis: moon ? 0.45 : 0.1, side: THREE.DoubleSide });
      this.flowers.forEach((f, i) => this.fpool.set(i, f.p, 0, 0, 0, f.s, moon ? 0xe8f0ff : [0xff7eb6, 0xb38cff, 0xffa84a, 0x6ec6ff][i % 4], moon ? 5 : 0.001));
      this.fpool.flush();
    }
    this.mpool = new Pool(g.scene, 'marker', this.spots.length, { glow: true, glowI: 0.5, emis: 0.5 });
    this.spots.forEach(s => g.player.landables.push(s));
    this.sip = null;
    this.max = this.spots.length;
  }
  onLand(spot) {
    if (!spot || spot.task !== this || spot.done) return false;
    this.sip = { spot, t: 0 };
    return true;
  }
  update(dt, t) {
    const g = this.g;
    if (this.sip) {
      if (!g.player.landed || g.player.landSpot !== this.sip.spot) this.sip = null;
      else {
        this.sip.t += dt;
        if (Math.random() < dt * 12) g.bursts.emit({ n: 1, pos: _v.copy(this.sip.spot.pos).add(_w.set(0, 0.3, 0)), colors: [0xffe07a, 0xffb0d8], speed: 1.2, up: 1.5, size: 0.18, life: 0.7, shape: 0, grav: -1 });
        if (this.sip.t > 1.0) { const s = this.sip.spot; s.done = true; this.cur++; this.sip = null; g.hit(s.pos, 'land', 0xffd84a); this.autoOff = 0.5; }
      }
    }
    // nach dem Naschen hüpft die Figur fröhlich wieder los
    if (this.autoOff > 0) { this.autoOff -= dt; if (this.autoOff <= 0 && g.player.landed) g.player.takeoff(); }
    this.spots.forEach((s, i) => {
      const sc = s.done ? 0.0001 : 1 + 0.08 * Math.sin(t * 4 + i);
      _v.copy(s.pos); _v.y += 0.05 + Math.sin(t * 3 + i) * 0.08;
      this.mpool.set(i, _v, 0, t, 0, sc, 0x9ff0ff, s.done ? 0.001 : 2.2);
    });
    this.mpool.flush();
  }
  target() {
    let best = null, bd = 1e9; const pl = this.g.player.pos;
    for (const s of this.spots) if (!s.done) { const d = s.pos.distanceToSquared(pl); if (d < bd) { bd = d; best = s.pos; } }
    return best;
  }
  debugNext() {
    const s = this.spots.find(q => !q.done); if (!s) return;
    const p = this.g.player; p.pos.copy(s.pos); p.land(s);
    this.sip = { spot: s, t: 0.99 };
  }
  dispose() {
    this.mpool.dispose(); this.fpool && this.fpool.dispose();
    const L = this.g.player.landables; for (const s of this.spots) { const k = L.indexOf(s); if (k >= 0) L.splice(k, 1); }
  }
}

// --- Tierbabys besuchen
class VisitTask extends Task {
  constructor(g, cfg) {
    super(g, cfg);
    this.icon = '💞'; this.label = g.level.sleepy ? 'Gute Nacht sagen' : 'Tierbabys besuchen';
    const list = g.animals.list.filter(a => a.kind !== 'ente' || cfg.ducks !== false);
    this.who = list.slice(0, cfg.n);
    this.max = this.who.length;
    this.pool = new Pool(g.scene, 'heart', this.max, { glow: true, glowI: 0.5, emis: 0.3 });
  }
  update(dt, t) {
    const g = this.g, pl = g.player.pos;
    this.who.forEach((a, i) => {
      if (!a.visited) {
        const dx = pl.x - a.pos.x, dz = pl.z - a.pos.z;
        if (Math.hypot(dx, dz) < 4.2 && pl.y - a.pos.y < 5) {
          a.visited = true; this.cur++; g.animals.cheer(a);
          g.bursts.emit({ n: 12, pos: _v.copy(a.pos).add(new THREE.Vector3(0, 1.4, 0)), colors: [0xff6fa8, 0xff9fc8, 0xffc0da], shape: 3, size: 0.45, speed: 2.5, up: 2.5, life: 1.3, grav: -0.5 });
          g.hit(_v.copy(a.pos).add(new THREE.Vector3(0, 1.2, 0)), 'visit', 0xff7ab0);
        }
      }
      _v.copy(a.pos); _v.y += 2.2 * a.scale + Math.sin(t * 2.5 + i) * 0.15;
      this.pool.set(i, _v, 0, t * 1.5, 0, a.visited ? 0.0001 : 1, 0xffffff, a.visited ? 0.001 : 2.5);
    });
    this.pool.flush();
  }
  target() {
    let best = null, bd = 1e9; const pl = this.g.player.pos;
    for (const a of this.who) if (!a.visited) { const d = a.pos.distanceToSquared(pl); if (d < bd) { bd = d; best = a.pos; } }
    return best;
  }
  debugNext() { const a = this.who.find(q => !q.visited); if (a) this.g.player.pos.set(a.pos.x, a.pos.y + 2, a.pos.z); }
  dispose() { this.pool.dispose(); }
}

// --- Füttern: Beeren pflücken und zu Tierbabys bringen
class DeliverTask extends Task {
  constructor(g, cfg) {
    super(g, cfg);
    this.icon = '🍓'; this.label = 'Beeren bringen';
    this.who = g.animals.list.filter(a => a.kind !== 'ente').slice(0, cfg.n);
    this.max = this.who.length;
    const others = this.who.map(a => a.pos);
    this.bushes = [];
    for (let i = 0; i < this.max; i++) {
      const p = spot(g, { others, gap: 12, water: false, rMin: 14, rMax: 70 });
      others.push(p);
      this.bushes.push({ pos: p, berry: new THREE.Vector3(p.x, p.y + 1.9, p.z), has: true });
    }
    this.bpool = new Pool(g.scene, 'bush', this.bushes.length, { rim: 0.6, emis: 0, gloss: 0 });
    this.bushes.forEach((b, i) => this.bpool.set(i, b.pos, 0, 0, 0, 1.2, 0x4f9a44));
    this.bpool.flush();
    this.berries = new Pool(g.scene, 'berry', this.bushes.length + 1, { glow: true, glowI: 0.6, rim: 0.8, gloss: 0.9 });
    this.wants = new Pool(g.scene, 'berry', this.max, { glow: false, rim: 0.8 });
    this.carry = false;
  }
  update(dt, t) {
    const g = this.g, pl = g.player.pos;
    this.bushes.forEach((b, i) => {
      if (b.has && !this.carry && pl.distanceTo(b.berry) < g.diff.pickR + 1.2) {
        b.has = false; this.carry = true; g.player.carry = true;
        g.sfx('pick', b.berry); g.toast('🍓 Beere gepflückt – bring sie einem Tierbaby!');
        g.bursts.emit({ n: 10, pos: b.berry, colors: [0xff5f7a, 0xffd0d8], shape: 1, size: 0.3, speed: 2, life: 0.7 });
      }
      this.berries.set(i, b.berry, 0, t, 0, b.has ? 1.3 + 0.1 * Math.sin(t * 4 + i) : 0.0001, 0xffffff, b.has ? 2.2 : 0.001);
    });
    // getragene Beere
    const k = this.bushes.length;
    this.berries.set(k, _v.set(pl.x, pl.y - 0.6 + Math.sin(t * 6) * 0.05, pl.z), 0, t * 2, 0, this.carry ? 1.2 : 0.0001, 0xffffff, this.carry ? 1.5 : 0.001);
    this.berries.flush();
    this.who.forEach((a, i) => {
      if (!a.fed && this.carry) {
        const dx = pl.x - a.pos.x, dz = pl.z - a.pos.z;
        if (Math.hypot(dx, dz) < 4.2 && pl.y - a.pos.y < 5) {
          a.fed = true; this.carry = false; g.player.carry = null; this.cur++;
          g.animals.cheer(a);
          g.bursts.emit({ n: 12, pos: _v.copy(a.pos).add(new THREE.Vector3(0, 1.4, 0)), colors: [0xff6fa8, 0xff9fc8], shape: 3, size: 0.45, speed: 2.5, up: 2.5, life: 1.3, grav: -0.5 });
          g.hit(_v.copy(a.pos).add(new THREE.Vector3(0, 1.2, 0)), 'deliver', 0xff5f7a);
        }
      }
      _v.copy(a.pos); _v.y += 2.2 * a.scale + Math.sin(t * 2.5 + i) * 0.15;
      this.wants.set(i, _v, 0, t, 0, a.fed ? 0.0001 : 1.1, 0xffffff);
    });
    this.wants.flush();
  }
  target() {
    const pl = this.g.player.pos; let best = null, bd = 1e9;
    if (this.carry) { for (const a of this.who) if (!a.fed) { const d = a.pos.distanceToSquared(pl); if (d < bd) { bd = d; best = a.pos; } } }
    else for (const b of this.bushes) if (b.has) { const d = b.berry.distanceToSquared(pl); if (d < bd) { bd = d; best = b.berry; } }
    return this.done ? null : best;
  }
  debugNext() {
    const pl = this.g.player.pos;
    if (!this.carry) { const b = this.bushes.find(q => q.has); if (b) pl.copy(b.berry); }
    else { const a = this.who.find(q => !q.fed); if (a) pl.set(a.pos.x, a.pos.y + 2, a.pos.z); }
  }
  dispose() { this.bpool.dispose(); this.berries.dispose(); this.wants.dispose(); this.g.player.carry = null; }
}

// --- Stunts
class StuntTask extends Task {
  constructor(g, cfg) {
    super(g, cfg);
    this.needL = cfg.loop || 0; this.needR = cfg.roll || 0;
    this.max = this.needL + this.needR; this.l = 0; this.r = 0;
    this.icon = '🤸'; this.label = this.needR && this.needL ? 'Loopings & Schrauben' : this.needL ? 'Loopings' : 'Schrauben';
  }
  onStunt(type) {
    if (type === 'loop' && this.l < this.needL) this.l++;
    else if (type === 'roll' && this.r < this.needR) this.r++;
    else return;
    this.cur = this.l + this.r;
    this.g.hit(this.g.player.pos, 'stunt', 0xffe07a);
  }
  debugNext() { if (this.l < this.needL) this.onStunt('loop'); else this.onStunt('roll'); }
  detail() { return (this.needL ? `🤸${this.l}/${this.needL} ` : '') + (this.needR ? `🌀${this.r}/${this.needR}` : ''); }
}

// --- Wettflug gegen freundliche Rivalin
class RaceTask extends RingTask {
  constructor(g, cfg) {
    const pts = ringCourse(g, cfg.n, { wild: false });
    super(g, cfg, pts);
    this.icon = '🏁'; this.label = cfg.rival === 'libelle' ? 'Wettflug mit Lilli Libelle' : 'Wettflug mit Flora';
    this.rivalName = cfg.rival === 'libelle' ? 'Lilli' : 'Flora';
    this.rival = new Critter(cfg.rival === 'libelle' ? 'libelle' : 'schmetterling', { color: cfg.rival === 'libelle' ? 1 : 3, pattern: 'herzen', hat: 'schleife' });
    g.scene.add(this.rival.root);
    const all = [g.spawn.clone().add(new THREE.Vector3(Math.cos(g.spawnYaw) * 2.2, 0, -Math.sin(g.spawnYaw) * 2.2)), ...pts];
    const first = all[0].clone(); first.y = g.spawn.y;
    all[0] = first;
    this.curve = new THREE.CatmullRomCurve3(all, false, 'centripetal');
    this.len = this.curve.getLength();
    this.u = 0; this.finished = false; this.rivalDone = false;
    this.rival.root.position.copy(first);
    this.started = false;
  }
  start() { this.started = true; }
  update(dt, t) {
    super.update(dt, t);
    const g = this.g;
    if (this.started && !this.rivalDone && !this.done) {
      let sp = g.player.baseSpeed * g.diff.rival;
      // Gummiband: nie zu weit weg
      const myU = this.cur / this.max;
      const lead = this.u - myU;
      if (lead > 0.16) sp *= 0.6; else if (lead < -0.12) sp *= 1.25;
      if (g.diff.id === 'leicht' && this.u > 0.9 && !this.done) sp *= 0.15; // Leicht: Flora lässt dich gewinnen
      this.u = Math.min(1, this.u + sp * dt / this.len);
      if (this.u >= 1) { this.rivalDone = true; if (!this.done) g.fail(`${this.rivalName} war diesmal schneller! Nochmal?`); }
    }
    const p = this.curve.getPointAt(this.u, this._p || (this._p = new THREE.Vector3()));
    const tg = this.curve.getTangentAt(Math.min(0.999, this.u), this._t || (this._t = new THREE.Vector3()));
    this.rival.root.position.copy(p).add(_v.set(0, Math.sin(t * 3) * 0.1, 0));
    this.rival.root.rotation.y = Math.atan2(tg.x, tg.z);
    this.rival.tilt.rotation.x = -Math.asin(THREE.MathUtils.clamp(tg.y, -0.6, 0.6)) * 0.8;
    this.rival.update(dt, t, { speed01: 0.8, cheer: this.rivalDone });
  }
  rivalProgress() { return this.u; }
  dispose() { super.dispose(); this.g.scene.remove(this.rival.root); this.rival.dispose(); }
}

export function makeTask(g, cfg) {
  switch (cfg.type) {
    case 'collect': case 'fireflies': case 'blossoms': return new CollectTask(g, cfg);
    case 'rings': return new RingTask(g, cfg);
    case 'land': return new LandTask(g, cfg);
    case 'visit': return new VisitTask(g, cfg);
    case 'deliver': return new DeliverTask(g, cfg);
    case 'stunts': return new StuntTask(g, cfg);
    case 'race': return new RaceTask(g, cfg);
  }
  throw new Error('Unbekannte Aufgabe ' + cfg.type);
}

// ---------------------------------------------------------------- Glitzerstern (Bonus für ★★★)
export class GlitterStar {
  constructor(g) {
    this.g = g;
    const p = spot(g, { rMin: 30, rMax: 85, treeGap: 0 });
    // gern hoch oben oder bei einem Baum versteckt
    const trees = g.treePts;
    if (trees.length && g.rnd() < 0.6) { const t = trees[(g.rnd() * trees.length) | 0]; p.set(t.x + 2.8 * t.s, height(t.x, t.z) + 2.2, t.z + 1.5); }
    else p.y += 6 + g.rnd() * 6;
    this.pos = p; this.found = false; this.s = 1;
    this.pool = new Pool(g.scene, 'star', 1, { glow: true, glowI: 1.1, emis: 0.5, rim: 1.5 });
  }
  update(dt, t) {
    const pl = this.g.player.pos;
    if (!this.found && pl.distanceTo(this.pos) < 2.4) {
      this.found = true;
      this.g.bonus(this.pos);
    }
    if (this.found) this.s = Math.max(0, this.s - dt * 3);
    _v.copy(this.pos); _v.y += Math.sin(t * 2) * 0.25;
    if (!this.found && Math.random() < dt * 4) this.g.bursts.emit({ n: 1, pos: _v, spread: 1.2, colors: [0xffe07a, 0xffffff], shape: 1, size: 0.3, speed: 0.4, up: 0.3, life: 0.9, grav: 0 });
    this.pool.set(0, _v, 0, t * 2, 0, this.s * 1.3, 0xffffff, this.s > 0.01 ? 3.5 : 0.001);
    this.pool.flush();
  }
  dispose() { this.pool.dispose(); }
}
