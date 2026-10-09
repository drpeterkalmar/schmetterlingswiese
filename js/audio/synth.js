// Offline-Synthese: alle Klänge werden EINMAL per OfflineAudioContext in AudioBuffer gerendert.
// Zur Laufzeit werden nur Buffer abgespielt (Lehre aus Koboldkeller: Live-Oszillatoren ruckeln am Handy).

const SR = 44100;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
export { mtof };

// ---------------------------------------------------------------- Hilfen
const irCache = new Map(), noiseCache = new Map();
function makeIR(ctx, seconds = 1.9, decay = 2.2, bright = 0.5) {
  const key = ctx.sampleRate + ':' + seconds + ':' + decay + ':' + bright;
  if (irCache.has(key)) return irCache.get(key);
  const sr = ctx.sampleRate, len = Math.floor(seconds * sr);
  const buf = new AudioBuffer({ length: len, sampleRate: sr, numberOfChannels: 2 });
  let seed = 12345;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff * 2 - 1; };
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    const pre = Math.floor(0.012 * sr);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = i < pre ? 0 : Math.exp(-(t - 0.012) * 6.9 / decay);
      // Tiefpass wird mit der Zeit dunkler (natürlicher Hallausklang)
      const a = Math.max(0.04, bright * Math.exp(-t * 1.6));
      lp += (rnd() - lp) * a;
      d[i] = lp * env * (0.9 + 0.1 * Math.sin(i * 0.0007 + ch));
    }
    // frühe Reflexionen
    [0.013, 0.019, 0.027, 0.034, 0.047].forEach((tt, k) => { const i = Math.floor((tt + ch * 0.0031) * sr); if (i < len) d[i] += (k % 2 ? -0.5 : 0.6) * (1 - k * 0.12); });
  }
  // normieren
  let e = 0; for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) e += d[i] * d[i]; }
  const k = 1 / Math.sqrt(e / 2 + 1e-9) * 0.9;
  for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] *= k; }
  irCache.set(key, buf);
  return buf;
}
function noiseBuf(ctx, seconds = 2) {
  const key = ctx.sampleRate + ':' + seconds;
  if (noiseCache.has(key)) return noiseCache.get(key);
  const len = Math.floor(seconds * ctx.sampleRate);
  const b = new AudioBuffer({ length: len, sampleRate: ctx.sampleRate, numberOfChannels: 1 });
  const d = b.getChannelData(0); let s = 987654;
  for (let i = 0; i < len; i++) { s = (s * 1664525 + 1013904223) >>> 0; d[i] = s / 4294967296 * 2 - 1; }
  noiseCache.set(key, b);
  return b;
}
function noise(ctx, t0, t1, rate = 1) {
  const n = ctx.createBufferSource(); n.buffer = noiseBuf(ctx, 2); n.loop = true; n.playbackRate.value = rate;
  n.start(t0, Math.random() * 1.5); n.stop(t1); return n;
}
function osc(ctx, type, f, t0, t1, detune = 0) {
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t0); o.detune.value = detune;
  o.start(t0); o.stop(t1); return o;
}
function g(ctx, v = 0) { const x = ctx.createGain(); x.gain.value = v; return x; }
function filt(ctx, type, f, Q = 0.7) { const x = ctx.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = Q; return x; }
// Hüllkurve: Attack linear, dann exponentieller Abfall, sauberes Ende
function env(param, t0, a, peak, tau, end, sustain = 0) {
  param.setValueAtTime(0.0001, t0);
  param.linearRampToValueAtTime(peak, t0 + a);
  param.setTargetAtTime(sustain, t0 + a, tau);
  param.setTargetAtTime(0, Math.max(t0 + a, end - 0.05), 0.012);
}
function chain(...nodes) { for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]); return nodes[nodes.length - 1]; }

// max. 3 gleichzeitige Offline-Renders (Speicher/Handy-CPU schonen)
let active = 0; const waiters = [];
async function slot() { if (active < 3) { active++; return; } await new Promise(r => waiters.push(r)); active++; }
function release() { active--; const w = waiters.shift(); if (w) w(); }
async function render(dur, ch, build, o = {}) {
  await slot();
  try { return await renderNow(dur, ch, build, o); } finally { release(); }
}
async function renderNow(dur, ch, build, o = {}) {
  const sr = o.sr || SR;
  const ctx = new OfflineAudioContext(ch, Math.ceil(dur * sr), sr);
  const dry = g(ctx, 1), out = g(ctx, 1);
  dry.connect(out);
  if (o.wet) {
    const cv = ctx.createConvolver(); cv.normalize = false; cv.buffer = makeIR(ctx, o.irLen || 1.5, o.decay || 2.0, o.bright ?? 0.5);
    const wg = g(ctx, o.wet); dry.connect(cv); cv.connect(wg); wg.connect(out);
  }
  const hp = filt(ctx, 'highpass', o.hp || 70, 0.7);
  out.connect(hp); hp.connect(ctx.destination);
  build(ctx, dry, 0.005);
  const buf = await ctx.startRendering();
  if (o.norm !== false) normalize(buf, o.peak ?? 0.7);
  return buf;
}
function normalize(buf, peak) {
  let m = 0;
  for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > m) m = v; } }
  if (m < 1e-6) return;
  const k = peak / m;
  for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] *= k; }
  // kurzes Fade-out gegen Knackser
  const n = Math.min(256, buf.length);
  for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) d[d.length - 1 - i] *= i / n; }
}

// ---------------------------------------------------------------- Instrument-Stimmen (in Offline-Kontexten)
function bell(ctx, out, t, f, amp = 1, o = {}) {
  const dur = o.dur || 2.2, end = t + dur;
  const car = osc(ctx, 'sine', f, t, end), mod = osc(ctx, 'sine', f * (o.ratio || 3.5), t, end);
  const md = g(ctx, 0); env(md.gain, t, 0.002, f * (o.index || 2.2), o.modTau || 0.12, end);
  mod.connect(md); md.connect(car.frequency);
  const a = g(ctx, 0); env(a.gain, t, 0.002, amp, o.tau || 0.55, end);
  car.connect(a); a.connect(out);
  // zweiter Teilton (Glockenspiel-Schimmer)
  const p2 = osc(ctx, 'sine', f * (o.p2 || 2.76), t, end);
  const a2 = g(ctx, 0); env(a2.gain, t, 0.001, amp * 0.35, (o.tau || 0.55) * 0.35, end);
  p2.connect(a2); a2.connect(out);
}
function kalimba(ctx, out, t, f, amp = 1, o = {}) {
  const dur = o.dur || 1.8, end = t + dur;
  const car = osc(ctx, 'sine', f, t, end), mod = osc(ctx, 'sine', f, t, end);
  const md = g(ctx, 0); env(md.gain, t, 0.001, f * 0.9, 0.035, end); mod.connect(md); md.connect(car.frequency);
  const a = g(ctx, 0); env(a.gain, t, 0.003, amp, o.tau || 0.38, end); car.connect(a); a.connect(out);
  const tine = osc(ctx, 'sine', f * 5.4, t, end); const at = g(ctx, 0); env(at.gain, t, 0.001, amp * 0.22, 0.03, end); tine.connect(at); at.connect(out);
  const oct = osc(ctx, 'sine', f * 2, t, end); const ao = g(ctx, 0); env(ao.gain, t, 0.002, amp * 0.12, 0.2, end); oct.connect(ao); ao.connect(out);
}
function harp(ctx, out, t, f, amp = 1, o = {}) {
  const dur = o.dur || 2.4, end = t + dur;
  for (let n = 1; n <= 7; n++) {
    if (f * n > 12000) break;
    const p = osc(ctx, n % 2 ? 'sine' : 'triangle', f * n * (1 + (n - 1) * 0.0007), t, end);
    const a = g(ctx, 0); env(a.gain, t, 0.004, amp / Math.pow(n, 1.35), 1.1 / Math.pow(n, 0.75), end);
    p.connect(a); a.connect(out);
  }
  const click = noise(ctx, t, t + 0.02, 1); const cf = filt(ctx, 'bandpass', Math.min(8000, f * 4), 2); const ca = g(ctx, 0); env(ca.gain, t, 0.001, amp * 0.15, 0.004, t + 0.02);
  chain(click, cf, ca, out);
}
function pluckBass(ctx, out, t, f, amp = 1) {
  const end = t + 1.6;
  const s = osc(ctx, 'sine', f, t, end), s2 = osc(ctx, 'sine', f * 2, t, end), tr = osc(ctx, 'triangle', f * 3, t, end);
  const a = g(ctx, 0); env(a.gain, t, 0.008, amp, 0.45, end);
  const a2 = g(ctx, 0); env(a2.gain, t, 0.006, amp * 0.45, 0.3, end);
  const a3 = g(ctx, 0); env(a3.gain, t, 0.004, amp * 0.18, 0.12, end);
  const lp = filt(ctx, 'lowpass', 1100, 0.6);
  s.connect(a); s2.connect(a2); tr.connect(a3); a.connect(lp); a2.connect(lp); a3.connect(lp); lp.connect(out);
}
function pad(ctx, out, t, freqs, dur, amp = 1) {
  const end = t + dur;
  const lp = filt(ctx, 'lowpass', 1500, 0.4);
  const lfo = osc(ctx, 'sine', 0.13, t, end); const lg = g(ctx, 420); lfo.connect(lg); lg.connect(lp.frequency);
  const vca = g(ctx, 0);
  vca.gain.setValueAtTime(0.0001, t); vca.gain.linearRampToValueAtTime(amp, t + 0.9);
  vca.gain.setValueAtTime(amp, end - 2.2); vca.gain.linearRampToValueAtTime(0, end);
  const L = ctx.createStereoPanner(), R = ctx.createStereoPanner(); L.pan.value = -0.55; R.pan.value = 0.55;
  freqs.forEach((f) => {
    [-8, 7].forEach((det, k) => { const o = osc(ctx, 'sawtooth', f, t, end, det + (Math.random() - 0.5) * 3); const og = g(ctx, 0.16); o.connect(og); og.connect(k ? R : L); });
    const tri = osc(ctx, 'triangle', f, t, end); const tg = g(ctx, 0.2); tri.connect(tg); tg.connect(L); tg.connect(R);
  });
  L.connect(lp); R.connect(lp); lp.connect(vca); vca.connect(out);
}

// ---------------------------------------------------------------- Bibliothek
// Musik-Samples (werden per playbackRate transponiert)
export const CHORDS = {
  maj7: [0, 4, 7, 11], min7: [0, 3, 7, 10], add9: [0, 4, 7, 14], sus2: [0, 2, 7, 12], maj: [0, 4, 7, 12], min: [0, 3, 7, 12], six: [0, 4, 7, 9],
};
export async function renderMusic(onProgress) {
  const out = { pad: {}, inst: {}, perc: {} };
  const root = 48; // C3
  const jobs = [];
  for (const [q, iv] of Object.entries(CHORDS)) {
    const fr = [mtof(root), mtof(root + 12 + iv[1]), mtof(root + 12 + iv[2]), mtof(root + 12 + iv[3])];
    jobs.push(render(6.5, 2, (c, o, t) => pad(c, o, t, fr, 6.4, 0.5), { wet: 0.35, decay: 2.4, sr: 24000, peak: 0.5 }).then(b => { out.pad[q] = b; }));
  }
  // Instrument-Samples je Oktave (C4, C5, C6)
  for (const oc of [60, 72, 84]) {
    jobs.push(render(2.6, 2, (c, o, t) => kalimba(c, o, t, mtof(oc)), { wet: 0.25, decay: 1.8, sr: 32000 }).then(b => { out.inst['kalimba' + oc] = b; }));
    jobs.push(render(3.0, 2, (c, o, t) => bell(c, o, t, mtof(oc), 1, { dur: 2.8 }), { wet: 0.3, decay: 2.0, sr: 32000 }).then(b => { out.inst['bell' + oc] = b; }));
    jobs.push(render(3.0, 2, (c, o, t) => harp(c, o, t, mtof(oc), 1, { dur: 2.8 }), { wet: 0.28, decay: 2.0, sr: 32000 }).then(b => { out.inst['harp' + oc] = b; }));
  }
  jobs.push(render(1.8, 1, (c, o, t) => pluckBass(c, o, t, mtof(48)), { sr: 32000, hp: 60 }).then(b => { out.inst.bass48 = b; }));
  // Percussion
  for (let v = 0; v < 3; v++) {
    jobs.push(render(0.25, 1, (c, o, t) => {
      const n = noise(c, t, t + 0.2, 1 + v * 0.1); const bp = filt(c, 'bandpass', 6500 + v * 700, 1.2); const a = g(c, 0); env(a.gain, t, 0.004 + v * 0.002, 0.8, 0.035, t + 0.2); chain(n, bp, a, o);
    }, { peak: 0.5 }).then(b => { out.perc['shaker' + v] = b; }));
    jobs.push(render(0.35, 1, (c, o, t) => {
      const s = osc(c, 'sine', 820 + v * 60, t, t + 0.3); s.frequency.exponentialRampToValueAtTime(560, t + 0.05); const a = g(c, 0); env(a.gain, t, 0.001, 0.9, 0.035, t + 0.3); chain(s, a, o);
      const n = noise(c, t, t + 0.02); const hp = filt(c, 'highpass', 3000); const na = g(c, 0); env(na.gain, t, 0.001, 0.4, 0.004, t + 0.02); chain(n, hp, na, o);
    }, { wet: 0.2, peak: 0.55 }).then(b => { out.perc['wood' + v] = b; }));
  }
  let done = 0; jobs.forEach(j => j.then(() => onProgress && onProgress(++done / jobs.length)));
  await Promise.all(jobs);
  return out;
}

// Sammel-Pling: Transient + Körper (FM-Glocke) + Schimmer, pro Skalenstufe vorgerendert
const PENTA = [0, 2, 4, 7, 9];
export function degreeToSemi(d) { return PENTA[((d % 5) + 5) % 5] + 12 * Math.floor(d / 5); }
export async function renderSfx(onProgress) {
  const S = {};
  const jobs = [];
  const add = (name, dur, ch, fn, o) => jobs.push(render(dur, ch, fn, o).then(b => { (S[name] || (S[name] = [])).push(b); }));
  // Pling-Leiter (C5-Pentatonik, 12 Stufen, je 2 Varianten)
  for (let d = 0; d < 12; d++) for (let v = 0; v < 2; v++) {
    const f = mtof(72 + degreeToSemi(d));
    add('pling' + d, 1.6, 2, (c, o, t) => {
      const n = noise(c, t, t + 0.015); const hp = filt(c, 'highpass', 4000); const na = g(c, 0); env(na.gain, t, 0.0005, 0.35, 0.003, t + 0.015); chain(n, hp, na, o);
      bell(c, o, t, f, 0.9, { ratio: v ? 3.5 : 2.0, index: v ? 1.6 : 2.4, tau: 0.42, dur: 1.5 });
      const sh = osc(c, 'sine', f * 2, t, t + 1.5); const sv = osc(c, 'sine', 5.5, t, t + 1.5); const svg = g(c, f * 0.004); sv.connect(svg); svg.connect(sh.frequency);
      const sa = g(c, 0); env(sa.gain, t + 0.02, 0.05, 0.16, 0.35, t + 1.5); chain(sh, sa, o);
    }, { wet: 0.32, decay: 1.6, peak: 0.7 });
  }
  // Ring: Luftzug + Akkord-Glöckchen
  for (let v = 0; v < 3; v++) add('ring', 1.4, 2, (c, o, t) => {
    const n = noise(c, t, t + 0.6); const bp = filt(c, 'bandpass', 800, 1.4); bp.frequency.setValueAtTime(600 + v * 100, t); bp.frequency.exponentialRampToValueAtTime(3200, t + 0.35);
    const a = g(c, 0); env(a.gain, t, 0.12, 0.6, 0.12, t + 0.6); chain(n, bp, a, o);
    [0, 4, 7].forEach((s, i) => bell(c, o, t + 0.05 + i * 0.025, mtof(79 + s + v * 2), 0.4, { ratio: 3.5, tau: 0.35, dur: 1.2 }));
  }, { wet: 0.3 });
  // Looping: Wusch-Schwelle + Glitzer-Glissando
  for (let v = 0; v < 2; v++) add('loop', 1.9, 2, (c, o, t) => {
    const n = noise(c, t, t + 1.5); const bp = filt(c, 'bandpass', 500, 2.5);
    bp.frequency.setValueAtTime(400, t); bp.frequency.exponentialRampToValueAtTime(2400 + v * 300, t + 0.65); bp.frequency.exponentialRampToValueAtTime(500, t + 1.35);
    const a = g(c, 0); a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(0.9, t + 0.6); a.gain.linearRampToValueAtTime(0, t + 1.4);
    const am = osc(c, 'sine', 16, t, t + 1.5); const amg = g(c, 0.3); am.connect(amg); amg.connect(a.gain);
    const p = c.createStereoPanner(); p.pan.setValueAtTime(-0.6, t); p.pan.linearRampToValueAtTime(0.6, t + 1.3);
    chain(n, bp, a, p, o);
    for (let i = 0; i < 6; i++) bell(c, o, t + 0.45 + i * 0.06, mtof(84 + degreeToSemi(i + v)), 0.22, { tau: 0.25, dur: 1.0 });
  }, { wet: 0.35 });
  // Schraube: wirbelnder Luftzug
  for (let v = 0; v < 2; v++) add('roll', 1.5, 2, (c, o, t) => {
    const n = noise(c, t, t + 1.2); const bp = filt(c, 'bandpass', 1200, 3);
    const lfo = osc(c, 'sine', 7 + v, t, t + 1.2); const lg = g(c, 700); lfo.connect(lg); lg.connect(bp.frequency);
    const a = g(c, 0); a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(0.8, t + 0.3); a.gain.linearRampToValueAtTime(0, t + 1.1);
    const p = c.createStereoPanner(); const pl = osc(c, 'sine', 3.5, t, t + 1.2); const pg = g(c, 0.8); pl.connect(pg); pg.connect(p.pan);
    chain(n, bp, a, p, o);
    [0, 4, 7, 12].forEach((s, i) => kalimba(c, o, t + 0.8 + i * 0.05, mtof(79 + s), 0.25, { dur: 0.7 }));
  }, { wet: 0.3 });
  // Landen: weicher Plopp + Rascheln + Glöckchen
  for (let v = 0; v < 3; v++) add('land', 1.2, 2, (c, o, t) => {
    const s = osc(c, 'sine', 240 - v * 15, t, t + 0.25); s.frequency.exponentialRampToValueAtTime(130, t + 0.12); const a = g(c, 0); env(a.gain, t, 0.004, 0.8, 0.05, t + 0.25); chain(s, a, o);
    for (let k = 0; k < 4; k++) { const n = noise(c, t + k * 0.03, t + k * 0.03 + 0.06); const hp = filt(c, 'highpass', 2500 + k * 500); const na = g(c, 0); env(na.gain, t + k * 0.03, 0.002, 0.25, 0.012, t + k * 0.03 + 0.06); chain(n, hp, na, o); }
    bell(c, o, t + 0.06, mtof(88 + v * 2), 0.25, { tau: 0.3, dur: 0.9 });
  }, { wet: 0.25 });
  // Abheben: Flattern + Aufwärts-Zwitschern
  for (let v = 0; v < 2; v++) add('takeoff', 0.9, 2, (c, o, t) => {
    const n = noise(c, t, t + 0.5); const bp = filt(c, 'bandpass', 1500, 1.5); const a = g(c, 0); env(a.gain, t, 0.02, 0.6, 0.15, t + 0.5);
    const am = osc(c, 'square', 20 + v * 3, t, t + 0.5); const amg = g(c, 0.5); am.connect(amg); amg.connect(a.gain); chain(n, bp, a, o);
    const s = osc(c, 'sine', 700, t, t + 0.4); s.frequency.exponentialRampToValueAtTime(1500, t + 0.25); const sa = g(c, 0); env(sa.gain, t, 0.01, 0.2, 0.08, t + 0.4); chain(s, sa, o);
  }, { wet: 0.2 });
  // Boing (Wespe schubst – lustig, nicht erschreckend)
  for (let v = 0; v < 3; v++) add('boing', 0.9, 2, (c, o, t) => {
    const s = osc(c, 'sine', 330 + v * 30, t, t + 0.7); s.frequency.linearRampToValueAtTime(520 + v * 40, t + 0.08); s.frequency.linearRampToValueAtTime(380, t + 0.6);
    const vib = osc(c, 'sine', 14, t, t + 0.7); const vg = g(c, 60); vg.gain.setTargetAtTime(0, t + 0.05, 0.2); vib.connect(vg); vg.connect(s.frequency);
    const a = g(c, 0); env(a.gain, t, 0.005, 0.8, 0.2, t + 0.7); chain(s, a, o);
    const bz = osc(c, 'sawtooth', 190 + v * 10, t, t + 0.25); const bl = filt(c, 'lowpass', 1200); const ba = g(c, 0); env(ba.gain, t, 0.01, 0.2, 0.06, t + 0.25); chain(bz, bl, ba, o);
  }, { wet: 0.15 });
  // Windböe
  add('gust', 2.8, 2, (c, o, t) => {
    const n = noise(c, t, t + 2.6); const lp = filt(c, 'lowpass', 400, 0.8); lp.frequency.setValueAtTime(350, t); lp.frequency.exponentialRampToValueAtTime(1900, t + 1.1); lp.frequency.exponentialRampToValueAtTime(450, t + 2.5);
    const a = g(c, 0); a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(0.9, t + 0.9); a.gain.linearRampToValueAtTime(0, t + 2.6);
    const p = c.createStereoPanner(); p.pan.setValueAtTime(-0.7, t); p.pan.linearRampToValueAtTime(0.7, t + 2.5);
    chain(n, lp, a, p, o);
  }, { wet: 0.2 });
  // Platsch (Regen)
  add('splash', 1.0, 2, (c, o, t) => {
    for (let k = 0; k < 7; k++) { const tt = t + k * 0.06 + Math.random() * 0.03; const s = osc(c, 'sine', 1400 + Math.random() * 900, tt, tt + 0.1); s.frequency.exponentialRampToValueAtTime(500, tt + 0.07); const a = g(c, 0); env(a.gain, tt, 0.002, 0.4, 0.02, tt + 0.1); chain(s, a, o); }
    const n = noise(c, t, t + 0.5); const hp = filt(c, 'highpass', 3000); const na = g(c, 0); env(na.gain, t, 0.01, 0.3, 0.12, t + 0.5); chain(n, hp, na, o);
  }, { wet: 0.25 });
  // Pflücken, Schlürfen, Tierchen-"Uii"
  add('pick', 0.9, 2, (c, o, t) => {
    const s = osc(c, 'sine', 500, t, t + 0.12); s.frequency.exponentialRampToValueAtTime(1100, t + 0.05); const a = g(c, 0); env(a.gain, t, 0.002, 0.7, 0.03, t + 0.12); chain(s, a, o);
    kalimba(c, o, t + 0.06, mtof(84), 0.5, { dur: 0.7 });
  }, { wet: 0.25 });
  for (let v = 0; v < 3; v++) add('aww', 0.9, 2, (c, o, t) => {
    const s = osc(c, 'sawtooth', 380 + v * 50, t, t + 0.5); s.frequency.linearRampToValueAtTime(620 + v * 60, t + 0.28); s.frequency.linearRampToValueAtTime(560 + v * 50, t + 0.45);
    const f1 = filt(c, 'bandpass', 800, 5), f2 = filt(c, 'bandpass', 2300, 6);
    const a = g(c, 0); env(a.gain, t, 0.04, 0.9, 0.15, t + 0.5);
    s.connect(f1); s.connect(f2); f1.connect(a); f2.connect(a); a.connect(o);
  }, { wet: 0.2 });
  // Glitzerstern: magische Aufwärts-Kaskade
  add('glitter', 2.4, 2, (c, o, t) => {
    for (let i = 0; i < 10; i++) bell(c, o, t + i * 0.055, mtof(79 + degreeToSemi(i)), 0.3, { tau: 0.4, dur: 1.6 });
    const n = noise(c, t, t + 1.2); const hp = filt(c, 'highpass', 7000); const a = g(c, 0); env(a.gain, t, 0.3, 0.2, 0.3, t + 1.2); chain(n, hp, a, o);
  }, { wet: 0.4 });
  // Fanfare (Levelende) – Harfe + Glocken + Pad-Schwelle
  add('fanfare', 4.2, 2, (c, o, t) => {
    const seq = [0, 4, 7, 12, 16, 19, 24];
    seq.forEach((s, i) => harp(c, o, t + i * 0.07, mtof(60 + s), 0.35, { dur: 2.6 }));
    [[0, 4, 7], [5, 9, 12], [7, 11, 14], [12, 16, 19]].forEach((ch, k) => ch.forEach((s) => bell(c, o, t + 0.55 + k * 0.32, mtof(72 + s), 0.28, { tau: 0.6, dur: 2.2 })));
    pad(c, o, t + 0.5, [mtof(60), mtof(64), mtof(67), mtof(72)], 3.6, 0.5);
  }, { wet: 0.35, peak: 0.8 });
  // Sterne auf der Ergebnis-Karte
  for (let k = 0; k < 3; k++) add('star' + k, 1.8, 2, (c, o, t) => {
    [0, 7, 12].forEach((s, i) => bell(c, o, t + i * 0.04, mtof(76 + k * 4 + s), 0.5, { tau: 0.5, dur: 1.6 }));
    const n = noise(c, t, t + 0.4); const hp = filt(c, 'highpass', 6000); const a = g(c, 0); env(a.gain, t, 0.05, 0.2, 0.1, t + 0.4); chain(n, hp, a, o);
  }, { wet: 0.35 });
  // Freischaltung
  add('unlock', 2.4, 2, (c, o, t) => {
    [[0, 4, 7], [5, 9, 12, 16]].forEach((ch, k) => ch.forEach(s => harp(c, o, t + k * 0.28, mtof(67 + s), 0.35, { dur: 2 })));
    for (let i = 0; i < 8; i++) bell(c, o, t + 0.5 + i * 0.05, mtof(91 + degreeToSemi(i % 5)), 0.15, { tau: 0.3, dur: 1.2 });
  }, { wet: 0.35 });
  // Zählen, Los!, Oh-oh
  for (let v = 0; v < 2; v++) add('tick', 0.5, 2, (c, o, t) => { const s = osc(c, 'sine', 1250 + v * 40, t, t + 0.2); const a = g(c, 0); env(a.gain, t, 0.001, 0.6, 0.03, t + 0.2); chain(s, a, o); kalimba(c, o, t, mtof(84), 0.3, { dur: 0.4 }); }, { wet: 0.2 });
  add('go', 1.6, 2, (c, o, t) => { [0, 4, 7, 12].forEach(s => bell(c, o, t, mtof(72 + s), 0.35, { tau: 0.45, dur: 1.4 })); }, { wet: 0.3 });
  add('fail', 1.6, 2, (c, o, t) => { kalimba(c, o, t, mtof(72), 0.6, { dur: 0.9 }); kalimba(c, o, t + 0.22, mtof(67), 0.6, { dur: 1.2 }); }, { wet: 0.3 });
  // UI
  for (let v = 0; v < 3; v++) add('tap', 0.4, 2, (c, o, t) => {
    const s = osc(c, 'sine', 620 + v * 70, t, t + 0.15); s.frequency.exponentialRampToValueAtTime(980 + v * 90, t + 0.04); const a = g(c, 0); env(a.gain, t, 0.002, 0.8, 0.03, t + 0.15); chain(s, a, o);
    const n = noise(c, t, t + 0.01); const hp = filt(c, 'highpass', 5000); const na = g(c, 0); env(na.gain, t, 0.0005, 0.2, 0.002, t + 0.01); chain(n, hp, na, o);
  }, { wet: 0.12, peak: 0.6 });
  add('back', 0.4, 2, (c, o, t) => { const s = osc(c, 'sine', 900, t, t + 0.15); s.frequency.exponentialRampToValueAtTime(520, t + 0.06); const a = g(c, 0); env(a.gain, t, 0.002, 0.8, 0.03, t + 0.15); chain(s, a, o); }, { wet: 0.12, peak: 0.6 });
  add('combo', 1.4, 2, (c, o, t) => { [0, 2, 4, 5, 7].forEach((d, i) => kalimba(c, o, t + i * 0.045, mtof(84 + degreeToSemi(d)), 0.35, { dur: 0.8 })); }, { wet: 0.3 });
  add('sip', 0.9, 2, (c, o, t) => { for (let k = 0; k < 4; k++) { const tt = t + k * 0.12; const s = osc(c, 'sine', 380, tt, tt + 0.1); s.frequency.exponentialRampToValueAtTime(900, tt + 0.07); const a = g(c, 0); env(a.gain, tt, 0.004, 0.5, 0.025, tt + 0.1); chain(s, a, o); } }, { wet: 0.2 });
  // Pups-Wölkchen (v2.2): kurzes, lustiges „Pfrrt“ – flatternder tiefer Ton + Luft, weich gefiltert, mit Plopp am Ende
  for (let v = 0; v < 3; v++) add('pups', 0.8, 2, (c, o, t) => {
    const len = 0.32 + v * 0.08, f0 = 150 - v * 18;
    const s = osc(c, 'sawtooth', f0, t, t + len + 0.05); s.frequency.setValueAtTime(f0, t); s.frequency.exponentialRampToValueAtTime(f0 * 0.62, t + len);
    const fl = osc(c, 'square', 26 + v * 4, t, t + len + 0.05); const fg = g(c, 0.45); fl.connect(fg);
    const lp = filt(c, 'lowpass', 900, 1.2); lp.frequency.setValueAtTime(1100, t); lp.frequency.exponentialRampToValueAtTime(380, t + len);
    const a = g(c, 0); env(a.gain, t, 0.015, 0.8, len * 0.45, t + len + 0.05, 0.25); fg.connect(a.gain);
    chain(s, lp, a, o);
    const n = noise(c, t, t + len); const bp = filt(c, 'bandpass', 520, 1.1); const na = g(c, 0); env(na.gain, t, 0.01, 0.25, len * 0.4, t + len); chain(n, bp, na, o);
    const pl = osc(c, 'sine', 520, t + len, t + len + 0.12); pl.frequency.exponentialRampToValueAtTime(900, t + len + 0.06); const pa = g(c, 0); env(pa.gain, t + len, 0.003, 0.3, 0.03, t + len + 0.12); chain(pl, pa, o);
  }, { wet: 0.12, peak: 0.65 });
  // Quietsch-Hupe (v2.2): „Tröt-tröt“ (Fahrradhupe) bzw. Quietsche-Ente
  for (let v = 0; v < 2; v++) add('hupe', 0.9, 2, (c, o, t) => {
    if (v === 0) {
      [0, 0.2].forEach((dt, k) => {
        const t0 = t + dt, f = k ? 392 : 440;
        const s = osc(c, 'square', f, t0, t0 + 0.17); s.frequency.setValueAtTime(f * 1.04, t0); s.frequency.exponentialRampToValueAtTime(f * 0.96, t0 + 0.16);
        const s2 = osc(c, 'sawtooth', f * 1.5, t0, t0 + 0.17);
        const bp = filt(c, 'bandpass', 1300, 2.2), a = g(c, 0); env(a.gain, t0, 0.01, 0.7, 0.08, t0 + 0.17, 0.5);
        s.connect(bp); s2.connect(bp); chain(bp, a, o);
      });
    } else {
      [0, 0.18].forEach((dt) => {
        const t0 = t + dt, s = osc(c, 'sine', 900, t0, t0 + 0.15);
        s.frequency.setValueAtTime(950, t0); s.frequency.linearRampToValueAtTime(1500, t0 + 0.05); s.frequency.linearRampToValueAtTime(1150, t0 + 0.14);
        const s2 = osc(c, 'triangle', 1900, t0, t0 + 0.15); s2.frequency.linearRampToValueAtTime(2900, t0 + 0.05); s2.frequency.linearRampToValueAtTime(2300, t0 + 0.14);
        const a = g(c, 0); env(a.gain, t0, 0.008, 0.7, 0.06, t0 + 0.15, 0.4); const a2 = g(c, 0); env(a2.gain, t0, 0.008, 0.18, 0.05, t0 + 0.15);
        chain(s, a, o); chain(s2, a2, o);
      });
    }
  }, { wet: 0.15, peak: 0.6 });
  // ---- v2.3: Klänge der Zufalls-Einlagen (🎪) und der Wiesen-Bewohner – kurz, weich, ohne Dauer-Loops
  // Zauber-Start: Glitzer-Arpeggio aufwärts + Luft-Schwelle
  for (let v = 0; v < 2; v++) add('zauber', 1.5, 2, (c, o, t) => {
    [0, 2, 4, 7, 9, 12].forEach((d, i) => bell(c, o, t + i * 0.045, mtof(79 + v * 2 + degreeToSemi(d % 5) + (d >= 12 ? 12 : 0)), 0.26, { tau: 0.3, dur: 1.1 }));
    const n = noise(c, t, t + 0.7); const bp = filt(c, 'bandpass', 2500, 1.2); bp.frequency.setValueAtTime(1200, t); bp.frequency.exponentialRampToValueAtTime(6000, t + 0.4);
    const a = g(c, 0); env(a.gain, t, 0.15, 0.35, 0.12, t + 0.7); chain(n, bp, a, o);
  }, { wet: 0.35 });
  // Wusch: schneller Luftzug mit Stereo-Wischer
  for (let v = 0; v < 3; v++) add('swoosh', 0.9, 2, (c, o, t) => {
    const n = noise(c, t, t + 0.6); const bp = filt(c, 'bandpass', 700, 2);
    bp.frequency.setValueAtTime(500 + v * 120, t); bp.frequency.exponentialRampToValueAtTime(3000 + v * 400, t + 0.22); bp.frequency.exponentialRampToValueAtTime(700, t + 0.55);
    const a = g(c, 0); a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(0.9, t + 0.18); a.gain.linearRampToValueAtTime(0, t + 0.55);
    const p = c.createStereoPanner(); p.pan.setValueAtTime(v % 2 ? 0.7 : -0.7, t); p.pan.linearRampToValueAtTime(v % 2 ? -0.7 : 0.7, t + 0.5);
    chain(n, bp, a, p, o);
  }, { wet: 0.25 });
  // Rakete: Pfeifen steigt, Zischen, kleiner Knall am Ende
  add('rakete', 1.9, 2, (c, o, t) => {
    const s = osc(c, 'sine', 500, t, t + 1.3); s.frequency.exponentialRampToValueAtTime(2600, t + 1.25);
    const vb = osc(c, 'sine', 9, t, t + 1.3); const vg = g(c, 25); vb.connect(vg); vg.connect(s.frequency);
    const a = g(c, 0); env(a.gain, t, 0.08, 0.3, 0.8, t + 1.3, 0.25); chain(s, a, o);
    const n = noise(c, t, t + 1.3); const hp = filt(c, 'highpass', 3000); const na = g(c, 0); env(na.gain, t, 0.05, 0.3, 0.5, t + 1.3, 0.15); chain(n, hp, na, o);
    const k = noise(c, t + 1.3, t + 1.45); const kl = filt(c, 'lowpass', 2500); const ka = g(c, 0); env(ka.gain, t + 1.3, 0.002, 0.9, 0.04, t + 1.45); chain(k, kl, ka, o);
    [0, 4, 7].forEach((d, i) => bell(c, o, t + 1.34 + i * 0.03, mtof(84 + d), 0.25, { tau: 0.35, dur: 0.5 }));
  }, { wet: 0.3 });
  // Konfetti-Plopp (Knallbonbon)
  for (let v = 0; v < 3; v++) add('pop', 0.6, 2, (c, o, t) => {
    const n = noise(c, t, t + 0.08); const bp = filt(c, 'bandpass', 1800 + v * 400, 0.9); const na = g(c, 0); env(na.gain, t, 0.001, 0.9, 0.018, t + 0.08); chain(n, bp, na, o);
    const s = osc(c, 'sine', 420 + v * 60, t, t + 0.2); s.frequency.exponentialRampToValueAtTime(160, t + 0.12); const a = g(c, 0); env(a.gain, t, 0.002, 0.6, 0.04, t + 0.2); chain(s, a, o);
    for (let k = 0; k < 4; k++) { const tt = t + 0.06 + k * 0.05 + Math.random() * 0.02; kalimba(c, o, tt, mtof(88 + degreeToSemi(k + v)), 0.12, { dur: 0.35 }); }
  }, { wet: 0.2 });
  // Blubb (Seifenblasen)
  for (let v = 0; v < 2; v++) add('blubb', 0.9, 2, (c, o, t) => {
    for (let k = 0; k < 4; k++) {
      const tt = t + k * 0.11 + v * 0.02, f = 320 + k * 70 + v * 40;
      const s = osc(c, 'sine', f, tt, tt + 0.12); s.frequency.exponentialRampToValueAtTime(f * 2.4, tt + 0.09);
      const a = g(c, 0); env(a.gain, tt, 0.004, 0.55, 0.03, tt + 0.12); chain(s, a, o);
    }
  }, { wet: 0.25 });
  // Wackel-Boing: federndes „boi-oi-oing“
  for (let v = 0; v < 2; v++) add('wackel', 1.0, 2, (c, o, t) => {
    const s = osc(c, 'triangle', 260 + v * 40, t, t + 0.8); s.frequency.linearRampToValueAtTime(420 + v * 50, t + 0.06);
    const vib = osc(c, 'sine', 11 - v * 2, t, t + 0.8); const vg = g(c, 90); vg.gain.setTargetAtTime(8, t + 0.05, 0.25); vib.connect(vg); vg.connect(s.frequency);
    const a = g(c, 0); env(a.gain, t, 0.005, 0.8, 0.25, t + 0.8); chain(s, a, o);
    const s2 = osc(c, 'sine', 520 + v * 80, t, t + 0.5); const a2 = g(c, 0); env(a2.gain, t, 0.004, 0.25, 0.12, t + 0.5); chain(s2, a2, o);
  }, { wet: 0.15 });
  // Funkeln: helle Glöckchen-Tupfer (Sternenring, Halo)
  for (let v = 0; v < 2; v++) add('funkel', 1.4, 2, (c, o, t) => {
    for (let i = 0; i < 7; i++) bell(c, o, t + i * 0.07 + (i % 2) * 0.015, mtof(91 + degreeToSemi((i * 3 + v) % 7)), 0.16, { tau: 0.25, dur: 0.9, ratio: 3.5 });
    const n = noise(c, t, t + 0.8); const hp = filt(c, 'highpass', 8000); const a = g(c, 0); env(a.gain, t, 0.1, 0.15, 0.25, t + 0.8); chain(n, hp, a, o);
  }, { wet: 0.4 });
  // Wiesen-Leben: leises Bienen-Summen (einzelner, weich gefilterter Ton ohne Schwebung, kein Loop)
  for (let v = 0; v < 2; v++) add('summ', 1.2, 2, (c, o, t) => {
    const f = 205 + v * 22;
    const s = osc(c, 'sawtooth', f, t, t + 1.1); s.frequency.setValueAtTime(f, t); s.frequency.linearRampToValueAtTime(f * (v ? 0.94 : 1.06), t + 1.0);
    const lp = filt(c, 'lowpass', 850, 0.8); const bp = filt(c, 'highpass', 160);
    const a = g(c, 0); a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(0.5, t + 0.25); a.gain.setValueAtTime(0.5, t + 0.7); a.gain.linearRampToValueAtTime(0, t + 1.08);
    const p = c.createStereoPanner(); p.pan.setValueAtTime(v ? 0.4 : -0.4, t); p.pan.linearRampToValueAtTime(v ? -0.3 : 0.3, t + 1.0);
    chain(s, lp, bp, a, p, o);
  }, { wet: 0.15, peak: 0.5 });
  // Fisch-Platscher: Plopp + Tropfen
  add('platsch', 1.0, 2, (c, o, t) => {
    const s = osc(c, 'sine', 380, t, t + 0.18); s.frequency.exponentialRampToValueAtTime(120, t + 0.14); const a = g(c, 0); env(a.gain, t, 0.003, 0.8, 0.05, t + 0.18); chain(s, a, o);
    const n = noise(c, t, t + 0.35); const bp = filt(c, 'bandpass', 1400, 0.8); const na = g(c, 0); env(na.gain, t, 0.005, 0.45, 0.08, t + 0.35); chain(n, bp, na, o);
    for (let k = 0; k < 4; k++) { const tt = t + 0.12 + k * 0.07; const d = osc(c, 'sine', 900 + k * 180, tt, tt + 0.08); d.frequency.exponentialRampToValueAtTime(1600 + k * 200, tt + 0.05); const da = g(c, 0); env(da.gain, tt, 0.002, 0.25, 0.02, tt + 0.08); chain(d, da, o); }
  }, { wet: 0.25 });
  // ---- v2.4: Sieger-Einlagen – Trommelwirbel (Anlauf), Feuerwerks-Knall mit Knistern, Zeitlupen-„Wuuum“
  add('trommel', 1.6, 2, (c, o, t) => {
    for (let k = 0; k < 22; k++) {
      const tt = t + k * 0.045, v = 0.25 + 0.75 * (k / 21) * (k / 21);
      const n = noise(c, tt, tt + 0.05); const bp = filt(c, 'bandpass', 1900, 0.9); const a = g(c, 0); env(a.gain, tt, 0.001, v * 0.55, 0.018, tt + 0.05); chain(n, bp, a, o);
      const s = osc(c, 'triangle', 190, tt, tt + 0.06); const sa = g(c, 0); env(sa.gain, tt, 0.001, v * 0.25, 0.02, tt + 0.06); chain(s, sa, o);
    }
    const te = t + 1.0; const b = osc(c, 'sine', 150, te, te + 0.35); b.frequency.exponentialRampToValueAtTime(70, te + 0.25);
    const ba = g(c, 0); env(ba.gain, te, 0.002, 0.9, 0.09, te + 0.35); chain(b, ba, o);
    const cy = noise(c, te, te + 0.5); const hp = filt(c, 'highpass', 6500); const ca = g(c, 0); env(ca.gain, te, 0.002, 0.35, 0.15, te + 0.5); chain(cy, hp, ca, o);
  }, { wet: 0.25 });
  for (let v = 0; v < 2; v++) add('knall', 1.8, 2, (c, o, t) => {
    const b = osc(c, 'sine', 110 - v * 15, t, t + 0.5); b.frequency.exponentialRampToValueAtTime(42, t + 0.4);
    const ba = g(c, 0); env(ba.gain, t, 0.002, 0.8, 0.12, t + 0.5); chain(b, ba, o);
    const n = noise(c, t, t + 0.7); const lp = filt(c, 'lowpass', 1400); lp.frequency.setValueAtTime(2400, t); lp.frequency.exponentialRampToValueAtTime(300, t + 0.6);
    const na = g(c, 0); env(na.gain, t, 0.002, 0.7, 0.14, t + 0.7); chain(n, lp, na, o);
    for (let k = 0; k < 14; k++) { // Knistern (Sternchen verglühen)
      const tt = t + 0.25 + k * 0.06 + ((k * 37 + v * 11) % 7) * 0.008;
      const cn = noise(c, tt, tt + 0.012); const hp = filt(c, 'highpass', 3500 + (k % 3) * 1500); const cg = g(c, 0); env(cg.gain, tt, 0.0005, 0.3 * (1 - k / 16), 0.004, tt + 0.012); chain(cn, hp, cg, o);
    }
    [0, 4, 7, 12].forEach((d, i) => bell(c, o, t + 0.08 + i * 0.05, mtof(86 + d + v * 2), 0.14, { tau: 0.4, dur: 1.0 }));
  }, { wet: 0.4 });
  add('zeitlupe', 1.4, 2, (c, o, t) => {
    const s = osc(c, 'sine', 620, t, t + 0.9); s.frequency.exponentialRampToValueAtTime(170, t + 0.75);
    const s2 = osc(c, 'triangle', 930, t, t + 0.9); s2.frequency.exponentialRampToValueAtTime(255, t + 0.75);
    const a = g(c, 0); a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(0.5, t + 0.12); a.gain.linearRampToValueAtTime(0, t + 0.85);
    const a2 = g(c, 0.12); chain(s, a, o); s2.connect(a2); a2.connect(a);
    const n = noise(c, t, t + 0.9); const bp = filt(c, 'bandpass', 2400, 1.5); bp.frequency.setValueAtTime(3200, t); bp.frequency.exponentialRampToValueAtTime(500, t + 0.8);
    const na = g(c, 0); na.gain.setValueAtTime(0, t); na.gain.linearRampToValueAtTime(0.35, t + 0.15); na.gain.linearRampToValueAtTime(0, t + 0.85); chain(n, bp, na, o);
  }, { wet: 0.45 });
  // ---- v3.0: Flugshow-Clip – eigener Beat (Bausteine, zur Laufzeit im Takt geplant: js/game/fancam.js)
  add('bkick', 0.5, 1, (c, o, t) => { // Bassdrum: Sinus mit Tonhöhen-Fall + Klick
    const s = osc(c, 'sine', 160, t, t + 0.45); s.frequency.setValueAtTime(160, t); s.frequency.exponentialRampToValueAtTime(52, t + 0.12);
    const a = g(c, 0); env(a.gain, t, 0.002, 1, 0.13, t + 0.45); chain(s, a, o);
    const k = noise(c, t, t + 0.012); const kf = filt(c, 'highpass', 2500); const ka = g(c, 0); env(ka.gain, t, 0.0005, 0.35, 0.004, t + 0.012); chain(k, kf, ka, o);
  }, { hp: 35, peak: 0.85 });
  add('bclap', 0.5, 2, (c, o, t) => { // Klatscher: drei schnelle Rausch-Stöße + Hallfahne
    for (let k = 0; k < 3; k++) { const tt = t + k * 0.011, n = noise(c, tt, tt + 0.03); const bp = filt(c, 'bandpass', 1300, 1.1); const a = g(c, 0); env(a.gain, tt, 0.0008, 0.8, 0.008, tt + 0.03); chain(n, bp, a, o); }
    const n = noise(c, t + 0.03, t + 0.3); const bp = filt(c, 'bandpass', 1700, 0.8); const a = g(c, 0); env(a.gain, t + 0.03, 0.002, 0.45, 0.07, t + 0.3); chain(n, bp, a, o);
  }, { wet: 0.2, peak: 0.6 });
  add('bhat', 0.12, 1, (c, o, t) => { const n = noise(c, t, t + 0.08); const hp = filt(c, 'highpass', 7500); const a = g(c, 0); env(a.gain, t, 0.0008, 0.6, 0.018, t + 0.08); chain(n, hp, a, o); }, { peak: 0.4 });
  add('bbass', 0.6, 1, (c, o, t) => { // Bass-Stoß (C3, zur Laufzeit transponiert): Sägezahn durch Tiefpass mit Hüllkurve
    const f = mtof(48), s = osc(c, 'sawtooth', f, t, t + 0.5), s2 = osc(c, 'square', f * 0.5 * 1.003, t, t + 0.5);
    const lp = filt(c, 'lowpass', 900, 4); lp.frequency.setValueAtTime(1800, t); lp.frequency.exponentialRampToValueAtTime(240, t + 0.3);
    const a = g(c, 0); env(a.gain, t, 0.004, 0.8, 0.16, t + 0.5); const a2 = g(c, 0.45); s2.connect(a2); a2.connect(lp); chain(s, lp, a, o);
  }, { hp: 60, peak: 0.6 });
  add('bpluck', 0.7, 2, (c, o, t) => { kalimba(c, o, t, mtof(72), 0.9, { dur: 0.6, tau: 0.16 }); bell(c, o, t, mtof(84), 0.18, { dur: 0.5, tau: 0.12 }); }, { wet: 0.25, peak: 0.55 });
  add('briser', 1.2, 2, (c, o, t) => { // Anlauf vor dem Drop: Rauschen + Ton steigen
    const n = noise(c, t, t + 1.1); const bp = filt(c, 'bandpass', 600, 1.4); bp.frequency.setValueAtTime(500, t); bp.frequency.exponentialRampToValueAtTime(7000, t + 1.05);
    const a = g(c, 0); a.gain.setValueAtTime(0.0001, t); a.gain.exponentialRampToValueAtTime(0.7, t + 1.0); a.gain.linearRampToValueAtTime(0, t + 1.1); chain(n, bp, a, o);
    const s = osc(c, 'triangle', 300, t, t + 1.1); s.frequency.exponentialRampToValueAtTime(1500, t + 1.05); const sa = g(c, 0); sa.gain.setValueAtTime(0.0001, t); sa.gain.exponentialRampToValueAtTime(0.18, t + 1.0); sa.gain.linearRampToValueAtTime(0, t + 1.1); chain(s, sa, o);
  }, { wet: 0.2, peak: 0.5 });
  add('bimpact', 1.4, 2, (c, o, t) => { // Drop: tiefer Bumm + heller Glitzer-Schlag
    const b = osc(c, 'sine', 120, t, t + 0.9); b.frequency.exponentialRampToValueAtTime(40, t + 0.5); const ba = g(c, 0); env(ba.gain, t, 0.002, 1, 0.22, t + 0.9); chain(b, ba, o);
    const n = noise(c, t, t + 1.2); const hp = filt(c, 'highpass', 5000); const na = g(c, 0); env(na.gain, t, 0.002, 0.35, 0.3, t + 1.2); chain(n, hp, na, o);
    [0, 4, 7, 12].forEach((d, i) => bell(c, o, t + i * 0.02, mtof(84 + d), 0.16, { tau: 0.3, dur: 0.9 }));
  }, { wet: 0.35, peak: 0.75 });
  let done = 0; jobs.forEach(j => j.then(() => onProgress && onProgress(++done / jobs.length)));
  await Promise.all(jobs);
  return S;
}

// ---------------------------------------------------------------- Ambience (Loops + Einzelrufe)
function loopify(buf, xf) {
  // Ende in den Anfang überblenden → nahtloser Loop
  const sr = buf.sampleRate, n = Math.floor(xf * sr), len = buf.length - n;
  const out = new AudioBuffer({ length: len, sampleRate: sr, numberOfChannels: buf.numberOfChannels });
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const src = buf.getChannelData(c), d = out.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = src[i];
    for (let i = 0; i < n; i++) { const k = i / n; d[i] = src[i] * Math.sqrt(k) + src[len + i] * Math.sqrt(1 - k); }
  }
  return out;
}
export async function renderAmbience(onProgress) {
  const A = {};
  const jobs = [];
  const add = (name, p) => jobs.push(p.then(b => { (A[name] || (A[name] = [])).push(b); }));
  add('wind', render(14, 2, (c, o, t) => {
    for (const [pan, ph] of [[-0.7, 0], [0.7, 1.7]]) {
      const n = noise(c, t, t + 14, 0.97 + ph * 0.02); const lp = filt(c, 'lowpass', 520, 0.5); const bp = filt(c, 'highpass', 140, 0.5);
      const lfo = osc(c, 'sine', 0.09 + ph * 0.02, t, t + 14); const lg = g(c, 260); lfo.connect(lg); lg.connect(lp.frequency);
      const a = g(c, 0.5); const al = osc(c, 'sine', 0.07 + ph * 0.03, t, t + 14); const alg = g(c, 0.25); al.connect(alg); alg.connect(a.gain);
      const p = c.createStereoPanner(); p.pan.value = pan; chain(n, bp, lp, a, p, o);
    }
  }, { sr: 32000, peak: 0.5, hp: 110 }).then(b => loopify(b, 2)));
  add('water', render(10, 2, (c, o, t) => {
    for (let k = 0; k < 40; k++) {
      const tt = t + Math.random() * 9.5, f = 500 + Math.random() * 900;
      const s = osc(c, 'sine', f, tt, tt + 0.12); s.frequency.exponentialRampToValueAtTime(f * 1.6, tt + 0.08);
      const a = g(c, 0); env(a.gain, tt, 0.01, 0.12 + Math.random() * 0.1, 0.03, tt + 0.12);
      const p = c.createStereoPanner(); p.pan.value = Math.random() * 1.6 - 0.8; chain(s, a, p, o);
    }
    const n = noise(c, t, t + 10); const bp = filt(c, 'bandpass', 900, 0.6); const a = g(c, 0.12); chain(n, bp, a, o);
  }, { sr: 32000, peak: 0.45, wet: 0.2, hp: 150 }).then(b => loopify(b, 1.5)));
  // Vogelrufe
  for (let v = 0; v < 5; v++) add('bird', render(1.4, 1, (c, o, t) => {
    const notes = 2 + v % 3;
    for (let k = 0; k < notes; k++) {
      const tt = t + k * (0.13 + v * 0.02), f0 = 2400 + v * 350 + k * 120;
      const s = osc(c, 'sine', f0, tt, tt + 0.12); s.frequency.exponentialRampToValueAtTime(f0 * (v % 2 ? 1.45 : 0.7), tt + 0.09);
      const fm = osc(c, 'sine', 60 + v * 20, tt, tt + 0.12); const fg = g(c, 180); fm.connect(fg); fg.connect(s.frequency);
      const a = g(c, 0); env(a.gain, tt, 0.008, 0.6, 0.03, tt + 0.12); chain(s, a, o);
    }
  }, { wet: 0.35, decay: 1.8, peak: 0.5, hp: 400 }));
  // Grillen
  for (let v = 0; v < 3; v++) add('cricket', render(1.6, 1, (c, o, t) => {
    const s = osc(c, 'sine', 4300 + v * 250, t, t + 1.4); const a = g(c, 0);
    const pulses = 10 + v * 3;
    for (let k = 0; k < pulses; k++) { const tt = t + k * 0.075; a.gain.setValueAtTime(0, tt); a.gain.linearRampToValueAtTime(0.5, tt + 0.008); a.gain.linearRampToValueAtTime(0, tt + 0.035); }
    chain(s, a, o);
  }, { wet: 0.3, peak: 0.35, hp: 1000 }));
  let done = 0; jobs.forEach(j => j.then(() => onProgress && onProgress(++done / jobs.length)));
  await Promise.all(jobs);
  return A;
}
