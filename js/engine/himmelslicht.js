// v2.9 Weiches Himmelslicht (Audit #5): Umgebungslicht als Kugelflächenfunktionen 2. Ordnung (SH9) aus dem prozeduralen
// Himmel der Welt statt der festen Halbkugel uSkyAmb/uGndAmb. Figuren und Blüten bekommen so die Farbe ihres Himmels
// (Abendrot von der Sonnenseite, kühles Blau von oben, Wiesengrün von unten) – der Toon-Look bleibt (nur der Umgebungsteil).
// Reine Rechnung ohne three.js (Node-Test tests/node/test_himmelslicht.mjs); einmal je Welt beim Bauen (≈ 2 000 Proben).
//
// Ablauf: Strahldichte L(d) wie im Himmels-Shader (gfx.js SKY_F, ohne Sonnenscheibe – die ist das direkte Licht),
// unten Bodenrückstrahlung (Wiesenfarbe × Sonne + Himmel) → SH9-Projektion → Faltung mit dem Kosinus (Irradianz,
// Ramamoorthi/Hanrahan) → Helligkeit so skaliert, dass das MITTEL der bisherigen Umgebungshelligkeit gleich bleibt
// (Belichtung wie bisher, nur Farbe und Richtung neu). Im Shader: amb = mix(alt, E(N), uHimmel).

// SH-Basis (reell, 9 Koeffizienten) an Richtung (x, y, z), normiert
export function shBasis(x, y, z, out = new Float64Array(9)) {
  out[0] = 0.282095;
  out[1] = 0.488603 * y; out[2] = 0.488603 * z; out[3] = 0.488603 * x;
  out[4] = 1.092548 * x * y; out[5] = 1.092548 * y * z; out[6] = 0.315392 * (3 * z * z - 1);
  out[7] = 1.092548 * x * z; out[8] = 0.546274 * (x * x - y * y);
  return out;
}
// Projektion einer Farbfunktion f(x, y, z) → [r, g, b] auf SH9 (Raster über die Kugel, gewichtet nach Raumwinkel)
export function shProjektion(f, nTheta = 32, nPhi = 64) {
  const sh = Array.from({ length: 9 }, () => [0, 0, 0]), b = new Float64Array(9);
  const dT = Math.PI / nTheta, dP = 2 * Math.PI / nPhi;
  for (let i = 0; i < nTheta; i++) {
    const th = (i + 0.5) * dT, st = Math.sin(th), ct = Math.cos(th), w = st * dT * dP;
    for (let j = 0; j < nPhi; j++) {
      const ph = (j + 0.5) * dP, x = st * Math.cos(ph), z = st * Math.sin(ph), y = ct;
      const c = f(x, y, z);
      shBasis(x, y, z, b);
      for (let k = 0; k < 9; k++) { const q = b[k] * w; sh[k][0] += c[0] * q; sh[k][1] += c[1] * q; sh[k][2] += c[2] * q; }
    }
  }
  return sh;
}
// Kosinus-Faltung: Strahldichte-SH → Irradianz-SH, durch π geteilt (= „mittlere Strahldichte“, gleiche Einheit wie uSkyAmb)
const A = [1, 2 / 3, 2 / 3, 2 / 3, 1 / 4, 1 / 4, 1 / 4, 1 / 4, 1 / 4];
export function irradianzSH(sh) { return sh.map((c, k) => c.map((v) => v * A[k])); }
export function auswerten(sh, x, y, z) {
  const b = shBasis(x, y, z), o = [0, 0, 0];
  for (let k = 0; k < 9; k++) for (let c = 0; c < 3; c++) o[c] += sh[k][c] * b[k];
  return o;
}
export const luma = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// Himmel der Welt (lineare Farben [r, g, b]): zenit, horizont, glow, sonne (Richtung zur Sonne), sonnenFarbe (Licht),
// boden (Wiesen-Albedo), alt: { himmel, boden } = bisherige uSkyAmb/uGndAmb (für die Helligkeit)
export function himmelsStrahldichte(p) {
  const S = p.sonne, sy = Math.max(0, S[1]);
  // mittlere Himmelsfarbe für den Boden-Widerschein
  const himmelMittel = mix3(p.horizont, p.zenit, 0.5);
  return (x, y, z) => {
    if (y >= 0) {
      let c = mix3(p.horizont, p.zenit, Math.pow(ss(-0.05, 0.75, y), 0.8));
      const sd = Math.max(0, x * S[0] + y * S[1] + z * S[2]);
      const g = Math.pow(sd, 10) * 0.2 + Math.pow(sd, 64) * 0.35 + 0.25 * Math.pow(1 - Math.abs(y), 6) * Math.pow(sd * 0.5 + 0.5, 4);
      return [c[0] + p.glow[0] * g, c[1] + p.glow[1] * g, c[2] + p.glow[2] * g];
    }
    // unten: Wiese wirft Sonne und Himmel zurück (nach unten dunkler werdend)
    const k = 0.55 + 0.45 * ss(-1, 0, y);
    return [0, 1, 2].map((i) => p.boden[i] * (p.sonnenFarbe[i] * sy * 0.6 + himmelMittel[i] * 0.4) * k);
  };
}

// SH9-Irradianz für den Shader: 9 × [r, g, b], Mittel-Helligkeit wie die alte Halbkugel (alt.himmel oben, alt.boden unten)
export function himmelsLicht(p, o = {}) {
  const sh = irradianzSH(shProjektion(himmelsStrahldichte(p), o.nTheta || 24, o.nPhi || 48));
  // Mittelwert der alten Halbkugel-Umgebung über alle Normalen: mix(boden, himmel, N.y·½+½) → ½(boden + himmel)
  const altMittel = luma(mix3(p.alt.boden, p.alt.himmel, 0.5));
  const neuMittel = luma(sh[0]) * 0.282095;   // DC-Anteil = Mittel über die Kugel
  const k = neuMittel > 1e-6 ? altMittel / neuMittel : 1;
  return sh.map((c) => c.map((v) => v * k));
}
