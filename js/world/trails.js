// Spuren hinter der Figur (Seifenblasen, Herzchen, Pups-Wölkchen, Glitzer, Regenbogen, Konfetti).
// Nutzt den Burst-Pool (1 Draw-Call); ein wiederverwendetes Options-Objekt → keine Allokationen pro Frame.
import * as THREE from 'three';

const RAINBOW = [0xff5a6e, 0xff9a3c, 0xffd84a, 0x7ee06a, 0x4fc8ff, 0x8a7bff, 0xd67cff];
const SPEC = {
  blasen: { every: 0.15, n: 1, shape: 6, size: 0.46, colors: [0xcdeeff, 0xffd6f2, 0xe2ffd8, 0xfff3c8], life: 1.9, grav: 0.35, drag: 1.3, speed: 0.5, up: 0.3, back: 1.4, spread: 0.25 },
  herzen: { every: 0.11, n: 1, shape: 3, size: 0.36, colors: [0xff5f8f, 0xff8fc0, 0xffb0d8, 0xff4d6a], life: 1.3, grav: 0.3, drag: 1.4, speed: 0.6, up: 0.2, back: 1.2, spread: 0.3 },
  glitzer: { every: 0.045, n: 1, shape: 1, size: 0.3, colors: [0xffffff, 0xfff3b0, 0xffe07a, 0xb8e4ff], life: 0.9, grav: -0.4, drag: 1.2, speed: 0.6, up: 0, back: 1, spread: 0.35 },
  konfetti: { every: 0.05, n: 2, shape: 2, size: 0.2, colors: [0xff6f9a, 0xffd84a, 0x6fd0ff, 0x9cf07a, 0xc08cff, 0xff9a3c], life: 1.5, grav: -1.8, drag: 1.4, speed: 1.3, up: 0.7, back: 1, spread: 0.3, spin: 10 },
};
const PUFF = { n: 7, shape: 7, size: 0.62, colors: [0xe8f7cc, 0xdff2ea, 0xf2ecff, 0xfff6d8], life: 1.7, grav: 0.3, drag: 2.2, speed: 1.1, up: 0.2, spread: 0.3 };
const _p = new THREE.Vector3(), _f = new THREE.Vector3(), _one = [0];

export class Trail {
  constructor(bursts, onPuff) {
    this.b = bursts; this.onPuff = onPuff;
    this.acc = 0; this.puffT = 1.2; this.hue = 0;
    this.o = { n: 1, pos: _p, vel: new THREE.Vector3(), colors: _one, shape: 0, size: 0.3, speed: 0, up: 0, life: 1, grav: 0, drag: 1, spread: 0.2, spin: 3 };
  }
  // pos: Figur, fwd: Blickrichtung, speed: m/s, k: Größe, drift: Zusatz-Geschwindigkeit (Menü: gedachter Fahrtwind)
  update(dt, id, pos, fwd, speed, k = 1, drift = null) {
    const o = this.o;
    _f.copy(fwd); _f.y = 0; if (_f.lengthSq() < 1e-6) _f.set(0, 0, 1); _f.normalize();
    _p.copy(pos).addScaledVector(_f, -0.45 * k); _p.y -= 0.05 * k;
    if (id === 'pups') {
      this.puffT -= dt;
      if (this.puffT <= 0) {
        this.puffT = 2.6 + Math.random() * 2.4;
        Object.assign(o, PUFF); o.size = PUFF.size * k;
        o.vel.copy(_f).multiplyScalar(-1.2); if (drift) o.vel.add(drift);
        this.b.emit(o);
        this.onPuff && this.onPuff(k);
      }
      return;
    }
    this.acc += dt;
    if (id === 'schweif') { // Regenbogen-Band: 7 Farbstreifen nebeneinander
      const every = 0.022;
      let guard = 0;
      while (this.acc >= every && guard++ < 8) {
        this.acc -= every;
        o.n = 1; o.shape = 0; o.size = 0.3 * k; o.speed = 0; o.up = 0; o.life = 1.1; o.grav = 0; o.drag = 2; o.spread = 0.02; o.spin = 0;
        o.vel.set(0, 0, 0); if (drift) o.vel.copy(drift);
        // waagerecht nebeneinander → von hinten eine Regenbogen-Straße (rot außen links, lila rechts)
        const back = this.acc * speed; // Zwischenpositionen, wenn mehrere Emissionen in einen Frame fallen
        const x0 = _p.x - _f.x * back, z0 = _p.z - _f.z * back, rx = _f.z, rz = -_f.x;
        for (let i = 0; i < 7; i++) { _one[0] = RAINBOW[i]; o.colors = _one; const d = (i - 3) * 0.09 * k; _p.x = x0 + rx * d; _p.z = z0 + rz * d; this.b.emit(o); }
        _p.x = x0 + _f.x * back; _p.z = z0 + _f.z * back;
      }
      if (this.acc > every * 8) this.acc = 0;
      return;
    }
    const S = SPEC[id]; if (!S) return;
    // bei hohem Tempo etwas dichter, damit die Spur nicht abreißt
    const every = S.every / Math.max(1, speed / 7);
    let guard = 0;
    while (this.acc >= every && guard++ < 6) {
      this.acc -= every;
      o.n = S.n; o.shape = S.shape; o.size = S.size * k; o.colors = S.colors; o.life = S.life; o.grav = S.grav; o.drag = S.drag;
      o.speed = S.speed; o.up = S.up; o.spread = S.spread * k; o.spin = S.spin ?? 3;
      o.vel.copy(_f).multiplyScalar(-S.back); if (drift) o.vel.add(drift);
      const back = this.acc * speed; _p.addScaledVector(_f, -back);
      this.b.emit(o);
      _p.addScaledVector(_f, back);
    }
    if (this.acc > every * 6) this.acc = 0;
  }
}
