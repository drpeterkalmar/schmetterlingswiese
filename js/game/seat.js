// v2.5 Sitzplätze auf Landeblumen: Höhenfeld der Blüte + „Absetzen“ der Figur.
// Höhenfeld: im lokalen Rahmen der Blume (unskaliert), senkrechte Säulen → je Stelle die oberste Fläche der Blüte
// (Stängel und Blätter liegen darunter und zählen nicht doppelt).
// Absetzen: Die Figur (an der Blüten-Normalen ausgerichtet) wird entlang der Normalen so weit angehoben, bis jeder ihrer
// Punkte über der Blüte liegt – für jede Figur, Größe, Hut und jeden Schmuck exakt statt einer festen Höhe.
import * as THREE from 'three';

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _p = new THREE.Vector3(), _d = new THREE.Vector3();
const _R = new THREE.Quaternion(), _Y = new THREE.Quaternion(), _UP = new THREE.Vector3(0, 1, 0);

export class HeightField {
  // geo: Blüten-Geometrie (lokal, unskaliert); ext: halbe Kantenlänge (unskaliert)
  constructor(geo, ext = 1.2, cell = 0.015) {
    this.ext = ext; this.cell = cell; this.n = Math.ceil(2 * ext / cell);
    const n = this.n, h = new Float32Array(n * n).fill(-Infinity);
    const pos = geo.attributes.position, idx = geo.index, tri = idx ? idx.count / 3 : pos.count / 3;
    const v = (k, out) => out.fromBufferAttribute(pos, idx ? idx.getX(k) : k);
    const put = (x, y, z) => {
      const i = Math.floor((x + ext) / cell), j = Math.floor((z + ext) / cell);
      if (i < 0 || j < 0 || i >= n || j >= n) return;
      const k = j * n + i; if (y > h[k]) h[k] = y;
    };
    for (let t = 0; t < tri; t++) {
      v(t * 3, _a); v(t * 3 + 1, _b); v(t * 3 + 2, _c);
      // Dreieck dicht abtasten (Schritt ≤ halbe Zelle, waagrecht gemessen)
      const L = Math.max(Math.hypot(_a.x - _b.x, _a.z - _b.z), Math.hypot(_b.x - _c.x, _b.z - _c.z), Math.hypot(_c.x - _a.x, _c.z - _a.z));
      const m = Math.max(1, Math.ceil(L / (cell * 0.5)));
      for (let i = 0; i <= m; i++) for (let j = 0; j <= m - i; j++) {
        const u = i / m, w = j / m, r = 1 - u - w;
        put(_a.x * r + _b.x * u + _c.x * w, _a.y * r + _b.y * u + _c.y * w, _a.z * r + _b.z * u + _c.z * w);
      }
    }
    // eine Zelle ausdehnen (3×3-Maximum) → konservativ, keine Lücken zwischen Abtastpunkten
    const d = new Float32Array(n * n).fill(-Infinity);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      let m = -Infinity;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const ii = i + di, jj = j + dj;
        if (ii >= 0 && jj >= 0 && ii < n && jj < n && h[jj * n + ii] > m) m = h[jj * n + ii];
      }
      d[j * n + i] = m;
    }
    this.h = d;
    let lo = Infinity, hi = -Infinity; for (const v of d) if (v > -1e9) { if (v < lo) lo = v; if (v > hi) hi = v; }
    this.relief = hi > lo ? hi - lo : 0; // Höhenunterschied der Blüte (unskaliert)
  }
  // Nur die unteren Figuren-Punkte können die Blüte berühren: alles höher als tiefster Punkt + Relief der Blüte fällt weg
  // (Drehung um die Normale ändert die Höhe nicht → einmal je Figur und Blume)
  // vertical (Normale = lokal y): je 1,5-cm-Säule zählt nur der tiefste Punkt (Drehung um y lässt Säulen Säulen) →
  // gleichwertig, aber ~10× weniger Punkte (wichtig beim Drehen im Sitzen, dann wird neu gerechnet)
  low(pts, s, vertical) {
    const C = this._low || (this._low = new WeakMap()), key = C.get(pts);
    if (key && key.s === s && key.v === vertical) return key.a;
    let m = Infinity; for (let i = 1; i < pts.length; i += 3) if (pts[i] < m) m = pts[i];
    const lim = m + this.relief * s + 0.2, out = [];
    if (vertical) {
      const col = new Map(), cs = 0.015;
      for (let i = 0; i < pts.length; i += 3) {
        if (pts[i + 1] > lim) continue;
        const k = Math.round(pts[i] / cs) * 100003 + Math.round(pts[i + 2] / cs), j = col.get(k);
        if (j === undefined || pts[i + 1] < pts[j + 1]) col.set(k, i);
      }
      for (const i of col.values()) out.push(pts[i], pts[i + 1], pts[i + 2]);
    } else for (let i = 0; i < pts.length; i += 3) if (pts[i + 1] <= lim) out.push(pts[i], pts[i + 1], pts[i + 2]);
    const a = new Float32Array(out); C.set(pts, { s, v: vertical, a });
    return a;
  }
  // oberste Blütenfläche an (x, z), lokal; -Infinity = dort ist keine Blüte
  at(x, z) {
    const i = Math.floor((x + this.ext) / this.cell), j = Math.floor((z + this.ext) / this.cell);
    if (i < 0 || j < 0 || i >= this.n || j >= this.n) return -Infinity;
    return this.h[j * this.n + i];
  }
  // Abstand (m) des Figuren-Ursprungs über der Sitz-Mitte entlang der Normalen, damit jeder Punkt über der Blüte liegt.
  // pts: Figuren-Punkte im Figuren-Rahmen (m, inkl. Größe); rotY: Drehung Figur → Sitz-Rahmen um die Normale;
  // s: Blumen-Größe; c: Sitz-Mitte (lokal); R: Drehung Sitz-Rahmen → lokal (Normale = R·y)
  drop(all, rotY, s, c, R, margin = 0.02) {
    const pts = this.low(all, s, Math.abs(R.x) + Math.abs(R.y) + Math.abs(R.z) < 1e-6);
    _R.copy(R).multiply(_Y.setFromAxisAngle(_UP, rotY));
    const N = pts.length / 3, q = this._q && this._q.length >= N * 3 ? this._q : (this._q = new Float32Array(N * 3));
    for (let i = 0; i < N; i++) {
      _p.set(pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2]).applyQuaternion(_R).multiplyScalar(1 / s).add(c);
      q[i * 3] = _p.x; q[i * 3 + 1] = _p.y; q[i * 3 + 2] = _p.z;
    }
    _d.set(0, 1 / s, 0).applyQuaternion(R); // 1 m entlang der Normalen, in lokalen Einheiten
    const ok = (off) => {
      for (let i = 0; i < N; i++) {
        const x = q[i * 3] + _d.x * off, y = q[i * 3 + 1] + _d.y * off, z = q[i * 3 + 2] + _d.z * off;
        if (y < this.at(x, z)) return false;
      }
      return true;
    };
    // kleinster Abstand, bei dem alles frei ist (Halbierung; in Richtung Normale wird es nur freier)
    let lo = -0.6, hi = 2.5;
    if (ok(lo)) return lo + margin;
    for (let k = 0; k < 18; k++) { const m = (lo + hi) / 2; if (ok(m)) hi = m; else lo = m; }
    return hi + margin;
  }
}

// Sitz-Rahmen → Welt: Blumen-Matrix M (Welt ← lokal, inkl. Größe), Sitz-Mitte c und Drehung R (Sitz → lokal)
export function seatWorld(M, c, R, off, outPos, outN) {
  _p.copy(c).applyMatrix4(M);
  outN.set(0, 1, 0).applyQuaternion(R).transformDirection(M);
  return outPos.copy(_p).addScaledVector(outN, off);
}
