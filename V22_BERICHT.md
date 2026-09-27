# Schmetterlingswiese 2.2 – alle Tiere ab Start, Werkstatt, verrückte Freischaltungen

Stand: 27.09.2026 · Branch `main` · Live: https://drpeterkalmar.github.io/schmetterlingswiese/ (Build `38fdc40253`)

Wunsch: „gut wäre wenn man von Anfang an alle Tiere auswählen und besser customizen kann. Dafür verrücktere
freischaltbare Sachen“.

## Was ist neu

**1. Alle Figuren ab Start (6 Stück)**
- Schmetterling, Marienkäfer, Biene und Libelle sind ab Start frei. Neu dazu, ebenfalls ab Start:
  - **Hummel:** rund, flauschig, schwarzer Kopf mit großen Augen, weißes Po-Ende.
  - **Mondfalter:** mintgrüne Flügel mit Schwänzchen und Augenflecken, Federfühler, flauschiger Körper.
- Alle Grundfarben, Flügelmuster und die 7 klassischen Hüte sind frei.
- Alte Profile verlieren nichts:
  - Ihre Farbe, das Muster und der Hut werden je Figur übernommen.
  - Sterne, Level, Album, Abzeichen und Einstellungen bleiben unverändert.
  - Die alten Felder bleiben zusätzlich unangetastet im Speicher.

**2. Werkstatt statt Garderobe** (6 Reiter: Figur · Farbe · Form · Flügel · Hut · Spur)
- **Freie Farbwahl je Figur:**
  - Vier Farbrollen: Hauptfarbe, Zweitfarbe, Muster und „Augen & Fühler“. Bei jeder Figur sind sie passend
    benannt, z. B. „Panzer/Körper/Punkte“ beim Marienkäfer.
  - 24 große Farbfelder, ein 🎲-Knopf für Zufallsfarben und „Farb-Ideen“ (die alten Farbvarianten).
  - Jede Änderung ist sofort am 3D-Modell zu sehen.
- **Form:**
  - Größe: Klein, Mittel, Groß; freischaltbar Winzling und Riese.
  - Flügelform: rund, spitz (mit Schwalbenschwanz) oder lang.
  - Fühler: Kugel, Herzchen, Sternchen, Ringel, Feder.
  - Augen: Kulleraugen, Wimpern, Sternaugen.
- **🎲 Zufalls-Outfit** oben rechts. Es nimmt nur freigeschaltete Sachen.
- Jede Figur merkt sich ihr eigenes Outfit.
- Gesperrtes erscheint als Silhouette mit „Noch N ⭐“. Neu Freigeschaltetes trägt eine „NEU“-Marke, und am
  Reiter bzw. an der Werkstatt-Kachel auf der Karte erscheint ein roter Punkt.

**3. 22 verrückte Freischaltungen** (ersetzen die alten Stern-Stufen)

| ⭐ | Freischaltung | Art |
|---|---|---|
| 2 | Seifenblasen-Spur 🫧 | Spur |
| 4 | Herz-Sonnenbrille 🕶️ | Extra |
| 6 | Herzchen-Spur 💕 | Spur |
| 8 | Regenbogen-Flügel | Flügel-Skin |
| 10 | Propeller-Mütze (dreht sich) | Hut |
| 13 | Schnurrbart | Extra |
| 16 | Pups-Wölkchen 💨 (lustiges „Pfrrt“, Ton abschaltbar) | Spur |
| 20 | **Mini-Drache** 🐲 | Figur |
| 23 | Wassermelonen-Flügel | Flügel-Skin |
| 26 | Pizza-Hut 🍕 | Hut |
| 29 | Riesen- & Winzling-Modus | Spaß |
| 32 | Glitzer-Sterne-Spur ✨ | Spur |
| 36 | Superhelden-Umhang (flattert) | Extra |
| 40 | **Einhorn-Falter** 🦄 | Figur |
| 45 | Galaxie-Flügel | Flügel-Skin |
| 50 | Quietsch-Hupe 📯 (bei jeder Freuden-Schraube und beim Sieger-Looping) | Spaß |
| 56 | Disco-Flügel (wechseln die Farbe) | Flügel-Skin |
| 62 | Regenbogen-Schweif 🌈 | Spur |
| 68 | Astronauten-Helm 🚀 | Hut |
| 75 | **Flugkatze** 🐱 | Figur |
| 85 | Leuchtflügel (glühen, schön im Glühwürmchen-Abend) | Flügel-Skin |
| 95 | Konfetti-Spur 🎊 | Spur |

- Die Abstände sind so gewählt, dass beim ersten Durchspielen auf Leicht (≈ 2–3 ⭐ pro Level) etwa jedes 1–2. Level
  etwas Neues kommt. Das spätere Drittel belohnt Mittel/Schwer. Maximal sind 135 ⭐ plus Tagesaufgaben möglich.
- Mit 22 liegt die Zahl leicht über dem Richtwert von 15–20.
- **Flügel-Skins** wirken auf alle 9 Figuren. Sie färben passend mit ein: Panzer beim Marienkäfer, Streifen bei
  Biene und Hummel, Ringel bei der Libelle.
- **Freischalt-Moment:** Auf der Ergebnis-Karte erscheint „🎁 Überraschung!“. Dahinter folgt eine Konfetti-Karte
  „NEU freigeschaltet!“: Die 3D-Figur trägt das Neue schon, darunter stehen „Gleich anziehen“ und „Später“.
  Danach geht es weiter zum nächsten Level.

## Belege

- **`tests/run_all.sh` komplett grün** (in Blöcken ausgeführt), inklusive `test_levels` und `test_magnet_stuck`:
  - Alle Level: 46/46 gewonnen. Fortschritt nach Neuladen identisch (106 ⭐).
  - Feier- und Magnet-Test: ok.
  - UI hoch und quer: ohne Befund.
  - PWA: installierbar, offline ok.
  - Audio: Mix im Ziel. Flug-Bett ohne Stottern.
  - Anatomie: ok. Lecks: keine.
- **Neu `tests/test_v22.py`** (alle Prüfungen ok):
  - Frisches Profil (0 ⭐): alle 6 Grundfiguren über die Werkstatt wählbar und gebaut. Gesperrt sind nur Drache,
    Einhorn und Katze.
  - Jede der 22 Freischaltungen: vorher gesperrt, per Test-API freigeschaltet, angezogen, in 3D gerendert,
    0 Fehler.
  - Volles Outfit im Level: 71 Draw-Calls (< 150).
  - 2 × 60 Zufalls-Outfits: Geometrien, Texturen und Shader-Programme konstant (keine Lecks).
  - v2.1-Profil (JSON wie bisher gespeichert) mit zwei Profilen lädt ohne Verlust. Geprüft:
    - Sterne, Level, Statistik, Album, Abzeichen, Tagesaufgaben und Einstellungen sind unverändert.
    - Die Biene behält ihre Farbe und die Krone. Der Schmetterling behält Flieder und Herzen.
    - Das zweite Profil behält seine Libelle in Rubin.
    - Nach Neuladen ist alles identisch.
  - Echter Ablauf hoch und quer: Level gewinnen → 🎁 → Freischalt-Karte → „Gleich anziehen“ ist gespeichert →
    weiter zur nächsten Level-Karte.
- **Neu `tests/test_v22_werkstatt.py`:** alle 6 Reiter mit Schmetterling und Katze, 412 px hoch und quer.
  Geprüft werden:
  - Touch-Ziele ≥ 48 px, Reiter ganz sichtbar, letzte Reihe über „Fertig“.
  - Die 3D-Vorschau ist nie abgeschnitten und nicht von der Karte verdeckt. Gemessen wird über die projizierten
    Vertices.

  Ein Befund im Querformat (Flügelspitze kurz am linken Rand) wurde behoben: Die Kamera steht jetzt etwas weiter
  weg.
- **Anatomie (`test_anatomy.py`, erweitert):** alle 9 Figuren. Geprüft werden:
  - Augen ragen aus dem Kopf, auch mit Wimpern und Sternaugen.
  - Blickrichtung = Flugrichtung (+Z).
  - Kein Spalt am Hals.
  - Jeder der 10 Hüte sitzt auf dem Kopf; der Helm umschließt den Kopf.
  - Die Brille sitzt vor den Augen.
  - Der Umhang liegt hinter dem Kopf und folgt der Körperoberfläche (Höhenfeld aus den Vertices).
- **Sichtprüfung (Vision) aller Aufnahmen in `tests/shots/v22/`:**
  - Übersichten: `figuren_alle`, `figur_<neue Figur>` (4 Blickwinkel), `hat_*`, `extra_*` und `skin_*` (je auf
    allen 9 Figuren), `form_*`, `spuren_raster`, `spur_pups`, `spur_schweif`, `werkstatt_*`, `freischalt_*`,
    `outfits_verrueckt`, `live_werkstatt`.
  - Dabei gefunden und behoben:
    - Pizza von vorn nicht erkennbar → neu gebaut (größer, Krustenrand, Belag).
    - Umhang bei Marienkäfer und Biene im Körper versteckt → folgt jetzt der Körperoberfläche.
    - Roter Umhang auf rotem Käfer → blau.
    - Schnurrbart auf dunklen Köpfen unsichtbar → karamellfarben; dann zu wuchtig → dünner.
    - Schwalbenschwanz und Mondfalter-Schwanz im Umriss verformt → Pfade korrigiert.
    - Regenbogen-Schweif von hinten eine verwaschene Säule → jetzt waagerechte Regenbogen-Straße.
    - Katzen- und Drachenschwanz wirkten wie Perlenketten → dichter.
- **Performance** (SwiftShader-Software-GPU, nur relativ aussagekräftig):
  - Mit Standard-Aussehen sind die Frame-Zeiten wie v2.1: Niedrig/Mittel/Hoch p50 65/100/217 ms
    (v2.1: 66/100/217 ms). Draw-Calls 45/52/52 (v2.1: 46/55/54).
  - Schwerstes Outfit (Flugkatze, Riese, Disco, Propeller, Umhang, Regenbogen-Schweif) gegen Standard in Level 1-1,
    Stufe Niedrig, A/B/A/B:
    - CPU pro Frame unverändert (0,16 vs. 0,17 ms), Draw-Calls 47 vs. 43.
    - Der Regenbogen-Schweif (~240 große Partikel) kostet in der Software-GPU Füllrate: p50 51 → 66 ms, also einen
      Takt. p95 bleibt 67 → 69 ms. Ohne Spur ist das Outfit gleich schnell wie Standard.
    - Der Schweif wurde deshalb von ~360 auf ~240 Partikel ausgedünnt.
  - Alle Spuren laufen über den bestehenden Burst-Pool: 1 Draw-Call, ein wiederverwendetes Options-Objekt, keine
    Allokationen pro Frame.
- **Deployment:**
  - Gepusht. GitHub Pages liefert Build `38fdc40253` (= lokal).
  - Live-Test (headless gegen github.io, Pixel 7, Service-Worker, ohne Autoplay-Flag):
    - Boot ok, Ton erst nach dem Tipp.
    - Level 1-1 gewonnen (2 ⭐). Seifenblasen freigeschaltet → Freischalt-Karte → angezogen.
    - Werkstatt alle Reiter, Hummel gewählt.
    - Offline-Neuladen mit Profil und Figur. **0 Fehler.**

## Grenzen / offen

- Nicht auf einem echten Handy gemessen. Die Füllrate des Regenbogen-Schweifs sollte auf echten GPUs unkritisch
  sein, und die adaptive Qualität regelt notfalls herunter.
- Klänge (Pups, Hupe) sind nur gemessen, nicht angehört: Pegel −27 dB aktiv-RMS, wie die übrigen Effekte. Bitte mit
  Kinderohren prüfen.

## Was die Kinder zuerst ausprobieren sollen

1. App öffnen. Die neue Version lädt im Menü von selbst; sonst App schließen und neu öffnen.
2. **Werkstatt** (🎨 unten auf der Karte) öffnen:
   - Hummel und Mondfalter ansehen.
   - Unter „Farbe“ die eigene Lieblingsfigur einfärben.
   - Unter „Form“ Fühler, Augen und Flügelform ausprobieren.
   - Oben den 🎲-Würfel für ein Zufalls-Outfit drücken.
3. Ein Level spielen und nach dem Sieg auf **🎁 Überraschung!** tippen. Wer schon Sterne hat, findet in der
   Werkstatt die „NEU“-Sachen sofort.
4. Wer 16 ⭐ hat: **Pups-Wölkchen** unter „Spur“ (der Ton lässt sich dort aus- und einschalten). Ab 20 ⭐ wartet
   der **Mini-Drache**.
5. Rückmeldung: Welche Freischaltung ist am lustigsten? Kommt etwas zu früh oder zu spät? Ist das Pups-Geräusch
   okay?
