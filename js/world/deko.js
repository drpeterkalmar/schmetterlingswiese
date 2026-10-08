// v2.8 Deko (nur ohne ?deko=0): Wiesenblüten in Kameranähe, Lichtstrahlen, Löwenzahn-Schirmchen + Sonnenstaub.
// Alles prozedural und auf der GPU: je Schicht 1 Draw-Call, keine Texturen, keine Arbeit pro Frame außer Uniforms.
// Stückzahlen hängen an der Qualitätsstufe (Niedrig = aus) und an der Auto-Drosselung (halbiert).
import * as THREE from 'three';
import { G, V_COMMON, F_LIGHT, GLSL_TERRAIN } from '../engine/gfx.js';
import { PX } from './particles.js';
import { RM } from '../engine/deko.js';

// je Qualitätsstufe: Wiesenblüten, Lichtstrahlen, Schirmchen/Staub
const COUNTS = [{ bloom: 0, shaft: 0, fluff: 0 }, { bloom: 1500, shaft: 7, fluff: 70 }, { bloom: 2600, shaft: 10, fluff: 120 }];
const MAX = COUNTS[2];

// ---------------------------------------------------------------- Wiesenblüten (folgen der Kamera wie das Gras)
// Kleine Fünfblatt-Blüten auf Stielen in Flecken; die Köpfe neigen sich zur Kamera (auch flach von hinten gut sichtbar),
// wiegen sich in derselben Windwelle wie das Gras und weichen der Figur aus. Nachts leuchten sie sanft.
const BLOOM_V = /* glsl */`
${V_COMMON}
${GLSL_TERRAIN}
uniform float uField; uniform vec3 uCenter; uniform float uWaterY; uniform vec3 uPal[6];
attribute vec4 aOff; // x,z in [0,1), Zufall, Größe
attribute vec4 aK;   // rgb Farbe (a = 1: Faktor auf die Palettenfarbe = Blütenblatt)
varying vec3 vWP; varying vec3 vCol; varying vec3 vN; varying float vPet;
void main(){
  vec2 c = uCenter.xz;
  vec2 p = mod(aOff.xy * uField - c + uField * 0.5, uField) - uField * 0.5 + c;
  float gh = terrainH(p);
  float r1 = hash12(aOff.xy * 31.7 + 3.1);
  // in Flecken (Weltposition → das Muster bleibt beim Mitwandern liegen)
  float dr = sin(p.x * 0.083 + sin(p.y * 0.061) * 2.1) * sin(p.y * 0.071 - sin(p.x * 0.052) * 1.8);
  float s = step(r1, smoothstep(-0.3, 0.6, dr) * 0.85 + 0.15);
  s *= aOff.w * (1.0 - smoothstep(uField * 0.30, uField * 0.48, length(p - c)));
  s *= smoothstep(uWaterY + 0.5, uWaterY + 1.0, gh);
  s *= 1.0 - smoothstep(uEdge.x + 20.0, uEdge.x + 45.0, length(p));
  s *= smoothstep(1.4, 3.6, length(p - uCam.xz));
  s *= 1.0 - smoothstep(0.1, 0.4, patchAmt(p));
  float H = (0.3 + 0.32 * aOff.z) * s, hs = (0.95 + 0.65 * r1) * s;
  // Wind wie im Gras-Shader (gleiche Welle) + die Figur drückt die Blumen weg
  float wave = sin(dot(p, normalize(uWind.xy + 0.001)) * 0.18 - uTime * 2.2) * 0.5 + 0.5; wave *= wave;
  vec2 bend = uWind.xy * (0.35 + 0.9 * wave + uWind.z) * 0.55 + vec2(sin(uTime * 2.3 + aOff.z * 20.0), cos(uTime * 1.9 + aOff.z * 17.0)) * 0.06;
  vec2 dp = p - uPlayer.xz;
  float push = (1.0 - smoothstep(0.0, 2.6, length(dp))) * (1.0 - smoothstep(0.5, 3.0, uPlayer.y - gh));
  bend += normalize(dp + 0.001) * push * 0.9;
  vec3 g0 = vec3(p.x, gh, p.y);
  vec3 top = g0 + vec3(bend.x * H, H - length(bend) * H * 0.22, bend.y * H);
  vec3 toC = normalize(uCam - top);
  vec3 wp;
  if (position.y < 0.999) { // Stiel: gebogen vom Boden zum Kopf, Breite quer zur Blickrichtung
    float t = position.y;
    wp = g0 + vec3(bend.x * H * t * t, (top.y - gh) * t, bend.y * H * t * t);
    wp += normalize(cross(vec3(0.0, 1.0, 0.0), toC) + 1e-4) * position.x * s;
    vN = normalize(vec3(0.0, 0.6, 0.0) + toC);
  } else { // Kopf: zwischen „nach oben“ und „zur Kamera“ geneigt, zufällig gedreht
    vec3 n = normalize(vec3(0.0, 0.75, 0.0) + toC);
    vec3 t1 = normalize(cross(abs(n.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0), n));
    vec3 t2 = cross(n, t1);
    float a = aOff.z * 6.2831, ca = cos(a), sa = sin(a);
    vec2 lp = vec2(position.x * ca - position.z * sa, position.x * sa + position.z * ca) * hs;
    wp = top + t1 * lp.x + t2 * lp.y + n * (position.y - 1.0) * hs;
    vN = n;
  }
  vec3 pc = uPal[int(fract(r1 * 7.31) * 5.999)];
  vCol = aK.a > 0.5 ? pc * aK.rgb * (0.85 + 0.3 * fract(r1 * 13.7)) : aK.rgb;
  vPet = aK.a;
  vWP = wp;
  gl_Position = projectionMatrix * viewMatrix * bendW(vec4(wp, 1.0));
}`;
const BLOOM_F = /* glsl */`
${F_LIGHT}
uniform float uNight;
varying vec3 vWP; varying vec3 vCol; varying vec3 vN; varying float vPet;
void main(){
  vec3 N = normalize(vN), V = normalize(uCam - vWP);
  float ndl = max(dot(N, uSunDir), 0.0);
  vec3 c = vCol * (mix(uGndAmb, uSkyAmb, 0.7) + uSunCol * (0.55 + 0.45 * ndl));
  c += vCol * uSunCol * pow(clamp(dot(-V, uSunDir), 0.0, 1.0), 2.0) * 0.4 * vPet; // Gegenlicht: Blüten leuchten durch
  c += vCol * uNight * vPet * 1.1; // Nacht: Blüten glimmen (das Bloom macht daraus einen Schein)
  c = applyFog(c, vWP);
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function bloomGeo() {
  const pos = [], k = [], idx = [];
  const v = (x, y, z, r, g, b, a) => { pos.push(x, y, z); k.push(r, g, b, a); return pos.length / 3 - 1; };
  // 5 Blütenblätter (je Raute: Mitte dunkler, Spitze heller, leicht gewölbt)
  const r1 = 0.07, r2 = 0.125, w = 0.44;
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2;
    const C = v(0, 1.0, 0, 0.78, 0.78, 0.78, 1);
    const L = v(Math.cos(a - w) * r1, 1.012, Math.sin(a - w) * r1, 1, 1, 1, 1);
    const T = v(Math.cos(a) * r2, 1.035, Math.sin(a) * r2, 1.12, 1.12, 1.12, 1);
    const R = v(Math.cos(a + w) * r1, 1.012, Math.sin(a + w) * r1, 1, 1, 1, 1);
    idx.push(C, L, T, C, T, R);
  }
  // Mitte (gelb, fünfeckig, etwas erhaben)
  const m = v(0, 1.05, 0, 1.0, 0.82, 0.25, 0);
  const ring = [];
  for (let i = 0; i < 5; i++) { const a = (i + 0.5) / 5 * Math.PI * 2; ring.push(v(Math.cos(a) * 0.036, 1.04, Math.sin(a) * 0.036, 0.95, 0.72, 0.2, 0)); }
  for (let i = 0; i < 5; i++) idx.push(m, ring[i], ring[(i + 1) % 5]);
  // Stiel (y < 1 → Stiel-Zweig im Shader)
  const s0 = v(-0.011, 0, 0, 0.3, 0.55, 0.22, 0), s1 = v(0.011, 0, 0, 0.3, 0.55, 0.22, 0);
  const s2 = v(-0.007, 0.998, 0, 0.36, 0.62, 0.26, 0), s3 = v(0.007, 0.998, 0, 0.36, 0.62, 0.26, 0);
  idx.push(s0, s1, s3, s0, s3, s2);
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aK', new THREE.Float32BufferAttribute(k, 4));
  g.setIndex(idx);
  return g;
}

// ---------------------------------------------------------------- Lichtstrahlen (additive Bänder im Dunst)
// Lange, weiche Lichtbahnen schräg aus Richtung Sonne; gegen die Sonne geschaut am hellsten (Vorwärtsstreuung).
// Die Fußpunkte wandern wie das Gras mit (Gitter um die Figur) → keine CPU-Arbeit, kein Aufploppen.
const SHAFT_V = /* glsl */`
${V_COMMON}
${GLSL_TERRAIN}
uniform float uField, uLen, uWidth; uniform vec3 uCenter, uDir;
attribute vec4 aB; // Fußpunkt x,z in [0,1), Breite, Phase
varying vec2 vUv; varying float vFade; varying float vPh; varying vec3 vWP;
void main(){
  vec2 c = uCenter.xz;
  vec2 p = mod(aB.xy * uField - c + uField * 0.5, uField) - uField * 0.5 + c;
  vec3 g0 = vec3(p.x, terrainH(p) - 1.0, p.y);
  vec3 mid = g0 + uDir * uLen * 0.5;
  vec3 side = normalize(cross(uDir, normalize(uCam - mid)) + 1e-4);
  float w = uWidth * (0.55 + aB.z);
  vec3 wp = mid + side * position.x * w + uDir * position.y * uLen;
  // nahe Kamera ausblenden (kein Vollbild-Schleier), am Rand des Gitters ein-/ausblenden
  float t = clamp(dot(uCam - g0, uDir), 0.0, uLen);
  float dl = length(uCam - (g0 + uDir * t));
  vFade = smoothstep(4.0, 12.0, dl) * (1.0 - smoothstep(0.55, 0.95, length(p - c) / (uField * 0.5)));
  vUv = position.xy + 0.5; vPh = aB.w; vWP = wp;
  gl_Position = projectionMatrix * viewMatrix * bendW(vec4(wp, 1.0));
}`;
const SHAFT_F = /* glsl */`
uniform vec3 uSunDir, uCam, uShaftCol; uniform float uTime, uK; uniform vec4 uFog;
varying vec2 vUv; varying float vFade; varying float vPh; varying vec3 vWP;
void main(){
  float x = vUv.x * 2.0 - 1.0;
  float across = (1.0 - x * x); across *= across;
  float along = smoothstep(0.0, 0.3, vUv.y) * (1.0 - smoothstep(0.45, 1.0, vUv.y));
  float shim = 0.6 + 0.4 * sin(uTime * 0.45 + vPh * 6.2831 + vUv.y * 2.5);
  vec3 dv = vWP - uCam; float dist = length(dv);
  float ph = 0.25 + 0.75 * pow(max(dot(dv / dist, uSunDir), 0.0), 3.0);
  float fog = 1.0 - clamp((dist - uFog.x) / (uFog.y - uFog.x), 0.0, 1.0) * 0.8;
  gl_FragColor = vec4(uShaftCol * (across * along * shim * ph * vFade * fog * uK * 2.6), 1.0);
}`;

// ---------------------------------------------------------------- Löwenzahn-Schirmchen + Sonnenstaub (Punkte)
const FLUFF_V = /* glsl */`
uniform float uBend; uniform vec3 uCam;
vec4 bendW(vec4 wp){ vec2 d = wp.xz - uCam.xz; wp.y -= uBend * dot(d, d); return wp; }
uniform float uTime, uPx, uShare, uSlow; uniform vec3 uCenter, uBox, uWind, uSunDir;
attribute vec4 aR;
varying float vA; varying float vRot; varying float vGl; varying float vType;
void main(){
  float t = uTime * uSlow;
  float fl = step(aR.w, uShare); // 1 = Schirmchen, 0 = Staubkorn
  vec3 drift = vec3(uWind.x * t * 0.9 + sin(t * 0.37 + aR.w * 20.0) * 1.3,
                    sin(t * 0.55 + aR.w * 13.0) * 0.7 + t * 0.07 * fl,
                    uWind.y * t * 0.9 + cos(t * 0.31 + aR.w * 9.0) * 1.3);
  vec3 p = aR.xyz * uBox + drift;
  p = mod(p - uCenter + uBox * 0.5, uBox) - uBox * 0.5 + uCenter;
  vec4 mv = viewMatrix * bendW(vec4(p, 1.0));
  float edge = 1.0 - smoothstep(0.32, 0.5, length((p - uCenter).xz / uBox.xz));
  edge *= 1.0 - smoothstep(0.3, 0.5, abs(p.y - uCenter.y) / uBox.y);
  vA = edge * smoothstep(1.2, 3.0, -mv.z);
  vRot = aR.w * 40.0 + t * (0.3 + aR.w * 0.5);
  vGl = pow(max(dot(normalize(p - uCam), uSunDir), 0.0), 4.0);
  vType = fl;
  float size = fl > 0.5 ? 0.3 + aR.w * 0.25 : 0.05 + fract(aR.w * 17.0) * 0.05;
  gl_PointSize = min(size * uPx * projectionMatrix[1][1] * 0.5 / max(-mv.z, 0.1), 96.0);
  gl_Position = projectionMatrix * mv;
}`;
const FLUFF_F = /* glsl */`
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
    a = clamp(ray * 0.85 + tips * 0.6 + core + pow(max(1.0 - r, 0.0), 2.0) * 0.18, 0.0, 1.0);
    c = vec3(1.0, 0.99, 0.95) * (0.9 + 0.25 * uSunCol) + uSunCol * vGl * 1.4;
  } else { // Sonnenstaub: kleines funkelndes Körnchen im Licht
    float tw = 0.45 + 0.55 * sin(uTime * (2.0 + vRot * 0.05) + vRot);
    a = pow(max(1.0 - r, 0.0), 2.5);
    c = (vec3(1.0, 0.95, 0.8) + uSunCol) * (0.8 + 2.2 * vGl) * (0.5 + tw);
  }
  gl_FragColor = vec4(c, a * vA);
  if (gl_FragColor.a < 0.01) discard;
}`;

export class Deko {
  constructor(w, q, k = 1) {
    this.def = w;
    const d = w.deko || {};
    this.group = new THREE.Group();
    // Wiesenblüten
    const g = bloomGeo();
    const off = new Float32Array(MAX.bloom * 4);
    let s = 0x9e3779b9;
    const rnd = () => { s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x6d2b79f5) >>> 0; return (s >>> 8) / 16777216; };
    for (let i = 0; i < MAX.bloom; i++) { off[i * 4] = rnd(); off[i * 4 + 1] = rnd(); off[i * 4 + 2] = rnd(); off[i * 4 + 3] = 0.7 + rnd() * 0.3; }
    g.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 4));
    const pal = [...(d.bloom || w.flowers)]; while (pal.length < 6) pal.push(pal[pal.length % Math.max(1, pal.length)]);
    this.bloom = new THREE.Mesh(g, new THREE.ShaderMaterial({
      uniforms: { ...G, uField: { value: 40 }, uCenter: { value: new THREE.Vector3() }, uPal: { value: pal.slice(0, 6).map(c => new THREE.Color(c)) } },
      vertexShader: BLOOM_V, fragmentShader: BLOOM_F, side: THREE.DoubleSide,
    }));
    this.bloom.frustumCulled = false;
    this.group.add(this.bloom);
    // Lichtstrahlen (nur bei Sonne)
    this.shaft = null;
    if (d.shafts) {
      const sg = new THREE.InstancedBufferGeometry();
      const pl = new THREE.PlaneGeometry(1, 1);
      sg.index = pl.index; sg.attributes.position = pl.attributes.position;
      const b = new Float32Array(MAX.shaft * 4);
      for (let i = 0; i < MAX.shaft; i++) { b[i * 4] = rnd(); b[i * 4 + 1] = rnd(); b[i * 4 + 2] = rnd(); b[i * 4 + 3] = rnd(); }
      sg.setAttribute('aB', new THREE.InstancedBufferAttribute(b, 4));
      const sd = G.uSunDir.value, dir = new THREE.Vector3(sd.x, Math.max(sd.y, 0.55), sd.z).normalize();
      this.shaft = new THREE.Mesh(sg, new THREE.ShaderMaterial({
        uniforms: { ...G, uField: { value: 84 }, uLen: { value: 70 }, uWidth: { value: 5 }, uCenter: { value: new THREE.Vector3() }, uDir: { value: dir },
          uShaftCol: { value: new THREE.Color(d.shaftCol ?? w.sun.col) }, uK: { value: d.shafts } },
        vertexShader: SHAFT_V, fragmentShader: SHAFT_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      }));
      this.shaft.frustumCulled = false; this.shaft.renderOrder = 5;
      this.shaft.material.userData.keinBloom = true; // v2.9 Bloom-Maske: Lichtstrahlen glühen nicht (sonst Milchschleier)
      this.group.add(this.shaft);
    }
    // Schirmchen + Staub
    this.fluff = null;
    if (d.fluff !== undefined) {
      const fg = new THREE.BufferGeometry();
      fg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX.fluff * 3), 3));
      const r = new Float32Array(MAX.fluff * 4); for (let i = 0; i < r.length; i++) r[i] = rnd();
      fg.setAttribute('aR', new THREE.BufferAttribute(r, 4));
      this.fluff = new THREE.Points(fg, new THREE.ShaderMaterial({
        uniforms: { uTime: G.uTime, uBend: G.uBend, uCam: G.uCam, uWind: G.uWind, uSunCol: G.uSunCol, uSunDir: G.uSunDir, uPx: PX,
          uCenter: { value: new THREE.Vector3() }, uBox: { value: new THREE.Vector3(34, 11, 34) }, uShare: { value: d.fluff }, uSlow: { value: RM ? 0.45 : 1 } },
        vertexShader: FLUFF_V, fragmentShader: FLUFF_F, transparent: true, depthWrite: false,
      }));
      this.fluff.frustumCulled = false; this.fluff.renderOrder = 6;
      this.fluff.material.userData.keinBloom = true; // v2.9 Bloom-Maske: Schirmchen/Staub glühen nicht
      this.group.add(this.fluff);
    }
    this.setQuality(q, k);
  }
  // q: Qualitätsstufe, k: 1 = voll, 0,5 = Auto-Drosselung aktiv
  setQuality(q, k = 1) {
    const C = COUNTS[q.id] || COUNTS[1];
    const n = (v) => Math.round(v * k);
    this.bloom.geometry.instanceCount = n(C.bloom); this.bloom.visible = C.bloom > 0;
    if (this.shaft) { this.shaft.geometry.instanceCount = n(C.shaft); this.shaft.visible = C.shaft > 0; }
    if (this.fluff) { this.fluff.geometry.setDrawRange(0, n(C.fluff * (RM ? 0.5 : 1))); this.fluff.visible = C.fluff > 0; }
  }
  update(dt, cam, focus, grassCenter) {
    this.bloom.material.uniforms.uCenter.value.copy(grassCenter);
    // Strahlen-Gitter zur Sonne hin versetzt: dort leuchten sie (Vorwärtsstreuung), hinter der Figur sieht man sie kaum
    if (this.shaft) { const sd = G.uSunDir.value, l = Math.hypot(sd.x, sd.z) || 1; this.shaft.material.uniforms.uCenter.value.set(focus.x + sd.x / l * 26, focus.y, focus.z + sd.z / l * 26); }
    if (this.fluff) this.fluff.material.uniforms.uCenter.value.set(focus.x, focus.y + 1.5, focus.z);
  }
}
