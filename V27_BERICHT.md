# Schmetterlingswiese 2.7 – 8 Missionen pro Welt, nächste Welt trotzdem früh frei

Stand: 05.10.2026 · Branch `main` · Live: https://drpeterkalmar.github.io/schmetterlingswiese/ (Version 2.7.0)

Wunsch (03.10.): „Mehr Missionen (scrollbar) in jeder Schmetterlingswiese-Welt, nächste Welt trotzdem früh freischaltbar.“

## Bitte am Handy testen

- https://drpeterkalmar.github.io/schmetterlingswiese/ (falls noch 2.6 erscheint: App einmal schließen und neu öffnen)
- **Weltkarte:** In jeder Welt-Karte senkrecht wischen → die Missionsliste scrollt. Waagrecht wischen (auch auf der
  Liste) → nächste Welt. Sieht das Kind am ▼ und am verblassenden Rand unten, dass noch mehr kommt?
- **Gesperrte Welt antippen** → „Schaffe noch 1 Mission in 🌼 Frühlingswiese!“. Auf der Karte stehen ⭐⭐○ und „2 / 3“.
- **Euer Spielstand bleibt:** Wer schon in Welt 2 war, sieht jetzt in Welt 1 die Missionen 4–8 dazu (4 ist offen).
- **Kunststück-Missionen** (1-4, 2-6, 4-4, 5-5): der STUNT-Knopf leuchtet golden, jedes 🎪-Kunststück zählt.
- Zum Ausprobieren der Freischalt-Schwelle: `…/schmetterlingswiese/?weltfrei=2` (oder 1, 4, 8 …).

## Freischalt-Regel

- In einer Welt **der Reihe nach**: Mission n braucht mindestens 1 ⭐ in Mission n−1 (egal auf welcher Stufe).
- Die **erste Mission der nächsten Welt** öffnet, sobald in der Welt davor **3 Missionen** geschafft sind (`WORLD_UNLOCK = 3`
  in `js/game/levels.js`, URL `?weltfrei=N`). Mit der Reihenfolge sind das die 3 bisherigen Level → genauso früh wie bis 2.6.
- „Weiter ➜“ nach einem Sieg führt zur **nächsten Mission derselben Welt**, nach Mission 8 zur ersten der nächsten Welt.
  Hat der Sieg gerade eine Welt geöffnet, steht zusätzlich der Knopf **„🌻 Neue Welt offen: Sonnenblumenfeld ➜“**.
- Gesperrte Mission antippen → „🔒 Schaffe zuerst Mission 4!“.
- Abzeichen „Wiesen-Held“ usw. heißt jetzt „Alle Missionen: …“ (alle 8). Wer es schon hat, behält es.
- Keine Speicher-Umstellung nötig: Die alten Level heißen weiter `1-1` … `5-3`; die Regel wird aus den Sternen berechnet.

## Missionen je Welt (neu: 4–8)

| Welt | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|
| 🌼 Wiese | Kunststück-Wiese (3 🎪 + 6 Tropfen) | Hasen-Hüpfrunde (3 Besuche + 6 Ringe) | Beeren für die Bärchen (3 Beeren) | Tiefflug über die Wiese (10 tiefe Ringe + 5 Tropfen) | **Wettflug mit Hugo Hummel** (10 Ringe) |
| 🌻 Sonne | Sonnenbad (4 Sonnenblumen + 6 tiefe Ringe) | Hasen im Sonnenfeld (4 Besuche + 6 Tropfen) | Sonnen-Kunststücke (3 🎪 + 3 Sonnenblumen) | Beeren-Picknick (3 Beeren + 6 Ringe) | Großer Sonnen-Slalom (14 tiefe Ringe + 3 Sonnenblumen) |
| 🪷 Teich | Tropfen überm Teich (10 über Wasser) | Hallo, Entchen! (4 Besuche + 3 Seerosen) | Seerosen-Frühstück (3 Beeren + 3 Seerosen) | Ringe überm Wasser (10 Ringe + 5 Tropfen über Wasser) | Großer Teich-Parcours (12 wilde Ringe + 4 Seerosen) |
| 🌸 Kirsch | Blüten-Kunststücke (10 Blüten + 3 🎪) | Picknick unterm Kirschbaum (3 Beeren + 8 Blüten) | Kirschblüten-Kunterbunt (6 Tropfen + 8 Blüten) | Blütenwirbel (10 wilde Ringe + 10 Blüten) | **Flora will Revanche!** (11 Ringe) |
| ✨ Abend | Mondblumen-Naschen (5 Mondblumen + 6 Glühwürmchen) | Nacht-Kunststücke (3 🎪 + 10 Glühwürmchen) | Abendbrot für Tierbabys (3 Beeren + 8 Glühwürmchen) | **Mondschein-Rennen** gegen Mona Mondfalter (11 Ringe) | Großes Glühwürmchen-Fest (16 Glühwürmchen + 4 Mondblumen) |

- Nur vorhandene Aufgabentypen. Eine kleine Variante: `stunts` mit `show: n` zählt die 🎪-Kunststücke (auf dem Handy gibt
  es seit 2.3 keine Looping-/Schraube-Knöpfe mehr). Außerhalb dieser 4 Missionen bleibt 🎪 purer Spaß (getestet).
- Neue Rivalen Hugo Hummel und Mona Mondfalter sind die Werkstatt-Figuren mit Hut; Flora kommt in 4-8 wieder.

**par (Zeit-Stern)** – aus dem Test-Flieger abgeleitet, nicht geraten: `tests/flieger.py` fliegt den Autopiloten im
Zeitraffer (1/60-s-Schritte ohne Zeichnen, ~0,2 s pro Level; gleiche Zeiten wie die v2.5-Messung 27,1/27,4/23,5 s).
Weil der Autopilot bei Besuchen/Beeren oft kreist, schätzt `tests/v27_par.py` die Sekunden pro Aufgabenteil über alle
35 Nicht-Rennen × 3 Stufen (Tropfen 5,8 · Ring 3,7 · Landung 6,6 · Besuch 24 · Beere 38 · 🎪 5,0 s) und übernimmt den
Maßstab der alten Level (Besuch/Beeren 0,82×, sonst 1,50×). Ergebnis (s, vor Stufen-Faktor): Wiese 75/90/95/100,
Sonne 70/130/50/125/105, Teich 90/110/125/100/105, Kirsch 110/165/120/145, Abend 100/110/165/180. Auf Schwer schafft
der Test-Flieger jede neue Mission klar im Zeitlimit.

**Wettflug-Eichung** (wie v2.5: Rivalin geparkt, Qualität 0 und 1 gemittelt; par ≈ 1,5×, Blitz = 0,8·par ≈ 1,2× Flugzeit):

| Rennen | Test-Flieger L / M / S | par L / M / S | Blitz L / M / S |
|---|---|---|---|
| 1-8 Hugo Hummel | 31,7 / 28,3 / 26,8 s | 47 / 42 / 40 | 38 / 34 / 32 |
| 4-8 Flora Revanche | 35,5 / 34,6 / 28,7 s | 53 / 52 / 43 | 43 / 42 / 35 |
| 5-7 Mona Mondfalter | 34,9 / 32,1 / 29,5 s | 52 / 48 / 44 | 42 / 39 / 36 |

Gegen die echte Rivalin gewinnt der Test-Flieger auf Leicht und Mittel; auf Schwer verliert er knapp – genau wie bei
den alten Rennen 2-3 und 3-3. Rohdaten: `tests/shots/v27/eichung_flieger.json`, `eichung_par.json`.

## Sterne-Schwellen der Werkstatt

Max. Sterne: bisher 15 × 3 × 3 = 135 (nur Leicht 45), jetzt 40 × 3 × 3 = 360 (nur Leicht 120). Die ersten Schwellen
bleiben, danach ungefähr verdoppelt (neu ≈ alt · (1 + min(1, alt/40))), Reihenfolge gleich:

| | Seifenblasen | Brille | Herzchen | Regenbogen | Propeller | Bart | Pups | Drache | Melone | Pizza | Riese | Glitzer | Umhang | Einhorn | Galaxie | Hupe | Disco | Schweif | Helm | Katze | Leucht | Konfetti |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| bis 2.6 | 2 | 4 | 6 | 8 | 10 | 13 | 16 | 20 | 23 | 26 | 29 | 32 | 36 | 40 | 45 | 50 | 56 | 62 | 68 | 75 | 85 | 95 |
| ab 2.7 | 2 | 4 | 7 | 10 | 13 | 17 | 22 | 30 | 36 | 43 | 50 | 58 | 68 | 80 | 90 | 100 | 112 | 124 | 136 | 150 | 170 | 190 |

Leicht-Spielen (≈ 2,5 ⭐ pro Mission): nach Welt 1 (8 Missionen) 6 Sachen – bisher 6 Sachen nach 6 Leveln; wer alles auf
Leicht spielt, kommt bis zur Disco (bisher bis Galaxie). **Bestandsschutz:** Beim ersten Start von 2.7 merkt sich jedes
alte Profil, was mit den alten Schwellen frei war (`keepUnl`) – das bleibt frei und wird nicht noch einmal „neu
freigeschaltet“ angekündigt (getestet: Profil mit 30 ⭐ behält Melone, Pizza, Riese/Winzling).

## Prüfung (Mac, GPU-WebGL)

- `test_levels`: **alle 40 Missionen × 3 Stufen + Tagesaufgabe gewonnen**, Speichern + Neuladen gleich (290 ⭐), 0 Fehler (3:40 min).
- Neu `test_v27_missionen` – alles ok: Regel frisch / nach 2 / nach 3 Missionen, 3 beliebige reichen, Mittel-Sterne zählen,
  Altprofil-Fixture (v2.6-Stand 1-1 … 2-1) → 1-4 und 2-2 offen, 3-1 zu; `?weltfrei=1` und `=8`; „Weiter“-Ziele;
  „Neue Welt offen“ im echten Ablauf hoch + quer; 🎪 zählt nur in Kunststück-Missionen; Rivalen.
  **Echte Touch-Gesten** (CDP-Touch) auf 412×915, iPhone 390×844 und 915×412: senkrecht wischen scrollt die Liste
  (Welt bleibt), waagrecht wischen auf der Liste wechselt die Welt (Liste bleibt), Knöpfe ≥ 48 px, Kopfleiste/Stufenwahl
  frei, beim Öffnen steht die erste offene Mission ohne 3 Sterne im Bild.
  Dabei gefunden und behoben: `overscroll-behavior: contain` an der Liste schluckte auch das waagrechte Wischen.
- Ganze Suite `tests/run_all.sh` (22 Teile) grün; `test_flight_audio` meldete einmal einen Ausreißer unter Last,
  der Wiederholungslauf war grün (mit 2.6-Code genauso). Grundtest (`smoke.py`): 0 Fehler.
- Leistung gleich: Bildzeiten v2.6 vs. 2.7 direkt nacheinander gemessen, p50 11–13 ms, p95 27 ms bei beiden;
  CPU pro Bild 0,54–0,76 ms (2.6: 0,51–0,91 ms).
- Bildprüfung (`tests/shots/v27/`, selbst angesehen): Unten verblasst die Liste und ein ▼ wippt → man sieht, dass mehr
  kommt; ▼/▲ sitzen auf dem Kartenrand und verdecken keine Namen. Gesperrte Welt: großes 🔒, „Schaffe 3 Missionen in 🌼
  Frühlingswiese!“ und ⭐⭐○ 2/3 – auch ohne Lesen erkennbar, dass ein Stern fehlt. Grenze: Auf dem hohen Pixel-Format
  (915 px) passen 7 von 8 Missionen fast ganz auf die Karte, dort scrollt die Liste nur ein Stück; auf dem iPhone 5 von 8,
  quer 4 von 8. Auf 390 px Breite bricht die untere Knopfleiste (Werkstatt/Album …) in 2 Zeilen um – war schon vor 2.7 so.
- **Live (github.io):** Pages-Build fertig, `sw.js`-Version live = lokal (`5fe880cc76`, Spiel 2.7.0). `test_live.py` gegen
  github.io **0 Fehler** (Ton nach dem Tipp, Level gewonnen, Freischaltung, offline neu laden); live 40 Missionen, nach
  3 geschafften Missionen sind 1-4 und 2-1 offen.
