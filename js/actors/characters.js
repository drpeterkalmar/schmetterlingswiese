// Spielfiguren: Schmetterling, Marienkäfer, Biene, Libelle – große Augen, Wangen, Freude-Animationen
import * as THREE from 'three';
import { toonMat } from '../engine/gfx.js';
import { Build, P, petalGeo } from '../engine/geo.js';
import { wingMask, glassWing } from '../engine/textures.js';

export const CHARACTERS = [
  { id: 'schmetterling', name: 'Schmetterling', emoji: '🦋', stars: 0 },
  { id: 'marienkaefer', name: 'Marienkäfer', emoji: '🐞', stars: 3 },
  { id: 'biene', name: 'Biene', emoji: '🐝', stars: 8 },
  { id: 'libelle', name: 'Libelle', emoji: '🪽', stars: 18 },
];
// Farbvarianten je Figur (a = Hauptfarbe, b = Zweitfarbe, c = Rand/dunkel)
export const COLORS = {
  schmetterling: [
    { name: 'Sonnenorange', a: 0xff9636, b: 0xffd36b, c: 0x3a2418, stars: 0 },
    { name: 'Rosa Traum', a: 0xff7eb6, b: 0xffe0ef, c: 0x6a2a4a, stars: 0 },
    { name: 'Himmelblau', a: 0x3f9dff, b: 0xb0f2ff, c: 0x1c2a5a, stars: 2 },
    { name: 'Flieder', a: 0xa27bff, b: 0xffc6f2, c: 0x3a2260, stars: 5 },
    { name: 'Minze', a: 0x33d0a0, b: 0xefff9e, c: 0x1e4a40, stars: 10 },
    { name: 'Kirschrot', a: 0xff4d6a, b: 0xffc0a8, c: 0x40101a, stars: 14 },
    { name: 'Zitrone', a: 0xffd83a, b: 0xffffff, c: 0x5a4010, stars: 20 },
    { name: 'Sternengold', a: 0xffb52e, b: 0xfff6c0, c: 0x7a4a08, stars: 30 },
  ],
  marienkaefer: [
    { name: 'Klassisch Rot', a: 0xe8303a, c: 0x1c1418, stars: 0 },
    { name: 'Orange', a: 0xff8a2a, c: 0x1c1418, stars: 0 },
    { name: 'Sonnengelb', a: 0xffcf2a, c: 0x1c1418, stars: 4 },
    { name: 'Rosa', a: 0xff7fb0, c: 0x4a1a30, stars: 9 },
    { name: 'Minze', a: 0x4fd6b0, c: 0x10302a, stars: 15 },
    { name: 'Nachtblau', a: 0x4a6aff, c: 0xffffff, stars: 24 },
  ],
  biene: [
    { name: 'Honig', a: 0xffc82e, c: 0x3a2410, stars: 0 },
    { name: 'Zuckerwatte', a: 0xffa8d8, c: 0x6a2a5a, stars: 6 },
    { name: 'Minzbiene', a: 0x7ef0c0, c: 0x1c4a3a, stars: 12 },
    { name: 'Lavendel', a: 0xc8a8ff, c: 0x3a2a6a, stars: 20 },
    { name: 'Goldbiene', a: 0xffe070, c: 0x8a5a10, stars: 32 },
  ],
  libelle: [
    { name: 'Türkis', a: 0x2ad0d0, b: 0x7af0ff, c: 0x0a3a4a, stars: 0 },
    { name: 'Smaragd', a: 0x2ad07a, b: 0xb0ff9a, c: 0x0a3a2a, stars: 22 },
    { name: 'Rubin', a: 0xff4a7a, b: 0xffb0d0, c: 0x4a0a2a, stars: 28 },
  ],
};
// Eigene kleine Icons, wo es kein passendes Emoji gibt (Kranz statt Strauß, Hut statt Person/Gesicht)
const svg = (inner) => `<svg class="ico" viewBox="0 0 48 48" aria-hidden="true">${inner}</svg>`;
const bloom = (x, y, c) => [0, 72, 144, 216, 288].map(a => `<circle cx="${(x + Math.cos(a * Math.PI / 180) * 3.2).toFixed(1)}" cy="${(y + Math.sin(a * Math.PI / 180) * 3.2).toFixed(1)}" r="3" fill="${c}"/>`).join('') + `<circle cx="${x}" cy="${y}" r="2.1" fill="#ffd23f"/>`;
const ICONS = {
  kranz: svg(`<ellipse cx="24" cy="27" rx="17" ry="9" fill="none" stroke="#4f9a3a" stroke-width="4"/>
    <ellipse cx="24" cy="27" rx="17" ry="9" fill="none" stroke="#7cc45a" stroke-width="1.6" stroke-dasharray="3 4"/>
    ${bloom(8, 25, '#ff7eb6')}${bloom(15, 34, '#ffffff')}${bloom(24, 36.5, '#b38cff')}${bloom(33, 34, '#6ec6ff')}${bloom(40, 25, '#ff7eb6')}${bloom(16, 19, '#ffffff')}${bloom(32, 19, '#ffe070')}`),
  party: svg(`<clipPath id="pc"><path d="M24 5 L37 39 Q24 44 11 39 Z"/></clipPath>
    <path d="M24 5 L37 39 Q24 44 11 39 Z" fill="#ff6fb0"/>
    <g clip-path="url(#pc)" fill="#5fd0ff"><rect x="0" y="12" width="48" height="5"/><rect x="0" y="22" width="48" height="5"/><rect x="0" y="32" width="48" height="5"/></g>
    <circle cx="24" cy="6" r="4.5" fill="#ffe04a"/><circle cx="17" cy="30" r="1.6" fill="#fff"/><circle cx="29" cy="20" r="1.6" fill="#fff"/>`),
  zauber: svg(`<ellipse cx="24" cy="39" rx="20" ry="5.5" fill="#6a4ac8"/>
    <path d="M13 38 Q20 22 22 12 Q24 4 33 3 Q28 9 31 20 Q33 30 35 38 Q24 42 13 38 Z" fill="#7a5ae0"/>
    <path d="M14 34 Q24 38 34 34 L35 38 Q24 42 13 38 Z" fill="#ffd23f"/>
    <path d="M24 17 l1.6 3.3 3.6 .5 -2.6 2.5 .6 3.6 -3.2 -1.7 -3.2 1.7 .6 -3.6 -2.6 -2.5 3.6 -.5 Z" fill="#ffe04a"/>`),
};
export const HATS = [
  { id: 'none', name: 'Ohne', emoji: '🚫', stars: 0 },
  { id: 'kranz', name: 'Blumenkranz', emoji: '🌸', icon: ICONS.kranz, stars: 1 },
  { id: 'schleife', name: 'Schleife', emoji: '🎀', stars: 4 },
  { id: 'party', name: 'Partyhut', emoji: '🎉', icon: ICONS.party, stars: 7 },
  { id: 'stroh', name: 'Sonnenhut', emoji: '👒', stars: 11 },
  { id: 'zauber', name: 'Zauberhut', emoji: '🪄', icon: ICONS.zauber, stars: 16 },
  { id: 'krone', name: 'Krone', emoji: '👑', stars: 25 },
  { id: 'heiligenschein', name: 'Sternenkranz', emoji: '⭐', stars: 36 },
];
export const PATTERNS = [
  { id: 'monarch', name: 'Monarch', stars: 0 }, { id: 'verlauf', name: 'Verlauf', stars: 0 },
  { id: 'punkte', name: 'Punkte', stars: 3 }, { id: 'herzen', name: 'Herzen', stars: 6 },
  { id: 'streifen', name: 'Regenbogen-Bögen', stars: 12 }, { id: 'sterne', name: 'Sterne', stars: 18 },
  { id: 'augen', name: 'Pfauenauge', stars: 26 },
];

const _v = new THREE.Vector3();
export function surf(c, r, dir, k = 1) { _v.set(dir[0], dir[1], dir[2]).normalize(); return [c[0] + _v.x * r * k, c[1] + _v.y * r * k, c[2] + _v.z * r * k]; }

// Kugel aus Farbbändern entlang Z (für Streifen)
function bandSphere(b, r, center, scale, bands, o = {}) {
  const tot = bands.length;
  bands.forEach((col, i) => {
    const g = new THREE.SphereGeometry(r, 16, 3, 0, Math.PI * 2, (i / tot) * Math.PI, Math.PI / tot);
    g.rotateX(Math.PI / 2); // Pole auf Z
    b.add(g, col, { p: center, s: scale, ...o });
  });
}

// Gesicht auf Kopfkugel: Augen, Glanzpunkte, Wangen, Mund. Liefert {open, happy}-Builds
export function face(b, bOpen, bHappy, c, r, o = {}) {
  const eyeR = r * (o.eye ?? 0.4), sep = o.sep ?? 0.42, up = o.up ?? 0.18;
  const lo = o.lod ? 0.5 : 1, S = (a, b) => [Math.max(5, Math.round(a * lo)), Math.max(4, Math.round(b * lo))];
  const iris = o.iris ?? 0x2a1830;
  for (const s of [-1, 1]) {
    const d = [s * sep, up, 1];
    const sc = surf(c, r, d, 1 - eyeR / r * 0.45);
    bOpen.add(P.sphere(eyeR, ...S(14, 10)), 0xffffff, { p: sc, s: [1, 1.12, 0.8], unlit: 0.35 });
    const pc = surf(c, r, [s * sep * 0.95, up * 0.9, 1], 1 + eyeR / r * 0.12);
    bOpen.add(P.sphere(eyeR * 0.72, ...S(12, 8)), iris, { p: pc, s: [1, 1.15, 0.7] });
    const hc = surf(c, r, [s * sep * 0.95 - 0.12, up * 0.9 + 0.18, 1], 1 + eyeR / r * 0.62);
    bOpen.add(P.sphere(eyeR * 0.26, ...S(8, 6)), 0xffffff, { p: hc, unlit: 1 });
    const hc2 = surf(c, r, [s * sep * 0.95 + 0.1, up * 0.9 - 0.12, 1], 1 + eyeR / r * 0.55);
    if (!o.lod) bOpen.add(P.sphere(eyeR * 0.12, 6, 4), 0xffffff, { p: hc2, unlit: 1 });
    // Freude-Augen ^ ^
    const hp = surf(c, r, d, 1.0);
    const arc = P.torus(eyeR * 0.62, eyeR * 0.16, 4, o.lod ? 6 : 10, Math.PI);
    bHappy.add(arc, iris, { p: hp, r: [0, s * sep * 0.9, 0] });
    // Wangen
    const ch = surf(c, r, [s * 0.72, -0.1, 0.72], 0.97);
    b.add(P.sphere(r * 0.17, ...S(10, 6)), o.cheek ?? 0xff8fb0, { p: ch, s: [1, 0.6, 0.45], r: [0, s * 0.8, 0], unlit: 0.35 });
  }
  // Mund (kleines Lächeln)
  const m = surf(c, r, [0, -0.28, 1], 0.99);
  b.add(P.torus(r * 0.13, r * 0.035, 4, 10, Math.PI), o.mouth ?? 0x5a2030, { p: m, r: [-0.25, 0, Math.PI] });
}

function antenna(b, c, r, s, col, tip, len = 1) {
  const base = surf(c, r, [s * 0.35, 0.8, 0.3], 0.95);
  const segs = 5;
  let p = base.slice();
  for (let i = 0; i < segs; i++) {
    const t = i / segs;
    const dir = [s * (0.25 + t * 0.4), 1 - t * 0.5, 0.35 + t * 0.35];
    const l = 0.07 * len;
    const n = [p[0] + dir[0] * l, p[1] + dir[1] * l, p[2] + dir[2] * l];
    const mid = [(p[0] + n[0]) / 2, (p[1] + n[1]) / 2, (p[2] + n[2]) / 2];
    const g = P.cyl(0.011, 0.013, l * 1.1, 5);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...dir).normalize());
    const e = new THREE.Euler().setFromQuaternion(q);
    b.add(g, col, { p: mid, r: [e.x, e.y, e.z] });
    p = n;
  }
  b.add(P.sphere(0.04, 10, 8), tip, { p, unlit: 0.1 });
}

// ---------------------------------------------------------------- Hüte
export function hatGeo(id) {
  const b = new Build();
  if (id === 'kranz') {
    b.add(P.torus(0.17, 0.025, 6, 20), 0x4f9a3a, { r: [Math.PI / 2, 0, 0] });
    const cols = [0xff7eb6, 0xffffff, 0xffd23f, 0xb38cff, 0x6ec6ff];
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2, x = Math.cos(a) * 0.17, z = Math.sin(a) * 0.17;
      for (let k = 0; k < 5; k++) b.add(petalGeo(0.07, 0.06, 0.01, 2), cols[i % 5], { p: [x, 0.02, z], r: [0, k / 5 * Math.PI * 2, 0.25], order: 'YXZ' });
      b.add(P.sphere(0.022, 6, 4), 0xffe070, { p: [x, 0.035, z], unlit: 0.3 });
    }
  } else if (id === 'krone') {
    b.add(P.cyl(0.14, 0.13, 0.1, 16), 0xffc93a, { p: [0, 0.05, 0] });
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2, x = Math.cos(a) * 0.12, z = Math.sin(a) * 0.12;
      b.add(P.cone(0.045, 0.12, 6), 0xffc93a, { p: [x, 0.15, z] });
      b.add(P.sphere(0.022, 6, 4), 0xfff2a0, { p: [x, 0.22, z], unlit: 0.4 });
      b.add(P.sphere(0.024, 6, 4), [0xff3d6a, 0x3dc8ff, 0x6aff7a, 0xc07aff, 0xff9a3d][i], { p: [Math.cos(a) * 0.143, 0.05, Math.sin(a) * 0.143], unlit: 0.5 });
    }
  } else if (id === 'schleife') {
    b.add(P.sphere(0.1, 10, 8), 0xff5fa0, { p: [-0.1, 0.05, 0], s: [1.1, 0.75, 0.4], r: [0, 0, 0.35] });
    b.add(P.sphere(0.1, 10, 8), 0xff5fa0, { p: [0.1, 0.05, 0], s: [1.1, 0.75, 0.4], r: [0, 0, -0.35] });
    b.add(P.sphere(0.045, 8, 6), 0xff8fc0, { p: [0, 0.05, 0.01] });
  } else if (id === 'party') {
    b.add(P.cone(0.13, 0.34, 14), 0xffffff, { p: [0, 0.17, 0], cf: (x, y) => (Math.floor((y + 0.17) * 18) % 2 ? 0x5fd0ff : 0xff6fb0) });
    b.add(P.sphere(0.05, 8, 6), 0xffe04a, { p: [0, 0.35, 0], unlit: 0.2 });
  } else if (id === 'stroh') {
    b.add(P.cyl(0.3, 0.3, 0.02, 20), 0xf4d58a, { p: [0, 0.01, 0] });
    b.add(new THREE.SphereGeometry(0.15, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0xf4d58a, { p: [0, 0.01, 0], s: [1, 0.9, 1] });
    b.add(P.cyl(0.152, 0.152, 0.04, 20), 0xff6f8f, { p: [0, 0.035, 0] });
    b.add(P.sphere(0.04, 6, 4), 0xffffff, { p: [0.15, 0.05, 0.03], unlit: 0.2 });
  } else if (id === 'zauber') {
    b.add(P.cyl(0.26, 0.26, 0.02, 20), 0x6a4ac8, { p: [0, 0.01, 0] });
    b.add(P.cone(0.15, 0.42, 16), 0x7a5ae0, { p: [0, 0.22, 0], r: [0, 0, -0.2] });
    const st = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 0.02 : 0.05; i ? st.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : st.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    b.add(new THREE.ExtrudeGeometry(st, { depth: 0.015, bevelEnabled: false }), 0xffe04a, { p: [0.02, 0.22, 0.12], unlit: 0.6 });
  } else if (id === 'heiligenschein') {
    b.add(P.torus(0.17, 0.02, 6, 24), 0xfff0a0, { p: [0, 0.18, 0], r: [Math.PI / 2, 0, 0], unlit: 0.8 });
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; b.add(P.sphere(0.03, 6, 4), 0xffffff, { p: [Math.cos(a) * 0.17, 0.18, Math.sin(a) * 0.17], unlit: 1 }); }
  } else return null;
  return b.build();
}

// ---------------------------------------------------------------- Figur
let _wingMaskCache = {};
function wingTex(p) { return _wingMaskCache[p] || (_wingMaskCache[p] = wingMask(p)); }
let _glass = null, _glassLong = null;

export class Critter {
  constructor(kind = 'schmetterling', look = {}) {
    this.kind = kind;
    this.root = new THREE.Group();      // Position/Gier
    this.tilt = new THREE.Group();      // Neigung/Rolle
    this.body = new THREE.Group();      // Squash & Stretch
    this.root.add(this.tilt); this.tilt.add(this.body);
    this.mats = [];
    this.flapT = Math.random() * 6; this.blinkT = 2; this.happyT = 0; this.squash = 0; this.squashV = 0;
    this.rollAng = 0; this.rollVel = 0; this.rollTarget = 0; // Deko-Schraube (Feder, Steuerung bleibt frei)
    this.build(look);
  }
  mat(o) { const m = toonMat(o); this.mats.push(m); return m; }
  build(look) {
    const k = this.kind;
    const cols = COLORS[k][Math.min(look.color || 0, COLORS[k].length - 1)];
    const b = new Build(), bO = new Build(), bH = new Build();
    let head, headR;
    this.wings = []; this.shells = null;
    const body = this.body;
    if (k === 'schmetterling') {
      const dark = 0x4a3048;
      head = [0, 0.1, 0.34]; headR = 0.24;
      b.add(P.sphere(headR, 20, 14), dark, { p: head });
      b.add(P.sphere(0.14, 14, 10), dark, { p: [0, 0.02, 0.1], s: [1, 1, 1.25] });
      b.add(P.sphere(0.11, 14, 10), dark, { p: [0, -0.02, -0.28], s: [0.95, 0.95, 2.6], cf: (x, y, z) => (Math.floor((z + 0.11) * 40) % 2 ? 0x5a3a58 : undefined) });
      face(b, bO, bH, head, headR, { iris: 0x1e1226, cheek: 0xff8fb8 });
      antenna(b, head, headR, -1, dark, cols.a); antenna(b, head, headR, 1, dark, cols.a);
      const tex = wingTex(look.pattern || 'monarch');
      const wm = this.mat({ map: tex, wing: true, alphaTest: 0.5, side: THREE.DoubleSide, rim: 0.5, wa: cols.a, wb: cols.b, wc: cols.c, soft: 0.3 });
      this.wingMat = wm;
      for (const s of [1, -1]) {
        const g = new THREE.PlaneGeometry(1.25, 1.25); g.rotateX(Math.PI / 2); g.translate(0.62, 0, -0.18);
        if (s < 0) g.rotateZ(Math.PI);
        const piv = new THREE.Group(); piv.position.set(0.05 * s, 0.08, 0.06);
        const m = new THREE.Mesh(g, wm); piv.add(m); body.add(piv);
        this.wings.push({ piv, s, base: 0.32, amp: 0.95, freq: 1 });
      }
    } else if (k === 'marienkaefer') {
      const black = 0x241a22;
      head = [0, 0.04, 0.4]; headR = 0.2;
      b.add(P.sphere(0.27, 16, 12), black, { p: [0, -0.04, -0.04], s: [1, 0.62, 1.1] });
      b.add(P.sphere(headR, 20, 14), black, { p: head });
      face(b, bO, bH, head, headR, { iris: 0x2a2030, cheek: 0xff7aa0, sep: 0.44 });
      antenna(b, head, headR, -1, black, 0x3a2a36, 0.8); antenna(b, head, headR, 1, black, 0x3a2a36, 0.8);
      // Deckflügel (zwei Hälften, klappen im Flug auf)
      this.shells = [];
      const shellMat = this.mat({ vc: true, gloss: 0.9, rim: 0.45, soft: 0.05 });
      for (const s of [1, -1]) {
        const sb = new Build();
        const g = new THREE.SphereGeometry(0.4, 18, 12, s > 0 ? Math.PI / 2 : -Math.PI / 2, Math.PI, 0, Math.PI * 0.56);
        sb.add(g, cols.a, { p: [0, 0, 0], s: [1, 0.82, 1.12] });
        const spots = [[0.15, 0.26, 0.12, 0.075], [0.25, 0.15, -0.14, 0.065], [0.11, 0.24, -0.28, 0.06], [0.3, 0.05, 0.1, 0.05]];
        spots.forEach(([x, y, z, r]) => {
          const n = new THREE.Vector3(x, y / 0.8, z / 1.15).normalize();
          const pp = [n.x * 0.4 * 0.97 * s, n.y * 0.4 * 0.82 * 0.97, n.z * 0.4 * 1.12 * 0.97];
          sb.add(P.sphere(r, 10, 8), cols.c, { p: pp });
        });
        const piv = new THREE.Group(); piv.position.set(0, 0.02, -0.02);
        piv.add(new THREE.Mesh(sb.build(), shellMat)); body.add(piv);
        this.shells.push({ piv, s });
      }
      b.add(P.sphere(0.035, 8, 6), cols.a, { p: [0, 0.3, 0.12], s: [1, 0.5, 1] }); // Nackenpunkt
      _glass = _glass || glassWing('bee');
      const gm = this.mat({ map: _glass, transparent: true, side: THREE.DoubleSide, rim: 1.2, soft: 0.3, emis: 0.15 });
      for (const s of [1, -1]) {
        const g = new THREE.PlaneGeometry(0.8, 0.5); g.rotateX(Math.PI / 2); g.translate(0.4, 0, -0.1);
        if (s < 0) g.rotateZ(Math.PI);
        const piv = new THREE.Group(); piv.position.set(0.05 * s, 0.12, 0.02); piv.rotation.y = -0.35 * s;
        piv.add(new THREE.Mesh(g, gm)); body.add(piv);
        this.wings.push({ piv, s, base: 0.35, amp: 0.55, freq: 2.6 });
      }
    } else if (k === 'biene') {
      const stripe = cols.c;
      head = [0, 0.12, 0.34]; headR = 0.23;
      bandSphere(b, 0.28, [0, 0, -0.26], [1, 0.95, 1.3], [cols.a, stripe, cols.a, stripe, cols.a, stripe]);
      b.add(P.sphere(0.2, 16, 12), new THREE.Color(cols.a).multiplyScalar(0.92).getHex(), { p: [0, 0.05, 0.08] });
      b.add(P.sphere(headR, 20, 14), cols.a, { p: head });
      b.add(P.cone(0.04, 0.1, 8), stripe, { p: [0, -0.02, -0.66], r: [-Math.PI / 2, 0, 0] });
      face(b, bO, bH, head, headR, { iris: 0x2a1a10, cheek: 0xff7a7a });
      antenna(b, head, headR, -1, stripe, stripe, 0.9); antenna(b, head, headR, 1, stripe, stripe, 0.9);
      _glass = _glass || glassWing('bee');
      const gm = this.mat({ map: _glass, transparent: true, side: THREE.DoubleSide, rim: 1.2, soft: 0.3, emis: 0.15 });
      for (const s of [1, -1]) {
        const g = new THREE.PlaneGeometry(0.75, 0.46); g.rotateX(Math.PI / 2); g.translate(0.36, 0, -0.08);
        if (s < 0) g.rotateZ(Math.PI);
        const piv = new THREE.Group(); piv.position.set(0.08 * s, 0.2, 0.06); piv.rotation.y = -0.4 * s;
        piv.add(new THREE.Mesh(g, gm)); body.add(piv);
        this.wings.push({ piv, s, base: 0.5, amp: 0.45, freq: 3.2 });
      }
    } else { // Libelle
      head = [0, 0.06, 0.42]; headR = 0.2;
      b.add(P.sphere(headR, 20, 14), cols.a, { p: head });
      b.add(P.sphere(0.13, 14, 10), cols.a, { p: [0, 0.02, 0.2], s: [1, 1, 1.3] });
      for (let i = 0; i < 7; i++) b.add(P.sphere(0.065 - i * 0.003, 10, 8), i % 2 ? cols.a : cols.b, { p: [0, 0, 0.02 - i * 0.12], s: [1, 1, 1.25] });
      face(b, bO, bH, head, headR, { iris: 0x10303a, cheek: 0xff8fb0, eye: 0.46, sep: 0.46 });
      antenna(b, head, headR, -1, cols.c, cols.b, 0.6); antenna(b, head, headR, 1, cols.c, cols.b, 0.6);
      _glassLong = _glassLong || glassWing('long');
      const gm = this.mat({ map: _glassLong, transparent: true, side: THREE.DoubleSide, rim: 1.3, soft: 0.3, emis: 0.2 });
      for (const s of [1, -1]) for (const f of [0, 1]) {
        const g = new THREE.PlaneGeometry(1.05, 0.26); g.rotateX(Math.PI / 2); g.translate(0.52, 0, 0);
        if (s < 0) g.rotateZ(Math.PI);
        const piv = new THREE.Group(); piv.position.set(0.05 * s, 0.1, 0.22 - f * 0.18); piv.rotation.y = s * (f ? -0.12 : 0.1);
        piv.add(new THREE.Mesh(g, gm)); body.add(piv);
        this.wings.push({ piv, s, base: 0.1, amp: 0.45, freq: 2.2, ph: f * 1.6 });
      }
    }
    this.headPos = new THREE.Vector3(...head); this.headR = headR;
    const vmat = this.mat({ vc: true, rim: 0.6, gloss: 0.35, soft: 0.08 });
    this.mainMat = vmat;
    this.bodyMesh = new THREE.Mesh(b.build(), vmat); body.add(this.bodyMesh);
    // Augen in eigener Gruppe (Blinzeln = y-Skalierung um Augenhöhe)
    this.eyes = new THREE.Group(); this.eyes.position.set(0, head[1] + headR * 0.15, 0);
    const eo = bO.build(); eo.translate(0, -(head[1] + headR * 0.15), 0);
    this.eyesOpen = new THREE.Mesh(eo, vmat); this.eyes.add(this.eyesOpen);
    const eh = bH.build(); eh.translate(0, -(head[1] + headR * 0.15), 0);
    this.eyesHappy = new THREE.Mesh(eh, vmat); this.eyesHappy.visible = false; this.eyes.add(this.eyesHappy);
    body.add(this.eyes);
    this.hatAnchor = new THREE.Group();
    this.hatAnchor.position.set(head[0], head[1] + headR * 0.86, head[2] - headR * 0.1);
    this.hatAnchor.rotation.x = -0.15;
    body.add(this.hatAnchor);
    this.setHat(look.hat || 'none');
    this.look = { ...look };
  }
  setHat(id) {
    if (this.hat) { this.hatAnchor.remove(this.hat); this.hat.geometry.dispose(); this.hat = null; }
    const g = hatGeo(id);
    if (g) { this.hat = new THREE.Mesh(g, this.mainMat); this.hat.scale.setScalar(this.headR / 0.22); this.hatAnchor.add(this.hat); }
  }
  setLook(look) {
    this.dispose(true);
    this.build(look);
  }
  happy(dur = 0.9) { this.happyT = dur; this.squashV += 5; this.roll(1); }
  // Schraube um die Längsachse als Belohnung: dreht nur den Körper, Flugbahn/Steuerung bleiben unberührt.
  // Mehrere Aufrufe stapeln sich (Kombo = mehr Umdrehungen).
  roll(turns = 1, dir = 1) { this.rollTarget += turns * Math.PI * 2 * dir; this.happyT = Math.max(this.happyT, 0.6); }
  get rolling() { return Math.abs(this.rollVel) > 2.5; }
  bump(v = 3) { this.squashV += v; }
  // st: {speed01, landed, climb, flapBoost, frozen}
  update(dt, t, st = {}) {
    if (st.frozen) return;
    const landed = !!st.landed;
    const fl = st.speed01 ?? 0.6;
    const boost = st.flapBoost || 0;
    // Flügelschlag
    const rate = landed ? 1.6 : (5 + fl * 5 + boost * 4);
    this.flapT += dt * rate;
    for (const w of this.wings) {
      let a;
      const ph = this.flapT * w.freq + (w.ph || 0);
      if (landed) a = this.kind === 'schmetterling' ? 1.2 + Math.sin(t * 1.3) * 0.08 : 0.15 + Math.sin(ph) * 0.05;
      else a = w.base + Math.sin(ph) * w.amp * (0.75 + 0.25 * fl);
      w.piv.rotation.z = a * w.s;
    }
    if (this.shells) {
      const open = landed ? 0 : 0.55 + Math.sin(this.flapT * 2.6) * 0.03;
      for (const s of this.shells) { s.piv.rotation.z += (open * s.s - s.piv.rotation.z) * Math.min(1, dt * 8); s.piv.rotation.x += ((landed ? 0 : -0.25) - s.piv.rotation.x) * Math.min(1, dt * 8); }
    }
    // Squash & Stretch (Feder)
    const target = (st.climb || 0) * 0.08;
    this.squashV += ((target - this.squash) * 90 - this.squashV * 9) * dt;
    this.squash += this.squashV * dt;
    const sq = THREE.MathUtils.clamp(this.squash, -0.3, 0.3);
    const wobble = Math.sin(this.flapT) * 0.02 * (landed ? 0.3 : 1);
    this.body.scale.set(1 - sq * 0.5, 1 + sq + wobble, 1 - sq * 0.5);
    this.body.position.y = Math.sin(this.flapT) * (landed ? 0.01 : 0.05);
    // Freude: ^^-Augen + Schraube (kritisch gedämpfte Feder, ~0,7 s pro Umdrehung inkl. Ausschwingen)
    if (this.happyT > 0) this.happyT -= dt;
    if (this.rollTarget !== 0 || this.rollAng !== 0) {
      const h = Math.min(dt, 0.02); // Unterschritte → stabil auch bei 20-fps-Rucklern
      for (let r = dt; r > 1e-6; r -= h) {
        const s = Math.min(h, r);
        this.rollVel += ((this.rollTarget - this.rollAng) * 64 - this.rollVel * 16) * s;
        this.rollAng += this.rollVel * s;
      }
      if (Math.abs(this.rollTarget - this.rollAng) < 0.003 && Math.abs(this.rollVel) < 0.05) { this.rollAng = 0; this.rollTarget = 0; this.rollVel = 0; }
    }
    this.body.rotation.z = this.rollAng;
    const happy = this.happyT > 0 || st.cheer;
    this.eyesOpen.visible = !happy; this.eyesHappy.visible = !!happy;
    // Blinzeln
    this.blinkT -= dt;
    let ey = 1;
    if (this.blinkT < 0.12) ey = Math.abs(this.blinkT - 0.06) / 0.06;
    if (this.blinkT <= 0) this.blinkT = 2 + Math.random() * 3.5;
    this.eyes.scale.y = Math.max(0.08, ey);
  }
  dispose(keepRoot) {
    this.body.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    this.mats.forEach(m => m.dispose()); this.mats = [];
    while (this.body.children.length) this.body.remove(this.body.children[0]);
    this.hat = null;
  }
}
