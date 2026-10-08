// Renderer + adaptive Qualität (DPR-Stufen, Gras-Dichte, Post-Processing)
// v2.9: stufenlose Renderskala (0,6–1,0) statt DPR-Sprüngen – Mittel/Hoch zeichnen in ein kleineres Render-Target, das
// Endbild skaliert kantenbewusst hoch und schärft nach (kern/hochskalieren.js; Mittel bekommt damit Kantenglättung).
// Geregelt vom Kern-Autopiloten (qualitaet.js: Arbeitszeit statt rAF-Abstand, GPU-Zeit, Hysterese, maxTier), Startwert
// aus einer Kurzmessung der ersten Bilder (kern/startprobe.js), je Gerät gemerkt. ?skala=0 = alter Weg (DPR-Sprünge,
// sample() unten unverändert), ?startprobe=0 = ohne Kurzmessung.
import * as THREE from 'three';
import { Post } from './gfx.js';
import { PX } from '../world/particles.js';
import { erzeugeAutopilot, dekoFaktor, SKALA } from './qualitaet.js';
import { GpuZeit } from './kern/autopilot.js';
import { kennzahlen, skalaAusProbe, geraeteSchluessel, ladeGeraet, merkeGeraet, PROBE_STANDARD } from './kern/startprobe.js';

export const QUALITY = [
  { id: 0, name: 'Niedrig', dpr: 1.0, dprMin: 0.75, post: false, samples: 0, depth: false, grass: 4500, deco: 0.55, particles: 160 },
  { id: 1, name: 'Mittel', dpr: 1.5, dprMin: 1.0, post: true, samples: 0, depth: false, grass: 8000, deco: 0.75, particles: 320 },
  { id: 2, name: 'Hoch', dpr: 2.0, dprMin: 1.25, post: true, samples: 4, depth: true, grass: 16000, deco: 1.0, particles: 480 },
];
export const GRASS_MAX = 16000;
const QS = new URLSearchParams(location.search);
// v2.9 Endbild je Stufe: Mittel ohne MSAA → Kantenglättung + Schärfen, Hoch hat MSAA 4 → nur Schärfen (wie Kino in der Stuntbahn)
// TODO Heavy-Job: uSharp am Bild abstimmen (Startwerte aus der Stuntbahn: Standard 0,42, Kino 0,25)
export const ENDBILD = [null, { aa: true, sharp: 0.4 }, { aa: false, sharp: 0.25 }];

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.r = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
    this.r.toneMapping = THREE.NeutralToneMapping;
    this.r.toneMappingExposure = 1.0;
    this.r.outputColorSpace = THREE.SRGBColorSpace;
    this.post = new Post(this.r);
    this.mode = 'auto'; // 'auto' | 0 | 1 | 2
    const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && innerWidth < 1100);
    this.tier = mobile ? 1 : 2;
    this.dpr = Math.min(QUALITY[this.tier].dpr, devicePixelRatio || 1);
    this.ft = []; this.slowT = 0; this.fastT = 0; this.lastChange = 0;
    this.maxTier = 2; // sinkt, wenn eine Stufe einmal zu langsam war (keine Pendelei)
    this.onTier = null;
    this.w = 0; this.h = 0;
    // v2.9 stufenlose Renderskala + Kern-Autopilot (?skala=0 = bisher)
    this.useSkala = QS.get('skala') !== '0';
    this.skala = 1; this.dekoAus = false; this.ap = null; this.gpu = null; this.probe = null; this.startProbe = null;
    this.resize();
    if (this.useSkala) this.starteProbe();
  }
  get q() { return QUALITY[this.tier]; }
  // DPR des Zeichenpuffers der aktuellen Stufe (ohne Renderskala)
  get dprStufe() { return Math.min(this.q.dpr, devicePixelRatio || 1); }
  // v2.8 Deko-Faktor: 1 = voll; 0,5 sobald die Auto-Drosselung die Auflösung dieser Stufe senken musste
  // (v2.9: bzw. der Autopilot die Deko halbiert hat)
  get dekoK() { return this.dpr < this.dprStufe - 1e-3 || this.dekoAus ? 0.5 : 1; }
  setMode(m) {
    this.mode = m;
    if (m !== 'auto') { this.tier = m; this.dpr = Math.min(QUALITY[m].dpr, devicePixelRatio || 1); }
    if (this.useSkala) {
      // Feste Nutzerwahl: Autopilot pausiert, volle Skala und Deko der gewählten Stufe; zurück auf „auto“ → neu aufsetzen
      if (m !== 'auto') { this.ap = null; this.skala = 1; this.dekoAus = false; }
      else if (!this.ap && !this.probe) this.starteAutopilot(this.skala);
    }
    this.resize(true);
    this.onTier && this.onTier(this.q);
  }
  resize(force) {
    const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
    // Niedrig (ohne Endbild) regelt die Renderskala direkt über die Pixeldichte
    const sk = this.useSkala && !this.q.post ? this.skala : 1;
    const dpr = Math.min(this.dpr * sk, 2);
    const ps = this.useSkala && this.q.post ? this.skala : 1;
    if (!force && w === this.w && h === this.h && dpr === this._dpr && ps === this._ps) return;
    this.w = w; this.h = h; this._dpr = dpr; this._ps = ps;
    this.r.setPixelRatio(dpr);
    this.r.setSize(w, h, false);
    this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
    const bw = Math.round(w * dpr), bh = Math.round(h * dpr);
    PX.value = bh;
    if (this.q.post && !this.post.failed) {
      this.post.setup(bw, bh, this.q.samples, this.q.depth, ps, this.useSkala ? ENDBILD[this.tier] : null);
      PX.value = this.post.rh || bh; // Punktgrößen in Pixeln des Render-Targets
    }
  }
  render(scene, cam) {
    if (this.gpu) this.gpu.anfang();
    if (this.q.post && !this.post.failed) this.post.render(scene, cam);
    else { this.r.setRenderTarget(null); this.r.render(scene, cam); }
    if (this.gpu) this.gpu.ende();
  }
  // Frame-Zeit messen und adaptiv nachregeln (v2.9: cpuMs = Arbeitszeit der Hauptschleife inkl. Zeichnen-Aufruf)
  sample(dtMs, now, cpuMs = null) {
    if (this.useSkala) return this.sampleAP(dtMs, cpuMs);
    if (this.mode !== 'auto' || document.hidden) return;
    this.ft.push(dtMs); if (this.ft.length > 60) this.ft.shift();
    if (this.ft.length < 30 || now - this.lastChange < 2500) return;
    const avg = this.ft.reduce((a, b) => a + b, 0) / this.ft.length;
    if (avg > 21) { this.slowT += dtMs; this.fastT = 0; }
    else if (avg < 17.4) { this.fastT += dtMs; this.slowT = 0; }
    else { this.slowT = 0; this.fastT = 0; }
    const Q = this.q;
    if (this.slowT > 2000) {
      this.slowT = 0; this.lastChange = now; this.ft.length = 0;
      if (this.dpr - 0.25 >= Q.dprMin - 1e-3) this.dpr -= 0.25; // (onTier unten meldet auch das → Deko halbiert)
      else if (this.tier > 0) { this.maxTier = this.tier - 1; this.tier--; this.dpr = Math.min(QUALITY[this.tier].dpr, devicePixelRatio || 1); }
      this.resize(true); this.onTier && this.onTier(this.q);
    } else if (this.fastT > 9000) {
      this.fastT = 0; this.lastChange = now; this.ft.length = 0;
      const maxD = Math.min(Q.dpr, devicePixelRatio || 1);
      if (this.dpr + 0.25 <= maxD + 1e-3) { this.dpr += 0.25; this.resize(true); this.onTier && this.onTier(this.q); }
      else if (this.tier < this.maxTier) { this.tier++; this.dpr = Math.max(QUALITY[this.tier].dprMin, Math.min(this.dpr, devicePixelRatio || 1)); this.resize(true); this.onTier && this.onTier(this.q); }
    }
  }

  // ---------- v2.9: Kurzmessung + Kern-Autopilot ----------
  // Kurzmessung in den ersten Bildern (Ladebildschirm, Menü-Schaukasten): je Bild nach dem Zeichnen 1 Pixel lesen
  // (zwingt die GPU, fertig zu werden) → echte Arbeitszeit. Gespeichertes Gerät → keine Messung.
  starteProbe() {
    let key = null;
    try { key = geraeteSchluessel(this.r.getContext(), { w: screen.width, h: screen.height, dpr: devicePixelRatio }); } catch (e) { key = null; }
    this.geraet = key;
    const gemerkt = key ? ladeGeraet(globalThis.localStorage, key) : null;
    if (gemerkt) {
      // gespeicherte Stufe unter der Startstufe → auf dieser Stufe vorsichtig (Minimum) starten
      const st = Math.min(this.tier, gemerkt.stufe ?? this.tier);
      if (this.mode === 'auto' && st < this.tier) { this.tier = st; this.dpr = this.dprStufe; }
      this.startProbe = { gespeichert: true, skala: gemerkt.skala, stufe: st };
      this.starteAutopilot(gemerkt.skala, gemerkt.maxStufe);
      return;
    }
    if (QS.get('startprobe') === '0' || this.mode !== 'auto') { this.starteAutopilot(1); return; }
    this.probe = { n: 0, ms: [], px: new Uint8Array(4), t0: 0 };
  }
  // vom Spiel direkt vor/nach render() aufgerufen, solange die Kurzmessung läuft
  probeVor() { if (this.probe) this.probe.t0 = performance.now(); }
  probeNach() {
    const P = this.probe; if (!P) return;
    const gl = this.r.getContext();
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, P.px);
    if (P.n++ >= PROBE_STANDARD.vorlauf) P.ms.push(performance.now() - P.t0);
    if (P.ms.length < PROBE_STANDARD.bilder) return;
    this.probe = null;
    const k = kennzahlen(P.ms), [lo, hi] = SKALA[this.tier];
    const s = skalaAusProbe(k.median, { min: lo, max: hi, aktuell: this.skala });
    this.startProbe = { ...k, skala: s, stufe: this.tier };
    if (this.mode === 'auto') this.starteAutopilot(s); else this.starteAutopilot(1);
  }
  starteAutopilot(skala, maxStufe) {
    if (!this.gpu) this.gpu = new GpuZeit(this.r.getContext());
    const merken = () => { if (this.geraet && this.ap) merkeGeraet(globalThis.localStorage, this.geraet, { skala: this.ap.skala, stufe: this.tier, maxStufe: this.ap.maxStufe }); };
    this.ap = erzeugeAutopilot({
      stufe: this.tier, maxStufe: maxStufe ?? 2, skala,
      setzeSkala: (s) => { this.skala = s; this.resize(true); },
      setzeDeko: (s) => { const alt = this.dekoAus; this.dekoAus = s === 0; if (alt !== this.dekoAus && this.onTier) this.onTier(this.q); },
      setzeStufe: (t) => { this.tier = t; this.dpr = this.dprStufe; this.resize(true); this.onTier && this.onTier(this.q); },
      onAenderung: merken,
    });
    if (this.mode !== 'auto') { this.ap = null; this.skala = 1; this.resize(true); return; }
    merken();
  }
  sampleAP(dtMs, cpuMs) {
    if (this.mode !== 'auto' || !this.ap || document.hidden) return;
    this.ap.bild(dtMs / 1000, cpuMs, this.gpu ? this.gpu.ms : null);
  }
  // Szenenwechsel (Welt neu gebaut, Shader übersetzen): erste Bilder zählen nicht
  schonen(sek = 1.5) { if (this.ap) this.ap.schonen(sek); }

  info() {
    const i = this.r.info;
    return { calls: i.render.calls, tris: i.render.triangles, geos: i.memory.geometries, tex: i.memory.textures, tier: this.tier, dpr: this.dpr, w: this.w, h: this.h, hdr: this.post.type === THREE.HalfFloatType, postFallbacks: this.post.fallbacks || 0, postFailed: !!this.post.failed,
      skala: this.useSkala ? this.skala : null, rt: this.post.rw ? [this.post.rw, this.post.rh] : null, autopilot: this.ap ? this.ap.zustand() : null, apLog: this.ap ? this.ap.log.slice(-8) : null, startProbe: this.startProbe };
  }
}
