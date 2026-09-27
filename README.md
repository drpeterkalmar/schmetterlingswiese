# 🦋 Schmetterlingswiese

Ein liebevolles 3D-Flugspiel für Kinder: Flieg als Schmetterling, Marienkäfer, Biene oder Libelle
über fünf verzauberte Welten, sammle Nektar, flieg durch Blumenringe, lande auf Seerosen,
besuche Bärenbabys und Capybaras – und sammle Sterne, Hüte und Album-Seiten.

**▶️ Spielen:** https://drpeterkalmar.github.io/schmetterlingswiese/
(am Handy „Zum Startbildschirm hinzufügen“ – läuft dann als App im Vollbild, auch offline)

## Spielidee

- **5 Welten × 3 Level** – Frühlingswiese (Morgen), Sonnenblumenfeld (Mittag), Seerosenteich
  (Nachmittag), Kirschblütenhain (goldene Stunde), Glühwürmchen-Abend (Nacht mit Sternen)
- **Aufgaben:** Nektartropfen sammeln, Flugring-Parcours, auf Blüten/Seerosen landen und
  Nektar naschen, Tierbabys besuchen, Beeren zu Capybaras bringen, Loopings & Schrauben,
  Wettfliegen gegen Flora Falter und Lilli Libelle, Glühwürmchen und fallende Kirschblüten fangen
- **1–3 Sterne pro Level:** Aufgabe geschafft · schnell genug · Glitzerstern gefunden (Schwer: große Kombo)
- **Schwierigkeit:** 🌱 Leicht (kein Zeitdruck, Zielpfeil, Magnet, man kann nicht verlieren) ·
  🌼 Mittel · 🔥 Schwer (Zeitlimit, Windböen, freche Wespen, kleinere Ringe)
- **Belohnungen:** Figuren, Farben, Flügelmuster, Hüte, Sammelalbum mit Natur-Fakten,
  Abzeichen und eine tägliche Aufgabe – ohne Käufe, ohne Werbung, ohne Wartezeiten
- **Mehrere Spielerprofile** mit eigenem Namen, Fortschritt bleibt auf dem Gerät gespeichert

## Steuerung

| Gerät | Bedienung |
|---|---|
| 📱 Tippen & Halten (Standard) | links/rechts halten = drehen · Mitte oben = steigen · Mitte unten = sinken/landen · Finger liegen lassen und hoch/runter schieben = steigen/sinken (auch beim Drehen, ohne loszulassen) |
| 🕹️ Joystick (Einstellungen) | Daumen-Stick links, Knöpfe rechts |
| 🤸 🌀 Knöpfe | Looping und Schraube (am Boden: abheben) |
| ⌨️ Tastatur | Pfeile/WASD · Leertaste = Looping · Shift = Schraube · P/Esc = Pause |

## Technik

- Statisch, **kein Build nötig**: ES-Module + [three.js](https://threejs.org) r180 lokal in `lib/`
- **100 % prozedural:** Modelle, Texturen, Musik und Klänge entstehen im Code – keine fremden Assets
- Eigene Toon-Shader mit Rim-Light, Weltkrümmung, Wind-Gras (instanziert, folgt dem Spieler),
  Himmel mit Tageszeit, weiches Bloom + Tiefenunschärfe + Farbkorrektur als Post-Processing
- **Audio:** generative, adaptive Musik (Look-ahead-Scheduler, 5 Schichten), alle Klänge per
  `OfflineAudioContext` vorgerendert (inkl. Hall aus generierter Impulsantwort), Bus-Mix mit
  Hochpass, Kompressor und Limiter (≈ −16 LUFS), Ducking, Stereo-Panning, Haptik
- **Android-first:** große Touch-Ziele, Hoch- und Querformat, adaptive Grafikqualität,
  PWA mit Service-Worker (offline, installierbar)

### Entwickeln

```bash
python3 -m http.server 8471          # dann http://localhost:8471/
python3 tools/update_sw.py           # nach Änderungen: Service-Worker-Version (Cache-Busting)
tests/run_all.sh                     # Headless-Tests (Python-Playwright, Pixel-7-Emulation)
```

Debug-Hilfe im Browser: `window.__game` (Zustand, Level starten, Autopilot, Einfrieren, Audio-Messung).

*Gebaut mit viel Liebe für die Familie. 🌸*

## Lizenz

MIT – siehe [LICENSE](LICENSE). three.js: MIT (`lib/THREE_LICENSE.txt`).
