// Fan-Cam-Clip (v3.0): die seltene Sieger-„Flugshow“ (Kür Immelmann → Fassrolle → Split-S) als kurzer, stylischer
// Fan-Edit wie auf TikTok/Reels („Velocity Edit“), ≈ 9–12 s:
//   • eigener Beat (120 BPM, prozedural aus synth.js: Bassdrum, Klatscher, Hi-Hat, Bass, Glöckchen, Anlauf, Drop)
//   • harte Schnitte zwischen Kameras (nah von vorn, seitlich weit, von unten gegen den Himmel, Verfolger, Kreisfahrt)
//     genau auf den Schlägen (Uhr = Audio-Uhr; Schnitt im Takt-Schritt, der dem Schlag am nächsten liegt)
//   • Speed-Ramps: Zeitlupe am Höhepunkt jeder Figur, auf dem nächsten passenden Schlag „zack“ schnell (Drop)
//   • Zoom-Stöße und Kamerawackler nur auf dem Beat, Wisch-Schwenks mit Bewegungsunschärfe als Übergang
//   • Glow, kurze Weiß-Blitze nur auf den Drops (höchstens 3, „Blitze reduzieren“ → schwach, ohne RGB), leichte
//     RGB-Verschiebung, Glitzer-Ebene, kräftigere Farben
//   • Texte: Figurname groß und animiert, @Spielername + Figur, Takt-Balken oben, am Ende Sterne + Zeit
// Überspringen per Tipp; ?edit=0 bzw. Einstellung = bisherige Sieger-Kamera; „Clip nochmal“ auf dem Ergebnis-Bildschirm.
import * as THREE from 'three';
import { height } from '../world/terrain.js';
import { CHARACTERS } from '../actors/characters.js';

export const BPM = 120, SPB = 60 / BPM;
const QS = new URLSearchParams(location.search);
const RM = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const SHOTS = ['chase', 'front', 'unten', 'side', 'orbit'];
const _e = new THREE.Vector3(), _p = new THREE.Vector3(), _l = new THREE.Vector3(), _f = new THREE.Vector3(), _u = new THREE.Vector3(), _s = new THREE.Vector3();
const _Z0 = new THREE.Vector3(), _Y = new THREE.Vector3(0, 1, 0), _Z = new THREE.Vector3(0, 0, 1), _UP = new THREE.Vector3(0, 1, 0);
const GLITZER = [0xffffff, 0xfff3b0, 0xffd0f0, 0xcfe8ff];
const ease = (x) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, x)));
// Beat-Muster je Takt (8 Achtel): Bassdrum/Klatscher/Hi-Hat; Drop-Takte dichter
const KICK = [1, 0, 0, 0, 1, 0, 0, 0], KICK_D = [1, 0, 0, 1, 1, 0, 1, 0], CLAP = [0, 0, 1, 0, 0, 0, 1, 0], HAT = [0, 1, 0, 1, 0, 1, 0, 1];
const BASS = [0, -3, -5, -7]; // C – A – G – F (Halbtöne relativ zu C3), je Takt
const MEL = [[0, 4, 7, 12, 7, 4, 9, 7], [0, 4, 9, 12, 9, 4, 7, 9], [2, 7, 11, 14, 11, 7, 9, 7], [0, 5, 9, 12, 9, 5, 7, 4]];

export function editAn(app) {
  const q = QS.get('edit');
  if (q === '0') return false;
  if (q === '1') return true;
  return app.settings.edit !== false;
}

export class FanCam {
  constructor(app) {
    this.app = app; this.on = false; this.log = []; this.cuts = []; this.el = null; this.last = null;
    this.camPos = new THREE.Vector3(); this.camLook = new THREE.Vector3(); this.fwd = new THREE.Vector3(0, 0, 1);
    this.camOff = new THREE.Vector3(); this.lookOff = new THREE.Vector3();
  }
  get flashArm() { return RM || this.app.settings.blitze === 'wenig'; } // „Blitze reduzieren“ (Einstellung) bzw. reduzierte Bewegung
  // ------------------------------------------------------------ Start/Ende
  start(S, F, opts = {}) {
    const app = this.app, au = app.audio;
    this.S = S; this.F = F; this.def = S.def; this.on = true; this.replay = !!opts.replay;
    this.t = 0; this.a0 = au.ctx && au.ctx.state === 'running' ? au.ctx.currentTime + 0.06 : null; this.nb = 0; this.sched = 0;
    this.shot = 'side'; this.shotI = 0; this.cutN = 0; this.whip = null; this.punch = 0; this.shake = 0; this.flashK = 0; this.rgbK = 0; this.flashes = 0;
    this.ramp = { ph: 'normal', i: 0, drop: -1, tFast: 0 }; this.ts = 1; this.orbitA = 0; this.fresh = true; this.outro = -1; this.done = false; this.endCardShown = false;
    this.cuts = []; this.log = [];
    const K = S.def.kf, tl = S.def.teile || [];
    this.teile = tl.map(x => ({ ...x, pf: S.def.coreP(S, K.marks[x.f]), ph: S.def.coreP(S, K.marks[x.h]), shown: false, hit: false }));
    this.lead = 0.12 / S.dur;
    this.grade(true);
    au.musicDuck(0.12, 0.2);
    this.dom();
    if (QS.get('fcdom') === '0') this.el.style.display = 'none'; // (Messung: ohne Bild-Ebene)
    document.body.classList.add('clip');
    this.name(`@${this.spieler()}`, this.figurName(), 'intro');
    this.cut('side', 0); // erstes Bild: weite Seitenansicht
    this.mark('start', { a0: this.a0 });
  }
  spieler() { const p = this.app.progress.cur; return p ? p.name : 'Flieger'; }
  figurName() {
    const c = this.app.player.critter, id = c && c.look ? c.look.char : 'schmetterling';
    const ch = CHARACTERS.find(x => x.id === id) || CHARACTERS[0];
    return `${ch.emoji} ${ch.name}`;
  }
  // Clip-Ende (nach dem Ausleiten + Sterne-Karte) oder übersprungen
  stop(skipped = false) {
    if (!this.on) return;
    const app = this.app;
    this.on = false; this.done = true; this.skipped = skipped;
    app.timeScale = 1;
    app.audio.beatStop(); app.audio.musicDuck(1, 0.4);
    this.grade(false);
    document.body.classList.remove('clip');
    if (this.el) { this.el.classList.remove('on'); this.el.querySelector('.fcName').className = 'fcName'; }
    this.last = { def: this.def, side: this.S.side, start: this.S.start ? this.S.start.clone() : null, yaw: this.S.yaw, lift: this.S.lift };
    this.mark('ende', { skipped });
  }
  mark(k, o = {}) { this.log.push({ k, t: +this.t.toFixed(4), ...o }); if (this.log.length > 200) this.log.shift(); }
  // ------------------------------------------------------------ Farbe/Glow (Endbild-Uniformen), vorher/nachher
  grade(on) {
    const post = this.app.renderer.post, u = post && post.mComp && post.mComp.uniforms;
    if (!u) return;
    if (on) {
      this.g0 = { sat: u.uSat.value, bloom: u.uBloom.value, vig: u.uVig.value, gain: u.uGain.value.clone() };
      u.uSat.value = this.g0.sat * 1.2; u.uBloom.value = this.g0.bloom * 1.6; u.uVig.value = Math.max(this.g0.vig, 0.7); u.uGain.value.set(1.06, 1.0, 1.05);
    } else if (this.g0) {
      u.uSat.value = this.g0.sat; u.uBloom.value = this.g0.bloom; u.uVig.value = this.g0.vig; u.uGain.value.copy(this.g0.gain);
      u.uFlash.value = 0; if (u.uWisch) u.uWisch.value.set(0, 0); if (u.uRgb) u.uRgb.value = 0;
      this.g0 = null;
    }
  }
  // ------------------------------------------------------------ Bild-Ebene (Texte, Takt-Balken, Glitzer, Blitz)
  dom() {
    if (!this.el) {
      const e = document.createElement('div'); e.id = 'fancam'; e.setAttribute('aria-hidden', 'true');
      e.innerHTML = `<div class="fcBar"></div><div class="fcName"><b></b><i></i></div>
        <div class="fcCap"><b class="fcWho"></b><span class="fcSong">♪ Flugshow-Beat · Schmetterlingswiese</span></div>
        <div class="fcEnd"><div class="fcStars"></div><div class="fcTime"></div></div><div class="fcFlash"></div><div class="fcSkip">Tippen = überspringen</div>`;
      document.body.appendChild(e);
      e.addEventListener('pointerdown', (ev) => { ev.preventDefault(); ev.stopPropagation(); if (this.on) this.skip(); });
      this.el = e;
    }
    const e = this.el;
    e.querySelector('.fcBar').innerHTML = this.teile.map(() => '<i><b></b></i>').join(''); this.bars = null; this.barK = null;
    e.querySelector('.fcWho').textContent = `@${this.spieler()} · ${this.figurName()}`;
    e.querySelector('.fcEnd').className = 'fcEnd';
    e.classList.toggle('arm', this.flashArm);
    e.classList.add('on');
  }
  // Glitzer-Ebene auf dem Beat: ein paar Funkel-Sterne direkt vor der Kamera (Effekt-Teilchen statt DOM-Animation –
  // die CSS-Funken kosteten im Mess-Gate ~0,6 ms je Bild)
  glitzer(n) {
    const cam = this.app.camera, g = this.app.game;
    for (let i = 0; i < n; i++) {
      _e.set((Math.random() - 0.5) * 2.2, (Math.random() - 0.5) * 3.2, -2.2 - Math.random() * 1.2).applyQuaternion(cam.quaternion).add(cam.position);
      g.em(1, _e, GLITZER, 1, 0.12 + Math.random() * 0.1, 0.2, 0.15, 0.5, 0, 1, 0.05);
    }
  }
  name(big, small, cls = '') {
    const n = this.el.querySelector('.fcName');
    n.querySelector('b').textContent = big; n.querySelector('i').textContent = small || '';
    n.className = 'fcName'; void n.offsetWidth; n.className = 'fcName show ' + cls;
  }
  endCard() {
    const r = this.app.lastResult || {}, e = this.el.querySelector('.fcEnd');
    e.querySelector('.fcStars').textContent = '⭐'.repeat(Math.max(1, r.stars || this.app.game.stars || 1));
    e.querySelector('.fcTime').textContent = r.time ? `⏱️ ${r.time.toFixed(1).replace('.', ',')} s` : '';
    e.className = 'fcEnd show';
    this.endCardShown = true;
  }
  skip() {
    const pl = this.app.player, S = pl.stunt;
    this.mark('skip');
    if (S && S === this.S) S.t = S.dur; // Figur sofort zu Ende (Ende liegt auf der Fluglinie, Winkel werden genullt)
    this.stop(true);
  }
  // ------------------------------------------------------------ Takt-Schritt (aus game.finaleUpdate, vor der Kamera)
  step(realDt) {
    if (!this.on) return;
    const app = this.app, au = app.audio, S = this.S, pl = app.player, h = realDt || 1 / 60;
    this.t += h;
    // Uhr an die Audio-Uhr binden (bei Rucklern/Hängern springt sie mit, statt hinterherzulaufen)
    if (this.a0 !== null && au.ctx && au.ctx.state === 'running') {
      const ta = au.ctx.currentTime - this.a0;
      if (Math.abs(ta - this.t) > 0.012) { this.mark('sync', { von: +this.t.toFixed(3), auf: +ta.toFixed(3) }); this.t = ta; } // > ¾ Bild daneben
    }
    this.planen();
    // Schläge: im Schritt, der dem Schlag am nächsten liegt (± halber Schritt)
    while (this.t + h / 2 >= this.nb * SPB) this.schlag(this.nb++);
    const p = S && pl.stunt === S ? S.p : 1.01;
    // Figuren-Namen beim Start jeder Figur
    for (const T of this.teile) if (!T.shown && p >= T.pf) { T.shown = true; this.name(`${T.name.toUpperCase()} ${T.emoji}`, '', 'fig'); this.mark('name', { n: T.name }); }
    // Speed-Ramp: kurz vor dem Höhepunkt Zeitlupe, Drop auf dem nächsten Schlag ≥ 0,7 s später
    const R = this.ramp, T = this.teile[R.i];
    if (R.ph === 'normal' && T && p >= T.ph - this.lead) {
      R.ph = 'slow'; R.drop = Math.ceil((this.t + 0.7) / SPB);
      const tDrop = R.drop * SPB;
      if (this.a0 !== null) { au.beat('briser', this.a0 + Math.max(this.t, tDrop - 1.05), { gain: 0.9 }); au.beat('bimpact', this.a0 + tDrop, { gain: 1 }); }
      this.mark('zeitlupe', { i: R.i, drop: R.drop });
    }
    if (R.ph === 'fast' && this.t - R.tFast > 0.42) { R.ph = 'normal'; R.i++; }
    const tsT = R.ph === 'slow' ? 0.26 : R.ph === 'fast' ? 1.75 : 1;
    if (R.ph === 'fast') this.ts = tsT; // „zack“: sofort schnell
    else this.ts += (tsT - this.ts) * (1 - Math.exp(-h / (R.ph === 'slow' ? 0.07 : 0.12)));
    if (this.outro < 0) app.timeScale = this.ts;
    // Abklingen der Beat-Effekte
    this.punch *= Math.exp(-h / 0.11); this.shake *= Math.exp(-h / 0.09); this.flashK *= Math.exp(-h / 0.06); this.rgbK *= Math.exp(-h / 0.12);
    this.balken(p);
    // Ende: Figur fertig → noch 4 Schläge Sterne-Karte, dann aus
    if (this.outro < 0 && (!S || pl.stunt !== S)) { this.outro = this.t; app.timeScale = 1; this.mark('figur_ende'); }
    if (this.outro >= 0) {
      app.timeScale = 1;
      if (!this.endCardShown && this.t - this.outro > 0.3) this.endCard();
      if (this.t - this.outro > 2.4) this.stop(false);
    }
  }
  // Takt-Balken: nur Transform (kein Layout), nur bei sichtbarer Änderung schreiben
  balken(p) {
    const bars = this.bars || (this.bars = [...this.el.querySelectorAll('.fcBar b')]), alt = this.barK || (this.barK = []);
    this.teile.forEach((T, i) => {
      const a = T.pf, b = this.teile[i + 1] ? this.teile[i + 1].pf : 1;
      const k = Math.round(Math.min(1, Math.max(0, (p - a) / (b - a))) * 100) / 100;
      if (bars[i] && alt[i] !== k) { alt[i] = k; bars[i].style.transform = `scaleX(${k})`; }
    });
  }
  // Beat planen (Vorlauf 0,25 s auf der Audio-Uhr): Achtel-Raster
  planen() {
    const au = this.app.audio; if (this.a0 === null || !au.ctx) return;
    const horizon = au.ctx.currentTime - this.a0 + 0.25;
    while (this.sched * SPB / 2 < horizon) {
      const e = this.sched++, tE = this.a0 + e * SPB / 2, bar = (e / 8) | 0, i = e % 8;
      if (this.outro >= 0 && this.t - this.outro > 2.0) continue; // Ausklang: nichts Neues mehr
      const drop = this.ramp.ph === 'fast' || (this.ramp.ph === 'slow' && Math.abs(e / 2 - this.ramp.drop) < 2);
      if ((drop ? KICK_D : KICK)[i]) au.beat('bkick', tE);
      if (CLAP[i]) au.beat('bclap', tE, { pan: 0.15 });
      if (HAT[i] && this.ramp.ph !== 'slow') au.beat('bhat', tE, { pan: -0.3, gain: 0.8 + 0.3 * (i % 4 === 3) });
      if (i === 0 || i === 3 || i === 6) au.beat('bbass', tE, { rate: Math.pow(2, BASS[bar % 4] / 12) });
      au.beat('bpluck', tE, { rate: Math.pow(2, MEL[bar % 4][i] / 12), pan: (i % 2 ? 0.35 : -0.35), gain: this.ramp.ph === 'slow' ? 0.55 : 0.8 });
    }
  }
  // Jeder Schlag: Zoom-Stoß/Wackler; jeder 2. Schlag (bzw. jeder im Drop) ein harter Schnitt; Drop = Blitz + RGB + schnell
  schlag(k) {
    const R = this.ramp, tB = k * SPB;
    // Schlag verpasst (Hänger, Uhr nachgezogen): Zustand weiterschalten, aber kein verspäteter Schnitt
    const spaet = this.t - tB > 0.03;
    let cut = false, drop = false;
    if (R.ph === 'slow' && k === R.drop) {
      drop = true; R.ph = 'fast'; R.tFast = this.t;
      this.punch = 1; this.shake = 0.12;
      if (this.flashes < 3) { this.flashK = this.flashArm ? 0.18 : 0.6; this.flashes++; }
      this.rgbK = this.flashArm ? 0 : 1;
      cut = true;
      this.app.haptics.buzz('star');
    } else if (R.ph === 'slow') {
      this.punch = Math.max(this.punch, 0.25);
    } else {
      this.punch = Math.max(this.punch, k % 2 ? 0.25 : 0.5);
      if (!RM) this.shake = Math.max(this.shake, k % 2 ? 0 : 0.05);
      cut = k > 0 && (k % 2 === 0 || R.ph === 'fast');
    }
    if (this.outro >= 0 && this.t - this.outro > 0.2) cut = cut && k % 2 === 0;
    if (spaet && cut) { cut = false; this.mark('spaet', { n: k }); }
    if (cut) {
      const nxt = this.wahl(drop);
      this.cut(nxt, tB, !drop && this.wischArt());
    }
    if (this.on) this.glitzer(drop ? 6 : k % 2 ? 1 : 3);
    this.mark('schlag', { n: k, cut, drop });
  }
  // jeder 3. Schnitt (außerhalb von Zeitlupe/Drop) ist ein Wisch-Schwenk
  wischArt() { return !RM && this.cutN % 3 === 1 && this.ramp.ph === 'normal' && this.outro < 0; }
  wischGleich() { return this.wischArt() && this.nb > 0 && this.nb % 2 === 0; }
  // Kamera-Wahl: nicht zweimal dieselbe; vor einem Höhepunkt die weite Seite bzw. nah von vorn; im Drop Kreisfahrt/von unten
  wahl(drop) {
    if (this.outro >= 0) return this.shot === 'orbit' ? 'unten' : 'orbit';
    if (drop) return this.shot === 'orbit' ? 'unten' : 'orbit';
    const T = this.teile[this.ramp.i], S = this.S;
    if (T && S && this.app.player.stunt === S) {
      const tBis = (T.ph - S.p) * S.dur / Math.max(0.3, this.ts);
      if (tBis > 0 && tBis < 1.2) return this.shot === 'side' ? 'front' : 'side';
    }
    let n; do { n = SHOTS[(this.shotI++) % SHOTS.length]; } while (n === this.shot);
    return n;
  }
  cut(shot, tB, whip = false) {
    const prev = this.shot;
    this.shot = shot; this.fresh = true; this.cutN++;
    if (whip) this.whip = { t0: this.t };
    this.app.camSchnitt = true; // Takt-Darstellung: Kamera nicht über den Schnitt hinweg glätten
    const ta = this.a0 !== null && this.app.audio.ctx ? this.app.audio.ctx.currentTime - this.a0 : null;
    this.cuts.push({ shot, von: prev, beat: tB, t: +this.t.toFixed(4), ta: ta === null ? null : +ta.toFixed(4), whip });
  }
  // ------------------------------------------------------------ Kamera (nach Player.updateCamera, überschreibt sie)
  camera(cam, realDt) {
    if (!this.on) return;
    const pl = this.app.player, S = this.S, P = pl.pos, h = realDt || 1 / 60;
    const yaw = S ? S.yaw : pl.yaw;
    // Flugrichtung (ohne Rolle) aus dem mitgeführten Rahmen, weich – nach der Figur geradeaus
    if (S && pl.stunt === S) _f.copy(_Z).applyQuaternion(S.qt).applyAxisAngle(_Y, yaw); else _f.set(Math.sin(pl.yaw), 0, Math.cos(pl.yaw));
    if (this.fresh) this.fwd.copy(_f); else this.fwd.lerp(_f, 1 - Math.exp(-h * 7)).normalize();
    const f = this.fwd;
    _s.crossVectors(_UP, f); if (_s.lengthSq() < 1e-4) _s.set(Math.cos(yaw), 0, -Math.sin(yaw)); _s.normalize();
    _u.crossVectors(f, _s).normalize(); if (_u.y < 0) _u.negate();
    const portrait = cam.aspect < 1;
    switch (this.shot) {
      case 'chase': _p.copy(P).addScaledVector(f, -3.0).addScaledVector(_u, 1.0).addScaledVector(_s, 1.3).addScaledVector(_UP, 0.4); _l.copy(P).addScaledVector(f, 1.6); break; // seitlich versetzt: nicht im eigenen Rauch
      case 'front': _p.copy(P).addScaledVector(f, 2.5).addScaledVector(_s, 0.8).addScaledVector(_UP, 0.35); _l.copy(P); break;
      case 'unten': _p.copy(P).addScaledVector(_UP, -2.6).addScaledVector(_s, 1.8).addScaledVector(f, 1.2); _l.copy(P).addScaledVector(_UP, 0.4); break;
      case 'orbit': this.orbitA += h * (this.outro >= 0 ? 0.7 : 1.8); _p.set(P.x + Math.cos(this.orbitA) * 3.3, P.y + 0.8, P.z + Math.sin(this.orbitA) * 3.3); _l.copy(P); break;
      default: { // weite Seite: Zuschauer-Blick auf die ganze Figur
        if (S && S.c) {
          const D = Math.max(6.5, (S.R || 3) * (portrait ? 2.6 : 2.0));
          _p.copy(S.c).lerp(P, 0.25).addScaledVector(S.camSide, D); _p.y += -0.3 * (S.Rb ? S.Rb.y : 1);
          _l.copy(S.c).lerp(P, 0.3);
        } else { _p.copy(P).addScaledVector(_s, 6).addScaledVector(_UP, 0.4); _l.copy(P); }
      }
    }
    // nicht ins Gras/in Blumen und nicht in Baumkronen: mind. 1,4 m über dem Boden, nahe Bäume → näher an die Figur
    const gm = this.app.game;
    for (let i = 0; i < 4 && gm.nearTree(_p.x, _p.z, 0.6) && _p.y < height(_p.x, _p.z) + 9; i++) _p.lerp(P, 0.3);
    const g = height(_p.x, _p.z) + 1.4; if (_p.y < g) _p.y = g;
    // Figur nie aus dem Bild: nahe am Rand zieht der Blick zu ihr (Maß: letztes Bild)
    _e.copy(P).project(cam); const e = Math.max(Math.abs(_e.x), Math.abs(_e.y)) * (_e.z < 1 ? 1 : 2);
    if (!this.fresh && e > 0.6) _l.lerp(P, Math.min(1, (e - 0.6) * 2.2));
    // Nah-Kameras hängen fest an der Figur (Versatz geglättet, nicht die Lage – sonst holt die Figur im „zack“ die
    // Kamera ein); die weite Seite steht in der Luft und gleitet
    const rel = this.shot !== 'side';
    _p.sub(rel ? P : _Z0); _l.sub(rel ? P : _Z0);
    if (this.fresh) { this.camOff.copy(_p); this.lookOff.copy(_l); this.fresh = false; }
    else { this.camOff.lerp(_p, 1 - Math.exp(-h * (rel ? 9 : 5))); this.lookOff.lerp(_l, 1 - Math.exp(-h * 16)); }
    this.camPos.copy(this.camOff).add(rel ? P : _Z0); this.camLook.copy(this.lookOff).add(rel ? P : _Z0);
    if (rel && this.camPos.distanceTo(P) < 1.8) this.camPos.sub(P).setLength(1.8).add(P); // nie in die Figur
    { const g2 = height(this.camPos.x, this.camPos.z) + 1.2; if (this.camPos.y < g2) this.camPos.y = g2; }
    cam.position.copy(this.camPos);
    if (this.shake > 0.002) { const k = RM ? 0 : this.shake; cam.position.x += Math.sin(this.t * 71) * k; cam.position.y += Math.sin(this.t * 53 + 1) * k; }
    cam.lookAt(this.camLook);
    // Wisch-Schwenk: 0,1 s vor dem Schnitt schnell wegdrehen, nach dem Schnitt 0,13 s in derselben Richtung ankommen;
    // Unschärfe im Endbild ∝ Drehtempo
    let wisch = 0;
    if (this.whip) {
      const dt0 = this.t - this.whip.t0;
      if (dt0 < 0.13) { const k = 1 - ease(dt0 / 0.13); cam.rotateY(-0.9 * k); wisch = k; } else this.whip = null;
    } else if (this.wischGleich()) {
      const nb = this.nb * SPB - this.t;
      if (nb < 0.1 && nb > 0) { const k = ease(1 - nb / 0.1); cam.rotateY(0.9 * k); wisch = k; }
    }
    this.wischK = wisch; // (Tests: während eines Wisch-Schwenks darf die Figur kurz aus dem Bild)
    // Sichtwinkel: Hochformat wie im Spiel, Zoom-Stoß auf dem Beat
    const base = portrait ? THREE.MathUtils.clamp(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(33)) / cam.aspect) * 180 / Math.PI, 60, 76) : 62;
    const sb = this.shot === 'front' ? 0.92 : this.shot === 'unten' ? 1.05 : 1;
    cam.fov = base * sb * (1 - 0.14 * this.punch);
    cam.updateProjectionMatrix();
    // Endbild-Effekte
    const u = this.app.renderer.post && this.app.renderer.post.mComp && this.app.renderer.post.mComp.uniforms;
    if (u && QS.get('fcfx') !== '0') {
      u.uFlash.value = Math.min(0.7, this.flashK);
      if (u.uWisch) u.uWisch.value.set(0.05 * wisch, 0);
      if (u.uRgb) u.uRgb.value = 0.009 * this.rgbK;
    }
    const fl = this.el && this.el.querySelector('.fcFlash');
    if (fl && (!u || !this.app.renderer.q.post)) fl.style.opacity = Math.min(0.7, this.flashK).toFixed(3); // Niedrig: Blitz als Ebene
  }
}
