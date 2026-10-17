# Schmetterlingswiese 3.1 – Flugschule: Schwung, Flatter-Tipps, Ring-Schub, Aufwind (nach Vorlagen)

Stand: 18.10.2026 · Branch `main` · Live: https://drpeterkalmar.github.io/schmetterlingswiese/ (Version 3.1.0)

Wunsch (10.10.): „Ein Nachahmer kopiert eine Idee, ein Genie tausende – implementiere alle guten Vorlagen in jedes
Spielprojekt.“ Grundlage ist das Vorlagen-Datenblatt `~/.hermes/plans/vorlagen/schmetterlingswiese.md` (Vorlagen A–E,
Übertragungstabelle Abschnitt 3, Etappen Abschnitt 4, Messgrößen Abschnitt 5). Gearbeitet wurde **nur aus dem Datenblatt**
(Clean-Room): Keine Vorbild-Quelle wurde geöffnet, kein Code, keine Tabelle, keine Bezeichner, keine Assets und keine Namen
übernommen. Im Spiel und in den Texten gibt es nur eigene Wörter („Flatter-Hüpfer“, „Rückenwind“, „Aufwind“,
„Ausweich-Rolle“). README sagt allgemein: „Fluggefühl inspiriert von klassischen 3D-Flugspielen der 90er“.

## Bitte am Handy testen (hoch und quer)

- https://drpeterkalmar.github.io/schmetterlingswiese/ (falls noch 3.0 erscheint: App einmal ganz schließen und neu öffnen)
- **Flatter-Hüpfer:** Mitte oben nur **kurz antippen** → die Figur schlägt kräftig mit den Flügeln und hüpft ≈ 1 m hoch.
  Drei schnelle Tipps hintereinander bringen ≈ 4 m. **Halten** steigt wie immer. Wenn möglich, mit einem Kind ausprobieren:
  Kommt es beim normalen Halten nie aus Versehen zu einem Hüpfer? (Im Test: nie.)
- **Sturzflug:** Mitte unten halten (ohne Landeblume darunter) → die Figur wird schneller (bis +33 %), danach in ≈ 2 s
  wieder Reisetempo. Steigen kostet etwas Tempo, nie unter 75 %.
- **Lange drehen:** links oder rechts gedrückt halten → nach 0,7 s wird die Kurve enger, die Figur legt sich bis 60° schräg.
- **Ringe (z. B. 1-3 „Ringe im Wind“):** Jeder Ring schiebt kurz an (Bild weitet sich etwas), **5 Ringe am Stück** =
  „🌬️ Rückenwind!“ mit Blütenblatt-Wirbel, und der Ring-Ton steigt mit jedem Ring der Kette.
- **Tropfen/Glühwürmchen** fliegen die letzten Zentimeter zur Figur, schrumpfen und drehen sich – erst dann „pling“.
- **Aufwind-Säulen:** In jedem Level stehen 2–3 helle Luftschläuche mit aufsteigenden Löwenzahn-Schirmchen. Hineinfliegen und
  **loslassen** → die Figur kreist nach oben („🌬️ Hui, Aufwind!“), ≈ 15 m in 6 s. Selbst lenken oder ▼ = wieder heraus.
- **Landen auf Blüten:** Lob je Landung („🪶 Federleicht!“ ganz in der Mitte, „🌸 Sanft gelandet!“, „🌼 Gelandet!“) –
  Zähler im 📖 Album.
- **Blütenblatt-Schweif:** Jeder Treffer legt ein Blatt in den Schwarm hinter der Figur (bis 12/16/20 je Stufe), er glänzt
  während der Kombo; die Blätter bleiben bis zum Levelende.
- **Ausweich-Rolle (nur Mittel/Schwer):** links oder rechts **zweimal schnell tippen** → Rolle 1,2 m zur Seite, Wespen
  prallen ab. Bitte prüfen: Kommt die Rolle beim normalen Lenken nie aus Versehen?
- Joystick-Modus (⚙️): Stick kurz nach oben schnippen oder rechts tippen = Flatter-Hüpfer.

## Regler (URL, `=0` = Verhalten wie v3.0) – alle Werte in EINER Gruppe `FLUG` in `js/game/flugschule.js`

| Regler | Mechanik (Datenblatt-Nr.) | Etappe / Release |
|---|---|---|
| `?schwung=0` | Schwung: Sturz bringt Tempo, Steigen kostet, zieht zum Reisetempo zurück (#1) | E1 · 3.1.0-e1 |
| `?kurve=0` | kräftigere Kurvenlage + Eng-Kurve nach 0,7 s (#8) | E1 · 3.1.0-e1 |
| `?expo=1.6` | Eingabekurve Joystick/Schieben (#11) – **Standard aus** (Wirkung laut Datenblatt nur 2) | E1 · 3.1.0-e1 |
| `?flatter=0` | Flatter-Stapel per kurzem Tipp (#2) | E2 · 3.1.0-e2 |
| `?ringschub=0` (Zahl = Zuschlag, Std. 0.2) | Ring-Schub (#4) | E3 · 3.1.0-e3 |
| `?kette=0` (Zahl = Ringe, Std. 5) | Ringkette „Rückenwind!“ + steigender Rington (#5) | E3 · 3.1.0-e3 |
| `?saugen=0` | Einsaugen der Tropfen/Glühwürmchen/Blüten (#6) | E3 · 3.1.0-e3 |
| `?aufwind=0` | Aufwind-Säulen (#3) | E4 · 3.1.0-e4 |
| `?landewertung=0` | Lob je Landung + Album-Zähler (#9) | E5 · 3.1.0-e5 |
| `?schweif=0` | Blütenblatt-Schweif (#7) | E5 · 3.1.0-e5 |
| `?rolle=0` | Ausweich-Rolle per Doppeltipp (#10) | E6 · 3.1.0-e6 |

Weggelassen wie im Datenblatt entschieden: Tempo ∝ Drehrate/Kurvenkosten (#13), Schub-Leiste/Bremse/Wende (#14),
Strömungsabriss/harte Landung/„außerhalb“ (#15), Gold-Ring-Zähler (#16). Gabel-/Zeit-Ringe (#12) = „später“ → offen.
Jede Etappe wurde einzeln committet, gepusht und live geprüft (`tests/v31_live_check.sh`: Version + Service-Worker-Build
per `curl …?x=$RANDOM`): 3.1.0-e1 … 3.1.0-e6, Abschluss 3.1.0.

## Messtabelle „Vorlage-Ziel / vorher / nachher“ (Datenblatt Abschnitt 5)

vorher = v3.0.0 (`ea2698e`, eingefrorene Kopie), nachher = 3.1.0. Node = `tests/node/flugschule_mess.mjs` (echtes
`Player.update`, 60 Hz), Browser = Playwright-Tests unten. Werte Mittel, wenn nicht anders genannt.

| # | Messgröße | Ziel | vorher (v3.0) | nachher (v3.1) |
|---|---|---|---|---|
| 1 | Tempo voller Sturz (10 s) | +30…+40 %, nie > +45 % | +16,2 % | **+32,6 %** (Leicht +29 %, Schwer +29 %), Deckel +45 % |
| 1 | Dauer-Steigen | nie < 75 % v₀ | 83,8 % | **83,7 %** (Boden 75 %) |
| 2 | Rückkehr zum Reisetempo (±5 %) | ≤ 2,5 s | 0,87 s | **1,85 s** nach Sturz, 1,27 s nach Steigen |
| 3 | Höhengewinn 1 Tipp | ≈ +1,0 m | 0,46 m (nur die kurze ▲-Eingabe) | **1,12 m** (Leicht 1,08 / Schwer 1,18) |
| 3 | 3 Tipps im Takt, nach 1,2 s | ≈ +4 m | 1,21 m | **3,85 m** (3,72 / 3,99) |
| 3 | Halten ▲ 1 s / 3 s | v3.0 ±5 % | 2,47 / 8,96 m | **2,51 / 9,13 m** (+2,0 / +1,9 %) |
| 4 | Halten ≥ 0,2 s löst Stoß aus | nie | – | **nie** (300 ms, 230 ms, Schieben, Taste lang: 0 Stöße) |
| 4 | Doppeltipp-Rolle beim normalen Lenken | 0 in 60 s | – | **0** (46 Drücke Halten 0,25–1,5 s mit Nachgreifen) |
| 5 | Aufwind Mitte / Rand | ≥ 3 / < 0,3 m/s | – | **4,5 / 0,08 m/s** (Leicht 5,0 / 0,09) |
| 5 | Kind ohne Eingabe 15 m hoch | ≤ 6 s | – | **5,4 s Leicht · 6,0 s Mittel** · 6,1 s Schwer; im Browser +14,6 m in 6 s |
| 6 | Ring-Schub-Verlauf | +20 % nach 0,25 s, < 2 % nach 1,9 s | – | **+20,0 % / 0 %** (Browser, `pl.wind`); Tempo 1,01 → 1,20 v₀ |
| 7 | Zeiten Ring-/Sammel-Level (Autopilot) | 5–15 % schneller | 1,00 | Ringe **−6,2 %**, Sammeln −0,8 %, Tiere −2,9 %, Wettflüge −11,7 % (Median) |
| 7 | kein Level langsamer | – | – | **Level-Typen: keiner langsamer**; 3 Einzel-Level > +5 % (s. u.) |
| 7 | ⚡ Blitzzeit Autopilot | ≤ 40 % der Läufe | **100 %** | 100 % (nicht verschärft, s. u.) |
| 8 | Landewertung Autopilot | ≥ 60 % „Sanft“ o. besser, nie negativ | – | **97 %** (62 Landungen: 1 Federleicht, 59 Sanft, 2 Gelandet), nur Lob |
| 9 | Einsaugen | Ankunft 0,15–0,25 s, Pling danach Δ ≤ 1 Bild | sofort | **0,20 s**, Δ **0 Bilder**, kein Pling vor Ankunft (24 Tropfen/Glühwürmchen) |
| 10 | Schweif-Kosten (20 Blätter) | Bildzeit +≤ 0,3 ms | – | **±0 ms** p95 (4,3 / 4,2 ms mit und ohne, hoch/quer) |
| 11 | FOV-Änderung an Ringen | ≤ 40°/s; reduzierte Bewegung ≤ +3° | 31°/s (Kombo-Kick) | **19°/s**, reduzierte Bewegung 9,7°/s und +3° statt +6° |
| 11 | neue Vollbild-Blitze | keine | – | **keine** („Blitze reduzieren“ unberührt) |
| 12 | Regler = 0 → v3.0-Bahn | ±1 cm nach 10 s | – | **< 1 cm** (alle 3 Stufen, Node-Test) |

### Was die Messung entschieden hat (Startwerte → Endwerte)
- **Steigen kostet weniger als der Sturz bringt:** Mit dem Startwert G = 5 auch beim Steigen fiel Halten ▲ auf −8,7 %
  Höhe in 3 s (Ziel ±5 %). Deshalb `Gsteig = 2,5` → Halten +1,9 %, Steigen-Tempo wie v3.0 (83,7 %), Sturz +32,6 %.
- **Flatter-Stoß 1,8 statt 1,6 m/s:** 3 Tipps ergaben mit 1,6 nur 3,6 m (Ziel ≈ 4), mit 1,8 3,85 m; 1 Tipp 1,12 m.
- **Aufwind R 6 statt 4 m, W 4,5 (Leicht 5,0) statt 3,0 (3,5) m/s, dazu Wirbel-Lenkhilfe + Sog:** Mit den Startwerten war
  man in ≈ 1 s durch die Säule (+2,4 m, dann wieder draußen) – „15 m in 6 s“ war unmöglich. Jetzt hält eine Lenkhilfe die
  Figur auf einem Kreis (0,4 R) um die Achse, solange das Kind nicht selbst lenkt oder ▼ drückt; der Wirbel trägt sie
  seitlich hinein (≤ 3 m/s). Rand weich ausgeblendet (am Rand < 0,3 m/s). Wer lenkt oder sinkt, ist in < 4 s draußen (Test).
- **Ringkette 5** (Datenblatt) blieb; Rington +1 Halbton je Glied, höchstens +7.
- **Blitzzeit (Messgröße 7):** Der Autopilot schaffte ⚡ schon in v3.0 in 100 % der Läufe (er fliegt perfekt). Das Ziel
  „≤ 40 %“ ginge nur, wenn die Zeiten für Kinder schwerer würden – das widerspricht „nur Zugaben“. par/⚡ bleiben deshalb
  unverändert; die neuen Mechaniken machen Kinder nur schneller (mehr Luft bis zur Blitzzeit).
- **Einzel-Level langsamer:** 4-1 Mittel (Blütenregen) +13 %, 3-6 Schwer +9 %, 1-2 Leicht +6 %. Das ist Chaos im
  Autopiloten, keine einzelne Ursache: Schaltet man je einen Regler ab, springt dasselbe Level um ±10 % (4-1 Mittel:
  56 s mit allem, 61 s ohne Eng-Kurve, 50 s ohne Schwung, 58 s ohne Aufwind; Schwer 44–58 s). Alle Level-Gruppen sind im
  Median gleich oder schneller.
- **Rennen Schwer:** Der Autopilot verlor in v3.0 alle 25 Schwer-Rennläufe (5 Rennen × 5 Läufe) gegen die Rivalin, jetzt
  gewinnt er 23 von 25 – die Rivalin fliegt unverändert, das Kind bekommt also mehr Chancen.

### Test-Flieger (Messgröße 7) – Median aus 5 Läufen je Level/Stufe, fester Zufall
`python3 tests/flieger.py --diffs leicht,mittel,schwer --rennen --seeds 5` (neu: `--seeds` – fester Zufall je Lauf, der
Autopilot ist sonst chaotisch und ein Einzellauf streut bis ±40 %), Vergleich `tests/flieger_vergleich.py`:

| Gruppe | Läufe | nachher/vorher (Median) | schnellstes | langsamstes |
|---|---|---|---|---|
| Kunststück | 9 | 1,007 | 0,91 | 1,05 |
| Landen | 24 | 1,002 | 0,96 | 1,09 |
| Ringe | 39 | **0,938** | 0,83 | 1,00 |
| Sammeln | 15 | 0,992 | 0,92 | 1,13 |
| Tiere | 18 | 0,971 | 0,86 | 1,06 |
| Wettflug (Rivalin geparkt) | 15 | **0,883** | 0,86 | 0,90 |
| Wettflug (Rennen) | 10 | **0,884** | 0,88 | 0,90 |
| alle | 130 | 0,959 | 0,83 | 1,13 |

Zwischenstände: nach E1 (Schwung/Kurve) 0,991, nach E4 (+ Rückenwind, Aufwind) 0,966. Daten: `tests/perf/2026-10-17_v31_vorher_flieger.json`,
`…_v31_e4_flieger.json`, `tests/perf/2026-10-18_v31_nachher_flieger.json`; par-Vorschlag (unverändert übernommen): `…_v31_vorher_par.json`.

## Technik (kurz)
- **Eine Parametergruppe** `FLUG` + reine Funktionen/kleine Zustandsklassen in `js/game/flugschule.js` (ohne three.js/DOM,
  in Node testbar): `tempoSchritt`, `KurvenHilfe`, `expoKurve`, `FlatterStapel`, `Rueckenwind`, `RingKette`, `saugSchritt`,
  `aufwindProfil`, `landeWertung`, `rollVersatz`.
- **Flugmodell** (`js/actors/player.js`): Tempo ist jetzt ein Zustand (Schwung), Kurve/Lage über `KurvenHilfe`, Flatter-Stoß
  und Aufwind als zusätzliche Steiggeschwindigkeit, Rückenwind als Zuschlag aufs Tempo (`pl.tempo`), Aufwind-Lenkhilfe,
  Ausweich-Rolle. Kunstflug-Einlagen und Sieger-Flugshow laufen im eigenen Zweig – unverändert.
- **Zwilling `renderFlight`** (`js/audio/audio.js`): rechnet das Flug-Bett jetzt mit demselben `tempoSchritt`
  (bzw. `tempoAlt` bei `?schwung=0`); `test_flight_audio`: „Flug-Bett ohne Stottern“.
- **Eingabe** (`js/input.js`): Tipp-Erkennung beim Loslassen (< 0,2 s, < 26 px Weg) in der ▲-Zone, Joystick-Schnipp,
  Tipp rechts im Joystick-Modus, Taste ↑; Doppeltipp der Seiten (erster Druck kurz, zweiter ≤ 0,33 s danach).
- **Optik:** Aufwind = Schirmchen-Spirale (Punkte) + zarter Luftschlauch, Bewegung nur im Shader, 2 Draw-Calls
  (`js/world/aufwind.js`); Blüten-Schweif = 1 InstancedMesh (`js/world/trails.js`); Ringkette = Blütenblatt-Konfetti im
  bestehenden Effekt-Topf. Neuer Klang „Flatter“ (`synth.js`, prozedural).
- **Kindgerecht:** nur Lob-Texte, nichts wird abgezogen, kein Tempo unter 75 %, keine neuen Vollbild-Blitze, reduzierte
  Bewegung → halber FOV-Zuschlag und langsamere Schirmchen. Touch-Zonen bleiben frei (keine neuen Knöpfe).

## Prüfung
- **Node** (`bash tests/node/run.sh`, 68 Tests grün): neu `tests/node/test_flugschule.mjs` – Schwung-Grenzen und Rückkehr,
  Eng-Kurve, Eingabekurve, Flatter-Stapel (3 Tipps in 0,6 s → 3 Stöße, 4. Tipp nach 0,1 s → keiner), Tipp-Erkennung,
  Höhengewinne im echten Flugmodell, Ring-Schub-Verlauf, Ringkette, Einsaugen, Aufwind-Profil und „15 m in ≤ 6 s“,
  „wer lenkt/sinkt, kommt heraus“, Ausweich-Rolle (1,2 m, Pause, nur Mittel/Schwer), **Regler = 0 → v3.0-Flugbahn**
  (Referenz `tests/node/v30_flugbahn.json`, aus dem v3.0-Stand erzeugt).
- **Browser neu:** `test_v31_flatter.py` (echte Zeiger-Ereignisse, Tipp-/Joystick-Modus, Taste, `?flatter=0`),
  `test_v31_ringe.py` (Messgrößen 6, 9, 11, Kette, `?rm=1`, alle Regler aus), `test_v31_landen.py` (Messgröße 8, Album,
  `?landewertung=0`), `test_v31_rolle.py` (Doppeltipp, Fehlauslöser, Wespe prallt ab, Leicht, `?rolle=0`) – alle grün.
- **`tests/run_all.sh` komplett grün** (inkl. `test_stuntshow`, `test_celebrate`, `test_v30_fancam`, `test_v30_fibel`:
  Kunstflug-Figuren und Fan-Cam-Flugshow unverändert). Zwei Funde beim Gesamtlauf, beide durch neue Mechaniken in alten
  Tests: (1) `test_celebrate` nutzt `__game.step()` und erwartet sofort gezählte Tropfen – die Debug-Abkürzung `debugNext`
  zählt jetzt sofort (wie bis v3.0), im Spiel wird weiter eingesaugt; (2) `test_stuntshow` „Start beim Lenken“: nach der
  Einlage flog die Figur freihändig in eine Aufwind-Säule und wurde (gewollt) in den Kreis gelenkt – der Test prüft die
  Einlagen jetzt mit `&aufwind=0`. Danach beide grün, ebenso `smoke`, `test_levels`.
- **Bildprüfung:** Das Werkzeug `vision_analyze` gibt es in dieser Claude-Code-Umgebung nicht; die Bildfolgen habe ich direkt
  angesehen (das Modell sieht Bilder), hoch und quer (`tests/v31_shots.py`, `tests/shots/v31/*.jpg`):

| Bildfolge | was man sieht | nachgeschärft |
|---|---|---|
| `kurve_*` | Lage 0° → 41° → 49° → 60° (Eng-Kurve) | – |
| `sturz_*` | 7,0 → 9,2 m/s in 3 s, Bild weitet sich leicht | – |
| `flatter_*` | Flügelbild wechselt je Stapel, Höhe 3,8 → 7,8 m mit 3 Tipps | Hinweistext gekürzt (war abgeschnitten) |
| `ringschub_*` | +20 % nach 0,25 s, Kamera etwas weiter, nach 1,9 s wieder normal | – |
| `kette_*` | „Rückenwind! 5 Ringe am Stück“, Blütenblatt-Konfetti kreist mit der Figur, 2 s +35 % | Wirbel zuerst unsichtbar klein → größer, reist mit der Figur |
| `saugen_*` | Tropfen fliegt in 0,2 s zur Figur und schrumpft (1,0 → 0,17) | – |
| `aufwind_*` | aus 28 m klar erkennbarer heller Luftschlauch mit Schirmchen, ohne Eingabe +14,6 m in 6 s | aus der Ferne nur ein paar Pünktchen → Luftschlauch + Mindestgröße der Schirmchen; danach Schlauch dezenter (nicht neblig) |
| `schweif_*` | 3 → 7 → 11 Blätter hinter der Figur, Glanz in der Kombo, Blätter bleiben | 20 Blätter hingen bis vor die Kamera → Schnur ≤ 1,6 m, Blätter kreisen in einer Spirale |
| `landen_*` | „🌸 Sanft gelandet!“ auf den Honig-Sonnenblumen | – |
| `rolle_*` | ganze Rolle in 0,5 s, 1,2 m zur Seite, Glitzer | – |

- **Leistung** (Mess-Gate Mittelklasse-Android wie v2.9/v3.0: CPU ×4, DPR 2,6, Median aus 3 Runden, p95 in ms):

| Szene | Gerät | vorher → nachher (p95) | Draw-Calls |
|---|---|---|---|
| Schweif-Flug, 20 Blätter (mit ↔ `&schweif=0&aufwind=0`) | hoch / quer | 4,3 ↔ 4,3 · 4,2 ↔ 4,2 | 78 ↔ 74 · 92 ↔ 87 |
| Aufwind-Säule im Bild (sichtbar ↔ ausgeblendet) | hoch / quer | 4,3 ↔ 4,3 · 4,5 ↔ 5,3 (Rauschen) | 85 ↔ 83 · 102 ↔ 101 |
| Wiese (Flug), v3.0 ↔ v3.1 im Wechsel | hoch / quer | 12,3 → 9,1 · 13,1 → 9,3 (−26 / −29 %) | 86 → 90 · 105 → 109 |
| Mission Teich 3-1, v3.0 ↔ v3.1 im Wechsel | hoch / quer | 8,4 → 8,9 · 8,8 → 8,6 (+6 / −2 %) | 88 → 92 · 115 → 118 |

  Die v3.0↔v3.1-Läufe lagen an diesem Abend allgemein höher als im v3.0-Bericht (Hintergrundlast auf dem Mac); beide Stände
  wurden abwechselnd gemessen, die Unterschiede (−29 … +6 %) liegen im bekannten Rauschen (±25 %) → **keine
  Verschlechterung**. Neu sind +3–4 Draw-Calls (Säulen 2, Schweif 1).

  Erste Fassung der Säulen kostete quer +1,1 ms (großer, doppelseitiger Schlauch über dem halben Bild) → nur Außenseite,
  90 statt 120 Schirmchen, Punktgröße ≤ 64 px → danach im Rauschen. Ladegröße (gzip) 621,0 → 636,3 KB (+15 KB).
  Daten: `tests/perf/2026-10-17_v31_e5_schweif_ab.json`, `…_v31_e5_aufwind2.json`, `tests/perf/2026-10-18_v31_ab_endstand.json`.

## Grenzen / offen
- Kein echtes Handy gemessen (Mac mini mit gedrosselter CPU als Ersatz, wie bisher). Die Fehlauslöser-Prüfung (Flatter,
  Rolle) ist mit nachgestellten Zeigern gemacht – echte Kinderhände bitte am Handy ausprobieren.
- Gabel-/Zeit-Ringe (#12, „später“) nicht gebaut. Eingabekurve (#11) gebaut, aber Standard aus (`?expo=1.6` zum Probieren).
- Der Autopilot nutzt Flatter-Tipps und Rolle nicht (er gibt Eingaben direkt vor) – deren Wirkung auf Zeiten ist im
  Test-Flieger nicht enthalten.
- Die Aufwind-Lenkhilfe greift nur, wenn das Kind nicht lenkt; wer geradeaus durch eine Säule will, muss kurz lenken
  oder ▼ drücken. Bitte beobachten, ob das stört (Regler `?aufwind=0`).

## Live-Prüfung
Jede Etappe nach dem Push mit `tests/v31_live_check.sh` (curl `…/js/main.js?x=$RANDOM` und `…/sw.js?x=$RANDOM`):
3.1.0-e1 (`e43d9b009c`), -e2 (`109fd528cc`), -e3 (`a40705287d`), -e4 (`4ec9ec10f2`), -e5 (`78fb624a7e`), -e6 (`4714d4b6e5`),
Abschluss **3.1.0 (`e45d9326ff`)** – jeweils live = lokal.
Dazu am 18.10.2026 `tests/test_v31_live.py` gegen https://drpeterkalmar.github.io/schmetterlingswiese/ mit Service-Worker
(wie am Handy): Version 3.1.0, Build `e45d9326ff` = lokal, echter Touch-Tipp oben → 1 Flatter-Stoß, 2 Aufwind-Säulen im
Level 1-3, nach dem ersten Ring Rückenwind +20 %, keine JS-Fehler (Bild `tests/shots/v31/live_ring.png`).
