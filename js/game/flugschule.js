// v3.1 Flugschule: alle neuen Flug-Mechaniken in EINER Parametergruppe (FLUG), jede mit eigenem URL-Regler.
// Regler 0 (bzw. 1 bei ?expo=) = Verhalten wie v3.0. Grundregel für Kinder: alles nur Zugabe – Tempo nie unter 75 %,
// nichts geht verloren, Rückmeldungen nur Lob. Werte: Vorlagen-Datenblatt Abschnitt 3 (Startwerte), wo nötig per
// Messung nachgestellt (siehe V31_VORLAGEN_BERICHT.md). Nur reine Funktionen/kleine Zustandsklassen – ohne three.js,
// ohne DOM → in Node testbar (tests/node/test_flugschule.mjs).
//   ?schwung=0      Tempo fest wie v3.0 (sonst: Sturzflug bringt Tempo, Steigen kostet, zieht sanft zurück)
//   ?kurve=0        Kurvenlage/Drehrate wie v3.0 (sonst: kräftigere Schräglage, nach 0,7 s Dauer-Drehen engere Kurve)
//   ?expo=1.6       Eingabekurve für Joystick/Schiebe-Steigen (Standard 1 = linear wie v3.0; Wirkung laut Datenblatt nur 2)
//   ?flatter=0      kein Flatter-Stoß per kurzem Tipp ▲
//   ?ringschub=0    kein Rückenwind je Ring (Zahl = Zuschlag aufs Reisetempo, Standard 0,2)
//   ?kette=0        keine Ringkette (Zahl = Ringe je Kette, Standard 5)
//   ?saugen=0       Tropfen/Glühwürmchen werden nicht eingesaugt (sofort gezählt wie v3.0)
//   ?aufwind=0      keine Aufwind-Säulen
//   ?landewertung=0 kein Lob-Text je Landung
//   ?schweif=0      kein Blüten-Schweif
//   ?rolle=0        keine Ausweich-Rolle per Doppeltipp
const Q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
function regler(name, std) {
  const v = Q.get(name);
  if (v === null || v === '') return std;
  const f = parseFloat(v);
  return Number.isFinite(f) ? f : std;
}
const DEG = Math.PI / 180;

export const FLUG = {
  // #1 Schwung: dv/dt = −G·sin(Nick) − D·(v − v₀), Grenzen 75 % … 145 % v₀. Steigen kostet weniger als Sturz bringt
  // (Gsteig): Halten ▲ steigt so hoch wie in v3.0 (Messgröße 3, ±5 %), der Sturz bringt den neuen Schwung.
  schwung: { an: regler('schwung', 1) > 0, G: 5, Gleicht: 4, Gsteig: 2.5, D: 1.2, deckel: 1.45, boden: 0.75 },
  // #8 Kurvenlage + Eng-Kurve
  kurve: { an: regler('kurve', 1) > 0, lage: 0.5, lageMax: 46 * DEG, engNach: 0.7, engEin: 0.3, engRate: 1.35, engLage: 60 * DEG, schwelle: 0.6 },
  // #11 Eingabekurve (nur Joystick und Schiebe-Steigen)
  expo: Math.max(1, regler('expo', 1)),
  // #2 Flatter-Stapel: kurzer Tipp ▲ (< 0,2 s) = Stoß, Halten bleibt Dauer-Steigen. Stoß 1,8 statt Startwert 1,6 m/s
  // (Messung: 3 Tipps im Takt 3,6 → 3,9 m in 1,2 s, Ziel ≈ 4 m; 1 Tipp 1,05 → 1,1 m)
  flatter: { an: regler('flatter', 1) > 0, stapel: 3, dauer: 0.8, abstand: 0.25, tippMax: 0.2, stoss: 1.8, abkling: 2.5,
    schlag: [1, 1.27, 1.6], summen: [0.9, 1.1, 1.2] },
  // #4 Ring-Schub: +20 % in 0,25 s, 0,6 s halten, 1,0 s abklingen; FOV +6° (reduzierte Bewegung +3°), Kamera 8 % weiter
  ringschub: { staerke: Math.max(0, regler('ringschub', 0.2)), rampe: 0.25, halten: 0.6, abkling: 1.0, fov: 6, fovRM: 3, camWeg: 0.08 },
  // #5 Ringkette: n Ringe im Kombo-Fenster → „Rückenwind!“ 2 s +35 %; Rington +1 Halbton je Kettenglied
  kette: { n: Math.max(0, Math.round(regler('kette', 5))), staerke: 0.35, halten: 2.0, halbton: 1, maxHalbton: 7 },
  // #6 Einsaugen: die letzten 0,2 s fliegt der Tropfen zur Figur, schrumpft, dreht 300°/s; erst dann Pling
  saugen: { an: regler('saugen', 1) > 0, dauer: 0.2, k: 12, dreh: 300 * DEG },
  // #3 Aufwind-Säulen: Hub W·√((R−d)/R), Wirbel am stärksten bei R/2; oben 4 m auslaufend; Wirbel-Lenkhilfe hält
  // die Figur im Kreis um die Säule, solange das Kind nicht selbst lenkt (sonst wäre man in 1 s durch)
  aufwind: { an: regler('aufwind', 1) > 0, R: 6, W: 3.5, Wleicht: 4.0, wirbel: 0.5, hoehe: 25, auslauf: 4, traeg: 2.2,
    halten: 0.85, kreisR: 0.5, lenkLos: 0.3, anzahl: [2, 3] },
  // #9 Landewertung (nur Lob): Abstand zur Blütenmitte beim Einrasten ÷ Fangradius
  landewertung: { an: regler('landewertung', 1) > 0, grenzen: [0.35, 0.7] },
  // #7 Blüten-Schweif: je Treffer ein Blatt (max. 12 / 16 / 20), Abstand 0,35 m; Glanz = Kombo, Blätter bleiben
  schweif: { an: regler('schweif', 1) > 0, max: { leicht: 12, mittel: 16, schwer: 20 }, abstand: 0.35, start: 0.7 },
  // #10 Ausweich-Rolle: zweimal schnell dieselbe Seite (< 0,33 s) → Rolle 0,5 s + 1,2 m Versatz, Pause 1 s
  rolle: { an: regler('rolle', 1) > 0, fenster: 0.33, dauer: 0.5, versatz: 1.2, pause: 1.0, stufen: ['mittel', 'schwer'] },
};

const klemme = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const glatt = (x) => { x = klemme(x, 0, 1); return x * x * (3 - 2 * x); };

// ------------------------------------------------------------------ #1 Schwung
// Ein Schritt des Tempo-Zustands. v0 = Reisetempo (inkl. Nässe), leicht = Stufe Leicht (sanfterer Sturz)
export function tempoSchritt(v, v0, pitch, dt, leicht = false, P = FLUG.schwung) {
  const s = Math.sin(pitch), G = s > 0 ? P.Gsteig : (leicht ? P.Gleicht : P.G);
  const nv = v + (-G * s - P.D * (v - v0)) * dt;
  return klemme(nv, P.boden * v0, P.deckel * v0);
}
// Tempo-Modell bis v3.0 (Nase hoch = etwas langsamer, Lerp 2/s) – Rückfall bei ?schwung=0 und im Landeanflug
export function tempoAlt(v, v0, pitch, dt, landing = false) {
  return v + (v0 * (1 - pitch * 0.28) * (landing ? 0.08 : 1) - v) * Math.min(1, dt * (landing ? 5 : 2));
}

// ------------------------------------------------------------------ #8 Kurve
// Zustand: wie lange schon in dieselbe Richtung gedreht wird. Liefert Drehraten-Faktor und Lage-Grenze.
export class KurvenHilfe {
  constructor(P = FLUG.kurve) { this.P = P; this.t = 0; this.dir = 0; this.k = 0; }
  reset() { this.t = 0; this.dir = 0; this.k = 0; }
  schritt(turn, dt) {
    const P = this.P;
    if (!P.an) { this.k = 0; return this; }
    const d = Math.abs(turn) > P.schwelle ? Math.sign(turn) : 0;
    if (d && d === this.dir) this.t += dt; else { this.t = d ? dt : 0; this.dir = d; }
    // Einblenden über engEin nach engNach; Loslassen blendet genauso schnell wieder aus
    const ziel = glatt((this.t - P.engNach) / P.engEin);
    this.k += (ziel - this.k) * Math.min(1, dt / P.engEin * 3);
    if (!d && this.k < 1e-3) this.k = 0;
    return this;
  }
  get rate() { return 1 + (this.P.engRate - 1) * this.k; }
  // sichtbare Schräglage aus der Gierrate (v3.0: −0,36·Rate, höchstens 0,55 rad)
  lage(yawRate) {
    const P = this.P;
    if (!P.an) return klemme(-yawRate * 0.36, -0.55, 0.55);
    const m = P.lageMax + (P.engLage - P.lageMax) * this.k;
    return klemme(-yawRate * P.lage * (1 + 0.3 * this.k), -m, m);
  }
}

// ------------------------------------------------------------------ #11 Eingabekurve
export function expoKurve(x, e = FLUG.expo) { return e <= 1 ? x : Math.sign(x) * Math.pow(Math.abs(x), e); }

// ------------------------------------------------------------------ #2 Flatter-Stapel
// tipp(t) → true, wenn ein neuer Stoß entsteht. schritt(dt) → zusätzliche Steiggeschwindigkeit (m/s).
export class FlatterStapel {
  constructor(P = FLUG.flatter) { this.P = P; this.e = []; this.last = -1e9; this.v = 0; this.stoesse = 0; }
  reset() { this.e.length = 0; this.last = -1e9; this.v = 0; }
  get n() { return this.e.length; }
  tipp(t) {
    const P = this.P;
    if (!P.an || t - this.last < P.abstand) return false;
    this.last = t;
    // voll: der älteste Eintrag wird erneuert (weiter tippen flattert weiter, nie „geht nicht mehr“)
    if (this.e.length >= P.stapel) this.e.shift();
    this.e.push(P.dauer);
    this.v = Math.max(this.v, this.e.length * P.stoss);
    this.stoesse++;
    return true;
  }
  schritt(dt) {
    const e = this.e;
    for (let i = e.length - 1; i >= 0; i--) { e[i] -= dt; if (e[i] <= 0) e.splice(i, 1); }
    this.v *= Math.exp(-this.P.abkling * dt);
    if (this.v < 1e-3) this.v = 0;
    return this.v;
  }
  // Rückmeldung: Flügelschlag-Faktor und Summen-Lautstärke je Stapelhöhe
  schlag() { const n = this.e.length; return n ? this.P.schlag[Math.min(n, this.P.schlag.length) - 1] : 1; }
  summen(n = this.e.length) { return this.P.summen[Math.max(0, Math.min(n, this.P.summen.length) - 1)]; }
}
// Tipp-Erkennung: kurzer Druck (< tippMax) ohne nennenswertes Schieben
export function istTipp(dauer, weg, P = FLUG.flatter) { return dauer < P.tippMax && weg < 26; }

// ------------------------------------------------------------------ #4/#5 Rückenwind (Ring-Schub, Ringkette)
// Hüllkurve eines Stoßes: weich hoch in rampe, halten, weich ab in abkling. Anteil 0…1
export function schubHuelle(t, rampe, halten, abkling) {
  if (t < 0) return 0;
  if (t < rampe) return glatt(t / rampe);
  if (t < rampe + halten) return 1;
  return 1 - glatt((t - rampe - halten) / abkling);
}
// Mehrere Stöße: Wert = größter Einzelwert (neuer Stoß lässt nie absacken). Ergebnis = Zuschlag als Anteil von v₀.
export class Rueckenwind {
  constructor(P = FLUG.ringschub) { this.P = P; this.s = []; this.wert = 0; this.ring = 0; }
  reset() { this.s.length = 0; this.wert = 0; this.ring = 0; }
  stoss(A, halten = this.P.halten, art = 'ring') {
    if (!(A > 0)) return;
    this.s.push({ t: 0, A, h: halten, art });
    if (this.s.length > 4) this.s.shift();
  }
  schritt(dt) {
    const P = this.P; let w = 0, r = 0;
    for (let i = this.s.length - 1; i >= 0; i--) {
      const S = this.s[i]; S.t += dt;
      const k = schubHuelle(S.t, P.rampe, S.h, P.abkling);
      if (S.t > P.rampe + S.h + P.abkling) { this.s.splice(i, 1); continue; }
      w = Math.max(w, S.A * k); r = Math.max(r, k);
    }
    this.wert = w; this.ring = r; // ring = 0…1 (für Kamera/FOV, unabhängig von der Stärke)
    return w;
  }
}
// Ringkette: Zähler je Ring im Kombo-Fenster; liefert true, wenn eine Kette voll ist
export class RingKette {
  constructor(P = FLUG.kette) { this.P = P; this.n = 0; this.last = -1e9; }
  reset() { this.n = 0; this.last = -1e9; }
  ring(t, fenster) {
    this.n = t - this.last <= fenster ? this.n + 1 : 1;
    this.last = t;
    return this.P.n > 0 && this.n % this.P.n === 0;
  }
  // Rington: +1 Halbton je Kettenglied (höchstens maxHalbton), als Abspiel-Faktor
  tonRate() { return this.P.n > 0 ? Math.pow(2, Math.min(this.P.maxHalbton, (this.n - 1) * this.P.halbton) / 12) : 1; }
}

// ------------------------------------------------------------------ #6 Einsaugen
// Ein Schritt: Lage-Anteil zur Figur (Lerp 1 − e^(−k·dt)), fertig nach dauer
export function saugSchritt(t, dt, P = FLUG.saugen) {
  const nt = t + dt;
  const fertig = nt >= P.dauer - 1e-6;
  return { t: nt, k: 1 - Math.exp(-P.k * dt), s: fertig ? 0 : Math.max(0, 1 - nt / P.dauer), fertig, dreh: P.dreh * nt };
}

// ------------------------------------------------------------------ #3 Aufwind
// Hub (m/s) und Wirbel (m/s, tangential) im Abstand d von der Achse, Höhe h über Grund
export function aufwindProfil(d, h, W, P = FLUG.aufwind) {
  if (d >= P.R || h < 0 || h > P.hoehe) return { hub: 0, wirbel: 0, oben: 0 };
  // unten weich aus dem Boden (0 → voll bis 1,5 m), oben über auslauf linear auf 0
  const oben = klemme((P.hoehe - h) / P.auslauf, 0, 1) * klemme(h / 1.5, 0, 1);
  // Rand: in den äußeren 15 % weich ausblenden (kein Ruck beim Hineinfliegen; am Rand < 0,3 m/s, Messgröße 5)
  const rand = glatt((P.R - d) / (0.15 * P.R));
  const hub = W * Math.sqrt((P.R - d) / P.R) * oben * rand;
  const wirbel = P.wirbel * (P.R / 2) * Math.sin(Math.PI * d / P.R) * oben;
  return { hub, wirbel, oben };
}

// ------------------------------------------------------------------ #9 Landewertung
// q = Abstand beim Einrasten ÷ Fangradius → 2 Federleicht, 1 Sanft, 0 Gelandet (nie etwas Negatives)
export function landeWertung(q, P = FLUG.landewertung) { return q < P.grenzen[0] ? 2 : q < P.grenzen[1] ? 1 : 0; }
export const LANDE_LOB = ['🌼 Gelandet!', '🌸 Sanft gelandet!', '🪶 Federleicht!'];

// ------------------------------------------------------------------ #10 Ausweich-Rolle
// Doppeltipp derselben Seite: zweiter Druck innerhalb fenster nach dem ersten
export class DoppelTipp {
  constructor(P = FLUG.rolle) { this.P = P; this.last = { L: -1e9, R: -1e9 }; }
  druck(seite, t) {
    const ok = t - this.last[seite] < this.P.fenster;
    this.last[seite] = ok ? -1e9 : t; // nach einer Rolle zählt der nächste Druck wieder als erster
    return ok;
  }
}
// seitlicher Versatz der Rolle über die Dauer (0…1 → 0…versatz, weich)
export function rollVersatz(p, P = FLUG.rolle) { return P.versatz * glatt(p); }
