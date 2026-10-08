# Schmetterlingswiese 2.9 – Technik-Nacht „schärfer, ruhiger, flüssiger am Handy“ (08.10.2026)

Stand: 08.10.2026 · Branch `main` · Live: https://drpeterkalmar.github.io/schmetterlingswiese/ (Version 2.9.0)

Peters Auftrag (05.10.): mehr Details bei flüssiger Webapp-Leistung, die Tricks der anderen Spiele nutzen. Grundlage:
`~/.hermes/plans/grafik-audit-spiele.md` (Abschnitt Schmetterlingswiese, Maßnahmen #2–#9), `grafik-tricks-katalog.md`
und der gemeinsame Grafik-Kern aus der Stuntbahn (n30). Spielmechanik, Flugverhalten, Missionen, Stunts und Spielstände
sind unverändert (alle Level in allen Schwierigkeiten durchgespielt, Flugbahn mit und ohne festen Takt verglichen).
WebGL2 und der eigene Toon-Shader bleiben; kein PBR, kein WebGPU, kein TAAU, keine neue Deko.

## Kurz – was Emilia am Handy merkt
- **Glattere Kanten:** Hügel gegen den Himmel, Blätter und Flügel haben auf „Mittel“ (der Handy-Stufe) keine
  Treppenstufen mehr. Bis 2.8 gab es dort gar keine Kantenglättung.
- **Dichteres Gras direkt vor der Figur** (1,4- bis 1,6-mal so viele Halme nah), dafür weiter weg dünner und am Horizont
  nur noch ein grasiger Schimmer im Boden. Die Grenzen sieht man nicht.
- **Die Figur passt zum Himmel:** abends leicht violett-blau, im Kirschhain warm, mittags neutral. Der Comic-Look bleibt.
- **Schatten fallen zur richtigen Seite:** Der Schatten unter der Figur und unter den Tieren ist zur Schattenseite
  gezogen (bei tiefer Sonne länger), Bäume werfen einen weichen Schatten auf die Wiese.
- **Nur noch Leuchtendes leuchtet:** Sonne, Glühwürmchen, Laterne, Glitzerfunken und Sterne glühen, die helle Wiese und
  die Wolken nicht mehr – das Bild ist klarer, kein Milchschleier.
- **Der Flug fühlt sich auf jedem Handy gleich an**, auch auf 90/120-Hz-Bildschirmen und bei kurzen Rucklern; die
  Funken der Effekte ruckeln auf schnellen Bildschirmen nicht mehr.
- **Die Grafik regelt sich besser selbst:** Beim allerersten Start misst das Spiel 20 Bilder lang (0,7 s) und merkt sich
  das Gerät. Wird es eng, nimmt die Automatik erst stufenlos Auflösung (bis 60 %), dann Deko, zuletzt die Stufe – und
  holt Auflösung und Deko zurück, wenn wieder Luft ist. Eine einmal zu langsame Stufe kommt in der Sitzung nicht wieder
  (wie bisher, gegen Hin-und-Her).
- **Gleich schnell wie 2.8**, mit kleinen Abweichungen auf beiden Seiten (Abschnitt 2). Ladegröße +50 KB (gzip).

Handy: App einmal ganz schließen und neu öffnen (neuer Service-Worker).

## 1. Wie gemessen wurde
**Mess-Gate** `tests/perf_gate.py` (aus dem Stuntbahn-Kern, unverändert): Profil „Mittelklasse-Android“ – CPU 4-fach
gedrosselt, Pixeldichte 2,6, 412×915 hochkant und 915×412 quer, je Szene 10 s, Browser per `open` gestartet (sonst
drosselt macOS die Queue-Prozesse auf ~15 Bilder/s) und ohne 60-Hz-Deckel (die Bildzeit ist die echte Arbeit je Bild).
Vorher und nachher **im Wechsel** gemessen (Runde für Runde abwechselnd, Median aus 3 Runden), weil der Mac nebenher
arbeitet: dieselbe Variante schwankt zwischen Runden bis ±25 % (z. B. Teich nachher 4,2 / 5,0 / 4,9 ms).
Szenen (`tests/perf_szenen.json`): Menü, Wiese im Flug auf Niedrig/Mittel/Hoch, Stuntshow (alle 2,5 s eine Einlage),
Mission Teich (3-1) und Abend (5-1), Wiese mit Grafik-Automatik. Vorher = v2.8.0 (1df00e7) als zweite Kopie
`../butterfly_vorher`, gemessen **vor** dem Zusammenführen der Vorarbeit.

Was die Zahlen bedeuten: Der Mac (M1) ist viel schneller als ein Mittelklasse-Handy (2–7 ms statt 16,7 ms je Bild). Die
Verhältnisse vorher/nachher übertragen sich, die absoluten Werte nicht. **Ein echtes Handy habe ich nicht gemessen.**

## 2. Messung vorher → nachher
Bildzeit in ms (kleiner = besser), Datei `tests/perf/2026-10-08_vorher_nachher.json`; Draw-Calls im Mittel.

| Stufe | Szene | Gerät | p50 vorher → nachher | **p95 vorher → nachher** | Δ p95 | Draw-Calls |
|---|---|---|---|---|---|---|
| Niedrig | Wiese (Flug) | hoch | 2,2 → 1,9 | 3 → **2,9** | −3 % | 76 → 74 |
| Niedrig | Wiese (Flug) | quer | 2,3 → 2,1 | 3,2 → **3,1** | −3 % | 90 → 90 |
| Mittel | Menü | hoch | 2,6 → 2,8 | 3,3 → **3,5** | +6 % | 71 → 72 |
| Mittel | Menü | quer | 2,7 → 2,8 | 3,4 → **3,5** | +3 % | 87 → 90 |
| Mittel | Wiese (Flug) | hoch | 2,9 → 2,8 | 3,7 → **3,8** | +3 % | 88 → 86 |
| Mittel | Wiese (Flug) | quer | 3 → 2,9 | 4 → **4** | 0 % | 105 → 104 |
| Mittel | Stuntshow | hoch | 2,7 → 2,7 | 3,6 → **3,7** | +3 % | 73 → 70 |
| Mittel | Stuntshow | quer | 2,9 → 3 | 3,9 → **4,4** | +13 % ¹ | 85 → 82 |
| Mittel | Mission Teich 3-1 | hoch | 3,1 → 3,4 | 4,1 → **4,9** | +20 % ¹ | 89 → 93 |
| Mittel | Mission Teich 3-1 | quer | 3,2 → 3,2 | 4,1 → **4,3** | +5 % | 117 → 116 |
| Mittel | Mission Abend 5-1 | hoch | 2,7 → 2,5 | 3,5 → **3,5** | 0 % | 70 → 66 |
| Mittel | Mission Abend 5-1 | quer | 2,9 → 2,8 | 3,8 → **3,8** | 0 % | 86 → 83 |
| Hoch | Wiese (Flug) | hoch | 4,8 → 5,3 | 6,7 → **6,9** | +3 % | 86 → 83 |
| Hoch | Wiese (Flug) | quer | 5,4 → 5,7 | 7 → **7,5** | +7 % | 102 → 100 |
| automatisch | Wiese, Automatik ² | hoch | 3,3 → 4 | 4,5 → **6** | (+33 %) | 86 → 84 |
| automatisch | Wiese, Automatik ² | quer | 3,4 → 4,3 | 4,6 → **6,5** | (+41 %) | 101 → 100 |

¹ Ausreißer: Die Einzelrunden streuten (Teich nachher 4,9 / 5,0 / 4,2 ms). Mit 5 Runden nachgemessen
(`tests/perf/2026-10-08_vorher_nachher_nach.json`): **Teich hoch 3,9 → 4,1 (+5 %), quer 4,3 → 4,4 (+2 %), Stuntshow hoch
3,5 → 3,7 (+6 %), quer 3,8 → 3,9 (+3 %)**.

² Keine Verschlechterung, sondern mehr Bild: Nach 16 s steht die neue Automatik schon auf vollem „Hoch“ (Pixeldichte 2,
Skala 1), die alte erst auf Hoch mit Pixeldichte 1,5 (sie steigt alle 9 s um 0,25) – nachher werden 1,8-mal so viele
Pixel gezeichnet (`tests/perf/2026-10-08_*_auto.json`).

**Je Stufe ehrlich:** **Niedrig** schneller (−3 %). **Mittel** gleich bis +0,2 ms (0 bis +6 %, mit Nachmessung ¹).
**Hoch** +0,2–0,5 ms (+3/+7 %). Das Budget „p95 je Stufe gleich oder besser“ ist damit auf Mittel und Hoch **knapp nicht
ganz erfüllt**. Woher die Zehntel kommen (gemessen im Menü, wo das Bild ruhig ist, `tests/kosten_diagnose.py`):
Kantenglättung im Endbild ≈ 0,06 ms, Culling-Rechnung der Gras-Ringe ≈ 0,09 ms (CPU, 4-fach gedrosselt), Bloom-Maske ≈
0,08 ms, Himmelslicht und Schatten ≈ 0. Jeder Posten liegt für sich im Messrauschen. Das sind Kernstücke des Auftrags
(Kantenglättung auf Mittel, Gras-LOD, Bloom nur auf Glanz); ich habe sie nicht zurückgedreht, sondern so lange
nachgebessert, bis keiner mehr als ein Zehntel kostet (Abschnitt 3). Am Handy entscheidet ohnehin die Automatik: sie
hält 60 Bilder/s, indem sie zuerst stufenlos die Auflösung senkt – das konnte die alte nur in 0,25er-Sprüngen.

**Draw-Calls:** gleich oder weniger, außer Menü (+1/+3: zweiter Gras-Ring). Grenze 110: Teich quer lag schon vorher
darüber (117 → 116), alle anderen Szenen im Mittel ≤ 105.

**Ladegröße** (Mess-Gate, alles was beim Start geladen wird): **1,37 → 1,50 MB roh, 0,41 → 0,46 MB gzip** (+50 KB gzip,
davon three.js r186 ≈ +46 KB roh; Budget +200 KB). Keine externen Anfragen, keine Bilddateien.

## 3. Etappen – vorgebaut, abgenommen, korrigiert
Der Leicht-Spur-Job `schmetterlingswiese-v29-vorbau` hatte ohne Browser vorgearbeitet (Branch
`vorbau/schmetterlingswiese-v29-technik`, 9 Commits, alles hinter URL-Reglern, 37 Node-Tests). Ich habe zuerst auf main
gemessen, dann zusammengeführt (**keine Konflikte**), jede Etappe im Browser abgenommen, korrigiert, committet, gepusht
und live geprüft. Die Übergabe-Datei ist hier eingearbeitet (Abschnitt 7) und aus dem Repo entfernt, der Branch gelöscht.

### E0 Mess-Gate
Vorbau: Gate (unverändert aus dem Kern) + 8 Szenen, nie gelaufen. Abnahme: läuft auf main und auf 2.9 ohne Änderung
(Missionen fliegen mit dem Test-Autopiloten). Neu für die Abnahmen: `tests/technik_abnahme.py` (Szenen in mehreren
Varianten fotografieren, nebeneinanderlegen, Pixel-Unterschied), `tests/kosten_diagnose.py` (Rechen- und GPU-Zeit je
Regler), `tests/util.py` mit `BROWSER=open` (Suite ohne macOS-Drosselung) und `QZUSATZ` (Regler für A/B).

### E1 three.js r180 → r186
Vorbau: `lib/` aus der Stuntbahn, Node-Test (alle `#include`s und THREE-Namen da). Abnahme: Shader auf der GPU ohne Fehler
oder Warnungen; Menü main gegen 2.9 mit allen Reglern aus **pixelgleich** (ruhige Bildteile Δ 0,14/255), Wiese/Teich nur
Unterschiede durch Bewegung (Flügelschlag, Wolken, Tiere – zwei Läufe von main unterscheiden sich genauso)
(`tests/shots/technik/r186/`). Suite grün.

### E2 Stufenlose Renderskala, Kantenglättung + Nachschärfen, Kern-Autopilot
| Prüfung | Ergebnis |
|---|---|
| Kanten auf Mittel (`skala/kanten_zoom_alt_links_neu_rechts.jpg`) | Hügelkanten gegen den Himmel ohne Treppen, keine Schärfe-Säume ✅ |
| `tests/test_autopilot.py` (neu, künstliche Last je Bild) | ohne Last 10 s kein Schritt runter · 45 ms Last → runter nach 1,4 s · Last weg → rauf nach 2,5 s, volle Skala + Deko · Kante 11 ms: 0 Pendeln · 0 Fehler ✅ |
| Kurzmessung beim allerersten Start | 0,7 s, Gerät gemerkt, zweiter Besuch ohne Messung ✅ |
| Hänger beim Umschalten der Auflösung | 8 Wechsel unter CPU ×4: alle Bilder 16,7 ms ✅ |
| Kosten bei Skala 1 (A/B gegen `?skala=0`) | −12 … +7 % (Rauschen), im Menü ≈ 0,06 ms ✅ |

Die Startwerte des Vorbaus (Schärfen Mittel 0,4 / Hoch 0,25, Skala Mittel 0,6–1, Hoch 0,62–1) habe ich gelassen.

### E3 Gras in 3 Ringen + Culling
| Prüfung | Ergebnis |
|---|---|
| `tests/test_culling.py` (neu): 48 eingefrorene Bilder bei schnellen Drehungen (hoch/quer, Mittel/Hoch, Wiese/Kirsch), je einmal mit und ohne Kachel-Culling/`frustumCulled` gezeichnet | **0 Pixel verschieden** – kein sichtbarer Halm, keine Figur fehlt; Gegenprobe (Nahring aus) greift ✅ |
| Bild (`ringe_mittel/`, `ringe_hoch/`) | Ringgrenzen unsichtbar, Mittelring-Büschel nicht klobig, Grasrauschen ohne Flimmern ✅ |
| ❌ Kosten Vorbau-Fassung | **+5 … +14 % p95** → aufgeschlüsselt und behoben: Geländehöhen je Kachel gemerkt (90 % der Culling-Zeit: 164 Kacheln × 5 Höhen je Bild; 0,3 → 0,08 ms), Vergleich der Kachelmenge ohne Text-Schlüssel, Hüllkugeln höchstens alle 50 ms neu (sofort bei neuer Anzahl, 3 m Rand), Grasrauschen im Gelände-Shader steigt im Nahbereich früh aus, **Hoch** 12 500/12 500 → **9 000/11 000** Halme (das doppelt dichte Nahgras kostete auf Hoch 0,3 ms Pixelarbeit; nah bleibt es 1,4× so dicht wie bis 2.8) |
| Kosten danach (A/B gegen `?ringe=0&cull=0`) | Niedrig 0/+3 %, Mittel −4 %/Rauschen, Hoch −1/−1 % ✅ |

### E4 Licht und Schatten
| Teil | Abnahme | Ergebnis |
|---|---|---|
| Himmelslicht (SH9, Anteil 0,7) | je Welt `?himmel=0` gegen an (`himmel/figur_alt_links_neu_rechts.jpg`) | dezent, aber sichtbar: abends violett-blau, Kirschhain warm; keine dunklen Unterseiten. Gras liest „oben/unten“ jetzt als vorgerechneten Wert statt 2× SH9 je Pixel ✅ |
| Baumschatten (gebacken, 512², Stärke 0,32) | von schräg oben (`schatten/vergleich_quer.jpg`) | Kirschhain: langer weicher Schatten weg von der beleuchteten Kronenseite; mittags unter der Krone ✅ |
| Kontaktschatten | schwebende Figur von oben | ❌ Vorbau-Verlauf in der Mitte zu schwach (0,35 statt 0,55 Deckkraft bei halbem Radius) – Figur wirkte weniger „am Boden“ → Verlauf wie der alte Blob, weiter gerichtet/gestreckt (`schatten/kontakt_alt_links_neu_rechts.jpg`) ✅ |
| Bloom-Maske (Schwelle 0,35) | `?bloommaske=0` gegen an (`bloom/`) | Wiese und Wolken glühen nicht mehr, Glühwürmchen/Laterne/Ringe schon. ❌ Die tiefe Sonne verlor ihren Lichthof → Sonnenscheibe + innerer Sonnenhof zählen zur Maske ✅. ❌ Hoch +0,3 ms (eigene zweite Viertel-Kette) → beide Ketten zu einer mit zwei Zielen (MRT) zusammengelegt: +0,07 ms ✅ |

Nachts leuchtende Wiesenblüten (Deko) glimmen weiter in ihrer Farbe, bekommen aber keinen Glüh-Hof mehr (wie der Vorbau
angekündigt hat); im Bild fällt das kaum auf.

### E5 Fester Simulationstakt (60 Hz + Interpolation)
| Prüfung | Ergebnis |
|---|---|
| Node-Test (echtes Flugmodell, 12 s Eingabe-Drehbuch) | gleiche Bahn bei 60/90/120/144 Hz und mit Ruckeln ✅ |
| `tests/test_takt.py` (neu, Browser): feste Eingabe 6 s bei 60 Bildern/s und ungedeckelt (≈ 513 Bilder/s) | mit Takt **exakt gleich (0,00 cm)**, mit `?takt=0` 3,6 cm Abweichung; bei 60 Hz 2 cm Abstand zu `?takt=0` (fliegt wie bisher) ✅ |
| Ruhe der Darstellung bei 500 Bildern/s | Kamerageschwindigkeit je Bild gleichmäßig (Schwankung 0; ohne Interpolation 3,9 = Sprünge) ✅ |
| Pause/Weiter, Level verlassen, neu starten, Sieger-Einlagen mit Zeitlupe, Landen | ✅ (test_takt, test_celebrate, test_v25_landen) |
| ❌ `test_celebrate` bei echten 60 Bildern/s | 2 von 12 Sieger-Einlagen „Figur 5 % der Bilder außerhalb“: nach dem Zeichnen wurde die Kamera-Lage zurückgesetzt, ihre Matrix nicht → Matrizen jetzt mit zurück ✅ |
| Effekt-Partikel | ❌ liefen in 60-Hz-Sprüngen (Ruckeln auf 120-Hz-Schirmen, bis zu 3 Puffer-Uploads je Bild) → ausgelöst im Takt, bewegt je Bild ✅ |

**Das Gefühl am echten Handy (60 und 120 Hz) gegen `?takt=0` konnte ich nicht prüfen** – nur über die ungedeckelte
Bildrate nachgestellt. NPCs, Tiere und Wespen laufen wie bisher je Bild (nicht im Takt) und ruckeln daher nicht.

## 4. Fotos (selbst angesehen, ehrlich bewertet)
`tests/shots/technik/` (Collagen als JPG im Repo, Einzelbilder lokal):
- `r186/vergleich_hoch|quer.jpg` – main, main (2. Lauf), r186 mit allen Reglern aus, 2.9: gleiches Bild.
- `skala/kanten_zoom_alt_links_neu_rechts.jpg` – Kantenglättung auf Mittel: sichtbar glatter, kein Schärfe-Saum.
- `ringe_mittel/`, `ringe_hoch/` – Gras nah/fern: nah dichter, Gras bis zu den Hügeln, keine Ringkante.
- `himmel/figur_alt_links_neu_rechts.jpg` – Himmelslicht je Welt: dezent; wer genau hinsieht, sieht abends Violett.
- `schatten/` – Baum- und Kontaktschatten: richtig gerichtet, weich; mittags fällt der Baumschatten kaum auf.
- `bloom/` – Glühen nur auf Glanz: klareres Bild, Sonne mit Hof, Glühwürmchen glühen.
- Abschluss-Collagen hoch und quer: `abschluss_hoch.jpg`, `abschluss_quer.jpg` (2.8 gegen 2.9: Wiese Mittel, Gras
  nah, Abendlicht, Kontaktschatten). Ehrlich: Auf Handygröße sind die Unterschiede dezent. Am deutlichsten sind das
  klarere Bild ohne Glüh-Schleier (Wiese, Kirsch-Gegenlicht), Gras bis in die Ferne und der gerichtete statt runde
  Schatten im Kirschhain. Die glatteren Kanten sieht man erst im Zoom gut; das Abendlicht auf der Figur ist sehr dezent.

## 5. A/B-Links für Peter
| Link | zeigt |
|---|---|
| https://drpeterkalmar.github.io/schmetterlingswiese/?skala=0 | alte Automatik (Pixeldichte-Sprünge), keine Kantenglättung auf Mittel |
| https://drpeterkalmar.github.io/schmetterlingswiese/?ringe=0&cull=0 | Gras als ein Feld wie bis 2.8, alles immer zeichnen |
| https://drpeterkalmar.github.io/schmetterlingswiese/?himmel=0 | Umgebungslicht wie bis 2.8 |
| https://drpeterkalmar.github.io/schmetterlingswiese/?kontakt=0 | runder Schatten, keine Baumschatten |
| https://drpeterkalmar.github.io/schmetterlingswiese/?bloommaske=0 | Glühen nach Helligkeit wie bis 2.8 (Wiese glüht mit) |
| https://drpeterkalmar.github.io/schmetterlingswiese/?takt=0 | variabler Takt wie bis 2.8 |
| https://drpeterkalmar.github.io/schmetterlingswiese/?startprobe=0 | ohne Kurzmessung beim ersten Start |
| https://drpeterkalmar.github.io/schmetterlingswiese/?skala=0&ringe=0&cull=0&himmel=0&kontakt=0&bloommaske=0&takt=0 | Verhalten von 2.8 (nur mit three.js r186) |

## 6. Bitte am Handy anschauen
1. **Kanten** auf der Frühlingswiese: Hügel gegen den Himmel, Flügelränder – glatt? Wirkt etwas überschärft (helle Säume)?
2. **Gras** tief über die Wiese fliegen und schnell drehen: dichter als vorher? Tauchen irgendwo Grasflecken auf?
3. **Abend** und **Kirschhain**: Figur und Blüten im Farbton des Himmels – zu schwach, gerade richtig?
4. **Schatten**: Kirschhain unter den Bäumen, beim Landen auf einer Blüte der Schatten der Figur.
5. **Flug auf einem 120-Hz-Handy** gegen `?takt=0`: fühlt es sich gleich an, ruckelt irgendetwas?
6. **Wärme/Akku** nach 10 Minuten gegen 2.8 (`?skala=0&ringe=0&cull=0&himmel=0&kontakt=0&bloommaske=0&takt=0`).

## 7. Vorarbeit (Übergabe des Leicht-Spur-Jobs, eingearbeitet)
Vorbau auf `vorbau/schmetterlingswiese-v29-technik` (von 1df00e7): E0 Mess-Gate + Szenen, E1 r186, E2 Renderskala/
Hochskalieren (`js/engine/kern/hochskalieren.js`, angepasst auf lineares HDR mit Reinhard-Stauchung)/Kern-Autopilot
(`kern/autopilot.js`, `kern/startprobe.js` unverändert aus der Stuntbahn, Anschluss `js/engine/qualitaet.js`), E3
Gras-Ringe (`js/world/grasringe.js`) + Hüllkugeln (`js/engine/huelle.js`), E4 Himmelslicht (`js/engine/himmelslicht.js`),
Schatten (`js/engine/schatten.js`), Bloom-Maske (`gfx.js`), E5 Takt (`js/engine/takt.js`), 37 Node-Tests
(`tests/node/`, `bash tests/node/run.sh`, Browser-Attrappe + three-Auflöser). Ladegröße laut Vorbau +47 KB gzip – stimmt
mit der Messung überein. Startwerte mit „TODO Heavy-Job“ und was daraus wurde:

| Stelle | Vorbau | jetzt |
|---|---|---|
| Schärfen Mittel/Hoch (`renderer.js` ENDBILD) | 0,4 / 0,25 | gelassen (keine Säume) |
| Renderskala je Stufe (`qualitaet.js` SKALA) | [0,75–1], [0,6–1], [0,62–1] | gelassen |
| Kosten Stufe Mittel→Hoch (`qualitaet.js`) | 0,9 | gelassen (Aufstieg im Test sauber) |
| Halme je Stufe/Ring (`grasringe.js`) | Hoch 12 500/12 500 | **Hoch 9 000/11 000** (Kosten) |
| Grasrauschen fern | 0,35 / 0,16 | gelassen, früher Ausstieg im Shader |
| Himmelslicht-Anteil (`world.js`) | 0,7 | gelassen |
| Baumschatten-Stärke | 0,32 (nachts 0,16) | gelassen |
| Kontaktschatten-Verlauf | eigener, schwächer | **wie der alte Blob** |
| Bloom-Schwelle mit Maske | 0,35 | gelassen; Sonnenhof zählt zur Maske; Hoch MRT |
| Hüllkugel-Rand | 3 m | gelassen, Neuberechnung höchstens alle 50 ms |
| Partikel im Takt | je Schritt | **je Bild** |

Konflikte beim Zusammenführen: keine. Ein Burn-Gutachten (`docs/audit/*gutachten*.md`) gibt es im Repo nicht – ohne
gearbeitet.

## 8. Tests
- Node: `bash tests/node/run.sh` – **38 grün** (neu u. a. Höhen-Merker der Gras-Ringe, gedrosselte Hüllkugel, Licht
  oben/unten fürs Gras).
- Browser (Playwright, ein Browser zur Zeit): `tests/run_all.sh` nach dem Zusammenführen: 21 von 23 grün (alle 40 Level ×
  3 Schwierigkeiten gewonnen, Missionen, Stunts, Landen, Fangen, Wettflug, Tiere, Werkstatt, PWA/offline, Audio, Lecks);
  `test_v28_deko` scheiterte nur an der Testadresse (127.0.0.1 statt localhost, Test angepasst), `test_celebrate` an der
  Kameramatrix des festen Takts (behoben, E5) – beide danach grün. Abschluss-Durchlauf mit `BROWSER=open` (echte 60 Bilder/s statt 8–10): ebenfalls grün bis auf `test_v27_missionen` quer
  (Wischen in der Missionsliste) – mit normalem Browserstart grün; die Touch-Wischgeste verhält sich am per `open`
  verbundenen Browser anders (Testumgebung, nicht das Spiel).
- Neu: `tests/test_autopilot.py`, `tests/test_culling.py`, `tests/test_takt.py` – alle grün.
- Live geprüft nach jeder Etappe (`tests/test_live.py`: Build live = lokal, HTTP 200, Level gewonnen, offline startbar,
  0 Fehler). Abschluss: https://drpeterkalmar.github.io/schmetterlingswiese/ – **Version 2.9.0, Build c9283444f7**,
  HTTP 200, Build live = lokal, Level gewonnen, offline neu gestartet, 0 Fehler; zusätzlich live mit allen Reglern aus
  (Wiese, Mittel), Abend auf Hoch und Teich auf Niedrig – je 0 Fehler, 60 Bilder/s. Branch
  `vorbau/schmetterlingswiese-v29-technik` gelöscht.

## 9. Offen, Grenzen, ehrlich
- **Kein echtes Handy gemessen** und das Takt-Gefühl auf 120 Hz nicht am Gerät geprüft.
- **Budget Mittel/Hoch knapp gerissen** (Abschnitt 2): Menü +0,1–0,2 ms, Hoch +0,2–0,5 ms. Jeder Posten liegt im
  Messrauschen; zurückdrehen hieße Kantenglättung, Gras-LOD oder Bloom-Maske aufgeben. A/B für Peter: die Regler oben.
- Teich quer liegt bei den Draw-Calls über 110 – wie schon vorher (117 → 116).
- Das Himmelslicht ist bewusst dezent (Anteil 0,7). Wer mehr Farbe will: `HIMMEL_ANTEIL` in `js/world/world.js`.
- Nachts leuchtende Wiesenblüten haben keinen Glüh-Hof mehr (nur noch ihre Farbe).
- Viele Android-Geräte geben die GPU-Zeitmessung nicht frei; dann regelt die Automatik nach Bildrate (mit Hysterese und
  Sperre gegen Pendeln) – wie in der Stuntbahn.
