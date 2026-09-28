// Audio-Engine: Busse (Musik/SFX/Ambience) → Hochpass → Kompressor → Limiter → Master.
// Alle Klänge sind vorgerendert (synth.js); zur Laufzeit nur Buffer-Wiedergabe mit Voice-Limit.
import { renderSfx, renderMusic, renderAmbience } from './synth.js';
import { Music } from './music.js';
import { BUILD } from '../build.js';

// ---------------------------------------------------------------- IndexedDB-Cache der vorgerenderten Klänge
const DBN = 'schmetterlingswiese-audio';
function idb() { return new Promise((res, rej) => { const r = indexedDB.open(DBN, 1); r.onupgradeneeded = () => r.result.createObjectStore('b'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function idbGet(k) { const db = await idb(); return new Promise((res) => { const q = db.transaction('b').objectStore('b').get(k); q.onsuccess = () => res(q.result); q.onerror = () => res(null); }); }
async function idbSet(k, v) { const db = await idb(); return new Promise((res) => { const tx = db.transaction('b', 'readwrite'); tx.objectStore('b').clear(); tx.objectStore('b').put(v, k); tx.oncomplete = () => res(true); tx.onerror = () => res(false); }); }
function pack(o) {
  if (o instanceof AudioBuffer) {
    const ch = []; for (let c = 0; c < o.numberOfChannels; c++) { const d = o.getChannelData(c), q = new Int16Array(d.length); for (let i = 0; i < d.length; i++) q[i] = Math.max(-32767, Math.min(32767, Math.round(d[i] * 32767))); ch.push(q); }
    return { __ab: 1, sr: o.sampleRate, ch };
  }
  if (Array.isArray(o)) return o.map(pack);
  const r = {}; for (const k in o) r[k] = pack(o[k]); return r;
}
function unpack(o) {
  if (o && o.__ab) {
    const b = new AudioBuffer({ length: o.ch[0].length, sampleRate: o.sr, numberOfChannels: o.ch.length });
    o.ch.forEach((q, c) => { const d = new Float32Array(q.length); for (let i = 0; i < q.length; i++) d[i] = q[i] / 32767; b.copyToChannel(d, c); });
    return b;
  }
  if (Array.isArray(o)) return o.map(unpack);
  const r = {}; for (const k in o) r[k] = unpack(o[k]); return r;
}

// Flug-Tempo, das „volles“ Flug-Rauschen ergibt (m/s)
export const FLIGHT_NORM = 9;

// Pegel-Tabelle (Mix): lineare Faktoren je Effekt
const MIX = {
  pling: 0.5, ring: 0.42, loop: 0.5, roll: 0.46, land: 0.5, takeoff: 0.36, boing: 0.5, gust: 0.42, splash: 0.4, pick: 0.45,
  aww: 0.32, glitter: 0.5, fanfare: 0.62, star0: 0.5, star1: 0.52, star2: 0.55, unlock: 0.55, tick: 0.3, go: 0.45, fail: 0.45,
  tap: 0.32, back: 0.3, combo: 0.4, sip: 0.35, pups: 0.42, hupe: 0.5,
  // v2.3: Zufalls-Einlagen + Wiesen-Leben (Summen/Platscher bewusst leise)
  zauber: 0.42, swoosh: 0.4, rakete: 0.42, pop: 0.42, blubb: 0.38, wackel: 0.45, funkel: 0.4, summ: 0.14, platsch: 0.34,
};
const DUCK = { fanfare: [0.3, 3.0], unlock: [0.45, 1.8], glitter: [0.55, 1.4], star0: [0.6, 0.8], star1: [0.6, 0.8], star2: [0.55, 1.0], combo: [0.75, 0.6], fail: [0.6, 1.0] };
const PITCHED = new Set(['fanfare', 'unlock', 'glitter', 'star0', 'star1', 'star2', 'combo', 'go', 'fail', 'zauber', 'funkel']);

// Master-Kette (auch für Offline-Messungen nutzbar)
export function buildMaster(ctx) {
  const m = {};
  m.music = ctx.createGain(); m.duck = ctx.createGain(); m.musicVol = ctx.createGain();
  m.sfx = ctx.createGain(); m.sfxVol = ctx.createGain();
  m.amb = ctx.createGain(); m.ambVol = ctx.createGain();
  m.pre = ctx.createGain();
  m.music.connect(m.duck); m.duck.connect(m.musicVol); m.musicVol.connect(m.pre);
  m.sfx.connect(m.sfxVol); m.sfxVol.connect(m.pre);
  m.amb.connect(m.ambVol); m.ambVol.connect(m.pre);
  // kein Dröhnen unter 80 Hz (Handy-Lautsprecher)
  const hp1 = ctx.createBiquadFilter(); hp1.type = 'highpass'; hp1.frequency.value = 80; hp1.Q.value = 0.707;
  const hp2 = ctx.createBiquadFilter(); hp2.type = 'highpass'; hp2.frequency.value = 80; hp2.Q.value = 0.707;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 2.5; comp.attack.value = 0.015; comp.release.value = 0.25;
  const makeup = ctx.createGain(); makeup.gain.value = 1.0;
  const lim = ctx.createDynamicsCompressor();
  lim.threshold.value = -2; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.1;
  m.master = ctx.createGain(); m.master.gain.value = 0.74;
  m.pre.connect(hp1); hp1.connect(hp2); hp2.connect(comp); comp.connect(makeup); makeup.connect(lim); lim.connect(m.master);
  m.master.connect(ctx.destination);
  m.nodes = { hp1, hp2, comp, makeup, lim };
  return m;
}

export class AudioEngine {
  constructor() {
    this.ctx = null; this.ready = false; this.bufs = null;
    this.vol = { music: 0.7, sfx: 0.9 };
    this.voices = []; this.maxVoices = 14;
    this.rr = {}; // Round-Robin-Zeiger
    this.world = null; this.intensity = 0.35;
    this.loops = {}; this.nextAmb = 0; this.ambKinds = [];
    this.unlocked = false; this.userPaused = false;
    this.stats = { played: 0, stolen: 0 };
    this.progress = 0;
  }
  // Vorrendern (braucht keine Nutzergeste): erst Effekte, dann Ambience, dann Musik; Ergebnis im IndexedDB-Cache
  async preload(onProgress) {
    const t0 = performance.now();
    this.bufs = { sfx: null, amb: null, mus: null };
    try {
      const c = typeof indexedDB !== 'undefined' && !/nocache/.test(location.search) ? await idbGet('v-' + BUILD) : null;
      if (c) { this.bufs = unpack(c); this.fromCache = true; }
    } catch (e) { /* kein Cache */ }
    if (!this.fromCache) {
      this.bufs.sfx = await renderSfx(p => onProgress && onProgress(p * 0.5));
      this.sfxMs = Math.round(performance.now() - t0);
      if (this.ctx) this.attach();
      this.bufs.amb = await renderAmbience(p => onProgress && onProgress(0.5 + p * 0.15));
      if (this.ctx) this.attach();
      this.bufs.mus = await renderMusic(p => onProgress && onProgress(0.65 + p * 0.35));
    }
    this.renderMs = Math.round(performance.now() - t0);
    this.ready = true;
    onProgress && onProgress(1);
    if (this.ctx) this.attach();
    if (!this.fromCache) setTimeout(() => { try { idbSet('v-' + BUILD, pack(this.bufs)).then(ok => { this.cached = ok; }); } catch (e) { /* egal */ } }, 1500);
    return this.bufs;
  }
  // Entsperren in einer echten Nutzergeste (pointerup/touchend/click/keydown)
  unlock() {
    try {
      if (!this.ctx) {
        try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* nicht vorhanden */ }
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC({ latencyHint: 'interactive' });
        this.m = buildMaster(this.ctx);
        this.applyVol();
        if (this.bufs && this.bufs.sfx) this.attach();
        this.ctx.onstatechange = () => { this.onState && this.onState(this.ctx.state); };
      }
      if (this.ctx.state !== 'running' && !this.userPaused) this.ctx.resume().catch(() => { });
      const b = this.ctx.createBuffer(1, 1, 22050); const s = this.ctx.createBufferSource(); s.buffer = b; s.connect(this.ctx.destination); s.start(0);
      this.unlocked = true;
    } catch (e) { /* kein Audio */ }
  }
  get state() { return this.ctx ? this.ctx.state : 'none'; }
  attach() {
    if (!this.ctx || !this.bufs) return;
    if (this.bufs.amb && !this.loops.wind) this.startLoops();
    if (this.bufs.mus && !this.music) {
      this.music = new Music(this.ctx, this.bufs.mus, this.m.music);
      if (this.world) this.setWorld(this.world);
      this.music.setIntensity(this.intensity);
      this.music.start();
    }
    if (!this.timer) this.timer = setInterval(() => this.tick(), 50);
  }
  applyVol() {
    if (!this.m) return;
    const t = this.ctx.currentTime;
    this.m.musicVol.gain.setTargetAtTime(this.vol.music, t, 0.05);
    this.m.sfxVol.gain.setTargetAtTime(this.vol.sfx, t, 0.05);
    this.m.ambVol.gain.setTargetAtTime(this.vol.sfx * 0.9, t, 0.05);
  }
  setVolumes(music, sfx) { this.vol.music = music; this.vol.sfx = sfx; this.applyVol(); }
  // Pausieren bei App-Wechsel / Fortsetzen
  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => { }); }
  resume() { if (this.ctx && this.unlocked && this.ctx.state !== 'running') this.ctx.resume().catch(() => { }); }

  tick() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    this.music && this.music.tick();
    if (this.bufs.amb) this.ambTick();
  }
  setWorld(w) {
    this.world = w;
    if (this.music) {
      const inst = w.id === 'abend' || w.id === 'kirsch' ? 'harp' : 'kalimba';
      this.music.setStyle({ ...w.music, inst });
    }
    this.ambKinds = w.amb_sfx || [];
    this.updateLoops();
  }
  setIntensity(x) { this.intensity = x; this.music && this.music.setIntensity(x); }

  // --------------------------------------------------------------- Effekte
  pick(name) {
    const list = this.bufs && this.bufs.sfx && this.bufs.sfx[name]; if (!list || !list.length) return null;
    let i = ((this.rr[name] ?? -1) + 1 + (list.length > 2 ? (Math.random() * (list.length - 1)) | 0 : 0)) % list.length;
    this.rr[name] = i;
    return list[i];
  }
  play(buf, { gain = 1, rate = 1, pan = 0, bus = 'sfx', when = 0 } = {}) {
    if (!this.ctx || !buf || this.ctx.state !== 'running') return null;
    const c = this.ctx;
    // Voice-Stealing: älteste Stimme weich beenden
    if (this.voices.length >= this.maxVoices) {
      const old = this.voices.shift(); this.stats.stolen++;
      try { old.g.gain.setTargetAtTime(0, c.currentTime, 0.015); old.s.stop(c.currentTime + 0.08); } catch (e) { /* schon beendet */ }
    }
    const s = c.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate;
    const g = c.createGain(); g.gain.value = gain;
    const p = c.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan));
    s.connect(g); g.connect(p); p.connect(bus === 'amb' ? this.m.amb : this.m.sfx);
    const v = { s, g, p };
    this.voices.push(v);
    s.onended = () => { const k = this.voices.indexOf(v); if (k >= 0) this.voices.splice(k, 1); s.disconnect(); g.disconnect(); p.disconnect(); };
    s.start(c.currentTime + when);
    this.stats.played++;
    return v;
  }
  sfx(name, pan = 0, o = {}) {
    const buf = this.pick(name); if (!buf) return;
    const jitterRate = PITCHED.has(name) ? 1 : 1 + (Math.random() - 0.5) * 0.05;
    const jitterGain = Math.pow(10, ((Math.random() - 0.5) * 3) / 20);
    this.play(buf, { gain: (MIX[name] ?? 0.4) * jitterGain * (o.gain ?? 1), rate: (o.rate ?? 1) * jitterRate, pan });
    if (DUCK[name]) this.duck(...DUCK[name]);
  }
  keyRate() { const k = this.music ? this.music.key : 0; return Math.pow(2, k / 12); }
  // Sammel-Pling: steigt mit der Kombo die Skala hoch, in der Tonart der Musik
  collect(combo, pan, kind) {
    const d = Math.min(11, Math.max(0, combo - 1));
    const buf = this.pick('pling' + d);
    if (buf) this.play(buf, { gain: MIX.pling * Math.pow(10, ((Math.random() - 0.5) * 2) / 20), rate: this.keyRate() * (1 + (Math.random() - 0.5) * 0.004), pan });
    if (kind === 'ring') this.sfx('ring', pan);
    if (kind === 'visit' || kind === 'deliver') this.sfx('aww', pan);
    if (kind === 'land') this.sfx('sip', pan);
    if (combo === 5 || combo === 10 || combo === 15 || combo === 20) this.sfx('combo', pan);
    this.duck(0.8, 0.35);
  }
  duck(level, dur) {
    if (!this.m) return;
    const g = this.m.duck.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(level, t + 0.06);
    g.setTargetAtTime(1, t + dur, 0.35);
  }

  // --------------------------------------------------------------- Ambience
  startLoops() {
    const A = this.bufs.amb;
    const mk = (name, buf, gain) => {
      const s = this.ctx.createBufferSource(); s.buffer = buf; s.loop = true;
      const g = this.ctx.createGain(); g.gain.value = 0;
      s.connect(g); g.connect(this.m.amb); s.start();
      this.loops[name] = { s, g, base: gain };
    };
    // bewusst keine Dauer-Loops für Flügel/Summen (klangen wie ein stotternder Motor) – nur Wind + Wasser
    mk('wind', A.wind[0], 0.5); mk('water', A.water[0], 0.35);
    this.updateLoops();
  }
  updateLoops() {
    if (!this.ctx || !this.loops.wind) return;
    const t = this.ctx.currentTime, K = this.ambKinds;
    const on = (n) => (K.includes(n) ? this.loops[n].base : 0);
    this.loops.wind.g.gain.setTargetAtTime(this.menu ? 0.25 : on('wind') || 0.3, t, 0.8);
    this.loops.water.g.gain.setTargetAtTime(on('water'), t, 0.8);
  }
  setMenu(m) { this.menu = m; this.updateLoops(); if (m) { this.setFlight(0); this.setIntensity(0.3); } }
  // Flug-Rauschen: nur der Wind-Pegel folgt Tempo/Böen – langsam geglättet, Tonhöhe fest (kein Leiern/Stottern)
  setFlight(speed01, wind = 0, at = null) {
    if (!this.loops.wind) return;
    const t = at ?? this.ctx.currentTime;
    this.loops.wind.g.gain.setTargetAtTime((this.menu ? 0.2 : 0.3) + speed01 * 0.3 + wind * 0.35, t, 0.9);
  }
  ambTick() {
    const t = this.ctx.currentTime;
    if (t < this.nextAmb) return;
    const K = this.ambKinds;
    const kinds = [];
    if (K.includes('birds')) kinds.push('bird');
    if (K.includes('crickets')) kinds.push('cricket', 'cricket');
    if (!kinds.length) { this.nextAmb = t + 3; return; }
    const k = kinds[(Math.random() * kinds.length) | 0];
    const list = this.bufs.amb[k];
    const buf = list[(Math.random() * list.length) | 0];
    this.play(buf, { gain: (k === 'bird' ? 0.2 : 0.14) * (0.6 + Math.random() * 0.5), rate: 0.92 + Math.random() * 0.16, pan: Math.random() * 1.6 - 0.8, bus: 'amb' });
    if (k === 'bird' && Math.random() < 0.4) this.play(buf, { gain: 0.12, rate: 1.05, pan: Math.random() * 1.6 - 0.8, bus: 'amb', when: 0.25 + Math.random() * 0.3 });
    this.nextAmb = t + (k === 'bird' ? 1.8 + Math.random() * 4 : 0.9 + Math.random() * 2.2);
  }
}

// ------------------------------------------------------------------ Haptik
export class Haptics {
  constructor() {
    this.on = true; this.last = 0;
    this.canVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
    // iPhone-Ersatz: verstecktes <input type=checkbox switch> + Label-Klick (Safari ≥ 17.4 gibt System-Haptik)
    if (!this.canVibrate && typeof document !== 'undefined') {
      const l = document.createElement('label'); l.style.cssText = 'position:fixed;left:-99px;top:-99px;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
      const i = document.createElement('input'); i.type = 'checkbox'; i.setAttribute('switch', ''); l.appendChild(i);
      document.body.appendChild(l); this.label = l;
    }
    this.log = [];
  }
  static P = { collect: [12], ring: [10, 30, 14], stunt: [22], land: [16], bump: [30, 40, 30], gust: [12, 50, 12, 50, 12], star: [20, 60, 20], win: [30, 60, 30, 60, 90], ui: [8], unlock: [15, 40, 15, 40, 40] };
  buzz(kind) {
    if (!this.on) return;
    const now = performance.now();
    if (now - this.last < 45 && kind !== 'win') return;
    this.last = now;
    const p = Haptics.P[kind] || [10];
    this.log.push(kind); if (this.log.length > 50) this.log.shift();
    try {
      if (this.canVibrate) navigator.vibrate(p);
      else if (this.label) { this.label.click(); if (p.length > 2) setTimeout(() => this.label && this.label.click(), p[0] + p[1]); }
    } catch (e) { /* ignorieren */ }
  }
}

// ------------------------------------------------------------------ Offline-Mix (für Messungen: LUFS/Peak/Spektrum)
// mode: 'mix' (Musik+Ambience+SFX-Szenario), 'music', 'sfx'
export async function renderOffline(bufs, world, mode = 'mix', seconds = 60, intensity = 0.6) {
  const sr = 44100;
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sr), sr);
  const m = buildMaster(ctx);
  m.musicVol.gain.value = mode === 'sfx' ? 0 : 0.7; m.sfxVol.gain.value = mode === 'music' ? 0 : 0.9; m.ambVol.gain.value = mode === 'music' ? 0 : 0.81;
  if (mode !== 'sfx') {
    const mu = new Music(ctx, bufs.mus, m.music);
    mu.maxVoices = 1e9;
    const inst = world.id === 'abend' || world.id === 'kirsch' ? 'harp' : 'kalimba';
    mu.setStyle({ ...world.music, inst });
    mu.rnd = (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
    mu.intensity = intensity; mu.start(0); mu.tick(seconds);
  }
  const play = (buf, t, gain, rate = 1, pan = 0, bus = m.sfx, loop = false) => {
    const s = ctx.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate; s.loop = loop;
    const g = ctx.createGain(); g.gain.value = gain; const p = ctx.createStereoPanner(); p.pan.value = pan;
    s.connect(g); g.connect(p); p.connect(bus); s.start(t); return g;
  };
  const duck = (t, level, dur) => { m.duck.gain.setValueAtTime(1, t); m.duck.gain.linearRampToValueAtTime(level, t + 0.06); m.duck.gain.setTargetAtTime(1, t + dur, 0.35); };
  const S = bufs.sfx;
  const key = (() => { let off = ((world.music.root - 60) % 12 + 12) % 12; if (off > 5) off -= 12; return Math.pow(2, off / 12); })();
  if (mode === 'mix') {
    play(bufs.amb.wind[0], 0, 0.5, 1, 0, m.amb, true);
    if ((world.amb_sfx || []).includes('water')) play(bufs.amb.water[0], 0, 0.35, 1, 0, m.amb, true);
    for (let t = 1.3; t < seconds - 1; t += 2.2 + (t * 7 % 3)) play(bufs.amb.bird[(t * 10 | 0) % bufs.amb.bird.length], t, 0.16, 1, Math.sin(t) * 0.7, m.amb);
  }
  if (mode !== 'music') {
    // Szenario: Kombo-Serien, Ringe, Stunts, Landung, Schubs, Böe, Regen, Glitzer, Fanfare
    let t = 2, combo = 0;
    const MIXG = { pling: 0.5, ring: 0.42, loop: 0.5, roll: 0.46, land: 0.5, takeoff: 0.36, boing: 0.5, gust: 0.42, splash: 0.4, glitter: 0.5, fanfare: 0.62, combo: 0.4, aww: 0.32, sip: 0.35, tap: 0.32 };
    const fx = (n, tt, pan = 0, v = 0) => { const L = S[n]; if (L) play(L[v % L.length], tt, MIXG[n] || 0.4, 1, pan); };
    if (mode === 'sfx') {
      // jedes Effekt-Set einmal nacheinander
      const names = Object.keys(S).filter(n => !n.startsWith('pling'));
      for (let d = 0; d < 12; d++) { play(S['pling' + d][0], t, MIXG.pling, key, 0); t += 0.28; }
      t += 1;
      for (const n of names) { fx(n, t, 0); t += Math.min(3.2, S[n][0].duration * 0.8 + 0.3); if (t > seconds - 3) break; }
    } else {
      while (t < seconds - 6) {
        for (let k = 0; k < 7 && t < seconds - 6; k++) { combo++; play(S['pling' + Math.min(11, combo - 1)][combo % 2], t, MIXG.pling, key, Math.sin(t) * 0.6); duck(t, 0.8, 0.35); if (combo === 5) fx('combo', t); if (k === 3) fx('ring', t, 0.3); t += 1.4; }
        combo = 0; t += 2.5;
      }
      fx('loop', 11); fx('roll', 24); fx('land', 30); fx('sip', 30.2); fx('takeoff', 33); fx('boing', 41, -0.4); fx('gust', 45); fx('splash', 50); fx('aww', 36, 0.2);
      fx('glitter', 19); duck(19, 0.55, 1.4);
      fx('fanfare', seconds - 5.5); duck(seconds - 5.5, 0.3, 3);
    }
  }
  const out = await ctx.startRendering();
  return out;
}
// Flug-Bett offline (Ambience-Loops + setFlight wie im Spiel, ohne Musik/Effekte) – für die Stotter-Messung
export async function renderFlight(bufs, world, kind, seconds = 30, diffSpeed = 7.0, only = null) {
  const sr = 44100;
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sr), sr);
  const e = new AudioEngine();
  e.ctx = ctx; e.m = buildMaster(ctx); e.bufs = bufs;
  e.m.musicVol.gain.value = 0; e.m.sfxVol.gain.value = 0.9; e.m.ambVol.gain.value = 0.81;
  e.ambKinds = world.amb_sfx || [];
  e.startLoops();
  if (only) for (const n in e.loops) if (!only.includes(n)) e.loops[n].g.disconnect(); // einzelne Schicht isoliert
  // deterministisches Flugprofil: Geradeausflug, alle 6 s 2 s Steigen, dazwischen kurz Sinken
  let pitch = 0, speed = diffSpeed;
  for (let t = 0, dt = 1 / 15; t < seconds; t += dt) {
    const ph = t % 6, climb = ph < 2 ? 1 : ph > 4.5 && ph < 5.2 ? -0.25 : 0;
    pitch += (climb * 0.58 - pitch) * Math.min(1, dt * 4);
    speed += (diffSpeed * (1 - pitch * 0.28) - speed) * Math.min(1, dt * 2);
    e.setFlight(Math.min(1, Math.max(0, speed / FLIGHT_NORM)), 0, t);
  }
  return ctx.startRendering();
}
export function wavBase64(buf) {
  const ch = buf.numberOfChannels, len = buf.length, sr = buf.sampleRate;
  const data = new DataView(new ArrayBuffer(44 + len * ch * 2));
  const w = (o, s) => { for (let i = 0; i < s.length; i++) data.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); data.setUint32(4, 36 + len * ch * 2, true); w(8, 'WAVE'); w(12, 'fmt '); data.setUint32(16, 16, true); data.setUint16(20, 1, true);
  data.setUint16(22, ch, true); data.setUint32(24, sr, true); data.setUint32(28, sr * ch * 2, true); data.setUint16(32, ch * 2, true); data.setUint16(34, 16, true);
  w(36, 'data'); data.setUint32(40, len * ch * 2, true);
  const chans = []; for (let c = 0; c < ch; c++) chans.push(buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) { const v = Math.max(-1, Math.min(1, chans[c][i])); data.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true); o += 2; }
  const bytes = new Uint8Array(data.buffer); let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
