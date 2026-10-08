# Grafik-Kern (Kopie, v2.9)

Kopiert aus `~/dev/stuntbahn/src/gfx/kern/` (Stand n30, 08.10.2026) – **nicht hier ändern**, sondern im Stuntbahn-Kern
und neu kopieren, damit alle Spiele gleich bleiben.

| Datei | Herkunft | Anschluss hier |
|---|---|---|
| `autopilot.js` | unverändert | `js/engine/qualitaet.js` (Stufen, maxTier), `js/engine/renderer.js` (je Bild `sample()`) |
| `startprobe.js` | unverändert | `Renderer.starteProbe()/probeNach()` – Messung in den ersten ~24 Bildern der Hauptschleife |
| `hochskalieren.js` | `kinoSR` aus `stuntbahn/src/gfx/kinolook.js`, für lineares HDR angepasst (Reinhard-Stauchung) | Composite in `js/engine/gfx.js` (`Post`) |

Mess-Gate: `tests/perf_gate.py` (unverändert) + `tests/perf_szenen.json` (spielspezifisch).
