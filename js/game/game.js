// Level-Ablauf: Aufbau, Kombos, Hindernisse, Zielpfeil, Sieg/Niederlage, Sterne
import * as THREE from 'three';
import { toonMat } from '../engine/gfx.js';
import { Build, P, rng, hashStr } from '../engine/geo.js';
import { height, pond } from '../world/terrain.js';
import { Flyers, Animals, Wasps } from '../actors/npcs.js';
import { makeTask, GlitterStar } from './objectives.js';
import { DIFFS, worldOf } from './levels.js';

const _v = new THREE.Vector3(), _w = new THREE.Vector3();
const RAINBOW = [0xff5a6e, 0xff9a3c, 0xffd84a, 0x7ee06a, 0x4fc8ff, 0x8a7bff, 0xd67cff];

export class Game {
  constructor(app) {
    this.app = app;
    this.scene = app.scene; this.player = app.player; this.bursts = app.bursts; this.world = app.world;
    this.animals = new Animals(); this.scene.add(this.animals.group);
    this.wasps = new Wasps(4); this.scene.add(this.wasps.group);
    this.flyers = null;
    this.state = 'idle'; // idle | countdown | play | won | failed | paused
    this.tasks = [];
    // Zielpfeil
    const ab = new Build();
    ab.add(P.cone(0.2, 0.42, 12), 0xffffff, { p: [0, 0, 0.3], r: [Math.PI / 2, 0, 0], unlit: 0.5 });
    ab.add(P.cyl(0.07, 0.07, 0.35, 8), 0xffffff, { p: [0, 0, -0.05], r: [Math.PI / 2, 0, 0], unlit: 0.5 });
    this.arrow = new THREE.Mesh(ab.build(), toonMat({ vc: true, color: 0xffe07a, rim: 1.2, emis: 0.5, transparent: true, opacity: 0.9 }));
    this.arrow.visible = false; this.arrow.renderOrder = 5;
    this.scene.add(this.arrow);
    // Regenwolken
    const rb = new Build();
    [[0, 0, 0, 2.6], [2.3, -0.3, 0.4, 1.9], [-2.2, -0.2, -0.3, 2.0], [0.6, 0.9, -0.2, 1.8], [-0.8, -0.4, 1.4, 1.6]].forEach(([x, y, z, r]) => rb.add(P.ico(r, 2), 0xffffff, { p: [x, y, z], s: [1, 0.75, 1] }));
    this.rainGeo = rb.build();
    this.rainMat = toonMat({ vc: true, color: 0x9aa4c4, rim: 0.8, soft: 0.4 });
    this.rains = [];
  }

  get diff() { return this.diffCfg; }

  load(level, diffId, look) {
    this.clear();
    this.level = level; this.diffId = diffId; this.diffCfg = DIFFS[diffId];
    const w = worldOf(level);
    this.rnd = rng(hashStr(level.id + ':' + diffId + ':' + (level.daily ? '' : '')));
    if (!this.world.def || this.world.def.id !== w.id || this.world.seed !== level.id) {
      this.world.build(w, this.app.qualityForBuild(), level.id);
      this.world.seed = level.id;
    }
    const P0 = pond();
    // Bäume als Hindernisse
    this.treePts = [];
    const tu = this.world.trees.userData;
    for (const k of Object.keys(tu)) for (const t of tu[k]) this.treePts.push(t);
    const cols = [];
    for (const t of this.treePts) {
      const y = height(t.x, t.z);
      cols.push({ c: new THREE.Vector3(t.x, y + 4.4 * t.s, t.z), r: 2.5 * t.s });
      cols.push({ c: new THREE.Vector3(t.x, y, t.z), r: 0.55 * t.s, h: 4 * t.s, cyl: true });
    }
    this.player.colliders = cols;
    this.player.landables = [];
    // Start
    const sa = this.rnd() * Math.PI * 2;
    const sr = P0[2] > 1 ? P0[2] + 14 : 8;
    this.spawn = new THREE.Vector3(Math.cos(sa) * sr, 0, Math.sin(sa) * sr);
    this.spawn.y = height(this.spawn.x, this.spawn.z) + 3.2;
    this.spawnYaw = Math.atan2(-this.spawn.x, -this.spawn.z) + (this.rnd() - 0.5) * 0.6;
    if (P0[2] > 1) this.spawnYaw += 0.9;
    const D = this.diffCfg;
    this.player.baseSpeed = D.speed; this.player.turnRate = D.turn; this.player.speed = D.speed;
    this.player.reset(this.spawn, this.spawnYaw);
    // Tiere
    const specs = [];
    for (const [kind, n] of level.animals || []) {
      for (let i = 0; i < n; i++) {
        let x, z, ok = false;
        for (let k = 0; k < 50 && !ok; k++) {
          if (kind === 'ente' && P0[2] > 1) { const a = this.rnd() * 6.28, r = this.rnd() * P0[2] * 0.55; x = P0[0] + Math.cos(a) * r; z = P0[1] + Math.sin(a) * r; ok = true; break; }
          const a = this.rnd() * 6.28, r = 16 + this.rnd() * 60;
          x = Math.cos(a) * r; z = Math.sin(a) * r;
          if (this.nearTree(x, z, 3.5)) continue;
          if (P0[2] > 1 && Math.hypot(x - P0[0], z - P0[1]) < P0[2] * 1.15) continue;
          if (specs.some(s => (s.x - x) ** 2 + (s.z - z) ** 2 < 100)) continue;
          ok = true;
        }
        specs.push({ kind, x, z, roam: kind === 'ente' ? 5 : 5 });
      }
    }
    specs.sort(() => this.rnd() - 0.5);
    this.animals.setup(specs, this.rnd, !!level.sleepy);
    // Luft-Freunde
    if (this.flyers) { this.scene.remove(this.flyers.group); this.flyers.group.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); }
    this.flyers = new Flyers(this.rnd, w.id === 'abend' ? 4 : 10, w.id === 'abend' ? 3 : 9);
    this.scene.add(this.flyers.group);
    // Aufgaben
    this.tasks = level.tasks.map(cfg => makeTask(this, cfg));
    this.glitter = D.id !== 'schwer' ? new GlitterStar(this) : null;
    // Hindernisse
    const waspN = Math.min(4, D.wasps + (level.id >= '3' && D.wasps ? 1 : 0));
    const wspots = [];
    for (let i = 0; i < waspN; i++) {
      const tg = this.tasks[0].target ? this.tasks[0].target() : null;
      const a = this.rnd() * 6.28, r = 20 + this.rnd() * 45;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      wspots.push({ x, y: height(x, z) + 3 + this.rnd() * 3, z, r: 4 + this.rnd() * 4 });
    }
    this.wasps.setup(wspots, D.id === 'schwer' ? 1 : 0.7);
    const rainN = D.rain ? (D.id === 'schwer' ? 2 : 1) : 0;
    for (let i = 0; i < rainN; i++) {
      const m = new THREE.Mesh(this.rainGeo, this.rainMat);
      const a = this.rnd() * 6.28, r = 20 + this.rnd() * 40;
      m.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      m.position.y = height(m.position.x, m.position.z) + 8;
      m.scale.setScalar(1.2);
      this.scene.add(m);
      this.rains.push({ m, a: this.rnd() * 6.28, sp: 1 + this.rnd(), cx: m.position.x, cz: m.position.z });
    }
    this.gustT = 8 + this.rnd() * 6; this.gust = null;
    // Zustand
    this.time = 0; this.combo = 0; this.maxCombo = 0; this.lastHit = -99; this.hits = 0; this.bumps = 0;
    this.limit = D.timeLimit ? Math.round(level.par * D.par * 1.5) : 0;
    this.par = Math.round(level.par * D.par);
    this.comboReq = Math.max(4, Math.ceil(this.tasks.reduce((a, t) => a + t.max, 0) * 0.45));
    this.bonusFound = false; this.wonT = 0;
    this.shownHints = {};
    this.race = this.tasks.find(t => t.rival);
    this.state = this.race ? 'countdown' : 'play';
    this.countT = this.race ? 3.2 : 0;
    this.player.frozen = !!this.race;
    this.player.on = {
      land: (s) => this.onLand(s), takeoff: () => this.app.audio.sfx('takeoff'),
      stunt: (tp) => { this.app.audio.sfx(tp === 'loop' ? 'loop' : 'roll'); this.app.haptics.buzz('stunt'); this.player.kick(7, 0); },
      stuntDone: (tp) => this.onStuntDone(tp),
    };
    this.app.player.critter.happyT = 0;
    this.app.audio.setWorld(w);
    this.app.audio.setIntensity(0.35);
  }

  nearTree(x, z, gap) {
    for (const t of this.treePts || []) if ((t.x - x) ** 2 + (t.z - z) ** 2 < (gap + 2.5 * t.s) ** 2) return true;
    return false;
  }

  clear() {
    this.tasks.forEach(t => t.dispose()); this.tasks = [];
    if (this.glitter) { this.glitter.dispose(); this.glitter = null; }
    this.rains.forEach(r => this.scene.remove(r.m)); this.rains = [];
    this.animals.clear();
    this.wasps.setup([]);
    this.bursts.clear();
    this.arrow.visible = false;
    this.state = 'idle';
    this.player.frozen = false; this.player.cheer = false; this.player.hover = false; this.finale = null;
    document.body.classList.remove('won');
  }

  // Treffer: Kombo, Klang, Haptik, Partikel, Kamera-Kick
  hit(pos, kind, col = 0xffe07a) {
    const D = this.diffCfg;
    if (this.time - this.lastHit <= D.comboWin) this.combo++; else this.combo = 1;
    this.lastHit = this.time; this.hits++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    const pan = this.app.screenPan(pos);
    this.app.audio.collect(this.combo, pan, kind);
    this.app.haptics.buzz(kind === 'ring' ? 'ring' : 'collect');
    this.bursts.emit({ n: 16 + Math.min(20, this.combo * 2), pos, colors: [col, 0xffffff, 0xfff3b0], shape: 1, size: 0.42, speed: 5, up: 1.5, life: 0.9, grav: -2 });
    this.bursts.emit({ n: 1, pos, colors: [col], shape: 5, size: 3.2, speed: 0, up: 0, life: 0.35, grav: 0, drag: 0 });
    const c = this.player.critter;
    if (c) { c.happyT = 0.7; c.squashV += 4; }
    this.player.kick(2.5 + Math.min(4, this.combo * 0.5), 0.08);
    // Teilziel geschafft → automatische Freuden-Schraube (ersetzt den Schraube-Knopf)
    const last = this.tasks.length && this.tasks.every(tk => tk.done);
    if (!last) this.celebrateRoll(col, this.tasks.some(tk => tk.done && !tk._cheered && (tk._cheered = true)));
    this.app.ui.combo(this.combo);
    this.app.audio.setIntensity(Math.min(1, 0.55 + this.combo * 0.08));
    this.app.stat('collected');
    if (kind === 'ring') this.app.stat('rings');
    if (kind === 'visit' || kind === 'deliver') this.app.stat('animals');
    this.app.discover(kind);
    this.app.ui.hudTasks(this.tasks);
  }
  // Freuden-Schraube: Körper dreht um die Längsachse, Spiral-Glitzer, Woosh. Steuerung bleibt frei.
  // big = eine ganze Teilaufgabe fertig (z. B. alle Ringe) → Doppel-Schraube + Sternenring.
  celebrateRoll(col = 0xffe07a, big = false) {
    const pl = this.player, c = pl.critter; if (!c) return;
    const pending = Math.abs(c.rollTarget - c.rollAng) / (Math.PI * 2);
    const add = big ? 2 : 1;
    if (pending + add <= 2.6) { c.roll(add, (this.hits & 1) ? -1 : 1); this.app.stat('rolls'); }
    this.app.audio.sfx('roll', 0, { gain: big ? 0.85 : 0.45, rate: big ? 0.92 : 1.12 });
    if (this.app.funOn('hupe')) this.app.audio.sfx('hupe', 0, { gain: 0.9 });
    this.rollCol = col; this.rollBig = big; // Doppel-Helix aus den Flügelspitzen → rollTrail()
    if (big) {
      this.bursts.emit({ n: 1, pos: pl.pos, colors: [0xfff3b0], shape: 5, size: 5, speed: 0, up: 0, life: 0.5, grav: 0, drag: 0 });
      this.bursts.emit({ n: 24, pos: pl.pos, colors: [col, 0xffffff, 0xffe07a], shape: 1, size: 0.45, speed: 6, up: 1, life: 1.1, grav: -1 });
      this.app.audio.sfx('combo'); this.app.haptics.buzz('star');
      this.app.ui.toast('🌀 Teilaufgabe geschafft!');
    }
  }
  // Während der Schraube: Glitzer an beiden Flügelspitzen → beim Vorwärtsflug entsteht eine Doppel-Helix
  rollTrail(dt) {
    const pl = this.player, c = pl.critter;
    if (!c || !c.rolling) return;
    const a = c.rollAng, s = (c.wingSpan || 0.95) * (c.size || 1);
    const fx = Math.sin(pl.yaw), fz = Math.cos(pl.yaw), rx = Math.cos(pl.yaw), rz = -Math.sin(pl.yaw);
    const n = Math.max(1, Math.round(dt * 60));
    for (let side = -1; side <= 1; side += 2) {
      const ca = Math.cos(a) * side * s, sa = Math.sin(a) * side * s;
      for (let k = 0; k < n; k++) {
        const back = -k / n * pl.speed * dt;
        _v.set(pl.pos.x + rx * ca + fx * back, pl.pos.y + sa, pl.pos.z + rz * ca + fz * back);
        this.bursts.emit({ n: 1, pos: _v, colors: [side > 0 ? (this.rollCol || 0xffe07a) : 0xffffff], shape: 1, size: this.rollBig ? 0.46 : 0.34, speed: 0.15, up: 0, life: 0.7, grav: 0, drag: 0 });
      }
    }
  }
  // Gesamtaufgabe geschafft → Sieger-Looping mit Regenbogen-Schweif, Feuerwerk am Scheitel, Konfetti am Ende
  startFinale() {
    const pl = this.player, c = pl.critter;
    if (c) { const T = Math.PI * 2; c.rollTarget = Math.ceil(c.rollAng / T - 0.05) * T; if (c.rollTarget < c.rollAng) c.rollTarget += T; }
    pl.stunt = null;
    const ok = pl.tryStunt('loop', { grand: true, dur: 2.3 });
    this.finale = { t: 0, loop: ok, apex: false, end: ok ? -1 : 0, hue: 0 };
    this.app.audio.sfx('combo'); this.app.audio.sfx('loop', 0, { gain: 1.2, rate: 0.9 });
    if (this.app.funOn('hupe')) setTimeout(() => this.app.audio.sfx('hupe', 0, { gain: 1 }), 700);
    this.app.haptics.buzz('stunt');
    pl.kick(9, 0.12);
    this.bursts.emit({ n: 1, pos: pl.pos, colors: [0xffffff], shape: 5, size: 6, speed: 0, up: 0, life: 0.45, grav: 0, drag: 0 });
    if (!ok) this.finaleEnd();
  }
  finaleUpdate(dt) {
    const F = this.finale; if (!F) return;
    F.t += dt;
    const pl = this.player, S = pl.stunt;
    if (S && S.grand) {
      // Regenbogen-Schweif
      F.hue = (F.hue + dt * 1.6) % 1;
      const n = 2; // Lebensdauer 2,8 s > Looping-Dauer → Kreis schließt sich sichtbar
      for (let i = 0; i < n; i++) {
        _v.copy(pl.pos).add(_w.set((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4));
        this.bursts.emit({ n: 1, pos: _v, colors: [RAINBOW[(((F.hue * RAINBOW.length) | 0) + i) % RAINBOW.length]], shape: 0, size: 0.9, speed: 0.2, up: 0, life: 2.8, grav: 0.05, drag: 1 });
      }
      if (Math.random() < 0.5) this.bursts.emit({ n: 1, pos: pl.pos, colors: [0xffffff, 0xfff3b0], shape: 1, size: 0.45, speed: 1.2, up: 0, life: 1.1, grav: -0.5 });
      if (!F.apex && S.t / S.dur > 0.5) {
        F.apex = true;
        this.firework(_v.copy(pl.pos).add(_w.set(0, 2.2, 0)), 0xffd84a);
        this.app.audio.sfx('glitter'); this.app.haptics.buzz('star');
      }
    }
    // Nachzügler-Feuerwerk nach dem Looping
    if (F.end >= 0) {
      F.end += dt;
      if (F.end > 0.45 && !F.fw2) { F.fw2 = true; this.firework(_v.copy(pl.pos).add(_w.set(-3.5, 4.5, 2)), 0xff7eb6); }
      if (F.end > 0.8 && !F.fw3) { F.fw3 = true; this.firework(_v.copy(pl.pos).add(_w.set(3.5, 5, -1.5)), 0x7cc4ff); }
    }
    if (F.loop && !S && F.end < 0) this.finaleEnd(); // Sicherheitsnetz, falls stuntDone nicht kam
  }
  finaleEnd() {
    const F = this.finale; if (!F || F.end > 0.001) return;
    F.end = 0.0011;
    const pl = this.player;
    pl.cheer = true; pl.hover = true;
    this.app.audio.sfx('fanfare');
    this.app.audio.setIntensity(1);
    this.app.haptics.buzz('win');
    pl.kick(6, 0.3);
    this.bursts.emit({ n: 1, pos: pl.pos, colors: [0xfff3b0], shape: 5, size: 8, speed: 0, up: 0, life: 0.6, grav: 0, drag: 0 });
    for (let i = 0; i < 4; i++) this.bursts.emit({ n: 40, pos: _v.copy(pl.pos).add(_w.set(0, 2.5, 0)), colors: [0xff6f9a, 0xffd84a, 0x6fd0ff, 0x9cf07a, 0xc08cff, 0xffffff], shape: 2, size: 0.26, speed: 9, up: 4, life: 2.6, grav: -3.5, drag: 1.2, spin: 10 });
  }
  firework(pos, col) {
    this.bursts.emit({ n: 1, pos, colors: [col], shape: 5, size: 4.5, speed: 0, up: 0, life: 0.5, grav: 0, drag: 0 });
    this.bursts.emit({ n: 44, pos, colors: [col, 0xffffff, col], shape: 1, size: 0.5, speed: 8, up: 0, life: 1.5, grav: -2.2, drag: 1.6 });
    this.bursts.emit({ n: 18, pos, colors: [0xfff3b0], shape: 0, size: 0.35, speed: 4, up: 0, life: 1.2, grav: -3, drag: 1.2 });
    this.app.audio.sfx('glitter', this.app.screenPan(pos), { gain: 0.6, rate: 1.1 + Math.random() * 0.2 });
  }
  bonus(pos) {
    this.bonusFound = true;
    this.app.audio.sfx('glitter', this.app.screenPan(pos));
    this.app.haptics.buzz('star');
    this.bursts.emit({ n: 40, pos, colors: [0xffe07a, 0xffffff, 0xffc0e0], shape: 1, size: 0.5, speed: 7, up: 2, life: 1.3, grav: -1.5 });
    this.app.ui.toast('⭐ Glitzerstern gefunden!');
    this.app.stat('glitter');
  }
  onLand(spot) {
    this.app.audio.sfx('land');
    this.app.haptics.buzz('land');
    this.bursts.emit({ n: 10, pos: this.player.pos, colors: [0xffffff, 0xe0ffd0], shape: 0, size: 0.25, speed: 2, up: 0.8, life: 0.6, grav: -1 });
    let used = false;
    for (const t of this.tasks) if (t.onLand && t.onLand(spot)) used = true;
    if (!this.shownHints.takeoff) { this.shownHints.takeoff = true; this.app.ui.hint(used ? '🍯 Nektar schlürfen … dann ▲ oben halten zum Abheben' : '▲ Oben halten zum Abheben'); }
    this.app.stat('landings');
  }
  onStuntDone(type) {
    this.app.stat(type === 'loop' ? 'loops' : 'rolls');
    if (this.state === 'won') { this.finaleEnd(); return; }
    this.bursts.emit({ n: 18, pos: this.player.pos, colors: [0xffe07a, 0xb0e0ff, 0xffb0e0], shape: 1, size: 0.35, speed: 3.5, up: 1, life: 0.9, grav: -1 });
    for (const t of this.tasks) if (t.onStunt) t.onStunt(type);
    this.app.ui.hudTasks(this.tasks);
  }
  fail(msg) {
    if (this.state !== 'play') return;
    this.state = 'failed';
    this.player.frozen = true;
    this.app.audio.sfx('fail');
    this.app.audio.setIntensity(0.2);
    this.app.onFailed(msg);
  }

  update(dt, t, input) {
    const pl = this.player;
    if (this.state === 'countdown') {
      const prev = Math.ceil(this.countT);
      this.countT -= dt;
      const now = Math.ceil(this.countT);
      if (now !== prev && now > 0) { this.app.ui.countdown(now); this.app.audio.sfx('tick'); }
      if (this.countT <= 0) {
        this.state = 'play'; pl.frozen = false; this.app.ui.countdown('Los!'); this.app.audio.sfx('go');
        if (this.race) this.race.start();
      }
    }
    const playing = this.state === 'play';
    if (playing) {
      this.time += dt;
      for (const a of input.take()) {
        if (a === 'pause') this.app.pause();
      }
    }
    pl.update(dt, t, playing ? input : null);
    pl.updateCamera(this.app.camera, dt, t);
    this.animals.update(dt, t, pl.pos);
    this.flyers.update(dt, t);
    for (const task of this.tasks) task.update(dt, t);
    if (this.glitter) this.glitter.update(dt, t);
    this.rollTrail(dt);
    if (playing) this.hazards(dt, t);
    else this.wasps.update(dt, t, null);
    // Kombo verfällt
    if (this.combo > 0 && this.time - this.lastHit > this.diffCfg.comboWin) { this.combo = 0; this.app.ui.combo(0); this.app.audio.setIntensity(0.4); }
    // Zielpfeil
    this.updateArrow(dt, t);
    // Hinweise
    if (playing) this.hints();
    // Sieg / Zeit
    if (playing && this.tasks.every(tk => tk.done)) this.win();
    if (playing && this.limit) {
      const left = this.limit - this.time;
      if (left <= 10 && Math.ceil(left) !== this._lastTick && left > 0) { this._lastTick = Math.ceil(left); this.app.audio.sfx('tick'); }
      if (left <= 0) this.fail('Die Zeit ist um! Magst du es nochmal versuchen?');
    }
    if (this.state === 'won') {
      this.wonT += dt;
      this.finaleUpdate(dt);
      const F = this.finale, ready = F && F.end > 1.6;
      if ((ready || this.wonT > 6) && !this.resultShown) { this.resultShown = true; this.app.ui.show('result', this.app.lastResult); }
      if (F && F.end > 0 && Math.random() < dt * 14) this.bursts.emit({ n: 6, pos: _v.copy(pl.pos).add(_w.set((Math.random() - 0.5) * 6, 3 + Math.random() * 2, (Math.random() - 0.5) * 6)), colors: [0xff6f9a, 0xffd84a, 0x6fd0ff, 0x9cf07a, 0xc08cff], shape: 2, size: 0.22, speed: 2, up: 0, life: 2.2, grav: -2.2, drag: 1.5, spin: 8 });
    }
    this.app.ui.hudTime(this.time, this.limit, this.par);
  }

  hazards(dt, t) {
    const pl = this.player, D = this.diffCfg;
    // Wespen
    this.wasps.update(dt, t, pl, (w, push) => {
      pl.push(push); pl.dizzyT = 1.0; pl.critter && pl.critter.bump(6); pl.kick(3, 0.35);
      this.app.audio.sfx('boing', this.app.screenPan(w.pos)); this.app.haptics.buzz('bump');
      this.bursts.emit({ n: 8, pos: pl.pos, colors: [0xffe07a, 0xffffff], shape: 1, size: 0.3, speed: 3, up: 1, life: 0.8 });
      this.combo = 0; this.app.ui.combo(0); this.bumps++;
      if (!this.shownHints.wasp) { this.shownHints.wasp = true; this.app.ui.toast('🐝 Hui! Eine freche Wespe hat dich geschubst!'); }
    });
    // Windböen
    if (D.gusts > 0) {
      this.gustT -= dt;
      if (this.gustT <= 0 && !this.gust) {
        const a = this.rnd() * 6.28;
        this.gust = { t: 0, dur: 2.4, dir: new THREE.Vector3(Math.cos(a), 0.05, Math.sin(a)) };
        this.app.audio.sfx('gust'); this.app.haptics.buzz('gust');
        if (!this.shownHints.gust) { this.shownHints.gust = true; this.app.ui.toast('💨 Windböe! Halte dagegen!'); }
      }
      if (this.gust) {
        const G = this.gust; G.t += dt;
        const k = Math.sin(Math.PI * Math.min(1, G.t / G.dur));
        pl.ext.addScaledVector(G.dir, D.gusts * D.speed * k * dt); // Stärke relativ zum Tempo
        this.world.windBoost = k * D.gusts;
        if (Math.random() < dt * 30) {
          _v.copy(pl.pos).add(_w.set((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 12)).addScaledVector(G.dir, -6);
          this.bursts.emit({ n: 1, pos: _v, vel: _w.copy(G.dir).multiplyScalar(14), colors: [0xffffff], shape: 4, size: 1.6, speed: 0, up: 0, life: 0.8, grav: 0, drag: 0, rot: Math.PI / 2 });
        }
        if (G.t > G.dur) { this.gust = null; this.gustT = 10 + this.rnd() * 9; this.world.windBoost = 0; }
      }
    }
    // Regenwolken
    for (const r of this.rains) {
      r.a += dt * 0.05 * r.sp;
      r.m.position.x = r.cx + Math.cos(r.a) * 12; r.m.position.z = r.cz + Math.sin(r.a) * 12;
      const gy = height(r.m.position.x, r.m.position.z);
      r.m.position.y = Math.max(gy + 8, 8);
      if (Math.random() < dt * 70) {
        _v.set(r.m.position.x + (Math.random() - 0.5) * 7, r.m.position.y - 1.2, r.m.position.z + (Math.random() - 0.5) * 7);
        this.bursts.emit({ n: 1, pos: _v, vel: _w.set(0, -11, 0), colors: [0x9cc8ff, 0xc8e0ff], shape: 4, size: 1.1, speed: 0, up: 0, life: (r.m.position.y - gy) / 11, grav: 0, drag: 0, rot: 0 });
      }
      const dx = pl.pos.x - r.m.position.x, dz = pl.pos.z - r.m.position.z;
      if (Math.hypot(dx, dz) < 4.2 && pl.pos.y < r.m.position.y + 1) {
        if (pl.wetT <= 0) {
          this.app.audio.sfx('splash'); this.app.haptics.buzz('bump');
          if (!this.shownHints.rain) { this.shownHints.rain = true; this.app.ui.toast('💧 Plitsch! Nasse Flügel – kurz langsamer'); }
        }
        pl.wetT = 2.5;
      }
    }
    if (pl.wetT > 0 && Math.random() < dt * 10) this.bursts.emit({ n: 1, pos: pl.pos, colors: [0xa8d0ff], shape: 4, size: 0.35, speed: 0.5, up: -1, life: 0.5, grav: -6, rot: 0 });
    if (pl.outside && !this.shownHints.edge) { this.shownHints.edge = true; this.app.ui.toast('🌳 Hier endet die Wiese – zurück geht’s!'); }
  }

  guideTarget() {
    for (const t of this.tasks) if (!t.done) { const p = t.target(); if (p) return p; }
    return null;
  }
  updateArrow(dt, t) {
    const A = this.arrow, pl = this.player;
    const tg = this.state === 'play' && this.diffCfg.arrow ? this.guideTarget() : null;
    if (!tg) { A.visible = false; return; }
    _v.subVectors(tg, pl.pos);
    const d = _v.length();
    const show = d > 7;
    A.visible = show;
    if (!show) return;
    _v.normalize();
    const fx = Math.sin(pl.yaw), fz = Math.cos(pl.yaw);
    A.position.set(pl.pos.x + fx * 2.4, pl.pos.y + 1.25 + Math.sin(t * 4) * 0.08, pl.pos.z + fz * 2.4);
    _w.copy(A.position).add(_v);
    A.lookAt(_w);
    const facing = _v.x * fx + _v.z * fz;
    A.material.uniforms.uOpacity.value = THREE.MathUtils.clamp(0.95 - facing * 0.5, 0.35, 0.95);
    A.scale.setScalar(0.9 + 0.1 * Math.sin(t * 6));
  }
  hints() {
    const H = this.shownHints, T = this.time, ui = this.app.ui;
    if (this.level.tutorial && this.app.firstTime('tut1')) {
      if (!H.t1) { H.t1 = true; ui.hint(this.app.input.mode === 'zones' ? '👈 Links oder rechts halten = drehen 👉' : '🕹️ Mit dem Daumen-Stick lenken'); }
    }
    if (this.level.tutorial && T > 5 && !H.t2) { H.t2 = true; ui.hint('☝️ Mitte oben halten = steigen · Mitte unten = sinken'); }
    if (this.level.tutorial && T > 11 && !H.t3) { H.t3 = true; ui.hint('✨ Fliege durch die glitzernden Tropfen!'); }
    if (this.tasks.some(t => t.cfg.type === 'land') && T > 3 && !H.land) { H.land = true; ui.hint('🛬 Über dem Leuchtring ▼ unten halten = landen'); }
    if (this.tasks.some(t => t.cfg.type === 'deliver') && T > 2 && !H.del) { H.del = true; ui.hint('🍓 Hol Beeren von den Büschen und bring sie den Tierbabys'); }
  }
  win() {
    this.state = 'won'; this.wonT = 0; this.resultShown = false;
    const stars = 1 + (this.time <= this.par ? 1 : 0) + ((this.diffCfg.id === 'schwer' ? this.maxCombo >= this.comboReq : this.bonusFound) ? 1 : 0);
    this.stars = stars;
    this.player.frozen = false;
    this.arrow.visible = false;
    document.body.classList.add('won'); // Steuer-Pfeile ausblenden – Bühne frei fürs Finale
    this.app.audio.setIntensity(0.9);
    this.startFinale();
    this.app.onWon({ stars, time: this.time, par: this.par, maxCombo: this.maxCombo, comboReq: this.comboReq, bonus: this.bonusFound, hits: this.hits });
  }
  sfx(name, pos) { this.app.audio.sfx(name, pos ? this.app.screenPan(pos) : 0); }
  toast(txt) { this.app.ui.toast(txt); }
  // Test-Hilfe: nächsten Aufgabenschritt erledigen
  debugStep() {
    if (this.player.landed) { this.player.landed = false; this.player.landSpot = null; }
    const t = this.tasks.find(q => !q.done);
    if (t) t.debugNext();
  }
}
