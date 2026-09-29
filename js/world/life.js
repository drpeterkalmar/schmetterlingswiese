// v2.3 Wiesen-Leben: Singvögel, Schmetterlings-Schwarm, Bienen, Marienkäfer, Wildhäschen, Teich-Fisch, fallende Blätter.
// Alles instanziert (je Art 1–2 Draw-Calls), keine Allokationen pro Frame; Effekte über den Burst-Pool, Klänge vorgerendert.
// Die Tiere halten sich in der Nähe des Spielers auf (weit weg → leise umziehen), damit man sie auch wirklich sieht.
import * as THREE from 'three';
import { toonMat, blobShadowMat } from '../engine/gfx.js';
import { Build, P, petalGeo } from '../engine/geo.js';
import { face } from '../actors/characters.js';
import { animalGeo } from '../actors/npcs.js';
import { height, pond } from './terrain.js';

const _o = new THREE.Object3D(), _v = new THREE.Vector3(), _w = new THREE.Vector3(), _c = new THREE.Color();
const angDiff = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const LEAF = [0x8ccf5a, 0xb8d860, 0xe0c060, 0x7ab84a], PETAL = [0xffb7cf, 0xffd7e4, 0xffffff, 0xff9fc0], SPLASH = [0xd8f4ff, 0xffffff, 0xa8e0f0];
const EO = { n: 1, pos: null, colors: null, shape: 2, size: 0.28, speed: 0.3, up: 0, life: 6, grav: -0.35, drag: 2.2, spin: 2, spread: 0.6, vel: null };

function mkMesh(geo, mat, n) { const m = new THREE.InstancedMesh(geo, mat, n); m.frustumCulled = false; m.count = n; return m; }
function wingPair(w, h, col, offZ = 0) {
  const b = new Build();
  const g1 = new THREE.PlaneGeometry(w, h); g1.rotateX(Math.PI / 2); g1.translate(w / 2, 0, offZ);
  const g2 = g1.clone(); g2.rotateZ(Math.PI);
  b.add(g1, col, { tint: 1 }); b.add(g2, col, { tint: 1 });
  return b.build();
}

export class Life {
  constructor(world, def, rnd, fx) {
    this.fx = fx || {}; this.def = def; this.world = world;
    this.group = new THREE.Group();
    const night = def.id === 'abend';
    this.trees = Object.values(world.trees.userData).flat();
    this.flowerPts = world.flowers.userData.pts || [];
    this.bushPts = world.bushes.userData.pts || [];
    const P0 = pond(); this.P0 = P0;
    // ---------------- Singvögel (nicht nachts): Körper + Flügel (2 Planes, Flügelschlag im Shader)
    this.birds = [];
    const nBirds = night ? 0 : 3;
    if (nBirds) {
      const b = new Build();
      b.add(P.sphere(0.16, 10, 8), 0xffffff, { p: [0, 0, -0.02], s: [1, 0.92, 1.35], tint: 1 });
      b.add(P.sphere(0.12, 8, 6), 0xfff4e0, { p: [0, -0.05, 0.05], s: [0.9, 0.8, 1.2] }); // helle Brust
      const hc = [0, 0.1, 0.19];
      b.add(P.sphere(0.115, 10, 8), 0xffffff, { p: hc, tint: 1 });
      b.add(P.cone(0.035, 0.09, 6), 0xffa726, { p: [0, 0.085, 0.33], r: [Math.PI / 2, 0, 0] });
      b.add(petalGeo(0.2, 0.14, 0.02, 2), 0xffffff, { p: [0, 0.03, -0.18], r: [0, Math.PI / 2, 0.2], order: 'YXZ', tint: 0.8 }); // Schwanz nach hinten (-Z)
      face(b, b, new Build(), hc, 0.115, { eye: 0.32, sep: 0.55, up: 0.15, lod: 1, cheek: 0xff9ab0, mouth: false });
      this.birdBody = mkMesh(b.build(), toonMat({ vc: true, tint: true, rim: 0.6, soft: 0.2 }), nBirds);
      // Flügel als Vogelflügel-Umriss (runde Vorderkante, gefiederte Hinterkante) statt Rechteck
      const sh = new THREE.Shape();
      sh.moveTo(0, 0.09); sh.quadraticCurveTo(0.2, 0.12, 0.38, 0.02);
      sh.quadraticCurveTo(0.4, -0.03, 0.33, -0.05); sh.lineTo(0.3, -0.02); sh.lineTo(0.25, -0.09); sh.lineTo(0.2, -0.05);
      sh.lineTo(0.14, -0.12); sh.lineTo(0.09, -0.07); sh.lineTo(0.03, -0.13); sh.lineTo(0, -0.08); sh.closePath();
      const wg = new Build(), w1 = new THREE.ShapeGeometry(sh, 4); w1.rotateX(Math.PI / 2); w1.translate(0.04, 0.02, -0.02);
      const w2 = w1.clone(); w2.rotateZ(Math.PI); w2.translate(0, 0.04, 0);
      wg.add(w1, 0xffffff, { tint: 1 }); wg.add(w2, 0xffffff, { tint: 1 });
      this.birdWing = mkMesh(wg.build(), toonMat({ vc: true, tint: true, side: THREE.DoubleSide, flap: [0.25, 0.95, 17], rim: 0.6 }), nBirds);
      const cols = [0x5a8fd8, 0xe8743a, 0x8a6a4a];
      for (let i = 0; i < nBirds; i++) {
        this.birdBody.setColorAt(i, _c.set(cols[i % cols.length])); this.birdWing.setColorAt(i, _c.set(cols[i % cols.length]).multiplyScalar(0.85));
        const t = this.trees[(rnd() * this.trees.length) | 0] || { x: 0, z: 0, s: 1 };
        this.birds.push({ pos: new THREE.Vector3(t.x, this.treeTop(t), t.z), from: new THREE.Vector3(), to: new THREE.Vector3(), u: 1, dur: 1, wait: 1 + rnd() * 4,
          yaw: rnd() * 6.28, pitch: 0, fly: false, vel: new THREE.Vector3(), chirpT: 2 + rnd() * 4 });
      }
      this.group.add(this.birdBody, this.birdWing);
    }
    // ---------------- Schmetterlings-Schwarm (nachts: helle Nachtfalter) in Lissajous-Runden um Blumenflecken
    this.swarm = [];
    const nSw = 10;
    {
      const bb = new Build();
      bb.add(P.capsule(0.022, 0.12, 2, 5), 0x3a2838, { r: [Math.PI / 2, 0, 0] });
      bb.add(P.sphere(0.03, 5, 4), 0x3a2838, { p: [0, 0.01, 0.08] });
      const wb = new Build();
      const w1 = new THREE.CircleGeometry(0.13, 7); w1.rotateX(-Math.PI / 2); w1.scale(1, 1, 1.25); w1.translate(0.12, 0, 0.02);
      const w2 = w1.clone(); w2.rotateZ(Math.PI);
      wb.add(w1, 0xffffff, { tint: 1 }); wb.add(w2, 0xffffff, { tint: 1 });
      this.swBody = mkMesh(bb.build(), toonMat({ vc: true, rim: 0.5 }), nSw);
      this.swWing = mkMesh(wb.build(), toonMat({ vc: true, tint: true, side: THREE.DoubleSide, flap: [0.3, 1.0, 14], rim: 0.9, emis: night ? 0.35 : 0.05 }), nSw);
      const cols = night ? [0xe8e0ff, 0xd8f0ff, 0xfff0d0] : [0xff7eb6, 0xffd23f, 0x7cc4ff, 0xb89cff, 0xff9f43, 0x9cf07a];
      for (let i = 0; i < nSw; i++) {
        this.swWing.setColorAt(i, _c.set(cols[i % cols.length]));
        this.swarm.push({ a: 2 + rnd() * 2.5, b: 1.6 + rnd() * 2.2, fa: 0.35 + rnd() * 0.3, fb: 0.5 + rnd() * 0.35, ph: rnd() * 6.28, h: 0.9 + rnd() * 1.6, grp: i % 2, pos: new THREE.Vector3(), yaw: 0 });
      }
      this.swC = [new THREE.Vector3(), new THREE.Vector3()]; this.swCInit = false;
      this.group.add(this.swBody, this.swWing);
    }
    // ---------------- Bienen (nicht nachts): Blume zu Blume, kurze Pause auf der Blüte, leises Summen in der Nähe
    this.bees = [];
    const nBees = night ? 0 : 5;
    if (nBees) {
      const b = new Build();
      [0xffd02a, 0x2a2018, 0xffd02a, 0x2a2018].forEach((col, i) => { const g = new THREE.SphereGeometry(0.1, 8, 2, 0, Math.PI * 2, i / 4 * Math.PI, Math.PI / 4); g.rotateX(Math.PI / 2); b.add(g, col, { p: [0, 0, -0.06], s: [1, 1, 1.35] }); });
      const hc = [0, 0.02, 0.1];
      b.add(P.sphere(0.075, 8, 6), 0xffd84a, { p: hc });
      face(b, b, new Build(), hc, 0.075, { eye: 0.36, sep: 0.46, lod: 1, mouth: false, cheek: 0xff9a70 });
      this.beeBody = mkMesh(b.build(), toonMat({ vc: true, rim: 0.6, gloss: 0.3 }), nBees);
      this.beeWing = mkMesh(wingPair(0.13, 0.08, 0xffffff), toonMat({ color: 0xeef6ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide, flap: [0.5, 0.45, 42], rim: 1.2 }), nBees);
      this.beeWing.position.y = 0.0;
      for (let i = 0; i < nBees; i++) this.bees.push({ pos: new THREE.Vector3(9999, 0, 0), from: new THREE.Vector3(), to: new THREE.Vector3(), u: 1, dur: 1, wait: rnd() * 2, yaw: 0, ph: rnd() * 6.28, sit: false });
      this.group.add(this.beeBody, this.beeWing);
    }
    this.humT = 2;
    // ---------------- Marienkäfer auf den Büschen (kriechen im Kreis über die Blätter)
    this.bugs = [];
    {
      const b = new Build();
      b.add(P.sphere(0.1, 10, 6), 0xe8303a, { s: [1, 0.7, 1.15], cf: (x, y, z) => (Math.abs(x) < 0.01 && y > 0 ? 0x1c1418 : (((x * 40 | 0) + (z * 40 | 0)) % 3 === 0 && y > 0.03 ? 0x1c1418 : undefined)) });
      b.add(P.sphere(0.055, 8, 5), 0x1c1418, { p: [0, -0.005, 0.11] });
      for (const s of [-1, 1]) b.add(P.sphere(0.016, 5, 4), 0xffffff, { p: [s * 0.025, 0.015, 0.155], unlit: 1 });
      this.bugMesh = mkMesh(b.build(), toonMat({ vc: true, rim: 0.5, gloss: 0.8 }), 3);
      for (let i = 0; i < 3; i++) this.bugs.push({ bush: null, a: rnd() * 6.28, sp: (0.25 + rnd() * 0.2) * (i % 2 ? 1 : -1), r: 0.45 + rnd() * 0.25 });
      this.group.add(this.bugMesh);
    }
    this.bugT = 0;
    // ---------------- Wildhäschen: hoppelt weg, wenn man ganz nah kommt
    this.bunnies = [];
    {
      // v2.4: gleiches Rig-Modell wie das Aufgaben-Häschen, sparsame Fassung (lod) + Kontaktschatten
      const A = animalGeo('hase', false, true), g = A.geo;
      g.setAttribute('aAnim', new THREE.InstancedBufferAttribute(new Float32Array(8), 4).setUsage(THREE.DynamicDrawUsage));
      g.setAttribute('aAnim2', new THREE.InstancedBufferAttribute(new Float32Array(8), 4).setUsage(THREE.DynamicDrawUsage));
      g.setAttribute('aNeck', new THREE.InstancedBufferAttribute(new Float32Array([...A.neck, ...A.neck]), 3));
      this.bunMesh = mkMesh(g, toonMat({ vc: true, rim: 0.55, soft: 0.12, rig: true }), 2);
      const sg = new THREE.PlaneGeometry(2, 2); sg.rotateX(-Math.PI / 2);
      this.bunShadow = mkMesh(sg, blobShadowMat(0x1a2a10, night ? 0.24 : 0.32), 2); this.bunShadow.renderOrder = 1; this.bunShadowR = A.shadow;
      for (let i = 0; i < 2; i++) this.bunnies.push({ pos: new THREE.Vector3(9999, 0, 0), yaw: rnd() * 6.28, hop: 0, hopV: 0, run: 0, dir: 0, idleT: 1 + rnd() * 3,
        hy: 0, hp: 0, blinkT: 1 + rnd() * 3, blink: 0, earT: 2 + rnd() * 3, earU: 1 });
      this.group.add(this.bunMesh, this.bunShadow);
    }
    // ---------------- Fisch im Teich (hüpft ab und zu: Platscher + Wasserring)
    this.fish = null;
    if (P0[2] > 1 && world.pond) {
      const b = new Build();
      b.add(P.sphere(0.16, 10, 6), 0xff7a2a, { s: [0.7, 0.85, 1.6], unlit: 0.18, cf: (x, y, z) => (y > 0.05 && z > -0.05 && z < 0.12 ? 0xffffff : undefined) });
      b.add(petalGeo(0.22, 0.24, 0.02, 2), 0xff9a4a, { p: [0, 0, -0.22], r: [0, Math.PI / 2, 0], order: 'YXZ', s: [1, 1, 1] });
      b.add(petalGeo(0.14, 0.1, 0.01, 2), 0xffb070, { p: [0, 0.12, 0.0], r: [Math.PI / 2, -Math.PI / 2, 0], order: 'YXZ' });
      for (const s of [-1, 1]) b.add(P.sphere(0.028, 6, 4), 0x1a1a24, { p: [s * 0.08, 0.04, 0.17] });
      const tail = new THREE.Mesh(b.build(), toonMat({ vc: true, rim: 0.7, gloss: 0.6 }));
      tail.visible = false;
      this.fish = { m: tail, t: -1, wait: 3 + rnd() * 4, a: new THREE.Vector3(), b: new THREE.Vector3(), yaw: 0 };
      this.group.add(tail);
    }
    this.leafT = 1; this.nearT = 0; this.near = [];
  }
  treeTop(t) { return height(t.x, t.z) + (t.kind === 'birch' ? 7.4 : 6.5) * t.s + 0.12; }
  // Bäume in der Nähe (für Vögel/Blätter), alle 1 s neu
  nearTrees(focus) {
    this.near.length = 0;
    for (const t of this.trees) if ((t.x - focus.x) ** 2 + (t.z - focus.z) ** 2 < 55 * 55) this.near.push(t);
  }
  sfx(name, pos, gain = 1, rate = 1) {
    const F = this.fx; if (!F.audio) return;
    F.audio.sfx(name, F.pan ? F.pan(pos) : 0, { gain, rate });
  }
  emit(pos, colors, shape, size, life, grav, drag, speed = 0.3, up = 0, spin = 2) {
    const B = this.fx.bursts; if (!B) return;
    const o = EO; o.pos = pos; o.colors = colors; o.shape = shape; o.size = size; o.life = life; o.grav = grav; o.drag = drag; o.speed = speed; o.up = up; o.spin = spin;
    B.emit(o);
  }
  update(dt, t, focus, cam) {
    if ((this.nearT -= dt) <= 0) { this.nearT = 1; this.nearTrees(focus); }
    this.updBirds(dt, t, focus);
    this.updSwarm(dt, t, focus);
    this.updBees(dt, t, focus);
    this.updBugs(dt, t, focus);
    this.updBunnies(dt, t, focus);
    this.updFish(dt, t, focus);
    // Fallende Blätter (Kirschhain: viele Blütenblätter unter den Kronen)
    const cherry = this.def.id === 'kirsch';
    if ((this.leafT -= dt) <= 0 && this.near.length) {
      this.leafT = cherry ? 0.09 : this.def.id === 'abend' ? 4 : 1.6 + Math.random() * 1.5;
      const tr = this.near[(Math.random() * this.near.length) | 0];
      const a = Math.random() * 6.28, r = Math.random() * 2.4 * tr.s;
      _v.set(tr.x + Math.cos(a) * r, height(tr.x, tr.z) + (3.4 + Math.random() * 1.6) * tr.s, tr.z + Math.sin(a) * r);
      this.emit(_v, cherry ? PETAL : LEAF, 2, cherry ? 0.24 : 0.3, cherry ? 5 : 7, -0.3, 2.4, 0.4, 0, 3);
    }
  }
  updBirds(dt, t, focus) {
    if (!this.birds.length) return;
    this.birds.forEach((B, i) => {
      if (B.fly) {
        B.u += dt / B.dur;
        const u = Math.min(1, B.u), e = u * u * (3 - 2 * u);
        _v.lerpVectors(B.from, B.to, e); _v.y += Math.sin(Math.PI * u) * (3 + B.dur * 0.4);
        B.vel.subVectors(_v, B.pos).divideScalar(Math.max(dt, 1e-4));
        B.pos.copy(_v);
        // Blick = Flugrichtung: Gier aus der (waagerechten) Zielrichtung, Neigung aus der Bahn
        _w.subVectors(B.to, B.from); B.yaw = Math.atan2(_w.x, _w.z);
        if (B.vel.lengthSq() > 0.01) B.pitch = -Math.atan2(B.vel.y, Math.max(0.5, Math.hypot(B.vel.x, B.vel.z))) * 0.6;
        if (u >= 1) { B.fly = false; B.wait = 2 + Math.random() * 5; if (B.pos.distanceToSquared(focus) < 45 * 45) this.chirp(B.pos, 0.9); }
      } else {
        B.wait -= dt;
        if ((B.chirpT -= dt) <= 0) { B.chirpT = 3 + Math.random() * 5; if (B.pos.distanceToSquared(focus) < 35 * 35) this.chirp(B.pos, 0.6); }
        if (B.wait <= 0) {
          // nächster Baum in Spielernähe (sonst irgendeiner)
          const list = this.near.length > 1 ? this.near : this.trees;
          let tgt = list[(Math.random() * list.length) | 0];
          if (!tgt) return;
          B.from.copy(B.pos); B.to.set(tgt.x, this.treeTop(tgt), tgt.z);
          const d = B.from.distanceTo(B.to);
          if (d < 4) { B.wait = 1; return; }
          B.dur = THREE.MathUtils.clamp(d / 7.5, 1.5, 9); B.u = 0; B.fly = true;
        }
      }
      if (!B.fly) B.pitch *= Math.max(0, 1 - dt * 6);
      _o.position.copy(B.pos); _o.position.y += B.fly ? 0 : Math.abs(Math.sin(t * 3 + i)) * 0.02;
      _o.rotation.set(B.pitch, B.yaw, 0, 'YXZ'); _o.scale.setScalar(1.25); _o.updateMatrix();
      this.birdBody.setMatrixAt(i, _o.matrix);
      _o.scale.set(B.fly ? 1.25 : 0.35, 1.25, B.fly ? 1.25 : 0.9); _o.updateMatrix(); // sitzend: Flügel angelegt
      this.birdWing.setMatrixAt(i, _o.matrix);
    });
    this.birdBody.instanceMatrix.needsUpdate = true; this.birdWing.instanceMatrix.needsUpdate = true;
  }
  chirp(pos, gain) {
    const F = this.fx, A = F.audio;
    if (!A || !A.bufs || !A.bufs.amb || !A.bufs.amb.bird) return;
    const list = A.bufs.amb.bird;
    A.play(list[(Math.random() * list.length) | 0], { gain: 0.13 * gain, rate: 1.0 + Math.random() * 0.2, pan: F.pan ? F.pan(pos) : 0, bus: 'amb' });
  }
  // Blumenfleck in Spielernähe (vor dem Spieler) für Schwarm/Bienen/Häschen
  spotNear(focus, out, minR = 10, maxR = 30) {
    const fl = this.flowerPts;
    for (let k = 0; k < 24; k++) {
      const q = fl.length ? fl[(Math.random() * fl.length) | 0] : null;
      if (!q) break;
      const d2 = (q.x - focus.x) ** 2 + (q.z - focus.z) ** 2;
      if (d2 > minR * minR && d2 < maxR * maxR) return out.set(q.x, q.y, q.z);
    }
    const a = Math.random() * 6.28, r = minR + Math.random() * (maxR - minR);
    out.set(focus.x + Math.cos(a) * r, 0, focus.z + Math.sin(a) * r); out.y = height(out.x, out.z);
    return out;
  }
  inPond(x, z) { const P0 = this.P0; return P0[2] > 1 && Math.hypot(x - P0[0], z - P0[1]) < P0[2] * 1.1; }
  updSwarm(dt, t, focus) {
    const C = this.swC;
    for (let k = 0; k < 2; k++) if (!this.swCInit || C[k].distanceToSquared(focus) > 60 * 60) { for (let j = 0; j < 8; j++) { this.spotNear(focus, C[k], 12, 32); if (!this.inPond(C[k].x, C[k].z)) break; } }
    this.swCInit = true;
    this.swarm.forEach((S, i) => {
      const c = C[S.grp], ph = S.ph + t;
      const x = c.x + Math.sin(ph * S.fa) * S.a, z = c.z + Math.sin(ph * S.fb + 1.3) * S.b;
      const y = Math.max(height(x, z), this.P0[2] > 1 ? 0.2 : -99) + S.h + Math.sin(ph * 1.7) * 0.35;
      const vx = Math.cos(ph * S.fa) * S.fa * S.a, vz = Math.cos(ph * S.fb + 1.3) * S.fb * S.b;
      S.pos.set(x, y, z);
      S.yaw += angDiff(Math.atan2(vx, vz) - S.yaw) * Math.min(1, dt * 6);
      _o.position.copy(S.pos); _o.rotation.set(0.15, S.yaw, Math.sin(ph * 2) * 0.2, 'YXZ'); _o.scale.setScalar(1.3); _o.updateMatrix();
      this.swBody.setMatrixAt(i, _o.matrix); this.swWing.setMatrixAt(i, _o.matrix);
    });
    this.swBody.instanceMatrix.needsUpdate = true; this.swWing.instanceMatrix.needsUpdate = true;
  }
  updBees(dt, t, focus) {
    if (!this.bees.length) return;
    let nearest = 1e9, np = null;
    this.bees.forEach((B, i) => {
      if (B.pos.distanceToSquared(focus) > 50 * 50 && !B.sit) { this.spotNear(focus, B.pos, 8, 25); B.pos.y += 0.6; B.u = 1; B.wait = 0; }
      if (B.u < 1) {
        B.u += dt / B.dur;
        const u = Math.min(1, B.u), e = u * u * (3 - 2 * u);
        _v.lerpVectors(B.from, B.to, e); _v.y += Math.sin(Math.PI * u) * 0.8 + Math.sin(t * 9 + B.ph) * 0.05;
        _w.subVectors(B.to, B.from);
        B.yaw += angDiff(Math.atan2(_w.x, _w.z) + Math.sin(t * 4 + B.ph) * 0.25 - B.yaw) * Math.min(1, dt * 10);
        B.pos.copy(_v); B.sit = false;
        if (u >= 1) { B.wait = 1.4 + Math.random() * 2; B.sit = true; }
      } else {
        B.wait -= dt;
        if (B.wait <= 0) {
          const f = this.flowerPts; let q = null;
          for (let k = 0; k < 12; k++) { const c = f[(Math.random() * f.length) | 0]; if (c && (c.x - B.pos.x) ** 2 + (c.z - B.pos.z) ** 2 < 14 * 14 && (c.x - B.pos.x) ** 2 + (c.z - B.pos.z) ** 2 > 2) { q = c; break; } }
          if (!q) { this.spotNear(B.pos, _w, 3, 10); q = _w; }
          B.from.copy(B.pos); B.to.set(q.x, (q.y || height(q.x, q.z)) + 0.42 * (q.s || 2), q.z);
          B.dur = Math.max(0.8, B.from.distanceTo(B.to) / 2.6); B.u = 0; B.sit = false;
          B.yaw = Math.atan2(B.to.x - B.from.x, B.to.z - B.from.z);
        }
      }
      const d2 = B.pos.distanceToSquared(focus); if (d2 < nearest) { nearest = d2; np = B.pos; }
      _o.position.copy(B.pos); _o.position.y += B.sit ? Math.sin(t * 5 + B.ph) * 0.01 : 0;
      _o.rotation.set(B.sit ? 0.2 : 0.05, B.yaw, 0, 'YXZ'); _o.scale.setScalar(1.3); _o.updateMatrix();
      this.beeBody.setMatrixAt(i, _o.matrix);
      _o.position.y += 0.1; _o.updateMatrix(); this.beeWing.setMatrixAt(i, _o.matrix);
    });
    this.beeBody.instanceMatrix.needsUpdate = true; this.beeWing.instanceMatrix.needsUpdate = true;
    // leises Summen, wenn man einer Biene nahe kommt (kein Dauer-Loop, höchstens alle ~3 s)
    this.humT -= dt;
    if (np && nearest < 36 && this.humT <= 0) { this.humT = 3 + Math.random() * 2; this.sfx('summ', np, 0.9 - Math.sqrt(nearest) / 10, 0.95 + Math.random() * 0.1); }
  }
  updBugs(dt, t, focus) {
    if ((this.bugT -= dt) <= 0) {
      this.bugT = 4;
      // drei Büsche nahe beim Spieler (falls weit weg)
      const bp = this.bushPts;
      if (bp.length) this.bugs.forEach((G, i) => {
        if (G.bush && (G.bush.x - focus.x) ** 2 + (G.bush.z - focus.z) ** 2 < 45 * 45) return;
        let best = null, bd = 1e9;
        for (const b of bp) { const d = (b.x - focus.x) ** 2 + (b.z - focus.z) ** 2; if (d < bd && !this.bugs.some(o => o !== G && o.bush === b)) { bd = d; best = b; } }
        G.bush = best;
      });
    }
    this.bugs.forEach((G, i) => {
      const b = G.bush;
      if (!b) { _o.scale.setScalar(0.0001); _o.updateMatrix(); this.bugMesh.setMatrixAt(i, _o.matrix); return; }
      G.a += G.sp * dt;
      const r = G.r * b.s;
      // Kuppel: auf der Oberfläche der oberen Busch-Kugel entlang
      const rr = Math.min(r, 0.95 * b.s), yy = Math.sqrt(Math.max(0, (1.0 * b.s) ** 2 - rr * rr));
      _o.position.set(b.x + Math.cos(G.a) * rr, b.y + 0.7 * b.s + yy + 0.02, b.z + Math.sin(G.a) * rr);
      _o.rotation.set(0, Math.atan2(-Math.sin(G.a) * Math.sign(G.sp), Math.cos(G.a) * Math.sign(G.sp)), 0); // Blick = Kriechrichtung
      _o.scale.setScalar(1.7); _o.updateMatrix();
      this.bugMesh.setMatrixAt(i, _o.matrix);
    });
    this.bugMesh.instanceMatrix.needsUpdate = true;
  }
  updBunnies(dt, t, focus) {
    this.bunnies.forEach((B, i) => {
      if (B.pos.distanceToSquared(focus) > 70 * 70) { for (let k = 0; k < 8; k++) { this.spotNear(focus, B.pos, 18, 40); if (!this.inPond(B.pos.x, B.pos.z)) break; } B.run = 0; }
      const dx = B.pos.x - focus.x, dz = B.pos.z - focus.z, dh = Math.hypot(dx, dz);
      const gy = height(B.pos.x, B.pos.z);
      if (B.run <= 0 && dh < 5.5 && focus.y - gy < 4) { B.run = 1.8; B.dir = Math.atan2(dx, dz); this.sfx('pick', B.pos, 0.35, 1.5); }
      if (B.run > 0) {
        B.run -= dt;
        B.yaw += angDiff(B.dir - B.yaw) * Math.min(1, dt * 10);
        const nx = B.pos.x + Math.sin(B.yaw) * 5.2 * dt, nz = B.pos.z + Math.cos(B.yaw) * 5.2 * dt;
        if (!this.inPond(nx, nz)) { B.pos.x = nx; B.pos.z = nz; } else B.dir += 1.5;
        if (B.hop <= 0.001) B.hopV = 3.4;
      } else if ((B.idleT -= dt) <= 0) { B.idleT = 1.5 + Math.random() * 3; B.yaw += (Math.random() - 0.5) * 1.6; if (B.hop <= 0.001) B.hopV = 2.2; }
      B.hopV -= 14 * dt; B.hop = Math.max(0, B.hop + B.hopV * dt); if (B.hop <= 0 && B.hopV < 0) B.hopV = 0;
      B.pos.y = height(B.pos.x, B.pos.z);
      // v2.4: Kopf schaut zum Spieler (bevor es flieht), Hinterläufe strecken beim Hoppeln, Blinzeln, Ohrenzucken
      const look = B.run <= 0 && dh < 14 && focus.y - gy < 8;
      const hyT = look ? THREE.MathUtils.clamp(angDiff(Math.atan2(-dx, -dz) - B.yaw), -1.05, 1.05) : 0;
      const hpT = look ? THREE.MathUtils.clamp(Math.atan2(focus.y - gy - 0.6, Math.max(0.5, dh)), -0.2, 0.55) : 0;
      B.hy += (hyT - B.hy) * Math.min(1, dt * 6); B.hp += (hpT - B.hp) * Math.min(1, dt * 5);
      if ((B.blinkT -= dt) <= 0) { B.blinkT = 2 + Math.random() * 3.5; B.blink = 0.14; }
      B.blink = Math.max(0, B.blink - dt);
      if ((B.earT -= dt) <= 0) { B.earT = 1.5 + Math.random() * 3; B.earU = 0; }
      B.earU = Math.min(1, B.earU + dt / 0.3);
      const a1 = this.bunMesh.geometry.attributes.aAnim.array, a2 = this.bunMesh.geometry.attributes.aAnim2.array, i4 = i * 4;
      a1[i4] = B.hop > 0.001 ? Math.PI * 0.5 + Math.min(1.4, B.hop * 6) : 0; a1[i4 + 1] = B.hop > 0.001 ? 0.7 : 0; a1[i4 + 2] = B.hy; a1[i4 + 3] = B.hp;
      a2[i4] = B.blink > 0 ? Math.sin(Math.PI * B.blink / 0.14) : 0; a2[i4 + 1] = Math.sin(Math.PI * B.earU) * 0.55 + (B.run > 0 ? -0.3 : 0); a2[i4 + 2] = Math.sin(t * 5 + i) * 0.2; a2[i4 + 3] = 0;
      const sq = B.hopV > 0 ? 0.1 : 0;
      _o.position.set(B.pos.x, B.pos.y + B.hop, B.pos.z); _o.rotation.set(B.hopV > 0 ? -0.2 : 0, B.yaw, 0, 'YXZ');
      _o.scale.set(0.75 * (1 - sq * 0.5), 0.75 * (1 + sq + Math.sin(t * 2 + i) * 0.015), 0.75 * (1 - sq * 0.5)); _o.updateMatrix();
      this.bunMesh.setMatrixAt(i, _o.matrix);
      const r = this.bunShadowR * 0.75 * (1 - Math.min(0.45, B.hop * 0.8));
      _o.position.set(B.pos.x, B.pos.y + 0.04, B.pos.z); _o.rotation.set(0, B.yaw, 0); _o.scale.set(r, 1, r * 1.15); _o.updateMatrix();
      this.bunShadow.setMatrixAt(i, _o.matrix);
    });
    this.bunMesh.instanceMatrix.needsUpdate = true; this.bunShadow.instanceMatrix.needsUpdate = true;
    this.bunMesh.geometry.attributes.aAnim.needsUpdate = true; this.bunMesh.geometry.attributes.aAnim2.needsUpdate = true;
  }
  updFish(dt, t, focus) {
    const F = this.fish; if (!F) return;
    const P0 = this.P0, rip = this.world.pond && this.world.pond.userData.ripple;
    if (F.t < 0) {
      if ((F.wait -= dt) > 0) return;
      // Sprung möglichst im Blickfeld des Spielers
      let x, z;
      for (let k = 0; k < 10; k++) { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * P0[2] * 0.6; x = P0[0] + Math.cos(a) * r; z = P0[1] + Math.sin(a) * r; if ((x - focus.x) ** 2 + (z - focus.z) ** 2 < 30 * 30) break; }
      F.yaw = Math.random() * 6.28;
      F.a.set(x, -0.2, z); F.b.set(x + Math.sin(F.yaw) * 2.2, -0.2, z + Math.cos(F.yaw) * 2.2);
      F.t = 0; F.m.visible = true;
      this.splash(F.a, rip, focus, 0.9);
    }
    F.t += dt / 1.15;
    const u = Math.min(1, F.t);
    _v.lerpVectors(F.a, F.b, u); _v.y = -0.2 + Math.sin(Math.PI * u) * 1.5;
    F.m.position.copy(_v);
    F.m.rotation.set(-Math.cos(Math.PI * u) * 1.0, F.yaw, Math.sin(t * 20) * 0.1, 'YXZ');
    F.m.scale.setScalar(1.4);
    if (u >= 1) { F.t = -1; F.m.visible = false; F.wait = 5 + Math.random() * 6; this.splash(F.b, rip, focus, 1); }
  }
  splash(p, rip, focus, k) {
    if (rip) rip(p.x, p.z, 1.1 * k);
    _w.set(p.x, 0.15, p.z);
    this.emit(_w, SPLASH, 0, 0.26, 0.8, -7, 0.4, 2.2, 2.6, 0);
    this.emit(_w, SPLASH, 0, 0.2, 0.7, -7, 0.4, 1.6, 3.2, 0);
    const d = Math.sqrt((p.x - focus.x) ** 2 + (p.z - focus.z) ** 2);
    if (d < 45) this.sfx('platsch', p, THREE.MathUtils.clamp(1.1 - d / 45, 0.2, 1) * k, 0.95 + Math.random() * 0.1);
  }
}
