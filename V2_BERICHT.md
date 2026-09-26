# Schmetterlingswiese 2.0 – Bericht

Stand: 26.09.2026 · Branch `v2-neubau` · Live: https://drpeterkalmar.github.io/schmetterlingswiese/

## Was ist neu (kompletter Neubau)

- **Technik:** statt einer HTML-Datei mit three.js r128 jetzt ES-Module (ohne Build) + three.js r180
  lokal in `lib/`. ~5 400 Zeilen eigener Code in `js/` (Grafik, Welt, Figuren, Spiel, Audio, UI).
- **Look:** eigener Toon-Shader (weiche Licht-/Schattenkante, Rim-Light, Gegenlicht-Leuchten der
  Flügel), Weltkrümmung relativ zur Kamera, Tageszeit-Himmel mit Sonne/Mond/Sternen,
  Alto-artige Bergsilhouetten in 3 Dunstschichten, Wind-Gras (instanziert, wandernde Wellen,
  goldene Spitzen im Gegenlicht, weicht der Figur aus), Pollen/Glühwürmchen/Blütenblätter,
  Post-Processing mit sanftem Bloom, Tiefenunschärfe (Hoch), Vignette, Farbkorrektur.
- **5 Welten × 3 Level:** Frühlingswiese (Morgen), Sonnenblumenfeld (Mittag), Seerosenteich
  (Nachmittag), Kirschblütenhain (goldene Stunde), Glühwürmchen-Abend (Nacht) + Tagesaufgabe.
- **Figuren (Kinderwünsche erhalten und ausgebaut):** Schmetterling, Marienkäfer (Deckflügel klappen
  auf), Biene und neu die Libelle – große Glanzaugen, Wangen, Lächeln, Blinzeln, ^^-Freude-Augen,
  Squash & Stretch, Freudendrehung bei Kombos. 7 Hüte, 7 Flügelmuster, 22 Farbvarianten.
- **Wiese lebt:** Bärenbabys, Capybaras (mit Yuzu auf dem Kopf), Häschen, Entchen (schauen dich an,
  hüpfen vor Freude, schlafen abends), Marienkäfer und bunte Falter in der Luft, Sonnenblumen,
  Seerosen mit Lotus, Kirschbäume, Pilze, Wolken.
- **Aufgaben:** Nektar sammeln, Ring-Parcours, Landen + Nektar naschen, Tierbabys besuchen,
  Beeren bringen, Loopings/Schrauben (echte Flugbahn), Wettfliegen gegen Flora/Lilli,
  Glühwürmchen, fallende Kirschblüten. Kombo-System, Glitzerstern-Suche.
- **Schwierigkeit spürbar:** Leicht = kein Zeitdruck, Zielpfeil, Magnet 5,5 m, große Ringe mit
  Einflug-Hilfe, man kann nicht verlieren (auch das Wettrennen nicht). Mittel = mehr Tempo,
  kleine Böen, 1 Wespe, Regenwolke. Schwer = Zeitlimit, starke Böen, 3–4 Wespen, 2 Regenwolken,
  kleine Ringe, 3. Stern nur mit großer Kombo. Hindernisse schubsen nur (kein Schaden, keine Angst).
- **Belohnungen:** Sterne (pro Level und Stufe), Freischaltungen nach Sternen, Sammelalbum mit
  17 Seiten und kindgerechten Naturfakten, 17 Abzeichen, tägliche Aufgabe, mehrere Profile.
- **Steuerung:** „Tippen & Halten“-Zonen wie gewünscht (Standard, Zonen leuchten beim Drücken,
  Multitouch), alternativ Joystick; Looping/Schraube-Knöpfe; Tastatur. Landen: über Leuchtring
  unten halten, nach dem Naschen hüpft die Figur automatisch wieder hoch.
- **Klang:** generative Musik + vorgerenderte, geschichtete Effekte + Natur-Ambience, Haptik.
- **PWA:** installierbar, Vollbild, offline; Updates werden erst im Menü (nie mitten im Level)
  per Neuladen aktiviert.

## Messwerte

### Audio (Offline-Render → WAV → ffmpeg `ebur128=peak=true`, `volumedetect`, `showspectrumpic`)

| Render | Lautheit | True-Peak | LRA | Energie < 60 Hz (mittel) |
|---|---|---|---|---|
| Spiel-Mix Wiese (Musik+Ambience+Effekt-Szenario, 60 s) | **−16,2 LUFS** | **−3,5 dBTP** | 2,8 LU | −49 dB (Gesamt −19 dB) |
| Spiel-Mix Abend (45 s) | −16,0 LUFS | −3,7 dBTP | 3,1 LU | −54 dB |
| Musik ruhig (Intensität 0,4) | −20,5 LUFS | −7,0 dBTP | 2,1 LU | −50 dB |
| Musik Kombo (Intensität 0,9) | −18,5 LUFS | −6,2 dBTP | 1,4 LU | −48 dB |
| Alle Effekt-Sets nacheinander | −17,8 LUFS | −5,2 dBTP | 10,2 LU | −66 dB |

- Kein Clipping (Max −3,7 dBFS), Hochpass 2×80 Hz (24 dB/Okt.) → kein Dröhn-Bass.
- Spektrogramme: `tests/out/audio/*_spektrum.png` (lokal, nicht im Repo).
- **Handy-Regeln ohne `--autoplay-policy`-Flag:** vor dem Tap `AudioContext` nicht vorhanden,
  nach einem Tap `running`.
- Vorrendern aller Klänge: 0,8 s (Desktop, ohne Last), im Spiel ~3,3 s headless (CPU teilt sich
  mit der Software-GPU); Effekte zuerst (spielbar bevor die Musik fertig ist).
  Folgestarts aus IndexedDB-Cache: ~1,4 s.
- **Effekt-Spam-Test** (20 Effekte/s, 5 s, A/B/A/B): 16,7 fps ohne vs. 17,4 fps mit → kein
  messbarer Verlust (< 5 %); Voice-Limit 14 greift (679 von 760 Stimmen weich gestohlen).

### Grafik (renderer.info, Pixel 7 Hochformat, Level 2-1 mit Sonnenblumen)

| Stufe | Draw-Calls | Dreiecke | Frame-Zeit p50 / p95* | JS pro Frame |
|---|---|---|---|---|
| Niedrig (DPR 1, ohne Post) | 45 | 244 k | 67 / 67 ms | 0,2 ms Update + 1,5 ms Submit |
| Mittel (DPR 1,5, Bloom) | 52 | 297 k | 100 / 101 ms | 0,1 + 1,2 ms |
| Hoch (DPR 2, MSAA, DoF) | 53 | 419 k | 217 / 219 ms | 0,1 + 3,6 ms |

\* SwiftShader (Software-GPU) – nur relativ aussagekräftig (Niedrig : Mittel : Hoch ≈ 1 : 1,5 : 3,3).
Draw-Calls über alle Welten 30–65 (Budget 150). Adaptive Qualität: Start „Mittel“ am Handy,
senkt bei < ~48 fps erst die Auflösung, dann die Stufe, stuft auf schnellen Geräten hoch
(mit Hysterese). Rückfall-Kette, falls ein Handy HalfFloat/MSAA-Ziele nicht kann.

## Testergebnisse (Python-Playwright, Chromium, Pixel-7-Emulation, Touch)

- **Alle 15 Level × 3 Stufen + Tagesaufgabe: 46/46 gewonnen**, 0 Page-/Console-Fehler.
  Fortschritt nach Neuladen identisch (106 Sterne, 15 Level, 13 Abzeichen, 15 freigeschaltet).
- **Echt geflogen** (Autopilot steuert über die Eingabe-Schicht): 1-1 in 69 s, 1-2 in 98 s,
  3-1 in 33 s, 5-1 in 81 s gewonnen; Landen auf Seerosen/Sonnenblumen, Ringe, Beeren erreichbar.
- **Steuerung:** Zonen (links/rechts/oben/unten, Multitouch, Leuchten), Joystick, Stunt-Knöpfe,
  Tastatur (Pfeile, Leertaste, P) – alle grün.
- **UI:** alle Screens (20 Zustände) in Hoch- und Querformat, alle Touch-Ziele ≥ 48 px, nichts abgeschnitten.
- **PWA:** keine Installierbarkeitsfehler, Offline-Start aus dem Service-Worker, kein Neuladen
  beim Erstbesuch.
- **Stunts:** Winkel nach Looping/Schraube hart genullt (alle 3 Figuren), Flugrichtung ·
  Modellblick = 1,00. **Anatomie-Check:** Augen ragen bei allen 4 Figuren aus dem Kopf, keine
  Halslücke. **Speicher:** 12 Level-Starts → Geometrien/Texturen/Programme/Heap konstant.
- Screenshots: `tests/shots/final/` (Auswahl), Test-Skripte: `tests/` (`tests/run_all.sh`).

## Deployment

- `v2-neubau` nach `main` gemergt und gepusht; GitHub Pages ausgeliefert (Build `e748b40cf1`).
- **Live-Test** (headless gegen github.io, Pixel 7, mit Service-Worker, ohne Autoplay-Flag):
  alle Dateien HTTP 200, Boot ok, `AudioContext` nach Tap `running`, Level 1-1 gewonnen (2 Sterne),
  Service-Worker aktiv, **Offline-Neuladen** startet mit gespeichertem Profil und Sternen, 0 Fehler.

## Offene Punkte / Grenzen

- Kein echtes Android-Gerät im Test: die 60-fps-Aussage für Mittelklasse-Handys ist nicht
  gemessen, nur relativ abgeschätzt. Die automatische Qualität regelt nach; notfalls in den
  Einstellungen „Grafik: Niedrig“ wählen.
- Musik und Klänge sind gemessen (Lautheit/Peak/Spektrum), aber nicht „angehört“ – bitte
  mit Kinderohren prüfen und Wünsche melden (zu leise/laut, zu viel Glitzer, …).
- Ob „Tippen & Halten“ oder Joystick besser ist, kann nur ein Test mit den Kindern zeigen
  (beides ist drin, Standard = Kinderwunsch).
- Erststart: Klänge werden ~1–3 s vorgerendert (Ladebalken auf dem Titel); Folgestarts schneller.

## Bitte am Android-Handy testen

1. Seite öffnen. **Falls noch die alte Version erscheint:** Seite neu laden bzw. in Chrome
   „Einstellungen → Datenschutz → Browserdaten löschen → Bilder und Dateien im Cache“ (oder
   Tab schließen und neu öffnen). Danach über „⋮ → Zum Startbildschirm hinzufügen“ installieren.
2. Titel antippen → **Ton muss sofort da sein** (sonst Lautstärke/Lautlos prüfen) → Profil anlegen.
3. Level 1-1 auf Leicht: Drehen/Steigen/Sinken mit den Zonen, Loopings, Nektar sammeln.
4. Level 2-1 und 3-1: **Landen** über dem Leuchtring (unten halten) – klappt das für die Kinder?
5. Einstellungen: Musik/Effekte/Vibration getrennt abschalten; Grafik-Stufe und „fps“-Anzeige
   ansehen (bitte melden, was dort steht).
6. Hoch- und Querformat ausprobieren, App wechseln und zurück (Ton pausiert/kommt wieder).
7. Mehrere Profile anlegen (je Kind eins), Sterne sammeln, Garderobe/Hüte freischalten.
