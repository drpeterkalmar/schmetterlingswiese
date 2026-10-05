// Level-Daten: 5 Welten × 8 Missionen (v2.7, vorher 3) + Tagesaufgabe
import { WORLDS } from './worlds.js';
import { rng, hashStr } from '../engine/geo.js';

// Schwierigkeitsgrade – echt spürbar.
// v2.1: Tempo −17 % (war 7,6 / 8,5 / 9,4). Drehrate bleibt → Kurvenradius (Tempo/Drehrate) wird ~17 % enger.
// Alles Zeitabhängige (par, Zeitlimit, Kombo-Fenster) ist mit dem Tempo-Verhältnis alt/neu (≈ 1,21) mitskaliert;
// Rivalin, Böen, FOV und Flug-Rauschen hängen relativ am Tempo.
export const DIFFS = {
  leicht: { id: 'leicht', name: 'Leicht', emoji: '🌱', speed: 6.3, turn: 1.8, magnet: 5.5, ringR: 3.4, arrow: true, timeLimit: false, gusts: 0, wasps: 0, rain: false, comboWin: 5.4, rival: 0.72, ringAssist: 1, par: 1.93, pickR: 2.2 },
  mittel: { id: 'mittel', name: 'Mittel', emoji: '🌼', speed: 7.0, turn: 1.9, magnet: 2.8, ringR: 2.6, arrow: true, timeLimit: false, gusts: 0.6, wasps: 1, rain: true, comboWin: 4.2, rival: 0.93, ringAssist: 0.4, par: 1.52, pickR: 1.8 },
  schwer: { id: 'schwer', name: 'Schwer', emoji: '🔥', speed: 7.8, turn: 2.0, magnet: 1.2, ringR: 1.95, arrow: false, timeLimit: true, gusts: 1.0, wasps: 3, rain: true, comboWin: 3.1, rival: 1.04, ringAssist: 0, par: 1.2, pickR: 1.5 },
};

// Aufgabentypen: collect | fireflies | blossoms | rings | land | visit | deliver | stunts | race
// v2.7: 8 Missionen je Welt. Die ersten 3 je Welt sind die Level aus v2.0–2.6 (IDs, Reihenfolge und Werte unverändert →
// gespeicherter Fortschritt bleibt gültig), 4–8 sind neu. Neue par-Werte aus dem Test-Flieger (tests/flieger.py):
// par = 1,3 × seine Flugzeit (Median der 3 Stufen, auf Mittel-Tempo umgerechnet) – so liegen auch die alten Level im Median.
// stunts mit show: n Kunststücke mit dem 🎪-Knopf (auf dem Handy gibt es keine Looping-/Schraube-Knöpfe mehr).
export const LEVELS = [
  // --- Welt 1: Frühlingswiese
  { id: '1-1', world: 'wiese', name: 'Erster Flug', par: 70, tasks: [{ type: 'collect', n: 8 }], animals: [['baer', 2], ['capy', 2]], tutorial: true },
  { id: '1-2', world: 'wiese', name: 'Bärenbabys besuchen', par: 95, tasks: [{ type: 'visit', n: 4 }, { type: 'collect', n: 6 }], animals: [['baer', 3], ['capy', 2], ['hase', 2]] },
  { id: '1-3', world: 'wiese', name: 'Ringe im Wind', par: 85, tasks: [{ type: 'rings', n: 8 }, { type: 'collect', n: 4 }], animals: [['baer', 2], ['hase', 2]] },
  { id: '1-4', world: 'wiese', name: 'Kunststück-Wiese', par: 75, tasks: [{ type: 'stunts', show: 3 }, { type: 'collect', n: 6 }], animals: [['baer', 2], ['hase', 2]] },
  { id: '1-5', world: 'wiese', name: 'Hasen-Hüpfrunde', par: 90, tasks: [{ type: 'visit', n: 3 }, { type: 'rings', n: 6 }], animals: [['hase', 4], ['baer', 1]] },
  { id: '1-6', world: 'wiese', name: 'Beeren für die Bärchen', par: 95, tasks: [{ type: 'deliver', n: 3 }], animals: [['baer', 3], ['hase', 2]] },
  { id: '1-7', world: 'wiese', name: 'Tiefflug über die Wiese', par: 100, tasks: [{ type: 'rings', n: 10, low: true }, { type: 'collect', n: 5 }], animals: [['baer', 2], ['capy', 2]] },
  { id: '1-8', world: 'wiese', name: 'Wettflug mit Hugo Hummel', par: 80, tasks: [{ type: 'race', n: 10, rival: 'hummel' }], animals: [['baer', 2], ['hase', 2]],
    raceTimes: { leicht: [47, 38], mittel: [42, 34], schwer: [40, 32] } }, // Test-Flieger 31,7 / 28,3 / 26,8 s (Mittel aus Qualität 0 und 1)
  // --- Welt 2: Sonnenblumenfeld
  { id: '2-1', world: 'sonne', name: 'Honigsammler', par: 90, tasks: [{ type: 'land', n: 5, on: 'sunflower' }, { type: 'collect', n: 6 }], animals: [['capy', 2], ['hase', 2]] },
  { id: '2-2', world: 'sonne', name: 'Sonnenblumen-Slalom', par: 90, tasks: [{ type: 'rings', n: 10, low: true }], animals: [['baer', 2], ['hase', 2]] },
  { id: '2-3', world: 'sonne', name: 'Wettflug mit Flora', par: 80, tasks: [{ type: 'race', n: 9, rival: 'schmetterling' }], animals: [['baer', 2], ['capy', 2]],
    raceTimes: { leicht: [41, 33], mittel: [41, 33], schwer: [36, 29] } }, // Test-Flieger 27,1 / 27,4 / 23,5 s
  { id: '2-4', world: 'sonne', name: 'Sonnenbad', par: 70, tasks: [{ type: 'land', n: 4, on: 'sunflower' }, { type: 'rings', n: 6, low: true }], animals: [['capy', 2], ['hase', 2]] },
  { id: '2-5', world: 'sonne', name: 'Hasen im Sonnenfeld', par: 130, tasks: [{ type: 'visit', n: 4 }, { type: 'collect', n: 6 }], animals: [['hase', 3], ['capy', 2], ['baer', 1]] },
  { id: '2-6', world: 'sonne', name: 'Sonnen-Kunststücke', par: 50, tasks: [{ type: 'stunts', show: 3 }, { type: 'land', n: 3, on: 'sunflower' }], animals: [['baer', 2], ['hase', 2]] },
  { id: '2-7', world: 'sonne', name: 'Beeren-Picknick', par: 125, tasks: [{ type: 'deliver', n: 3 }, { type: 'rings', n: 6 }], animals: [['capy', 3], ['baer', 2]] },
  { id: '2-8', world: 'sonne', name: 'Großer Sonnen-Slalom', par: 105, tasks: [{ type: 'rings', n: 14, low: true }, { type: 'land', n: 3, on: 'sunflower' }], animals: [['baer', 2], ['hase', 2]] },
  // --- Welt 3: Seerosenteich
  { id: '3-1', world: 'teich', name: 'Seerosen-Hüpfer', par: 100, tasks: [{ type: 'land', n: 5, on: 'lily' }, { type: 'collect', n: 6, overWater: true }], animals: [['ente', 4], ['capy', 3]] },
  { id: '3-2', world: 'teich', name: 'Capybara-Picknick', par: 120, tasks: [{ type: 'deliver', n: 4 }], animals: [['capy', 5], ['ente', 3]] },
  { id: '3-3', world: 'teich', name: 'Libellen-Rennen', par: 85, tasks: [{ type: 'race', n: 10, rival: 'libelle' }], animals: [['ente', 4], ['capy', 2]],
    raceTimes: { leicht: [50, 40], mittel: [43, 35], schwer: [40, 32] } }, // Test-Flieger 32,8 / 28,7 / 26,5 s
  { id: '3-4', world: 'teich', name: 'Tropfen überm Teich', par: 90, tasks: [{ type: 'collect', n: 10, overWater: true }], animals: [['ente', 4], ['capy', 2]] },
  { id: '3-5', world: 'teich', name: 'Hallo, Entchen!', par: 110, tasks: [{ type: 'visit', n: 4 }, { type: 'land', n: 3, on: 'lily' }], animals: [['ente', 4], ['capy', 2]] },
  { id: '3-6', world: 'teich', name: 'Seerosen-Frühstück', par: 125, tasks: [{ type: 'deliver', n: 3 }, { type: 'land', n: 3, on: 'lily' }], animals: [['capy', 4], ['ente', 3]] },
  { id: '3-7', world: 'teich', name: 'Ringe überm Wasser', par: 100, tasks: [{ type: 'rings', n: 10 }, { type: 'collect', n: 5, overWater: true }], animals: [['ente', 4], ['capy', 2]] },
  { id: '3-8', world: 'teich', name: 'Großer Teich-Parcours', par: 105, tasks: [{ type: 'rings', n: 12, wild: true }, { type: 'land', n: 4, on: 'lily' }], animals: [['ente', 4], ['capy', 3]] },
  // --- Welt 4: Kirschblütenhain
  { id: '4-1', world: 'kirsch', name: 'Blütenregen', par: 90, tasks: [{ type: 'blossoms', n: 14 }], animals: [['hase', 3], ['baer', 2]] },
  { id: '4-2', world: 'kirsch', name: 'Kunstflug', par: 110, tasks: [{ type: 'rings', n: 9, wild: true }, { type: 'visit', n: 3 }], animals: [['hase', 3], ['capy', 2]] },
  { id: '4-3', world: 'kirsch', name: 'Kirschblüten-Parcours', par: 110, tasks: [{ type: 'rings', n: 12, wild: true }], animals: [['baer', 3], ['hase', 2]] },
  { id: '4-4', world: 'kirsch', name: 'Blüten-Kunststücke', par: 110, tasks: [{ type: 'blossoms', n: 10 }, { type: 'stunts', show: 3 }], animals: [['hase', 3], ['baer', 2]] },
  { id: '4-5', world: 'kirsch', name: 'Picknick unterm Kirschbaum', par: 165, tasks: [{ type: 'deliver', n: 3 }, { type: 'blossoms', n: 8 }], animals: [['hase', 3], ['capy', 2]] },
  { id: '4-6', world: 'kirsch', name: 'Kirschblüten-Kunterbunt', par: 120, tasks: [{ type: 'collect', n: 6 }, { type: 'blossoms', n: 8 }], animals: [['baer', 2], ['hase', 2]] },
  { id: '4-7', world: 'kirsch', name: 'Blütenwirbel', par: 145, tasks: [{ type: 'rings', n: 10, wild: true }, { type: 'blossoms', n: 10 }], animals: [['hase', 3], ['baer', 2]] },
  { id: '4-8', world: 'kirsch', name: 'Flora will Revanche!', par: 85, tasks: [{ type: 'race', n: 11, rival: 'schmetterling' }], animals: [['baer', 2], ['hase', 2]],
    raceTimes: { leicht: [53, 43], mittel: [52, 42], schwer: [43, 35] } }, // Test-Flieger 35,5 / 34,6 / 28,7 s
  // --- Welt 5: Glühwürmchen-Abend
  { id: '5-1', world: 'abend', name: 'Glühwürmchen-Tanz', par: 100, tasks: [{ type: 'fireflies', n: 12 }], animals: [['hase', 3], ['baer', 2]], sleepy: true },
  { id: '5-2', world: 'abend', name: 'Gute-Nacht-Besuch', par: 120, tasks: [{ type: 'visit', n: 5 }, { type: 'land', n: 3, on: 'moonflower' }], animals: [['baer', 3], ['hase', 3], ['capy', 2]], sleepy: true },
  { id: '5-3', world: 'abend', name: 'Sternschnuppen-Finale', par: 130, tasks: [{ type: 'rings', n: 10, wild: true }, { type: 'fireflies', n: 8 }], animals: [['baer', 2], ['hase', 2]], sleepy: true },
  { id: '5-4', world: 'abend', name: 'Mondblumen-Naschen', par: 100, tasks: [{ type: 'land', n: 5, on: 'moonflower' }, { type: 'fireflies', n: 6 }], animals: [['hase', 2], ['baer', 2]], sleepy: true },
  { id: '5-5', world: 'abend', name: 'Nacht-Kunststücke', par: 110, tasks: [{ type: 'stunts', show: 3 }, { type: 'fireflies', n: 10 }], animals: [['hase', 2], ['capy', 2]], sleepy: true },
  { id: '5-6', world: 'abend', name: 'Abendbrot für Tierbabys', par: 165, tasks: [{ type: 'deliver', n: 3 }, { type: 'fireflies', n: 8 }], animals: [['baer', 2], ['hase', 2], ['capy', 1]], sleepy: true },
  { id: '5-7', world: 'abend', name: 'Mondschein-Rennen', par: 85, tasks: [{ type: 'race', n: 11, rival: 'mondfalter' }], animals: [['hase', 2], ['baer', 2]], sleepy: true,
    raceTimes: { leicht: [52, 42], mittel: [48, 39], schwer: [44, 36] } }, // Test-Flieger 34,9 / 32,1 / 29,5 s
  { id: '5-8', world: 'abend', name: 'Großes Glühwürmchen-Fest', par: 180, tasks: [{ type: 'fireflies', n: 16 }, { type: 'land', n: 4, on: 'moonflower' }], animals: [['baer', 2], ['hase', 2]], sleepy: true },
];
// Wettflug-Rivalen (v2.7: dazu Hugo Hummel und Mona Mondfalter – gleiche Figuren wie in der Werkstatt)
export const RIVALS = {
  schmetterling: { char: 'schmetterling', look: { color: 3, pattern: 'herzen', hat: 'schleife' }, name: 'Flora', full: 'Flora Falter' },
  libelle: { char: 'libelle', look: { color: 1, pattern: 'herzen', hat: 'schleife' }, name: 'Lilli', full: 'Lilli Libelle' },
  hummel: { char: 'hummel', look: { hat: 'stroh' }, name: 'Hugo', full: 'Hugo Hummel' },
  mondfalter: { char: 'mondfalter', look: { hat: 'zauber' }, name: 'Mona', full: 'Mona Mondfalter' },
};
export const rivalOf = (id) => RIVALS[id] || RIVALS.schmetterling;
// v2.7 Freischaltung: In einer Welt der Reihe nach; die erste Mission der NÄCHSTEN Welt öffnet, sobald in der Welt davor
// WORLD_UNLOCK Missionen geschafft sind (≥ 1 Stern, egal welche) – so früh wie bis v2.6 (dort: die 3 Level der Welt).
// A/B: ?weltfrei=N
export const WORLD_UNLOCK = 3;
const WF = typeof location !== 'undefined' ? parseInt(new URLSearchParams(location.search).get('weltfrei'), 10) : NaN;
export const worldUnlockNeed = (wid) => Math.min(Number.isFinite(WF) && WF >= 0 ? WF : WORLD_UNLOCK, LEVELS.filter(l => l.world === wid).length);
// v2.5 Wettflüge: kein Glitzerstern, die Sterne gibt es nur über Zeiten (gewonnen · schneller als par · Blitzzeit)
// Das Level-par (96–164 s) ist für ein Rennen von 25–35 s viel zu großzügig → eigene Zeitziele je Stufe:
// raceTimes[stufe] = [par, blitz], Blitzzeit = 0,8 · par. Geeicht mit dem Level-Test-Flieger (Autopilot, Rivalin geparkt,
// Qualität 0 und 1, v2.5): Blitzzeit ≈ 1,2 × seine Zeit (gute Flieger schaffen sie), par ≈ 1,5 × seine Zeit.
// Das Zeitlimit auf Schwer bleibt wie bisher am Level-par (1,5 · par · 1,2).
export const isRace = (lvl) => !!lvl && lvl.tasks.some(t => t.type === 'race');
// Zeitziele eines Levels auf einer Stufe (Level-Karte, Spiel und Ergebnis rechnen gleich)
export function timeGoals(lvl, diffId) {
  const D = DIFFS[diffId], rt = isRace(lvl) && lvl.raceTimes && lvl.raceTimes[diffId];
  return { par: rt ? rt[0] : Math.round(lvl.par * D.par), blitz: rt ? rt[1] : 0, limit: D.timeLimit ? Math.round(lvl.par * D.par * 1.5) : 0 };
}
export const levelById = (id) => LEVELS.find(l => l.id === id) || dailyLevel(id);
export const worldOf = (lvl) => WORLDS.find(w => w.id === lvl.world);
export const levelsOfWorld = (wid) => LEVELS.filter(l => l.world === wid);

export function todayStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
// Tägliche Herausforderung: aus dem Datum erzeugt (gleich für alle Profile am selben Tag)
export function dailyLevel(id = 'daily-' + todayStr()) {
  if (!String(id).startsWith('daily-')) return null;
  const r = rng(hashStr(id));
  const w = WORLDS[(r() * WORLDS.length) | 0];
  const pool = [
    () => ({ type: 'collect', n: 8 + ((r() * 5) | 0) }),
    () => ({ type: 'rings', n: 7 + ((r() * 4) | 0), wild: r() < 0.5 }),
    () => ({ type: 'visit', n: 4 }),
    () => ({ type: w.id === 'abend' ? 'fireflies' : 'blossoms', n: 10 }),
  ];
  const a = (r() * pool.length) | 0; let b = (r() * pool.length) | 0; if (b === a) b = (a + 2) % pool.length;
  return {
    id, world: w.id, name: 'Tagesaufgabe', daily: true, par: 110, tasks: [pool[a](), pool[b]()],
    animals: [['baer', 2], ['capy', 2], ['hase', 2]], sleepy: w.id === 'abend',
  };
}
