// Grafik-Kern: gemeinsame Uniforms, Toon-Shader, Himmel, Post-Processing.
import * as THREE from 'three';

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
};

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
}`;

const V_COMMON = /* glsl */`
uniform float uTime; uniform float uBend; uniform vec3 uCam; uniform vec3 uWind; uniform vec3 uPlayer;
vec4 bendW(vec4 wp){ vec2 d = wp.xz - uCam.xz; wp.y -= uBend * dot(d, d); return wp; }
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
`;

const F_LIGHT = /* glsl */`
uniform vec3 uSunDir, uSunCol, uSkyAmb, uGndAmb, uRim, uFogCol, uFogSun; uniform vec4 uFog; uniform vec3 uCam;
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
  float hh = max(position.y, 0.0) * uSway;
  float ph2 = dot(wp.xz, vec2(0.21, 0.17));
  float g = 0.55 + 0.45 * sin(uTime * 1.9 + ph2) + uWind.z * 0.8;
  wp.xz += uWind.xy * g * hh + vec2(sin(uTime * 2.7 + ph2 * 1.3), cos(uTime * 2.3 + ph2)) * 0.12 * hh;
#endif
  vN = normalize(mat3(m) * nrm);
  vWP = wp.xyz; vCol = col; vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * bendW(wp);
}`;

const TOON_F = /* glsl */`
${F_LIGHT}
uniform vec3 uColor; uniform float uRimAmt, uGloss, uEmis, uSoft, uOpacity;
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
#ifdef WINGMASK
  // Durchscheinen bei Gegenlicht (Flügel leuchten in der Sonne)
  float tr = pow(clamp(dot(-V, uSunDir), 0.0, 1.0), 2.0) * 0.6;
  c += alb * uSunCol * tr;
#endif
  c = mix(c, alb * (1.0 + uEmis), clamp(vCol.a + uEmis, 0.0, 1.0));
  c = applyFog(c, vWP);
  gl_FragColor = vec4(c, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function toonMat(o = {}) {
  const defines = {};
  if (o.map) defines.USE_MAPX = '';
  if (o.wing) defines.WINGMASK = '';
  if (o.instWing) defines.USE_INSTANCE_WING = '';
  if (o.sway) defines.SWAY = '';
  if (o.flap) defines.WINGFLAP = '';
  if (o.tint) defines.USE_TINT = '';
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
    uniforms: u, defines, vertexShader: TOON_V, fragmentShader: TOON_F,
    vertexColors: !!o.vc, side: o.side ?? THREE.FrontSide,
    transparent: !!o.transparent, depthWrite: o.depthWrite ?? !o.transparent,
  });
  if (o.blending) m.blending = o.blending;
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
uniform float uTime; uniform float uWaterY;
varying vec3 vN; varying vec3 vWP; varying vec3 vCol;
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
  vec3 c = toon(alb, N, V, 0.12, 0.0, 0.25);
  c = applyFog(c, vWP);
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
export function terrainMat() {
  return new THREE.ShaderMaterial({ uniforms: G, vertexShader: TERRAIN_V, fragmentShader: TERRAIN_F, vertexColors: true });
}

// ---------------------------------------------------------------- Gras (instanziert, folgt dem Spieler)
const GRASS_V = /* glsl */`
${V_COMMON}
${GLSL_TERRAIN}
uniform float uField; uniform vec3 uCenter; uniform float uWaterY;
attribute vec4 aOff; // x,z in [0,1), rand, scale
varying vec3 vWP; varying float vH; varying float vR; varying float vWave; varying vec3 vN;
void main(){
  vec2 base = aOff.xy * uField;
  vec2 c = uCenter.xz;
  vec2 p = mod(base - c + uField * 0.5, uField) - uField * 0.5 + c;
  float gh = terrainH(p);
  float dist = length(p - uCam.xz);
  float s = aOff.w * (1.0 - smoothstep(uField * 0.30, uField * 0.48, length(p - c)));
  s *= smoothstep(uWaterY + 0.45, uWaterY + 0.95, gh);
  s *= 1.0 - smoothstep(uEdge.x + 25.0, uEdge.x + 50.0, length(p));
  s *= smoothstep(0.8, 3.2, length(p - uCam.xz)); // keine Riesenhalme direkt vor der Kamera
  float ang = aOff.z * 6.2831;
  float ca = cos(ang), sa = sin(ang);
  vec3 lp = position * vec3(1.0 + aOff.z * 0.6, s, 1.0);
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
  vN = normalize(vec3(-sa * 0.3 + bend.x * 0.4, 1.0, ca * 0.3 + bend.y * 0.4));
  gl_Position = projectionMatrix * viewMatrix * bendW(wp);
}`;
const GRASS_F = /* glsl */`
${F_LIGHT}
uniform vec3 uGrassA, uGrassB, uGrassC;
varying vec3 vWP; varying float vH; varying float vR; varying float vWave; varying vec3 vN;
void main(){
  float patchN = sin(vWP.x * 0.07 + sin(vWP.z * 0.05) * 2.0) * 0.5 + 0.5;
  vec3 tip = mix(uGrassB, uGrassC, patchN * 0.7 + vR * 0.3);
  vec3 alb = mix(uGrassA, tip, smoothstep(0.0, 1.0, vH));
  alb += vec3(0.07, 0.08, 0.03) * vWave * vH;
  vec3 V = normalize(uCam - vWP);
  float ndl = clamp(dot(normalize(vN), uSunDir), 0.0, 1.0);
  vec3 amb = mix(uGndAmb, uSkyAmb, 0.6 + 0.4 * vH);
  vec3 c = alb * (amb * 0.9 + uSunCol * (0.62 + 0.38 * ndl) * (0.7 + 0.3 * vH));
  // Durchleuchten gegen die Sonne (goldene Grasspitzen)
  float back = pow(clamp(dot(-V, uSunDir), 0.0, 1.0), 3.0);
  c += uSunCol * tip * back * vH * vH * 0.9;
  c = applyFog(c, vWP);
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
export function grassMat(field) {
  return new THREE.ShaderMaterial({
    uniforms: { ...G, uField: { value: field }, uCenter: { value: new THREE.Vector3() } },
    vertexShader: GRASS_V, fragmentShader: GRASS_F, side: THREE.DoubleSide,
  });
}

// ---------------------------------------------------------------- Himmel
const SKY_V = /* glsl */`
varying vec3 vDir;
void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`;
const SKY_F = /* glsl */`
uniform vec3 uZenith, uHorizon, uSunDir, uSunCol, uGlow, uMoonDir; uniform float uSunSize, uStars, uTime, uMoon;
varying vec3 vDir;
float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
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
    st *= 0.6 + 0.4 * sin(uTime * (1.0 + r * 3.0) + r * 40.0);
    col += vec3(1.0, 0.95, 0.85) * st * uStars * 1.6;
  }
  if (uMoon > 0.0) {
    float md = dot(d, uMoonDir);
    col += vec3(1.0, 0.97, 0.88) * smoothstep(0.9993, 0.9996, md) * 2.2 * uMoon;
    col += vec3(0.6, 0.65, 0.9) * pow(max(md, 0.0), 60.0) * 0.35 * uMoon;
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
    },
    vertexShader: SKY_V, fragmentShader: SKY_F, side: THREE.BackSide, depthWrite: false,
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
float linDepth(float d){ float z = d * 2.0 - 1.0; return 2.0 * uNF.x * uNF.y / (uNF.y + uNF.x - z * (uNF.y - uNF.x)); }
void main(){
  vec3 c = texture2D(tCol, vUv).rgb;
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
      },
      vertexShader: FS_V, fragmentShader: COMP_F, depthTest: false, depthWrite: false,
    });
    this.rtMain = null;
  }
  setup(w, h, samples, useDepth) {
    this.samples = samples; this.useDepth = useDepth;
    const mk = (ww, hh, o = {}) => new THREE.WebGLRenderTarget(ww, hh, { type: this.type, depthBuffer: false, ...o });
    [this.rtMain, this.rtA, this.rtB, this.rtC, this.rtD].forEach(rt => rt && rt.dispose());
    const opts = { depthBuffer: true, samples: this.isWebGL2 ? samples : 0 };
    if (useDepth) { opts.depthTexture = new THREE.DepthTexture(w, h); opts.depthTexture.type = THREE.UnsignedIntType; }
    this.rtMain = mk(w, h, opts);
    const qw = Math.max(1, Math.round(w / 4)), qh = Math.max(1, Math.round(h / 4));
    this.rtA = mk(qw, qh); this.rtB = mk(qw, qh);
    const ew = Math.max(1, Math.round(w / 12)), eh = Math.max(1, Math.round(h / 12));
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
    this.mDown.uniforms.uTexel.value.set(1.5 / this.w, 1.5 / this.h);
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
    this.pass(this.mComp, null);
  }
}
