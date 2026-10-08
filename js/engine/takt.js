// v2.9 Fester Simulationstakt (Audit #8): Flug, Spiel und Effekt-Partikel rechnen in festen 60-Hz-Schritten, gezeichnet
// wird zwischen den letzten beiden Schritten interpoliert (Figur, Kamera, Schatten). So fliegt die Figur auf 60-, 90-, 120-
// und 144-Hz-Bildschirmen und bei Rucklern exakt gleich (bis v2.8 hing das Flugverhalten am variablen dt).
// Reine Logik ohne DOM (Node-Test tests/node/test_takt.mjs). ?takt=0 = variables dt wie bis v2.8.
export const TAKT_HZ = 60;

export class Takt {
  // h = Schrittweite (s); max = höchstens so viele Schritte je Bild (danach Rückstand verwerfen – wie bisher dt ≤ 50 ms);
  // fang = Einrasten: Bildabstand innerhalb ±fang eines Vielfachen von h zählt als genau dieses Vielfache (rAF-Zittern
  // auf 60/120-Hz-Schirmen erzeugt sonst abwechselnd 0 und 2 Schritte)
  constructor(o = {}) {
    this.h = o.h ?? 1 / TAKT_HZ;
    this.max = o.max ?? 3;
    this.fang = o.fang ?? 0.002;
    this.acc = 0; this.alpha = 0; this.schritteGesamt = 0;
  }
  // Bildabstand dt (s) → Anzahl fester Schritte; setzt alpha (0…1) = Anteil des nächsten Schritts für die Interpolation
  schritte(dt) {
    const h = this.h;
    if (!(dt > 0)) { this.alpha = this.acc / h; return 0; }
    dt = Math.min(dt, 0.25);
    const k = Math.round(dt / h);
    if (k >= 1 && Math.abs(dt - k * h) < this.fang) dt = k * h;
    this.acc += dt;
    let n = Math.floor(this.acc / h + 1e-9);
    if (n > this.max) { n = this.max; this.acc = 0; } else this.acc = Math.max(0, this.acc - n * h);
    this.alpha = Math.min(1, this.acc / h);
    this.schritteGesamt += n;
    return n;
  }
  zuruecksetzen() { this.acc = 0; this.alpha = 0; }
}

// Interpolation der Darstellung: je Eintrag ein Objekt mit position/quaternion (+ optional Euler-Zustand, der von der
// Glättung im nächsten Schritt wieder gelesen wird – deshalb nach dem Zeichnen exakt zurückgesetzt).
// Nutzung je Bild: vor jedem Schritt merkeVorher(), nach den Schritten merkeNachher() (nur wenn ≥ 1 Schritt),
// anwenden(alpha) vor dem Zeichnen, zurueck() nach dem Zeichnen.
export class Darstellung {
  constructor(V3, Q) { this.V3 = V3; this.Q = Q; this.liste = []; this.bereit = false; }
  // o: Object3D (position, quaternion, rotation); fov: true = Kamera-Sichtwinkel mit
  hinzu(o, opt = {}) {
    const V3 = this.V3, Q = this.Q;
    this.liste.push({ o, fov: !!opt.fov, nurPos: !!opt.nurPos, p0: new V3(), p1: new V3(), q0: new Q(), q1: new Q(), e1: [0, 0, 0], f0: 0, f1: 0 });
    return this;
  }
  setze(o, i) { const e = this.liste[i]; if (e) e.o = o; }
  merkeVorher() { for (const e of this.liste) if (e.o) { e.p0.copy(e.o.position); e.q0.copy(e.o.quaternion); if (e.fov) e.f0 = e.o.fov; } }
  merkeNachher() {
    for (const e of this.liste) if (e.o) {
      e.p1.copy(e.o.position); e.q1.copy(e.o.quaternion);
      const r = e.o.rotation; e.e1[0] = r.x; e.e1[1] = r.y; e.e1[2] = r.z;
      if (e.fov) e.f1 = e.o.fov;
    }
    this.bereit = true;
  }
  anwenden(alpha) {
    if (!this.bereit) return;
    for (const e of this.liste) if (e.o) {
      e.o.position.lerpVectors(e.p0, e.p1, alpha);
      if (!e.nurPos) e.o.quaternion.slerpQuaternions(e.q0, e.q1, alpha);
      if (e.fov) { e.o.fov = e.f0 + (e.f1 - e.f0) * alpha; e.o.updateProjectionMatrix(); }
    }
  }
  zurueck() {
    if (!this.bereit) return;
    for (const e of this.liste) if (e.o) {
      e.o.position.copy(e.p1);
      if (!e.nurPos) e.o.rotation.set(e.e1[0], e.e1[1], e.e1[2]); // Euler exakt (Glättung liest rotation.x/z)
      if (e.fov) { e.o.fov = e.f1; e.o.updateProjectionMatrix(); }
      // Matrizen auch zurück: zwischen zwei Bildern liest das Spiel (Zielanzeige, Projektionen) camera.matrixWorld –
      // sie soll wie bis v2.8 zum Simulationszustand passen, nicht zum gezeichneten Zwischenstand
      if (e.o.updateMatrixWorld) e.o.updateMatrixWorld();
    }
  }
  vergessen() { this.bereit = false; }
}
