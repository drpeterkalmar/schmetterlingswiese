// Fortschritt & Profile (localStorage), Sammelalbum, Abzeichen, Freischaltungen
import { LEVELS, todayStr } from './levels.js';
import { CHARACTERS, COLORS, HATS, PATTERNS } from '../actors/characters.js';

const KEY = 'schmetterlingswiese.v2';
export const AVATAR_COLORS = ['#ff7eb6', '#7cc4ff', '#ffc94a', '#9ce07a', '#b89cff', '#ff9a5a'];

export const ALBUM = [
  { id: 'baer', emoji: '🐻', name: 'Bärenbaby', fact: 'Bärenbabys kommen im Winter zur Welt und sind anfangs so klein wie ein Meerschweinchen.' },
  { id: 'capy', emoji: '🦫', name: 'Capybara', fact: 'Capybaras sind die größten Nagetiere der Welt – und die gemütlichsten.' },
  { id: 'hase', emoji: '🐰', name: 'Häschen', fact: 'Hasen können ihre langen Ohren einzeln drehen, um besser zu hören.' },
  { id: 'ente', emoji: '🐤', name: 'Entchen', fact: 'Entenküken können schon am ersten Tag schwimmen.' },
  { id: 'marienkaefer', emoji: '🐞', name: 'Marienkäfer', fact: 'Marienkäfer klappen zum Fliegen ihre roten Deckflügel auf.' },
  { id: 'falter', emoji: '🦋', name: 'Bunte Falter', fact: 'Schmetterlinge schmecken mit ihren Füßen!' },
  { id: 'wespe', emoji: '🐝', name: 'Freche Wespe', fact: 'Wespen bauen Nester aus Papier, das sie selbst aus Holz kauen.' },
  { id: 'libelle', emoji: '🪽', name: 'Libelle', fact: 'Libellen können sogar rückwärts fliegen.' },
  { id: 'gluehwurm', emoji: '✨', name: 'Glühwürmchen', fact: 'Glühwürmchen leuchten, ohne dabei warm zu werden.' },
  { id: 'sonnenblume', emoji: '🌻', name: 'Sonnenblume', fact: 'Junge Sonnenblumen drehen ihren Kopf mit der Sonne.' },
  { id: 'seerose', emoji: '🪷', name: 'Seerose', fact: 'Seerosenblätter schwimmen, weil sie kleine Luftkammern haben.' },
  { id: 'kirschbluete', emoji: '🌸', name: 'Kirschblüte', fact: 'In Japan feiert man die Kirschblüte mit Picknicks unter den Bäumen.' },
  { id: 'margerite', emoji: '🌼', name: 'Margerite', fact: 'Eine Margerite ist eigentlich ein ganzer Korb aus vielen winzigen Blüten.' },
  { id: 'tulpe', emoji: '🌷', name: 'Tulpe', fact: 'Tulpen wachsen nach dem Schneiden in der Vase sogar noch weiter.' },
  { id: 'pilz', emoji: '🍄', name: 'Fliegenpilz', fact: 'Schön anzusehen – aber niemals essen! Fliegenpilze sind giftig.' },
  { id: 'glitzerstern', emoji: '⭐', name: 'Glitzerstern', fact: 'Glitzersterne verstecken sich gern hoch oben oder hinter Bäumen.' },
  { id: 'regenbogen', emoji: '🌈', name: 'Kombo-Regenbogen', fact: 'Schaffe eine 10er-Kombo, dann erscheint der Regenbogen im Album.' },
];

export const BADGES = [
  { id: 'erstflug', emoji: '🪽', name: 'Erster Flug', desc: 'Das erste Level geschafft', check: (p) => countLevels(p) >= 1 },
  { id: 'looping', emoji: '🤸', name: 'Looping-Profi', desc: '10 Loopings geflogen', check: (p) => (p.stats.loops || 0) >= 10 },
  { id: 'schraube', emoji: '🌀', name: 'Schrauben-Star', desc: '10 Schrauben gedreht', check: (p) => (p.stats.rolls || 0) >= 10 },
  { id: 'sammler', emoji: '💧', name: 'Nektar-Sammler', desc: '100 Sachen eingesammelt', check: (p) => (p.stats.collected || 0) >= 100 },
  { id: 'tierfreund', emoji: '💞', name: 'Tierfreund', desc: '15 Tierbabys glücklich gemacht', check: (p) => (p.stats.animals || 0) >= 15 },
  { id: 'kombo10', emoji: '🔥', name: 'Kombo-König', desc: 'Eine 10er-Kombo geschafft', check: (p) => (p.stats.bestCombo || 0) >= 10 },
  { id: 'glitzer', emoji: '⭐', name: 'Sternensucher', desc: '5 Glitzersterne gefunden', check: (p) => (p.stats.glitter || 0) >= 5 },
  { id: 'welt1', emoji: '🌼', name: 'Wiesen-Held', desc: 'Frühlingswiese komplett', check: (p) => worldDone(p, 'wiese') },
  { id: 'welt2', emoji: '🌻', name: 'Sonnenkind', desc: 'Sonnenblumenfeld komplett', check: (p) => worldDone(p, 'sonne') },
  { id: 'welt3', emoji: '🪷', name: 'Teich-Taucher', desc: 'Seerosenteich komplett', check: (p) => worldDone(p, 'teich') },
  { id: 'welt4', emoji: '🌸', name: 'Blütenzauber', desc: 'Kirschblütenhain komplett', check: (p) => worldDone(p, 'kirsch') },
  { id: 'welt5', emoji: '✨', name: 'Nachtfalter', desc: 'Glühwürmchen-Abend komplett', check: (p) => worldDone(p, 'abend') },
  { id: 'schwer', emoji: '💪', name: 'Mutig!', desc: 'Ein Level auf Schwer geschafft', check: (p) => Object.values(p.levels).some(l => l.schwer && l.schwer.stars > 0) },
  { id: 'dreisterne', emoji: '🌟', name: 'Drei-Sterne-Flieger', desc: '10 Mal drei Sterne', check: (p) => Object.values(p.levels).reduce((a, l) => a + Object.values(l).filter(d => d.stars === 3).length, 0) >= 10 },
  { id: 'tag3', emoji: '📅', name: 'Treue Flügel', desc: '3 Tagesaufgaben geschafft', check: (p) => Object.keys(p.daily.done || {}).length >= 3 },
  { id: 'album', emoji: '📖', name: 'Naturforscher', desc: '12 Albumseiten entdeckt', check: (p) => Object.keys(p.album).length >= 12 },
  { id: 'lande', emoji: '🛬', name: 'Sanfte Landung', desc: '20 Mal gelandet', check: (p) => (p.stats.landings || 0) >= 20 },
];
function countLevels(p) { return Object.values(p.levels).filter(l => Object.values(l).some(d => d.stars > 0)).length; }
function worldDone(p, wid) { return LEVELS.filter(l => l.world === wid).every(l => p.levels[l.id] && Object.values(p.levels[l.id]).some(d => d.stars > 0)); }

function defaults() {
  return { v: 2, profiles: [], current: null, settings: { music: 0.7, sfx: 0.9, haptics: true, control: 'zones', quality: 'auto' } };
}
function newProfile(name, color) {
  return {
    id: 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1e4), name, color,
    created: Date.now(), diff: 'leicht',
    look: { char: 'schmetterling', color: { schmetterling: 0, marienkaefer: 0, biene: 0, libelle: 0 }, pattern: 'monarch', hat: 'none' },
    levels: {}, stats: {}, album: {}, badges: {}, daily: { done: {} }, seen: {},
  };
}

export class Progress {
  constructor(storage = globalThis.localStorage) {
    this.st = storage;
    this.data = defaults();
    try { const raw = this.st && this.st.getItem(KEY); if (raw) this.data = { ...defaults(), ...JSON.parse(raw) }; } catch (e) { this.data = defaults(); }
    this.data.settings = { ...defaults().settings, ...(this.data.settings || {}) };
  }
  save() { try { this.st && this.st.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* voll/privat */ } }
  get settings() { return this.data.settings; }
  get profiles() { return this.data.profiles; }
  get cur() { return this.data.profiles.find(p => p.id === this.data.current) || null; }
  select(id) { this.data.current = id; this.save(); }
  create(name, color) {
    const p = newProfile(String(name).trim().slice(0, 14) || 'Flieger', color);
    this.data.profiles.push(p); this.data.current = p.id; this.save(); return p;
  }
  remove(id) { this.data.profiles = this.data.profiles.filter(p => p.id !== id); if (this.data.current === id) this.data.current = null; this.save(); }
  rename(id, name) { const p = this.data.profiles.find(q => q.id === id); if (p) { p.name = String(name).trim().slice(0, 14) || p.name; this.save(); } }

  stars(p = this.cur) {
    if (!p) return 0;
    let n = 0;
    for (const l of Object.values(p.levels)) for (const d of Object.values(l)) n += d.stars || 0;
    n += Object.keys(p.daily.done || {}).length; // jede Tagesaufgabe = 1 Stern
    return n;
  }
  levelStars(id, diff, p = this.cur) { return (p && p.levels[id] && p.levels[id][diff] && p.levels[id][diff].stars) || 0; }
  bestStars(id, p = this.cur) { const l = p && p.levels[id]; if (!l) return 0; return Math.max(0, ...Object.values(l).map(d => d.stars || 0)); }
  unlocked(id, p = this.cur) {
    const i = LEVELS.findIndex(l => l.id === id);
    if (i <= 0) return true;
    return this.bestStars(LEVELS[i - 1].id, p) > 0;
  }
  // Freischaltbares nach Sternen
  unlockables() {
    const out = [];
    CHARACTERS.forEach(c => out.push({ type: 'char', id: c.id, name: c.name, emoji: c.emoji, stars: c.stars }));
    for (const k of Object.keys(COLORS)) COLORS[k].forEach((c, i) => { if (c.stars > 0) out.push({ type: 'color', id: k + ':' + i, name: `${c.name} (${CHARACTERS.find(x => x.id === k).name})`, emoji: '🎨', stars: c.stars }); });
    HATS.forEach(h => { if (h.stars > 0) out.push({ type: 'hat', id: h.id, name: h.name, emoji: h.emoji, icon: h.icon, stars: h.stars }); });
    PATTERNS.forEach(pt => { if (pt.stars > 0) out.push({ type: 'pattern', id: pt.id, name: 'Flügelmuster ' + pt.name, emoji: '🦋', stars: pt.stars }); });
    return out;
  }
  record(levelId, diff, res, isDaily) {
    const p = this.cur; if (!p) return { unlocks: [], badges: [] };
    const before = this.stars(p);
    const badgesBefore = { ...p.badges };
    if (isDaily) { p.daily.done[levelId.replace('daily-', '')] = true; }
    else {
      const L = p.levels[levelId] || (p.levels[levelId] = {});
      const old = L[diff] || { stars: 0 };
      L[diff] = { stars: Math.max(old.stars || 0, res.stars), time: Math.min(old.time || 1e9, Math.round(res.time * 10) / 10), combo: Math.max(old.combo || 0, res.maxCombo) };
    }
    p.stats.bestCombo = Math.max(p.stats.bestCombo || 0, res.maxCombo);
    if (res.maxCombo >= 10) p.album.regenbogen = p.album.regenbogen || Date.now();
    const after = this.stars(p);
    const unlocks = this.unlockables().filter(u => u.stars > before && u.stars <= after);
    const badges = this.checkBadges(p).filter(b => !badgesBefore[b.id]);
    this.save();
    return { unlocks, badges, before, after };
  }
  checkBadges(p = this.cur) {
    const got = [];
    for (const b of BADGES) if (!p.badges[b.id] && b.check(p)) { p.badges[b.id] = Date.now(); got.push(b); }
    return got;
  }
  stat(key, n = 1) { const p = this.cur; if (!p) return; p.stats[key] = (p.stats[key] || 0) + n; }
  discover(id) { const p = this.cur; if (!p || p.album[id]) return false; p.album[id] = Date.now(); this.save(); return ALBUM.find(a => a.id === id) || null; }
  dailyDone(p = this.cur) { return !!(p && p.daily.done[todayStr()]); }
  firstTime(key) { const p = this.cur; if (!p) return true; if (p.seen[key]) return false; p.seen[key] = 1; this.save(); return true; }
  isUnlocked(type, id, p = this.cur) {
    const s = this.stars(p);
    if (type === 'char') return s >= (CHARACTERS.find(c => c.id === id)?.stars ?? 999);
    if (type === 'hat') return s >= (HATS.find(h => h.id === id)?.stars ?? 999);
    if (type === 'pattern') return s >= (PATTERNS.find(h => h.id === id)?.stars ?? 999);
    if (type === 'color') { const [k, i] = id.split(':'); return s >= (COLORS[k]?.[+i]?.stars ?? 999); }
    return false;
  }
}
