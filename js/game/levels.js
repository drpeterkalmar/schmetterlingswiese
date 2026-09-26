// Level-Daten: 5 Welten × 3 Level + Tagesaufgabe
import { WORLDS } from './worlds.js';
import { rng, hashStr } from '../engine/geo.js';

// Schwierigkeitsgrade – echt spürbar
export const DIFFS = {
  leicht: { id: 'leicht', name: 'Leicht', emoji: '🌱', speed: 7.6, turn: 1.8, magnet: 5.5, ringR: 3.4, arrow: true, timeLimit: false, gusts: 0, wasps: 0, rain: false, comboWin: 4.5, rival: 0.72, ringAssist: 1, par: 1.6, pickR: 2.2 },
  mittel: { id: 'mittel', name: 'Mittel', emoji: '🌼', speed: 8.5, turn: 1.9, magnet: 2.8, ringR: 2.6, arrow: true, timeLimit: false, gusts: 0.6, wasps: 1, rain: true, comboWin: 3.5, rival: 0.93, ringAssist: 0.4, par: 1.25, pickR: 1.8 },
  schwer: { id: 'schwer', name: 'Schwer', emoji: '🔥', speed: 9.4, turn: 2.0, magnet: 1.2, ringR: 1.95, arrow: false, timeLimit: true, gusts: 1.0, wasps: 3, rain: true, comboWin: 2.6, rival: 1.04, ringAssist: 0, par: 1.0, pickR: 1.5 },
};

// Aufgabentypen: collect | fireflies | blossoms | rings | land | visit | deliver | stunts | race
export const LEVELS = [
  // --- Welt 1: Frühlingswiese
  { id: '1-1', world: 'wiese', name: 'Erster Flug', par: 70, tasks: [{ type: 'collect', n: 8 }], animals: [['baer', 2], ['capy', 2]], tutorial: true },
  { id: '1-2', world: 'wiese', name: 'Bärenbabys besuchen', par: 95, tasks: [{ type: 'visit', n: 4 }, { type: 'collect', n: 6 }], animals: [['baer', 3], ['capy', 2], ['hase', 2]] },
  { id: '1-3', world: 'wiese', name: 'Ringe im Wind', par: 85, tasks: [{ type: 'rings', n: 8 }, { type: 'stunts', loop: 2, roll: 0 }], animals: [['baer', 2], ['hase', 2]] },
  // --- Welt 2: Sonnenblumenfeld
  { id: '2-1', world: 'sonne', name: 'Honigsammler', par: 90, tasks: [{ type: 'land', n: 5, on: 'sunflower' }, { type: 'collect', n: 6 }], animals: [['capy', 2], ['hase', 2]] },
  { id: '2-2', world: 'sonne', name: 'Sonnenblumen-Slalom', par: 90, tasks: [{ type: 'rings', n: 10, low: true }], animals: [['baer', 2], ['hase', 2]] },
  { id: '2-3', world: 'sonne', name: 'Wettflug mit Flora', par: 80, tasks: [{ type: 'race', n: 9, rival: 'schmetterling' }], animals: [['baer', 2], ['capy', 2]] },
  // --- Welt 3: Seerosenteich
  { id: '3-1', world: 'teich', name: 'Seerosen-Hüpfer', par: 100, tasks: [{ type: 'land', n: 5, on: 'lily' }, { type: 'collect', n: 6, overWater: true }], animals: [['ente', 4], ['capy', 3]] },
  { id: '3-2', world: 'teich', name: 'Capybara-Picknick', par: 120, tasks: [{ type: 'deliver', n: 4 }], animals: [['capy', 5], ['ente', 3]] },
  { id: '3-3', world: 'teich', name: 'Libellen-Rennen', par: 85, tasks: [{ type: 'race', n: 10, rival: 'libelle' }], animals: [['ente', 4], ['capy', 2]] },
  // --- Welt 4: Kirschblütenhain
  { id: '4-1', world: 'kirsch', name: 'Blütenregen', par: 90, tasks: [{ type: 'blossoms', n: 14 }], animals: [['hase', 3], ['baer', 2]] },
  { id: '4-2', world: 'kirsch', name: 'Kunstflug', par: 110, tasks: [{ type: 'stunts', loop: 3, roll: 3 }, { type: 'rings', n: 6 }], animals: [['hase', 3], ['capy', 2]] },
  { id: '4-3', world: 'kirsch', name: 'Kirschblüten-Parcours', par: 110, tasks: [{ type: 'rings', n: 12, wild: true }], animals: [['baer', 3], ['hase', 2]] },
  // --- Welt 5: Glühwürmchen-Abend
  { id: '5-1', world: 'abend', name: 'Glühwürmchen-Tanz', par: 100, tasks: [{ type: 'fireflies', n: 12 }], animals: [['hase', 3], ['baer', 2]], sleepy: true },
  { id: '5-2', world: 'abend', name: 'Gute-Nacht-Besuch', par: 120, tasks: [{ type: 'visit', n: 5 }, { type: 'land', n: 3, on: 'moonflower' }], animals: [['baer', 3], ['hase', 3], ['capy', 2]], sleepy: true },
  { id: '5-3', world: 'abend', name: 'Sternschnuppen-Finale', par: 130, tasks: [{ type: 'rings', n: 10, wild: true }, { type: 'fireflies', n: 8 }], animals: [['baer', 2], ['hase', 2]], sleepy: true },
];
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
    () => ({ type: 'stunts', loop: 1 + ((r() * 2) | 0), roll: 1 + ((r() * 2) | 0) }),
    () => ({ type: w.id === 'abend' ? 'fireflies' : 'blossoms', n: 10 }),
  ];
  const a = (r() * pool.length) | 0; let b = (r() * pool.length) | 0; if (b === a) b = (a + 2) % pool.length;
  return {
    id, world: w.id, name: 'Tagesaufgabe', daily: true, par: 110, tasks: [pool[a](), pool[b]()],
    animals: [['baer', 2], ['capy', 2], ['hase', 2]], sleepy: w.id === 'abend',
  };
}
