// Schmetterlingswiese 2.0 – App: Zustände, Hauptschleife, Menü-Schaukasten, Debug-API
import * as THREE from 'three';
import { G } from './engine/gfx.js';
import { Renderer, GRASS_MAX } from './engine/renderer.js';
import { World } from './world/world.js';
import { height } from './world/terrain.js';
import { Bursts } from './world/particles.js';
import { Player } from './actors/player.js';
import { Game } from './game/game.js';
import { LEVELS, DIFFS, levelById, worldOf, dailyLevel, todayStr } from './game/levels.js';
import { WORLDS } from './game/worlds.js';
import { Progress, ALBUM } from './game/progress.js';
import { AudioEngine, Haptics, renderOffline, wavBase64 } from './audio/audio.js';
import { Input } from './input.js';
import { UI } from './ui/ui.js';

export const VERSION = '2.0.0';

class App {
  constructor() {
    this.canvas = document.getElementById('c');
    try { this.renderer = new Renderer(this.canvas); }
    catch (e) { document.getElementById('ui').innerHTML = '<div class="screen"><div class="card"><h2>Oh je! 😕</h2><p>Dein Gerät kann leider kein 3D (WebGL) anzeigen.</p></div></div>'; throw e; }
    this.renderer.r.info.autoReset = false;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 1400);
    this.world = new World(this.scene);
    this.bursts = new Bursts(700); this.scene.add(this.bursts.points);
    this.player = new Player(this.scene);
    this.progress = new Progress();
    this.audio = new AudioEngine();
    this.haptics = new Haptics();
    this.input = new Input(document.getElementById('touch'));
    this.input.zoneEls = Object.fromEntries([...document.querySelectorAll('#zones .z')].map(e => [e.dataset.z, e]));
    this.input.stickEl = document.getElementById('stick');
    this.ui = new UI(this);
    this.game = new Game(this);
    this.mode = 'showcase'; this.screen = 'boot';
    this.focus = new THREE.Vector3();
    this.t = 0; this.last = performance.now(); this.frames = 0; this.fps = 60; this._fpsAcc = 0; this._fpsN = 0;
    this.showT = 0; this.showcaseView = 'orbit';
    this.applySettings();
    this.renderer.onTier = (q) => { this.world.setQuality(q); this.ui.onQuality && this.ui.onQuality(q); };
    this.bindGlobal();
    const p = this.progress.cur;
    this.menuWorld(p && p.lastWorld ? p.lastWorld : 'wiese');
    this.setLookFromProfile();
    this.ui.show('title');
    // Klänge vorrendern (braucht keine Geste)
    this.audio.preload((k) => this.ui.loadProgress(k)).then(() => this.ui.loadProgress(1)).catch((e) => { console.warn('Audio', e); this.ui.loadProgress(1); });
    requestAnimationFrame((n) => this.loop(n));
    this.registerSW();
  }

  // ------------------------------------------------------------ Einstellungen
  get settings() { return this.progress.settings; }
  applySettings() {
    const s = this.settings;
    this.audio.setVolumes(s.music, s.sfx);
    this.haptics.on = !!s.haptics;
    this.input.mode = s.control;
    document.body.classList.toggle('zones', s.control === 'zones');
    document.body.classList.toggle('stick', s.control === 'stick');
    if (s.quality !== 'auto') this.renderer.setMode(+s.quality); else this.renderer.mode = 'auto';
  }
  setSetting(k, v) { this.settings[k] = v; this.progress.save(); this.applySettings(); }
  qualityForBuild() { return { ...this.renderer.q, grassMax: GRASS_MAX }; }

  bindGlobal() {
    const unlock = () => this.audio.unlock();
    ['pointerup', 'touchend', 'click', 'keydown'].forEach(ev => document.addEventListener(ev, unlock, { capture: true, passive: true }));
    addEventListener('resize', () => this.resize());
    addEventListener('orientationchange', () => setTimeout(() => this.resize(), 200));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { this.audio.suspend(); if (this.mode === 'game' && this.game.state === 'play') this.pause(); }
      else this.audio.resume();
    });
    addEventListener('contextmenu', (e) => { if (e.target.tagName !== 'INPUT') e.preventDefault(); });
    const hold = (id, act) => {
      const el = document.getElementById(id);
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); el.classList.add('on'); this.input.actions.push(act); });
      const off = () => el.classList.remove('on');
      el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('pointerleave', off);
    };
    hold('bLoop', 'loop'); hold('bRoll', 'roll');
    document.getElementById('bPause').addEventListener('click', () => { this.audio.sfx('tap'); this.pause(); });
    this.input.onFirst = () => this.ui.hideHint && 0;
  }
  resize() { this.renderer.resize(); this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); }

  // ------------------------------------------------------------ Profil & Aussehen
  setLookFromProfile() {
    const p = this.progress.cur;
    const L = p ? p.look : { char: 'schmetterling', color: {}, pattern: 'monarch', hat: 'none' };
    this.player.setCharacter(L.char, { color: L.color[L.char] || 0, pattern: L.pattern, hat: L.hat });
  }
  updateLook(ch) {
    const p = this.progress.cur; if (!p) return;
    Object.assign(p.look, ch.look || {});
    if (ch.color !== undefined) p.look.color[p.look.char] = ch.color;
    this.progress.save();
    this.setLookFromProfile();
    this.player.critter.happy(0.8);
  }

  // ------------------------------------------------------------ Menü-Schaukasten
  menuWorld(wid) {
    const w = WORLDS.find(x => x.id === wid) || WORLDS[0];
    if (!this.world.def || this.world.def.id !== w.id) { this.world.build(w, this.qualityForBuild(), 'menu-' + w.id); this.world.seed = 'menu'; }
    this.game.clear();
    this.player.landables = []; this.player.colliders = [];
    const x = 6, z = 14;
    this.showPos = new THREE.Vector3(x, height(x, z) + 2.4, z);
    this.player.reset(this.showPos, Math.PI * 0.85);
    this.audio.setWorld(w);
  }
  toShowcase(view = 'orbit') {
    this.mode = 'showcase'; this.showcaseView = view;
    document.body.classList.remove('playing');
    this.input.clear();
    this.audio.setMenu(true);
    this.player.cheer = false; this.player.frozen = false;
    if (this.game.state !== 'idle') { this.game.clear(); const p = this.progress.cur; this.menuWorld(p && p.lastWorld || 'wiese'); }
  }
  showcaseUpdate(dt, t) {
    const pl = this.player, c = pl.critter, cam = this.camera;
    this.showT += dt;
    const sp = this.showPos;
    pl.pos.set(sp.x + Math.sin(t * 0.5) * 0.3, sp.y + Math.sin(t * 1.1) * 0.25, sp.z);
    if (c) {
      c.root.position.copy(pl.pos);
      const wardrobe = this.showcaseView === 'wardrobe';
      const yaw = wardrobe ? Math.PI + 0.45 + Math.sin(t * 0.5) * 0.45 : pl.yaw;
      c.root.rotation.y = yaw;
      c.tilt.rotation.x = -0.12; c.tilt.rotation.z = Math.sin(t * 0.8) * 0.08;
      c.update(dt, t, { speed01: 0.35, landed: false, cheer: false });
      pl.shadow.position.set(pl.pos.x, height(pl.pos.x, pl.pos.z) + 0.05, pl.pos.z);
      pl.shadow.material.opacity = 0.3;
    }
    const aspect = cam.aspect;
    if (this.showcaseView === 'wardrobe') {
      // Figur ganz im Bild: Hochformat oben, Querformat links (Karte liegt rechts/unten)
      const portrait = aspect < 1;
      const vf = portrait ? 50 : 40;
      const halfW = Math.tan(THREE.MathUtils.degToRad(vf / 2)) * aspect;
      const d = portrait ? Math.max(4.5, 1.9 / halfW) : 5.2;
      cam.fov = vf;
      cam.position.set(sp.x, sp.y + 0.9, sp.z - d);
      const visH = 2 * d * Math.tan(THREE.MathUtils.degToRad(vf / 2));
      if (portrait) cam.lookAt(sp.x, sp.y - visH * 0.24, sp.z);
      else cam.lookAt(sp.x - d * halfW * 0.5, sp.y + 0.15, sp.z);
    } else {
      const a = t * 0.12 + 2.2, R = aspect < 1 ? 7.0 : 5.4;
      cam.position.set(sp.x + Math.sin(a) * R, sp.y + 1.3 + Math.sin(t * 0.2) * 0.4, sp.z + Math.cos(a) * R);
      cam.lookAt(sp.x, sp.y + (aspect < 1 ? 1.2 : 1.35), sp.z);
      cam.fov = aspect < 1 ? 64 : 55;
      pl.yaw = Math.atan2(cam.position.x - sp.x, cam.position.z - sp.z) + Math.sin(t * 0.3) * 0.5;
    }
    cam.updateProjectionMatrix();
  }

  // ------------------------------------------------------------ Level-Ablauf
  get diff() { const p = this.progress.cur; return (p && p.diff) || 'leicht'; }
  setDiff(d) { const p = this.progress.cur; if (p) { p.diff = d; this.progress.save(); } }
  startLevel(id) {
    const lvl = levelById(id);
    if (!lvl) return;
    this.levelId = id;
    const p = this.progress.cur;
    if (p) { p.lastWorld = lvl.world; this.progress.save(); }
    this.ui.show(null);
    this.mode = 'game';
    document.body.classList.add('playing');
    this.input.clear();
    this.audio.setMenu(false);
    this.game.load(lvl, this.diff);
    this.discoverWorld(lvl.world);
    this.ui.hudTasks(this.game.tasks);
    this.ui.hudTime(0, this.game.limit, this.game.par);
    this.ui.combo(0);
    this.audio.sfx('go');
    this._discT = 0;
  }
  pause() {
    if (this.mode !== 'game' || this.game.state !== 'play') return;
    this.game.state = 'paused'; this.game.player.frozen = true;
    this.input.clear();
    this.audio.setIntensity(0.25);
    this.ui.show('pause');
  }
  resume() {
    if (this.game.state !== 'paused') return;
    this.ui.show(null); this.game.state = 'play'; this.game.player.frozen = false; this.input.clear();
    this.audio.setIntensity(0.45);
  }
  restart() { this.startLevel(this.levelId); }
  quit() { this.toShowcase(); this.ui.show('map'); }
  onWon(res) {
    const lvl = this.game.level;
    const rec = this.progress.record(lvl.id, this.diff, res, !!lvl.daily);
    this.lastResult = { ...res, ...rec, level: lvl, diff: this.diff };
    setTimeout(() => { if (this.mode === 'game' && this.game.state === 'won') { this.ui.show('result', this.lastResult); } }, 2300);
  }
  onFailed(msg) { setTimeout(() => this.ui.show('fail', { msg }), 900); }
  nextLevel() {
    const i = LEVELS.findIndex(l => l.id === this.levelId);
    const n = LEVELS[i + 1];
    if (n && this.progress.unlocked(n.id)) this.ui.show('levelcard', { id: n.id });
    else this.quit();
  }
  stat(k) { this.progress.stat(k); }
  firstTime(k) { return this.progress.firstTime(k); }
  discover(kind) {
    const map = { glitter: 'glitzerstern', fireflies: 'gluehwurm', blossoms: 'kirschbluete' };
    if (map[kind]) this.album(map[kind]);
  }
  discoverWorld(wid) {
    const m = { wiese: ['margerite', 'tulpe', 'pilz'], sonne: ['sonnenblume'], teich: ['seerose'], kirsch: ['kirschbluete'], abend: ['gluehwurm'] }[wid] || [];
    setTimeout(() => m.forEach((a, i) => setTimeout(() => this.album(a), i * 2600)), 4000);
  }
  album(id) {
    const e = this.progress.discover(id);
    if (e && this.mode === 'game') { this.ui.toast(`📖 Neu im Album: ${e.emoji} ${e.name}`); this.audio.sfx('pick'); }
  }
  proximityDiscover() {
    const P = this.player.pos;
    for (const a of this.game.animals.list) if (a.pos.distanceToSquared(P) < 100) { this.album(a.kind); break; }
    for (const f of this.game.flyers.items) if (f.pos.distanceToSquared(P) < 64) { this.album(f.isB ? 'falter' : 'marienkaefer'); break; }
    for (const w of this.game.wasps.list) if (w.pos.distanceToSquared(P) < 100) { this.album('wespe'); break; }
    if (this.game.race && this.game.race.rival.kind === 'libelle') this.album('libelle');
  }
  // Test-Autopilot: fliegt echt (über die Eingabe) zum nächsten Ziel
  autoSteer() {
    const g = this.game, pl = this.player;
    const task = g.tasks.find(t => !t.done);
    if (task && task.cfg.type === 'stunts' && !pl.stunt && !pl.landed && g.state === 'play') {
      const alt = pl.pos.y - height(pl.pos.x, pl.pos.z);
      if (alt < 5) { this.input.injected = { turn: 0, climb: 1 }; return; }
      this.input.actions.push(task.l < task.needL ? 'loop' : 'roll'); this.input.injected = { turn: 0, climb: 0 }; return;
    }
    const tg = g.guideTarget() || (g.glitter && !g.glitter.found ? g.glitter.pos : null);
    if (!tg || g.state !== 'play') { this.input.injected = { turn: 0, climb: 0 }; return; }
    const dx = tg.x - pl.pos.x, dz = tg.z - pl.pos.z, dh = Math.hypot(dx, dz);
    let d = Math.atan2(dx, dz) - pl.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    const turn = THREE.MathUtils.clamp(-d * 2.2, -1, 1);
    let climb = THREE.MathUtils.clamp((tg.y - pl.pos.y) * 0.6, -1, 1);
    if (task && task.cfg.type === 'land') climb = dh < 2.4 ? -1 : THREE.MathUtils.clamp((tg.y + 2 - pl.pos.y) * 0.6, -1, 1);
    if (pl.landed) climb = pl.landT > 1.6 ? 1 : 0;
    // Zielkreis vermeiden: zu nah und seitlich → etwas wegfliegen
    this.input.injected = { turn: Math.abs(d) > 1.2 && dh < 6 ? 0 : turn, climb };
  }
  screenPan(pos) {
    const v = pos.clone().project(this.camera);
    return THREE.MathUtils.clamp(v.x * 0.8, -0.9, 0.9);
  }

  // ------------------------------------------------------------ Hauptschleife
  loop(now) {
    requestAnimationFrame((n) => this.loop(n));
    const raw = Math.max(0, (now - this.last) / 1000); this.last = now;
    const dt = Math.min(raw, 0.05);
    this.frames++;
    this._fpsAcc += raw; this._fpsN++;
    if (this._fpsAcc > 1) { this.fps = Math.round(this._fpsN / this._fpsAcc); this._fpsAcc = 0; this._fpsN = 0; }
    if (!window.__freeze) {
      this.t += dt;
      G.uTime.value = this.t;
      if (this.autopilot && this.mode === 'game') this.autoSteer();
      this.input.update(dt);
      if (this.mode === 'game') {
        this.game.update(dt, this.t, this.input);
        this._discT += dt;
        if (this._discT > 0.5) { this._discT = 0; this.proximityDiscover(); }
      } else this.showcaseUpdate(dt, this.t);
      this.bursts.update(dt);
      this.focus.copy(this.player.pos);
      G.uWind.value.z = this.world.windBoost || 0;
      this.world.update(dt, this.camera, this.focus);
      G.uPlayer.value.copy(this.player.pos);
      if ((this.frames & 3) === 0 && this.audio.ctx) {
        const pl = this.player, c = pl.critter;
        const playing = this.mode === 'game' && (this.game.state === 'play' || this.game.state === 'won');
        this.audio.setFlight(playing ? THREE.MathUtils.clamp(pl.speed / 11, 0, 1) : 0.15, playing ? (pl.landed ? 0.1 : 0.5 + Math.max(0, this.input.climb) * 0.5) : 0.25, c ? c.kind : 'none', this.world.windBoost || 0);
      }
    }
    G.uCam.value.copy(this.camera.position);
    this.renderer.r.info.reset();
    this.renderer.render(this.scene, this.camera);
    this.renderer.sample(raw * 1000, now);
  }

  registerSW() {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:' || new URLSearchParams(location.search).has('nosw')) return;
    navigator.serviceWorker.register('sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw && nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) this.updateReady = true;
        });
      });
    }).catch(() => { });
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded) return;
      // Nur im Menü neu laden, nie mitten im Level
      const doReload = () => { if (!reloaded) { reloaded = true; location.reload(); } };
      if (this.mode !== 'game') doReload(); else this.pendingReload = doReload;
    });
  }
}

const app = new App();
window.__app = app;

// ------------------------------------------------------------ Debug-/Test-API
window.__game = {
  version: VERSION,
  state: () => ({ mode: app.mode, screen: app.ui.current, game: app.game.state, level: app.game.level && app.game.level.id, diff: app.diff,
    time: app.game.time, combo: app.game.combo, maxCombo: app.game.maxCombo, stars: app.game.stars || 0,
    tasks: app.game.tasks.map(t => ({ type: t.cfg.type, cur: t.cur, max: t.max, done: t.done })),
    player: { x: app.player.pos.x, y: app.player.pos.y, z: app.player.pos.z, landed: app.player.landed, stunt: app.player.stunt && app.player.stunt.type, yaw: app.player.yaw } }),
  ac: () => app.audio.state,
  audio: app.audio, haptics: app.haptics, progress: app.progress, player: app.player, camera: app.camera, scene: app.scene, input: app.input,
  info: () => ({ ...app.renderer.info(), fps: app.fps }),
  freeze: (on = true) => { window.__freeze = on ? 1 : undefined; },
  start: (id, diff) => { if (diff) app.setDiff(diff); app.startLevel(id); },
  step: () => app.game.debugStep(),
  autopilot: (on = true) => { app.autopilot = on; if (!on) app.input.injected = null; },
  levels: () => LEVELS.map(l => l.id),
  daily: () => dailyLevel().id,
  show: (s, d) => app.ui.show(s, d),
  setQuality: (q) => app.setSetting('quality', q),
  renderWav: async (mode, wid = 'wiese', sec = 60, inten = 0.6) => wavBase64(await renderOffline(app.audio.bufs, WORLDS.find(w => w.id === wid), mode, sec, inten)),
};
