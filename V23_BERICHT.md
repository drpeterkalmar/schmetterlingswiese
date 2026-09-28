# Schmetterlingswiese 2.3 – Stunt-Knopf 🎪 und eine lebendigere, detailliertere Wiese

Stand: 28.09.2026 · Branch `main` · Live: https://drpeterkalmar.github.io/schmetterlingswiese/ (Build `15ffa96da8`, Version 2.3.0)

Wunsch: „Bitte mach beizeiten die Schmetterlingswiese schöner und detaillierter. [Die Jüngere] wünscht sich auch einen
Stuntbutton der zufällig eine von vielen spektakulären Flugeinlagen mit kleinen Effekten durchführt“

## Teil 1 – Der Stunt-Knopf 🎪

**Der Knopf**
- Sitzt unten rechts, dort wo früher der Schraube-Knopf war. Er ist rund, 84 px groß (quer 72 px) und trägt die
  Aufschrift „STUNT“. Am Computer löst die Taste **C** ihn aus. Er funktioniert auch im Joystick-Modus.
- Jede Berührung startet eine **zufällige Flugeinlage**. Die gleiche Einlage kommt nie zweimal direkt hintereinander.
  Oben erscheint kurz ihr Name, z. B. „🎆 Feuerwerk-Rakete!“.
- **Pause danach:** 4 s ab dem Drücken, zusätzlich muss die Einlage vorbei sein. Ein grauer Ring im Knopf läuft dabei
  zu. Ist der Knopf wieder bereit, wackelt das 🎪 kurz. Animiert wird nur das Innere, der Knopf selbst bleibt ruhig
  (Lehre aus v2.2).
- **Wann der Knopf nichts tut:**
  - Während einer laufenden Einlage wird Drücken ignoriert.
  - Beim Sieg ist der Knopf ausgeblendet, Sieger-Looping und Jubel laufen ungestört.
  - Am Boden hebt die Figur zuerst ab und macht dann die Einlage (wie beim Sieger-Looping).
- **Zählt nicht als Aufgabe:** Einlagen feuern weder `onStunt` noch `onStuntDone` und ändern keine Statistik.
  Kombo und Zeit laufen einfach weiter.
- **Die automatischen Kunststücke sind unverändert:** Teilziel = Freuden-Schraube, Levelsieg = Sieger-Looping.
  `test_celebrate` ist grün.

**Die 11 Einlagen** (Dauer · Bahn · Effekte · Klang)

| # | Einlage | Dauer | Bahn | Effekte · Klang |
|---|---|---|---|---|
| 0 | 🎡 Doppel-Looping | 2,4 s | zwei rasche Loopings, Kamera schwenkt leicht zur Seite | Regenbogen-Schweif · 2 × Looping-Woosh (steigend) |
| 1 | 🌀 Korkenzieher-Spirale | 2,3 s | Looping + ganze Schraube, seitlicher Versatz, steigt 1 m | Glitzer-Doppelhelix aus den Flügelspitzen · Schraube + Funkeln |
| 2 | 🤸 Rückwärts-Salto | 1,7 s | 2,4 m Hüpfer mit Salto rückwärts | Funkel-Sternenring am Ende (20 Sterne fliegen waagerecht nach außen) · Wusch + Funkeln, Haptik |
| 3 | 🪃 Bumerang-Bogen | 2,6 s | waagerechter Bogen zur Seite, kehrt um, kommt zurück | Herzchen-Spur + Herzchen-Pop am Wendepunkt · Wusch + Plopp |
| 4 | ⚡ Blitz-Zickzack | 1,5 s | 3 schnelle Schlenker mit Schräglage, +35 % Tempo | gelbe Blitz-Funken, FOV-Kick bei jedem Schlenker · Wusch (steigend) |
| 5 | 🎆 Feuerwerk-Rakete | 2,8 s | steigt 6 m, oben eine Schraube, gleitet zurück | Konfetti-Kranz beim Start, Feuerschweif + Rauchwölkchen, 2 Feuerwerke oben · Raketen-Pfeifen + Plopp |
| 6 | 🌠 Sternschnuppen-Schwung | 1,6 s | schneller Schuss nach vorn (+50 %) mit Bogen nach unten | dichter Sternenstaub-Schweif, FOV-Kick · Wusch + Funkeln |
| 7 | 🫧 Tauch-Korkenzieher | 2,4 s | taucht 2,4 m ab, schraubt sich mit 2 Umdrehungen hoch | Seifenblasen · Blubb + Schraube |
| 8 | 💃 Luft-Wackeltanz | 2,0 s | Wackeln, Hüpfen, Hin-und-her-Drehen | 4 Konfetti-Pops, die Figur hüpft mit · 2 × Wackel-Boing |
| 9 | 💫 Superschraube | 1,9 s | 3 Umdrehungen um die Längsachse | kreisender Sternen-Halo (8 Sterne), Sternenring am Ende · Schraube + Funkeln |
| 10 | 🌼 Blumenwirbel | 2,4 s | Pirouette (2 Umdrehungen), schwebt hoch und wieder runter | Wirbel in Welt-Farben: im Kirschhain 🌸 **Blütenwirbel**, am Abend ✨ **Glühwürmchen-Wirbel** · Zauber + Funkeln |

Hinweis zu Nr. 9: Gewünscht waren 2½ Umdrehungen. Eine halbe Umdrehung endet aber kopfüber, deshalb sind es 3.

**Technik**
- Alle Einlagen stehen zentral in `js/game/stunts.js` als `STUNTS = [{id, name, dur, spd, cam, shape, spin}]`.
  Alte Abstimmwerte stehen im Kommentar.
- **Eine gemeinsame Bahnberechnung** für alle Einlagen. Keine Kopien der Physik je Einlage:
  - Position = Start + gerade Fluglinie + `shape(p)`. Dabei gilt `shape(0) = shape(1) = 0` mit flachen Enden.
    Die Figur beginnt und endet also ohne Ruck auf ihrer alten Fluglinie.
  - Die Drehung folgt der Tangente der Bahn. Der Rahmen wird mitgeführt, dadurch drehen Loopings sauber über Kopf.
    Dazu kommen Zusatz-Drehungen, die auf ganzen Umdrehungen enden.
  - Der Spieler bewegt sich schrittweise um die Differenz der Bahn (Muster wie der Looping). Wind, Schubser und Bäume
    wirken deshalb weiter wie sonst.
- **Wie beim Sieger-Looping übernommen:**
  - Abheben am Boden.
  - Sicherheitshöhe: Die Bahn wird vorab abgetastet. Danach gilt ab dem Hub mindestens 2,6 m über dem Boden.
  - Harter Winkel-Reset am Ende (`tilt` = 0, auch wenn das Finale eine Einlage abbricht).
  - Während der Einlage ist die Steuerung gedämpft.
- **Kamera:** Die Kamera folgt der Fluglinie und rechnet 70 % des Figuren-Ausschlags heraus. Sie schaut auf die Figur.
  Bei Loopings schwenkt sie etwas zur Seite, damit der Kreis als Ellipse sichtbar wird.
- **Effekte:** nur über den bestehenden Burst-Pool. Dafür gibt es ein wiederverwendetes Options-Objekt und konstante
  Farblisten, also keine Allokationen pro Frame.
- **Klänge:** 7 neue, vorgerenderte Presets im OfflineAudioContext (zauber, swoosh, rakete, pop, blubb, wackel, funkel).
  Sie werden per `rate`/`gain` variiert und laufen nicht als Dauer-Loop.
- **A/B und Tests:**
  - `?stunt=<n|id>` legt den Knopf auf eine feste Einlage.
  - `__game.stunt(n | 'id')` startet eine Einlage direkt, `__game.stunts()` listet alle auf.

## Teil 2 – Schöner & detaillierter

Rahmen eingehalten: gleiche Toon-Optik, 100 % prozedural, keine neuen Abhängigkeiten, kein Post-Umbau, kein
Gameplay-, Level- oder Aufgaben-Umbau. Vorher/Nachher: `tests/shots/v23/vergleich_<welt>_<spiel|nah|weit|quer>.jpg`.
Nahaufnahmen aller neuen Dinge: `tests/shots/v23/schmuck_bogen_1-3.jpg`.

**Boden & Nahbereich (alle Welten)**
- **7 statt 4 Blumenarten** bei gleicher Gesamtzahl:
  - Neu sind **Glockenblume** (drei hängende Glocken), **Mohn** (schalenförmige Blätter, dunkle Mitte) und
    **Heide-Ähre** (lange Rispe, wiegt oben am stärksten).
  - Die neuen Arten haben eigene Paletten je Welt: rosa Mohn im Kirschhain, blasse Glocken am Abend, Mohn im
    Sonnenblumenfeld.
  - Die Margeriten-Blätter sind jetzt sanft gewölbt statt flach.
- **Blütenteppiche:** 22 Flecken aus winzigen Blüten, je Welt eingefärbt:
  - Wiese: Vergissmeinnicht und Gänseblümchen
  - Sonnenblumenfeld: Hahnenfuß-Gelb
  - Kirschhain: weiß-rosa
  - Abend: blass
- **Grasbüschel mit Kleeblättern:** Sie stehen auch dort, wo der Graskreis endet und der Boden bisher kahl war. Die
  Farbe kommt aus dem Welt-Gras.
- **Wind:** Jede Instanz hat eigene Phase und Stärke. Felder schaukeln deshalb versetzt statt im Gleichtakt.
- **Sand- und Pfad-Flecken:** über Vertexfarben im Boden. Das Gras wird dort dünner, identische Formel in JS und GLSL.
  Keine neue Textur.

**Pflanzen & Objekte**
- **Bäume:**
  - Je Art gibt es 2 Formvarianten mit Lappen-Kronen.
  - Die Kronen haben einen Licht-Verlauf (oben heller).
  - **Kirschbäume** tragen 26 Blütenbüschel-Tupfer.
  - **Birken** haben schwarze Rindenstriche über Vertexfarben statt der 6 dunklen Ringe.
- **Büsche** in 3 Sorten: schlicht, mit roten und weißen **Beeren**, mit **Mini-Blüten**.
- **Sonnenblumen:** 24 Kerne in der Goldener-Winkel-Spirale im Blütenherz und ein drittes Stängelblatt.
- **Teich:**
  - Ein Drittel der Seerosen öffnet und schließt sich ganz langsam.
  - Mehr Schilf (60 statt 44 Horste).
  - Kleine **Wasserringe** tauchen im Wasser-Shader auf (kein Draw-Call).
- **Bänke:** eine Holzbank am Teich und am Abend eine Bank mit leuchtender Laterne.

**Leben & Atmosphäre** (`js/world/life.js`, je Art 1–2 Draw-Calls)

Die Tiere halten sich in der Nähe des Spielers auf; ist er weit weg, ziehen sie leise um. Aufgaben-Tiere (Bären, Capys,
Enten, Aufgaben-Häschen) sind nicht verändert.

| Tier | Verhalten | Klang |
|---|---|---|
| **Singvögel** (3, nicht nachts) | Bogenflug von Baum zu Baum, landen auf der Krone und legen dort die Flügel an. Flügel mit Vogel-Umriss und Flügelschlag im Shader. | Zwitschern beim Landen |
| **Schmetterlings-Schwarm** (10) | Lissajous-Runden um Blumenflecken; am Abend helle Nachtfalter | – |
| **Bienen** (5, nicht nachts) | fliegen von Blume zu Blume und pausieren auf der Blüte | leises Summen, nur ganz nah und höchstens alle ~3 s |
| **Marienkäfer** (3) | krabbeln im Kreis über die Busch-Kuppeln | – |
| **Wildhäschen** (2) | hoppelt weg, wenn man ganz nah und tief kommt (Überraschung) | – |
| **Fisch** im Teich | springt alle 5–11 s | Platscher, Spritzer und Wasserringe |

Dazu **fallende Blätter**, im Kirschhain viele Blütenblätter unter den Kronen.

**Himmel & Stimmung**
- **Wolken:**
  - Eine zweite, dünne Schleierwolken-Ebene weit oben. Sie zieht im Kreis und nie über Kopf.
  - **Wolkenschatten** ziehen mit dem Wind über Wiese und Gras: 6 weiche Flecken im Boden- und Gras-Shader, etwa 14 %
    dunkler im Kern, kein Draw-Call.
- **Frühlingswiese:** dezenter **Regenbogen** gegenüber der Sonne (bei etwa 42°).
- **Abend:**
  - Die Sterne funkeln kräftiger, manche leicht bläulich.
  - Etwa alle 20 s zieht eine **Sternschnuppe** über den Himmel (im Himmel-Shader).
  - Der Mond hat einen weiteren, weicheren Halo.
  - Mehr Glühwürmchen (0,85 statt 0,6 der Partikelzahl; dieser Faktor fehlte bisher nach einem Stufenwechsel).
  - Bank mit Laterne.
- **Goldene Lichter im Gras:** in der Morgen-Wiese und der goldenen Stunde im Kirschhain (leichter bei den
  Sonnenblumen).

**Kleine Details**
- **Nektartropfen** glitzern: kleine Funkelsterne, dazu pulsiert das Leuchten kräftiger.
- **Ringe:** Die nächsten Ringe atmen leicht. Beim Durchflug sprüht eine **Funkenkante** vom Ringrand.
- **Startbildschirm:**
  - Funkelnde ✨ am Logo, Untertitel in einer Pille.
  - Neu das Schild „Neu: 🎪 Stunt-Knopf!“.
  - „Tippe, um loszufliegen!“ steht in einer weichen Pille.
- **Weltkarte:**
  - **Fehler behoben:** Seit v2.2 machte die Werkstatt-Regel `.whead` den Kartenkopf zu einer Zeile. Dadurch rutschte
    „Welt 1 · Morgen“ aus der Karte, man sah nur „W / M“ am Rand.
  - Neu sind die Sterne je Welt („⭐ 3 / 9“), ein großes Welt-Emoji als Wasserzeichen und Glitzerpunkte.
- **Nebenwirkung:** Weil neue Deko-Arten dazukamen, stehen Bäume und Büsche an anderen Stellen als in v2.2 (die
  Zufallsfolge hat sich verschoben). Alle Level bleiben gewinnbar, siehe unten.

## Belege

- **`tests/run_all.sh` komplett grün** (in Blöcken ausgeführt, 16 Suiten inklusive der zwei neuen):
  - Alle 46 Level-Läufe gewonnen (15 Level in allen Stufen + Tagesaufgabe). Fortschritt nach Neuladen identisch.
  - Unverändert grün: Sieger-Looping und Schraube (`test_celebrate`), Werkstatt und Profile (`test_v22`,
    `test_v22_werkstatt`), Steuerung und PWA (`test_pwa_input`), Anatomie, Magnet, Glitzerstern, UI hoch und quer.
  - Keine Lecks: Geometrien, Texturen und Programme sind in Runde 1 und 2 gleich.
  - Audio: Mix Wiese −16,2 LUFS, Abend −16,0 LUFS (vorher −16,2 / −16,0). Flug-Bett ohne Stottern.
- **Neu `tests/test_stuntshow.py`** (ok): Jede Einlage wird einzeln angeflogen.
  - Abstand zum Boden während der Einlage: mindestens 2,6 m (Tauchen und Sternschnuppe genau an der Sicherheitshöhe).
  - Seitliche Abweichung von der alten Fluglinie am Ende: 0,0 m. Gier-Änderung 0.
  - Winkel am Ende exakt 0. Nachwackeln 0,0 rad.
  - Die Figur ist in allen Burst-Bildern im Bild. Statistik unverändert, die Zeit läuft weiter.
  - Das langsamste Bahnstück hat 2 m/s, also keine Spitze und kein Stillstand.
  - 10 echte Tipps auf den Knopf: nie zweimal dieselbe Einlage hintereinander, 7 verschiedene.
  - Pause wirkt, Drücken während einer Einlage wird ignoriert, Taste C geht.
  - Vom Boden: erst abheben, dann Einlage.
  - Sieg und Finale: Knopf weg, Taste wirkungslos, der Sieger-Looping läuft unverändert.
  - `?stunt=rakete` ergibt zweimal Rakete.
  - Welt-Varianten im Kirschhain und am Abend: ok.
  - Knopf 84 × 84 px (quer 72 × 72 px), überdeckt keine Steuerzone und nicht die HUD-Leiste.
  - Burst-Bilder: je Einlage 6 Bilder über die ganze Einlage (Abstand = Dauer/6, also 0,25–0,47 s statt starrer
    160 ms, damit jede Einlage ganz zu sehen ist). Abgelegt unter `tests/shots/v23/stunt_<id>.jpg`, alle mit Vision
    angesehen.
- **Neu `tests/test_schmuck.py`** (ok): alle neuen Deko- und Tierarten in allen 5 Welten, 45 Nahaufnahmen, 0 Fehler.
  - **Anatomie:** Blickrichtung · Bewegungsrichtung für Vögel, Falter, Bienen, Marienkäfer, Fisch und das fliehende
    Häschen, gemessen über mehrere hundert Frames. Kleinster Wert je Tierart zwischen 0,77 (Vögel beim Steigen) und
    1,0. Mittelwerte 0,95–1,0.
  - Das Häschen flieht, wenn man nahe kommt.
- **Vision-Befunde, gefunden und behoben:**
  - Doppel-Looping: Regenbogen-Kugeln vor der Kamera zu wuchtig → kleiner und kürzer.
  - Figur in Einlagen zu klein: Kamera folgt jetzt der Fluglinie mit normalem Abstand, dazu ein kleinerer FOV-Aufschlag.
  - Wirbel: Konfetti-Sturm vor der Kamera; am Abend zu große Leuchtpunkte → weniger und kleiner.
  - Rakete: Feuerwerks-Ring schnitt den Rand → Feuerwerk höher und weiter vorn.
  - Sandflecken zuerst 20–30 m groß und in der Kirschwelt wie Erde → 6–8 m, heller, dezenter.
  - Schleierwolken: erst eine Reihe, die wie ein weißer Balken wirkte, dann halbtransparent mit sichtbaren Kreisen →
    deckend, rundlich, weit draußen, ziehen im Kreis.
  - Vogelflügel wirkten wie Rechtecke → Vogelflügel-Umriss.
  - Kirschblüten-Tupfer wie Edelsteine → flache Fünfsterne.
  - Sonnenblumen-Kerne zuerst in der Kugel versteckt, dann zu grob → auf die Oberfläche gesetzt, fein.
  - Bank lag am Abend über der Startlinie → weiter weg.
  - Fisch zu braun → orange.
- **Klänge (Pegel, aktiv-RMS mit Mix-Faktor):**
  - Die neuen Effekte liegen bei −23 bis −27 dB, wie die alten (Looping −24, Schraube −25, Hupe −24).
  - Summen bewusst leiser: −35 dB.
  - Kein Dauer-Loop.

**Performance** (feste Ansicht nach 2 s Geradeausflug; `tests/out/v23_info_*.json`; Gate: < 150 Draw-Calls,
Dreiecke max. +15 %)

| Stufe | Level | Draw-Calls vorher → nachher | Dreiecke vorher → nachher |
|---|---|---|---|
| Mittel (Handy) | **1-1** | **57 → 87** | 303 k → 314 k (**+3,7 %**) |
| Mittel | 2-1 / 3-1 / 4-1 / 5-1 | 55→82 / 65→98 / 57→82 / 57→80 | +11,0 % / +7,3 % / +7,9 % / +5,7 % |
| Niedrig | 1-1 … 5-1 | 48–57 → 66–86 | +6,3 … +10,8 % |
| Hoch | 1-1 … 5-1 | 56–68 → 83–102 | +4,5 … **+12,1 %** (2-1, höchster Wert) |

- **Budget eingehalten:** Draw-Calls überall ≤ 102 (Level 1-1: 87), Dreiecke höchstens +12,1 %.
- **Unterwegs verworfen:** Kirschhain lag auf „Niedrig“ zeitweise bei +16,5 %. Deshalb wurden Kirschtupfer,
  Teppich-Blüten, Wildhäschen (eigenes, sparsames Modell) und Sonnenblumen-Kerne verbilligt.
- **CPU pro Frame** (A/B gegen den Stand vor v2.3 auf derselben Maschine):
  - Update 0,3–0,7 ms (vorher 0,3–0,6 ms).
  - Render-Submit 0,8–2,5 ms (vorher 1,0–1,6 ms), wegen der zusätzlichen Draw-Calls.
- **Frame-Zeiten:** Headless-rAF-Werte schwankten heute stark wegen der Maschine. Der Titel lief headless mit 8 fps,
  und der alte Stand zeigte im selben A/B p50 33–83 ms. Deshalb gilt nur der A/B-Vergleich: nachher gleich oder
  besser. WebGL läuft nachweislich auf der GPU („ANGLE Metal Renderer: Apple M1“).
- `test_perf` Effekt-Spam: −3 bis −5 % fps mit gegenüber ohne Spam (im Rauschen der Maschine).

**Deployment**
- Gepusht (Commits `8a4903e` … `021d6ad`). GitHub Pages liefert Build `15ffa96da8`, gleich wie lokal.
- `test_live.py` gegen github.io (Service-Worker, ohne Autoplay-Flag):
  - Ton erst nach dem Tipp.
  - Level 1-1 gewonnen, Freischalt-Karte, Werkstatt.
  - Offline-Neuladen mit Profil.
  - **0 Fehler**.
- Zusätzlich live: dreimal den Stunt-Knopf getippt (Blumenwirbel, Doppel-Looping, Tauch-Korkenzieher), alle Tiere
  vorhanden, **0 Fehler**.

## Grenzen / offen

- Nicht auf einem echten Handy gemessen. Die Budget-Zahlen (Draw-Calls, Dreiecke) sind gerätunabhängig. Das Gefühl der
  Einlagen (Tempo, Kamera) bitte am Handy mit den Kindern prüfen.
- Die neuen Klänge sind nur gemessen, nicht angehört.
- Die Einlagen sind feste Bahnen und prüfen keine Bäume voraus: Ein Baum schubst die Figur wie sonst weg.

## Was die Kinder zuerst ausprobieren sollen

1. **Handy:** App einmal ganz schließen und neu öffnen, oder im Menü kurz warten. Die neue Version lädt dann von
   selbst (die Seite lädt einmal neu). Beim ersten Start werden die neuen Klänge kurz gezaubert.
2. **Für das Kind mit dem Knopf-Wunsch: „Drück den 🎪-Knopf!“** Unten rechts im Level. Er macht jedes Mal etwas
   anderes, z. B. Doppel-Looping, Feuerwerk-Rakete, Bumerang, Blitz-Zickzack oder Superschraube. Im Kirschhain und am
   Abend gibt es einen eigenen Wirbel.
3. **Genau hinschauen:**
   - Vögel landen auf den Bäumen, Bienen besuchen Blumen.
   - Ein Häschen hoppelt weg, wenn man ganz tief heranfliegt.
   - Im Seerosenteich springt ein Fisch.
   - In der Frühlingswiese steht ein Regenbogen am Himmel.
   - Am Abend fliegt ab und zu eine Sternschnuppe.
4. **Rückmeldung:** Welche Einlage ist die beste? Ist eine zu wild oder zu lang? Soll die Pause kürzer sein? Ist das
   Summen zu leise oder zu laut?
