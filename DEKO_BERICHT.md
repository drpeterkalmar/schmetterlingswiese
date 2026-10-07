# Schmetterlingswiese 2.8 – Blumenwiese & Lichtzauber (Deko, ressourcenschonend)

Stand: 07.10.2026 · Branch `main` · Live: https://drpeterkalmar.github.io/schmetterlingswiese/ (Version 2.8.0)

Wunsch (05.10.): „Jedes Spiel mit Opus max ressourcenschonend verschönern … also mehr Details und Eye Candy.“
Umgesetzt als reine Optik: keine neue Spielmechanik, Steuerung, Balance, Spielstände und HUD sind unverändert.

## Kurzfassung

- Die Wiese ist jetzt **bunt und lebendig statt nur grün**: Rund um die Figur blüht ein Blütenteppich, der sich mit dem
  Gras im Wind wiegt. Löwenzahn-Schirmchen schweben durch die Luft. Im Gegenlicht fallen **Sonnenstrahlen** durch den
  Dunst, am schönsten zur goldenen Stunde im Kirschblütenhain. Am Abend **glimmen die Blüten**, die Glühwürmchen blinken
  wie echte, und am Himmel stehen Milchstraße und Mond.
- **Am Handy nicht langsamer:** Auf der Standardstufe „Mittel“ bleibt die p95-Bildzeit (CPU 4× gedrosselt, Handy-Ansicht)
  bei +0 bis +1,6 %. Die mittlere Bildzeit steigt um 3 bis 6 %. Auf „Niedrig“ ist die mittlere Bildzeit gleich oder
  besser. Ladegröße **+9,8 KB** (gzip), keine neuen Dateien von außen, keine Texturen.
- **A/B:** https://drpeterkalmar.github.io/schmetterlingswiese/?deko=0 zeigt das Aussehen bis 2.7.

## Bitte am Handy anschauen

1. **Kirschblütenhain (Welt 4), zur Sonne drehen** (die Sonne steht tief): Mehrere warme Lichtstrahlen fallen schräg
   durch den Dunst. Wirken sie schön, oder zu stark bzw. zu schwach?
2. **Frühlingswiese tief über das Gras fliegen:** Der Blütenteppich rund um die Figur (weiß, rosa, gelb, hellblau,
   lila) wiegt sich im Wind und weicht der Figur aus, wenn sie tief fliegt. Sieht man beim Fliegen, wie Blumen am Rand
   „auftauchen“? (Sie blenden weich ein, sollten aber nicht aufploppen.)
3. **Glühwürmchen-Abend:** Die Blüten glimmen pastellfarben. Glühwürmchen blinken kurz auf und verglühen langsam. Einmal
   steil nach oben schauen (z. B. bei einem Looping): Milchstraße und Mond mit Mondmeeren.
4. **Seerosenteich:** Das Wasser spiegelt den Himmel. Gegen die Sonne blitzen einzelne Glitzerfunken.
5. **Auf einer Blüte/Seerose landen und Nektar naschen:** Ein warmer Honig-Schein und goldene Sternchen.
6. **Wärme/Akku:** Nach 10 Minuten Spielen bitte fühlen, ob das Handy wärmer wird als bei 2.7. Zum Vergleich einmal mit
   `?deko=0` spielen. Ist das Handy schwach, schaltet die Auto-Drosselung erst die Deko auf die Hälfte und auf „Niedrig“
   ganz ab. Unter ⚙️ → Grafik „Niedrig“ ist das Aussehen dann fast wie in 2.7.
7. Falls noch 2.7 erscheint: App einmal schließen und neu öffnen (der Service Worker lädt 2.8 nach).

## Was ist neu (Alltagssprache)

| # | Was | Wo sieht man es | Kosten |
|---|---|---|---|
| 1 | **Blütenteppich** rund um die Figur: kleine Fünfblatt-Blüten auf Stielen, in Flecken verteilt, Farben je Welt. Die Köpfe neigen sich zur Kamera (auch flach von hinten gut sichtbar), wiegen sich in derselben Windwelle wie das Gras und weichen der Figur aus | überall, im Hoch- und Querformat, auch im Menü | 1 Draw-Call, ~25.000 Dreiecke (Mittel) |
| 2 | **Graswellen und Farbvielfalt**: Büschel unterschiedlich satt, vereinzelt sonnengelbe Halme, Windböen laufen als heller Glanz über die Wiese | in Bewegung gut sichtbar | 0 Draw-Calls (Shader) |
| 3 | **Lichtstrahlen** im Gegenlicht: weiche, schräge Lichtbahnen aus Richtung Sonne, leicht flimmernd. Stärke je Welt: Kirsch (goldene Stunde) stark, Wiese/Teich zart, Mittag schwach, Abend keine | Blick Richtung Sonne | 1 Draw-Call, 7 Bänder |
| 4 | **Löwenzahn-Schirmchen und Sonnenstaub**: weiße Schirmchen mit feinen Strahlen treiben im Wind, im Gegenlicht leuchten sie. Dazu kleine funkelnde Staubkörner (Kirsch: vor allem goldener Staub zu den Blütenblättern) | Tag-Welten | 1 Draw-Call, 70 Punkte |
| 5 | **Leuchtende Nachtblüten**: am Abend glimmen die Blüten des Teppichs pastellfarben (das vorhandene weiche Leuchten macht einen Schein daraus) | Glühwürmchen-Abend | 0 zusätzlich |
| 6 | **Glühwürmchen** blinken wie echte (schnell an, langsam aus, Pause) und haben einen hellen Kern mit Lichthof | Abend | 0 Draw-Calls |
| 7 | **Nachthimmel**: Milchstraße als wolkiges Band mit vielen feinen Sternen, **Mond mit Mondmeeren** und Randverdunklung statt hellem Fleck, zarter Hof-Ring | Abend, Blick nach oben | 0 Draw-Calls |
| 8 | **Teich**: spiegelt den Himmel (am Rand hell, von oben Wasserfarbe), einzelne Sonnenglitzer blitzen auf der Bahn zur Sonne | Seerosenteich | 0 Draw-Calls |
| 9 | **Flügel-Schimmer** (Perlmutt): der Farbton wandert mit Blickwinkel und Flügelschlag, auch bei Glasflügeln von Biene/Libelle und bei den Wiesen-Faltern. Freigeschaltete Flügel-Skins bleiben unverändert | Spielfigur | 0 Draw-Calls |
| 10 | **Flügelstaub**: zarte Feenstaub-Pünktchen hinter der Figur, **nur wenn keine Spur gewählt ist**, damit freigeschaltete Spuren besonders bleiben | im Flug | Partikel-Pool (vorhanden) |
| 11 | **Funkeln beim Landen und Nektar-Naschen**: Leuchtring und goldene Pollen beim Aufsetzen, Honig-Schein und aufsteigende Sternchen beim Naschen | Lande-Aufgaben | Partikel-Pool |
| – | Titel-Hinweis „Neu: Blumenwiese & Lichtzauber!“ (mit `?deko=0` wie bisher „Neu: 8 Missionen pro Welt!“) | Startbild | – |

**Bewusst nicht gemacht:** Schmetterlinge und Vögel in der Ferne als Impostors. Die Wiese hat seit 2.3 Singvögel, einen
Schmetterlings-Schwarm, Bienen und Marienkäfer. Mehr davon hätte Draw-Calls gekostet, ohne dass es auffällt. Ebenso
keine neuen Wolken: Die vorhandenen weichen Cumulus- und Schleierwolken wirken schon gut. Kein Vollbild-Bloom und kein
SSAO dazu. Das vorhandene 1/4-Auflösungs-Leuchten bleibt, wie es war.

## Ist-Rundgang (vorher, 2.7) – was wirkte leer oder flach

Bilder: `tests/shots/deko/vorher_*` (lokal, PNG) und die linke bzw. obere Spalte der Collagen.

- Die untere Bildhälfte (im Hochformat über 50 % des Bildes) war **eine gleichmäßige grüne Rasenfläche**. Blumen standen
  nur weit verstreut und klein in der Ferne. Nahe der Kamera gab es fast nichts außer Grasbüscheln.
- Die **goldene Stunde (Kirsch)** wirkte trotz Sonnenuntergang olivgrün und matt, ohne Licht in der Luft.
- Der **Abend** war eine dunkle Türkisfläche mit ein paar Glühwürmchen-Punkten. Der Mond war ein heller, verschwommener
  Fleck.
- Die Luft war leer (Pollen kaum sichtbar). Der Teich war hell, aber flach.
- Menü, Weltkarte, Siegerbild und Ergebniskarte waren schon reich (Konfetti, Ringe, Regenbogen). Dort war wenig zu tun.
  Deshalb lag der Schwerpunkt auf **Umgebung, Licht und Stimmung**.

## Liste der Verschönerungen (sortiert nach Wirkung pro Kosten)

| Rang | Maßnahme | Wirkung | Kosten | Stand |
|---|---|---|---|---|
| 1 | Blütenteppich in Kameranähe (instanziert, Wind im Vertex-Shader) | sehr hoch, jedes Bild | 1 DC | ✅ Etappe 1 |
| 2 | Lichtstrahlen als additive Bänder (Gegenlicht) | hoch (Kirsch), mittel sonst | 1 DC | ✅ Etappe 1 |
| 3 | Graswellen/Farbvielfalt im Gras-Shader | mittel, in Bewegung | 0 | ✅ Etappe 1 |
| 4 | Löwenzahn-Schirmchen + Sonnenstaub | mittel | 1 DC | ✅ Etappe 1 |
| 5 | Flügel-Schimmer | mittel (Figur immer im Bild) | 0 | ✅ Etappe 1 |
| 6 | Nachtblüten glimmen | hoch am Abend | 0 | ✅ Etappe 1 |
| 7 | Glühwürmchen blinken mit Lichthof | mittel | 0 | ✅ Etappe 2 |
| 8 | Milchstraße + Mond mit Mondmeeren | mittel (beim Hochschauen) | 0 | ✅ Etappe 2 |
| 9 | Teich: Himmelsspiegel + Sonnenglitzer | mittel (eine Welt) | 0 | ✅ Etappe 2 |
| 10 | Lande-/Nektar-Funkeln | klein, aber Erfolgsgefühl | Pool | ✅ Etappe 2 |
| 11 | Flügelstaub (nur ohne Spur) | klein | Pool | ✅ Etappe 2 |
| – | Impostors ferner Tiere, Cirrus-Wolken | gering (schon vorhanden bzw. passt nicht) | – | weggelassen |

## Ressourcen: Qualitätsstufen, Drosselung, „Bewegung reduzieren“

- **Hoch:** 2600 Blüten, 10 Strahlen, 120 Schirmchen. **Mittel** (Handy-Standard): 1500 / 7 / 70.
  **Niedrig:** keine Deko-Schichten. Auch die Shader-Extras sind aus (Grasglanz, Flügel-Schimmer, Wasserspiegel, neuer
  Mond, Milchstraße, große Lichthöfe, feinere Himmelskugel). Niedrig rechnet also wie 2.7. Neu sind dort nur das
  Blinkmuster der Glühwürmchen und das Funkeln beim Landen bzw. Naschen.
- **Auto-Drosselung:** Muss das Spiel die Auflösung senken, halbiert es sofort die Deko. Fällt es auf „Niedrig“, ist sie
  aus. Wird es wieder schneller, kommt alles zurück. Getestet in `tests/test_v28_deko.py`.
- **Kein neuer Dauer-Loop:** Alles hängt an der vorhandenen Hauptschleife und an der Spielzeit `uTime`. Ist der Tab
  versteckt, steht alles still.
- **prefers-reduced-motion** (bzw. `?rm=1` zum Testen): kein Kamera-Ruckeln (Wespe, Stunt-Kick), halb so viel
  Partikelregen (Konfetti, Funken), langsamere Schirmchen. Getestet.
- **Gespart, um Platz für die Deko zu schaffen:**
  - Das Gras rechnet seine Farbmuster je Halm statt je Pixel.
  - Der Himmel wird nach der Landschaft gezeichnet. So entfallen verdeckte Himmelspixel auf GPUs ohne Hidden-Surface-Removal.
  - Die Milchstraßen-Wolken werden je Eckpunkt gerechnet, die feinen Sterne nur im Band.
  - Der Partikel-Pool lädt nur noch die belegten Plätze hoch statt immer alle 1000 × 3 Puffer. Das hilft allen Effekten.
  - Glühwürmchen-Punkte sind nach oben begrenzt, damit ganz nahe kein bildschirmgroßer Punkt entsteht.

## Messungen vorher/nachher

**Aufbau:** Playwright, Pixel-7-Ansicht 412×915 (DPR 2,625, Spiel-DPR 1,5 auf Mittel), WebGL über die M1-GPU (Metal).
CPU-Drosselung **4×** per CDP `Emulation.setCPUThrottlingRate`. Ohne VSync und Bildraten-Deckel, sonst liefert headless
nur 15–20 Bilder/s, egal wie viel zu tun ist. Je Szene 10 s mit Autopilot (≈ 3000 Bilder). Szenen: Wiese 1-1, Teich 3-1,
Kirsch 4-1, Abend 5-1, Weltkarte (Menü mit 3D-Hintergrund). **vorher** = 2.7.0 (`c37d7b1`) auf einem zweiten lokalen
Server, **nachher** = 2.8.0. Beide liefen abwechselnd. Gepoolt sind alle Einzelbilder aus 4 Läufen (vorher) und 3 Läufen
(nachher). Ein Nachher-Lauf war ein Ausreißer, alle Szenen gleichmäßig etwa 1 ms langsamer. Grund: Zur selben Zeit
dekodierte das animierte macOS-Hintergrundbild Video auf der GPU. Dieser Lauf ist durch einen weiteren ersetzt, die
Rohdaten liegen in `tests/out/deko_perf_f_*.json`.

### Bildzeit (ms) – Stufe Mittel (Handy-Standard)

| Szene | p50 vorher → nachher | **p95 vorher → nachher** | Mittel | CPU je Bild p95 | Draw-Calls | Dreiecke |
|---|---|---|---|---|---|---|
| Wiese | 3,1 → 3,3 | **6,3 → 6,4 (+1,6 %)** | 3,17 → 3,33 (+5,1 %) | 5,8 → 5,9 | 76 → 81 | 309k → 346k |
| Teich | 3,0 → 3,2 | **6,2 → 6,3 (+1,6 %)** | 3,05 → 3,22 (+5,7 %) | 5,7 → 5,8 | 93 → 94 | 359k → 390k |
| Kirsch | 3,0 → 3,2 | **6,3 → 6,3 (±0 %)** | 3,12 → 3,22 (+3,3 %) | 5,8 → 5,8 | 78 → 81 | 314k → 348k |
| Abend | 2,8 → 2,9 | **6,6 → 7,6 (+15 %)¹** | 3,09 → 3,28 (+6,3 %) | 5,9 → 6,8 | 67 → 67 | 272k → 303k |
| Weltkarte (Menü) | 2,6 → 2,7 | **11,8 → 11,0 (−6,8 %)** | 3,16 → 3,13 (−0,8 %) | 11,0 → 10,2 | 65 → 67 | 255k → 290k |

¹ **Abend einzeln nachgemessen** (je 2 Läufe nur diese Szene, gleicher Aufbau): p95 **6,5 → 6,5 ms (±0 %)**, Mittel
3,13 → 3,21 (+2,6 %), Anteil Bilder über 7 ms 4,4 % → 4,1 %. Im Gesamtlauf liegt der Abend am Ende einer langen Reihe.
Seine p95 liegt genau an der Kante, an der die gedrosselte CPU von etwa 6 auf etwa 13 ms springt (die Drosselung
pausiert den Hauptfaden in Scheiben). Deshalb kippt sie dort leicht. Das robustere Maß „Mittel der langsamsten 5 %“
lag im ersten Gesamtlauf bei +9,6 % und nach dem Verkleinern der Lichthöfe einzeln bei −3 %.

### Bildzeit (ms) – Stufe Niedrig

| Szene | p50 | p95 | **Mittel** | Draw-Calls | Dreiecke |
|---|---|---|---|---|---|
| Wiese | 2,5 → 2,5 | 11,2 → 11,5 | **2,99 → 2,98 (−0,2 %)** | 72 → 73 | 251k → 252k |
| Teich | 2,7 → 2,6 | 8,6 → 7,8 | **3,16 → 3,01 (−5,0 %)** | 83 → 79 | 286k → 286k |
| Kirsch | 2,7 → 2,4 | 10,9 → 13,5 | **3,20 → 3,03 (−5,1 %)** | 85 → 71 | 264k → 251k |
| Abend | 2,7 → 2,4 | 11,9 → 13,8 | **3,40 → 3,07 (−9,5 %)** | 74 → 79 | 228k → 231k |
| Weltkarte | 2,3 → 1,9 | 14,9 → 16,0 | **3,40 → 3,21 (−5,6 %)** | 61 → 61 | 212k → 211k |

Auf Niedrig ist die p95 schon beim **alten** Code kein brauchbares Maß. Sie springt dort von Lauf zu Lauf zwischen etwa
7 und 14 ms (vorher, Abend: 6,8 / 14,2 / 13,7 / 12,6 ms). Mittelwert und Median sind stabil, und beide sind **gleich
oder besser** als vorher.

### GPU-Last (ohne CPU-Einfluss)

Die GPU-Zeit je Bild per Timer-Query (headless 1–2,5 ms) springt am M1 zwischen Taktstufen. Selbst `?deko=0` (also der
alte Code) wich dabei um bis zu ±30 % von 2.7 ab. Deshalb gibt es einen eigenen **GPU-Lasttest** (`tests/deko_gpu.py`):
Die Szene steht still, die Auflösung ist vierfach (doppelte Kantenlänge), und jedes Bild wird 12× (Mittel) bzw. 40×
(Niedrig) gezeichnet. So bremst nur die GPU, wie bei einem schwachen Handy. Gemessen wurde die mittlere Bildzeit, mit
2–3 Läufen je Seite.

| Szene | Mittel: vorher → nachher | Niedrig: vorher → nachher |
|---|---|---|
| Wiese | 33,6 → 34,1 ms (+1,7 %) | 16,3 → 15,9 ms (−2,6 %) |
| Teich | 32,6 → 32,7 ms (+0,4 %) | 16,7 → 16,6 ms (−0,1 %) |
| Kirsch im Gegenlicht | 33,5 → 33,6 ms (+0,3 %) | 15,7 → 15,8 ms (+0,5 %) |
| Abend | 33,9 → 34,0 ms (+0,2 %) | 13,2 → 13,7 ms (+4,0 %, Streuung ±5 %)² |
| Nachthimmel, steil nach oben | 28,9 → 30,7 ms (+6,3 %) | 12,9 → 12,7 ms (−1,4 %) |

² Gleicher Code (`?deko=0`) streute in diesem Test zwischen 13,1 und 13,8 ms.

Die Spalte „Mittel“ wurde vor dem letzten Verkleinern der Glühwürmchen-Lichthöfe gemessen. Das macht es nur günstiger.
Ein Lasttest bei normaler Auflösung (24× gezeichnet) wird teils vom Abschicken der Zeichenbefehle (CPU) begrenzt. Er
zeigt +5–7 %, den Nachthimmel steil nach oben +16 %. Das passt zu den 3–5 zusätzlichen Draw-Calls und zu den +3–6 %
mittlerer Bildzeit oben.

### Ladegröße und Texturen

| | vorher (2.7) | nachher (2.8) |
|---|---|---|
| Alle Spieldateien (Precache-Liste), gzip | 538,3 KB | **548,1 KB (+9,8 KB)** |
| Dateien | 37 | 39 (`js/engine/deko.js`, `js/world/deko.js`) |
| Texturen im Speicher (`renderer.info`) | 8 | 8 |
| Externe Requests | 0 | 0 (getestet) |

Fremd-Assets: keine. Alles ist prozedural in Shadern. `LICENSES.md` braucht keinen neuen Eintrag.

## Vergleichscollagen (selbst angesehen)

- `tests/shots/deko/vergleich_hoch.jpg`: Hochformat, oben 2.7, unten 2.8. Menü, 5 Welten, Kirsch und Wiese im
  Gegenlicht, Sieger-Einlage.
- `tests/shots/deko/vergleich_quer.jpg`: Querformat, links 2.7, rechts 2.8.
- `tests/shots/deko/vergleich_ab_deko0_hoch.jpg`: 2.7 gegen 2.8 mit `?deko=0`. Beide sehen gleich aus, auch der alte
  Titel-Hinweis. Unterschiede kommen nur von zufälligen Tier- und Wolkenpositionen.

**Ehrliche Bewertung:**
- **Deutlich besser:** In allen Welten ist die untere Bildhälfte jetzt eine echte Blumenwiese statt Rasen. Das ist der
  größte Gewinn, im Hoch- und Querformat und auch im Menü. Der **Kirschblütenhain im Gegenlicht** mit den warmen Strahlen
  ist das schönste neue Bild. Der **Abend** mit dem glimmenden Blütenteppich wirkt jetzt verzaubert statt leer.
- **Gut, aber zurückhaltend:** Wiese im Gegenlicht (Strahlen zart, die Sonne steht höher), Teich (Himmelsspiegel), die
  Schirmchen (einzelne, gut erkennbar, nie vor HUD-Text).
- **Nur in Bewegung oder aus der Nähe zu sehen:** Graswellen, Flügel-Schimmer, Flügelstaub, Nektar-Funkeln.
  Milchstraße und Mond sieht man nur beim Hochschauen. In der normalen Spielansicht sind sie selten im Bild.
- **Wenig verändert:** Sonnenblumenfeld zur Mittagszeit. Die Sonne steht hoch, daher gibt es kaum Strahlen. Der
  Blütenteppich hilft trotzdem.
- HUD, Knöpfe und Touch-Zonen bleiben frei. Die Deko liegt in der 3D-Szene hinter der Oberfläche. Schirmchen ganz nah an
  der Kamera blenden aus.

## Prüfung

- Ganze Suite `tests/run_all.sh` (jetzt 23 Teile, neu **`test_v28_deko`**) grün: alle 40 Missionen × 3 Stufen +
  Tagesaufgabe gewonnen, Speichern und Neuladen gleich (290 ⭐), Missionen und Wischen, Feiern, Stunts, Zielanzeige,
  Wettflug, Landen und Fangen, Tiere, Schmuck, Magnet, Glitzer, UI, Werkstatt, PWA/offline, Audio, Anatomie, Speicherlecks,
  Leistung. Grundtest `smoke.py`: 0 Fehler.
- `test_v28_deko`: Deko-Schichten in allen 5 Welten. Stufen Hoch > Mittel > Niedrig (Niedrig = aus). Auto-Drosselung
  halbiert und gibt wieder frei. Flügelstaub läuft. Level mit Deko gewonnen. Keine externen Requests. `?deko=0` ohne
  Schichten und mit altem Himmel und Titel. Reduzierte Bewegung: halber Partikelregen, Kamera ruhig, Schirmchen langsamer.
  0 Fehler.
- `test_v26_ziel` (Zielanzeige) meldete zweimal beim **ersten** Lauf nach einer langen Testreihe `hoch:toast`. Bei 5
  Wiederholungen war er grün, mit 2.7-Code ebenfalls grün. Es geht um eine Suchschleife, die im Test die passende Höhe
  für den Stern unter der Meldung findet. Ein Fehler im Spiel ist das nicht. Die Zielanzeige selbst hat sich nicht
  geändert.
- Zwei Testteile liefen einmal kurz gleichzeitig, weil die Shell lange Läufe automatisch in den Hintergrund schob. Beide
  waren grün. Danach liefen alle Läufe einzeln.
- Live (github.io): Version live = lokal, `test_live.py` gegen github.io mit 0 Fehlern (Ton nach Tipp, Level gewonnen,
  Freischaltung, offline neu laden). Geprüft nach jeder Etappe (Builds `3f5f0ba1e4`, `e964bd9092`) und am Schluss.

## Technik und Dateien

- `js/engine/deko.js`: Schalter `DEKO` (`?deko=0`), `RM` (reduzierte Bewegung, `?rm=1`), Shader-Präfix `#define DEKO`.
  Ohne Deko sind die Shader identisch zu 2.7.
- `js/world/deko.js`: Blütenteppich (folgt der Kamera wie das Gras, Muster an Weltpositionen gebunden), Lichtstrahlen
  (Gitter zur Sonne versetzt, nahe Kamera ausgeblendet), Schirmchen/Staub (Punkte). Je Schicht 1 Draw-Call, Stückzahl je
  Stufe.
- `js/engine/gfx.js`: Gras (Glanz, Vielfalt, Muster je Halm), Flügel-Schimmer, Himmel (Milchstraße je Eckpunkt, Mond),
  gemeinsame Uniforms `uDq` (Deko-Stufe 0/0,5/1), `uNight`, `uSkyZen/Hor`.
- `js/world/particles.js` (Glühwürmchen, Upload nur belegter Plätze, RM), `js/world/nature.js` (Teich),
  `js/world/trails.js` (Flügelstaub), `js/game/objectives.js` und `game.js` (Funkeln), `js/actors/player.js` (RM),
  `js/world/world.js` (Einbau, Himmel je Stufe), `js/engine/renderer.js` (`dekoK`), `js/game/worlds.js` (Werte je Welt).
- Werkzeuge: `tests/deko_shots.py` (Rundgang hoch + quer), `tests/deko_detail.py` (Himmel, Teich, Nektar),
  `tests/deko_perf.py` (Drosselung 4×, Bild/CPU/GPU, Rohdaten), `tests/deko_gpu.py` (GPU-Lasttest),
  `tools/deko_pool.py`, `tools/deko_compare.py`, `tools/deko_collage.py`, `tools/load_size.py`.

## Grenzen / offen

- Gemessen wurde am Mac (M1, headless). Auf einem echten Mittelklasse-Android fehlt die Messung weiterhin. Die
  Auto-Drosselung fängt schwache Geräte ab, aber Peters Gefühl am Handy (Wärme, Ruckeln) ist der eigentliche Test.
- Die Lichtstrahlen sind bewusst nur im Gegenlicht kräftig. Mit dem Rücken zur Sonne sieht man sie kaum.
- Eine Status-Datei `~/.hermes/plans/<projekt>.md` gibt es für die Schmetterlingswiese nicht, deshalb gibt es keine
  Status-Zeile. Das Audit `grafik-audit-spiele.md` ist eine Momentaufnahme vom 05.10. und bleibt unverändert.
