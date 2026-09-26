// Audio-Engine: Busse (Musik/SFX/Ambience) → Hochpass → Kompressor → Limiter → Master.
// Alle Klänge sind vorgerendert (synth.js); zur Laufzeit nur Buffer-Wiedergabe mit Voice-Limit.
import { renderSfx, renderMusic, renderAmbience } from './synth.js';
import { Music } from './music.js';

// Pegel-Tabelle (Mix): lineare Faktoren je Effekt
const MIX = {
  pling: 0.5, ring: 0.42, loop: 0.5, roll: 0.46, land: 0.5, takeoff: 0.36, boing: 0.5, gust: 0.42, splash: 0.4, pick: 0.45,
  aww: 0.32, glitter: 0.5, fanfare: 0.62, star0: 0.5, star1: 0.52, star2: 0.55, unlock: 0.55, tick: 0.3, go: 0.45, fail: 0.45,
  tap: 0.32, back: 0.3, combo: 0.4, sip: 0.35,
};
const DUCK = { fanfare: [0.3, 3.0], unlock: [0.45, 1.8], glitter: [0.55, 1.4], star0: [0.6, 0.8], star1: [0.6, 0.8], star2: [0.55, 1.0], combo: [0.75, 0.6], fail: [0.6, 1.0] };
const PITCHED = new Set(['fanfare', 'unlock', 'glitter', 'star0', 'star1', 'star2', 'combo', 'go', 'fail']);

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
  comp.threshold.value = -20; comp.knee.value = 10; comp.ratio.value = 3; comp.attack.value = 0.012; comp.release.value = 0.25;
  const makeup = ctx.createGain(); makeup.gain.value = 1.6;
  const lim = ctx.createDynamicsCompressor();
  lim.threshold.value = -4; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.08;
  m.master = ctx.createGain(); m.master.gain.value = 0.78;
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
  // Vorrendern (braucht keine Nutzergeste)
  async preload(onProgress) {
    const t0 = performance.now();
    let pS = 0, pM = 0, pA = 0;
    const upd = () => { this.progress = (pS + pM + pA) / 3; onProgress && onProgress(this.progress); };
    const [sfx, mus, amb] = await Promise.all([
      renderSfx(p => { pS = p; upd(); }), renderMusic(p => { pM = p; upd(); }), renderAmbience(p => { pA = p; upd(); }),
    ]);
    this.bufs = { sfx, mus, amb };
    this.renderMs = Math.round(performance.now() - t0);
    this.ready = true;
    if (this.ctx) this.attach();
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
        if (this.ready) this.attach();
        this.ctx.onstatechange = () => { this.onState && this.onState(this.ctx.state); };
      }
      if (this.ctx.state !== 'running' && !this.userPaused) this.ctx.resume().catch(() => { });
      const b = this.ctx.createBuffer(1, 1, 22050); const s = this.ctx.createBufferSource(); s.buffer = b; s.connect(this.ctx.destination); s.start(0);
      this.unlocked = true;
    } catch (e) { /* kein Audio */ }
  }
  get state() { return this.ctx ? this.ctx.state : 'none'; }
  attach() {
    if (this.music || !this.ctx || !this.bufs) return;
    this.music = new Music(this.ctx, this.bufs.mus, this.m.music);
    if (this.world) this.setWorld(this.world);
    this.music.setIntensity(this.intensity);
    this.music.start();
    this.startLoops();
    this.timer = setInterval(() => this.tick(), 50);
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
    this.ambTick();
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
    const list = this.bufs && this.bufs.sfx[name]; if (!list || !list.length) return null;
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
    mk('wind', A.wind[0], 0.5); mk('water', A.water[0], 0.35); mk('bees', A.bees[0], 0.22);
    mk('flutter', A.flutter[0], 0.0); mk('buzz', A.buzz[0], 0.0);
    this.updateLoops();
  }
  updateLoops() {
    if (!this.ctx || !this.loops.wind) return;
    const t = this.ctx.currentTime, K = this.ambKinds;
    const on = (n) => (K.includes(n) ? this.loops[n].base : 0);
    this.loops.wind.g.gain.setTargetAtTime(this.menu ? 0.25 : on('wind') || 0.3, t, 0.8);
    this.loops.water.g.gain.setTargetAtTime(on('water'), t, 0.8);
    this.loops.bees.g.gain.setTargetAtTime(on('bees'), t, 0.8);
  }
  setMenu(m) { this.menu = m; this.updateLoops(); if (m) { this.setFlight(0, 0, 'none'); this.setIntensity(0.3); } }
  // Flug-Geräusche folgen Tempo/Flügelschlag
  setFlight(speed01, flap, kind, wind = 0) {
    if (!this.loops.wind) return;
    const t = this.ctx.currentTime;
    this.loops.wind.g.gain.setTargetAtTime((this.menu ? 0.2 : 0.3) + speed01 * 0.35 + wind * 0.4, t, 0.3);
    this.loops.wind.s.playbackRate.setTargetAtTime(0.9 + speed01 * 0.25, t, 0.3);
    const buzzy = kind === 'biene' || kind === 'libelle';
    this.loops.flutter.g.gain.setTargetAtTime(kind === 'none' || buzzy ? 0 : 0.1 + flap * 0.12, t, 0.2);
    this.loops.flutter.s.playbackRate.setTargetAtTime(0.7 + flap * 0.8, t, 0.2);
    this.loops.buzz.g.gain.setTargetAtTime(buzzy ? 0.07 + flap * 0.06 : 0, t, 0.2);
    this.loops.buzz.s.playbackRate.setTargetAtTime((kind === 'libelle' ? 0.7 : 1) + flap * 0.3, t, 0.2);
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
