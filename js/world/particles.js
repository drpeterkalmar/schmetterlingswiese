// Partikel: Umgebung (GPU, folgt dem Spieler) + Effekt-Bursts (Pool, 1 Draw-Call)
import * as THREE from 'three';
import { G } from '../engine/gfx.js';

export const PX = { value: 800 }; // Pixelhöhe des Zeichenpuffers (für Punktgrößen)

const V_BEND = `uniform float uBend; uniform vec3 uCam;
vec4 bendW(vec4 wp){ vec2 d = wp.xz - uCam.xz; wp.y -= uBend * dot(d, d); return wp; }`;

// ---------------------------------------------------------------- Umgebung
const AMB_V = /* glsl */`
${V_BEND}
uniform float uTime, uPx, uMode; uniform vec3 uCenter, uBox; uniform vec3 uWind;
attribute vec4 aR;
varying float vA; varying float vRot; varying float vK;
void main(){
  vec3 base = aR.xyz * uBox;
  float t = uTime;
  vec3 drift;
  float size, a;
  if (uMode < 0.5) { // Pollen
    drift = vec3(uWind.x * t * 0.6 + sin(t * 0.3 + aR.w * 20.0) * 1.5, sin(t * 0.5 + aR.w * 11.0) * 0.8, uWind.y * t * 0.6 + cos(t * 0.27 + aR.w * 13.0) * 1.5);
    size = 0.07 + aR.w * 0.07; a = 0.75;
  } else if (uMode < 1.5) { // Glühwürmchen
    drift = vec3(sin(t * 0.4 + aR.w * 30.0) * 2.5, sin(t * 0.7 + aR.w * 17.0) * 1.2, cos(t * 0.35 + aR.w * 23.0) * 2.5);
    size = 0.22 + aR.w * 0.12;
    a = smoothstep(0.2, 0.9, sin(t * (1.2 + aR.w) + aR.w * 50.0) * 0.5 + 0.5);
  } else { // Blütenblätter
    drift = vec3(uWind.x * t * 1.2 + sin(t * 0.9 + aR.w * 20.0) * 1.2, -t * (0.9 + aR.w * 0.6), uWind.y * t * 1.2 + cos(t * 0.8 + aR.w * 9.0) * 1.2);
    size = 0.16 + aR.w * 0.08; a = 1.0;
  }
  vec3 p = base + drift;
  p = mod(p - uCenter + uBox * 0.5, uBox) - uBox * 0.5 + uCenter;
  if (uMode > 0.5 && uMode < 1.5) p.y = uCenter.y - 3.0 + mod(base.y + drift.y, 9.0);
  vec4 wp = bendW(vec4(p, 1.0));
  vec4 mv = viewMatrix * wp;
  float edge = 1.0 - smoothstep(0.35, 0.5, length((p - uCenter).xz / uBox.xz));
  vA = a * edge; vRot = aR.w * 6.28 + t * (0.5 + aR.w); vK = aR.w;
  gl_PointSize = size * uPx * projectionMatrix[1][1] * 0.5 / max(-mv.z, 0.1);
  gl_Position = projectionMatrix * mv;
}`;
const AMB_F = /* glsl */`
uniform float uMode; uniform vec3 uCol, uCol2, uSunCol;
varying float vA; varying float vRot; varying float vK;
void main(){
  vec2 q = gl_PointCoord - 0.5;
  vec3 c; float a;
  if (uMode > 1.5) {
    float cs = cos(vRot), sn = sin(vRot);
    q = vec2(q.x * cs - q.y * sn, q.x * sn + q.y * cs);
    float d = length(vec2(q.x * 1.8, q.y + q.x * q.x * 1.5));
    a = smoothstep(0.32, 0.26, d);
    c = mix(uCol, uCol2, vK) * (0.7 + 0.5 * uSunCol);
  } else {
    float d = length(q) * 2.0;
    a = pow(max(1.0 - d, 0.0), uMode > 0.5 ? 1.6 : 2.4);
    c = mix(uCol, uCol2, vK) * (uMode > 0.5 ? 2.2 : 1.4);
  }
  gl_FragColor = vec4(c, a * vA);
}`;

export class Ambient {
  constructor(kind = 'pollen', count = 300) {
    this.max = 700;
    const r = new Float32Array(this.max * 4);
    for (let i = 0; i < r.length; i++) r[i] = Math.random();
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.max * 3), 3));
    g.setAttribute('aR', new THREE.BufferAttribute(r, 4));
    const mode = kind === 'fireflies' ? 1 : kind === 'petals' ? 2 : 0;
    const cols = { pollen: [0xfff4c0, 0xffffff], fireflies: [0xd8ff6a, 0xfff08a], petals: [0xffc2d8, 0xffe6ef] }[kind];
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: G.uTime, uBend: G.uBend, uCam: G.uCam, uWind: G.uWind, uSunCol: G.uSunCol, uPx: PX,
        uMode: { value: mode }, uCenter: { value: new THREE.Vector3() },
        uBox: { value: mode === 1 ? new THREE.Vector3(70, 9, 70) : new THREE.Vector3(46, 18, 46) },
        uCol: { value: new THREE.Color(cols[0]) }, uCol2: { value: new THREE.Color(cols[1]) },
      },
      vertexShader: AMB_V, fragmentShader: AMB_F, transparent: true, depthWrite: false,
      blending: mode === 2 ? THREE.NormalBlending : THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.geo = g;
    if (mode === 1) count = Math.round(count * 0.6);
    this.setCount(count);
  }
  setCount(n) { this.geo.setDrawRange(0, Math.min(this.max, n)); }
  update(dt, focus) { this.mat.uniforms.uCenter.value.copy(focus); }
}

// ---------------------------------------------------------------- Effekt-Bursts
const B_V = /* glsl */`
${V_BEND}
uniform float uPx;
attribute vec3 aCol; attribute vec4 aP; // size, alpha, rot, shape
varying vec3 vC; varying vec4 vP;
void main(){
  vec4 mv = viewMatrix * bendW(modelMatrix * vec4(position, 1.0));
  vC = aCol; vP = aP;
  gl_PointSize = aP.x * uPx * projectionMatrix[1][1] * 0.5 / max(-mv.z, 0.1);
  gl_Position = projectionMatrix * mv;
}`;
const B_F = /* glsl */`
varying vec3 vC; varying vec4 vP;
void main(){
  vec2 q = gl_PointCoord - 0.5; q.y = -q.y;
  float cs = cos(vP.z), sn = sin(vP.z);
  vec2 r = vec2(q.x * cs - q.y * sn, q.x * sn + q.y * cs);
  float a = 0.0; vec3 c = vC;
  float sh = vP.w;
  if (sh < 0.5) { float d = length(q) * 2.0; a = pow(max(1.0 - d, 0.0), 2.0); c *= 1.6; }
  else if (sh < 1.5) { // Glitzerstern (4 Zacken)
    vec2 ar = abs(r) * 2.0;
    float s = max(1.0 - (ar.x * 6.0 + ar.y), 0.0) + max(1.0 - (ar.y * 6.0 + ar.x), 0.0);
    a = clamp(s, 0.0, 1.0) + pow(max(1.0 - length(q) * 2.0, 0.0), 3.0) * 0.8; c *= 1.8;
  } else if (sh < 2.5) { // Konfetti
    vec2 ar = abs(r);
    a = step(ar.x, 0.3) * step(ar.y, 0.14 + 0.1 * abs(sin(vP.z * 2.0)));
  } else if (sh < 3.5) { // Herz
    vec2 h = r * 2.6; h.y += 0.25;
    float v = h.x * h.x + pow(h.y - sqrt(abs(h.x)) * 0.75, 2.0);
    a = smoothstep(0.62, 0.52, v); c *= 1.1;
  } else if (sh < 4.5) { // Tropfen/Strich (Richtung über Rotation)
    a = smoothstep(0.07, 0.015, abs(r.x)) * smoothstep(0.5, 0.15, abs(r.y));
  } else if (sh < 5.5) { // Ring
    float d = length(q) * 2.0; a = smoothstep(0.12, 0.0, abs(d - 0.8)); c *= 1.4;
  } else if (sh < 6.5) { // Seifenblase: zarter Rand, fast durchsichtige Füllung, Glanzpunkt
    float d = length(q) * 2.0;
    float rim = smoothstep(0.16, 0.0, abs(d - 0.84)) * 0.85;
    float fill = (1.0 - smoothstep(0.7, 0.9, d)) * 0.12;
    float hl = smoothstep(0.16, 0.05, length(q - vec2(-0.17, 0.17)));
    a = max(rim, fill) + hl; c = mix(c * 1.2, vec3(1.0), hl);
  } else { // Wölkchen: weicher, deckender Klecks aus drei Kreisen
    float d = min(min(length(q - vec2(-0.13, -0.04)), length(q - vec2(0.13, -0.04))), length(q - vec2(0.0, 0.1)) * 0.95);
    a = smoothstep(0.26, 0.17, d) * 0.9; c *= 1.05 - 0.15 * smoothstep(0.1, -0.2, q.y);
  }
  gl_FragColor = vec4(c, a * vP.y);
  if (gl_FragColor.a < 0.01) discard;
}`;

export class Bursts {
  constructor(max = 700) {
    this.max = max; this.n = 0;
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 3); this.p = new Float32Array(max * 4);
    this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.life0 = new Float32Array(max);
    this.size0 = new Float32Array(max); this.grav = new Float32Array(max); this.spin = new Float32Array(max); this.drag = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    this.aPos = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.aCol = new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage);
    this.aP = new THREE.BufferAttribute(this.p, 4).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.aPos); g.setAttribute('aCol', this.aCol); g.setAttribute('aP', this.aP);
    this.geo = g;
    const mat = new THREE.ShaderMaterial({
      uniforms: { uBend: G.uBend, uCam: G.uCam, uPx: PX }, vertexShader: B_V, fragmentShader: B_F,
      transparent: true, depthWrite: false,
    });
    this.points = new THREE.Points(g, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;
    this._c = new THREE.Color();
  }
  // o: {n, pos(Vector3), spread, speed, up, life, size, colors[], shape, grav, spin, drag, vel(Vector3)}
  emit(o) {
    const n = o.n || 10;
    for (let k = 0; k < n; k++) {
      let i;
      if (this.n < this.max) i = this.n++;
      else { // ältesten (kleinste Restlebenszeit) ersetzen
        i = (Math.random() * this.max) | 0;
      }
      const sp = o.spread ?? 0.3, spd = o.speed ?? 3;
      this.pos[i * 3] = o.pos.x + (Math.random() - 0.5) * sp;
      this.pos[i * 3 + 1] = o.pos.y + (Math.random() - 0.5) * sp;
      this.pos[i * 3 + 2] = o.pos.z + (Math.random() - 0.5) * sp;
      let vx = Math.random() - 0.5, vy = Math.random() - 0.5, vz = Math.random() - 0.5;
      const l = Math.hypot(vx, vy, vz) || 1; const s = spd * (0.5 + Math.random() * 0.5) / l;
      this.vel[i * 3] = vx * s + (o.vel ? o.vel.x : 0);
      this.vel[i * 3 + 1] = vy * s + (o.up ?? 1.5) + (o.vel ? o.vel.y : 0);
      this.vel[i * 3 + 2] = vz * s + (o.vel ? o.vel.z : 0);
      const life = (o.life ?? 1) * (0.7 + Math.random() * 0.6);
      this.life[i] = life; this.life0[i] = life;
      this.size0[i] = (o.size ?? 0.3) * (0.7 + Math.random() * 0.6);
      this.grav[i] = o.grav ?? -2; this.spin[i] = o.rot !== undefined ? 0 : (o.spin ?? 3) * (Math.random() - 0.5) * 2; this.drag[i] = o.drag ?? 1.2;
      const cols = o.colors || [0xffffff];
      this._c.set(cols[(Math.random() * cols.length) | 0]);
      this.col[i * 3] = this._c.r; this.col[i * 3 + 1] = this._c.g; this.col[i * 3 + 2] = this._c.b;
      this.p[i * 4] = this.size0[i]; this.p[i * 4 + 1] = 1; this.p[i * 4 + 2] = o.rot ?? Math.random() * 6.28; this.p[i * 4 + 3] = o.shape ?? 0;
    }
  }
  update(dt) {
    let i = 0;
    while (i < this.n) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.kill(i); continue; }
      const d = Math.max(0, 1 - this.drag[i] * dt);
      this.vel[i * 3] *= d; this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * d + this.grav[i] * dt; this.vel[i * 3 + 2] *= d;
      this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      const t = this.life[i] / this.life0[i];
      this.p[i * 4 + 1] = Math.min(1, t * 3);
      this.p[i * 4] = this.size0[i] * (0.4 + 0.6 * Math.min(1, t * 2 + 0.2));
      this.p[i * 4 + 2] += this.spin[i] * dt;
      i++;
    }
    this.geo.setDrawRange(0, this.n);
    if (this.n) { this.aPos.needsUpdate = true; this.aCol.needsUpdate = true; this.aP.needsUpdate = true; }
  }
  kill(i) {
    const j = --this.n;
    if (i !== j) {
      for (let k = 0; k < 3; k++) { this.pos[i * 3 + k] = this.pos[j * 3 + k]; this.vel[i * 3 + k] = this.vel[j * 3 + k]; this.col[i * 3 + k] = this.col[j * 3 + k]; }
      for (let k = 0; k < 4; k++) this.p[i * 4 + k] = this.p[j * 4 + k];
      this.life[i] = this.life[j]; this.life0[i] = this.life0[j]; this.size0[i] = this.size0[j];
      this.grav[i] = this.grav[j]; this.spin[i] = this.spin[j]; this.drag[i] = this.drag[j];
    }
  }
  clear() { this.n = 0; this.geo.setDrawRange(0, 0); }
}
