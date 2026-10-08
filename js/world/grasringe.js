// v2.9 Gras in Ringen mit Kachel-Culling (Audit #4/#7) – reine Logik, ohne three.js (in Node testbar:
// tests/node/test_grasringe.mjs). Bis v2.8: EIN Halmfeld (64 m, folgt der Kamera) mit frustumCulled = false → jeder Halm
// lief jedes Bild durch den Vertex-Shader, auch hinter der Kamera.
// Jetzt:
//   • nah   – volle Halme, 1,4–1,6× so dicht wie bisher, Feld 40 m, Radius bis 16 m um die Ringmitte
//   • Mitte – knapp halbe Dichte, breitere Büschel, Feld 80 m, 12–31 m (Überblendung 12–16 m mit dem Nahring)
//   • fern  – keine Halme, nur Grasrauschen im Gelände-Shader (gfx.js TERRAIN_F, #ifdef RINGE)
// Kachel-Culling: Jedes Feld ist in Kacheln geteilt (Halme sind je Kachel sortiert, innerhalb der Kachel zufällig). Je Bild
// werden die Kacheln gegen den Sichtkegel und den Ring geprüft; ändert sich die sichtbare Menge, werden die Halme der
// sichtbaren Kacheln vorn in den Instanz-Puffer kopiert (instanceCount = Summe) → weiter 1 Draw-Call je Ring.
// Die Stufe bestimmt den Anteil je Kachel (die ersten k Halme jeder Kachel = gleichmäßige Ausdünnung).

export const RINGE = {
  nah: { feld: 40, kacheln: 8, rIn: [-1, 0], rOut: [12, 16], breite: 1.0 }, // rIn [-1, 0]: kein Loch (smoothstep braucht a < b)
  mitte: { feld: 80, kacheln: 10, rIn: [12, 16], rOut: [24, 31], breite: 1.7 },
};
// Halme je Stufe [nah, Mitte] (bis v2.8: ein Feld 64 m mit 4 500 / 8 000 / 16 000 → 1,1 / 2,0 / 3,9 je m²).
// Nah: Hoch 1,4-fache, Niedrig/Mittel 1,6-fache Dichte; Mitte knapp halbe Dichte. Gezeichnet wird nur, was in Ring UND
// Sichtkegel liegt: im Mittel-Profil ≈ 45 % (hoch) bis 75 % (quer) der bisherigen Halmzahl, nah trotzdem dichter.
// Heavy-Job (Messung CPU ×4, DPR 2,6, quer): Hoch mit 12 500/12 500 war 0,6 ms (+11 %) langsamer als das alte Feld –
// das doppelt dichte Nahgras kostet auf Hoch (DPR 2 + MSAA 4) vor allem Pixel. Mit 9 000/11 000 gleich schnell wie
// vorher, nah immer noch 1,4× so dicht wie bis v2.8. Niedrig/Mittel (1,6× nah) lagen im Messrauschen.
export const RING_ANZAHL = [[2800, 3500], [5000, 6250], [9000, 11000]];
export const RING_MAX = [9000, 11000];
// Ringmitte: so weit vor der Figur (bisher Feldmitte 9 m davor; die Kamera muss im Nahring liegen)
export const RING_VOR = 5;

// Gleiche Abbildung wie im Shader: Basisposition im Feld → Weltposition um die Mitte c (Feld wandert mit, Kacheln wickeln)
export function wickeln(b, c, F) {
  const v = b - c + F * 0.5;
  return v - Math.floor(v / F) * F - F * 0.5 + c;
}
// Wickel-Mitte aufs Kachelraster gerastet: die Naht (Mitte ± F/2) fällt dann immer auf eine Kachelgrenze, keine Kachel
// wird geteilt (sonst läge ein Teil der Halme auf der Gegenseite, außerhalb der geprüften Kugel). Die Ring-Ausblendung
// rechnet weiter mit der echten Mitte; der Ring passt mit Rand (F/2 − Kachel·√½ ≥ rOut) ins Fenster.
export function wickelMitte(c, R) { const k = R.feld / R.kacheln; return Math.round(c / k) * k; }

// Zufallszahlen für die Halme (deterministisch je Ring) → Float32Array n·4 (x, z in [0,1), Zufall, Größe), nach Kacheln
// sortiert; bereiche[k] = [start, anzahl] (Instanzen) der Kachel k = j·T + i
export function baueHalme(n, T, rnd) {
  const roh = [];
  for (let i = 0; i < n; i++) {
    const x = rnd(), z = rnd(), r = rnd(), s = 0.3 + rnd() * 0.25 + rnd() * rnd() * 0.45;
    roh.push([x, z, r, s, Math.min(T - 1, Math.floor(z * T)) * T + Math.min(T - 1, Math.floor(x * T))]);
  }
  roh.sort((a, b) => a[4] - b[4]);
  const daten = new Float32Array(n * 4), bereiche = Array.from({ length: T * T }, () => [0, 0]);
  roh.forEach((h, i) => { daten.set(h.slice(0, 4), i * 4); const B = bereiche[h[4]]; if (!B[1]) B[0] = i; B[1]++; });
  return { daten, bereiche, n, T };
}

// Ebene = [nx, ny, nz, c] (innen: n·p + c ≥ 0, wie THREE.Plane). Kugel sichtbar, wenn sie vor keiner Ebene ganz draußen liegt.
export function kugelSichtbar(ebenen, x, y, z, r) {
  for (const e of ebenen) if (e[0] * x + e[1] * y + e[2] * z + e[3] < -r) return false;
  return true;
}

// Quader [x0, y0, z0, x1, y1, z1] sichtbar (p-Ecke je Ebene: die am weitesten innen liegende Ecke)
export function quaderSichtbar(ebenen, x0, y0, z0, x1, y1, z1) {
  for (const e of ebenen) {
    if (e[0] * (e[0] > 0 ? x1 : x0) + e[1] * (e[1] > 0 ? y1 : y0) + e[2] * (e[2] > 0 ? z1 : z0) + e[3] < 0) return false;
  }
  return true;
}
// Rand je Kachel: seitlich Wind-/Figurbiegung (≤ 1,5 m), oben Halmhöhe (≤ 1,2 m), unten Weltkrümmung (bendW senkt bis
// ≈ 0,9 m bei 31 m) – Gelände aus 5 Stichproben je Kachel ± 0,6 m (Wellen sind länger als eine Kachel).
export const KACHEL_RAND = { seite: 1.6, oben: 1.3, unten: 1.2, gelaende: 0.6 };

// Sichtbare Kacheln eines Rings: Mitte c = [cx, cz], hoehe(x, z) = Gelände, ebenen = Sichtkegel (oder null = alle).
// Konservativ: lieber eine Kachel zu viel (Eigenschaftstest: kein sichtbarer Halm fehlt).
// hb = optionaler Merker (Map) für die Geländehöhen je Kachel: die Kachelmitten liegen auf einem festen Weltraster
// (wickelMitte), die 5 Höhen-Stichproben je Kachel ändern sich also nie – bis zum Heavy-Job-Messen kosteten sie 90 % der
// Culling-Zeit (164 Kacheln × 5 × height() ≈ 0,3 ms je Bild bei CPU ×4). Je Welt ein neuer Merker (Gelände wechselt).
// out = optionale Liste zum Wiederverwenden (je Bild keine neue Liste)
export function sichtbareKacheln(R, c, ebenen, hoehe, rand = KACHEL_RAND, hb = null, out = []) {
  const F = R.feld, T = R.kacheln, k = F / T, rK = k * Math.SQRT1_2, h = k * 0.5;
  const aussen = R.rOut[1] + rK, aussen2 = aussen * aussen, loch = R.rIn[1] > 0 ? Math.max(0, R.rIn[0] - rK) : 0, loch2 = loch * loch;
  const cx = c[0], cz = c[1], rs = rand.seite, ru = rand.gelaende + rand.unten, ro = rand.gelaende + rand.oben;
  out.length = 0;
  const mx = wickelMitte(cx, R), mz = wickelMitte(cz, R);
  for (let j = 0; j < T; j++) {
    const wz = wickeln((j + 0.5) * k, mz, F), dz = wz - cz;
    for (let i = 0; i < T; i++) {
      const wx = wickeln((i + 0.5) * k, mx, F), dx = wx - cx, d2 = dx * dx + dz * dz;
      if (d2 > aussen2) continue;                       // ganz außerhalb des Rings (Ecken des Feldes)
      if (loch > 0 && d2 < loch2) continue;             // ganz im Loch (Mittelring: dort steht der Nahring)
      if (ebenen) {
        const x0 = wx - h, x1 = wx + h, z0 = wz - h, z1 = wz + h;
        const key = hb ? Math.round(wx / k - 0.5) * 65536 + Math.round(wz / k - 0.5) : 0;
        let lohi = hb ? hb.get(key) : null;
        if (!lohi) {
          const a = hoehe(wx, wz), b = hoehe(x0, z0), e = hoehe(x1, z0), f = hoehe(x0, z1), g = hoehe(x1, z1);
          lohi = [Math.min(a, b, e, f, g), Math.max(a, b, e, f, g)];
          if (hb) hb.set(key, lohi);
        }
        if (!quaderSichtbar(ebenen, x0 - rs, lohi[0] - ru, z0 - rs, x1 + rs, lohi[1] + ro, z1 + rs)) continue;
      }
      out.push(j * T + i);
    }
  }
  return out;
}

// Halme der sichtbaren Kacheln vorn in ziel kopieren; anteil = Stufe / Maximum. Liefert die Instanzzahl.
export function verdichte(halme, kacheln, anteil, ziel) {
  const { daten, bereiche } = halme;
  let n = 0;
  for (const k of kacheln) {
    const [s, len] = bereiche[k], m = Math.round(len * Math.max(0, Math.min(1, anteil)));
    ziel.set(daten.subarray(s * 4, (s + m) * 4), n * 4);
    n += m;
  }
  return n;
}

// Schlüssel der sichtbaren Menge (Neu-Kopieren nur bei Änderung)
export const mengenSchluessel = (kacheln, anteil) => kacheln.join(',') + '|' + anteil.toFixed(4);
// Gleiche Menge wie beim letzten Mal? (ohne Text-Schlüssel je Bild; alt = { k: Int16Array, n, anteil })
export function gleicheMenge(alt, kacheln, anteil) {
  if (alt.n !== kacheln.length || alt.anteil !== anteil) return false;
  for (let i = 0; i < kacheln.length; i++) if (alt.k[i] !== kacheln[i]) return false;
  return true;
}
export function merkeMenge(alt, kacheln, anteil) {
  if (!alt.k || alt.k.length < kacheln.length) alt.k = new Int16Array(Math.max(64, kacheln.length * 2));
  alt.k.set(kacheln); alt.n = kacheln.length; alt.anteil = anteil;
}
