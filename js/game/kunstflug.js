// Kunstflug-Figuren (v3.0): echte Figuren aus der Flugshow – Immelmann, Split-S, Hammerhead, Kubanische Acht …
// Jede Figur wird wie im Kunstflug-Katalog (Aresti) aus Stücken gebaut: gerade Linie, Bogen nach oben/unten (ziehen/
// drücken), Bogen zur Seite (gieren), Rolle um die Längsachse – eine „Schildkröte“ fährt sie einmal beim Laden ab
// (dichte Punktfolge, ~2 cm). Die Figur liegt fest in der Luft (wie eine Rauchspur am Himmel), nicht im mitfahrenden
// Rahmen der Fluglinie. Eingehängt wird sie über die gemeinsame Bahnberechnung (stunts.js):
//   shape(p) = Figur(p) − Fluglinie(L·p)  → Start und Ende liegen auf der alten Fluglinie, Ende mit alter Flugrichtung
//   spin(p)  = Rollen/Kippen der Figur + Ausgleich der Rest-Verdrillung auf der Ausleit-Geraden
// Tempo-Gefühl: jedes Stück hat ein End-Tempo (1 = Reisetempo): hochziehen wird langsamer, runterstürzen schneller.
// Anfang und Ende fliegen genau mit Reisetempo (kein Tempo-Sprung beim Ein- und Ausleiten); die Geraden davor/danach
// strecken sich, bis die Figur wieder auf der Fluglinie endet.
import * as THREE from 'three';

const D2R = Math.PI / 180, TAU = Math.PI * 2;
const ease = (p) => 0.5 - 0.5 * Math.cos(Math.PI * p);
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const V = THREE.Vector3;
const NK = 9; // je Punkt: x, y, z, Weg s, Tempo v, Rolle, Kippen, Gieren, Zeit τ

// ---------------------------------------------------------------- Bahn-Baukasten (Schildkröte)
class Bahn {
  constructor() {
    this.X = new V(); this.F = new V(0, 0, 1); this.U = new V(0, 1, 0);
    this.v = 1; this.s = 0; this.ch = [0, 0, 0]; this.rx = 0; // Kanäle: Rolle (auch Geometrie), Kippen, Gieren; rx = nur Anzeige
    this.pts = []; this.marks = {}; this.evs = [];
    this.push([0, 0, 0]);
  }
  get Rt() { return new V().crossVectors(this.U, this.F); }
  push(w) {
    const P = this.X;
    this.pts.push(P.x, P.y, P.z, this.s, this.v, this.ch[0] + this.rx + w[0], this.ch[1] + w[1], this.ch[2] + w[2], 0);
  }
  // Grund-Stück: n Schritte, geo(u) setzt P/F/U, Tempo linear im Weg, Kanäle o.roll/o.flip/o.twirl (Zuwachs, weich im Teilbereich
  // o.at = [a, b]), o.wob(u) = kurzer Wackler (nur Anzeige, 0 an den Enden), o.ev = [[u, Name]], o.mark = Name (Stück-Anfang)
  stueck(len, v1, n, geo, o = {}) {
    const v0 = this.v, s0 = this.s, c0 = this.ch.slice(), U0 = this.U.clone(), F0 = this.F.clone();
    const at = o.at || [0, 1], rx0 = this.rx;
    if (o.mark) this.marks[o.mark] = this.pts.length / NK - 1;
    const evs = (o.ev || []).slice();
    for (let i = 1; i <= n; i++) {
      const u = i / n;
      geo(u, U0, F0);
      const su = o.sOf ? o.sOf(i) : len * u; // Weg (freie Bahn: echte Bogenlänge)
      this.s = s0 + su; this.v = v0 + (v1 - v0) * su / len;
      const k = o.lin ? Math.min(1, Math.max(0, (u - at[0]) / (at[1] - at[0]))) : ease(Math.min(1, Math.max(0, (u - at[0]) / (at[1] - at[0]))));
      const r = (o.roll || 0) * k;
      this.ch[0] = c0[0] + r; this.ch[1] = c0[1] + (o.flip || 0) * k; this.ch[2] = c0[2] + (o.twirl || 0) * k;
      if (o.rx) this.rx = rx0 + o.rx * u;
      // Rolle dreht auch die Schildkröte (danach zieht ein Bogen zum neuen „oben“); auf Bögen nur ganze Rollen
      if (r) this.U.applyAxisAngle(this.F, r);
      const w = o.wob ? o.wob(u) : [0, 0, 0];
      while (evs.length && evs[0][0] <= u) this.evs.push([this.pts.length / NK, evs.shift()[1]]);
      this.push(w);
    }
    if (o.markEnd) this.marks[o.markEnd] = this.pts.length / NK - 1;
    return this;
  }
  // Gerade (optional mit Rolle/Kippen)
  S(len, v1 = this.v, o = {}) {
    const P0 = this.X.clone(), n = Math.max(2, Math.ceil(len / 0.02));
    return this.stueck(len, v1, n, (u, U0, F0) => { this.X.copy(P0).addScaledVector(F0, len * u); this.U.copy(U0); }, o);
  }
  // Gerade bis zur Höhe y (Senkrechte/Schräge)
  Sy(y, v1 = this.v, o = {}) { const len = (y - this.X.y) / this.F.y; if (!(len > 0)) throw new Error('Sy ' + len); return this.S(len, v1, o); }
  // Bogen: deg > 0 = ziehen (zum Kopf hin), < 0 = drücken; seitlich (Y) zur rechten Flügelspitze hin
  arc(R, deg, v1, o, side) {
    const a = Math.abs(deg) * D2R, sg = Math.sign(deg), P0 = this.X.clone(), len = R * a;
    const n = Math.max(4, Math.ceil(Math.max(len / 0.02, a / (2 * D2R))));
    return this.stueck(len, v1, n, (u, U0, F0) => {
      const ph = a * u, c = Math.cos(ph), s = Math.sin(ph);
      const N0 = side ? new V().crossVectors(U0, F0) : U0; // Bogen-Ebene: F/oben bzw. F/rechts
      this.X.copy(P0).addScaledVector(F0, R * s).addScaledVector(N0, sg * R * (1 - c));
      const F = F0.clone().multiplyScalar(c).addScaledVector(N0, sg * s);
      if (side) { this.F.copy(F); this.U.copy(U0); } // Gieren: oben bleibt
      else { this.U.copy(U0).multiplyScalar(c).addScaledVector(F0, -sg * s); this.F.copy(F); }
    }, o);
  }
  P(R, deg, v1 = this.v, o = {}) { return this.arc(R, deg, v1, o, false); }
  Y(R, deg, v1 = this.v, o = {}) { return this.arc(R, deg, v1, o, true); }
  // Freie Bahn im Rahmen des Stück-Anfangs: f(u, out) → Versatz (x = rechts, y = oben, z = vorwärts); Ende = (0, 0, len), Tangente
  // an den Enden = vorwärts. Die Rest-Verdrillung (mitgeführter Rahmen ≠ Schildkröte) wird über die Anzeige-Rolle ausgeglichen.
  fn(len, v1, f, o = {}) {
    const P0 = this.X.clone(), U0 = this.U.clone(), F0 = this.F.clone(), R0 = this.Rt, n = Math.max(8, Math.ceil(len / 0.015));
    const q = new V();
    // Verdrillung des mitgeführten Rahmens längs der Bahn (wie showOrient) → Ausgleich rx
    let tPrev = F0.clone(), up = U0.clone(), prev = P0.clone();
    const tw = new V(), qq = new THREE.Quaternion(), cum = new Float64Array(n + 1);
    for (let i = 1; i <= n; i++) {
      f(i / n, q); const p = new V().copy(P0).addScaledVector(R0, q.x).addScaledVector(U0, q.y).addScaledVector(F0, q.z);
      cum[i] = cum[i - 1] + p.distanceTo(prev);
      if (i > 1) { tw.subVectors(p, prev).normalize(); qq.setFromUnitVectors(tPrev, tw); up.applyQuaternion(qq); tPrev.copy(tw); }
      prev.copy(p);
    }
    len = cum[n];
    up.applyQuaternion(qq.setFromUnitVectors(tPrev, F0));
    const tau = Math.atan2(new V().crossVectors(U0, up).dot(F0), U0.dot(up)); // Winkel von U0 nach „up“ um F0
    o = { ...o, rx: -tau, sOf: (i) => cum[i] };
    return this.stueck(len, v1, n, (u) => {
      f(u, q);
      this.X.copy(P0).addScaledVector(R0, q.x).addScaledVector(U0, q.y).addScaledVector(F0, q.z); this.U.copy(U0);
    }, o);
  }
  // Abschluss: Zeiten τ, Schluss-Korrektur (Rest-Versatz seitlich/Höhe weich über die Figur verteilt), Kennwerte
  fertig(name) {
    const A = new Float32Array(this.pts), n = A.length / NK;
    const ex = A[(n - 1) * NK], ey = A[(n - 1) * NK + 1], S = A[(n - 1) * NK + 3];
    if (Math.abs(ex) > 1.5 || Math.abs(ey) > 0.7) console.warn('Kunstflug', name, 'Ende bei', ex.toFixed(2), ey.toFixed(2));
    if (this.F.z < 0.9999 || Math.abs(this.U.y) < 0.999) console.warn('Kunstflug', name, 'Endrichtung', this.F.toArray(), this.U.toArray());
    let t = 0;
    for (let i = 0; i < n; i++) {
      const k = i * NK, w = ease(A[k + 3] / S);
      A[k] -= ex * w; A[k + 1] -= ey * w;
      if (i) { const ds = A[k + 3] - A[k - NK + 3]; t += ds / Math.max(0.03, (A[k + 4] + A[k - NK + 4]) / 2); }
      A[k + 8] = t;
    }
    let y0 = 0, y1 = 0, z0 = 0, z1 = 0, x0 = 0, x1 = 0;
    for (let i = 0; i < n; i++) { const k = i * NK; x0 = Math.min(x0, A[k]); x1 = Math.max(x1, A[k]); y0 = Math.min(y0, A[k + 1]); y1 = Math.max(y1, A[k + 1]); z0 = Math.min(z0, A[k + 2]); z1 = Math.max(z1, A[k + 2]); }
    const marks = {}; for (const m in this.marks) marks[m] = A[this.marks[m] * NK + 8] / t;
    const evs = this.evs.map(([i, e]) => [A[Math.min(n - 1, i) * NK + 8] / t, e]);
    return { A, n, T: t, Zc: A[(n - 1) * NK + 2], v0: A[4], vN: A[(n - 1) * NK + 4], rEnd: A[(n - 1) * NK + 5], len: S,
      box: { x0, x1, y0, y1, z0, z1 }, marks, evs };
  }
}
const bahn = () => new Bahn();

// ---------------------------------------------------------------- Auswertung zur Laufzeit (je Einlage S einmal gelöst)
// Unbekannt ist nur das Ein-/Ausleit-Tempo x (im Maß der Figur): x·T(x) = L/spd (Ende fliegt Reisetempo), T(x) = Zeit der
// ganzen Bahn. Die Geraden davor/danach (a, b) schließen die Lücke zur Fluglinie: a + b = L − amp·Zc.
function loese(K, L, amp, spd) {
  const rest = Math.max(0.6, L - amp * K.Zc), a = rest * K.fa, b = rest - a, Tc = K.T * amp, want = L / spd;
  const T = (x) => 2 * a / (x + K.v0) + Tc + 2 * b / (x + K.vN);
  let lo = 1e-3, hi = 50;
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (m * T(m) < want) lo = m; else hi = m; }
  const x = (lo + hi) / 2, Ta = 2 * a / (x + K.v0), Tb = 2 * b / (x + K.vN);
  return { L, amp, x, a, b, Ta, Tc, Tb, T: Ta + Tc + Tb, endZ: a + amp * K.Zc + b };
}
function cache(S, K) {
  const amp = S.amp || 1;
  let C = S._kf;
  if (!C || C.L !== S.L || C.amp !== amp) {
    C = S._kf = loese(K, S.L, amp, S.def.spd);
    C.pC0 = C.Ta / C.T; C.pC1 = (C.Ta + C.Tc) / C.T; // Kern-Anfang/-Ende in p
  }
  return C;
}
// p → Punkt der Bahn: Position (lokal, mit Fluglinie) + Kanäle
const _o = { x: 0, y: 0, z: 0, r: 0, f: 0, w: 0, ph: 0 };
function at(K, C, p, side) {
  const t = Math.min(1, Math.max(0, p)) * C.T, A = K.A, o = _o;
  if (t <= C.Ta) {
    const s = C.x * t + (K.v0 - C.x) * t * t / (2 * C.Ta);
    o.x = 0; o.y = 0; o.z = s; o.r = 0; o.f = 0; o.w = 0; o.ph = 0;
    return o;
  }
  if (t >= C.Ta + C.Tc) {
    const u = t - C.Ta - C.Tc, s = K.vN * u + (C.x - K.vN) * u * u / (2 * C.Tb), k = (K.n - 1) * NK;
    o.x = 0; o.y = 0; o.z = C.a + C.amp * K.Zc + Math.min(C.b, s); o.r = A[k + 5]; o.f = A[k + 6]; o.w = A[k + 7]; o.ph = 2;
    return o;
  }
  const tc = (t - C.Ta) / C.amp;
  let lo = 0, hi = K.n - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (A[m * NK + 8] <= tc) lo = m; else hi = m; }
  const i = lo * NK, j = hi * NK, d = A[j + 8] - A[i + 8], f = d > 1e-9 ? (tc - A[i + 8]) / d : 0;
  const L = (c) => A[i + c] + (A[j + c] - A[i + c]) * f;
  o.x = side * L(0) * C.amp; o.y = L(1) * C.amp; o.z = C.a + L(2) * C.amp; o.r = L(5); o.f = L(6); o.w = L(7); o.ph = 1;
  return o;
}
// Figur → Einlage für den STUNTS-Katalog
function figur(d, K) {
  K.fa = d.fa ?? 0.3; // Anteil der Ein-Geraden an der Rest-Strecke
  d.kf = K; d.kunstflug = true;
  d.shape = (p, L, s, out, S) => {
    const C = cache(S, K), o = at(K, C, p, s);
    return out.set(o.x, o.y, o.z - L * p);
  };
  // Zusatz-Drehungen: Rolle/Kippen/Gieren der Figur. Auf der Ausleit-Geraden: Rest-Verdrillung τ des mitgeführten Rahmens
  // (reine Drehung um die Flugrichtung, aus S.qt gelesen) ausgleichen – showOrient baut sie bei Kunstflug-Figuren nicht
  // selbst ab. Angezeigt wird τ + Rolle = ε (≈ 0, die Figur ist aufrecht); ε läuft weich auf 0 → Ende exakt aufrecht.
  d.spin = (p, s, out, S) => {
    const C = cache(S, K), o = at(K, C, p, s);
    let r = o.r * s;
    if (o.ph === 2 && S.qt) {
      const q = S.qt, tau = 2 * Math.atan2(q.z, q.w);
      const u = (p - C.pC1) / Math.max(1e-6, 1 - C.pC1), k = sstep(0.05, 0.7, u);
      r = wrap(r + tau) * (1 - k) - tau;
    }
    return out.set(o.f, o.w * s, r);
  };
  d.coreP = (S, frac) => { const C = cache(S, K); return C.pC0 + (C.pC1 - C.pC0) * frac; };
  return d;
}

// ---------------------------------------------------------------- Die Figuren
// Maße in m (Schmetterlings-Maßstab: Loopings wie der Sieger-Looping, R ≈ 2–2,5), Tempo relativ zum Reisetempo.
// hi = Höhepunkt (Anteil der Figur, für Zeitlupe/Feuerwerk), cam = Kamera-Schwenk zur Seite, camD = Kamera-Abstand × camD
const R1 = 2.6;
const snapWob = (u) => { const e = Math.sin(Math.PI * u); return [0, -0.28 * Math.sin(3 * Math.PI * u) * e, 0.22 * Math.sin(2 * Math.PI * u) * e]; };

const DEFS = [], DEFS_SHOW = [];
const add = (d, K) => DEFS.push(figur(d, K));

// 1) Immelmann: halber Looping nach oben, oben auf dem Rücken, halbe Rolle aufrecht → zurück mit dem Split-S
add({ id: 'immelmann', info: 'Einen halben Looping hoch, oben kopfüber – dann mit einer halben Rolle wieder aufrecht, und schon fliegst du zurück. Erfunden hat ihn der Flieger Max Immelmann.', name: 'Immelmann', sub: 'halber Looping, dann umdrehen!', emoji: '↩️', dur: 5.2, spd: 0.25, cam: 1.35, camD: 1.35, smoke: 'RAUCH_RB' },
  bahn().S(0.5, 1)
    .P(R1, 180, 0.6, { mark: 'hi0', ev: [[0, 'zieh']] })
    .S(1.6, 0.65, { roll: Math.PI, at: [0.05, 0.95], mark: 'roll', ev: [[0.1, 'rolle']], markEnd: 'hi1' })
    .S(0.8, 0.7)
    .S(1.6, 0.75, { roll: Math.PI, ev: [[0.1, 'rolle']] })
    .P(R1, 180, 1.0, { ev: [[0.35, 'sturz']] })
    .S(0.4, 1).fertig('immelmann'));

// 2) Split-S (Abschwung): halbe Rolle auf den Rücken, halber Looping nach unten → zurück mit dem Immelmann
add({ id: 'splits', info: 'Das Gegenteil vom Immelmann: erst auf den Rücken rollen, dann im halben Looping nach unten – so dreht man ganz schnell um.', name: 'Split-S', sub: 'auf den Rücken und im Bogen runter!', emoji: '⤵️', dur: 5.2, spd: 0.53, cam: 1.35, camD: 1.35, smoke: 'RAUCH_BLAU' },
  bahn().S(0.5, 1)
    .S(1.9, 0.95, { roll: Math.PI, mark: 'roll', ev: [[0.1, 'rolle']] })
    .P(R1, 180, 1.35, { mark: 'hi0', ev: [[0.3, 'sturz']], markEnd: 'unten' })
    .S(1.4, 1.2)
    .P(R1, 180, 0.65, { ev: [[0.1, 'zieh']] })
    .S(1.3, 0.85, { roll: Math.PI, ev: [[0.1, 'rolle']] })
    .S(0.3, 1).fertig('splits'));

// 3) Hammerhead (Turn): senkrecht hoch, Tempo fast null, am Scheitel seitlich um 180° kippen (Flügelflattern), senkrecht
//    runter, abfangen (jetzt in Gegenrichtung) → zurück mit einem halben Looping + halber Rolle (Immelmann) auf alter Höhe
{
  const R2 = 2.0, Ra = 2.0, Rb = 1.9, top = 6.2;
  add({ id: 'hammerhead', info: 'Senkrecht hoch, bis man fast stehen bleibt – dann kippt man oben wie ein Hammer zur Seite und saust senkrecht wieder runter.', name: 'Hammerhead', sub: 'senkrecht hoch, stehen, umkippen!', emoji: '🔨', dur: 6.6, spd: 0.2, cam: 1.5, camD: 1.4, smoke: 'RAUCH_ROT', hang: true },
    bahn().S(0.5, 1)
      .P(Ra, 90, 0.8, { ev: [[0, 'zieh']] })
      .Sy(top - 1.8, 0.6)
      .Sy(top, 0.15)
      .Y(0.25, 180, 0.15, { mark: 'hang', ev: [[0.05, 'haenge']], wob: (u) => { const e = Math.sin(Math.PI * u); return [0.18 * Math.sin(6 * Math.PI * u) * e, 0, 0]; } })
      .Sy(-2 * R2 + Rb, 1.55, { ev: [[0.15, 'sturz']], mark: 'sturz' })
      .P(Rb, 90, 1.3)
      .P(R2, 180, 0.75, { ev: [[0.2, 'zieh']] })
      .S(2.0, 0.85, { roll: Math.PI, ev: [[0.1, 'rolle']] })
      .S(0.3, 1).fertig('hammerhead'));
}

// 4) Kubanische Acht: liegende 8 aus zwei ¾-Loopings, im 45°-Abwärtsstück je eine halbe Rolle
{
  const R = 2.5;
  add({ id: 'kubanisch', info: 'Zwei große Loopings nebeneinander, dazwischen je eine halbe Rolle – am Himmel steht dann eine liegende Acht.', name: 'Kubanische Acht', sub: 'eine liegende Acht in die Luft malen!', emoji: '♾️', dur: 6.8, spd: 0.34, cam: 1.45, camD: 1.6, smoke: 'RAUCH_RB' },
    bahn().S(0.4, 1)
      .P(R, 225, 0.85, { ev: [[0, 'zieh']] })
      .S(2 * R, 1.15, { roll: Math.PI, at: [0.25, 0.75], mark: 'roll1', ev: [[0.25, 'rolle']] })
      .P(R, 270, 0.85, { ev: [[0.3, 'zieh']] })
      .S(2 * R, 1.15, { roll: Math.PI, at: [0.25, 0.75], mark: 'roll2', ev: [[0.25, 'rolle']] })
      .P(R, 45, 1.0)
      .S(0.4, 1).fertig('kubanisch'));
}

// 5) Fassrolle (Barrel Roll): Rolle um eine gedachte Röhre – die Bahn schraubt sich versetzt um die Fluglinie
{
  const R = 2.1, len = 10.5;
  add({ id: 'fassrolle', info: 'Eine Rolle um ein unsichtbares Fass: man schraubt sich in einem großen Kreis rund um die Fluglinie.', name: 'Fassrolle', sub: 'rund um ein unsichtbares Fass!', emoji: '🛢️', dur: 3.6, spd: 0.79, cam: 0.5, camD: 1.2, smoke: 'RAUCH_RB', camTh: 0.8, camY: 2.2, camF: 0.6, camDist: 8 },
    bahn().S(0.4, 1)
      .fn(len, 1.0, (u, o) => { const a = TAU * ease(u); return o.set(R * Math.sin(a), R * (1 - Math.cos(a)), len * u); },
        { roll: TAU, mark: 'fass', ev: [[0.02, 'rolle'], [0.5, 'funkel']] })
      .S(0.4, 1).fertig('fassrolle'));
}

// 6) Gerissene Rolle (Snap Roll): kurz aufbäumen (Strömungsabriss-Wackler), dann blitzschnelle Rolle
add({ id: 'gerissen', info: 'Kurz die Nase hoch, und – zack – reißt man sich blitzschnell einmal um die eigene Achse.', name: 'Gerissene Rolle', sub: 'zack – blitzschnell rumgerissen!', emoji: '💥', dur: 2.4, spd: 0.98, cam: 0.35, smoke: 'RAUCH_GELB', camTh: 0.9, camY: 0.5, camF: 0.85, camDist: 5.5, snap: true },
  bahn().S(1.5, 1)
    .P(4, 10, 0.85, { flip: -0.35, at: [0, 1] })
    .S(0.7, 0.75, { wob: snapWob, ev: [[0, 'abriss']] })
    .S(1.9, 0.9, { roll: TAU, flip: 0.35, lin: true, at: [0, 0.75], mark: 'snap', ev: [[0, 'snap']] })
    .P(4, -10, 1.0)
    .S(1.5, 1).fertig('gerissen'));

// 7) Männchen (Tailslide): senkrecht hoch, stehen bleiben, ein Stück rückwärts rutschen, nach vorn umkippen, abfangen
{
  const Ra = 2.0, Rb = 2.1, top = 6.2, hp = 0.09;
  add({ id: 'maennchen', info: 'Senkrecht hoch, bis man stehen bleibt wie ein Erdmännchen – dann ein Stück rückwärts rutschen und nach vorn umkippen.', name: 'Männchen', sub: 'hoch, stehen bleiben, rückwärts rutschen!', emoji: '🦦', dur: 6.0, spd: 0.41, cam: 1.5, camD: 1.4, smoke: 'RAUCH_GRUEN', hang: true },
    bahn().S(0.5, 1)
      .P(Ra, 90, 0.75, { ev: [[0, 'zieh']] })
      .Sy(top, 0.12)
      // Kehre auf der Stelle: Bahn dreht über den Rücken nach unten, die Figur bleibt mit der Nase oben (Ausgleich im Kippen)
      .P(hp, 180, 0.05, { flip: Math.PI, lin: true, mark: 'hang', ev: [[0, 'haenge']] })
      .S(0.9, 0.42, { mark: 'rutsch', ev: [[0.1, 'rutsch']] })
      .S(1.3, 0.75, { flip: Math.PI, at: [0, 1], ev: [[0.2, 'kipp']] }) // weiter auf 2π: Nase fällt nach vorn
      .Sy(Rb, 1.5, { ev: [[0.2, 'sturz']] })
      .P(Rb, 90, 1.0)
      .S(0.3, 1).fertig('maennchen'));
}

// 8) Trudeln (Spin): steil hoch, Strömungsabriss (Wackeln), Nase kippt runter, enge Drehspirale nach unten, ausleiten
{
  const Ra = 1.8, Rp = 0.7, Rb = 1.9, turns = 2, r = 0.85, hlen = 4.8;
  add({ id: 'trudeln', info: 'Ganz langsam werden, bis die Flügel nicht mehr tragen – dann dreht man sich wie ein Ahornsamen im Kreisel nach unten.', name: 'Trudeln', sub: 'abkippen und im Kreisel runter!', emoji: '🌪️', dur: 6.4, spd: 0.34, fa: 0.2, cam: 1.0, camD: 1.45, smoke: 'RAUCH_LILA', camTh: 1.1, camY: 1.2 },
    bahn().S(0.4, 1)
      .P(Ra, 70, 0.95, { ev: [[0, 'zieh']] })
      .S(4.0, 0.8)
      .S(2.2, 0.42)
      .P(Ra, -70, 0.3)
      .S(0.7, 0.22, { wob: (u) => { const e = Math.sin(Math.PI * u); return [0.25 * Math.sin(5 * Math.PI * u) * e, -0.2 * e, 0]; }, ev: [[0, 'abriss']] })
      .P(Rp, -90, 0.55, { ev: [[0.3, 'kipp']] })
      .fn(hlen, 1.0, (u, o) => { const a = TAU * turns * ease(u), rr = r * sstep(0, 0.18, u) * (1 - sstep(0.82, 1, u)); return o.set(rr * Math.sin(a), rr * (Math.cos(a) - 1), hlen * u); },
        { mark: 'spin', ev: [[0, 'kreisel'], [0.5, 'kreisel']], wob: (u) => [0, 0.8 * Math.sin(Math.PI * Math.min(1, u * 1.25)) * (1 - sstep(0.8, 1, u)), 0] }) // Nase steil nach unten
      .Sy(Rb, 1.45, { ev: [[0.1, 'sturz']] })
      .P(Rb, 90, 1.0)
      .S(0.3, 1).fertig('trudeln'));
}

// 9) Kobra (Pugatschow): Nase reißt hoch bis fast senkrecht – die Figur fliegt dabei fast geradeaus weiter –, dann wieder flach
add({ id: 'kobra', info: 'Die Nase reißt hoch bis fast senkrecht, wie eine Kobra, die sich aufrichtet – und trotzdem fliegt man fast geradeaus weiter.', name: 'Kobra', sub: 'aufbäumen wie eine Schlange!', emoji: '🐍', dur: 3.0, spd: 0.88, cam: 1.45, camD: 1.1, smoke: 'RAUCH_GRUEN', camF: 0.85, camDist: 6 },
  bahn().S(1.2, 1)
    .P(5, 8, 0.8)
    .S(1.9, 0.35, { flip: -1.65, at: [0, 0.45], mark: 'kobra', ev: [[0, 'kobra']] })
    .S(1.2, 0.5, { flip: 1.65, at: [0, 1] })
    .P(5, -8, 0.9)
    .S(1.2, 1).fertig('kobra'));

// 10) Messerflug: auf die Flügelkante gerollt, ein Stück so gleiten, zurückrollen
add({ id: 'messerflug', info: 'Auf die Seite gerollt, die Flügel stehen senkrecht – man gleitet auf der Flügelkante wie ein Messer durch die Luft.', name: 'Messerflug', sub: 'auf der Flügelkante gleiten!', emoji: '🔪', dur: 2.8, spd: 0.98, cam: 0.15, smoke: 'RAUCH_BLAU', camTh: 0.45, camY: 1.1, camF: 0.85, camDist: 5.5 },
  bahn().S(0.6, 1)
    .S(1.6, 1, { roll: Math.PI / 2, ev: [[0.1, 'rolle']] })
    .Y(9, 12, 1.0, { mark: 'messer', ev: [[0.2, 'funkel']] })
    .Y(9, -12, 1.0)
    .S(1.6, 1, { roll: -Math.PI / 2 })
    .S(0.6, 1).fertig('messerflug'));

// 11) Avalanche: Looping mit einer gerissenen Rolle ganz oben
{
  const R = 2.6, a = 360;
  add({ id: 'avalanche', info: 'Ein Looping mit Überraschung: ganz oben, kopfüber, kommt noch eine blitzschnelle gerissene Rolle dazu.', name: 'Avalanche', sub: 'Looping mit Blitz-Rolle oben!', emoji: '🎢', dur: 4.6, spd: 0.42, cam: 1.4, camD: 1.3, smoke: 'RAUCH_RB', snap: true },
    bahn().S(0.5, 1)
      .P(R, 150, 0.7, { ev: [[0, 'zieh']] })
      .P(R, 60, 0.65, { roll: TAU, lin: true, at: [0.05, 0.95], wob: snapWob, mark: 'snap', ev: [[0.05, 'snap']] })
      .P(R, a - 210, 1.0)
      .S(0.5, 1).fertig('avalanche'));
}

// 12) Humpty Bump: senkrecht hoch, kleiner halber Looping über den Rücken, senkrecht runter, abfangen
{
  const Ra = 2.0, Rb = 2.1, top = 6.0, rh = 0.9;
  add({ id: 'humpty', info: 'Senkrecht hoch, oben ein kleiner Buckel wie beim Kamel, senkrecht wieder runter – fertig ist der Humpty Bump.', name: 'Humpty Bump', sub: 'hoch, Buckel, runter!', emoji: '🐫', dur: 5.0, spd: 0.42, cam: 1.5, camD: 1.35, smoke: 'RAUCH_GELB' },
    bahn().S(0.5, 1)
      .P(Ra, 90, 0.7, { ev: [[0, 'zieh']] })
      .Sy(top, 0.45)
      .P(rh, 180, 0.4, { mark: 'buckel', ev: [[0.1, 'funkel']] })
      .Sy(Rb, 1.5, { ev: [[0.2, 'sturz']] })
      .P(Rb, 90, 1.0)
      .S(0.3, 1).fertig('humpty'));
}

// 13) Lomcovák: Taumel-Überschlag – im Steigflug kopfüber purzeln, dann abfangen
add({ id: 'lomcovak', info: 'Der wildeste Trick aus Tschechien: man purzelt und taumelt Hals über Kopf durch die Luft und fängt sich dann wieder.', name: 'Lomcovák', sub: 'wild durch die Luft purzeln!', emoji: '🤪', dur: 5.2, spd: 0.55, cam: 1.2, camD: 1.25, smoke: 'RAUCH_LILA', camF: 0.6, camDist: 6.5, camY: 0.6 },
  bahn().S(0.5, 1)
    .P(2.0, 60, 0.7, { ev: [[0, 'zieh']] })
    .S(3.2, 0.3)
    .P(1.6, -120, 0.25, { flip: -2 * TAU, roll: TAU, twirl: TAU, at: [0.0, 1.0], mark: 'taumel', ev: [[0.02, 'taumel'], [0.5, 'taumel']] })
    .S(3.2, 1.3)
    .P(2.0, 60, 1.0)
    .S(0.3, 1).fertig('lomcovak'));

// ---------------------------------------------------------------- Flugshow (seltene Sieger-Einlage, v3.0)
// Kür aus drei Figuren in einem Zug: Immelmann (halber Looping + halbe Rolle) → Fassrolle auf der Rückweg-Geraden →
// Split-S (halbe Rolle + halber Looping abwärts) – endet wieder auf der Fluglinie in alter Richtung.
// Teile (für den Fan-Cam-Clip): Anfang/Höhepunkt je Figur als Marken f1/h1 … f3/h3
{
  const R = 2.2, len = 7.6, Rf = 1.5;
  const kuer = figur({ id: 'flugshow', info: 'Die große Kür: Immelmann, Fassrolle und Split-S in einem Zug – als Clip mit eigenem Beat.', name: 'Flugshow', sub: 'Immelmann, Fassrolle, Split-S!', emoji: '🛩️', dur: 6.4, spd: 0.1, cam: 1.4, camD: 1.4, smoke: 'RAUCH_RB', show: true,
    teile: [{ name: 'Immelmann', emoji: '✨', f: 'f1', h: 'h1' }, { name: 'Fassrolle', emoji: '💫', f: 'f2', h: 'h2' }, { name: 'Split-S', emoji: '🔥', f: 'f3', h: 'h3' }] },
    bahn().S(0.5, 1)
      .P(R, 180, 0.6, { mark: 'f1', ev: [[0, 'zieh']] })
      .S(1.7, 0.7, { roll: Math.PI, mark: 'h1', ev: [[0.1, 'rolle']] })
      .S(0.5, 0.9)
      .fn(len, 1.0, (u, o) => { const a = TAU * ease(u); return o.set(Rf * Math.sin(a), Rf * (1 - Math.cos(a)), len * u); },
        { roll: TAU, mark: 'f2', ev: [[0.02, 'rolle'], [0.5, 'funkel']] })
      .S(0.5, 0.85)
      .S(1.6, 0.8, { roll: Math.PI, mark: 'f3', ev: [[0.1, 'rolle']] })
      .P(R, 180, 1.35, { mark: 'h3', ev: [[0.3, 'sturz']] })
      .S(0.4, 1).fertig('flugshow'));
  kuer.kf.marks.h2 = kuer.kf.marks.f2 + 0.55 * ((kuer.kf.marks.f3 ?? 1) - kuer.kf.marks.f2); // Fassrolle: Mitte (kopfüber)
  kuer.kf.marks.h1 += 0.04; kuer.kf.marks.h3 += 0.06;
  DEFS_SHOW.push(kuer);
}

// Höhepunkt je Figur (Anteil der Kern-Bahn) → hi (p der Sieger-Version bei mittlerem Tempo)
const HI = { immelmann: 'roll', splits: 'unten', hammerhead: 'hang', kubanisch: 'roll1', fassrolle: 'fass', gerissen: 'snap', maennchen: 'hang',
  trudeln: 'spin', kobra: 'kobra', messerflug: 'messer', avalanche: 'snap', humpty: 'buckel', lomcovak: 'taumel' };
const HI_OFF = { immelmann: 0.06, hammerhead: 0.04, maennchen: 0.03, fassrolle: 0.15, trudeln: 0.08, kobra: 0.08, avalanche: 0.05, lomcovak: 0.08, messerflug: 0.1, humpty: 0.06, kubanisch: 0.04, gerissen: 0.05, splits: 0 };
export const KUNSTFLUG = DEFS;
export const FLUGSHOW = DEFS_SHOW[0];
HI.flugshow = 'h1';
export function kunstHi(d, base = 7, durK = 1.25, amp = 1.2) {
  const S = { L: base * d.spd * d.dur * durK, amp, def: d };
  const m = d.kf.marks[HI[d.id]] ?? 0.5;
  return d.coreP(S, Math.min(1, m + (HI_OFF[d.id] || 0)));
}
for (const d of [...DEFS, ...DEFS_SHOW]) d.hi = +kunstHi(d).toFixed(3);
export { loese, at as kunstAt, cache as kunstCache };

// ---------------------------------------------------------------- Kamera-Hilfen (player.js)
// Mitte der Figur (lokal, ohne Hub): beim Ein-/Ausleiten folgt sie der Figur, in der Figur steht sie still (Kernmitte) –
// so sieht man die ganze Figur samt Rauchspur wie von der Zuschauerwiese aus.
export function kunstMitte(S, p, out) {
  const K = S.def.kf, C = cache(S, K), b = K.box, amp = C.amp;
  const z = at(K, C, p, S.side).z, zm = C.a + amp * (b.z0 + b.z1) / 2;
  const w = sstep(C.pC0 - 0.06, C.pC0 + 0.04, p) * (1 - sstep(C.pC1 - 0.04, C.pC1 + 0.1, p));
  return out.set(S.side * amp * (b.x0 + b.x1) / 2 * w, amp * (b.y0 + b.y1) / 2 * w, z + (zm - z) * w);
}
export function kunstRadius(S) {
  const b = S.def.kf.box, amp = S.amp || 1;
  S.Rb = { x: amp * (b.x1 - b.x0) / 2, y: amp * (b.y1 - b.y0) / 2, z: amp * (b.z1 - b.z0) / 2 }; // halbe Ausdehnung (Kamera-Abstand)
  return Math.max(1.6, S.Rb.x, S.Rb.y, S.Rb.z);
}
// Ende der Figur in p (danach Ausleit-Gerade) – Kamera schwenkt bis dahin zur Seite
export function kunstEnde(S) { return cache(S, S.def.kf).pC1; }
