# Schmetterlingswiese 2.4 – Sieger-Einlage mit mehr Effekten und lebendigere Tierbabys

Stand: 29.09.2026 · Branch `main` · Live: https://drpeterkalmar.github.io/schmetterlingswiese/ (Version 2.4.0)

Wünsche (28.09.): „Bei jedem Level-Abschluss einen zufälligen Stunt mit mehr FX machen.“ und „Tiere am Boden brauchen
mehr Details.“

## Teil 1 – Zufällige Sieger-Einlage 🏆

**Was sich ändert:** Bisher kam nach jedem Levelsieg derselbe Sieger-Looping. Jetzt kommt eine **zufällige Einlage aus
12**. Der Sieger-Looping ist weiterhin eine davon. Die gleiche Einlage kommt nie zweimal direkt hintereinander, auch
nicht über Levels hinweg. Dafür merkt sich jedes Profil die letzte Einlage (`lastFinale`). Oben erscheint kurz ihr
Name, z. B. „🏆 🎆 Feuerwerk-Rakete!“. Danach kommen Jubel und Ergebniskarte wie bisher.

**Eine Stufe größer als der 🎪-Knopf** (gleiche Bahnberechnung aus `stunts.js`, also mit Abheben am Boden,
Sicherheitshöhe 2,6 m und hartem Winkel-Reset am Ende):
- Bahn 1,2-mal so groß und 1,25-mal so lang.
- **Seitenkamera** wie beim alten Looping: Sie fährt polar um die Bahnmitte, die mit der Figur mitwandert.
- **Zeitlupe am Höhepunkt:** etwa 0,4 s, weich rein und raus, bis auf 30 % Tempo. Sie wirkt nur auf das
  Spielgeschehen, Musik und Wind laufen normal.
- **Durchgehend:** Regenbogen-Schweif, Glitzer und eine Spur im Akzent der Einlage.
- **Am Höhepunkt:** ein Feuerwerk, ein Sternen-Ring, ein Akzent-Ring und ein Akzent-Burst.
- **Nach der Einlage:** zwei weitere Feuerwerke, also drei insgesamt. Dazu Konfetti-Regen, die Fanfare und die
  Sieg-Haptik.
- Zusätzlich laufen die Effekte der jeweiligen 🎪-Einlage mit (Herzchen, Blitze, Blasen …).

| # | Einlage | Akzent (Spur + Höhepunkt) |
|---|---|---|
| 0 | 🏆 Sieger-Looping | goldene Sterne |
| 1 | 🎡 Doppel-Looping | Regenbogen-Kugeln |
| 2 | 🌀 Korkenzieher-Spirale | Gold-Sterne, Glitzer-Doppelhelix |
| 3 | 🤸 Rückwärts-Salto | Funkel-Sterne |
| 4 | 🪃 Bumerang-Bogen | Herzchen |
| 5 | ⚡ Blitz-Zickzack | Blitz-Funken |
| 6 | 🎆 Feuerwerk-Rakete | Feuer-Funken und Rauchwölkchen, dazu die eigenen 2 Feuerwerke oben |
| 7 | 🌠 Sternschnuppen-Schwung | Sternenstaub |
| 8 | 🫧 Tauch-Korkenzieher | Seifenblasen |
| 9 | 💃 Luft-Wackeltanz | Konfetti |
| 10 | 💫 Superschraube | Sternen-Halo |
| 11 | 🌼 Blumenwirbel (🌸 Blütenwirbel, ✨ Glühwürmchen-Wirbel) | Blütenblätter bzw. Glühwürmchen |

**Neue Klänge** (vorgerendert im OfflineAudioContext, kein Dauer-Loop):
- `trommel`: Trommelwirbel als Anlauf, −28,8 dB.
- `knall`: Feuerwerks-Knall mit Knistern, −25,1 dB.
- `zeitlupe`: „Wuuum“ beim Abbremsen, −25,3 dB.

Zum Vergleich: Looping −25,2 dB, Schraube −26 dB (aktiver RMS mal Mix-Faktor).

**A/B und Tests:**
- `?finale=<n|id>` erzwingt eine Einlage für jeden Sieg.
- `__game.finale(n | 'id')` legt die nächste fest, `null` stellt wieder auf Zufall.
- `__game.finales()` listet alle Einlagen.

**Unverändert:** Die Freuden-Schraube bei jedem Teilziel (878a335). Der 🎪-Knopf mit seinen 11 Einlagen ist beim Sieg
weiter ausgeblendet und gesperrt.

## Teil 2 – Detailliertere Bodentiere

**Asset-Entscheidung: prozedural veredelt, keine fremden Modelle.** Die CC0-Quellen wurden geprüft, jeweils mit der
Lizenzangabe auf der Primärquelle:

| Quelle | Lizenz | Bär | Capybara | Hase | Ente | Stil |
|---|---|---|---|---|---|---|
| Quaternius Ultimate/Animated Animal Pack, Farm Animal Pack | CC0 | – | – | – | – | realistischer Low-Poly-Stil, geriggt |
| Quaternius Ultimate Monsters Bundle | CC0 | – | – | ✓ | – | niedlich |
| Poly Pizza (Einzelmodelle) | Bär, Capybara und Entchen „Poly by Google“ nur **CC-BY 3.0**; als CC0 nur Quaternius-Hase und „Ducky“ (Isa Lousberg) | (CC-BY) | (CC-BY) | ✓ | ✓ (Spielzeug-Ente) | zwei Künstler, uneinheitlich |
| Kenney Cube Pets | CC0 | Eis-/Pandabär | nicht erkennbar | ✓ | ✓ | Würfel-Körper, passt nicht zum runden Stil |

Keine Quelle ist gleichzeitig CC0, stilgleich (rund, Toon) und deckt mindestens 3 der 4 Arten ab. Gemischte
Einzelmodelle würden nicht zusammenpassen. Außerdem bräuchte es einen GLTF-Loader und Skinning (mehr Draw-Calls und
CPU pro Tier).

Belege:
- quaternius.com/packs/ultimateanimatedanimals.html
- quaternius.com/packs/farmanimal.html
- poly.pizza/bundle/Ultimate-Monsters-Bundle-5oyGWAmOB6
- poly.pizza/m/irZjWFARyl (Hase, CC0)
- poly.pizza/m/gt2eYOyOvU (Ducky, CC0)
- poly.pizza/m/dc_78YWzT_R (Bear Cub, CC-BY)
- poly.pizza/m/66d-mKAgF17 (Capybara, CC-BY)
- kenney.nl/assets/cube-pets

**Mehr Form** (Toon-Stil bleibt, liebevoll statt realistisch):
- **Bärenbaby:**
  - Gewölbte Schnauze, Nase mit Glanzpunkt, „w“-Mündchen.
  - Rosa Ohr-Innenseiten und helles Bauchfell.
  - Pfoten mit Haupt- und drei Zehenballen, dicke Hinterkeulen.
  - Stummelschwanz und Ärmchen.
- **Capybara:**
  - Stumpfe, vorn und unten abgeflachte Schnauze („kantiger“) mit breiter Nase und Nasenlöchern.
  - Kleine runde Ohren mit Innenseite, helleres Bauchfell.
  - Pfoten mit Zehen, die Yuzu bleibt auf dem Kopf.
- **Häschen:**
  - Weiße Pausbäckchen, rosa Näschen, Zähnchen.
  - Weißer Bauch, lange Hinterfüße mit rosa Sohlen.
  - Pfoten mit Ballen, Puschelschwanz.
- **Entchen:**
  - Geformter Schnabel: langer Oberschnabel mit hochgebogener Spitze, Unterschnabel, Nasenlöcher.
  - Flügel, drei hochgestellte Schwanzfedern.
  - Federschopf, Schwimmfüße.
- **Alle:**
  - Fell-Verläufe über Vertexfarben (oben heller, unten dunkler, Bauch heller).
  - Weiche **Kontaktschatten**, die die Weltkrümmung mitmachen. Beim Hüpfen werden sie kleiner.

**Mehr Leben**, über ein Rig im Toon-Shader:
- Jeder Vertex kennt sein Gelenk und sein Körperteil, jede Instanz ihre Bewegung (`aAnim`, `aAnim2`).
- Keine Knochen, weiterhin **1 Mesh je Art und ein gemeinsames Material**.
- Beine im Gang-Zyklus:
  - Bär und Capybara: diagonal, die Phase läuft mit der Strecke.
  - Häschen: Hinterläufe strecken beim Hoppeln.
  - Entchen: paddelt.
- Atmen (am Abend langsamer), Blinzeln (alle 2–5,5 s), Ohrenzucken, Schwänzchen-Wedeln.
- **Kopf dreht sich zum Spieler**, wenn er näher als 8 m ist: bis ±60° drehen, nicken bis 34°. Der Körper dreht erst
  mit, wenn der Spieler weit seitlich ist. Sonst schauen die Tiere sich ruhig um. Schlafende Tiere am Abend senken den
  Kopf.
- **Freude beim Besuch** (Besuch oder Beere): Hüpfer, ^ ^-Augen, Herzchen und rosa Ring. Das Häschen wackelt mit den
  Ohren, das Entchen schlägt mit den Flügeln.
- Das **Wildhäschen** (Wiesen-Leben) nutzt dasselbe Rig in sparsamer Fassung. Es schaut den Spieler an, bevor es
  flieht.

**Dreiecke je Tier (vorher → nachher):**
- Bär 3,6 k → 4,9 k
- Häschen 2,6 k → 3,8 k
- Capybara 1,5 k → 3,8 k
- Entchen 2,3 k → 3,0 k
- Wildhäschen 0,9 k → 1,4 k

## Teil 3 – Haptik am iPhone (geprüft, ehrlich)

- **Befund:** Am iPhone gibt es kein `navigator.vibrate`. Unser Ersatz ist ein verstecktes `<input switch>`, das per
  `label.click()` angesprochen wird. Laut README der Bibliothek ios-haptics (Stand f5272ef943, 29.04.2026) hat Apple das
  mit **iOS 26.5 abgestellt**: „you can no longer trigger haptic feedback programmatically by calling `.click()` on a
  `<label>` … it can no longer be done programmatically“. Seit iOS 26.5 geht Haptik nur noch, wenn der echte Finger
  selbst auf dem Schalter landet (neue ios-haptics-Version, Commit 584eb496ef).
- **Folge für uns:** Unsere Vibrationen kommen bei Ereignissen (Sieg, Stern), nicht beim Tippen. Auf iPhones mit iOS
  26.5 oder neuer vibriert die Schmetterlingswiese deshalb nicht. Das ist kein Fehler und stört nicht, aber es gibt
  dort einfach keine Haptik. Bis iOS 26.4 funktioniert sie weiter.
- **Android:** Es vibrieren nur noch **Sieg, Stern und Kunststück**. Jeder Puls ist mindestens 25 ms lang (Kunststück
  28 ms, Stern 25–60–25, Sieg 30–60–30–60–90). Sammeln, Ringe, Landen, Schubser, Böen, Tippen und Freischalten
  bleiben still. Kein großer Umbau.

## Belege

- **`tests/run_all.sh` komplett grün** (in Blöcken, 17 Suiten):
  - Alle Level gewonnen (15 Level in allen Stufen + Tagesaufgabe). Fortschritt nach Neuladen identisch.
  - Außerdem grün: `test_stuntshow`, `test_schmuck`, `test_magnet_stuck`, `test_glitter_bounds`, `test_ui`,
    `test_v22`, `test_v22_werkstatt`, `test_pwa_input`, `test_audio`, `test_flight_audio`, `test_anatomy`,
    `test_leaks`, `test_perf`, `test_frametimes`.
- **`test_celebrate` (neu, ok):**
  - Die Freuden-Schraube ist unverändert: 6,1 rad, Steuerung wirkt, höchstens 2,6 Umdrehungen gestapelt.
  - Jede der 12 Sieger-Einlagen wurde einzeln per Debug-API echt angeflogen:

    | Messung | Ergebnis |
    |---|---|
    | Figur im Bild (alle Frames) | 100 % |
    | kleinster Bodenabstand | 2,6–3,1 m |
    | Endwinkel | exakt 0 |
    | Zeitlupe (tiefster Wert) | 0,30–0,31 |
    | Höhepunkt ausgelöst | ja |
    | Ergebnis erscheint nach | 3,5–5,2 s |

  - Zufall über 6 Siege: nie zweimal direkt dieselbe Einlage, `lastFinale` stimmt jedes Mal.
  - `?finale=bumerang` per URL im Querformat: ok, 100 % im Bild.
  - Landen als letzte Aufgabe (2-1): Die Einlage startet vom Boden, das Ergebnis erscheint.
  - Burst 6 × 160 ms um den Höhepunkt je Einlage: `tests/shots/v24/finale_<id>_grid.jpg`. Übersicht:
    `finale_bogen_apex.jpg`.
- **`test_v24_tiere` (neu, ok):**
  - Kopf zum Spieler: Restfehler 0,00 rad bei allen wachen Tieren.
  - Beine: Weite 0,5–0,7 rad beim Laufen, die Proben wechseln im Schritt das Vorzeichen.
  - Blinzeln: 2–3 Mal in 6 s.
  - Freude: ^ ^-Augen und 9 Herzchen.
  - Nahaufnahmen jeder Art in Wiese, Teich, Kirschhain und Abend, hoch und quer: `tests/shots/v24/tiere_*.jpg`.
  - Vorher/Nachher-Vergleiche: `vergleich_tiere_hoch|seite|quer|welten.jpg`.
- **Mit Vision angesehen, gefunden und behoben:**
  - Sieger-Einlage:
    - Seitlich ausschwingende Bahnen (Korkenzieher, Bumerang, Zickzack) liefen im Hochformat aus dem Bild. Die
      Kamera-Mitte folgt jetzt zu 50 % der Figur.
    - Drei große Ringe überlagerten sich am Höhepunkt. Blitz-Ring kleiner.
    - Die Regenbogen-Kugeln nah an der Kamera wirkten zu wuchtig. Sie sind jetzt kleiner.
  - Tiere:
    - Die Capybara-Schnauze wirkte erst wie ein dunkler Maulkorb vor den Augen, dann wie eine Kiste. Jetzt ist sie
      eine stumpfe Kugel.
    - Der Entchen-Schnabel sah aus wie breite Lippen. Jetzt ist er schmal und lang.
    - Unter den ^ ^-Augen blieb ein dünner Strich des offenen Auges. Er klappt jetzt ganz weg.
  - Test-Artefakte: Die Besuchs-Aufgabe zeigte in den Nahaufnahmen immer Freuden-Augen, ein eingefrorenes Blinzeln
    machte „böse“ Augen, und die Spielfigur stand vor der Kamera. Der Test ist angepasst.
- **Budget** (feste Ansicht, `tests/out/v23_info_v24_*.json`, A/B gegen v2.3 auf derselben Maschine):

  | Stufe | Level 1-1 Draw-Calls | Level 1-1 Dreiecke | alle Welten Dreiecke |
  |---|---|---|---|
  | Niedrig | 73 → 75 | +2,4 % | +1,6 … +4,6 % |
  | **Mittel (Handy)** | **90 → 89** | **+0,8 %** | +0,8 … +3,0 % |
  | Hoch | 94 → 98 | +2,2 % | +0,5 … +2,7 % |

  - Grenzen eingehalten: höchstens +10 Draw-Calls und +15 % Dreiecke. Neu sind genau 2 Draw-Calls, die
    Kontaktschatten der Aufgaben-Tiere und der Wildhäschen. Der Rest der Schwankung sind Kacheln im Blickfeld.
  - Frametimes, A/B mit alter Version (headless, maschinenbedingt nur ~10–20 rAF/s, rAF-Werte quantisiert):
    p50 alt 83 ms, neu 50–83 ms. CPU-Update 0,56–0,85 ms, vorher 0,68–0,77 ms. Also gleichwertig.
  - Keine Lecks: Geometrien, Texturen und Programme in Runde 1 und 2 gleich (65/9/34).
  - Audio-Mix: Wiese −16,1 LUFS, Abend −15,9 LUFS (vorher −16,2 / −16,0).
- **Deployment:**
  - Gepusht (Commits `752046c` … `ad60eb0` + Bericht). GitHub Pages liefert Build `2261c1c502`, gleich wie lokal.
  - `test_live.py` gegen github.io: Ton erst nach dem Tipp, Level gewonnen, Freischaltung, offline neu laden,
    **0 Fehler**.
  - Zusätzlich live: Version 2.4.0, die drei neuen Klänge sind gerendert, das Tier-Rig ist aktiv,
    `?finale=rakete` → Rakete → Ergebniskarte, **0 Fehler**.

## Grenzen / offen

- Nicht auf einem echten Handy gemessen. Die Budget-Zahlen sind geräteunabhängig. Tempo und Zeitlupe der
  Sieger-Einlagen bitte mit den Kindern am Handy prüfen.
- Die neuen Klänge sind gemessen, aber nicht angehört.
- iPhone ab iOS 26.5: keine Haptik (siehe Teil 3).
- Das Entchen paddelt unter Wasser, dort sieht man die Füße kaum. An Land sieht man sie.

## Was die Kinder ausprobieren sollen

1. **Handy:** App einmal ganz schließen und neu öffnen, oder im Menü kurz warten. Die neue Version lädt dann von
   selbst neu. Beim ersten Start werden die neuen Klänge kurz gezaubert.
2. **Ein paar Level hintereinander gewinnen:** Jedes Mal kommt eine andere Sieger-Einlage, mit Trommelwirbel,
   Zeitlupe am Höhepunkt und Feuerwerk. Welche ist die schönste? Ist die Zeitlupe zu lang oder zu kurz?
3. **Zu den Tierbabys fliegen und langsam heranschweben:** Sie drehen den Kopf zu dir, blinzeln und wackeln mit den
   Ohren. Beim Besuch (Level 1-2 „Bärenbabys besuchen“) hüpfen sie, machen ^ ^-Augen und verteilen Herzchen. Laufende
   Tiere bewegen jetzt die Beine. Im Teich-Level die Entchen anschauen.
4. **Rückmeldung:** Sind die Tiere so niedlich genug? Fehlt einem Tier etwas?
