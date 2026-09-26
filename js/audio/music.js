// Generative, adaptive Musik: Look-ahead-Scheduler auf der Audio-Uhr, Schichten (Stems) nach Spielzustand
const PROG = {
  major: [
    [[0, 'maj7'], [9, 'min7'], [5, 'add9'], [7, 'sus2']],
    [[0, 'add9'], [7, 'maj'], [9, 'min7'], [5, 'maj7']],
    [[5, 'maj7'], [7, 'six'], [4, 'min7'], [9, 'min7']],
    [[0, 'maj7'], [5, 'maj7'], [2, 'min7'], [7, 'sus2']],
  ],
  lydian: [
    [[0, 'maj7'], [2, 'maj'], [0, 'add9'], [2, 'six']],
    [[0, 'maj7'], [7, 'maj7'], [2, 'maj'], [9, 'min7']],
  ],
  dorian: [
    [[0, 'min7'], [5, 'maj'], [0, 'min7'], [5, 'six']],
    [[0, 'min7'], [3, 'maj7'], [5, 'maj'], [10, 'maj7']],
  ],
  pentatonic: [
    [[0, 'sus2'], [9, 'min7'], [5, 'add9'], [7, 'sus2']],
    [[0, 'add9'], [4, 'min7'], [9, 'min7'], [5, 'maj7']],
  ],
};
const SCALE = { major: [0, 2, 4, 7, 9], pentatonic: [0, 2, 4, 7, 9], lydian: [0, 2, 4, 6, 7, 9, 11], dorian: [0, 3, 5, 7, 10] };
const Q = { maj7: [0, 4, 7, 11], min7: [0, 3, 7, 10], add9: [0, 4, 7, 14], sus2: [0, 2, 7, 12], maj: [0, 4, 7, 12], min: [0, 3, 7, 12], six: [0, 4, 7, 9] };
const RHYTHMS = [
  [0, 4, 6, 8, 12], [0, 3, 6, 10, 12, 14], [0, 2, 4, 8, 10], [0, 6, 8, 11, 12], [0, 4, 8, 10, 12, 14], [2, 4, 6, 12],
];

export class Music {
  constructor(ctx, bufs, outNode) {
    this.ctx = ctx; this.b = bufs;
    this.out = outNode;
    this.stems = {};
    for (const k of ['pad', 'bass', 'arp', 'mel', 'perc']) { const g = ctx.createGain(); g.gain.value = 0; g.connect(outNode); this.stems[k] = g; }
    this.stemLevel = { pad: 0.55, bass: 0.55, arp: 0.42, mel: 0.34, perc: 0.3 };
    this.intensity = 0.35;
    this.voices = 0; this.maxVoices = 28;
    this.playing = false;
    this.setStyle({ root: 65, mode: 'major', bpm: 84 });
    this.rnd = Math.random;
  }
  setStyle(s) {
    this.style = s;
    let off = ((s.root - 60) % 12 + 12) % 12; if (off > 5) off -= 12;
    this.key = off; // Halbtöne relativ zu C
    this.mode = PROG[s.mode] ? s.mode : 'major';
    this.spb = 60 / s.bpm; // Sekunden pro Schlag
    this.prog = PROG[this.mode][0]; this.phrase = 0; this.progIdx = 0;
    this.inst = s.inst || (s.mode === 'dorian' || s.mode === 'pentatonic' ? 'harp' : 'kalimba');
  }
  start(t0) {
    if (this.playing) return;
    this.playing = true;
    this.step = 0; this.next = (t0 ?? this.ctx.currentTime) + 0.1;
    this.applyIntensity(true);
  }
  stop() { this.playing = false; for (const k in this.stems) this.stems[k].gain.setTargetAtTime(0, this.ctx.currentTime, 0.4); }
  setIntensity(x) { this.intensity = Math.max(0, Math.min(1, x)); this.applyIntensity(); }
  applyIntensity(now) {
    const i = this.intensity, t = this.ctx.currentTime, L = this.stemLevel;
    const tg = { pad: L.pad, bass: i > 0.15 ? L.bass : 0, arp: i > 0.28 ? L.arp * Math.min(1, 0.55 + i * 0.6) : 0, mel: i > 0.5 ? L.mel : 0, perc: i > 0.6 ? L.perc * Math.min(1, (i - 0.5) * 2) : 0 };
    for (const k in tg) this.stems[k].gain.setTargetAtTime(this.playing ? tg[k] : 0, t, now ? 0.05 : 1.3);
  }
  // Probe spielen (Buffer + Tonhöhe via playbackRate)
  play(buf, t, rate, gain, stem, pan = 0, dur) {
    if (!buf || this.voices >= this.maxVoices) return;
    const c = this.ctx;
    const s = c.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate;
    const g = c.createGain(); g.gain.value = gain;
    let last = g;
    s.connect(g);
    if (pan) { const p = c.createStereoPanner(); p.pan.value = pan; g.connect(p); last = p; }
    last.connect(this.stems[stem]);
    s.start(t);
    if (dur) { g.gain.setValueAtTime(gain, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 1.6); s.stop(t + dur + 1.7); }
    this.voices++;
    s.onended = () => { this.voices--; s.disconnect(); g.disconnect(); if (last !== g) last.disconnect(); };
  }
  note(inst, midi, t, vel, stem, pan) {
    const bases = [60, 72, 84];
    let base = bases[0]; for (const b of bases) if (Math.abs(midi - b) < Math.abs(midi - base)) base = b;
    const buf = this.b.inst[inst + base];
    this.play(buf, t, Math.pow(2, (midi - base) / 12), vel, stem, pan);
  }
  // Scheduler: plant alles vor, was in das Vorausschau-Fenster fällt
  tick(look = 0.3) {
    if (!this.playing) return;
    const c = this.ctx;
    if (this.next < c.currentTime - 0.2) this.next = c.currentTime + 0.05; // nach Pause/Stau
    const until = c.currentTime + look;
    while (this.next < until) { this.schedule(this.step, this.next); this.next += this.spb / 4; this.step++; }
  }
  schedule(step, t) {
    const r = this.rnd;
    const s16 = step % 16, bar = Math.floor(step / 16), barInPhrase = bar % 4;
    if (s16 === 0 && barInPhrase === 0) this.newPhrase(bar);
    const [cr, cq] = this.prog[barInPhrase];
    const chordRoot = this.key + cr;
    const I = this.intensity;
    const hum = () => (r() - 0.5) * 0.012;
    if (s16 === 0) {
      // Pad: gerendert auf C3 → transponieren
      let semi = chordRoot; while (semi > 6) semi -= 12; while (semi < -6) semi += 12;
      this.play(this.b.pad[cq], t, Math.pow(2, semi / 12), 0.9, 'pad', 0, this.spb * 4);
      // Bass (Grundton, nie unter ~98 Hz)
      let bm = 48 + semi; if (bm < 43) bm += 12;
      if (!this.breakdown) this.play(this.b.inst.bass48, t + hum(), Math.pow(2, (bm - 48) / 12), 0.85, 'bass');
    }
    if (s16 === 8 && !this.breakdown && I > 0.3 && r() < 0.8) {
      let semi = chordRoot + (r() < 0.5 ? 7 : 0); while (semi > 6) semi -= 12; while (semi < -6) semi += 12;
      let bm = 48 + semi; if (bm < 43) bm += 12;
      this.play(this.b.inst.bass48, t + hum(), Math.pow(2, (bm - 48) / 12), 0.6, 'bass');
    }
    // Arpeggio (Achtel)
    if (s16 % 2 === 0 && !this.breakdown) {
      const tones = Q[cq];
      const k = s16 / 2;
      const pat = this.arpPat;
      let idx = pat === 0 ? k % 4 : pat === 1 ? 3 - (k % 4) : pat === 2 ? [0, 1, 2, 3, 2, 1, 0, 2][k] : [0, 2, 1, 3, 0, 2, 3, 1][k];
      const oct = 72 + (k >= 4 && this.arpOct ? 12 : 0);
      const dens = 0.55 + I * 0.45;
      if (r() < dens || s16 === 0) this.note(this.inst, oct + this.key + cr + tones[idx] - (cr + tones[idx] > 12 ? 12 : 0), t + hum(), (s16 % 8 === 0 ? 0.75 : 0.5) * (0.85 + r() * 0.3), 'arp', (r() - 0.5) * 0.6);
    }
    // Melodie (Glockenspiel), Motiv mit Variation
    if (I > 0.5 && this.motif) {
      const half = barInPhrase % 2, m = this.motif[half];
      const hit = m.find(n => n.s === s16);
      if (hit && (barInPhrase < 3 || r() < 0.85)) {
        let midi = 84 + this.key + this.degToSemi(hit.d + (barInPhrase >= 2 ? this.motifShift : 0));
        if (midi > 98) midi -= 12;
        this.note('bell', midi, t + hum(), 0.55 * (0.85 + r() * 0.3), 'mel', (r() - 0.5) * 0.4);
      }
    }
    // Leise Percussion
    if (I > 0.6 && !this.breakdown) {
      if (s16 % 2 === 0) this.play(this.b.perc['shaker' + ((r() * 3) | 0)], t + hum(), 1 + (r() - 0.5) * 0.06, s16 % 4 === 2 ? 0.7 : 0.4, 'perc', 0.3);
      if (s16 === 4 || s16 === 12) this.play(this.b.perc['wood' + ((r() * 3) | 0)], t + hum(), 1, 0.55, 'perc', -0.2);
    }
  }
  degToSemi(d) {
    const sc = SCALE[this.mode], n = sc.length;
    return sc[((d % n) + n) % n] + 12 * Math.floor(d / n);
  }
  newPhrase(bar) {
    const r = this.rnd;
    this.phrase++;
    if (this.phrase % 3 === 0) { const P = PROG[this.mode]; this.progIdx = (this.progIdx + 1 + ((r() * (P.length - 1)) | 0)) % P.length; this.prog = P[this.progIdx]; }
    this.breakdown = this.phrase % 7 === 6; // gelegentlich nur Fläche – Atempause
    this.arpPat = (r() * 4) | 0; this.arpOct = r() < 0.5;
    // Motiv: Zufallsweg auf Skalenstufen, endet auf Akkordton
    const mk = () => {
      const rh = RHYTHMS[(r() * RHYTHMS.length) | 0];
      let d = (r() * 4) | 0;
      return rh.map((s, i) => { d += [-2, -1, -1, 1, 1, 2, 0][(r() * 7) | 0]; d = Math.max(-2, Math.min(8, d)); return { s, d: i === rh.length - 1 ? Math.round(d / 2) * 2 : d }; });
    };
    this.motif = [mk(), mk()];
    this.motifShift = [0, 1, -1, 2][(r() * 4) | 0];
  }
}
