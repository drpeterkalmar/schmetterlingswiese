# Schmetterlingswiese 2.5 – Zielpfeil am Himmel, saubere Nektar-Landung, Stunt-Richtung, Wettflug-Sterne

Stand: 01.10.2026 · Branch `main` · Live: https://drpeterkalmar.github.io/schmetterlingswiese/ (Version 2.5.1, Nachtrag unten)

Wünsche (29.09.): „Zielpfeil höher am Himmel platzieren. Nektar saugen fixen, derzeit schneidet nach der Landung die
Sonnenblume durch die Spielfigur. Alle Stunts sollten nach Abschluss nicht die Flugrichtung ändern, aber ich glaube, das
ist eh schon der Fall. Bei Wettflügen gibt es keine Glitzersterne, Bewertung nur durch Zeitlimits.“

## 1. Zielpfeil hoch am Himmel

**Was sich ändert:**
- Der Pfeil schwebt jetzt im oberen Bilddrittel über und vor der Figur, knapp unter der Kopfleiste. Im Hochformat sitzt
  er zusätzlich unter dem Platz der Meldungen („Neu im Album …“).
- Die Lage wird aus dem echten HUD gemessen (zweimal pro Sekunde). Dadurch passt sie auch bei zweizeiliger
  Aufgabenleiste oder einer Notch.
- **Quer mit Tipp-Steuerung** liegt dort, wo Platz wäre, das blasse „▲ steigen“-Symbol. Dann steht der Pfeil rechts
  daneben. Mit Joystick steht er mittig.
- **Größer:** Die Größe richtet sich nach der Bildhöhe, nicht nach einer festen Weltgröße.

  | | vorher (v2.4) | nachher |
  |---|---|---|
  | Pfeillänge hoch | ≈ 43 px | 84 px |
  | Pfeillänge quer | ≈ 31 px | ≈ 45 px |
  | Abstand zur Kamera | 7–9 m | 10,2 m hoch / 7,5 m quer |

- **Gut sichtbar:**
  - Dunkelbraune Kontur (hilft vor hellem Himmel). Vor dem Abendhimmel leuchtet das Gelb von selbst; dort ist der
    gemessene Kontrast 2–3× höher als am Tag. Ein eigener Leuchthof war deshalb überflüssig und fiel wieder weg (spart
    Zeichenaufrufe).
  - Ohne Tiefentest gezeichnet, also nie hinter Bäumen versteckt.
  - Kontur, Schaft und Spitze sind ein Mesh, also 1 Zeichenaufruf wie vorher.
- **Richtung eindeutig:**
  - Liegt das Ziel tief unten, zeigt er deutlich nach unten. Den senkrechten Anteil verstärke ich ×1,4.
  - Er zeigt nie genau auf die Kamera zu oder von ihr weg, sondern immer mindestens 60° quer dazu. Vorher sah er in
    diesem Fall aus wie ein runder gelber Fleck, im Abendhimmel wie ein Mond. Mit 40° wirkte die Spitze noch verkürzt wie
    ein Klecks (Vision-Befund), deshalb 60°.
  - Liegt das Ziel hinter der Figur, zeigt er zur Seite (umdrehen).
- **Ausblenden:**
  - In Zielnähe blendet er weich zwischen 9 und 6 m aus. Vorher verschwand er hart bei 7 m.
  - Er blendet auch aus, sobald er über der Figur, den nächsten Ringen, Tropfen, Landeplätzen, Tierbaby-Herzen, dem
    Glitzerstern oder einer Meldung läge.

**Messung** (`tests/test_v25_pfeil.py`, Projektion inkl. Weltkrümmung, 412×915 und quer, alle 5 Welten):

| | vorher (v2.4) | nachher |
|---|---|---|
| Pfeilmitte hoch | 45 % der Bildhöhe | 24–25 % |
| Pfeilmitte quer | 42 % | 21–22 % |
| Abstand zur Figuren-Box hoch | – | 160–218 px |
| Abstand zur Figuren-Box quer | – | 67–103 px |

Weitere Ergebnisse:
- Keine Überlappung mit Pause, Aufgaben, Zeit, STUNT-Knopf und Steuer-Symbolen.
- Ziel 16 m tiefer: Richtung y = −0,95, die Spitze liegt im Bild 76 px (hoch) bzw. 40 px (quer) tiefer als der Schwanz.
- Ziel genau hinten: Der Pfeil zeigt zur Seite und ist im Bild deutlich länglich (60 von 72 px).
- Unter 6 m: ausgeblendet.
- Ein Ring direkt hinter dem Pfeil: Er blendet aus (1,0 → 0,0).

Bilder:
- `tests/shots/v25/pfeil_welten_hoch.jpg`, `pfeil_welten_quer.jpg`
- `pfeil_<welt>_<hoch|quer>.jpg`, `pfeil_tief_*.jpg`, `pfeil_hinten_*.jpg`

## 2. Nektar-Landung ohne Durchschneiden

**Ursache (bestätigt):**
- Hermes lag richtig: Der Landeplatz lag 0,42·s über der Kopfmitte, also in der fast senkrechten Blütenebene.
- Gemessen an v2.4 (gleiche Methode wie der neue Test): Die Figur steckte bis zu 57 cm im Sonnenblumen-Kranz.
- Dazu kamen zwei weitere Ursachen:
  - Auf Seerosenblättern mit Lotusblüte stand die Blüte in der Figur.
  - Nach dem Naschen drehte die Freuden-Schraube die Figur noch auf der Blüte, sodass die Flügel durch die Blätter fegten.
    Diese Ursache fand der neue Test.

| Blume (v2.4) | Schmetterling | Biene | Marienkäfer | Riese | Katze (groß) |
|---|---|---|---|---|---|
| Sonnenblume | −24 … −39 cm | −27 … −39 | −29 … −44 | −35 … −48 | −43 … −57 |
| Seerose (mit Lotus) | bis −14 cm | bis −27 | bis −32 | bis −28 | bis −33 |
| Mondblume | +12 cm | −3 | +2 | +4 | −5 |

(negativ = so tief steckte der unterste Punkt der Figur unter der Blütenoberfläche; `tests/out/v24_vorher_landen.json`)

**Lösung:**
- **Honig-Sonnenblumen:** Die Sonnenblumen, auf denen man landen soll, werden gegen eine Variante getauscht, deren Kopf
  in den Himmel schaut. Das Gesicht ist ≈ 25° geneigt, Farben und Form bleiben gleich. Die Figur sitzt auf dem Kerngesicht,
  schaut nach vorn und leicht nach unten und schlürft.
- Gewählt werden freistehende Blumen: Der nächste Nachbarkopf ist mindestens 3 m entfernt, damit auch Riesen Platz haben.
- **Seerose:** Nur Blätter ohne Lotusblüte. Auf Seerose und Mondblume darf man sich im Sitzen weiter drehen.
- **Figur-genaue Sitzhöhe** (`js/game/seat.js`):
  - Aus der Blüte entsteht ein Höhenfeld (1,5 cm Raster, oberste Fläche).
  - Die Figur samt Flügeln, Hut, Schmuck und Umhang wird entlang der Blüten-Normalen genau so weit abgesetzt, dass jeder
    ihrer Punkte darüber liegt, plus 2,5 cm Luft.
  - Das gilt automatisch für jede Figur, Größe und Werkstatt-Kombination.
- **Wiegen:** Die Honig-Sonnenblume wiegt im gleichen Wind wie das Feld. Diesmal wird das in JS gerechnet, und die Figur
  wird exakt mitgeführt (Position und Neigung).
- **Aufsetzen:**
  - Die Figur fliegt einen Schwebepunkt über ihrem Sitz an, von oben.
  - Sie richtet sich dort aus und senkt sich dann ab (0,5 s).
  - Die Füße bleiben beim Federn auf der Blüte.
  - Eine laufende Freuden-Schraube wird erst fertig, bevor aufgesetzt wird.
  - Die Schraube nach dem Naschen kommt erst 0,3 s nach dem Abheben.
- **Kamera im Sitzen:**
  - Sie wählt den ersten freien Winkel, bevorzugt den gewohnten mit Blick aufs Gesicht.
  - Hindernisse sind Nachbar-Sonnenblumen, andere Honig-Blumen und Baumkronen.
  - Sie wird nie in einen Blütenkopf oder eine Krone geschoben.
- Die Landemarke verschwindet, solange man sitzt. Vorher schnitt der Ring durch die Flügel.
- Tierbabys machen Platz, wenn die Figur ihnen näher als 2,2 m kommt. Im Bild schwamm ein Entchen in eine sitzende Figur.

**Messung** (`tests/test_v25_landen.py`):
- Getestet: 9 Figuren × 5 Größen (Winzling bis Riese) × 3 Blumenarten = 135 echte Landungen. Reihum kamen alle 11 Hüte,
  4 Schmuck-Teile, 3 Flügelformen und 5 Fühler dran.
- Gerechnet wurde unabhängig vom Spielcode:
  - Die Blüte wie gerendert (Instanz-Matrix aus dem Mesh), 5-mm-Raster, exakte Dreieckshöhe.
  - Jede Figur mit allen Ecken plus Flächen-Abtastung ≤ 2,5 cm.
  - Jedes Bild der ganzen Sitzdauer, inklusive Wiegen und Drehen im Sitzen.

| | Sonnenblume | Seerose | Mondblume |
|---|---|---|---|
| kleinster Abstand im Sitzen | 3,0 cm | 2,2 cm | 2,6 cm |
| größter Abstand im Sitzen | 7,3 cm | 3,2 cm | 4,2 cm |
| kleinster Abstand beim Aufsetzen | 3,4 cm | 2,2 cm | 2,8 cm |
| Kamera ↔ Blüten/Kronen | ≥ 1,5 m | frei | ≥ 1,2 m |
| sonst | Nachbar-Köpfe ≥ 2,9 m | Wasser ≥ 6 cm | |
| geprüfte Bilder | 2331 | 4684 | 2350 |

- Kosten: Sitzhöhe 0,05–0,3 ms beim Drehen (M1), einmalig bis 3 ms beim Landen.
- Die Nektar- und die Mondblume sind dieselbe Form (nur die Farbe unterscheidet sich). Getestet ist die Mondblume (5-2);
  die bunte Nektarblume kommt nur als Ersatz vor.

**Bilder** (jede Figur + Riese mit Helm und Umhang + Winzling):
- 4 Blickwinkel: Spielkamera, Seite flach, hinten oben, vorn nah.
- `tests/shots/v25/landen_<sun|lily|big>_<hoch|quer>_<1|2>.jpg` und `landen_*_spiel.jpg`.
- Mit Vision geprüft: Die Figur sitzt sichtbar auf der Blüte, nichts steckt drin.

## 3. Stunts behalten die Flugrichtung (abgesichert)

`tests/test_stuntshow.py` prüft jetzt jede der 11 🎪-Einlagen zusätzlich in 5 Fällen:
- Start während die Figur lenkt: Drehrate beim Start 1,8 rad/s, die Taste wird beim Start losgelassen.
- Wie oben, aber die Taste bleibt die ganze Einlage gedrückt: bildgenau am letzten Einlagen-Bild gemessen.
- Start knapp über dem Boden (1 m).
- Start direkt nach dem Abheben: < 0,2 s in der Luft.
- Riesen-Modus.

**Ergebnis:**
- Richtungsänderung in allen 55 Läufen 0,000 rad.
- Seitenversatz ≤ 0,01 m.
- Bodenabstand ≥ 0,74 m.

Peter hatte recht, es war nichts zu reparieren. Die Einlage übernimmt die Flugrichtung beim Start, setzt die Drehrate auf
null und fasst die Richtung bis zum Ende nicht an.

## 4. Wettflüge: keine Glitzersterne, Sterne nur über Zeiten

**Was sich ändert:**
- In 2-3 „Wettflug mit Flora“ und 3-3 „Libellen-Rennen“ gibt es keinen Glitzerstern mehr, auf allen Stufen.
- Die Sterne: ⭐ Rennen gewonnen · ⭐ schneller als par · ⭐ ⚡ Blitzzeit (= 0,8 · par). Auf Schwer ersetzt die Blitzzeit
  den Kombo-Stern, eine Kombo bringt dort nichts.
- Level-Karte und Ergebnis zeigen die Zeitziele („⚡ Blitzzeit: schneller als 33 Sekunden“, „⚡ Blitzzeit 33 s ✅“).
- Gespeicherte Sterne bleiben: Es wird nur hochgestuft, auch alte 3 Sterne aus Glitzerstern-Zeiten bleiben.
- Andere Level sind unverändert (Glitzerstern bzw. Schwer-Kombo). Das Abzeichen „Sternensucher“ bleibt erreichbar.

**Neue Zeitziele:**
- Das alte Level-par (96–164 s) passte nicht zu Rennen, die 25–35 s dauern. Eine Blitzzeit von 0,8 · Level-par wäre
  geschenkt gewesen (≈ 100 s).
- Deshalb haben die Rennen eigene Zeitziele (`raceTimes` in `levels.js`), geeicht mit dem Level-Test-Flieger (Autopilot,
  Rivalin geparkt, Qualität 0 und 1).
- Blitzzeit ≈ 1,2 × seine Zeit, par = Blitzzeit / 0,8.

| Level | Stufe | Test-Flieger | par | ⚡ Blitzzeit | Zeitlimit |
|---|---|---|---|---|---|
| 2-3 Flora | Leicht | 27,1 s | 41 s | 33 s | – |
| 2-3 Flora | Mittel | 27,4 s | 41 s | 33 s | – |
| 2-3 Flora | Schwer | 23,5 s | 36 s | 29 s | 144 s (wie bisher) |
| 3-3 Libelle | Leicht | 32,8 s | 50 s | 40 s | – |
| 3-3 Libelle | Mittel | 28,7 s | 43 s | 35 s | – |
| 3-3 Libelle | Schwer | 26,5 s | 40 s | 32 s | 153 s (wie bisher) |

Nebenbei korrigiert: Die Level-Karte zeigte auf Schwer ein zu kurzes Zeitlimit (par · 1,5 statt par · 1,2 · 1,5,
z. B. 120 statt 144 s). Jetzt steht dort das echte Limit.

**Messung** (`tests/test_v25_wettflug.py`, auf allen Stufen):
- Karten-Texte stimmen.
- Kein Glitzerstern in den Rennen, in 1-1 und 2-1 weiter vorhanden.
- Sieg mit Blitzzeit ergibt 3 Sterne, unter par 2, langsam 1, jeweils mit Kombo 99.
- Danach bleiben gespeichert 3 Sterne. Ein altes Profil mit 3 Sternen bleibt bei 3.
- Der Test-Flieger gewinnt auf Leicht und Mittel echt mit 3 Sternen (2-3: 27,1 / 26,1 s, 3-3: 32,8 / 28,7 s).

Bilder: `tests/shots/v25/wettflug_karte_<hoch|quer>.jpg`, `wettflug_ergebnis_<hoch|quer>.jpg`.

**Offen, bitte entscheiden (nicht geändert):**
- Auf **Schwer** verliert selbst der Test-Flieger beide Rennen knapp. Die Rivalin fliegt dort mit 104 % des Spieler-Tempos
  die Ideallinie (Flora 21,9 s gegen 23,5 s, Lilli 24,6 s gegen 26,5 s). Das war schon in v2.4 so.
- Gewinnen kann man dort praktisch nur mit perfekten Abkürzungen durch die Ringränder. Wer gewinnt, hat automatisch alle
  drei Zeit-Sterne.
- Vorschlag: Rivalin auf Schwer 1,04 → 0,97. Dann gewinnt ein guter Flieger knapp.

## Belege

- **`tests/run_all.sh` komplett grün** (in Blöcken, 20 Suiten):
  - Alle 15 Level auf allen Stufen plus Tagesaufgabe gewonnen; Fortschritt nach Neuladen identisch.
  - `test_celebrate`, `test_stuntshow` (inkl. der 55 neuen Richtungs-Läufe), `test_v25_pfeil`, `test_v25_wettflug`,
    `test_v25_landen`, `test_v24_tiere`, `test_schmuck`, `test_magnet_stuck`, `test_glitter_bounds`, `test_ui`,
    `test_v22`, `test_v22_werkstatt`, `test_pwa_input`, `test_audio`, `test_flight_audio`, `test_anatomy`, `test_leaks`,
    `test_perf`, `test_frametimes`.
  - Angepasst: `test_glitter_bounds` erwartet in Wettflügen jetzt keinen Glitzerstern mehr (prüft genau das).
  - `test_stuntshow`: Die Stunt-Liste im Spiel hält höchstens 60 Einträge. Nach den neuen Läufen war sie voll, deshalb
    wird sie vor dem Knopf-Teil geleert (nur ein Test-Detail).
- **Neu in der Suite:** `test_v25_pfeil`, `test_v25_wettflug`, `test_v25_landen`. Dazu die Sonderfälle in `test_stuntshow`.
  Die Bilder erzeugt `tests/test_v25_shots.py`.
- **Performance** (A/B auf derselben Maschine, `tests/out/perf_v24_vorher.json`, `frametimes_v24_vorher.json`):

  - Der erste Lauf wirkte schlechter, weil die Maschine gerade durch die Hintergrundbild-Animation belastet war. Deshalb
    lief der Vergleich direkt nacheinander mit v2.4 aus einem zweiten Arbeitsverzeichnis.
  - Zwei echte Kosten habe ich dabei gefunden und behoben:
    - Der Pfeil las jedes Bild die Canvas-Größe aus dem DOM (Zwangs-Layout). Jetzt kommt sie aus dem Renderer.
    - Beim ersten Anflug wurden Figurform und Sitzhöhen gerechnet (einmal bis ≈ 5 ms). Das passiert jetzt beim Laden.

  | Stufe | Draw-Calls v2.4 → v2.5 (5 Welten) | Dreiecke | CPU-Update |
  |---|---|---|---|
  | Niedrig | 73–84 → 73–83 | −1,3 … +1,4 % | 0,72 → 0,89 ms |
  | **Mittel (Handy)** | **91–96 → 91–94** | **−0,9 … +0,7 %** | **0,78 → 0,81 ms** |
  | Hoch | 95–103 → 94–105 | −0,9 … +2,0 % | 0,68 → 0,67 ms |

  - Frametimes (Level 2-1 mit Autopilot, landet auf Sonnenblumen):
    - p50 v2.4 50 ms, v2.5 17–33 ms (headless, quantisiert).
    - CPU-Update v2.4 0,67–0,78 ms, v2.5 0,70–0,85 ms, also gleichwertig.
  - Keine Lecks: Geometrien, Texturen und Programme in Runde 1 und 2 gleich (65/9/34, wie v2.4).
  - Sitzhöhe beim Drehen im Sitzen: 0,05–0,3 ms; einmalig bis 3 ms pro Landeplatz beim Laden.
- **Deployment:**
  - Gepusht als Commit `5b5efe0`. GitHub Pages liefert Build `6ec1c7eb18`, gleich wie lokal.
  - `test_live.py` gegen github.io: Ton erst nach dem Tipp, Level gewonnen, Freischaltung, offline neu laden, **0 Fehler**.
  - Zusätzlich live:
    - Version 2.5.0.
    - 2-1 hat 5 Honig-Sonnenblumen, die Figur landet auf dem Sitz.
    - 2-3 hat keinen Glitzerstern, Blitzzeit 33 s.
    - 0 Fehler.

## Grenzen

- Nicht auf einem echten Handy gemessen. Die Pfeil-Lage ist für 412×915 und 915×412 gemessen und passt sich dem HUD an.
- Honig-Sonnenblumen schauen in den Himmel, die übrigen Sonnenblumen im Feld weiter zur Sonne. So sieht man die
  Landeblumen auch von oben gut.
- Die Schwer-Rennen sind wie bisher kaum gewinnbar (siehe oben).

## Für Peter: auf dem Handy ausprobieren

1. **App einmal ganz schließen und neu öffnen** (oder im Menü kurz warten). Die neue Version 2.5.0 lädt dann von selbst.
2. **Level 1-1 auf Leicht:** Der gelbe Pfeil schwebt jetzt oben am Himmel. Ist er gut zu sehen und groß genug? Auch quer?
3. **Level 2-1 „Honigsammler“:** Auf den Sonnenblumen mit dem Leuchtring landen (▼ halten). Die Figur sitzt jetzt oben auf
   dem Blütengesicht und schlürft. Gerne mit Riesen-Modus und Hut probieren. Dasselbe auf den Seerosen (3-1) und den
   Mondblumen (5-2).
4. **Wettflug 2-3 oder 3-3:** Auf der Level-Karte stehen jetzt Zeitziele. Wer die ⚡ Blitzzeit schafft, bekommt den dritten
   Stern.
5. **Rückmeldung:** Sollen die Rennen auf Schwer leichter werden (siehe „Offen“)?

## Nachtrag v2.5.1 – Nektar-Landung leichter (01.10.2026)

Wunsch (30.09.): „Nektarlandung leichter machen (man muss nicht so präzise treffen).“
Die Sitz-Geometrie aus v2.5 bleibt unverändert. Geändert sind nur Fang und Anflug (`js/actors/player.js`).

**Was sich ändert:**
- **Großer Fangbereich:**
  - ▼ fängt einen Landeplatz jetzt im Umkreis von ≈ 5 m statt 2,6–2,8 m (Faktor 1,9).
  - Der Bereich wächst mit der Figur: Riese ×1,11, Winzling ×0,92.
  - In der Höhe gilt: bis 8 m darüber (vorher 6 m) und bis 2,5 m darunter.
  - Von unten fängt er nur außerhalb der Blüte. Die Figur steigt dann erst und gleitet von oben hinein, nie von unten
    oder seitlich durch den Blütenkranz.
- **Einrasten:**
  - Ist ein Platz gefangen, holt die Blume die Figur von selbst herein und sie setzt auf. Kurz tippen reicht, ▼ muss nicht
    gehalten werden.
  - Abbrechen geht nur aktiv: ▲ (steigen) oder deutlich wegsteuern (≥ 0,45 s links/rechts).
  - Erledigte Blumen fangen nie.
  - Über dem Teich landet die Figur nicht mehr auf dem Wasser.
- **Anzeige:**
  - Ein flacher hellblauer **Leuchtkreis** zeigt den Fangbereich jeder offenen Landeblume (sichtbar ab ≈ 16 m Nähe).
  - Beim Einrasten kommen ein leises Aufsetz-Glitzern, ein Ton und Haptik.
  - Beim ersten Mal erscheint der Hinweis „✨ Eingefangen! Die Blume holt dich – ▲ oben halten zum Abbrechen“.
- **A/B:** `?landen=<Faktor>` in der URL stellt den Fangbereich ein. `?landen=1` ist genau das Verhalten von v2.5.0, ohne
  Einrasten.

**Messung** (`tests/test_v251_fang.py`):
- Je Blumenart 30 Bot-Anflüge mit zufälligem Versatz 0–5 m und Höhe 1–8 m über der Landemarke. Die Figur fliegt mit
  voller Geschwindigkeit und schaut ungefähr zur Blume.
- ▼ wurde entweder nur 0,3 s getippt oder gehalten.
- „Vorher“ ist der Stand v2.5.0 (`?landen=1`).

| Landequote bei Versatz ≤ 4 m | ▼ getippt vorher | ▼ getippt nachher | ▼ gehalten vorher | ▼ gehalten nachher |
|---|---|---|---|---|
| Sonnenblume (2-1) | 4 % | **100 %** | 96 % | **100 %** |
| Seerose (3-1) | 5 % | **100 %** | 100 % | **100 %** |
| Mondblume (5-2) | 12 % | **100 %** | 100 % | **100 %** |

- Über alle Versätze bis 5 m: getippt 100 / 97 / 100 %, gehalten 100 / 97 / 100 %. Die fehlenden 3 % bei der Seerose sind
  eine Landung auf einem näheren, noch offenen Nachbarblatt. Das ist eine richtige Landung, nur auf einem anderen Blatt.
- Fehllandungen auf Boden oder Wasser: 0 (vorher 1 Bodenlandung neben der Sonnenblume beim Halten).
- Auf erledigten Blumen: 0 von 18 Versuchen gelandet.
- Abbruch mit ▲: in allen Versuchen kein Aufsetzen.
- `test_v25_landen` bleibt grün: im Sitzen weiterhin ≥ 2,5 cm Abstand zur Blüte, beim Aufsetzen ≥ 2,5 cm.
  `test_levels`, `test_celebrate` und `test_ui` sind ebenfalls grün.

Bilder:
- `tests/shots/v25/fang_leuchtkreis_sonne.jpg`, `fang_leuchtkreis_teich.jpg` (der Fangbereich).
- `fang_eingerastet_sonne.jpg`, `fang_gelandet_teich.jpg` (nach kurzem Tippen eingefangen und gelandet).

**Für Peter:**
- App einmal ganz schließen und neu öffnen (Version 2.5.1).
- In 2-1, 3-1 oder 5-2 in die Nähe einer Landeblume fliegen: Der hellblaue Kreis zeigt, wo ein kurzes ▼ reicht.
- Ist der Kreis zu groß oder zu klein? Zum Ausprobieren gibt es `…/schmetterlingswiese/?landen=1.5` oder `?landen=2.5`.
