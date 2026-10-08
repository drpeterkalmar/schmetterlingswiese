// v2.9 Qualitäts-Autopilot der Schmetterlingswiese: Anschluss der Grafikstufen (Niedrig/Mittel/Hoch) an den Kern-
// Autopiloten (kern/autopilot.js: Arbeitszeit statt rAF-Abstand, GPU-Zeit wenn vorhanden, Hysterese, Sperre gegen Pendeln).
// Reine Logik ohne three.js/DOM → in Node mit künstlichem Gerät testbar (tests/node/test_qualitaet.mjs).
//
// Abschalt-Reihenfolge (wie bis v2.8, nur stufenlos): Renderskala (0,6–1,0 je Stufe) → Deko halbieren → Stufe senken.
// maxTier wie bisher: Wurde eine Stufe einmal zu langsam, kommt sie in dieser Sitzung nicht wieder (keine Pendelei).
// Startet das Gerät unter der höchsten erlaubten Stufe (Handy: Mittel), darf der Autopilot eine Stufe hoch, sobald die
// Renderskala am Maximum ist und die gemessene Arbeit Luft lässt (bisher: 9 s schnelle Bilder).
import { GrafikAutopilot } from './kern/autopilot.js';

// Renderskala je Stufe [min, max, start] – Anteil am Zeichenpuffer der Stufe (Niedrig: an der Pixeldichte selbst, ohne
// Endbild; Mittel/Hoch: Render-Target, das Endbild skaliert kantenbewusst hoch). Niedrig/Hoch wie die alten dprMin.
export const SKALA = [[0.75, 1, 1], [0.6, 1, 1], [0.62, 1, 1]];
// geschätzter Anteil an der Bildzeit (für „passt das wieder rein?“). Mittel → Hoch: DPR 1,5 → 2 (×1,8 Pixel), MSAA 4,
// Tiefenschärfe → fast doppelte Arbeit. TODO Heavy-Job: mit perf_gate nachmessen.
export const KOSTEN = { deko: 0.08, stufe: 0.9 };
// Start der höheren Stufe nach einem Schritt nach oben (vorsichtig, aber nicht ganz unten)
export const RAUF_START = 0.75;

const klemme = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// o: { stufe, maxStufe, skala, setzeSkala(s), setzeDeko(1|0), setzeStufe(t), onAenderung(e), einstellungen, gpu }
export function erzeugeAutopilot(o) {
  const stufe = o.stufe ?? 1;
  const [lo, hi, st] = SKALA[stufe];
  const ap = new GrafikAutopilot({
    skala: { min: lo, max: hi, start: klemme(o.skala ?? st, lo, hi), setzen: (s) => o.setzeSkala && o.setzeSkala(s) },
    onAenderung: o.onAenderung, einstellungen: o.einstellungen,
  });
  ap.maxStufe = Math.max(stufe, Math.min(2, o.maxStufe ?? 2));
  ap.register('deko', KOSTEN.deko, (s) => o.setzeDeko && o.setzeDeko(s));
  const dS = ap.register('stufe', KOSTEN.stufe, (s, r) => {
    if (r < 0) {
      // maxTier: diese Stufe kommt nicht wieder; die neue Stufe startet mit voller Deko und voller Skala (wie bisher)
      ap.maxStufe = s;
      ap.festsetzen('stufe', s);
      ap.festsetzen('deko', 1); if (o.setzeDeko) o.setzeDeko(1);
    }
    if (o.setzeStufe) o.setzeStufe(s);
    const [a, b, c] = SKALA[s];
    return { skala: [a, b, r < 0 ? c : Math.max(a, RAUF_START)] };
  }, { stufen: 2, start: stufe, min: 0, raufBeiSkalaMax: true });
  // Unter der erlaubten Höchststufe gestartet → ein Schritt nach oben liegt bereit (kommt, wenn Skala voll und Luft da)
  if (stufe < ap.maxStufe) ap.stapel.push({ d: dS, skala: hi });
  ap.setzeSkala(ap.skala, true);
  return ap;
}

// Deko-Faktor wie bis v2.8: 1 = voll, 0,5 = vom Autopiloten halbiert
export function dekoFaktor(ap) {
  const d = ap && ap.ding('deko');
  return d && d.stufe === 0 ? 0.5 : 1;
}
