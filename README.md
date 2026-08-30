# 🦋 Schmetterlingswiese

Ein kleines, schmuckes 3D-Sammelspiel: Fliege als Schmetterling über eine bunte
Blumenwiese und sammle alle 10 glühenden Blüten!

**▶️ Spielen:** https://drpeterkalmar.github.io/schmetterlingswiese/

## Steuerung

| Gerät | Bedienung |
|---|---|
| 📱 Handy | Finger auf den Bildschirm ziehen = steuern (virtueller Joystick) |
| 💻 Tastatur | WASD oder Pfeiltasten |

Pfeile nach oben/unten = höhen/fliegen & sinken. Der Schmetterling bleibt
automatisch über dem Boden.

## Technik

- **Eine HTML-Datei** (`index.html`), three.js r128 liegt lokal bei (`three.min.js`)
- Kein Build, keine Abhängigkeiten, kein Server nötig – einfach öffnen und losfliegen
- Prozedurale Wiese (700 instanzierte Blumen), Hügel-Terrain, Himmel-Shader mit Sonne,
  weiche Echtzeit-Schatten, Canvas-Textur für die Monarch-Flügel
- Getestet headless (Playwright) – ohne Console-Errors; Optik per Vision-Selbstprüfung iteriert

*Für Alessia, Livia & Emilia – mit Liebe gebaut. 🌸*

## Lizenz

MIT – siehe [LICENSE](LICENSE).