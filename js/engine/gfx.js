// Grafik-Kern: gemeinsame Uniforms, Toon-Shader, Himmel, Post-Processing.
import * as THREE from 'three';
import { DEF } from './deko.js';
import { KANTEN_SR, rtGroesse } from './kern/hochskalieren.js';

// Gemeinsame Uniform-Objekte (per Referenz in allen Materialien geteilt)
export const G = {
  uTime: { value: 0 },
  uSunDir: { value: new THREE.Vector3(0.4, 0.45, 0.3).normalize() },
  uSunCol: { value: new THREE.Color(1, 0.95, 0.85) },
  uSkyAmb: { value: new THREE.Color(0.55, 0.62, 0.8) },
  uGndAmb: { value: new THREE.Color(0.35, 0.4, 0.25) },
  uRim: { value: new THREE.Color(1, 0.9, 0.7) },
  uFogCol: { value: new THREE.Color(0.8, 0.88, 0.95) },
  uFogSun: { value: new THREE.Color(1, 0.9, 0.75) },
  uFog: { value: new THREE.Vector4(40, 260, 0.0, 0.85) }, // near, far, -, max
  uBend: { value: 0.0009 },
  uCam: { value: new THREE.Vector3() },
  uWind: { value: new THREE.Vector3(0.6, 0.3, 0) }, // xz Richtung*Stärke, z = Böe
  uPlayer: { value: new THREE.Vector3(0, -99, 0) },
  // Gelände (identisch zu terrain.js)
  uT1: { value: new THREE.Vector4() },
  uT2: { value: new THREE.Vector4() },
  uT3: { value: new THREE.Vector4() },
  uPond: { value: new THREE.Vector4(9999, 9999, 0.001, 0) },
  uEdge: { value: new THREE.Vector3(120, 180, 22) },
  uGrassA: { value: new THREE.Color(0.1, 0.3, 0.08) },
  uGrassB: { value: new THREE.Color(0.45, 0.7, 0.2) },
  uGrassC: { value: new THREE.Color(0.8, 0.85, 0.35) },
  uWaterY: { value: -99 },
  // v2.3: Sand-/Pfad-Flecken (Stärke, Maßstab, Phase x/z), goldene Graslichter (rgb, Stärke), Wolkenschatten (x, z, r, Stärke)
  uPatch: { value: new THREE.Vector4(0, 1, 0, 0) },
  uGold: { value: new THREE.Vector4(1, 0.9, 0.6, 0) },
  uCloudSh: { value: [0, 1, 2, 3, 4, 5].map(() => new THREE.Vector4(0, 0, 1, 0)) },
  // v2.8 Deko: Stufe (0 = aus/Niedrig, 0,5 = Auto-Drosselung, 1 = voll), Nacht (leuchtende Blüten), Himmelsfarben fürs Wasser
  uDq: { value: 1 },
  uNight: { value: 0 },
  uSkyZen: { value: new THREE.Color(0.4, 0.6, 0.9) },
  uSkyHor: { value: new THREE.Color(0.85, 0.92, 1) },
  // v2.9 Gras-Ringe: Ringmitte (xz) fürs Grasrauschen im Gelände jenseits der Halme
  uRingC: { value: new THREE.Vector3() },
  // v2.9 Himmelslicht: SH9-Irradianz des Welthimmels (himmelslicht.js), Anteil gegenüber der alten Halbkugel (0 = bisher)
  uSH: { value: Array.from({ length: 9 }, () => new THREE.Vector3()) },
  uHimmel: { value: 0 },
  // v2.9 gebackene Baumschatten (schatten.js): R8-Textur über die Welt, x = Weltbreite (m), y = Stärke (0 = aus)
  uBaumSh: { value: null },
  uBaumShP: { value: new THREE.Vector4(320, 0, 0, 0) },
};
// Wolkenschatten: weiche dunkle Flecken, die mit dem Wind über die Wiese ziehen (nur Boden + Gras, kein Draw-Call)
const CLOUD_SH = /* glsl */`
uniform vec4 uCloudSh[6];
float cloudShade(vec2 p){ float s = 0.0;
  for (int i = 0; i < 6; i++) { vec4 c = uCloudSh[i]; s = max(s, c.w * (1.0 - smoothstep(c.z * 0.25, c.z, length(p - c.xy)))); }
  return s; }`;

export const GLSL_TERRAIN = /* glsl */`
uniform vec4 uT1, uT2, uT3, uPond; uniform vec3 uEdge;
float terrainH(vec2 p){
  float h = uT1.x*sin(p.x*uT1.y+uT1.w)*cos(p.y*uT1.z+uT1.w*1.7)
          + uT2.x*sin(p.x*uT2.y+uT2.w)*sin(p.y*uT2.z+uT2.w*0.6)
          + uT3.x*cos(p.x*uT3.y+uT3.w)*cos(p.y*uT3.z-uT3.w);
  float dP = distance(p, uPond.xy);
  h *= mix(0.2, 1.0, smoothstep(uPond.z*0.9, uPond.z*2.4, dP));
  float k = 1.0 - smoothstep(uPond.z*0.55, uPond.z*1.05, dP);
  h = mix(h + 0.5, -uPond.w, k);
  float r = length(p);
  float e = smoothstep(uEdge.x, uEdge.y, r);
  h += uEdge.z * e * e;
  return h;
}
uniform vec4 uPatch;
// Sand-/Pfad-Flecken (identisch zu patchAmt() in terrain.js)
float patchAmt(vec2 p){
  float k = uPatch.y;
  float s = sin(p.x * 0.061 * k + 1.3 + uPatch.z + sin(p.y * 0.031) * 1.7) * sin(p.y * 0.057 * k - 0.7 + uPatch.w + sin(p.x * 0.027) * 1.9);
  return smoothstep(0.62, 0.92, s) * uPatch.x;
}`;

export const V_COMMON = /* glsl */`
uniform float uTime; uniform float uBend; uniform vec3 uCam; uniform vec3 uWind; uniform vec3 uPlayer;
vec4 bendW(vec4 wp){ vec2 d = wp.xz - uCam.xz; wp.y -= uBend * dot(d, d); return wp; }
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
`;

export const F_LIGHT = /* glsl */`
uniform vec3 uSunDir, uSunCol, uSkyAmb, uGndAmb, uRim, uFogCol, uFogSun; uniform vec4 uFog; uniform vec3 uCam;
uniform vec3 uSH[9]; uniform float uHimmel;
// v2.9 weiches Himmelslicht: Irradianz aus SH9 (Basis wie himmelslicht.js shBasis)
vec3 shIrr(vec3 n){
  return uSH[0] * 0.282095 + uSH[1] * (0.488603 * n.y) + uSH[2] * (0.488603 * n.z) + uSH[3] * (0.488603 * n.x)
       + uSH[4] * (1.092548 * n.x * n.y) + uSH[5] * (1.092548 * n.y * n.z) + uSH[6] * (0.315392 * (3.0 * n.z * n.z - 1.0))
       + uSH[7] * (1.092548 * n.x * n.z) + uSH[8] * (0.546274 * (n.x * n.x - n.y * n.y));
}
vec3 applyFog(vec3 col, vec3 wp){
  vec3 dv = wp - uCam; float dist = length(dv);
  float f = clamp((dist - uFog.x) / (uFog.y - uFog.x), 0.0, 1.0);
  f = f * f * (3.0 - 2.0 * f) * uFog.w;
  float s = pow(max(dot(dv / max(dist, 0.001), uSunDir), 0.0), 5.0);
  return mix(col, mix(uFogCol, uFogSun, s), f);
}
vec3 toon(vec3 alb, vec3 N, vec3 V, float rimAmt, float gloss, float soft){
  float ndl = dot(N, uSunDir);
  float l = smoothstep(-0.08 - soft, 0.12 + soft, ndl);
  l *= 0.82 + 0.18 * max(ndl, 0.0);
  vec3 amb = mix(uGndAmb, uSkyAmb, N.y * 0.5 + 0.5);
  if (uHimmel > 0.0) amb = mix(amb, max(shIrr(N), vec3(0.0)), uHimmel);
  vec3 c = alb * (amb + uSunCol * l);
  float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);
  float back = clamp(dot(-V, uSunDir) * 0.5 + 0.5, 0.0, 1.0);
  c += uRim * rimAmt * fres * (0.35 + 1.1 * back * back) * (0.5 + 0.5 * alb);
  if (gloss > 0.0) {
    vec3 H = normalize(uSunDir + V);
    float s = pow(max(dot(N, H), 0.0), 40.0);
    c += uSunCol * gloss * smoothstep(0.45, 0.6, s) * 0.9;
  }
  return c;
}
`;

// ---------------------------------------------------------------- Toon-Material
const TOON_V = /* glsl */`
${V_COMMON}
uniform float uSway; uniform vec3 uFlap;
#ifdef USE_TINT
attribute float tint;
#endif
#ifdef RIG
// v2.4 Tier-Rig: je Vertex Gelenkpunkt + Teil-Code, je Instanz die Bewegung (keine Knochen, kein eigenes Material pro Tier)
attribute vec4 rig;    // xyz Gelenk (lokal), w Teil: 0 Rumpf, 1 Kopf, 2 Auge, 3 Ohr, 4 Bein, 5 Schwanz, 6 Flügel, 7 Freuden-Auge; Nachkomma = Seite/Phase
attribute vec4 aAnim;  // Gang-Phase, Gang-Weite (rad), Kopf-Gier, Kopf-Nicken
attribute vec4 aAnim2; // Blinzeln 0..1, Ohrenzucken (rad), Schwanz/Flügel (rad), Freude 0..1
attribute vec3 aNeck;  // Nacken-Gelenk (lokal)
mat3 rX(float a){ float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
mat3 rY(float a){ float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
mat3 rZ(float a){ float c = cos(a), s = sin(a); return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0); }
#endif
varying vec3 vN; varying vec3 vWP; varying vec4 vCol; varying vec2 vUv;
void main(){
  vec3 pos = position; vec3 nrm = normal;
  vec4 col = vec4(1.0, 1.0, 1.0, 0.0);
#if defined(USE_COLOR_ALPHA)
  col = color;
#elif defined(USE_COLOR)
  col.rgb = color;
#endif
  mat4 m = modelMatrix;
#ifdef USE_INSTANCING
  m = modelMatrix * instanceMatrix;
#endif
#ifdef RIG
  {
    float part = floor(rig.w + 0.01), sub = rig.w - part;
    vec3 pv = rig.xyz;
    float sd = sub > 0.25 ? 1.0 : -1.0;
    if (part > 1.5 && part < 2.5) { // Auge: Blinzeln (senkrecht stauchen), bei Freude ganz zu
      float k = max(1.0 - aAnim2.x, 0.08) * (1.0 - smoothstep(0.3, 0.7, aAnim2.w)); // bei Freude ganz weg (sonst bleibt ein Strich)
      pos.y = pv.y + (pos.y - pv.y) * k;
    } else if (part > 6.5) { // Freuden-Augen ^ ^
      pos = pv + (pos - pv) * aAnim2.w;
    } else if (part > 2.5 && part < 3.5) { // Ohr: zuckt nach außen
      mat3 R = rZ(-sd * aAnim2.y) * rX(-0.35 * aAnim2.y);
      pos = pv + R * (pos - pv); nrm = R * nrm;
    } else if (part > 3.5 && part < 4.5) { // Bein: schwingt im Gang-Zyklus (Nachkomma = Phasenversatz)
      mat3 R = rX(aAnim.y * sin(aAnim.x + sub * 6.2831));
      pos = pv + R * (pos - pv); nrm = R * nrm;
    } else if (part > 4.5 && part < 5.5) { // Schwanz: wedeln
      mat3 R = rY(aAnim2.z) * rZ(aAnim2.z * 0.5);
      pos = pv + R * (pos - pv); nrm = R * nrm;
    } else if (part > 5.5 && part < 6.5) { // Flügel: heben
      mat3 R = rZ(sd * aAnim2.z);
      pos = pv + R * (pos - pv); nrm = R * nrm;
    }
    if ((part > 0.5 && part < 3.5) || part > 6.5) { // alles am Kopf: zum Spieler drehen / nicken
      mat3 H = rY(aAnim.z) * rX(-aAnim.w);
      pos = aNeck + H * (pos - aNeck); nrm = H * nrm;
    }
  }
#endif
#ifdef USE_INSTANCING_COLOR
  #ifdef USE_TINT
  col.rgb *= mix(vec3(1.0), instanceColor, tint);
  #else
  col.rgb *= instanceColor;
  #endif
#endif
#ifdef WINGFLAP
  float ph = hash12(m[3].xz) * 6.2831;
  float side = pos.x >= 0.0 ? 1.0 : -1.0;
  float a = side * (uFlap.x + uFlap.y * sin(uTime * uFlap.z + ph));
  float ca = cos(a), sa = sin(a);
  pos.xy = vec2(pos.x * ca - pos.y * sa, pos.x * sa + pos.y * ca);
  nrm.xy = vec2(nrm.x * ca - nrm.y * sa, nrm.x * sa + nrm.y * ca);
#endif
  vec4 wp = m * vec4(pos, 1.0);
#ifdef SWAY
  // v2.3: Phase + Stärke je Instanz → Felder schaukeln versetzt, nicht im Gleichtakt
  float ih = hash12(m[3].xz + 0.37);
  float hh = max(position.y, 0.0) * uSway * (0.7 + 0.6 * ih);
  float ph2 = dot(wp.xz, vec2(0.21, 0.17)) + ih * 6.2831;
  float g = 0.55 + 0.45 * sin(uTime * (1.6 + 0.6 * ih) + ph2) + uWind.z * 0.8;
  wp.xz += uWind.xy * g * hh + vec2(sin(uTime * 2.7 + ph2 * 1.3), cos(uTime * 2.3 + ph2)) * 0.12 * hh;
#endif
  vN = normalize(mat3(m) * nrm);
  vWP = wp.xyz; vCol = col; vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * bendW(wp);
}`;

const TOON_F = /* glsl */`
${F_LIGHT}
uniform vec3 uColor; uniform float uRimAmt, uGloss, uEmis, uSoft, uOpacity;
#ifdef DEKO
uniform float uDq;
#endif
#ifdef USE_MAPX
uniform sampler2D uMap; uniform vec3 uWA, uWB, uWC;
#endif
varying vec3 vN; varying vec3 vWP; varying vec4 vCol; varying vec2 vUv;
void main(){
  vec3 alb = uColor * vCol.rgb;
  float alpha = uOpacity;
#ifdef USE_MAPX
  vec4 mk = texture2D(uMap, vUv);
  #ifdef WINGMASK
  vec3 wa = uWA; vec3 wb = uWB;
    #ifdef USE_INSTANCE_WING
    wa = vCol.rgb; wb = mix(vCol.rgb, vec3(1.0, 0.95, 0.75), 0.55);
    #endif
  alb = mix(wa, wb, mk.g);
  alb = mix(alb, uWC, mk.b);
  alb = mix(alb, vec3(1.0), mk.r * 0.9);
  #else
  alb *= mk.rgb;
  #endif
  alpha *= mk.a;
#endif
#ifdef ALPHATEST
  if (alpha < ALPHATEST) discard;
#endif
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(uCam - vWP);
  vec3 c = toon(alb, N, V, uRimAmt, uGloss, uSoft);
#if defined(WINGMASK) || defined(TRANSLUCENT)
  // Durchscheinen bei Gegenlicht (Flügel leuchten in der Sonne)
  float tr = pow(clamp(dot(-V, uSunDir), 0.0, 1.0), 2.0) * 0.6;
  c += alb * uSunCol * tr;
#endif
#if (defined(WINGMASK) || defined(IRI)) && defined(DEKO)
  // v2.8: Perlmutt-Schimmer – der Farbton wandert mit Blickwinkel und Flügelschlag, am Rand am stärksten (nicht auf Niedrig)
  if (uDq > 0.0) {
  float nv = dot(N, V);
  vec3 iri = 0.5 + 0.5 * cos(6.2831 * (nv * 1.4 + vUv.x * 0.6 + vec3(0.0, 0.33, 0.67)));
  c += iri * (0.06 + 0.22 * pow(1.0 - abs(nv), 2.0)) * (0.35 + 0.65 * dot(alb, vec3(0.33))) * (uSkyAmb + uSunCol * 0.5);
  }
#endif
  c = mix(c, alb * (1.0 + uEmis), clamp(vCol.a + uEmis, 0.0, 1.0));
#ifdef CLOUD
  // weiche Wolkenkanten: Silhouette geht in den Dunst über
  float ef = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.0);
  c = mix(c, mix(uFogCol, vec3(1.0), 0.45) * uSkyAmb * 1.1, ef * 0.45);
#endif
  c = applyFog(c, vWP);
  gl_FragColor = vec4(c, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function toonMat(o = {}) {
  const defines = {};
  if (o.map) defines.USE_MAPX = '';
  if (o.wing) defines.WINGMASK = '';
  if (o.trans) defines.TRANSLUCENT = '';
  if (o.instWing) defines.USE_INSTANCE_WING = '';
  if (o.sway) defines.SWAY = '';
  if (o.flap) defines.WINGFLAP = '';
  if (o.tint) defines.USE_TINT = '';
  if (o.cloud) defines.CLOUD = '';
  if (o.rig) defines.RIG = '';
  if (o.iri) defines.IRI = ''; // v2.8: Perlmutt-Schimmer (Glasflügel)
  if (o.alphaTest) defines.ALPHATEST = o.alphaTest.toFixed(3);
  const u = {
    ...G,
    uColor: { value: new THREE.Color(o.color ?? 0xffffff) },
    uRimAmt: { value: o.rim ?? 0.55 },
    uGloss: { value: o.gloss ?? 0 },
    uEmis: { value: o.emis ?? 0 },
    uSoft: { value: o.soft ?? 0.05 },
    uOpacity: { value: o.opacity ?? 1 },
    uSway: { value: o.sway ?? 0 },
    uFlap: { value: new THREE.Vector3(...(o.flap || [0.3, 0.9, 20])) },
    uMap: { value: o.map || null },
    uWA: { value: new THREE.Color(o.wa ?? 0xff9a3c) },
    uWB: { value: new THREE.Color(o.wb ?? 0xffd36b) },
    uWC: { value: new THREE.Color(o.wc ?? 0x3a2418) },
  };
  const m = new THREE.ShaderMaterial({
    uniforms: u, defines, vertexShader: TOON_V, fragmentShader: DEF + TOON_F,
    vertexColors: !!o.vc, side: o.side ?? THREE.FrontSide,
    transparent: !!o.transparent, depthWrite: o.depthWrite ?? !o.transparent, depthTest: o.depthTest ?? true,
  });
  if (o.blending) m.blending = o.blending;
  return m;
}

// ---------------------------------------------------------------- Kontaktschatten (v2.4, instanziert, mit Weltkrümmung)
const BLOB_V = /* glsl */`
${V_COMMON}
varying vec2 vUv;
void main(){
  mat4 m = modelMatrix;
#ifdef USE_INSTANCING
  m = modelMatrix * instanceMatrix;
#endif
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * bendW(m * vec4(position, 1.0));
}`;
const BLOB_F = /* glsl */`
uniform vec3 uColor; uniform float uOpacity;
varying vec2 vUv;
void main(){
  float d = length(vUv - 0.5) * 2.0;
  float a = (1.0 - smoothstep(0.15, 1.0, d)); a *= a;
  gl_FragColor = vec4(uColor, a * uOpacity);
}`;
export function blobShadowMat(color = 0x1a2a10, opacity = 0.34) {
  const m = new THREE.ShaderMaterial({
    uniforms: { ...G, uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity } },
    vertexShader: BLOB_V, fragmentShader: BLOB_F, transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  m.userData.keinBloom = true; // v2.9 Bloom-Maske: Schatten glühen nie
  return m;
}

// v2.9 gerichteter Kontaktschatten (schatten.js kontaktParameter): weiche Ellipse mit dichterem Kern, Größe/Richtung
// über Skalierung/Drehung des Quads (PlaneGeometry 2×2 in xz), mit Weltkrümmung wie der Boden
const KONTAKT_F = /* glsl */`
uniform vec3 uColor; uniform float uOpacity;
varying vec2 vUv;
void main(){
  float d = length(vUv - 0.5) * 2.0;
  float a = pow(max(0.0, 1.0 - smoothstep(0.1, 1.0, d)), 1.6) * (0.65 + 0.35 * (1.0 - min(1.0, d)));
  gl_FragColor = vec4(uColor, a * uOpacity);
}`;
export function kontaktMat(color = 0x1a2a10, opacity = 0.4) {
  const m = new THREE.ShaderMaterial({
    uniforms: { ...G, uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity } },
    vertexShader: BLOB_V, fragmentShader: KONTAKT_F, transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  m.userData.keinBloom = true;
  return m;
}

// ---------------------------------------------------------------- Gelände
const TERRAIN_V = /* glsl */`
${V_COMMON}
varying vec3 vN; varying vec3 vWP; varying vec3 vCol;
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vN = normalize(mat3(modelMatrix) * normal);
  vWP = wp.xyz; vCol = color;
  gl_Position = projectionMatrix * viewMatrix * bendW(wp);
}`;
const TERRAIN_F = /* glsl */`
${F_LIGHT}
${CLOUD_SH}
uniform float uTime; uniform float uWaterY;
varying vec3 vN; varying vec3 vWP; varying vec3 vCol;
uniform sampler2D uBaumSh; uniform vec4 uBaumShP;
#ifdef RINGE
${GLSL_TERRAIN}
uniform vec3 uGrassA, uGrassB, uRingC;
#endif
float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  float a = fract(sin(dot(i, vec2(127.1,311.7)))*43758.5453), b = fract(sin(dot(i+vec2(1,0), vec2(127.1,311.7)))*43758.5453);
  float c = fract(sin(dot(i+vec2(0,1), vec2(127.1,311.7)))*43758.5453), d = fract(sin(dot(i+vec2(1,1), vec2(127.1,311.7)))*43758.5453);
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y); }
void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(uCam - vWP);
  float n = n2(vWP.xz * 0.35) * 0.5 + n2(vWP.xz * 1.3) * 0.3 + n2(vWP.xz * 0.07) * 0.2;
  vec3 alb = vCol * (0.86 + 0.28 * n);
  // nasser Uferstreifen
  float wet = 1.0 - smoothstep(uWaterY + 0.05, uWaterY + 0.6, vWP.y);
  alb = mix(alb, alb * vec3(0.62, 0.66, 0.7), wet * 0.8);
#ifdef RINGE
  // v2.9 Fernring: keine Halme mehr, dafür Grasrauschen – Farbe Richtung Gras, feine Büschel-Flecken; Amplitude sinkt,
  // wenn das Muster kleiner als ein Pixel wird (kein Flimmern). Nicht auf Sand/Pfad, Ufer, Wasser, Randhügeln.
  // TODO Heavy-Job: Stärke (0,35/0,16) und Frequenzen am Bild abstimmen (Übergang am Ring-Rand 24–31 m)
  {
    float dG = length(vWP.xz - uRingC.xz);
    float fG = smoothstep(22.0, 32.0, dG) * (1.0 - smoothstep(uEdge.x + 25.0, uEdge.x + 50.0, length(vWP.xz)));
    fG *= (1.0 - wet) * smoothstep(uWaterY + 0.45, uWaterY + 0.95, vWP.y) * (1.0 - clamp(patchAmt(vWP.xz) * 1.4, 0.0, 1.0));
    vec2 q = vWP.xz * vec2(2.3, 1.7);
    float aa = 1.0 - smoothstep(0.25, 0.7, max(fwidth(q.x), fwidth(q.y)));
    float gn = n2(q) * 0.6 + n2(q * 2.1 + 7.3) * 0.4;
    vec3 gc = mix(uGrassA, uGrassB, 0.55 + 0.35 * n2(vWP.xz * 0.21));
    alb = mix(alb, gc, 0.35 * fG);
    alb *= 1.0 + 0.16 * fG * aa * (gn - 0.5) * 2.0;
  }
#endif
  vec3 c = toon(alb, N, V, 0.12, 0.0, 0.25);
  // v2.9 gebackene Baumschatten (nur das Sonnenlicht fehlt dort – genähert als Abdunkeln)
  if (uBaumShP.y > 0.0) c *= 1.0 - texture2D(uBaumSh, vWP.xz / uBaumShP.x + 0.5).r * uBaumShP.y;
  c *= 1.0 - cloudShade(vWP.xz);
  c = applyFog(c, vWP);
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
// o.ringe (v2.9): Grasrauschen jenseits der Gras-Ringe
export function terrainMat(o = {}) {
  const m = new THREE.ShaderMaterial({ uniforms: G, vertexShader: TERRAIN_V, fragmentShader: TERRAIN_F, vertexColors: true });
  if (o.ringe) m.defines = { RINGE: '' };
  return m;
}

// ---------------------------------------------------------------- Gras (instanziert, folgt dem Spieler)
const GRASS_V = /* glsl */`
${V_COMMON}
${GLSL_TERRAIN}
uniform float uField; uniform vec3 uCenter; uniform float uWaterY;
attribute vec4 aOff; // x,z in [0,1), rand, scale
varying vec3 vWP; varying float vH; varying float vR; varying float vWave; varying vec3 vN;
uniform sampler2D uBaumSh; uniform vec4 uBaumShP; varying float vBs; // v2.9 Baumschatten am Halmfuß
#ifdef RINGE
uniform vec4 uRing; uniform float uBreite; // v2.9: Ring (innen a→b einblenden, außen c→d ausblenden), Büschelbreite
uniform vec3 uWrapC; // v2.9: Wickel-Mitte, aufs Kachelraster gerastet (grasringe.js wickelMitte)
#endif
#ifdef DEKO
varying vec3 vPat; // v2.8: Farbmuster je Halm (Fleck, Goldlicht, Büschel) – im Vertex- statt Pixel-Shader
uniform float uDq;
#endif
void main(){
  vec2 base = aOff.xy * uField;
  vec2 c = uCenter.xz;
#ifdef RINGE
  vec2 p = mod(base - uWrapC.xz + uField * 0.5, uField) - uField * 0.5 + uWrapC.xz;
#else
  vec2 p = mod(base - c + uField * 0.5, uField) - uField * 0.5 + c;
#endif
  float gh = terrainH(p);
  float dist = length(p - uCam.xz);
#ifdef RINGE
  float dc = length(p - c);
  float s = aOff.w * smoothstep(uRing.x, uRing.y, dc) * (1.0 - smoothstep(uRing.z, uRing.w, dc));
#else
  float s = aOff.w * (1.0 - smoothstep(uField * 0.30, uField * 0.48, length(p - c)));
#endif
  s *= smoothstep(uWaterY + 0.45, uWaterY + 0.95, gh);
  s *= 1.0 - smoothstep(uEdge.x + 25.0, uEdge.x + 50.0, length(p));
  s *= smoothstep(0.8, 3.2, length(p - uCam.xz)); // keine Riesenhalme direkt vor der Kamera
  s *= 1.0 - 1.1 * patchAmt(p); // v2.3: Sand-/Pfad-Flecken bleiben licht
  float ang = aOff.z * 6.2831;
  float ca = cos(ang), sa = sin(ang);
  vec3 lp = position * vec3(1.0 + aOff.z * 0.6, s, 1.0);
#ifdef RINGE
  lp.xz *= uBreite;
#endif
  lp.xz = vec2(lp.x * ca - lp.z * sa, lp.x * sa + lp.z * ca);
  float t = position.y; // 0..1 Blatthöhe
  // Wind: große wandernde Wellen + Flattern
  float wave = sin(dot(p, normalize(uWind.xy + 0.001)) * 0.18 - uTime * 2.2) * 0.5 + 0.5;
  wave = wave * wave;
  vec2 wdir = uWind.xy;
  vec2 bend = wdir * (0.35 + 0.9 * wave + uWind.z) + vec2(sin(uTime * 3.1 + aOff.z * 20.0), cos(uTime * 2.7 + aOff.z * 17.0)) * 0.08;
  // Spieler drückt Gras weg
  vec2 dp = p - uPlayer.xz;
  float pd = length(dp);
  float push = (1.0 - smoothstep(0.0, 2.6, pd)) * (1.0 - smoothstep(0.5, 3.0, uPlayer.y - gh));
  bend += normalize(dp + 0.001) * push * 1.4;
  lp.xz += bend * t * t * s;
  lp.y -= length(bend) * t * t * s * 0.25;
  vec4 wp = vec4(p.x + lp.x, gh + lp.y, p.y + lp.z, 1.0);
  vWP = wp.xyz; vH = t; vR = aOff.z; vWave = wave;
#ifdef DEKO
  if (uDq > 0.0) vPat = vec3(sin(p.x * 0.07 + sin(p.y * 0.05) * 2.0) * 0.5 + 0.5,
              smoothstep(0.55, 0.95, sin(p.x * 0.043 + sin(p.y * 0.061) * 2.3) * sin(p.y * 0.039 - 1.1 + sin(p.x * 0.05))),
              sin(p.x * 0.29 + sin(p.y * 0.23) * 1.7) * sin(p.y * 0.26 - sin(p.x * 0.19) * 1.3));
  else vPat = vec3(0.0);
#endif
  vN = normalize(vec3(-sa * 0.3 + bend.x * 0.4, 1.0, ca * 0.3 + bend.y * 0.4));
  vBs = uBaumShP.y > 0.0 ? texture2D(uBaumSh, p / uBaumShP.x + 0.5).r * uBaumShP.y : 0.0;
  gl_Position = projectionMatrix * viewMatrix * bendW(wp);
}`;
const GRASS_F = /* glsl */`
${F_LIGHT}
${CLOUD_SH}
uniform vec3 uGrassA, uGrassB, uGrassC; uniform vec4 uGold;
varying vec3 vWP; varying float vH; varying float vR; varying float vWave; varying vec3 vN; varying float vBs;
#ifdef DEKO
varying vec3 vPat; uniform float uDq;
#endif
void main(){
#ifdef DEKO
  float patchN, gold;
  if (uDq > 0.0) { patchN = vPat.x; gold = vPat.y; }
  else { // Stufe Niedrig: wie bis v2.7 je Pixel
    patchN = sin(vWP.x * 0.07 + sin(vWP.z * 0.05) * 2.0) * 0.5 + 0.5;
    gold = smoothstep(0.55, 0.95, sin(vWP.x * 0.043 + sin(vWP.z * 0.061) * 2.3) * sin(vWP.z * 0.039 - 1.1 + sin(vWP.x * 0.05)));
  }
#else
  float patchN = sin(vWP.x * 0.07 + sin(vWP.z * 0.05) * 2.0) * 0.5 + 0.5;
  // v2.3: goldene Lichtflecken (Morgen/Goldene Stunde)
  float gold = smoothstep(0.55, 0.95, sin(vWP.x * 0.043 + sin(vWP.z * 0.061) * 2.3) * sin(vWP.z * 0.039 - 1.1 + sin(vWP.x * 0.05)));
#endif
  vec3 tip = mix(uGrassB, uGrassC, patchN * 0.7 + vR * 0.3);
  tip = mix(tip, uGold.rgb, uGold.a * gold);
  vec3 alb = mix(uGrassA, tip, smoothstep(0.0, 1.0, vH));
#ifdef DEKO
  // v2.8: Büschel unterschiedlich satt/hell, vereinzelt sonnengelbe Halme, Windwellen als heller Glanz über die Wiese
  // (Stufe Niedrig: wie bisher)
  if (uDq > 0.0) {
    alb *= 0.9 + 0.2 * fract(vR * 7.3) + 0.07 * vPat.z;
    alb = mix(alb, mix(alb, uGrassC * 1.1, 0.55), smoothstep(0.8, 1.0, fract(vR * 3.7)) * vH);
    alb += (uSunCol * 0.09 + vec3(0.05, 0.06, 0.02)) * vWave * vWave * vH * 1.6;
  } else alb += vec3(0.07, 0.08, 0.03) * vWave * vH;
#else
  alb += vec3(0.07, 0.08, 0.03) * vWave * vH;
#endif
  vec3 V = normalize(uCam - vWP);
  float ndl = clamp(dot(normalize(vN), uSunDir), 0.0, 1.0);
  vec3 amb = mix(uGndAmb, uSkyAmb, 0.6 + 0.4 * vH);
  if (uHimmel > 0.0) amb = mix(amb, max(mix(shIrr(vec3(0.0, -1.0, 0.0)), shIrr(vec3(0.0, 1.0, 0.0)), 0.6 + 0.4 * vH), vec3(0.0)), uHimmel);
  vec3 c = alb * (amb * 0.9 + uSunCol * (0.62 + 0.38 * ndl) * (0.7 + 0.3 * vH));
  // Durchleuchten gegen die Sonne (goldene Grasspitzen)
  float back = pow(clamp(dot(-V, uSunDir), 0.0, 1.0), 3.0);
  c += uSunCol * tip * back * vH * vH * 0.9;
  c *= 1.0 - vBs;
  c *= 1.0 - cloudShade(vWP.xz);
  c = applyFog(c, vWP);
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
// ring (v2.9): { rIn: [a, b], rOut: [c, d], breite } → Gras-Ring statt Feld mit fester Ausblendung
export function grassMat(field, ring = null) {
  const m = new THREE.ShaderMaterial({
    uniforms: { ...G, uField: { value: field }, uCenter: { value: new THREE.Vector3() },
      uRing: { value: new THREE.Vector4(...(ring ? [...ring.rIn, ...ring.rOut] : [-1, 0, 19, 31])) }, uBreite: { value: ring ? ring.breite : 1 },
      uWrapC: { value: new THREE.Vector3() } },
    vertexShader: DEF + GRASS_V, fragmentShader: DEF + GRASS_F, side: THREE.DoubleSide,
  });
  if (ring) m.defines = { RINGE: '' };
  return m;
}

// ---------------------------------------------------------------- Himmel
const SKY_V = /* glsl */`
varying vec3 vDir;
#ifdef DEKO
// v2.8: Milchstraßen-Wolken je Eckpunkt (feine Himmelskugel) statt je Pixel – spart die teure Rauschfunktion im Pixel-Shader
uniform float uStars, uDq;
varying vec2 vMw; // Band-Stärke, Wolkigkeit
float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1.0, 0.0, 0.0)), f.x), mix(h3(i + vec3(0.0, 1.0, 0.0)), h3(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
             mix(mix(h3(i + vec3(0.0, 0.0, 1.0)), h3(i + vec3(1.0, 0.0, 1.0)), f.x), mix(h3(i + vec3(0.0, 1.0, 1.0)), h3(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z); }
#endif
void main(){ vDir = position;
#ifdef DEKO
  vMw = vec2(0.0);
  if (uStars > 0.0 && uDq > 0.0) {
    vec3 d = normalize(position);
    float bd = dot(d, normalize(vec3(0.42, 0.62, -0.66)));
    vMw.x = exp(-bd * bd * 20.0) * smoothstep(0.02, 0.35, d.y);
    vMw.y = vn(d * 7.0) * 0.65 + vn(d * 11.0 + 4.1) * 0.35;
  }
#endif
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`;
const SKY_F = /* glsl */`
uniform vec3 uZenith, uHorizon, uSunDir, uSunCol, uGlow, uMoonDir; uniform float uSunSize, uStars, uTime, uMoon;
uniform float uRainbow, uShootT; uniform vec3 uShootA, uShootB;
uniform float uDq;
varying vec3 vDir;
float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
#ifdef DEKO
varying vec2 vMw;
#endif
void main(){
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = mix(uHorizon, uZenith, pow(smoothstep(-0.05, 0.75, h), 0.8));
  float sd = max(dot(d, uSunDir), 0.0);
  col += uGlow * (pow(sd, 10.0) * 0.2 + pow(sd, 64.0) * 0.35);
  col += uGlow * 0.25 * pow(1.0 - abs(h), 6.0) * pow(sd * 0.5 + 0.5, 4.0);
  float disk = smoothstep(cos(uSunSize * 1.15), cos(uSunSize), dot(d, uSunDir));
  col += uSunCol * disk * 5.0;
  if (uStars > 0.0) {
    vec3 p = d * 180.0; vec3 cell = floor(p); float r = h3(cell);
    vec3 f = fract(p) - 0.5;
    float st = step(0.975, r) * smoothstep(0.22, 0.0, length(f)) * smoothstep(0.0, 0.25, h);
    // v2.3: kräftigeres Funkeln (alt: 0,6 + 0,4·sin), manche Sterne leicht bläulich/golden
    float tw = 0.5 + 0.5 * sin(uTime * (1.3 + r * 4.0) + r * 40.0);
    st *= 0.3 + 0.7 * tw * tw;
    col += mix(vec3(1.0, 0.95, 0.85), vec3(0.8, 0.88, 1.0), fract(r * 7.0)) * st * uStars * 1.8;
#ifdef DEKO
    if (uDq > 0.0) {
      // v2.8: Milchstraße – schräges, wolkiges Band mit vielen feinen Sternen
      float band = vMw.x, cl = vMw.y;
      col += mix(vec3(0.3, 0.28, 0.55), vec3(0.62, 0.5, 0.75), cl) * band * (0.12 + 0.5 * cl * cl) * 0.5 * uStars;
      if (band > 0.04) { // viele feine Sterne nur im Band (spart Rechenarbeit am übrigen Himmel)
        vec3 p2 = d * 420.0; float r2 = h3(floor(p2));
        float st2 = step(0.99 - band * 0.05, r2) * smoothstep(0.32, 0.05, length(fract(p2) - 0.5));
        col += vec3(0.85, 0.88, 1.0) * st2 * (0.35 + 0.65 * fract(r2 * 31.0)) * 0.9 * uStars;
      }
    }
#endif
    // Sternschnuppe (Kopf + ausblendender Schweif, alle ~20 s)
    if (uShootT >= 0.0) {
      vec3 hd = normalize(mix(uShootA, uShootB, uShootT)), tl = normalize(mix(uShootA, uShootB, max(0.0, uShootT - 0.28)));
      vec3 ab = hd - tl; float tt = clamp(dot(d - tl, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
      float dl = length(d - (tl + ab * tt));
      col += vec3(1.0, 0.96, 0.86) * smoothstep(0.0035, 0.0, dl) * tt * tt * sin(3.14159 * uShootT) * 2.6;
    }
  }
  if (uRainbow > 0.0) { // dezenter Regenbogen gegenüber der Sonne (≈ 42°)
    float ang = acos(clamp(dot(d, -uSunDir), -1.0, 1.0));
    float t = (ang - 0.695) / 0.075;
    if (t > 0.0 && t < 1.0) {
      vec3 rb = clamp(abs(fract(vec3(0.78 - t * 0.8) + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0) - 1.0, 0.0, 1.0);
      col = mix(col, rb * 1.05 + 0.1, sin(3.14159 * t) * 0.2 * uRainbow * smoothstep(0.0, 0.06, h) * (1.0 - smoothstep(0.2, 0.36, h)));
    }
  }
  if (uMoon > 0.0) {
    float md = dot(d, uMoonDir);
#ifdef DEKO
    // v2.8: Mond mit Meeren und Randverdunklung (nicht mehr nur ein heller Fleck), zarter Hof-Ring (nur in Mondnähe gerechnet;
    // Stufe Niedrig: Mond wie bisher)
    if (uDq <= 0.0) col += vec3(1.0, 0.97, 0.88) * smoothstep(0.9993, 0.9996, md) * 2.2 * uMoon;
    else if (md > 0.96) {
    vec3 mt1 = normalize(cross(uMoonDir, vec3(0.0, 1.0, 0.0))), mt2 = cross(mt1, uMoonDir);
    vec2 mq = vec2(dot(d, mt1), dot(d, mt2)) / 0.042;
    float mr = length(mq);
    float disk = smoothstep(1.0, 0.92, mr) * step(0.0, md);
    float mare = smoothstep(0.45, 0.18, length(mq - vec2(-0.25, 0.2))) * 0.55 + smoothstep(0.32, 0.12, length(mq - vec2(0.32, -0.18))) * 0.45
               + smoothstep(0.22, 0.07, length(mq - vec2(0.05, 0.52))) * 0.4 + smoothstep(0.15, 0.05, length(mq - vec2(0.45, 0.42))) * 0.35
               + smoothstep(0.12, 0.03, length(mq - vec2(-0.5, -0.4))) * 0.3;
    vec3 mc = vec3(1.0, 0.96, 0.86) * (1.0 - 0.42 * mare) * (1.0 - 0.25 * mr * mr);
    col = mix(col, mc * 0.92, disk * uMoon);
    col += vec3(0.75, 0.8, 1.0) * smoothstep(0.035, 0.0, abs(acos(clamp(md, -1.0, 1.0)) - 0.2)) * 0.04 * uMoon;
    }
#else
    col += vec3(1.0, 0.97, 0.88) * smoothstep(0.9993, 0.9996, md) * 2.2 * uMoon;
#endif
    col += vec3(0.6, 0.65, 0.9) * pow(max(md, 0.0), 60.0) * 0.3 * uMoon;
    col += vec3(0.55, 0.6, 0.95) * pow(max(md, 0.0), 14.0) * 0.1 * uMoon; // v2.3: weicherer, weiter Halo
  }
  // Dither gegen Farbstufen
  col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
export function skyMat() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uZenith: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() },
      uSunDir: G.uSunDir, uSunCol: { value: new THREE.Color() }, uGlow: { value: new THREE.Color() },
      uSunSize: { value: 0.045 }, uStars: { value: 0 }, uTime: G.uTime,
      uMoonDir: { value: new THREE.Vector3(-0.5, 0.4, -0.6).normalize() }, uMoon: { value: 0 },
      uRainbow: { value: 0 }, uDq: G.uDq, uShootT: { value: -1 }, uShootA: { value: new THREE.Vector3(0, 0.5, 1) }, uShootB: { value: new THREE.Vector3(0.3, 0.4, 1) },
    },
    vertexShader: DEF + SKY_V, fragmentShader: DEF + SKY_F, side: THREE.BackSide, depthWrite: false,
  });
}

// ---------------------------------------------------------------- Ferne Berge (Alto-artige Silhouetten)
const FAR_V = /* glsl */`
uniform vec3 uCam;
varying vec3 vCol; varying float vY; varying vec3 vWP;
void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vCol = color; vY = uv.y; vWP = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp; }`;
const FAR_F = /* glsl */`
uniform vec3 uFogCol, uFogSun, uSunDir, uCam, uRim;
varying vec3 vCol; varying float vY; varying vec3 vWP;
void main(){
  vec3 dv = normalize(vWP - uCam);
  float s = pow(max(dot(dv, uSunDir), 0.0), 4.0);
  vec3 mist = mix(uFogCol, uFogSun, s);
  vec3 c = mix(mist, vCol, smoothstep(0.0, 1.0, vY) * 0.85 + 0.15);
  c += uRim * 0.25 * s * smoothstep(0.8, 1.0, vY);
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
export function farMat() {
  return new THREE.ShaderMaterial({ uniforms: G, vertexShader: FAR_V, fragmentShader: FAR_F, vertexColors: true });
}

// ---------------------------------------------------------------- Leucht-Billboards (instanziert, additiv)
const GLOW_V = /* glsl */`
${V_COMMON}
varying vec2 vUv; varying vec3 vC; varying float vFog;
uniform float uPulse;
void main(){
  mat4 m = modelMatrix;
#ifdef USE_INSTANCING
  m = modelMatrix * instanceMatrix;
#endif
  vec4 center = bendW(m * vec4(0.0, 0.0, 0.0, 1.0));
  float sc = length(m[0].xyz);
  float ph = hash12(m[3].xz) * 6.2831;
  sc *= 1.0 + uPulse * sin(uTime * 3.0 + ph);
  vec4 mv = viewMatrix * center;
  mv.xy += position.xy * sc;
  vUv = uv;
  vC = vec3(1.0);
#ifdef USE_INSTANCING_COLOR
  vC = instanceColor;
#endif
  vFog = clamp(length(mv.xyz) / 260.0, 0.0, 1.0);
  gl_Position = projectionMatrix * mv;
}`;
const GLOW_F = /* glsl */`
uniform vec3 uColor; uniform float uIntensity;
varying vec2 vUv; varying vec3 vC; varying float vFog;
void main(){
  float d = length(vUv - 0.5) * 2.0;
  float a = pow(max(1.0 - d, 0.0), 2.2) + 0.6 * pow(max(1.0 - d, 0.0), 8.0);
  vec3 c = uColor * vC * a * uIntensity * (1.0 - vFog * 0.8);
  gl_FragColor = vec4(c, 1.0);
}`;
export function glowMat(color = 0xfff0b0, intensity = 1, pulse = 0.12) {
  return new THREE.ShaderMaterial({
    uniforms: { ...G, uColor: { value: new THREE.Color(color) }, uIntensity: { value: intensity }, uPulse: { value: pulse } },
    vertexShader: GLOW_V, fragmentShader: GLOW_F,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
}

// ---------------------------------------------------------------- Post-Processing
const FS_V = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const DOWN_F = /* glsl */`
uniform sampler2D tSrc; uniform vec2 uTexel; varying vec2 vUv;
void main(){
  vec3 c = texture2D(tSrc, vUv + uTexel * vec2(-1.0, -1.0)).rgb + texture2D(tSrc, vUv + uTexel * vec2(1.0, -1.0)).rgb
         + texture2D(tSrc, vUv + uTexel * vec2(-1.0, 1.0)).rgb + texture2D(tSrc, vUv + uTexel * vec2(1.0, 1.0)).rgb;
  gl_FragColor = vec4(min(c * 0.25, vec3(16.0)), 1.0);
}`;
const BLUR_F = /* glsl */`
uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
void main(){
  vec3 c = texture2D(tSrc, vUv).rgb * 0.2270270270;
  c += texture2D(tSrc, vUv + uDir * 1.3846153846).rgb * 0.3162162162;
  c += texture2D(tSrc, vUv - uDir * 1.3846153846).rgb * 0.3162162162;
  c += texture2D(tSrc, vUv + uDir * 3.2307692308).rgb * 0.0702702703;
  c += texture2D(tSrc, vUv - uDir * 3.2307692308).rgb * 0.0702702703;
  gl_FragColor = vec4(c, 1.0);
}`;
const COMP_F = /* glsl */`
uniform sampler2D tCol, tBlur, tBlur2, tDepth; uniform vec2 uNF; uniform float uBloom, uThresh, uDof, uFocus, uVig, uSat, uUseDepth;
uniform vec3 uLift, uGain; uniform float uFlash; uniform vec3 uFlashCol;
varying vec2 vUv;
${KANTEN_SR}
float linDepth(float d){ float z = d * 2.0 - 1.0; return 2.0 * uNF.x * uNF.y / (uNF.y + uNF.x - z * (uNF.y - uNF.x)); }
void main(){
  // v2.9: kantenbewusstes Hochskalieren aus der Renderskala (+ Kantenglättung/Schärfen je Stufe; ohne defines = wie bisher)
  vec3 c = kantenSR(tCol, vUv);
  vec3 b = texture2D(tBlur, vUv).rgb;
  vec3 b2 = texture2D(tBlur2, vUv).rgb;
  if (uUseDepth > 0.5) {
    float z = linDepth(texture2D(tDepth, vUv).r);
    float dof = smoothstep(uFocus, uFocus * 5.0, z) * uDof;
    c = mix(c, b, dof);
  }
  vec3 glow = max(b - uThresh, 0.0) * 0.6 + max(b2 - uThresh * 0.8, 0.0) * 0.8;
  c += glow * uBloom;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, uSat);
  c = c * uGain + uLift * (1.0 - clamp(c, 0.0, 1.0)) * 0.08;
  vec2 q = vUv - 0.5;
  c *= 1.0 - uVig * dot(q, q) * 1.6;
  c = mix(c, uFlashCol, uFlash);
  c += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class Post {
  constructor(renderer) {
    this.r = renderer;
    const gl = renderer.getContext();
    const ext = renderer.extensions;
    this.hdr = !!(ext.has('EXT_color_buffer_float') || ext.has('EXT_color_buffer_half_float'));
    this.type = this.hdr ? THREE.HalfFloatType : THREE.UnsignedByteType;
    this.isWebGL2 = renderer.capabilities.isWebGL2 !== false;
    this.samples = 0; this.useDepth = true;
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.scene = new THREE.Scene(); this.scene.add(this.quad);
    this.mDown = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } }, vertexShader: FS_V, fragmentShader: DOWN_F, depthTest: false, depthWrite: false });
    this.mBlur = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } }, vertexShader: FS_V, fragmentShader: BLUR_F, depthTest: false, depthWrite: false });
    this.mComp = new THREE.ShaderMaterial({
      uniforms: {
        tCol: { value: null }, tBlur: { value: null }, tBlur2: { value: null }, tDepth: { value: null }, uNF: { value: new THREE.Vector2(0.1, 1000) },
        uBloom: { value: 0.4 }, uThresh: { value: 0.9 }, uDof: { value: 0.75 }, uFocus: { value: 26 }, uVig: { value: 0.45 },
        uSat: { value: 1.12 }, uLift: { value: new THREE.Color(0.35, 0.3, 0.55) }, uGain: { value: new THREE.Vector3(1, 1, 1) },
        uFlash: { value: 0 }, uFlashCol: { value: new THREE.Color(1, 0.97, 0.85) }, uUseDepth: { value: 1 },
        uSrcTexel: { value: new THREE.Vector2(1, 1) }, uSharp: { value: 0 },
      },
      vertexShader: FS_V, fragmentShader: COMP_F, depthTest: false, depthWrite: false,
    });
    this.rtMain = null;
  }
  // Framebuffer-Vollständigkeit prüfen (manche Handy-GPUs können kein HalfFloat/MSAA-Ziel)
  complete(rt) {
    const r = this.r, gl = r.getContext();
    r.setRenderTarget(rt); r.clear();
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    r.setRenderTarget(null);
    return ok;
  }
  // v2.9: skala = Renderskala des Szenen-Ziels (0,6–1; Endbild bleibt in voller Größe w×h), endbild = { aa, sharp } oder null
  setup(w, h, samples, useDepth, skala = 1, endbild = null) {
    this.endbild(endbild);
    for (let attempt = 0; attempt < 4; attempt++) {
      this.build(w, h, samples, useDepth, skala);
      if (this.complete(this.rtMain) && this.complete(this.rtA)) return true;
      // Rückfall-Kette: ohne MSAA → ohne Tiefentextur → 8-Bit-Ziele
      if (samples) samples = 0; else if (useDepth) useDepth = false; else if (this.type !== THREE.UnsignedByteType) this.type = THREE.UnsignedByteType; else break;
      this.fallbacks = (this.fallbacks || 0) + 1;
    }
    this.failed = true;
    return false;
  }
  // Kantenglättung/Schärfen im Endbild (defines AA/SHARP → Shader neu übersetzen nur bei Änderung)
  endbild(e) {
    const m = this.mComp, aa = !!(e && e.aa), sh = !!(e && e.sharp > 0);
    m.uniforms.uSharp.value = e ? e.sharp || 0 : 0;
    const key = (aa ? 'A' : '') + (sh ? 'S' : '');
    if (key === this._eb) return;
    this._eb = key;
    m.defines = {}; if (aa) m.defines.AA = ''; if (sh) m.defines.SHARP = '';
    m.needsUpdate = true;
  }
  build(w, h, samples, useDepth, skala = 1) {
    this.samples = samples; this.useDepth = useDepth;
    const [rw, rh] = rtGroesse(w, h, skala);
    this.rw = rw; this.rh = rh; this.skala = skala;
    // 8-Bit-Rückfall: Ziele im sRGB-Format speichern (sonst sichtbare Farbstufen in dunklen Himmeln, z. B. nachts)
    const mk = (ww, hh, o = {}) => { const rt = new THREE.WebGLRenderTarget(ww, hh, { type: this.type, depthBuffer: false, ...o }); if (this.type === THREE.UnsignedByteType) rt.texture.colorSpace = THREE.SRGBColorSpace; return rt; };
    [this.rtMain, this.rtA, this.rtB, this.rtC, this.rtD].forEach(rt => { if (rt) { if (rt.depthTexture) rt.depthTexture.dispose(); rt.dispose(); } });
    const opts = { depthBuffer: true, samples: this.isWebGL2 ? samples : 0 };
    if (useDepth) { opts.depthTexture = new THREE.DepthTexture(rw, rh); opts.depthTexture.type = THREE.UnsignedIntType; }
    this.rtMain = mk(rw, rh, opts);
    // Unschärfe-/Glüh-Stufen aus dem Szenen-Ziel (Renderskala), nicht aus dem Bildschirm
    const qw = Math.max(1, Math.round(rw / 4)), qh = Math.max(1, Math.round(rh / 4));
    this.rtA = mk(qw, qh); this.rtB = mk(qw, qh);
    const ew = Math.max(1, Math.round(rw / 12)), eh = Math.max(1, Math.round(rh / 12));
    this.rtC = mk(ew, eh); this.rtD = mk(ew, eh);
    this.w = w; this.h = h;
  }
  pass(mat, target) { this.quad.material = mat; this.r.setRenderTarget(target); this.r.render(this.scene, this.cam); }
  render(scene, camera) {
    const r = this.r;
    r.setRenderTarget(this.rtMain);
    r.render(scene, camera);
    // Downsample 1/4 + Blur
    this.mDown.uniforms.tSrc.value = this.rtMain.texture;
    this.mDown.uniforms.uTexel.value.set(1.5 / this.rw, 1.5 / this.rh);
    this.pass(this.mDown, this.rtA);
    const bu = this.mBlur.uniforms;
    bu.tSrc.value = this.rtA.texture; bu.uDir.value.set(1 / this.rtA.width, 0); this.pass(this.mBlur, this.rtB);
    bu.tSrc.value = this.rtB.texture; bu.uDir.value.set(0, 1 / this.rtA.height); this.pass(this.mBlur, this.rtA);
    // weite Glow-Stufe 1/12
    this.mDown.uniforms.tSrc.value = this.rtA.texture;
    this.mDown.uniforms.uTexel.value.set(1.0 / this.rtA.width, 1.0 / this.rtA.height);
    this.pass(this.mDown, this.rtC);
    bu.tSrc.value = this.rtC.texture; bu.uDir.value.set(1.5 / this.rtC.width, 0); this.pass(this.mBlur, this.rtD);
    bu.tSrc.value = this.rtD.texture; bu.uDir.value.set(0, 1.5 / this.rtC.height); this.pass(this.mBlur, this.rtC);
    const cu = this.mComp.uniforms;
    cu.tCol.value = this.rtMain.texture; cu.tBlur.value = this.rtA.texture; cu.tBlur2.value = this.rtC.texture;
    cu.tDepth.value = this.useDepth ? this.rtMain.depthTexture : null;
    cu.uUseDepth.value = this.useDepth ? 1 : 0;
    cu.uNF.value.set(camera.near, camera.far);
    cu.uSrcTexel.value.set(1 / this.rw, 1 / this.rh);
    this.pass(this.mComp, null);
  }
}
