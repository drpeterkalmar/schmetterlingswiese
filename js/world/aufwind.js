// v3.1 Aufwind-Säulen (?aufwind=0: aus): Löwenzahn-Schirmchen steigen in einer Spirale auf und zeigen, wo die Luft
// trägt. Alle Säulen eines Levels in EINEM Draw-Call (Punkte), Bewegung ganz im Shader (keine CPU-Arbeit je Bild).
// Physik (Hub, Wirbel, Lenkhilfe) steckt in Player.update + flugschule.js (aufwindProfil).
import * as THREE from 'three';
import { G } from '../engine/gfx.js';
import { RM } from '../engine/deko.js';
import { PX } from './particles.js';
import { FLUG } from '../game/flugschule.js';

export const AUF_MAX = 3, JE_SAEULE = 90;

const V = /* glsl */`
uniform float uBend; uniform vec3 uCam;
vec4 bendW(vec4 wp){ vec2 d = wp.xz - uCam.xz; wp.y -= uBend * dot(d, d); return wp; }
uniform float uTime, uPx, uSlow, uR, uH; uniform vec4 uS[${AUF_MAX}]; uniform vec3 uSunDir;
attribute vec4 aR; // Säule, Phase, Radius-Anteil, Zufall
varying float vA; varying float vRot; varying float vGl; varying float vType;
void main(){
  vec4 S = aR.x < 0.5 ? uS[0] : aR.x < 1.5 ? uS[1] : uS[2];
  float t = uTime * uSlow;
  float h = fract(aR.y + t * (0.09 + aR.w * 0.05));          // Steigen: ≈ 2,3–3,5 m/s bei 25 m Säulenhöhe
  float ang = aR.y * 37.0 + t * (0.7 + aR.w * 0.5) + h * 5.0;  // Spirale: dreht beim Aufsteigen weiter
  float r = uR * (0.15 + 0.8 * aR.z) * (0.85 + 0.15 * sin(t * 1.3 + aR.w * 20.0));
  vec3 p = vec3(S.x + cos(ang) * r, S.y + 0.4 + h * uH, S.z + sin(ang) * r);
  vec4 mv = viewMatrix * bendW(vec4(p, 1.0));
  vA = S.w * smoothstep(0.0, 0.08, h) * (1.0 - smoothstep(0.8, 1.0, h)) * smoothstep(1.0, 3.5, -mv.z) * (1.0 - smoothstep(70.0, 95.0, -mv.z));
  vRot = aR.w * 40.0 + t * 1.5;
  vGl = pow(max(dot(normalize(p - uCam), uSunDir), 0.0), 4.0);
  vType = step(0.25, fract(aR.w * 7.0)); // ¾ Schirmchen, ¼ Sonnenstaub
  float size = vType > 0.5 ? 0.42 + aR.w * 0.25 : 0.1;
  gl_PointSize = clamp(size * uPx * projectionMatrix[1][1] * 0.5 / max(-mv.z, 0.1), vType > 0.5 ? 4.0 : 1.5, 64.0); // fern: nicht kleiner als 4 px
  gl_Position = projectionMatrix * mv;
}`;
const F = /* glsl */`
uniform vec3 uSunCol; uniform float uTime;
varying float vA; varying float vRot; varying float vGl; varying float vType;
void main(){
  vec2 q = gl_PointCoord - 0.5;
  float r = length(q) * 2.0;
  vec3 c; float a;
  if (vType > 0.5) { // Schirmchen: feine Strahlen, Spitzen-Kranz, Kern
    float cs = cos(vRot), sn = sin(vRot);
    vec2 rq = vec2(q.x * cs - q.y * sn, q.x * sn + q.y * cs);
    float ang = atan(rq.y, rq.x);
    float ray = pow(abs(cos(ang * 5.0)), 22.0) * smoothstep(1.0, 0.3, r) * smoothstep(0.06, 0.22, r);
    float tips = smoothstep(0.22, 0.0, abs(r - 0.8)) * (0.35 + 0.65 * pow(abs(cos(ang * 5.0)), 5.0));
    float core = smoothstep(0.17, 0.02, r);
    a = clamp(ray * 0.9 + tips * 0.7 + core + pow(max(1.0 - r, 0.0), 2.0) * 0.25, 0.0, 1.0);
    c = vec3(1.0, 0.99, 0.95) * (0.95 + 0.25 * uSunCol) + uSunCol * vGl * 1.2;
  } else {
    float tw = 0.5 + 0.5 * sin(uTime * 3.0 + vRot);
    a = pow(max(1.0 - r, 0.0), 2.5);
    c = (vec3(1.0, 0.95, 0.8) + uSunCol) * (0.9 + 1.8 * vGl) * (0.6 + tw);
  }
  gl_FragColor = vec4(c, a * vA);
  if (gl_FragColor.a < 0.01) discard;
}`;

// Luftschlauch: offener Zylinder je Säule (instanziert, 1 Draw-Call), ganz zart – Spiralbänder ziehen nach oben,
// zum Rand hin (Silhouette) etwas dichter, unten ein weicher Leuchtring am Boden, oben ausblendend
const ZV = /* glsl */`
uniform float uBend; uniform vec3 uCam;
vec4 bendW(vec4 wp){ vec2 d = wp.xz - uCam.xz; wp.y -= uBend * dot(d, d); return wp; }
attribute vec4 aS; // x, Boden, z, an
varying vec3 vN; varying vec3 vW; varying float vH; varying float vAng; varying float vOn;
void main(){
  vec3 p = position + vec3(aS.x, aS.y, aS.z);
  vH = position.y; vAng = atan(position.z, position.x); vOn = aS.w;
  vN = normalize(vec3(position.x, 0.0, position.z)); vW = p;
  gl_Position = projectionMatrix * viewMatrix * bendW(vec4(p, 1.0));
}`;
const ZF = /* glsl */`
uniform float uTime, uSlow, uH; uniform vec3 uCam; uniform vec3 uSunCol;
varying vec3 vN; varying vec3 vW; varying float vH; varying float vAng; varying float vOn;
void main(){
  vec3 V = normalize(uCam - vW);
  float rim = pow(1.0 - abs(dot(V, vN)), 2.0);
  float h = vH / uH, t = uTime * uSlow;
  float band = smoothstep(0.55, 1.0, sin(vAng * 3.0 + vH * 0.55 - t * 2.2) * 0.5 + 0.5);
  float fade = smoothstep(0.0, 0.06, h) * (1.0 - smoothstep(0.55, 1.0, h));
  float near = smoothstep(4.0, 12.0, length(uCam - vW)); // drinnen/ganz nah: fast unsichtbar (kein Schleier vor der Figur)
  float a = (0.03 + 0.12 * rim + 0.1 * band * (0.4 + rim)) * fade * near * vOn;
  gl_FragColor = vec4(vec3(1.0, 0.99, 0.94) * (0.85 + 0.3 * uSunCol), a);
  if (gl_FragColor.a < 0.004) discard;
}`;

export class AufwindSaeulen {
  constructor() {
    const n = AUF_MAX * JE_SAEULE, aR = new Float32Array(n * 4), pos = new Float32Array(n * 3);
    let s = 0x2545f491;
    const rnd = () => { s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x6d2b79f5) >>> 0; return (s >>> 8) / 16777216; };
    for (let i = 0; i < n; i++) { aR[i * 4] = Math.floor(i / JE_SAEULE); aR[i * 4 + 1] = rnd(); aR[i * 4 + 2] = Math.sqrt(rnd()); aR[i * 4 + 3] = rnd(); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aR', new THREE.BufferAttribute(aR, 4));
    this.uS = { value: Array.from({ length: AUF_MAX }, () => new THREE.Vector4(0, -999, 0, 0)) };
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: G.uTime, uBend: G.uBend, uCam: G.uCam, uSunDir: G.uSunDir, uSunCol: G.uSunCol, uPx: PX, uS: this.uS,
        uSlow: { value: RM ? 0.5 : 1 }, uR: { value: FLUG.aufwind.R }, uH: { value: FLUG.aufwind.hoehe } },
      vertexShader: V, fragmentShader: F, transparent: true, depthWrite: false,
    });
    mat.userData.keinBloom = true;
    this.points = new THREE.Points(g, mat);
    this.points.frustumCulled = false; this.points.renderOrder = 2; this.points.visible = false;
    this.list = [];
    // Luftschlauch
    const P = FLUG.aufwind, cg = new THREE.CylinderGeometry(P.R * 0.85, P.R * 0.85, P.hoehe, 28, 10, true);
    cg.translate(0, P.hoehe / 2, 0);
    const ig = new THREE.InstancedBufferGeometry().copy(cg); ig.instanceCount = AUF_MAX;
    this.aS = new THREE.InstancedBufferAttribute(new Float32Array(AUF_MAX * 4), 4); ig.setAttribute('aS', this.aS);
    const zm = new THREE.ShaderMaterial({
      uniforms: { uTime: G.uTime, uBend: G.uBend, uCam: G.uCam, uSunCol: G.uSunCol, uSlow: { value: RM ? 0.5 : 1 }, uH: { value: P.hoehe } },
      vertexShader: ZV, fragmentShader: ZF, transparent: true, depthWrite: false, side: THREE.FrontSide, // nur Außenseite: halbe Überzeichnung
    });
    zm.userData.keinBloom = true;
    this.schlauch = new THREE.Mesh(ig, zm);
    this.schlauch.frustumCulled = false; this.schlauch.renderOrder = 2; this.schlauch.visible = false;
    this.points.add(this.schlauch);
  }
  // Säulen setzen: [{x, z, gy}] (gy = Bodenhöhe)
  setze(list) {
    this.list = list.slice(0, AUF_MAX);
    this.uS.value.forEach((v, i) => { const S = this.list[i]; if (S) v.set(S.x, S.gy, S.z, 1); else v.set(0, -999, 0, 0); });
    const a = this.aS.array;
    for (let i = 0; i < AUF_MAX; i++) { const S = this.list[i]; a[i * 4] = S ? S.x : 0; a[i * 4 + 1] = S ? S.gy : -999; a[i * 4 + 2] = S ? S.z : 0; a[i * 4 + 3] = S ? 1 : 0; }
    this.aS.needsUpdate = true;
    this.points.visible = this.schlauch.visible = this.list.length > 0;
  }
  dispose() { this.points.geometry.dispose(); this.points.material.dispose(); this.schlauch.geometry.dispose(); this.schlauch.material.dispose(); }
}
