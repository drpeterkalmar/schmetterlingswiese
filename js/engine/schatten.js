// v2.9 Schatten ohne Schattenkarte (Audit #6): gerichteter Kontaktschatten unter Figur und Tieren + gebackene Baumschatten
// als Bodentextur je Welt. Reine Rechnung ohne three.js (Node-Test tests/node/test_schatten.mjs).
// ?kontakt=0 = runder Blob wie bis v2.8, keine Baumschatten.
export const KONTAKT_AN = typeof location !== 'undefined' && new URLSearchParams(location.search).get('kontakt') !== '0';
const klemme = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const ss = (a, b, x) => { const t = klemme((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// Sonne → Richtung des Schattens am Boden (weg von der Sonne) und Länge (flache Sonne = langer Schatten)
export function sonnenSchatten(sonne) {
  const el = Math.asin(klemme(sonne[1], 0.08, 1)), cot = 1 / Math.tan(el);
  const h = Math.hypot(sonne[0], sonne[2]) || 1;
  return { dx: -sonne[0] / h, dz: -sonne[2] / h, cot, el };
}

// Kontaktschatten einer Figur in Höhe `hoehe` über dem Boden (m), Größe 1 = bisheriger Blob (Radius 0,9 m):
// weiche Ellipse, längs zur Schattenseite gestreckt (Sonne flach → bis 1,8×), leicht dorthin versetzt (je höher, desto
// weiter – aber gedämpft: der Schatten soll beim Fliegen und Landen die Position unter der Figur zeigen). Größe und
// Deckkraft mit der Höhe wie bisher (1,1 → 0,35; 0,4 → 0,05).
export function kontaktParameter(sonne, hoehe, groesse = 1) {
  const S = sonnenSchatten(sonne), hh = Math.max(0, hoehe);
  const lang = klemme(1 + 0.32 * S.cot, 1, 1.8);
  const s = klemme(1.1 - hh * 0.03, 0.35, 1.1) * groesse;
  const versatz = Math.min(1.6, Math.min(hh, 4) * S.cot * 0.2) + 0.35 * (lang - 1) * s;
  return { x: S.dx * versatz, z: S.dz * versatz, breite: s, laenge: s * lang, yaw: Math.atan2(S.dx, S.dz), alpha: klemme(0.4 - hh * 0.012, 0.05, 0.4), lang };
}

// Kronen je Baumart (Höhe der Kronenmitte, Radius) bei Maßstab 1 – aus treeGeo() in nature.js abgelesen
export const KRONE = { round: { y: 4.4, r: 2.2 }, birch: { y: 5.6, r: 1.5 }, cherry: { y: 4.6, r: 2.1 } };
export const BAUM_TEX = { groesse: 512, welt: 320 }; // 512² Texel über 320 m → 0,63 m je Texel (R8 = 256 KB)

// Baumschatten backen: baeume = [{ x, z, s, kind }], sonne = Richtung zur Sonne. Liefert Uint8Array N·N (Zeile j = z,
// Spalte i = x; Texel-Mitte x = (i + ½)/N·W − W/2 – passt zu uv = p/W + ½ im Shader).
export function backeBaumschatten(baeume, sonne, o = {}) {
  const N = o.groesse ?? BAUM_TEX.groesse, W = o.welt ?? BAUM_TEX.welt, px = W / N;
  const daten = new Uint8Array(N * N);
  const S = sonnenSchatten(sonne), sinEl = Math.sin(S.el);
  const stempel = (cx, cz, laengs, quer, staerke, kern) => {
    const R = Math.max(laengs, quer) + px;
    const i0 = Math.max(0, Math.floor((cx - R + W / 2) / px)), i1 = Math.min(N - 1, Math.ceil((cx + R + W / 2) / px));
    const j0 = Math.max(0, Math.floor((cz - R + W / 2) / px)), j1 = Math.min(N - 1, Math.ceil((cz + R + W / 2) / px));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const x = (i + 0.5) * px - W / 2 - cx, z = (j + 0.5) * px - W / 2 - cz;
      const u = x * S.dx + z * S.dz, v = -x * S.dz + z * S.dx;   // längs / quer zur Schattenrichtung
      const q = Math.sqrt((u / laengs) ** 2 + (v / quer) ** 2);
      if (q >= 1) continue;
      const a = (1 - ss(kern, 1, q)) * staerke;
      const k = j * N + i, w = Math.round(255 * a);
      if (w > daten[k]) daten[k] = w;
    }
  };
  for (const b of baeume) {
    const K = KRONE[b.kind] || KRONE.round, sc = b.s || 1, y = K.y * sc, r = K.r * sc;
    const off = y * S.cot;
    // Kronenschatten: auf den Boden projiziert, längs um 1/sin(Höhe) gestreckt (höchstens 2,6×)
    stempel(b.x + S.dx * off, b.z + S.dz * off, r * Math.min(2.6, 1 / sinEl), r, 0.85, 0.45);
    // Fuß: dunkler Fleck am Stamm (Kontakt, verbindet Stamm und Kronenschatten optisch)
    // (mind. 2 Texel breit, sonst verschwindet er zwischen den Texeln)
    stempel(b.x + S.dx * 0.4 * sc, b.z + S.dz * 0.4 * sc, 1.5 * sc, 1.1 * sc, 0.6, 0.15);
  }
  return { daten, N, W };
}
