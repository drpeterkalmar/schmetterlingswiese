// NPCs: Luft-Freunde (Falter, Marienkäfer), Tierbabys (Bär, Capybara, Häschen, Entchen), freche Wespen
import * as THREE from 'three';
import { toonMat, blobShadowMat } from '../engine/gfx.js';
import { Build, P, petalGeo } from '../engine/geo.js';
import { wingMask } from '../engine/textures.js';
import { face, surf } from './characters.js';
import { height } from '../world/terrain.js';

const _o = new THREE.Object3D();
const _c = new THREE.Color();
const _v = new THREE.Vector3();
const angDiff = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const HEARTS = [0xff5f9a, 0xff8fbf, 0xff3f7a];

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

// ---------------------------------------------------------------- Tierbabys (v2.4: mehr Form + Rig im Shader)
// Ein Mesh je Art (1 Draw-Call), gemeinsames Material. Jeder Vertex kennt sein Gelenk + Teil (Attribut `rig`), jede Instanz
// ihre Bewegung (aAnim/aAnim2): Beine im Gang-Zyklus, Kopf dreht zum Spieler, Blinzeln, Ohrenzucken, Schwanzwedeln,
// Freuden-Augen. Siehe toonMat({ rig: true }) in gfx.js.
const RIGP = { body: 0, head: 1, eye: 2, ear: 3, leg: 4, tail: 5, wing: 6, joy: 7 };
const sst = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// Farbverläufe über lokale Kugel-Koordinaten (r = Radius der Grundform)
const belly = (col, r, k = 1, zf = 0.2) => (x, y, z) => [col, k * sst(zf, 0.75, z / r) * sst(0.55, -0.35, y / r)];
const topLight = (col, r, k = 0.35) => (x, y, z) => [col, k * sst(-0.1, 1, y / r)];
const underDark = (col, r, k = 0.35) => (x, y, z) => [col, k * sst(0.1, -0.9, y / r)];
// stumpfe Kugel (Capybara-Schnauze): Kugel, vorne und unten abgeflacht → kantig-weich statt Kiste
function bluntSphere(r, seg, front = 0.55, bottom = 0.6) {
  const g = new THREE.SphereGeometry(r, seg[0], seg[1]), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let z = p.getZ(i), y = p.getY(i);
    if (z > front * r) z = front * r + (z - front * r) * 0.25;
    if (y < -bottom * r) y = -bottom * r + (y + bottom * r) * 0.3;
    p.setZ(i, z); p.setY(i, y);
  }
  g.computeVertexNormals();
  return g;
}
// Pfote mit Ballen: Pfote (Kugel, unten flach) + Hauptballen + 3 Zehenballen vorne
function paw(b, x, y, z, r, fur, pad, S, back = false) {
  b.add(P.sphere(r, ...S(10, 7)), fur, { p: [x, y, z], s: [1, 0.72, 1.2] });
  const fz = back ? -1 : 1;
  b.add(P.sphere(r * 0.42, ...S(8, 5)), pad, { p: [x, y - r * 0.28, z + fz * r * 0.72], s: [1.1, 0.7, 0.6], unlit: 0.15 });
  for (let k = -1; k <= 1; k++) b.add(P.sphere(r * 0.2, ...S(6, 4)), pad, { p: [x + k * r * 0.42, y - r * 0.05, z + fz * r * 1.08], s: [1, 0.9, 0.6], unlit: 0.15 });
}
const eyeAt = (hc, r, o) => { const eyeR = r * (o.eye ?? 0.4); return surf(hc, r, [o.sep ?? 0.42, o.up ?? 0.18, 1], 1 - eyeR / r * 0.45); };

// Geometrie je Art (lod: sparsame Fassung fürs Wildhäschen). Liefert { geo, neck, shadow (Radius) }
export function animalGeo(kind, sleepy, lod = false) {
  const lo = lod ? 0.6 : 1, S = (a, c) => [Math.max(5, Math.round(a * lo)), Math.max(4, Math.round(c * lo))];
  const b = new Build(); b.rig = [0, 0, 0, RIGP.body];
  const hB = new Build(), eB = new Build(), jB = new Build(), dummy = new Build();
  let neck = [0, 0.7, 0.1], shadow = 0.55;
  const head = (hc, r, o) => {
    const e = eyeAt(hc, r, o);
    hB.rig = [...neck, RIGP.head]; eB.rig = [0, e[1], e[2], RIGP.eye]; jB.rig = [0, e[1], e[2], RIGP.joy];
    if (sleepy) face(hB, dummy, hB, hc, r, { ...o, lod: lod ? 1 : 0 }); else face(hB, eB, jB, hc, r, { ...o, lod: lod ? 1 : 0 });
  };
  const subs = [], sub = (pivot, code) => { const sb = new Build(); sb.rig = [...pivot, code]; subs.push(sb); return sb; };
  const leg = (pivot, ph) => sub(pivot, RIGP.leg + ph);
  const ear = (pivot, side) => sub(pivot, RIGP.ear + (side > 0 ? 0.5 : 0));
  const partB = sub;
  if (kind === 'baer') {
    const fur = 0xa0703f, light = 0xe7c79c, dark = 0x6a4424, pad = 0xf0a0a8, hi = 0xc08a55;
    neck = [0, 0.8, 0.12]; shadow = 0.62;
    b.add(P.sphere(0.46, ...S(14, 10)), fur, { p: [0, 0.5, -0.05], s: [1, 0.95, 1.1], mix: [topLight(hi, 0.46), underDark(dark, 0.46, 0.3)] });
    b.add(P.sphere(0.3, ...S(12, 8)), light, { p: [0, 0.46, 0.25], s: [1, 1.12, 0.6], mix: topLight(0xf6e2c4, 0.3, 0.5) }); // Bauchfell
    const hc = [0, 1.0, 0.2];
    hB.rig = [...neck, RIGP.head];
    hB.add(P.sphere(0.4, ...S(16, 12)), fur, { p: hc, mix: [topLight(hi, 0.4, 0.45), underDark(dark, 0.4, 0.2)] });
    // Schnauze + Nase mit Glanzpunkt + Mündchen
    hB.add(P.sphere(0.17, ...S(12, 8)), light, { p: [0, 0.9, 0.53], s: [1.15, 0.82, 0.75], mix: topLight(0xfaeedd, 0.17, 0.4) });
    hB.add(P.sphere(0.062, ...S(10, 6)), 0x2a1a14, { p: [0, 0.955, 0.65], s: [1.3, 0.85, 0.8] });
    hB.add(P.sphere(0.018, 6, 4), 0xffffff, { p: [-0.02, 0.975, 0.695], unlit: 1 });
    for (const s of [-1, 1]) hB.add(P.torus(0.03, 0.009, 4, 8, Math.PI), 0x5a2a20, { p: [s * 0.028, 0.875, 0.645], r: [-0.3, 0, Math.PI] });
    for (const s of [-1, 1]) {
      const eb = ear([s * 0.24, 1.22, 0.12], s);
      eb.add(P.sphere(0.14, ...S(10, 8)), fur, { p: [s * 0.3, 1.33, 0.1], s: [1, 1, 0.7] });
      eb.add(P.sphere(0.085, ...S(8, 6)), pad, { p: [s * 0.3, 1.33, 0.17], s: [1, 1, 0.4], unlit: 0.15 });
      // Beine: vorne unter der Brust, hinten dicke Keulen mit Sohlen-Ballen
      paw(leg([s * 0.23, 0.36, 0.2], s > 0 ? 0.5 : 0), s * 0.23, 0.11, 0.24, 0.13, dark, pad, S);
      const bl = leg([s * 0.26, 0.34, -0.28], s > 0 ? 0 : 0.5);
      bl.add(P.sphere(0.16, ...S(10, 8)), fur, { p: [s * 0.26, 0.24, -0.26], s: [0.9, 1, 1.1] });
      paw(bl, s * 0.26, 0.1, -0.2, 0.14, dark, pad, S);
      // Ärmchen seitlich am Bauch
      b.add(P.sphere(0.12, ...S(10, 8)), fur, { p: [s * 0.4, 0.58, 0.18], s: [0.8, 1.2, 0.85], r: [0.3, 0, s * 0.25] });
    }
    partB([0, 0.42, -0.5], RIGP.tail).add(P.sphere(0.09, ...S(8, 6)), light, { p: [0, 0.42, -0.56] });
    head(hc, 0.4, { eye: 0.26, sep: 0.4, up: 0.28, iris: 0x2a1a14, cheek: 0xff9aa8, mouth: false });
  } else if (kind === 'capy') {
    const fur = 0xb9814c, dark = 0x8a5a32, light = 0xd9a878, nose = 0x3a2416;
    neck = [0, 0.72, 0.3]; shadow = 0.72;
    b.add(P.sphere(0.45, ...S(14, 10)), fur, { p: [0, 0.52, -0.1], s: [0.95, 0.85, 1.4], mix: [topLight(0xc99562, 0.45, 0.5), belly(light, 0.45, 0.6, -0.4), underDark(dark, 0.45, 0.25)] });
    const hc = [0, 0.8, 0.5];
    hB.rig = [...neck, RIGP.head];
    hB.add(P.sphere(0.3, ...S(14, 10)), fur, { p: hc, s: [0.9, 0.9, 1.2], mix: topLight(0xcf9c68, 0.3, 0.4) });
    // kantige Schnauze (abgerundeter Quader) + breite Nase mit Nasenlöchern + Mündchen
    // (erst 0,36 × 0,30 dunkel: wirkte von vorn wie ein Maulkorb vor den Augen → kleiner, heller, tiefer)
    hB.add(bluntSphere(0.17, S(16, 12)), 0xa46e40, { p: [0, 0.7, 0.75], s: [1.0, 0.72, 1.0], mix: [topLight(fur, 0.17, 0.6), underDark(dark, 0.17, 0.4)] });
    hB.add(P.sphere(0.058, ...S(12, 8)), nose, { p: [0, 0.745, 0.842], s: [1.35, 0.6, 0.5] });
    for (const s of [-1, 1]) {
      hB.add(P.sphere(0.018, 8, 6), 0x140a04, { p: [s * 0.04, 0.748, 0.872], s: [1, 0.75, 0.5] });
      hB.add(P.torus(0.022, 0.007, 4, 10, Math.PI), 0x4a2a18, { p: [s * 0.022, 0.655, 0.845], r: [-0.2, 0, Math.PI] });
    }
    for (const s of [-1, 1]) {
      const eb = ear([s * 0.18, 1.0, 0.36], s);
      eb.add(P.sphere(0.075, ...S(8, 6)), dark, { p: [s * 0.2, 1.05, 0.36], s: [1, 0.9, 0.6] });
      eb.add(P.sphere(0.045, 6, 4), 0xc88a70, { p: [s * 0.2, 1.05, 0.39], s: [1, 0.9, 0.3] });
      paw(leg([s * 0.24, 0.3, 0.32], s > 0 ? 0.5 : 0), s * 0.24, 0.09, 0.34, 0.11, dark, 0x5a3a22, S);
      const bl = leg([s * 0.26, 0.34, -0.5], s > 0 ? 0 : 0.5);
      bl.add(P.sphere(0.15, ...S(10, 8)), fur, { p: [s * 0.25, 0.24, -0.5], s: [0.9, 1, 1.15] });
      paw(bl, s * 0.25, 0.08, -0.44, 0.12, dark, 0x5a3a22, S);
    }
    partB([0, 0.5, -0.68], RIGP.tail).add(P.sphere(0.06, 6, 4), dark, { p: [0, 0.5, -0.72] });
    // kleine, entspannte Augen (eigene Form) + Wangen
    const e = [0, 0.9, 0.62];
    for (const s of [-1, 1]) {
      const ep = surf(hc, 0.3, [s * 0.65, 0.35, 0.65], 0.95);
      e[1] = ep[1]; e[2] = ep[2];
      if (sleepy) hB.add(P.torus(0.04, 0.012, 4, 8, Math.PI), 0x2a1a10, { p: ep, r: [0, s * 0.8, Math.PI] });
      else {
        eB.rig = [0, ep[1], ep[2], RIGP.eye]; jB.rig = [0, ep[1], ep[2], RIGP.joy];
        eB.add(P.sphere(0.055, 8, 6), 0x2a1a10, { p: ep }); eB.add(P.sphere(0.018, 6, 4), 0xffffff, { p: [ep[0] - 0.01, ep[1] + 0.025, ep[2] + 0.035], unlit: 1 });
        jB.add(P.torus(0.04, 0.012, 4, 8, Math.PI), 0x2a1a10, { p: ep, r: [0, s * 0.8, 0] });
      }
      hB.add(P.sphere(0.05, 8, 6), 0xff9a9a, { p: surf(hc, 0.3, [s * 0.7, -0.15, 0.7], 0.98), s: [1, 0.6, 0.5], unlit: 0.3 });
    }
    // Yuzu auf dem Kopf!
    hB.add(P.sphere(0.12, ...S(12, 10)), 0xffa726, { p: [0, 1.14, 0.45], mix: topLight(0xffd070, 0.12, 0.5) });
    hB.add(petalGeo(0.1, 0.06, 0.01, 2), 0x4f9a3a, { p: [0, 1.25, 0.45], r: [0, 0.5, 0.4], order: 'YXZ' });
  } else if (kind === 'hase') {
    const fur = lod ? 0xf1e6dc : 0xf4eee8, pink = 0xffb6c8, shade = 0xd8c8c0, white = 0xffffff;
    neck = [0, 0.6, 0.1]; shadow = 0.5;
    b.add(P.sphere(0.36, ...S(12, 9)), fur, { p: [0, 0.4, -0.05], s: [1, 1, 1.1], mix: [belly(white, 0.36, 0.9, 0), underDark(shade, 0.36, 0.3)] });
    const hc = [0, 0.84, 0.14];
    hB.rig = [...neck, RIGP.head];
    hB.add(P.sphere(0.32, ...S(14, 10)), fur, { p: hc, mix: underDark(shade, 0.32, 0.2) });
    // Schnäuzchen: zwei weiße Pausbäckchen, rosa Näschen, Zähnchen
    for (const s of [-1, 1]) hB.add(P.sphere(0.08, ...S(8, 6)), white, { p: [s * 0.065, 0.75, 0.42], s: [1, 0.85, 0.8] });
    hB.add(P.sphere(0.042, ...S(8, 6)), pink, { p: [0, 0.8, 0.46], s: [1.2, 0.85, 0.8], unlit: 0.1 });
    if (!lod) hB.add(P.box(0.05, 0.045, 0.02), white, { p: [0, 0.695, 0.45], unlit: 0.3 });
    for (const s of [-1, 1]) {
      const eb = ear([s * 0.12, 1.06, 0.08], s);
      eb.add(P.sphere(0.1, ...S(10, 8)), fur, { p: [s * 0.13, 1.3, 0.05], s: [0.8, 2.6, 0.5], r: [0, 0, -s * 0.18] });
      eb.add(P.sphere(0.06, ...S(8, 6)), pink, { p: [s * 0.135, 1.3, 0.095], s: [0.7, 2.5, 0.3], r: [0, 0, -s * 0.18], unlit: 0.1 });
      paw(leg([s * 0.14, 0.26, 0.2], 0.5), s * 0.14, 0.07, 0.24, 0.085, fur, pink, S);
      // Hinterläufe: lange Füße mit rosa Sohlen (hoppeln gemeinsam)
      const bl = leg([s * 0.2, 0.3, -0.16], 0);
      bl.add(P.sphere(0.15, ...S(10, 8)), fur, { p: [s * 0.21, 0.2, -0.16], s: [0.85, 1, 1.1] });
      bl.add(P.sphere(0.1, ...S(10, 7)), fur, { p: [s * 0.2, 0.06, 0.02], s: [0.95, 0.6, 1.9] });
      bl.add(P.sphere(0.055, 6, 4), pink, { p: [s * 0.2, 0.045, -0.13], s: [1, 0.5, 1.2], unlit: 0.1 });
    }
    partB([0, 0.36, -0.42], RIGP.tail).add(P.sphere(0.12, ...S(8, 6)), white, { p: [0, 0.38, -0.47] });
    head(hc, 0.32, { eye: 0.3, sep: 0.42, up: 0.18, iris: 0x3a2030, cheek: 0xff9ab8, mouth: false });
  } else { // Entchen
    const y = 0xffd84a, yl = 0xfff08a, beak = 0xff9a2a, beakD = 0xf07a1a, feet = 0xff9a2a;
    neck = [0, 0.4, 0.14]; shadow = 0.45;
    b.add(P.sphere(0.3, ...S(16, 12)), y, { p: [0, 0.22, -0.05], s: [1, 0.85, 1.25], mix: [topLight(yl, 0.3, 0.5), underDark(0xf0b830, 0.3, 0.35)] });
    const hc = [0, 0.58, 0.2];
    hB.rig = [...neck, RIGP.head];
    hB.add(P.sphere(0.22, ...S(16, 12)), y, { p: hc, mix: topLight(yl, 0.22, 0.5) });
    // geformter Schnabel: schmaler, langer Oberschnabel mit runder, leicht hochgebogener Spitze + kurzer Unterschnabel
    const ub = P.sphere(0.1, ...S(12, 8)), pp = ub.attributes.position;
    for (let i = 0; i < pp.count; i++) { const z = pp.getZ(i); pp.setY(i, pp.getY(i) + Math.max(0, z) * Math.max(0, z) * 1.6); }
    ub.computeVertexNormals();
    hB.add(ub, beak, { p: [0, 0.535, 0.4], s: [0.82, 0.4, 1.35], mix: topLight(0xffb85a, 0.1, 0.5) });
    hB.add(P.sphere(0.075, ...S(10, 6)), beakD, { p: [0, 0.5, 0.37], s: [0.8, 0.3, 1.15] });
    for (const s of [-1, 1]) hB.add(P.sphere(0.011, 5, 4), 0x8a4010, { p: [s * 0.022, 0.565, 0.47] });
    // Federschopf
    for (const s of [-1, 1]) hB.add(petalGeo(0.12, 0.05, 0.02, 2), y, { p: [0, 0.78, 0.18], r: [0, Math.PI / 2 + s * 0.4, 1.1], order: 'YXZ' });
    for (const s of [-1, 1]) {
      // Flügel (heben beim Freuen)
      const wb = partB([s * 0.27, 0.32, 0.02], RIGP.wing + (s > 0 ? 0.5 : 0));
      wb.add(P.sphere(0.17, ...S(10, 8)), 0xffcc3a, { p: [s * 0.28, 0.24, -0.08], s: [0.35, 0.7, 1.15], r: [-0.25, 0, s * 0.15], mix: topLight(yl, 0.17, 0.4) });
      // Schwimmfüße
      const lb = leg([s * 0.1, 0.1, 0], s > 0 ? 0.5 : 0);
      lb.add(P.cyl(0.025, 0.025, 0.1, 5), feet, { p: [s * 0.1, 0.05, 0] });
      lb.add(P.sphere(0.07, ...S(8, 5)), feet, { p: [s * 0.1, 0.01, 0.06], s: [1, 0.25, 1.3] });
    }
    // Schwanzfedern (hochgestellt)
    for (let k = -1; k <= 1; k++) b.add(petalGeo(0.16, 0.07, 0.02, 2), k ? 0xffc830 : y, { p: [k * 0.04, 0.3, -0.36], r: [0, -Math.PI / 2 + k * 0.35, 0.7], order: 'YXZ' });
    head(hc, 0.22, { eye: 0.3, sep: 0.42, up: 0.25, iris: 0x2a1a10, cheek: 0xffa0a0, mouth: false });
  }
  b.take(hB).take(eB).take(jB); subs.forEach(sb => b.take(sb));
  return { geo: b.build(), neck, shadow };
}

const SPEED = { hase: 1.6, ente: 0.9, baer: 0.7, capy: 0.7 };
export class Animals {
  constructor(bursts = null) { this.group = new THREE.Group(); this.list = []; this.meshes = {}; this.bursts = bursts; }
  // specs: [{kind, x, z, home radius}], sleepy: Abendmodus
  setup(specs, rnd, sleepy = false) {
    this.clear();
    const kinds = [...new Set(specs.map(s => s.kind))];
    const mat = toonMat({ vc: true, rim: 0.55, soft: 0.12, rig: true });
    this.mat = mat;
    for (const k of kinds) {
      const n = specs.filter(s => s.kind === k).length;
      const A = animalGeo(k, sleepy), g = A.geo;
      g.setAttribute('aAnim', new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4).setUsage(THREE.DynamicDrawUsage));
      g.setAttribute('aAnim2', new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4).setUsage(THREE.DynamicDrawUsage));
      const nk = new Float32Array(n * 3); for (let i = 0; i < n; i++) nk.set(A.neck, i * 3);
      g.setAttribute('aNeck', new THREE.InstancedBufferAttribute(nk, 3));
      const im = new THREE.InstancedMesh(g, mat, n);
      im.frustumCulled = false; this.meshes[k] = im; this.group.add(im); im.userData.n = 0; im.userData.shadow = A.shadow;
    }
    // weiche Kontaktschatten aller Tiere an Land: 1 Draw-Call
    const nSh = specs.length;
    if (nSh) {
      const sg = new THREE.PlaneGeometry(2, 2); sg.rotateX(-Math.PI / 2);
      this.shadows = new THREE.InstancedMesh(sg, blobShadowMat(0x1a2a10, sleepy ? 0.26 : 0.34), nSh);
      this.shadows.frustumCulled = false; this.shadows.renderOrder = 1; this.group.add(this.shadows);
    }
    let si = 0;
    for (const s of specs) {
      const im = this.meshes[s.kind];
      const a = {
        kind: s.kind, idx: im.userData.n++, home: new THREE.Vector3(s.x, 0, s.z), pos: new THREE.Vector3(s.x, height(s.x, s.z), s.z),
        yaw: rnd() * 6.28, tgt: null, wait: rnd() * 3, hop: 0, hopV: 0, happyT: 0, visited: false, scale: s.scale || (0.9 + rnd() * 0.3),
        roam: s.roam ?? 6, speed: SPEED[s.kind] || 0.8, lookP: 0, sleepy,
        onWater: s.kind === 'ente',
        // v2.4 Bewegung
        si: si++, walkPh: rnd() * 6.28, walkAmp: 0, hy: 0, hp: 0, blinkT: 1 + rnd() * 3, blink: 0, earT: 1 + rnd() * 3, ear: 0, earU: 1, joy: 0, wagPh: rnd() * 6.28,
      };
      this.list.push(a);
    }
    return this.list;
  }
  clear() {
    for (const k in this.meshes) { const m = this.meshes[k]; this.group.remove(m); m.geometry.dispose(); }
    if (this.shadows) { this.group.remove(this.shadows); this.shadows.geometry.dispose(); this.shadows.material.dispose(); this.shadows = null; }
    if (this.mat) this.mat.dispose();
    this.meshes = {}; this.list = [];
  }
  // Besuch/Beere: Freuden-Hüpfer, ^ ^-Augen, Herzchen
  cheer(a) {
    a.happyT = 1.6; a.hopV = 4.2;
    const B = this.bursts;
    if (B) {
      _v.set(a.pos.x, a.pos.y + 1.2 * a.scale, a.pos.z);
      B.emit({ n: 9, pos: _v, colors: HEARTS, shape: 3, size: 0.45, speed: 2.2, up: 2.2, life: 1.4, grav: -0.8, drag: 1.4, spread: 0.5 });
      B.emit({ n: 1, pos: _v, colors: [0xffc0e0], shape: 5, size: 2.2, speed: 0, up: 0, life: 0.4, grav: 0, drag: 0 });
    }
  }
  update(dt, t, player) {
    for (const a of this.list) {
      const dp = player ? _v.subVectors(player, a.pos) : null;
      const dh = dp ? Math.hypot(dp.x, dp.z) : 1e9;
      const near = dp && dh < 8 && dp.y < 7;
      let moving = false;
      if (a.happyT > 0) { a.happyT -= dt; if (a.hop <= 0.001 && a.happyT > 0.3) a.hopV = 3.2; a.yaw += dt * 5; }
      else if (near && !a.sleepy) {
        // Körper dreht nur, wenn der Spieler weit seitlich ist – den Rest macht der Kopf
        const d = angDiff(Math.atan2(dp.x, dp.z) - a.yaw);
        if (Math.abs(d) > 0.8) a.yaw += d * Math.min(1, dt * 1.8);
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
            moving = true;
          }
        }
      }
      a.hopV -= 14 * dt; a.hop = Math.max(0, a.hop + a.hopV * dt); if (a.hop <= 0 && a.hopV < 0) a.hopV = 0;
      const gy = a.onWater ? 0.02 : height(a.pos.x, a.pos.z);
      a.pos.y = gy;
      // Gang-Zyklus: Phase läuft mit der Strecke (Häschen: mit dem Hoppeln), Beinweite blendet weich ein/aus
      const happy = a.happyT > 0;
      if (a.kind === 'hase') { a.walkPh = a.hop > 0.001 ? Math.PI * 0.5 + Math.min(1.4, a.hop * 6) : a.walkPh * 0.9; }
      else a.walkPh += dt * (moving ? a.speed * 9 / a.scale : happy ? 14 : 0);
      const ampT = a.kind === 'hase' ? (a.hop > 0.001 ? 0.7 : 0) : moving ? (a.kind === 'ente' ? 0.7 : 0.5) : happy ? 0.35 : 0;
      a.walkAmp += (ampT - a.walkAmp) * Math.min(1, dt * 8);
      // Kopf zum Spieler (gedeckelt), sonst sanftes Umschauen; schlafend: Kopf leicht gesenkt
      let hyT = 0, hpT = 0;
      if (a.sleepy) { hpT = -0.18 + Math.sin(t * 0.9 + a.si) * 0.05; }
      else if (near && !happy) {
        hyT = THREE.MathUtils.clamp(angDiff(Math.atan2(dp.x, dp.z) - a.yaw), -1.05, 1.05);
        hpT = THREE.MathUtils.clamp(Math.atan2(dp.y - 0.9 * a.scale, Math.max(0.5, dh)), -0.25, 0.6);
      } else if (!moving) { hyT = Math.sin(t * 0.37 + a.si * 1.7) * 0.45; hpT = Math.sin(t * 0.23 + a.si) * 0.1; }
      a.hy += (hyT - a.hy) * Math.min(1, dt * 6); a.hp += (hpT - a.hp) * Math.min(1, dt * 5);
      // Blinzeln (0,14 s), Ohrenzucken (0,3 s), Freude
      if ((a.blinkT -= dt) <= 0) { a.blinkT = 2 + Math.random() * 3.5; a.blink = 0.14; }
      a.blink = Math.max(0, a.blink - dt);
      if ((a.earT -= dt) <= 0) { a.earT = 1.8 + Math.random() * 3.5; a.earU = 0; a.earS = Math.random() < 0.5 ? 1 : 0.6; }
      a.earU = Math.min(1, a.earU + dt / 0.3);
      a.joy += ((happy ? 1 : 0) - a.joy) * Math.min(1, dt * 10);
      const earA = Math.sin(Math.PI * a.earU) * 0.55 * (a.earS || 1) + (happy ? Math.sin(t * 16) * 0.25 : 0);
      a.wagPh += dt * (happy ? 18 : moving ? 9 : 4);
      const wag = a.kind === 'ente' ? (happy ? 0.35 + Math.sin(t * 22) * 0.45 : moving ? Math.sin(t * 6) * 0.06 : 0)
        : Math.sin(a.wagPh) * (happy ? 0.6 : a.kind === 'capy' ? 0.1 : 0.22);
      const im = this.meshes[a.kind], A1 = im.geometry.attributes.aAnim, A2 = im.geometry.attributes.aAnim2, i4 = a.idx * 4;
      A1.array[i4] = a.walkPh; A1.array[i4 + 1] = a.walkAmp; A1.array[i4 + 2] = a.hy; A1.array[i4 + 3] = a.hp;
      A2.array[i4] = a.blink > 0 && !a.sleepy ? Math.sin(Math.PI * a.blink / 0.14) : 0; A2.array[i4 + 1] = earA; A2.array[i4 + 2] = wag; A2.array[i4 + 3] = a.joy;
      const walk = moving && a.kind !== 'hase' ? Math.abs(Math.sin(a.walkPh)) * 0.035 : 0;
      const breathe = Math.sin(t * (a.sleepy ? 1.3 : 2.2) + a.idx) * (a.sleepy ? 0.03 : 0.018);
      const sq = a.hopV > 0 ? 0.12 : (a.hop > 0 ? -0.05 : 0);
      _o.position.set(a.pos.x, gy + a.hop + walk, a.pos.z);
      _o.rotation.set(a.kind === 'hase' && a.hopV > 0 ? -0.12 : 0, a.yaw, moving ? Math.sin(a.walkPh) * 0.04 : 0);
      _o.scale.set(a.scale * (1 - sq * 0.5), a.scale * (1 + sq + breathe), a.scale * (1 - sq * 0.5));
      _o.updateMatrix();
      im.setMatrixAt(a.idx, _o.matrix);
      if (this.shadows) {
        const r = im.userData.shadow * a.scale * (1 - Math.min(0.45, a.hop * 0.8)) * (a.onWater ? 0 : 1);
        _o.position.set(a.pos.x, gy + 0.04, a.pos.z); _o.rotation.set(0, a.yaw, 0); _o.scale.set(r, 1, r * 1.15); _o.updateMatrix();
        this.shadows.setMatrixAt(a.si, _o.matrix);
      }
    }
    for (const k in this.meshes) { const g = this.meshes[k].geometry; this.meshes[k].instanceMatrix.needsUpdate = true; g.attributes.aAnim.needsUpdate = true; g.attributes.aAnim2.needsUpdate = true; }
    if (this.shadows) this.shadows.instanceMatrix.needsUpdate = true;
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
