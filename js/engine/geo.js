// Geometrie-Baukasten: Primitive mit Vertexfarbe zusammenführen (1 Draw-Call pro Modell)
import * as THREE from 'three';

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
const _c = new THREE.Color();

export class Build {
  // rig (v2.4): [px, py, pz, teil] – Gelenkpunkt + Teil-Code für den Tier-Shader (RIG); gilt für alle folgenden add()
  constructor() { this.parts = []; this.rig = null; }
  // color: hex/Color; o: {p:[x,y,z], r:[x,y,z], s:n|[x,y,z], unlit:0..1, tint:0..1}
  add(geo, color, o = {}) {
    const g = geo.index ? geo.clone() : geo.clone();
    const s = o.s === undefined ? [1, 1, 1] : (typeof o.s === 'number' ? [o.s, o.s, o.s] : o.s);
    const r = o.r || [0, 0, 0], p = o.p || [0, 0, 0];
    _e.set(r[0], r[1], r[2], o.order || 'XYZ'); _q.setFromEuler(_e);
    _m.compose(_p.set(p[0], p[1], p[2]), _q, _s.set(s[0], s[1], s[2]));
    const local = o.cf || o.mix ? g.attributes.position.array.slice() : null;
    if (o.pre) g.applyMatrix4(o.pre);
    g.applyMatrix4(_m);
    if (o.post) g.applyMatrix4(o.post);
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 4), tint = new Float32Array(n);
    _c.set(color);
    for (let i = 0; i < n; i++) {
      col[i * 4] = _c.r; col[i * 4 + 1] = _c.g; col[i * 4 + 2] = _c.b; col[i * 4 + 3] = o.unlit || 0;
      tint[i] = o.tint || 0;
    }
    if (o.cf) { // Farbfunktion über lokale Position (Streifen, Punkte …)
      for (let i = 0; i < n; i++) {
        const v = o.cf(local[i * 3], local[i * 3 + 1], local[i * 3 + 2]);
        if (v !== undefined && v !== null) { _c.set(v); col[i * 4] = _c.r; col[i * 4 + 1] = _c.g; col[i * 4 + 2] = _c.b; }
      }
      _c.set(color);
    }
    if (o.gradY) { // Farbverlauf entlang lokaler Höhe
      const pos = g.attributes.position; const c2 = new THREE.Color(o.gradY.color);
      for (let i = 0; i < n; i++) {
        const t = THREE.MathUtils.clamp((pos.getY(i) - o.gradY.y0) / (o.gradY.y1 - o.gradY.y0), 0, 1);
        col[i * 4] += (c2.r - col[i * 4]) * t; col[i * 4 + 1] += (c2.g - col[i * 4 + 1]) * t; col[i * 4 + 2] += (c2.b - col[i * 4 + 2]) * t;
      }
    }
    if (o.mix) { // weicher Farbverlauf über lokale Position: mix(lx, ly, lz) → [hex, t] (Bauchfell, Fell-Verlauf)
      const loc = local || g.attributes.position.array, c2 = new THREE.Color();
      const fns = Array.isArray(o.mix) ? o.mix : [o.mix];
      for (let i = 0; i < n; i++) for (const f of fns) {
        const m = f(loc[i * 3], loc[i * 3 + 1], loc[i * 3 + 2]); if (!m || m[1] <= 0) continue;
        c2.set(m[0]); const t = Math.min(1, m[1]);
        col[i * 4] += (c2.r - col[i * 4]) * t; col[i * 4 + 1] += (c2.g - col[i * 4 + 1]) * t; col[i * 4 + 2] += (c2.b - col[i * 4 + 2]) * t;
      }
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 4));
    g.setAttribute('tint', new THREE.BufferAttribute(tint, 1));
    const rg = o.rig || this.rig;
    if (rg) { const ra = new Float32Array(n * 4); for (let i = 0; i < n; i++) ra.set(rg, i * 4); g.setAttribute('rig', new THREE.BufferAttribute(ra, 4)); }
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    this.parts.push(g);
    return this;
  }
  build() { return mergeGeos(this.parts); }
  take(b) { this.parts.push(...b.parts); return this; }
}

export function mergeGeos(geos) {
  let nv = 0, ni = 0;
  for (const g of geos) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
  const out = new THREE.BufferGeometry();
  const names = Object.keys(geos[0].attributes);
  for (const name of names) {
    const sz = geos[0].attributes[name].itemSize;
    const arr = new Float32Array(nv * sz); let o = 0;
    for (const g of geos) { const a = g.attributes[name]; if (a) arr.set(a.array, o); o += g.attributes.position.count * sz; }
    out.setAttribute(name, new THREE.BufferAttribute(arr, sz));
  }
  const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  let io = 0, vo = 0;
  for (const g of geos) {
    const c = g.attributes.position.count;
    if (g.index) { const ia = g.index.array; for (let i = 0; i < ia.length; i++) idx[io++] = ia[i] + vo; }
    else for (let i = 0; i < c; i++) idx[io++] = i + vo;
    vo += c;
  }
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeBoundingSphere();
  return out;
}

// Handliche Primitive
export const P = {
  sphere: (r = 1, w = 14, h = 10) => new THREE.SphereGeometry(r, w, h),
  ico: (r = 1, d = 1) => smoothIco(r, d),
  cyl: (rt, rb, h, s = 8) => new THREE.CylinderGeometry(rt, rb, h, s),
  cone: (r, h, s = 8) => new THREE.ConeGeometry(r, h, s),
  torus: (R, r, rs = 6, ts = 16, arc = Math.PI * 2) => new THREE.TorusGeometry(R, r, rs, ts, arc),
  capsule: (r, l, cs = 4, rs = 10) => new THREE.CapsuleGeometry(r, l, cs, rs),
  box: (x, y, z) => new THREE.BoxGeometry(x, y, z),
};

// Icosphere mit weichen Normalen (Toon-Blobs)
export function smoothIco(r = 1, d = 1) {
  const g = new THREE.IcosahedronGeometry(r, d);
  const p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) { _p.set(p.getX(i), p.getY(i), p.getZ(i)).normalize(); n.setXYZ(i, _p.x, _p.y, _p.z); }
  return g;
}

// Blütenblatt: flache, gewölbte Tropfenform (in +X ausgerichtet)
export function petalGeo(len = 1, wid = 0.5, cup = 0.15, seg = 5, cols = 2) {
  const pos = [], idx = [], nrm = [], uv = [];
  const rows = seg;
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    const w = Math.sin(Math.PI * Math.pow(t, 0.8)) * wid * 0.5 * (1 - 0.15 * t);
    for (let j = 0; j <= cols; j++) {
      const s = j / cols * 2 - 1;
      const x = t * len, z = s * w;
      const y = cup * (s * s) * Math.sin(Math.PI * t) + cup * 0.6 * t * t;
      pos.push(x, y, z); nrm.push(0, 1, 0); uv.push(t, j / cols);
    }
  }
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const a = i * (cols + 1) + j, b = a + cols + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// Grasbüschel aus 3 Halmen (Höhe 0..1 in y)
export function clumpGeo(w = 0.1) {
  const parts = [];
  for (let k = 0; k < 3; k++) {
    const b = bladeGeo(w, 3);
    const a = k * 2.1 + 0.3, r = 0.07;
    b.rotateY(a * 1.7);
    b.translate(Math.cos(a) * r, 0, Math.sin(a) * r);
    b.scale(1, 0.75 + k * 0.18, 1);
    parts.push(b);
  }
  const g = mergeGeos(parts);
  return g;
}

// Einzelnes Grashalm-Mesh (Höhe 0..1 in y, für Grass-Shader)
export function bladeGeo(w = 0.09, segs = 3) {
  const pos = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs; const ww = w * (1 - t) * (1 - 0.2 * t);
    if (i < segs) { pos.push(-ww * 0.5, t, 0, ww * 0.5, t, 0); } else pos.push(0, 1, 0);
  }
  for (let i = 0; i < segs - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const a = (segs - 1) * 2; idx.push(a, a + 1, a + 2);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length).fill(0).map((_, k) => k % 3 === 1 ? 1 : 0), 3));
  g.setIndex(idx);
  return g;
}
