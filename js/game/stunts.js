// Zufalls-Stunts (🎪-Knopf, v2.3): spektakuläre Flugeinlagen mit kleinen Effekten – purer Spaß, zählen nicht als Aufgabe.
// Eine gemeinsame Bahnberechnung für alle Einlagen:
//   Position  = Start + Fluglinie (L·p geradeaus) + shape(p)   (lokal: x = Seite, y = oben, z = vorwärts)
//   Drehung   = Tangente der Bahn (Rahmen wird mitgeführt → Loopings drehen sauber über Kopf) · Zusatz-Drehungen
// shape(0) = shape(1) = 0 mit flachen Enden → die Figur startet und endet auf der alten Fluglinie, ohne Ruck.
// Zusatz-Drehungen (twirl um y, flip um x, roll um z) enden auf ganzen Umdrehungen → am Ende hart genullt.
import * as THREE from 'three';

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
};

// ---------------------------------------------------------------- Einlagen
// dur = Dauer (s); spd = Tempo der Fluglinie × baseSpeed; cam = Kamera-Schwenk zur Seite (rad); shape(p, L, s, out) → lokaler Versatz (s = Seite ±1);
// spin(p, s, out) → Zusatz-Drehungen {x: flip, y: twirl, z: roll}; fx = Effekt-Name (siehe game.js showFx)
// Alte Werte (Abstimmung A/B) stehen jeweils im Kommentar.
export const STUNTS = [
  { id: 'doppel', name: 'Doppel-Looping', emoji: '🎡', dur: 2.4, spd: 1.15, cam: 0.6,
    shape: (p, L, s, o) => { const a = 2 * TAU * ease(p), R = 2.1; return o.set(0, R * (1 - Math.cos(a)), R * Math.sin(a)); } },
  { id: 'korkenzieher', name: 'Korkenzieher-Spirale', emoji: '🌀', dur: 2.3, spd: 1.15, cam: 0.4,
    // R 2,0 → 2,2 (bei Schwer lag der Scheitel sonst fast im Stillstand)
    shape: (p, L, s, o) => { const a = TAU * ease(p), R = 2.2; return o.set(s * 1.3 * Math.sin(a), R * (1 - Math.cos(a)) + 1.0 * sstep(0.1, 0.9, p), R * Math.sin(a)); },
    spin: (p, s, o) => o.set(0, 0, s * TAU * ease(p)) },
  { id: 'salto', name: 'Rückwärts-Salto', emoji: '🤸', dur: 1.7, spd: 1.1, cam: 0.7,
    shape: (p, L, s, o) => o.set(0, 2.4 * bump(p), -0.2 * L * slow(p)),
    spin: (p, s, o) => o.set(-TAU * ease(sstep(0.08, 0.92, p)), 0, 0) },
  { id: 'bumerang', name: 'Bumerang-Bogen', emoji: '🪃', dur: 2.6, spd: 1.15,
    shape: (p, L, s, o) => { const a = TAU * ease(p), R = 3.2; return o.set(s * R * (1 - Math.cos(a)), 0.8 * bump(p), R * Math.sin(a)); },
    spin: (p, s, o) => o.set(0, 0, -s * 0.75 * Math.sin(Math.PI * p)) },
  { id: 'zickzack', name: 'Blitz-Zickzack', emoji: '⚡', dur: 1.5, spd: 1.2,
    shape: (p, L, s, o) => o.set(s * 1.7 * Math.sin(3 * Math.PI * p) * Math.sin(Math.PI * p), 0, 0.35 * L * ease(p)),
    spin: (p, s, o) => o.set(0, 0, -s * 0.7 * Math.sin(3 * Math.PI * p) * Math.sin(Math.PI * p)) },
  { id: 'rakete', name: 'Feuerwerk-Rakete', emoji: '🎆', dur: 2.8, spd: 1.1, cam: 0.35,
    shape: (p, L, s, o) => o.set(0, 6.0 * bump(p), -0.25 * L * slow(p)),
    spin: (p, s, o) => o.set(0, 0, s * TAU * ease(sstep(0.36, 0.64, p))) },
  { id: 'sternschnuppe', name: 'Sternschnuppen-Schwung', emoji: '🌠', dur: 1.6, spd: 1.2,
    shape: (p, L, s, o) => o.set(s * 0.6 * Math.sin(Math.PI * p) * Math.sin(Math.PI * p), -1.3 * bump(p), 0.5 * L * ease(p)) },
  { id: 'tauchen', name: 'Tauch-Korkenzieher', emoji: '🫧', dur: 2.4, spd: 1.1, cam: 0.45,
    shape: (p, L, s, o) => { const q = Math.pow(p, 0.75), k = Math.sin(Math.PI * q); return o.set(0, -2.4 * k * k, 0); },
    spin: (p, s, o) => o.set(0, 0, s * 2 * TAU * ease(sstep(0.4, 0.95, p))) },
  { id: 'wackeltanz', name: 'Luft-Wackeltanz', emoji: '💃', dur: 2.0, spd: 1.05,
    shape: (p, L, s, o) => { const e = Math.sin(Math.PI * p), w = Math.sin(4 * Math.PI * p); return o.set(s * 0.8 * w * e, 0.8 * w * w * e, -0.3 * L * slow(p)); },
    spin: (p, s, o) => { const e = Math.sin(Math.PI * p); return o.set(0, 0.45 * Math.sin(4 * Math.PI * p) * e, 0.6 * Math.sin(6 * Math.PI * p) * e); } },
  { id: 'superschraube', name: 'Superschraube', emoji: '💫', dur: 1.9, spd: 1.15,
    // Wunsch „2½ Umdrehungen“ → 3 (eine halbe endet kopfüber)
    shape: (p, L, s, o) => o.set(0, 1.0 * bump(p), 0.15 * L * ease(p)),
    spin: (p, s, o) => o.set(0, 0, s * 3 * TAU * ease(p)) },
  { id: 'wirbel', name: 'Blumenwirbel', emoji: '🌸', dur: 2.4, spd: 1.05,
    names: { kirsch: 'Blütenwirbel', abend: 'Glühwürmchen-Wirbel' },
    shape: (p, L, s, o) => o.set(0, 1.6 * bump(p), -0.35 * L * slow(p)),
    spin: (p, s, o) => o.set(0, s * 2 * TAU * ease(p), 0) },
];
STUNTS.forEach((d, i) => { d.n = i; });
export const stuntName = (d, wid) => (d.names && d.names[wid]) || d.name;

// URL-Override ?stunt=<n|id> (A/B + Tests): jede Einlage direkt abrufbar
export function stuntByKey(k) {
  if (k === null || k === undefined || k === '') return null;
  if (typeof k === 'object') return k;
  const n = Number(k);
  if (Number.isInteger(n) && STUNTS[n]) return STUNTS[n];
  return STUNTS.find(d => d.id === k) || null;
}
// Zufall ohne direkte Wiederholung
export function pickStunt(lastId, rnd = Math.random) {
  const pool = STUNTS.filter(d => d.id !== lastId);
  return pool[(rnd() * pool.length) | 0];
}

// ---------------------------------------------------------------- gemeinsame Bahnberechnung
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _e = new THREE.Vector3(), _f = new THREE.Vector3(0, 0, 1);
const _q = new THREE.Quaternion(), _qe = new THREE.Quaternion(), _eu = new THREE.Euler(0, 0, 0, 'YXZ'), _id = new THREE.Quaternion();
// Lokaler Versatz gegenüber dem Start (inkl. Fluglinie L·p), ohne Sicherheitshöhe
export function showOffset(S, p, out) {
  S.def.shape(p, S.L, S.side, out);
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
  const w = sstep(0.86, 1, p); if (w > 0) out.slerp(_id, w); // Rest-Verdrillung sanft abbauen
  if (S.def.spin) {
    S.def.spin(p, S.side, _e);
    _eu.set(_e.x, _e.y, _e.z, 'YXZ');
    out.multiply(_qe.setFromEuler(_eu));
  }
  return out;
}
// Vorab-Check: kleinste Bahnhöhe über Grund (für die Sicherheitshöhe) – liefert nötigen Hub in m
export function showLift(S, x0, y0, z0, heightFn) {
  const fx = Math.sin(S.yaw), fz = Math.cos(S.yaw), rx = Math.cos(S.yaw), rz = -Math.sin(S.yaw);
  let need = 0;
  for (let i = 3; i <= 32; i++) {
    const p = i / 32;
    showOffset(S, p, _a);
    const x = x0 + rx * _a.x + fx * _a.z, z = z0 + rz * _a.x + fz * _a.z;
    // Start (Hub noch nicht voll): nur Bodenkontakt vermeiden; danach volle Sicherheitshöhe
    const want = p < 0.3 ? 1.2 + (SAFE_H - 1.2) * sstep(0, 0.3, p) : SAFE_H;
    need = Math.max(need, (heightFn(x, z) + want - (y0 + _a.y)) / Math.max(0.25, sstep(0, 0.3, p)));
  }
  return Math.min(8, Math.max(0, need));
}
export const liftAt = (p) => sstep(0, 0.3, p);
