// Eingabe: Tipp-Zonen (Kinderwunsch: Tippen & Halten statt Wischen), Joystick, Tastatur
export class Input {
  constructor(layer) {
    this.layer = layer;
    this.mode = 'zones';
    this.ptr = new Map(); // pointerId -> {zone, x0, y0, x, y}
    this.keys = {};
    this.turn = 0; this.climb = 0; // geglättet
    this.rawTurn = 0; this.rawClimb = 0;
    this.actions = [];
    this.enabled = true;
    this.stick = null; // {id, x0, y0, x, y}
    this.onFirst = null;
    this.injected = null; // für Tests: {turn, climb}
    const L = layer;
    L.addEventListener('pointerdown', (e) => this.down(e));
    addEventListener('pointermove', (e) => this.move(e), { passive: true });
    addEventListener('pointerup', (e) => this.up(e));
    addEventListener('pointercancel', (e) => this.up(e));
    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys[e.code] = true;
      if (e.code === 'Space' || e.code === 'KeyL') this.actions.push('loop');
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyR' || e.code === 'KeyK') this.actions.push('roll');
      if (e.code === 'Escape' || e.code === 'KeyP') this.actions.push('pause');
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    addEventListener('blur', () => { this.keys = {}; this.ptr.clear(); this.stick = null; });
    this.zoneEls = {};
    this.stickEl = null;
  }
  zoneOf(x, y) {
    const w = innerWidth, h = innerHeight;
    if (x < w * 0.3) return 'L';
    if (x > w * 0.7) return 'R';
    return y < h * 0.46 ? 'U' : 'D';
  }
  // Ein Finger kann alles: Seite = drehen, Mitte oben/unten = steigen/sinken (wie bisher),
  // dazu Finger liegen lassen und hoch/runter schieben = steigen/sinken (auch beim Drehen).
  // Wer mitten oben/unten startet und zur Seite gleitet, steigt/sinkt dabei weiter.
  axes(p) {
    const w = innerWidth, x = p.x;
    const t = x < w * 0.3 ? -1 : x > w * 0.7 ? 1 : 0;
    const dy = p.y - p.ay, DZ = 26, FULL = 42;
    let c;
    if (Math.abs(dy) > DZ) c = -Math.sign(dy) * Math.min(1, (Math.abs(dy) - DZ) / FULL + 0.35);
    else if (t === 0) c = p.y < innerHeight * 0.46 ? 1 : -1;
    else c = p.c0;
    return [t, c];
  }
  down(e) {
    if (!this.enabled) return;
    e.preventDefault();
    this.onFirst && this.onFirst();
    if (this.mode === 'stick') {
      if (e.clientX < innerWidth * 0.55 && !this.stick) {
        this.stick = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY };
        this.showStick(true);
      }
      return;
    }
    const z = this.zoneOf(e.clientX, e.clientY);
    this.ptr.set(e.pointerId, { x: e.clientX, y: e.clientY, ay: e.clientY, c0: z === 'U' ? 1 : z === 'D' ? -1 : 0, t: 0, c: 0 });
    this.paintZones();
  }
  move(e) {
    if (this.stick && e.pointerId === this.stick.id) { this.stick.x = e.clientX; this.stick.y = e.clientY; this.showStick(true); return; }
    const p = this.ptr.get(e.pointerId);
    if (p) {
      p.x = e.clientX; p.y = e.clientY;
      // Anker folgt, wenn man über den Voll-Ausschlag hinaus schiebt → Umkehren wirkt sofort
      const MAX = 68, d = p.y - p.ay;
      if (d > MAX) p.ay = p.y - MAX; else if (d < -MAX) p.ay = p.y + MAX;
      this.paintZones();
    }
  }
  up(e) {
    if (this.stick && e.pointerId === this.stick.id) { this.stick = null; this.showStick(false); }
    if (this.ptr.delete(e.pointerId)) this.paintZones();
  }
  paintZones() {
    const act = { L: 0, R: 0, U: 0, D: 0 };
    for (const p of this.ptr.values()) {
      const [t, c] = this.axes(p); p.t = t; p.c = c;
      if (t < 0) act.L = 1; if (t > 0) act.R = 1; if (c > 0.05) act.U = 1; if (c < -0.05) act.D = 1;
    }
    for (const k in this.zoneEls) this.zoneEls[k].classList.toggle('on', !!act[k]);
  }
  showStick(on) {
    const el = this.stickEl; if (!el) return;
    if (!on) { el.style.opacity = '0'; return; }
    const s = this.stick, R = 56;
    let dx = s.x - s.x0, dy = s.y - s.y0; const l = Math.hypot(dx, dy);
    if (l > R) { dx *= R / l; dy *= R / l; }
    el.style.opacity = '1';
    el.style.transform = `translate(${s.x0 - 70}px, ${s.y0 - 70}px)`;
    el.firstElementChild.style.transform = `translate(${dx}px, ${dy}px)`;
  }
  clear() { this.ptr.clear(); this.stick = null; this.showStick(false); this.paintZones(); this.actions.length = 0; this.turn = 0; this.climb = 0; }
  update(dt) {
    let t = 0, c = 0;
    if (this.mode === 'stick' && this.stick) {
      const R = 56;
      t = Math.max(-1, Math.min(1, (this.stick.x - this.stick.x0) / R));
      c = Math.max(-1, Math.min(1, -(this.stick.y - this.stick.y0) / R));
      if (Math.abs(t) < 0.12) t = 0; if (Math.abs(c) < 0.12) c = 0;
    } else {
      let nL = 0, nR = 0, cU = 0, cD = 0;
      for (const p of this.ptr.values()) {
        if (p.t < 0) nL = 1; else if (p.t > 0) nR = 1;
        if (p.c > 0) cU = Math.max(cU, p.c); else if (p.c < 0) cD = Math.max(cD, -p.c);
      }
      t = nR - nL; c = cU - cD;
    }
    const k = this.keys;
    if (k.ArrowLeft || k.KeyA) t -= 1; if (k.ArrowRight || k.KeyD) t += 1;
    if (k.ArrowUp || k.KeyW) c += 1; if (k.ArrowDown || k.KeyS) c -= 1;
    if (this.injected) { t = this.injected.turn || 0; c = this.injected.climb || 0; }
    t = Math.max(-1, Math.min(1, t)); c = Math.max(-1, Math.min(1, c));
    this.rawTurn = t; this.rawClimb = c;
    const a = Math.min(1, dt * 9);
    this.turn += (t - this.turn) * a; this.climb += (c - this.climb) * a;
  }
  take() { const a = this.actions.slice(); this.actions.length = 0; return a; }
}
