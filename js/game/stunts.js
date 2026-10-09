// Zufalls-Stunts (🎪-Knopf, v2.3): spektakuläre Flugeinlagen mit kleinen Effekten – purer Spaß, zählen nicht als Aufgabe.
// Eine gemeinsame Bahnberechnung für alle Einlagen:
//   Position  = Start + Fluglinie (L·p geradeaus) + shape(p)   (lokal: x = Seite, y = oben, z = vorwärts)
//   Drehung   = Tangente der Bahn (Rahmen wird mitgeführt → Loopings drehen sauber über Kopf) · Zusatz-Drehungen
// shape(0) = shape(1) = 0 mit flachen Enden → die Figur startet und endet auf der alten Fluglinie, ohne Ruck.
// Zusatz-Drehungen (twirl um y, flip um x, roll um z) enden auf ganzen Umdrehungen → am Ende hart genullt.
import * as THREE from 'three';
import { KUNSTFLUG, FLUGSHOW } from './kunstflug.js';

const TAU = Math.PI * 2;
export const ease = (p) => 0.5 - 0.5 * Math.cos(Math.PI * p);
const bump = (p) => { const s = Math.sin(Math.PI * p); return s * s; }; // 0 → 1 → 0, flache Enden
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const slow = (p) => p - Math.sin(TAU * p) / TAU; // 0 → 1, Tempo 0 an beiden Enden (für „bremsen“ in der Mitte)

// Sicherheitshöhe wie beim Sieger-Looping (min. 2,6 m über Boden während der Einlage)
export const SAFE_H = 2.6;
// Abklingzeit des Knopfs (s, ab Drücken; zusätzlich muss die Einlage vorbei sein)
export const COOLDOWN = 4.0;

// Farben (Konstanten → keine Allokation beim Emittieren)
export const C = {
  RAINBOW: [0xff5a6e, 0xff9a3c, 0xffd84a, 0x7ee06a, 0x4fc8ff, 0x8a7bff, 0xd67cff],
  GOLD: [0xffe07a, 0xffffff, 0xfff3b0],
  STAR: [0xffffff, 0xfff3b0, 0xffe07a, 0xcfe8ff],
  HEART: [0xff5f9a, 0xff8fbf, 0xff3f7a],
  BOLT: [0xfff27a, 0xffffff, 0xffd84a],
  FIRE: [0xffb03a, 0xffd84a, 0xff7a3a],
  CONF: [0xff6f9a, 0xffd84a, 0x6fd0ff, 0x9cf07a, 0xc08cff, 0xffffff],
  BUBBLE: [0xbfe8ff, 0xe8f6ff, 0xd8c8ff],
  PETAL: [0xffb7cf, 0xffd7e4, 0xffffff, 0xff9fc0],
  FIREFLY: [0xd8ff6a, 0xfff08a, 0xeaff9a],
  SKY: [0x4fc8ff, 0xffffff, 0xbfe8ff], MINT: [0x7ee06a, 0xd8ffcf, 0xffffff], LILAC: [0xb98cff, 0xffd0f4, 0xffffff],
};

// ---------------------------------------------------------------- Einlagen
// dur = Dauer (s); spd = Tempo der Fluglinie × baseSpeed; cam = Kamera-Schwenk zur Seite (rad); shape(p, L, s, out) → lokaler Versatz (s = Seite ±1);
// spin(p, s, out) → Zusatz-Drehungen {x: flip, y: twirl, z: roll}; fx = Effekt-Name (siehe game.js showFx)
// Alte Werte (Abstimmung A/B) stehen jeweils im Kommentar.
export const STUNTS = [
  { id: 'doppel', hi: 0.33, name: 'Doppel-Looping', emoji: '🎡', dur: 2.4, spd: 1.15, cam: 0.6,
    shape: (p, L, s, o) => { const a = 2 * TAU * ease(p), R = 2.1; return o.set(0, R * (1 - Math.cos(a)), R * Math.sin(a)); } },
  { id: 'korkenzieher', hi: 0.5, name: 'Korkenzieher-Spirale', emoji: '🌀', dur: 2.3, spd: 1.15, cam: 0.4,
    // R 2,0 → 2,2 (bei Schwer lag der Scheitel sonst fast im Stillstand)
    shape: (p, L, s, o) => { const a = TAU * ease(p), R = 2.2; return o.set(s * 1.3 * Math.sin(a), R * (1 - Math.cos(a)) + 1.0 * sstep(0.1, 0.9, p), R * Math.sin(a)); },
    spin: (p, s, o) => o.set(0, 0, s * TAU * ease(p)) },
  { id: 'salto', hi: 0.5, name: 'Rückwärts-Salto', emoji: '🤸', dur: 1.7, spd: 1.1, cam: 0.7,
    shape: (p, L, s, o) => o.set(0, 2.4 * bump(p), -0.2 * L * slow(p)),
    spin: (p, s, o) => o.set(-TAU * ease(sstep(0.08, 0.92, p)), 0, 0) },
  { id: 'bumerang', hi: 0.5, name: 'Bumerang-Bogen', emoji: '🪃', dur: 2.6, spd: 1.15,
    shape: (p, L, s, o) => { const a = TAU * ease(p), R = 3.2; return o.set(s * R * (1 - Math.cos(a)), 0.8 * bump(p), R * Math.sin(a)); },
    spin: (p, s, o) => o.set(0, 0, -s * 0.75 * Math.sin(Math.PI * p)) },
  { id: 'zickzack', hi: 0.5, name: 'Blitz-Zickzack', emoji: '⚡', dur: 1.5, spd: 1.2,
    shape: (p, L, s, o) => o.set(s * 1.7 * Math.sin(3 * Math.PI * p) * Math.sin(Math.PI * p), 0, 0.35 * L * ease(p)),
    spin: (p, s, o) => o.set(0, 0, -s * 0.7 * Math.sin(3 * Math.PI * p) * Math.sin(Math.PI * p)) },
  { id: 'rakete', hi: 0.5, name: 'Feuerwerk-Rakete', emoji: '🎆', dur: 2.8, spd: 1.1, cam: 0.35,
    shape: (p, L, s, o) => o.set(0, 6.0 * bump(p), -0.25 * L * slow(p)),
    spin: (p, s, o) => o.set(0, 0, s * TAU * ease(sstep(0.36, 0.64, p))) },
  { id: 'sternschnuppe', hi: 0.45, name: 'Sternschnuppen-Schwung', emoji: '🌠', dur: 1.6, spd: 1.2,
    shape: (p, L, s, o) => o.set(s * 0.6 * Math.sin(Math.PI * p) * Math.sin(Math.PI * p), -1.3 * bump(p), 0.5 * L * ease(p)) },
  { id: 'tauchen', hi: 0.62, name: 'Tauch-Korkenzieher', emoji: '🫧', dur: 2.4, spd: 1.1, cam: 0.45,
    shape: (p, L, s, o) => { const q = Math.pow(p, 0.75), k = Math.sin(Math.PI * q); return o.set(0, -2.4 * k * k, 0); },
    spin: (p, s, o) => o.set(0, 0, s * 2 * TAU * ease(sstep(0.4, 0.95, p))) },
  { id: 'wackeltanz', hi: 0.5, name: 'Luft-Wackeltanz', emoji: '💃', dur: 2.0, spd: 1.05,
    shape: (p, L, s, o) => { const e = Math.sin(Math.PI * p), w = Math.sin(4 * Math.PI * p); return o.set(s * 0.8 * w * e, 0.8 * w * w * e, -0.3 * L * slow(p)); },
    spin: (p, s, o) => { const e = Math.sin(Math.PI * p); return o.set(0, 0.45 * Math.sin(4 * Math.PI * p) * e, 0.6 * Math.sin(6 * Math.PI * p) * e); } },
  { id: 'superschraube', hi: 0.5, name: 'Superschraube', emoji: '💫', dur: 1.9, spd: 1.15,
    // Wunsch „2½ Umdrehungen“ → 3 (eine halbe endet kopfüber)
    shape: (p, L, s, o) => o.set(0, 1.0 * bump(p), 0.15 * L * ease(p)),
    spin: (p, s, o) => o.set(0, 0, s * 3 * TAU * ease(p)) },
  { id: 'wirbel', hi: 0.5, name: 'Blumenwirbel', emoji: '🌼', dur: 2.4, spd: 1.05,
    names: { kirsch: 'Blütenwirbel', abend: 'Glühwürmchen-Wirbel' }, emojis: { kirsch: '🌸', abend: '✨' },
    shape: (p, L, s, o) => o.set(0, 1.6 * bump(p), -0.35 * L * slow(p)),
    spin: (p, s, o) => o.set(0, s * 2 * TAU * ease(p), 0) },
  // v3.0: echte Kunstflug-Figuren (Immelmann, Split-S, Hammerhead, Kubanische Acht …) – Bahn aus kunstflug.js
  ...KUNSTFLUG,
];
STUNTS.forEach((d, i) => { d.n = i; });
export const stuntName = (d, wid) => (d.names && d.names[wid]) || d.name;
// Einblende-Text: Kunstflug-Figuren mit echtem Namen + kindgerechtem Untertitel („Immelmann – halber Looping, dann umdrehen!“)
export const stuntTitle = (d, wid) => d.sub ? `${stuntName(d, wid)} – ${d.sub}` : `${stuntName(d, wid)}!`;

// ---------------------------------------------------------------- Sieger-Einlagen (v2.4)
// Levelsieg → zufällige Einlage aus dem Katalog, eine Stufe größer inszeniert (Bahn ×AMP, Dauer ×DUR, Seitenkamera,
// Zeitlupe am Höhepunkt `hi`). Der klassische Sieger-Looping bleibt als eigene Einlage (Index 0) dabei.
export const FINALE_AMP = 1.2, FINALE_DUR = 1.25;
export const LOOPING = { id: 'looping', hi: 0.5, name: 'Sieger-Looping', emoji: '🏆', dur: 2.2, spd: 1.0, cam: 0.6,
  shape: (p, L, s, o) => { const a = TAU * ease(p), R = 2.6; return o.set(0, R * (1 - Math.cos(a)), R * Math.sin(a)); } };
// v3.0: + „Flugshow“ (Kür aus Immelmann → Fassrolle → Split-S, als Fan-Cam-Clip inszeniert) – selten (FLUGSHOW_P)
export const FINALES = [LOOPING, ...STUNTS, FLUGSHOW];
export const FLUGSHOW_P = 0.14;
// Effekt-Akzent je Sieger-Einlage: Farben + Partikelform (0 Kugel, 1 Stern, 2 Konfetti, 3 Herz, 6 Blase) für Spur und Höhepunkt
export const ACCENT = {
  looping: { c: C.GOLD, sh: 1 }, doppel: { c: C.RAINBOW, sh: 0 }, korkenzieher: { c: C.GOLD, sh: 1 }, salto: { c: C.STAR, sh: 1 },
  bumerang: { c: C.HEART, sh: 3 }, zickzack: { c: C.BOLT, sh: 1 }, rakete: { c: C.FIRE, sh: 0 }, sternschnuppe: { c: C.STAR, sh: 1 },
  tauchen: { c: C.BUBBLE, sh: 6 }, wackeltanz: { c: C.CONF, sh: 2 }, superschraube: { c: C.STAR, sh: 1 }, wirbel: { c: C.PETAL, sh: 2 },
  // v3.0 Kunstflug
  immelmann: { c: C.RAINBOW, sh: 1 }, splits: { c: C.SKY, sh: 1 }, hammerhead: { c: C.FIRE, sh: 1 }, kubanisch: { c: C.RAINBOW, sh: 0 },
  fassrolle: { c: C.GOLD, sh: 1 }, gerissen: { c: C.BOLT, sh: 1 }, maennchen: { c: C.MINT, sh: 2 }, trudeln: { c: C.LILAC, sh: 1 },
  kobra: { c: C.MINT, sh: 1 }, messerflug: { c: C.SKY, sh: 1 }, avalanche: { c: C.BOLT, sh: 1 }, humpty: { c: C.CONF, sh: 2 }, lomcovak: { c: C.CONF, sh: 2 },
  flugshow: { c: C.RAINBOW, sh: 1 },
};
// v3.0 Rauchspur der Kunstflug-Figuren (zwei Farben wie bei Flugstaffeln, Regenbogen für die großen Figuren)
export const SMOKE = {
  RAUCH_RB: C.RAINBOW, RAUCH_BLAU: [0x4fc8ff, 0xffffff, 0x8adfff], RAUCH_ROT: [0xff5a6e, 0xffffff, 0xff9a9a], RAUCH_GELB: [0xffd84a, 0xffffff, 0xffe98a],
  RAUCH_GRUEN: [0x7ee06a, 0xffffff, 0xb6f0a0], RAUCH_LILA: [0xb98cff, 0xffffff, 0xff9fe0],
};
// ?finale=<n|id> bzw. __game.finale(n|id): Index in FINALES oder id
export function finaleByKey(k) {
  if (k === null || k === undefined || k === '') return null;
  if (typeof k === 'object') return k;
  const n = Number(k);
  if (Number.isInteger(n) && FINALES[n]) return FINALES[n];
  return FINALES.find(d => d.id === k) || null;
}
export function pickFinale(lastId, rnd = Math.random) {
  if (lastId !== FLUGSHOW.id && rnd() < FLUGSHOW_P) return FLUGSHOW;
  const pool = FINALES.filter(d => d.id !== lastId && d !== FLUGSHOW);
  return pool[(rnd() * pool.length) | 0];
}

// URL-Override ?stunt=<n|id> (A/B + Tests): jede Einlage direkt abrufbar
export function stuntByKey(k) {
  if (k === null || k === undefined || k === '') return null;
  if (typeof k === 'object') return k;
  const n = Number(k);
  if (Number.isInteger(n) && STUNTS[n]) return STUNTS[n];
  return STUNTS.find(d => d.id === k) || null;
}
// Zufall ohne direkte Wiederholung
// v3.0 maxDur: in Kunststück-Missionen nur kürzere Einlagen (die langen Kunstflug-Figuren würden das Zeitziel verschieben)
export function pickStunt(lastId, rnd = Math.random, maxDur = Infinity) {
  const pool = STUNTS.filter(d => d.id !== lastId && d.dur <= maxDur);
  return pool[(rnd() * pool.length) | 0];
}

// ---------------------------------------------------------------- gemeinsame Bahnberechnung
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _e = new THREE.Vector3(), _f = new THREE.Vector3(0, 0, 1);
const _q = new THREE.Quaternion(), _qe = new THREE.Quaternion(), _eu = new THREE.Euler(0, 0, 0, 'YXZ'), _id = new THREE.Quaternion();
// Lokaler Versatz gegenüber dem Start (inkl. Fluglinie L·p), ohne Sicherheitshöhe
// (v3.0: Kunstflug-Figuren bekommen S und skalieren selbst – die Figur wird größer, die Fluglinie nicht)
export function showOffset(S, p, out) {
  S.def.shape(p, S.L, S.side, out, S);
  if (S.amp && S.amp !== 1 && !S.def.kf) out.multiplyScalar(S.amp);
  out.z += S.L * p;
  return out;
}
// Figuren-Drehung relativ zur Flugrichtung beim Start: Tangente (mitgeführter Rahmen) · Zusatz-Drehungen
export function showOrient(S, p, out) {
  const h = 0.004;
  showOffset(S, Math.min(1, p + h), _a); showOffset(S, Math.max(0, p - h), _b);
  _a.sub(_b);
  if (_a.lengthSq() > 1e-8) {
    _a.normalize();
    _b.copy(_f).applyQuaternion(S.qt);        // bisherige Blickrichtung
    _q.setFromUnitVectors(_b, _a);            // kleinste Drehung zur neuen Tangente (kein Verdrillen)
    S.qt.premultiply(_q).normalize();
  }
  out.copy(S.qt);
  const w = S.def.kf ? 0 : sstep(0.86, 1, p); if (w > 0) out.slerp(_id, w); // Rest-Verdrillung sanft abbauen (Kunstflug: in spin)
  if (S.def.spin) {
    S.def.spin(p, S.side, _e, S);
    _eu.set(_e.x, _e.y, _e.z, 'YXZ');
    out.multiply(_qe.setFromEuler(_eu));
  }
  return out;
}
// Vorab-Check: kleinste Bahnhöhe über Grund (für die Sicherheitshöhe) – liefert nötigen Hub in m
export function showLift(S, x0, y0, z0, heightFn) {
  const fx = Math.sin(S.yaw), fz = Math.cos(S.yaw), rx = Math.cos(S.yaw), rz = -Math.sin(S.yaw);
  let need = 0;
  // v3.0: Kunstflug-Figuren heben nur vorher an (auf der Ein-Geraden + kurz danach), damit die Figur selbst unverfälscht bleibt
  if (S.def.kf) S.liftEnd = Math.min(0.3, S.def.coreP(S, 0) + 0.08);
  const le = liftEnd(S);
  const N = S.def.kf ? 128 : 32; // v3.0: Kunstflug-Figuren haben enge Tiefpunkte (Abfangbogen) → feiner abtasten
  for (let i = Math.round(3 * N / 32); i <= N; i++) {
    const p = i / N;
    showOffset(S, p, _a);
    const x = x0 + rx * _a.x + fx * _a.z, z = z0 + rz * _a.x + fz * _a.z;
    // Start (Hub noch nicht voll): nur Bodenkontakt vermeiden; danach volle Sicherheitshöhe
    const want = p < le ? 1.2 + (SAFE_H - 1.2) * sstep(0, le, p) : SAFE_H;
    need = Math.max(need, (heightFn(x, z) + want - (y0 + _a.y)) / Math.max(0.25, sstep(0, le, p)));
  }
  return Math.min(8, Math.max(0, need));
}
const liftEnd = (S) => (S && S.liftEnd) || 0.3;
export const liftAt = (p, S) => sstep(0, liftEnd(S), p);
// Ausdehnung der Figur-Bahn ohne Fluglinie (für die Sieger-Kamera): Mitte (lokal) + Radius
export function showBounds(S, outC) {
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (let i = 0; i <= 40; i++) {
    const p = i / 40;
    showOffset(S, p, _a); _a.z -= S.L * p;
    x0 = Math.min(x0, _a.x); x1 = Math.max(x1, _a.x); y0 = Math.min(y0, _a.y); y1 = Math.max(y1, _a.y); z0 = Math.min(z0, _a.z); z1 = Math.max(z1, _a.z);
  }
  outC.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return Math.max(1.6, (x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2);
}
