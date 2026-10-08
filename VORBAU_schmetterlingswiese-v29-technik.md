# Vorbau v2.9 Technik (Leicht-Spur, ohne Browser) – Übergabe an den Heavy-Job `schmetterlingswiese-v29-technik`

Branch `vorbau/schmetterlingswiese-v29-technik` (von `origin/main` 1df00e7, v2.8.0). main ist unberührt. Alles Neue steht
hinter URL-Reglern; **alle Regler aus** (`?skala=0&ringe=0&cull=0&himmel=0&kontakt=0&bloommaske=0&takt=0`) = Verhalten
von v2.8, nur auf three.js r186. Kein Browser, kein Server, keine Messung gelaufen.

Node-Tests (ohne Browser, ~1 s): `bash tests/node/run.sh` → **37 grün** (r186, Autopilot, Gras-Ringe, Hüllkugeln,
Welt-Aufbau, Himmelslicht, Schatten, Bloom-Maske, fester Takt). Die Umgebung (`tests/node/umgebung.mjs`) löst `three`
wie die Importmap auf und stellt eine Browser-Attrappe bereit – damit laufen echte Spielmodule (Welt, Flugmodell) in Node.

Ladegröße (alle Spieldateien, aus git gerechnet): main 1 493 KB roh / 547 KB gzip → Vorbau 1 613 / 594 KB
(**+120 KB roh, +47 KB gzip**; davon r186 ≈ +46 KB). Budget +200 KB eingehalten.

## Reihenfolge für den Heavy-Job
1. **Vorher-Messung auf main** (vor dem Merge!): `git worktree add ../butterfly_vorher origin/main`, dann
   `python3 tests/perf_gate.py --szenen tests/perf_szenen.json --ab vorher=../butterfly_vorher:: --ab nachher=` (Gate und
   Szenen liegen nur auf dem Branch; die Szenen laufen auf main gleich, weil sie nur `__game`-Aufrufe nutzen).
   Oder erst `--stand vorher --wurzel ../butterfly_vorher`.
2. Branch mergen (`git merge vorbau/schmetterlingswiese-v29-technik`, keine fremden Änderungen an denselben Dateien seit
   1df00e7 erwartet), Etappe für Etappe im Browser abnehmen (Checklisten unten), korrigieren.
3. Version +1 (`js/main.js` VERSION), `python3 tools/update_sw.py` (nimmt `js/engine/kern/*.js` und die neuen Module
   automatisch in den Precache), README, `TECHNIK_BERICHT.md`, Collagen, Live-Check. Diese Datei danach löschen.

## E0 Mess-Gate – fertig, nicht gelaufen
- `tests/perf_gate.py` **unverändert** aus `~/dev/stuntbahn/tests/` (Start per `open` + CDP gegen die macOS-Drosselung,
  ohne 60-Hz-Deckel, Wechsel-Modus `--ab`). `tests/perf_szenen.json`: `menu_mittel`, `wiese_niedrig/mittel/hoch`,
  `stuntshow_mittel` (alle 2,5 s `__game.stunt()`), `mission_teich_mittel` (3-1), `mission_abend_mittel` (5-1), `wiese_auto`.
  Jede Szene legt ein Profil an (`__game.progress.create`) und setzt die Stufe per `__game.setQuality(q)`.
- **Abnehmen:** läuft das Gate durch (bereit-Ausdruck, `info`-Zähler, Ladegröße)? Missionen mit `__game.autopilot(true)` –
  prüfen, dass in 10 s wirklich geflogen wird. Ggf. `"ladeNachlauf"` anpassen.
- `tests/node/` ist neu (Node-Tests, nicht in `tests/run_all.sh`; dort gern als erster Schritt ergänzen).

## E1 three.js r180 → r186 – fertig
- `lib/three.core.min.js`, `lib/three.module.min.js`, `THREE_LICENSE.txt` aus der Stuntbahn (keine Addons nötig).
- Geprüft (`test_r186.mjs`): Revision 186; alle `#include <…>` im Spiel (nur `tonemapping_fragment`, `colorspace_fragment`)
  gibt es in r186; alle 64 verwendeten `THREE.*`-Namen existieren (inkl. der neuen aus E2–E5); alle Spiel-Materialien und Gelände/Gras bauen.
- **Abnehmen:** Shader-Übersetzung auf der GPU (0 Fehler/Warnungen in der Konsole), Screenshot-Vergleich Menü/Wiese/Teich
  main gegen Branch **mit allen Reglern aus** (s. o.) → muss pixelnah gleich sein. Alle Playwright-Suiten.

## E2 Renderskala + Hochskalieren + Kern-Autopilot – fertig (Regler `?skala=0`, `?startprobe=0`)
- `js/engine/kern/` = Kopie des Stuntbahn-Kerns (`autopilot.js`, `startprobe.js` unverändert) + `hochskalieren.js`
  (`kinoSR` aus `kinolook.js`, angepasst: arbeitet auf Reinhard-gestauchtem Bild, weil unser Szenen-Ziel lineares HDR ist).
- `Post` (`gfx.js`): Szenen-Ziel = Zeichenpuffer × Renderskala (0,6–1,0), Unschärfe-/Glüh-Stufen aus dem Szenen-Ziel,
  Endbild in voller Größe mit `kantenSR` (Mittel: Kantenglättung + Schärfen 0,4; Hoch mit MSAA: nur Schärfen 0,25).
- `js/engine/qualitaet.js`: Stufen am Kern-Autopiloten – Reihenfolge Skala → Deko halbieren → Stufe; **maxTier** wie bisher
  (gesenkte Stufe kommt in der Sitzung nicht wieder); Start unter der Höchststufe (Handy Mittel) → ein Schritt nach oben
  liegt bereit (kommt bei voller Skala und Luft). Niedrig regelt über die Pixeldichte (kein Endbild).
- `Renderer`: Kurzmessung in den ersten 4 + 20 Bildern (1-Pixel-`readPixels`), Gerät in `localStorage`
  (`grafikKern.*`), GPU-Zeit per `EXT_disjoint_timer_query_webgl2`, `schonen(1,5)` bei Welt-/Levelwechsel.
  `__game.info()` hat neu `skala`, `rt`, `autopilot`, `apLog`, `startProbe`.
- Geprüft (`test_qualitaet.mjs`, simuliertes Gerät): Reihenfolge, maxTier, Aufstieg Mittel→Hoch, gescheiterter Aufstieg
  wird nicht wiederholt (ohne GPU-Zeit), Skala stufenlos im Bereich, Endbild-Shader/Defines.
- **Abnehmen:** Kanten auf Mittel sichtbar glatter? Schärfe-Halos an Halmen/Blüten? (`uSharp` in `ENDBILD`,
  `renderer.js`). Autopilot im Browser mit künstlicher Last (Vorlage `~/dev/stuntbahn/tests/test_autopilot.py`): Reaktion
  ≤ 3 s, kein Pendeln. Jede Skalen-Änderung baut die Render-Targets neu – auf Hänger beim Umschalten achten.
  Startprobe-Dauer beim allerersten Laden. **Kosten `KOSTEN.stufe = 0,9`** (Mittel→Hoch) und Bereiche `SKALA` sind Schätzungen.
- **Achtung Messskripte:** `tests/deko_perf.py`/`deko_gpu.py` setzen eine eigene GPU-Zeit-Abfrage um `renderer.render` –
  jetzt verschachtelt mit der des Renderers (WebGL erlaubt nur eine) → im HOOK `__app.renderer.gpu = null` setzen oder
  `?skala=0`. `test_v28_deko` (Drosselung über `r.dpr`) sollte weiter gehen (`dekoK` prüft `dpr` weiterhin), läuft aber
  jetzt neben dem Autopiloten – ggf. `__app.renderer.ap = null` im Test.

## E3 Gras-Ringe + Culling – fertig (Regler `?ringe=0`, `?cull=0`)
- `js/world/grasringe.js` (rein): Nahring Feld 40 m / 8×8 Kacheln, Radius bis 16 m (Überblendung 12–16 m); Mittelring
  Feld 80 m / 10×10, 12–31 m, Büschel 1,7× breiter; fern Grasrauschen im Gelände-Shader (`TERRAIN_F`, `#ifdef RINGE`,
  `fwidth`-gedämpft). Ringmitte 5 m vor der Figur (vorher Feldmitte 9 m; die Kamera liegt so im vollen Nahring).
  Wickel-Mitte aufs Kachelraster gerastet (`uWrapC`) → keine Kachel wird an der Naht geteilt.
- Culling je Kachel gegen Ring + Sichtkegel (Quader mit Rand für Biegung/Halmhöhe/Weltkrümmung), sichtbare Halme werden
  bei Änderung vorn in den Instanz-Puffer kopiert → **weiter 1 Draw-Call je Ring** (+1 gegenüber bisher).
- Halme je Stufe `[nah, Mitte]` = Niedrig 2 800/3 500, Mittel 5 000/6 250, Hoch 12 500/12 500 (nah 1,6× bzw. Hoch 2×
  dichter, Mitte halb). Gezeichnet in der typischen Flugansicht (Node, flaches Gelände): Mittel 39 % (hoch) / 67 % (quer)
  der bisherigen Halme, Hoch 46 % / 78 %.
- `frustumCulled` wieder an (`js/engine/huelle.js`, Hüllkugel nach jedem Matrix-Update + 3 m Rand): Objectives-Pools
  (Objekt + Glühen), Honig-Sonnenblumen, Fangringe, NPC-Falter/Marienkäfer, Tiere + deren Schatten, Wespen.
- Geprüft: Eigenschaftstest „kein sichtbarer Halm fehlt“ (200 Kamerastellungen hoch/quer, welliges Gelände, beide Ringe),
  Ersparnis, Dichten, Ringaufbau, Hüllkugel folgt Bewegung, alle 5 Welten × 3 Stufen bauen und cullen.
- **Abnehmen:** Wiese hoch/quer nah/fern: Übergänge an den Ringgrenzen (12–16 m, 24–31 m) und zum Grasrauschen;
  schnelles Drehen → keine aufpoppenden Kacheln am Bildrand; breite Mittelring-Büschel nicht „klobig“; Grasrauschen
  (Stärke 0,35/0,16, Frequenzen) ohne Flimmern. Draw-Calls ≤ 110. Bend-Rand: weit entfernte Gruppen am oberen Bildrand
  (Weltkrümmung senkt sie) dürfen nicht verschwinden – sonst `HUELLE_RAND` erhöhen.

## E4 Licht und Schatten – fertig (Regler `?himmel=0`, `?kontakt=0`, `?bloommaske=0`)
- **Himmelslicht** (`js/engine/himmelslicht.js`): SH9 aus dem Himmel der Welt (Verlauf, Sonnen-Glühen, Horizont,
  Wiesen-Widerschein), Mittel-Helligkeit wie die alte Halbkugel; im Shader `amb = mix(alt, E(N), uHimmel)` mit
  **`HIMMEL_ANTEIL = 0,7`** (`world.js`) in Toon, Gelände, Gras; Wolken behalten ihr eigenes Licht. Abend wird oben
  dunkler/violetter, seitlich heller (Horizontglühen) – am Bild prüfen.
- **Kontaktschatten** (`js/engine/schatten.js` `kontaktParameter`, `gfx.js` `kontaktMat`): weiche Ellipse, zur
  Schattenseite gestreckt (bis 1,8× bei flacher Sonne) und leicht versetzt (≤ 1,6 m + Streckung), Größe/Deckkraft mit der
  Höhe wie bisher; Figur (`Player.updateShadow`, auch im Menü) und Tiere (instanziert).
- **Baumschatten** (`backeBaumschatten`): je Welt eine R8-Textur 512² über 320 m (0,63 m/Texel), Kronenschatten nach
  Sonnenstand + dunkler Fuß; Gelände (Pixel) und Gras (am Halmfuß, Vertex-Textur) dunkeln um `BAUM_STAERKE = 0,32`
  ab (nachts halb). Kronen-Maße `KRONE` aus `treeGeo()` abgelesen.
- **Bloom-Maske** (`gfx.js`): Alpha im Szenen-Ziel = Leucht-Anteil. Toon deckend schreibt `vCol.a + uEmis`, Himmel
  `smoothstep(1, 2,5, Helligkeit)`, Glüh-Billboards ihren weichen Rand (Farbmischung 1:1 wie bisher). `Post.maskeVorbereiten`
  setzt je Material einmal die Alpha-Mischung: deckend → 0, durchsichtig → bleibt, additiv → steigt,
  `userData.keinBloom` (Schatten, Lichtstrahlen, Schirmchen) → bleibt, `userData.glueht` (Effekt-Funken) → nach Deckung.
  Glüh-Kette gewichtet; auf Hoch eigene ¼-Kette neben der Tiefenschärfe (+3 kleine Durchgänge). Schwelle **0,35**.
- Geprüft: SH-Projektion/Faltung exakt, je Welt Mittel ±3 %, Sonnenseite heller, oben blauer, nie negativ;
  Kontaktschatten-Richtung/-Länge/-Höhe; Baumschatten auf der Schattenseite; Mischregeln je Materialart; Anschlüsse.
- **Abnehmen:** je Welt `?himmel=0` gegen an (Figur/Blüten in Kirsch/Abend), Anteil 0,7 ggf. ändern. Baumschatten liegen
  unter den Kronen in Sonnen-Gegenrichtung (Vorzeichen per Rechnung geprüft, am Bild bestätigen) und sind nicht zu hart
  (Stärke, Texel 0,63 m). Kontaktschatten beim Landen auf Blüten (Versatz!) und im Menü. Bloom: helle Wiese/Sonnenfeld
  glüht nicht mehr, Sonne, Sterne-Pickups, Glühwürmchen, Mondblumen, Laterne glühen noch; **nachts leuchtende
  Wiesenblüten (Deko) glühen ohne Bloom** – falls gewünscht, im Deko-Shader (`deko.js` Zeile ~78) Alpha = Nachtglühen setzen
  und das Material wie Toon behandeln. Schwelle 0,35 / Stärke am Bild abstimmen. Kosten Hoch messen (+3 Durchgänge).

## E5 Fester Simulationstakt – fertig (Regler `?takt=0`)
- `js/engine/takt.js`: 60-Hz-Schritte, Einrasten bei ±2 ms um ein Vielfaches (rAF-Zittern), höchstens 3 Schritte je Bild
  (wie bisher dt ≤ 50 ms). `Darstellung`: Kamera (Lage, Drehung, Sichtwinkel), Figur (Wurzel + Neigung) und Schatten
  werden zwischen den letzten beiden Schritten interpoliert und nach dem Zeichnen **exakt** zurückgesetzt (Euler – die
  Neigungs-Glättung liest `rotation.x/z`).
- `main.js`: im Spiel laufen Eingabe, Test-Autopilot, `game.update`, Spur und Effekt-Partikel je Schritt; Zeitlupe skaliert
  die Schrittweite wie bisher dt. Menü-Schaukasten bleibt variabel. Shader-Zeit = interpolierte Simulationszeit.
  `__game.info().takt` = { aktiv, schritte, alpha }.
- Geprüft (`test_takt.mjs`, echtes Flugmodell, Eingabe-Drehbuch 12 s): **gleiche Bahn bei 60/90/120/144 Hz** und mit
  Ruckeln (exakt bei gleicher Schrittzahl); alter Weg weicht 60 vs. 120 Hz um 15 cm ab; bei 60 Hz fliegt der Takt wie
  bisher (< 5 cm nach 12 s).
- **Abnehmen:** Gefühl gegen `?takt=0` (Handy, 60 und 120 Hz), Stunts, Landen auf Blüten, Sieger-Einlage mit Zeitlupe,
  Pause/Fortsetzen, Level verlassen mitten im Flug. Nicht interpoliert (laufen auf 120-Hz-Schirmen in 60-Hz-Schritten):
  NPCs, Tiere, Wespen, Effekt-Partikel – auf Ruckeln achten; falls sichtbar, Bursts/NPCs in `Darstellung` aufnehmen.
  HUD-Aktualisierung läuft je Schritt (bei Hängern bis 3× je Bild).

## Nicht angefangen (Heavy-Job)
Vorher-/Nachher-Messung, Screenshots/Collagen (`tests/shots/technik/`), Vision-Bewertung, Playwright-Suiten, Version,
Service-Worker (`tools/update_sw.py`), README, `TECHNIK_BERICHT.md`, Live-Check. Ein Burn-Gutachten
(`docs/audit/*gutachten*.md`) gibt es im Repo nicht – ohne gearbeitet.

## Annahmen / Risiken (Startwerte mit TODO im Code)
| Stelle | Startwert | Datei |
|---|---|---|
| Schärfen Mittel/Hoch | 0,4 / 0,25 | `renderer.js` `ENDBILD` |
| Renderskala je Stufe | [0,75–1], [0,6–1], [0,62–1] | `qualitaet.js` `SKALA` |
| Kosten Stufe Mittel→Hoch | 0,9 | `qualitaet.js` `KOSTEN` |
| Halme je Stufe/Ring | s. E3 | `grasringe.js` `RING_ANZAHL` |
| Grasrauschen fern | 0,35 Farbe / 0,16 Flecken, ab 22–32 m | `gfx.js` `TERRAIN_F` |
| Himmelslicht-Anteil | 0,7 | `world.js` `HIMMEL_ANTEIL` |
| Baumschatten-Stärke | 0,32 (nachts 0,16) | `world.js` `BAUM_STAERKE` |
| Bloom-Schwelle mit Maske | 0,35 | `gfx.js` `Post` |
| Hüllkugel-Rand | 3 m | `huelle.js` |
Shader sind nur in Node auf Aufbau geprüft, nicht auf der GPU übersetzt (kein GLSL-Prüfer auf dem Mac) – die erste
Browser-Sitzung muss die Konsole auf Shader-Fehler prüfen (z. B. `__errors`, `renderer.debug.checkShaderErrors`).
