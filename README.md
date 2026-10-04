# 🦋 Schmetterlingswiese

Ein liebevolles 3D-Flugspiel für Kinder: Flieg als Schmetterling, Marienkäfer, Biene, Libelle, Hummel
oder Mondfalter über fünf verzauberte Welten, sammle Nektar, flieg durch Blumenringe, lande auf Seerosen,
besuche Bärenbabys und Capybaras – und schalte mit Sternen verrückte Sachen frei (Mini-Drache,
Einhorn-Falter, Flugkatze, Regenbogen-Schweif, Pups-Wölkchen, Pizza-Hut …).

**▶️ Spielen:** https://drpeterkalmar.github.io/schmetterlingswiese/
(am Handy „Zum Startbildschirm hinzufügen“ – läuft dann als App im Vollbild, auch offline)

## Spielidee

- **5 Welten × 3 Level** – Frühlingswiese (Morgen), Sonnenblumenfeld (Mittag), Seerosenteich
  (Nachmittag), Kirschblütenhain (goldene Stunde), Glühwürmchen-Abend (Nacht mit Sternen)
- **Aufgaben:** Nektartropfen sammeln, Flugring-Parcours, auf Blüten/Seerosen landen und
  Nektar naschen, Tierbabys besuchen, Beeren zu Capybaras bringen, Freuden-Schrauben & Sieger-Loopings,
  Wettfliegen gegen Flora Falter und Lilli Libelle, Glühwürmchen und fallende Kirschblüten fangen
- **1–3 Sterne pro Level:** Aufgabe geschafft · schnell genug · Glitzerstern gefunden (Schwer: große Kombo);
  **Wettflüge (v2.5):** nur Zeiten zählen – Rennen gewonnen · schneller als par · ⚡ Blitzzeit (0,8 · par), kein Glitzerstern
- **Schwierigkeit:** 🌱 Leicht (kein Zeitdruck, Zielanzeige, Magnet, man kann nicht verlieren) ·
  🌼 Mittel · 🔥 Schwer (Zeitlimit, Windböen, freche Wespen, kleinere Ringe)
- **Werkstatt (v2.2):** alle 6 Grundfiguren ab Start, freie Farbwahl je Figur (24er-Palette + 🎲 Zufall),
  Größe, Flügelform, Fühler, Augenstil, Flügelmuster, Hüte – jede Figur merkt sich ihr eigenes Outfit
- **Verrückte Freischaltungen:** 22 Stufen von 2 bis 95 ⭐ (Spuren, Hüte, Extras, Flügel-Skins, Figuren,
  Riesen-/Winzling-Modus, Quietsch-Hupe) mit Konfetti-Karte „NEU freigeschaltet!“ und „Gleich anziehen“
- **Belohnungen:** Sammelalbum mit Natur-Fakten, Abzeichen und eine tägliche Aufgabe –
  ohne Käufe, ohne Werbung, ohne Wartezeiten
- **Mehrere Spielerprofile** mit eigenem Namen, Fortschritt bleibt auf dem Gerät gespeichert
- **Lebendige Wiese (v2.3):** Singvögel fliegen von Baum zu Baum, Bienen besuchen Blüten, ein Schmetterlings-Schwarm
  tanzt über den Blumen, Marienkäfer krabbeln auf Büschen, ein Häschen hoppelt davon, im Teich springt ein Fisch;
  Glockenblumen, Mohn, Heide, Blütenteppiche, Wolkenschatten, Regenbogen, Sternschnuppen am Abend
- **Nektar naschen (v2.5):** Die Figur sitzt sichtbar auf der Blüte – Honig-Sonnenblumen schauen dafür in den Himmel,
  Seerosenblätter und Mondblumen tragen jede Figur, Größe, jeden Hut und Schmuck, ohne dass etwas durchschneidet;
  **v2.5.1:** Landen ist leichter – ▼ kurz tippen reicht im großen Leuchtkreis, die Blume „fängt“ die Figur und holt sie
  herein (▲ bricht ab); `?landen=<Faktor>` in der URL stellt den Fangbereich ein (1 = wie v2.5.0)
- **Zielanzeige (v2.6):** Ein leuchtender Stern schwebt über dem nächsten Ziel, solange es im Bild ist. Ist es
  außerhalb oder hinter dir, zeigt ein gelber Randpfeil neben ◀ bzw. ▶, wohin du drehen sollst. Liegt das Ziel deutlich
  höher oder tiefer, kommt ein kleines ▲/▼ dazu (= steigen/sinken). Auf Leicht und Mittel; `?ziel=pfeil` zeigt zum
  Vergleich den alten 3D-Pfeil aus v2.5
- **Tierbabys (v2.4):** Bärenbaby, Capybara, Häschen und Entchen mit Schnauze, Pfoten mit Ballen, Bauchfell und
  Schwänzchen; sie laufen mit echten Beinbewegungen, blinzeln, zucken mit den Ohren, schauen dich an, wenn du nah
  bist, und freuen sich über Besuch mit Hüpfer, ^ ^-Augen und Herzchen

## Steuerung

| Gerät | Bedienung |
|---|---|
| 📱 Tippen & Halten (Standard) | links/rechts halten = drehen · Mitte oben = steigen · Mitte unten = sinken/landen · Finger liegen lassen und hoch/runter schieben = steigen/sinken (auch beim Drehen, ohne loszulassen) |
| 🕹️ Joystick (Einstellungen) | Daumen-Stick links |
| 🌀 🤸 Kunststücke | automatisch: jedes geschaffte Teilziel = Freuden-Schraube; ganze Aufgabe = 🏆 **Sieger-Einlage (v2.4)**: jedes Mal eine andere von 12 (Sieger-Looping, Doppel-Looping, Rakete, Bumerang …), groß inszeniert mit Zeitlupe am Höhepunkt, Regenbogen-Schweif, Feuerwerk und Konfetti |
| 🎪 Stunt-Knopf (v2.3) | unten rechts tippen (Computer: Taste C) = eine von 11 zufälligen Flugeinlagen mit Effekten (Doppel-Looping, Feuerwerk-Rakete, Bumerang, Blitz-Zickzack …); nur Spaß, zählt nicht als Aufgabe, kurze Pause (Ring) bis zum nächsten Mal |
| ⌨️ Tastatur | Pfeile/WASD · P/Esc = Pause |

## Technik

- Statisch, **kein Build nötig**: ES-Module + [three.js](https://threejs.org) r180 lokal in `lib/`
- **100 % prozedural:** Modelle, Texturen, Musik und Klänge entstehen im Code – keine fremden Assets
  (v2.4 geprüft: kein CC0-Tierpaket passt im Stil zu ≥ 3 der 4 Tierbabys, siehe `V24_BERICHT.md`)
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
Stunt-Einlagen: `__game.stunts()` listet alle, `__game.stunt(n | 'id')` startet eine direkt; `?stunt=rakete` in der URL
legt den Knopf auf eine feste Einlage (A/B-Vergleich).
Sieger-Einlagen: `__game.finales()` listet alle 12, `__game.finale(n | 'id')` legt die nächste fest (`null` = Zufall);
`?finale=bumerang` in der URL erzwingt sie für jeden Sieg.

*Gebaut mit viel Liebe für die Familie. 🌸*

## Lizenz

MIT – siehe [LICENSE](LICENSE). three.js: MIT (`lib/THREE_LICENSE.txt`).
