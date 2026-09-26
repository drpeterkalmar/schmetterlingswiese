# Schmetterlingswiese 2.1 – Nachbesserung nach dem ersten Test

Stand: 27.09.2026 · Branch `main` · Live: https://drpeterkalmar.github.io/schmetterlingswiese/

## 1. „Stotterndes Motorgeräusch“ beim Fliegen – entfernt

**Ursache (gemessen, nicht geraten):** Das Flug-Bett (alle Dauer-Loops wie im Spiel, ohne Musik/Effekte)
wurde je Figur 30 s offline gerendert und analysiert. Gemessen wurde die Modulation der Lautstärke-Hüllkurve (AM) und
des Klangschwerpunkts (FM) im Bereich 4–40 Hz. Angegeben ist, wie weit der stärkste schmale Peak über dem lokalen
Rauschsockel liegt. Reines Rauschen erreicht ≈ 4–6 dB, ein hörbarer „Takt“ liegt deutlich darüber.

| Schicht (isoliert) | Takt | Peak über Sockel | Ergebnis |
|---|---|---|---|
| `flutter` (Schmetterling, Marienkäfer) | **11 Hz** | **AM 19,5 dB** (Hüllkurven-Tiefe ≈ 90 %) | der „Motor“ → entfernt |
| `buzz` (Biene, Libelle) | 8–16,5 Hz | AM 10,7 dB / FM 9,9 dB | Sägezahn-Brummen → entfernt |
| `bees` (Sonnenblumenfeld) | 7–24 Hz | AM 10,5 dB / FM 12,2 dB | Schwebung 212/219 Hz → entfernt |
| `wind` | – | 4,2 / 6,3 dB (Sockel) | bleibt als gleichmäßiges Rauschen |

| Flug-Bett je Figur (30 s) | vorher: FM-Peak | nachher: AM / FM | Pegel vorher → nachher |
|---|---|---|---|
| Schmetterling | **11 Hz, 18,4 dB** | 5,2 / 4,5 dB | −26,8 → −27,5 dBFS |
| Marienkäfer | **11 Hz, 18,4 dB** | 5,2 / 4,5 dB | −26,8 → −27,5 dBFS |
| Biene | 6,5 Hz, 5,6 dB (Summen im Wind verdeckt, isoliert 10–11 dB) | 5,2 / 4,5 dB | −26,7 → −27,5 dBFS |
| Libelle | 6,5 Hz, 5,8 dB (ebenso) | 5,2 / 4,5 dB | −26,7 → −27,5 dBFS |

- Die Loops `flutter`, `buzz` und `bees` sind samt Vor-Rendering gelöscht. Der Wind hat jetzt eine feste Tonhöhe
  (keine `playbackRate`-Modulation mehr) und einen langsam geglätteten Pegel (Zeitkonstante 0,9 s statt 0,3 s).
  Kurze Effekte (Looping-Woosh, Sammeln, Landen …) bleiben unverändert.
- Gesamtmix unverändert im Ziel: Wiese −16,1 LUFS / −3,7 dBTP, Abend −16,0 LUFS.
- Werkzeug: `tests/test_flight_audio.py` (in `run_all.sh`; schlägt an, wenn ein Peak > 8 dB über dem Sockel liegt).

## 2. Langsamer fliegen

- Tempo **Leicht 7,6 → 6,3 · Mittel 8,5 → 7,0 · Schwer 9,4 → 7,8** (−17 %). Die Drehrate bleibt gleich, dadurch
  werden die Kurvenradien ~17 % **enger** (nicht größer).
- Mitskaliert mit dem Faktor alt/neu ≈ 1,21: par-Zeiten (2. Stern), Zeitlimit Schwer, Kombo-Fenster
  (5,4 / 4,2 / 3,1 s). Böen-Stärke hängt jetzt am Tempo. Rivalin, FOV-Kicks und Looping-Tempo waren schon
  relativ. Flug-Rauschen normiert auf 9 m/s statt 11. Ringabstände und Einflughilfe sind bewusst gleich geblieben:
  Der Anflug dauert länger, die Hilfe wirkt dadurch etwas länger. Leicht ist weiterhin nicht verlierbar.
- **Autopilot fliegt echt** (über die Eingabe-Schicht), Spielzeit in s. Alt = v2.0, neu = v2.1:

| Leicht | 1-1 | 1-2 | 1-3 | 2-1 | 2-2 | 2-3 | 3-1 | 3-2 | 3-3 | 4-1 | 4-2 | 4-3 | 5-1 | 5-2 | 5-3 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| alt | 69 | 97 | 24 | 84 | 27 | 22 | 35 | 176 | 27 | 39 | 24 | 30 | 60 | 171 | 71 |
| neu | 85 | 100 | 28 | 97 | 32 | 27 | 40 | 191 | 32 | 42 | 26 | 36 | 73 | 207 | 85 |
| par alt → neu | 112→135 | 152→183 | 136→164 | 144→174 | 144→174 | 128→154 | 160→193 | 192→232 | 136→164 | 144→174 | 176→212 | 176→212 | 160→193 | 192→232 | 208→251 |

  Alle 15 Level: alt 15/15, neu 15/15 gewonnen. Summe 954 s → 1101 s (+15 %). Der Abstand zur par-Zeit ist
  gewachsen (par +21 %).
- Schwer, Stichprobe (Zeit / Zeitlimit): 1-1 38/105 → 42/126 s, 2-2 23/135 → 27/162 s, 4-3 28/165 → 34/198 s,
  5-1 89/150 → 71/180 s. Den Wettflug 3-3 verliert der Autopilot auf Schwer **alt wie neu** knapp mit 9/10 Ringen.
  Das liegt am Autopiloten, nicht am neuen Tempo.
- Werkzeug: `tests/test_speed.py <label> <stufe> [level,…]`.

## 3. Optik-Politur

Vorher/Nachher-Vergleiche (links alt, rechts neu): `tests/shots/v21/vergleich_*.jpg`

- **Wolken:** Die Normalen sind zur Hülle der ganzen Wolke gebogen. Dadurch gibt es eine zusammenhängende, weiche
  Schattierung statt einzelner „Brokkoli“-Röschen. Die Unterseite ist weiß-lila/rosa, und die Kanten gehen in den
  Dunst über. Dreiecke +1–4 %, Draw-Calls gleich.
- **Harte Farbkante im Himmel:** Das war nicht der Himmel, sondern der Schleier der Links/Rechts-Tipp-Zonen (harte
  Ober-/Unterkante bei 18 % bzw. 78 % der Höhe, in jedem Level sichtbar). Die Kante ist jetzt weich ausgeblendet.
  Zusätzlich speichert der 8-Bit-Rückfall des Post-Processings (für Handys ohne HalfFloat) jetzt in sRGB. Das
  verhindert Farbstufen in dunklen Nachthimmeln.
- **Glühwürmchen-Abend:** Mond-, Umgebungs- und Graslicht sind heller, der Horizont ist lichter. Dazu kommen
  dichterer Horizont-Nebel und dunstige Bergfüße, sodass Wiese und Berge weich ineinander übergehen.
- **Deko:** Pilze halten ≥ 1,8 m Abstand zu Blumen (vorher stand z. B. ein Pilz auf einer Blüte im Vordergrund).
- **Garderobe:** Die Tabs stehen als Symbol über dem Wort und passen immer ganz (Hoch- und Querformat, 412 px).
  Der Scrollbereich hat unten 22 px Abstand mit weichem Auslauf, sodass Krone und Sternenkranz samt Preis ganz
  über „Fertig“ stehen. Blumenkranz, Partyhut und Zauberhut haben eigene kleine Icons (statt 💐-Strauß,
  🥳-Gesicht, 🧙-Person). `test_ui.py` prüft das jetzt. Die Gegenprobe gegen v2.0 meldet dort „Tab abgeschnitten“
  und „letzte Reihe verdeckt“, gegen v2.1 nichts.
- **Weiße Punkte am Flügelrand:** Das waren absichtliche „Monarch“-Randpunkte. Sie saßen aber halb auf der
  Silhouette und wirkten wie Artefakte, deshalb sind sie entfernt (auch beim Muster „Punkte“). Neu ist ein dunkler
  Flügelansatz am Körper.

## Tests (Python-Playwright, Pixel-7-Emulation) – `tests/run_all.sh` komplett grün

- 46/46 Level-Durchspieltests gewonnen, Fortschritt nach Neuladen identisch (106 Sterne), 0 Fehler.
- UI: alle Screens hoch und quer ohne Befund (Touch-Ziele ≥ 48 px, nichts abgeschnitten, Garderobe ok).
- PWA: installierbar, Offline-Start ok. Audio: `AudioContext` erst nach Tipp `running`. Flug-Bett ohne Stottern.
- Anatomie ok, keine Speicherlecks. Frame-Zeiten wie v2.0 (Niedrig/Mittel/Hoch p50 67/100/217 ms, SwiftShader).
- Service-Worker-Version neu (Cache-Busting). Die Klänge werden beim ersten Start einmal neu gerendert.

## Deployment

(siehe unten, wird nach dem Push ergänzt)

## Bitte mit den Kindern testen

1. Spiel öffnen: Die neue Version lädt sich von selbst, sobald man im Menü ist (die Seite lädt dann einmal kurz
   neu). Falls nicht: App ganz schließen und neu öffnen.
2. **Ton beim Fliegen:** Ist das Motor-Stottern weg? Ist der leise Wind angenehm oder zu viel/zu wenig?
3. **Tempo:** Fühlt sich Fliegen jetzt gemütlicher an? Sind Ringe und Landen leichter? Ist es auf „Schwer“ noch
   spannend?
4. **Glühwürmchen-Abend** (Welt 5): Hell genug? Wirkt der Himmel ohne Streifen?
5. **Garderobe:** Hoch- und Querformat. Sind alle Reiter und die Preise ganz sichtbar? Gefallen die neuen
   Hut-Bildchen?
6. Wolken ansehen: weich und flauschig?
