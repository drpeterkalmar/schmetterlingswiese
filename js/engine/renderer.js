// Renderer + adaptive Qualität (DPR-Stufen, Gras-Dichte, Post-Processing)
import * as THREE from 'three';
import { Post } from './gfx.js';
import { PX } from '../world/particles.js';

export const QUALITY = [
  { id: 0, name: 'Niedrig', dpr: 1.0, dprMin: 0.75, post: false, samples: 0, depth: false, grass: 4500, deco: 0.55, particles: 160 },
  { id: 1, name: 'Mittel', dpr: 1.5, dprMin: 1.0, post: true, samples: 0, depth: false, grass: 8000, deco: 0.75, particles: 320 },
  { id: 2, name: 'Hoch', dpr: 2.0, dprMin: 1.25, post: true, samples: 4, depth: true, grass: 16000, deco: 1.0, particles: 480 },
];
export const GRASS_MAX = 16000;

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
    this.onTier = null;
    this.w = 0; this.h = 0;
    this.resize();
  }
  get q() { return QUALITY[this.tier]; }
  setMode(m) {
    this.mode = m;
    if (m !== 'auto') { this.tier = m; this.dpr = Math.min(QUALITY[m].dpr, devicePixelRatio || 1); }
    this.resize(true);
    this.onTier && this.onTier(this.q);
  }
  resize(force) {
    const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
    const dpr = Math.min(this.dpr, 2);
    if (!force && w === this.w && h === this.h && dpr === this._dpr) return;
    this.w = w; this.h = h; this._dpr = dpr;
    this.r.setPixelRatio(dpr);
    this.r.setSize(w, h, false);
    this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
    const bw = Math.round(w * dpr), bh = Math.round(h * dpr);
    PX.value = bh;
    if (this.q.post) this.post.setup(bw, bh, this.q.samples, this.q.depth);
  }
  render(scene, cam) {
    if (this.q.post) this.post.render(scene, cam);
    else { this.r.setRenderTarget(null); this.r.render(scene, cam); }
  }
  // Frame-Zeit messen und adaptiv nachregeln
  sample(dtMs, now) {
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
      if (this.dpr - 0.25 >= Q.dprMin - 1e-3) this.dpr -= 0.25;
      else if (this.tier > 0) { this.tier--; this.dpr = Math.min(QUALITY[this.tier].dpr, devicePixelRatio || 1); }
      this.resize(true); this.onTier && this.onTier(this.q);
    } else if (this.fastT > 9000) {
      this.fastT = 0; this.lastChange = now; this.ft.length = 0;
      const maxD = Math.min(Q.dpr, devicePixelRatio || 1);
      if (this.dpr + 0.25 <= maxD + 1e-3) { this.dpr += 0.25; this.resize(true); }
    }
  }
  info() {
    const i = this.r.info;
    return { calls: i.render.calls, tris: i.render.triangles, geos: i.memory.geometries, tex: i.memory.textures, tier: this.tier, dpr: this.dpr, w: this.w, h: this.h };
  }
}
