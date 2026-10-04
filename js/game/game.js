// Level-Ablauf: Aufbau, Kombos, Hindernisse, Zielpfeil, Sieg/Niederlage, Sterne
import * as THREE from 'three';
import { toonMat } from '../engine/gfx.js';
import { Build, P, rng, hashStr } from '../engine/geo.js';
import { height, pond } from '../world/terrain.js';
import { Flyers, Animals, Wasps } from '../actors/npcs.js';
import { makeTask, GlitterStar } from './objectives.js';
import { DIFFS, worldOf, isRace, timeGoals } from './levels.js';
import { pickStunt, stuntByKey, stuntName, COOLDOWN, C as SC, ease, pickFinale, finaleByKey, ACCENT, FINALE_AMP, FINALE_DUR } from './stunts.js';

const _v = new THREE.Vector3(), _w = new THREE.Vector3();
const RAINBOW = [0xff5a6e, 0xff9a3c, 0xffd84a, 0x7ee06a, 0x4fc8ff, 0x8a7bff, 0xd67cff];
// Ein wiederverwendetes Options-Objekt für alle Einlagen-Effekte (keine Allokation pro Frame)
const FO = { n: 1, pos: null, colors: null, shape: 0, size: 0.3, speed: 0, up: 0, life: 1, grav: 0, drag: 1.2, spin: 3, spread: 0.3, vel: null };
const _x = new THREE.Vector3(), _y = new THREE.Vector3();
const RB1 = RAINBOW.map(c => [c]), PUFF = [0xffffff, 0xfff4e8], DUST = [0xfff3b0, 0xcfe8ff], FLASH = [0xfff3b0];
const ZZ = [['a', 1 / 6], ['b', 0.5], ['c', 5 / 6]], WK = [['a', 0.125], ['b', 0.375], ['c', 0.625], ['d', 0.875]];

// v2.6 Zielanzeige (Default, ?ziel=marker): Stern über dem Ziel, solange es im Bild ist; sonst Randpfeil links/rechts
// (= dorthin drehen, wie die Lenkzonen ◀ ▶). Höhe nur als ▲/▼-Abzeichen, nie als Hauptrichtung. ?ziel=pfeil = v2.5-Pfeil.
export const GUIDE = {
  near: 6, far: 9,            // in Zielnähe weich ausblenden (m), wie der v2.5-Pfeil
  sizeM: 1.3,                 // Stern-Größe in der Welt (m) → Bildpixel, geklemmt:
  px: { port: [44, 66], land: [38, 54] },
  lift: 6,                    // Luft zwischen Stern-Spitze und Oberkante des Ziels (px)
  edgeHyst: 16,               // Bildrand-Hysterese Stern ↔ Randpfeil (px)
  backHyst: 0.5,              // Ziel hinten: Seite wechselt erst, wenn es ≥ 0,5 rad (≈ 29°) auf der anderen Seite liegt
  badgeDy: 3, badgeHyst: 0.6, // ▲/▼ ab 3 m Höhenunterschied (nur Ziel außerhalb des Bildes), Hysterese 0,6 m
  edgeK: { port: 1, land: 0.75 }, // Randpfeil-Größe (64×80 px = 1)
  dimFig: 0.35,               // Stern über der Figur (nur falls Anheben nicht geht): blasser
  fade: 8,                    // Ein-/Ausblend-Tempo (1/s)
};
// Zielpfeil: Ausblenden in Zielnähe (weich zwischen near und far, m), Abstand zur Kamera (hoch/quer, m)
const ARROW = { near: 6, far: 9 };
const AR_D = { port: 9.5, land: 7 };
const G_BEND = 0.0009; // = uBend (gfx.js)
const uBendAt = (p, c) => G_BEND * ((p.x - c.x) ** 2 + (p.z - c.z) ** 2);
const SEAT_TMP = { pos: new THREE.Vector3(), n: new THREE.Vector3(), yaw: null };
const _pv = new THREE.Vector3(), _pr = new THREE.Vector3(), _pu = new THREE.Vector3(), _sz = new THREE.Vector2(), _fb = new THREE.Box3();
// Weltpunkt → Bildschirm-Pixel (inkl. Weltkrümmung wie im Shader); z > 1 = hinter der Kamera
function proj(p, cam, W, H) {
  _pv.copy(p); _pv.y -= uBendAt(p, cam.position); _pv.project(cam);
  return [(_pv.x + 1) / 2 * W, (1 - _pv.y) / 2 * H, _pv.z];
}
// Bildschirm-Rechteck eines Meshes (8 Ecken der Hülle) in Pixeln [x0, y0, x1, y1]
function screenRect(mesh, cam, W, H, out) {
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  const b = mesh.geometry.boundingBox; out[0] = out[1] = 1e9; out[2] = out[3] = -1e9;
  for (let i = 0; i < 8; i++) {
    _pv.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).applyMatrix4(mesh.matrixWorld);
    const [x, y] = proj(_pv, cam, W, H);
    out[0] = Math.min(out[0], x); out[1] = Math.min(out[1], y); out[2] = Math.max(out[2], x); out[3] = Math.max(out[3], y);
  }
  return out;
}
// Index-Teile in neuer Reihenfolge (gleiche Länge wie das Original)
function concatIdx(src, ...parts) {
  const out = new src.constructor(src.length); let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
// Kontur-Hülle: Kopie der Geometrie, Punkte entlang der gemittelten Normalen nach außen (geschlossen, ohne Risse)
function hullGeo(g, w) {
  const h = g.clone(), p = h.attributes.position, n = h.attributes.normal, acc = new Map();
  const key = (i) => `${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`;
  for (let i = 0; i < p.count; i++) { const k = key(i), a = acc.get(k) || [0, 0, 0]; a[0] += n.getX(i); a[1] += n.getY(i); a[2] += n.getZ(i); acc.set(k, a); }
  const off = [];
  for (let i = 0; i < p.count; i++) { const a = acc.get(key(i)), l = Math.hypot(a[0], a[1], a[2]) || 1; off.push(a[0] / l * w, a[1] / l * w, a[2] / l * w); }
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + off[i * 3], p.getY(i) + off[i * 3 + 1], p.getZ(i) + off[i * 3 + 2]);
  h.computeBoundingBox();
  return h;
}

export class Game {
  constructor(app) {
    this.app = app;
    this.scene = app.scene; this.player = app.player; this.bursts = app.bursts; this.world = app.world;
    this.animals = new Animals(this.bursts); this.scene.add(this.animals.group);
    this.wasps = new Wasps(4); this.scene.add(this.wasps.group);
    this.flyers = null;
    this.state = 'idle'; // idle | countdown | play | won | failed | paused
    this.tasks = [];
    this.guideMode = new URLSearchParams(location.search).get('ziel') === 'pfeil' ? 'pfeil' : 'marker'; // A/B (v2.6)
    this.buildArrow();
    this.buildGuide();
    // Regenwolken
    const rb = new Build();
    [[0, 0, 0, 2.6], [2.3, -0.3, 0.4, 1.9], [-2.2, -0.2, -0.3, 2.0], [0.6, 0.9, -0.2, 1.8], [-0.8, -0.4, 1.4, 1.6]].forEach(([x, y, z, r]) => rb.add(P.ico(r, 2), 0xffffff, { p: [x, y, z], s: [1, 0.75, 1] }));
    this.rainGeo = rb.build();
    this.rainMat = toonMat({ vc: true, color: 0x9aa4c4, rim: 0.8, soft: 0.4 });
    this.rains = [];
    this.showLast = null; this.showAt = -99; this.showLog = []; this.finaleLog = [];
  }

  get diff() { return this.diffCfg; }

  // Zielpfeil (v2.5): schwebt hoch am Himmel über und vor der Figur (oberes Bilddrittel, unter der HUD-Leiste), dunkle
  // Kontur (hilft vor hellem Himmel; vor dem Abendhimmel leuchtet das Gelb von selbst). Ohne Tiefentest → nie hinter Bäumen.
  // Ein Mesh, ein Draw-Call: Kontur (umgedrehte, aufgeblähte Hülle) + Schaft + Spitze. Ohne Tiefentest zählt die
  // Zeichenfolge; Schaft und Spitze sind je konvex → wer näher an der Kamera ist, kommt zuletzt (Index-Reihenfolge
  // wird nur beim Umklappen der Blickrichtung getauscht).
  buildArrow() {
    const cone = P.cone(0.22, 0.46, 18); cone.rotateX(Math.PI / 2); cone.translate(0, 0, 0.3);
    const shaft = P.cyl(0.085, 0.085, 0.42, 12); shaft.rotateX(Math.PI / 2); shaft.translate(0, 0, -0.1);
    const hb = new Build(); hb.add(cone, 0xffffff); hb.add(shaft, 0xffffff);
    const hull = hullGeo(hb.build(), 0.045), hi = hull.index.array;
    for (let i = 0; i < hi.length; i += 3) { const t = hi[i + 1]; hi[i + 1] = hi[i + 2]; hi[i + 2] = t; } // Innenseite zeigen
    const b = new Build();
    b.add(hull, 0x3a1e08, { unlit: 1 }); b.add(shaft, 0xffd84a, { unlit: 0.5 }); b.add(cone, 0xffd84a, { unlit: 0.5 });
    const g = b.build(), nH = hull.index.count, nS = shaft.index.count, ia = g.index.array;
    const H = ia.slice(0, nH), S = ia.slice(nH, nH + nS), C = ia.slice(nH + nS);
    // Spitze weg von der Kamera: Schaft ist vorn → zuletzt; Spitze zur Kamera: Spitze zuletzt (= Bau-Reihenfolge)
    this.arrowOrder = { away: concatIdx(ia, H, C, S), toward: concatIdx(ia, H, S, C), cur: 'toward' };
    const A = this.arrow = new THREE.Mesh(g, toonMat({ vc: true, rim: 1.1, emis: 0.55, transparent: true, depthTest: false, depthWrite: false }));
    A.renderOrder = 30; A.frustumCulled = false;
    A.geometry.computeBoundingBox();
    A.visible = false; this.arrowA = 0; this.arrowRect = [0, 0, 0, 0];
    this.scene.add(A);
  }
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
    // v2.5: Wettflüge ohne Glitzerstern (Sterne nur über Zeiten), sonst wie bisher (Schwer: Kombo statt Glitzerstern)
    this.isRace = isRace(level);
    this.glitter = D.id !== 'schwer' && !this.isRace ? new GlitterStar(this) : null;
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
    const TG = timeGoals(level, D.id);
    this.limit = TG.limit; this.par = TG.par; this.blitz = TG.blitz;
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
      showDone: (id) => this.onShowDone(id),
      lock: (spot) => this.onLock(spot),
    };
    this.showAt = -99;
    this.app.player.critter.happyT = 0;
    this.app.audio.setWorld(w);
    this.app.audio.setIntensity(0.35);
    // v2.5 Landeblumen: Figurform und feste Sitzhöhen schon beim Laden rechnen (sonst kurzer Ruckler beim ersten Anflug)
    const land = this.tasks.find(t => t.spots), c = this.player.critter;
    if (land && c) for (const sp of land.spots) sp.seatPose(this.app.t || 0, c, this.player.yaw, SEAT_TMP);
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
    this.arrow.visible = false; this.arrowA = 0; this.guideOff();
    this.state = 'idle';
    this.player.frozen = false; this.player.cheer = false; this.player.hover = false; this.finale = null; this.app.timeScale = 1; this.rollQ = null;
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
    // v2.5: sitzt die Figur noch auf der Blüte (Nektar geschlürft), kommt die Schraube erst kurz nach dem Abheben –
    // sonst streifen die Flügel beim Drehen durch die Blütenblätter
    if (pl.landed || pl.airT < 0.3) this.rollQ = { col, big: big || (this.rollQ && this.rollQ.big) };
    else this.doRoll(col, big);
    if (big) {
      this.bursts.emit({ n: 1, pos: pl.pos, colors: [0xfff3b0], shape: 5, size: 5, speed: 0, up: 0, life: 0.5, grav: 0, drag: 0 });
      this.bursts.emit({ n: 24, pos: pl.pos, colors: [col, 0xffffff, 0xffe07a], shape: 1, size: 0.45, speed: 6, up: 1, life: 1.1, grav: -1 });
      this.app.audio.sfx('combo'); this.app.haptics.buzz('star');
      this.app.ui.toast('🌀 Teilaufgabe geschafft!');
    }
  }
  doRoll(col, big) {
    const c = this.player.critter;
    const pending = Math.abs(c.rollTarget - c.rollAng) / (Math.PI * 2);
    const add = big ? 2 : 1;
    if (pending + add <= 2.6) { c.roll(add, (this.hits & 1) ? -1 : 1); this.app.stat('rolls'); }
    this.app.audio.sfx('roll', 0, { gain: big ? 0.85 : 0.45, rate: big ? 0.92 : 1.12 });
    if (this.app.funOn('hupe')) this.app.audio.sfx('hupe', 0, { gain: 0.9 });
    this.rollCol = col; this.rollBig = big; // Doppel-Helix aus den Flügelspitzen → rollTrail()
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
  // Gesamtaufgabe geschafft → v2.4 zufällige Sieger-Einlage (Katalog inkl. Sieger-Looping, keine direkte Wiederholung
  // über Levels hinweg). Eine Stufe über den 🎪-Einlagen: Bahn ×1,2, Seitenkamera, Zeitlupe am Höhepunkt, Regenbogen-/
  // Glitzer-Schweif, 3 Feuerwerke, Sternen-Ring, Effekt-Akzent je Einlage, Konfetti-Regen, Fanfare, Haptik.
  startFinale() {
    const pl = this.player, c = pl.critter, app = this.app, prof = app.progress.cur;
    if (c) { const T = Math.PI * 2; c.rollTarget = Math.ceil(c.rollAng / T - 0.05) * T; if (c.rollTarget < c.rollAng) c.rollTarget += T; }
    pl.stunt = null;
    const def = finaleByKey(app.finaleOverride) || pickFinale(prof && prof.lastFinale);
    if (prof) { prof.lastFinale = def.id; app.progress.save(); }
    const ok = pl.tryShow(def, Math.random() < 0.5 ? -1 : 1, { grand: true, amp: FINALE_AMP, durK: FINALE_DUR });
    this.finale = { t: 0, def, id: def.id, loop: ok, apex: false, end: ok ? -1 : 0, hue: 0, slowT: -1, acc: 0 };
    this.finaleLog.push(def.id); if (this.finaleLog.length > 40) this.finaleLog.shift();
    if (ok) { const S = pl.stunt; S.ev = {}; S.acc = 0; }
    app.audio.sfx('combo'); app.audio.sfx('zauber', 0, { gain: 0.9, rate: 0.9 }); app.audio.sfx('trommel', 0, { gain: 0.9 });
    if (app.funOn('hupe')) setTimeout(() => app.audio.sfx('hupe', 0, { gain: 1 }), 700);
    app.haptics.buzz('stunt');
    pl.kick(9, 0.12);
    this.em(1, pl.pos, FLASH, 5, 6, 0, 0, 0.45, 0, 0);
    this.em(24, pl.pos, SC.STAR, 1, 0.4, 5, 1, 0.9, -0.8);
    const wid = this.world.def.id;
    app.ui.toast(`🏆 ${(def.emojis && def.emojis[wid]) || def.emoji} ${stuntName(def, wid)}!`);
    if (!ok) this.finaleEnd();
  }
  finaleUpdate(dt) {
    const F = this.finale; if (!F) return;
    F.t += dt;
    const pl = this.player, S = pl.stunt, app = this.app;
    if (S && S.grand) {
      const A = ACCENT[F.id] || ACCENT.looping, p = S.p;
      F.acc += dt * 60; const n = Math.min(4, F.acc | 0); F.acc -= n;
      // Regenbogen-Schweif (lange Lebensdauer → die Bahn bleibt als Band stehen) + Glitzer + Akzent-Spur
      F.hue = (F.hue + dt * 1.6) % 1;
      for (let i = 0; i < n; i++) {
        _v.copy(pl.pos).add(_w.set((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4));
        this.em(1, _v, RB1[(((F.hue * RAINBOW.length) | 0) + i) % RAINBOW.length], 0, 0.6, 0.2, 0, 2.4, 0.05, 1); // 0,75: nah an der Kamera zu wuchtig
        if (Math.random() < 0.5) this.em(1, pl.pos, SC.GOLD, 1, 0.42, 1.2, 0, 1.1, -0.5);
        if (Math.random() < 0.35) this.em(1, pl.pos, A.c, A.sh, A.sh === 2 ? 0.26 : 0.4, 1.4, 0.3, 1.2, A.sh === 6 ? 0.6 : -0.6, 1.2, 0.4, null, 8);
      }
      // Zeitlupe: kurz vor dem Höhepunkt ≈0,4 s (Echtzeit), weich rein und raus
      if (F.slowT < 0 && p >= S.def.hi - 0.05) { F.slowT = 0; app.audio.sfx('zeitlupe', 0, { gain: 0.9 }); }
      if (!F.apex && p >= S.def.hi) {
        F.apex = true;
        _x.copy(pl.pos);
        this.firework(_v.copy(_x).add(_w.set(0, 2.4, 0)), 0xffd84a);
        this.ringOut(_x, 28, SC.STAR, 1, 0.55, 7, 0.3, 1.3);
        this.ringOut(_x, 16, A.c, A.sh, A.sh === 2 ? 0.3 : 0.55, 4.5, 1.2, 1.5, A.sh === 6 ? 0.4 : -1);
        this.em(30, _x, A.c, A.sh, A.sh === 2 ? 0.28 : 0.5, 6, 1.5, 1.4, A.sh === 6 ? 0.5 : -1.5, 1.2, 0.4, null, 10);
        this.em(1, _x, FLASH, 5, 4.5, 0, 0, 0.45, 0, 0); // 7 → 4,5: drei große Ringe überlagerten sich
        app.audio.sfx('knall', 0, { gain: 0.9 }); app.audio.sfx('glitter', 0, { gain: 0.8 }); app.haptics.buzz('star');
        pl.kick(8, 0.1);
      }
    }
    if (F.slowT >= 0 && F.slowT < 0.4) {
      F.slowT += app.realDt || dt;
      const k = Math.sin(Math.PI * Math.min(1, F.slowT / 0.4));
      app.timeScale = F.slowT >= 0.4 ? 1 : 1 - 0.7 * k * k;
    }
    // Nachzügler-Feuerwerk nach der Einlage
    if (F.end >= 0) {
      F.end += dt;
      if (F.end > 0.45 && !F.fw2) { F.fw2 = true; this.firework(_v.copy(pl.pos).add(_w.set(-3.5, 4.5, 2)), 0xff7eb6); app.audio.sfx('knall', 0, { gain: 0.6, rate: 1.1 }); }
      if (F.end > 0.8 && !F.fw3) { F.fw3 = true; this.firework(_v.copy(pl.pos).add(_w.set(3.5, 5, -1.5)), 0x7cc4ff); }
    }
    if (F.loop && !S && F.end < 0) this.finaleEnd(); // Sicherheitsnetz, falls showDone nicht kam
  }
  finaleEnd() {
    const F = this.finale; if (!F || F.end > 0.001) return;
    F.end = 0.0011; this.app.timeScale = 1;
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
  // v2.5.1 Landeplatz eingerastet: leises Aufsetz-Signal (Glitzer, Ton, Haptik), die Figur landet dann von selbst
  onLock(spot) {
    this.app.audio.sfx('land', 0, { gain: 0.45, rate: 1.3 });
    this.app.haptics.buzz('land');
    this.bursts.emit({ n: 12, pos: spot.pos, colors: [0x9ff0ff, 0xffffff, 0xfff3b0], shape: 1, size: 0.3, speed: 2.2, up: 0.8, life: 0.7, grav: -0.5 });
    if (!this.shownHints.lock) { this.shownHints.lock = true; this.app.ui.hint('✨ Eingefangen! Die Blume holt dich – ▲ oben halten zum Abbrechen'); }
  }
  onStuntDone(type) {
    this.app.stat(type === 'loop' ? 'loops' : 'rolls');
    if (this.state === 'won') { this.finaleEnd(); return; }
    this.bursts.emit({ n: 18, pos: this.player.pos, colors: [0xffe07a, 0xb0e0ff, 0xffb0e0], shape: 1, size: 0.35, speed: 3.5, up: 1, life: 0.9, grav: -1 });
    for (const t of this.tasks) if (t.onStunt) t.onStunt(type);
    this.app.ui.hudTasks(this.tasks);
  }
  // ---------------------------------------------------------------- 🎪 Zufalls-Einlagen (Knopf „STUNT“)
  // Purer Spaß: keine Aufgaben-Zählung, kein onStunt/onStuntDone; Kombo und Zeit laufen weiter.
  showReady() {
    const pl = this.player;
    return this.state === 'play' && !this.finale && !pl.frozen && !pl.stunt && this.time - this.showAt >= COOLDOWN;
  }
  showCd() { return Math.min(1, Math.max(0, (this.time - this.showAt) / COOLDOWN)); }
  showStunt(key = null, force = false) {
    const pl = this.player;
    if (this.state !== 'play' || this.finale || pl.frozen || pl.stunt) return false; // nie in Sieg/Finale/laufende Kunststücke
    if (!force && this.time - this.showAt < COOLDOWN) return false;
    const def = stuntByKey(key ?? this.app.stuntOverride) || pickStunt(this.showLast);
    if (!pl.tryShow(def, Math.random() < 0.5 ? -1 : 1)) return false;
    this.showLast = def.id; this.showAt = this.time; this.showLog.push(def.id);
    if (this.showLog.length > 60) this.showLog.shift();
    const S = pl.stunt; S.ev = {}; S.acc = 0;
    this.em(1, pl.pos, SC.GOLD, 5, 3.2, 0, 0, 0.4, 0, 0);
    this.em(14, pl.pos, SC.STAR, 1, 0.34, 3.5, 0.6, 0.7, -0.6);
    this.app.audio.sfx('zauber', 0, { gain: 0.7, rate: 0.95 + Math.random() * 0.1 });
    this.app.haptics.buzz('stunt');
    pl.kick(6, 0.05);
    const wid = this.world.def.id;
    this.app.ui.toast(`${(def.emojis && def.emojis[wid]) || def.emoji} ${stuntName(def, wid)}!`);
    return true;
  }
  em(n, pos, colors, shape, size, speed, up, life, grav, drag = 1.2, spread = 0.3, vel = null, spin = 3) {
    const o = FO; o.n = n; o.pos = pos; o.colors = colors; o.shape = shape; o.size = size; o.speed = speed; o.up = up;
    o.life = life; o.grav = grav; o.drag = drag; o.spread = spread; o.vel = vel; o.spin = spin;
    this.bursts.emit(o);
  }
  // Ring aus Partikeln, der waagerecht nach außen fliegt (Sternenring, Konfetti-Kranz)
  ringOut(pos, n, colors, shape, size, sp, up, life, grav = 0) {
    for (let k = 0; k < n; k++) {
      const a = k / n * Math.PI * 2;
      _y.set(Math.cos(a) * sp, up, Math.sin(a) * sp);
      this.em(1, pos, colors, shape, size, 0, 0, life, grav, 1.4, 0.1, _y);
    }
  }
  // Effekte je Einlage (Partikel-Pool, vorgerenderte Klänge, Haptik, Kamera-Kick)
  showFx(dt) {
    const pl = this.player, S = pl.stunt;
    if (!S || S.type !== 'show') return;
    const p = S.p, E = S.ev, P = pl.pos, au = this.app.audio;
    const fx = Math.sin(S.yaw), fz = Math.cos(S.yaw), rx = Math.cos(S.yaw), rz = -Math.sin(S.yaw);
    const once = this.once; // (E, p, Schlüssel, ab) – einmalige Ereignisse je Einlage
    S.acc += dt * 60; const n = Math.min(4, S.acc | 0); S.acc -= n; // ~60 Emissionen/s, bildratenunabhängig
    switch (S.id) {
      case 'doppel':
        if (once(E, p, 'l1', 0.02)) au.sfx('loop', 0, { gain: 0.9, rate: 1.05 });
        if (once(E, p, 'l2', 0.5)) au.sfx('loop', 0, { gain: 0.9, rate: 1.18 });
        for (let i = 0; i < n * 2; i++) this.em(1, P, RB1[((p * 40 | 0) + i) % RB1.length], 0, 0.5, 0.2, 0, 1.8, 0.05, 1, 0.35); // 0,75/2,4 s: vor der Kamera zu wuchtig
        break;
      case 'korkenzieher': {
        if (once(E, p, 's', 0.02)) au.sfx('roll', 0, { gain: 0.8, rate: 0.95 });
        if (once(E, p, 'f', 0.6)) au.sfx('funkel', 0, { gain: 0.7 });
        const a = S.side * Math.PI * 2 * ease(p), r = 1.0;
        for (let side = -1; side <= 1; side += 2) for (let i = 0; i < n; i++) {
          const ca = Math.cos(a) * r * side, sa = Math.sin(a) * r * side;
          _x.set(P.x + rx * ca, P.y + sa, P.z + rz * ca);
          this.em(1, _x, side > 0 ? SC.GOLD : SC.STAR, 1, 0.42, 0.15, 0, 0.9, 0, 0, 0.05);
        }
        break;
      }
      case 'salto':
        if (once(E, p, 's', 0.02)) au.sfx('swoosh', 0, { gain: 0.8, rate: 1.1 });
        if (once(E, p, 'm', 0.5)) this.em(10, P, SC.STAR, 1, 0.3, 2.5, 0.5, 0.6, -0.5);
        if (once(E, p, 'e', 0.93)) {
          this.em(1, P, FLASH, 5, 5.5, 0, 0, 0.5, 0, 0);
          this.ringOut(P, 20, SC.STAR, 1, 0.55, 6, 0.4, 1.1);
          au.sfx('funkel', 0, { gain: 0.9 }); this.app.haptics.buzz('star');
        }
        break;
      case 'bumerang':
        if (once(E, p, 's', 0.02)) au.sfx('swoosh', 0, { gain: 0.8, rate: 0.9 });
        if (once(E, p, 'm', 0.5)) {
          this.em(16, P, SC.HEART, 3, 0.55, 4, 1.2, 1.3, -0.6);
          au.sfx('pop', 0, { gain: 0.8 }); au.sfx('swoosh', 0, { gain: 0.7, rate: 1.15 });
        }
        if (n && Math.random() < 0.6) this.em(1, P, SC.HEART, 3, 0.5, 0.5, 0.5, 1.3, 0.3, 1.5);
        break;
      case 'zickzack':
        if (once(E, p, 's', 0.0)) pl.kick(9, 0.05);
        for (const [k, at] of ZZ) if (once(E, p, k, at)) {
          pl.kick(10, 0.08); au.sfx('swoosh', 0, { gain: 0.75, rate: 1.1 + (k.charCodeAt(0) - 97) * 0.12 });
          this.em(12, P, SC.BOLT, 1, 0.4, 6, 0.3, 0.5, 0);
        }
        for (let i = 0; i < n * 2; i++) this.em(1, P, SC.BOLT, 1, 0.34, 0.3, 0, 0.5, 0, 1, 0.25);
        break;
      case 'rakete':
        if (once(E, p, 's', 0.0)) { au.sfx('rakete', 0, { gain: 0.9 }); this.ringOut(P, 30, SC.CONF, 2, 0.26, 7, 2.5, 1.8, -3); }
        if (p < 0.5) {
          _x.copy(P); _x.y -= 0.4;
          for (let i = 0; i < n * 2; i++) this.em(1, _x, SC.FIRE, 0, 0.45, 1.2, -1.5, 0.7, -3, 1.2, 0.2);
          if (n && Math.random() < 0.3) this.em(1, _x, PUFF, 7, 0.9, 0.4, -0.3, 1.0, 0.3, 1.5, 0.2);
        } else for (let i = 0; i < n; i++) this.em(1, P, SC.GOLD, 1, 0.3, 0.2, 0, 0.7, -0.5, 1, 0.3);
        if (once(E, p, 'top', 0.5)) {
          this.firework(_x.copy(P).add(_y.set(fx * 2, 2.2, fz * 2)), 0xffd84a);
          this.firework(_x.copy(P).add(_y.set(rx * 3 * S.side + fx * 5, 4.2, rz * 3 * S.side + fz * 5)), 0xff7eb6);
          au.sfx('pop', 0, { gain: 1, rate: 0.9 }); this.app.haptics.buzz('star'); pl.kick(8, 0.12);
        }
        break;
      case 'sternschnuppe':
        if (once(E, p, 's', 0.0)) { pl.kick(11, 0.04); au.sfx('swoosh', 0, { gain: 0.9, rate: 0.8 }); }
        if (once(E, p, 'f', 0.4)) au.sfx('funkel', 0, { gain: 0.8, rate: 1.1 });
        for (let i = 0; i < n * 3; i++) this.em(1, P, SC.STAR, 1, 0.3, 0.35, 0, 1.6, -0.35, 0.8, 0.35);
        for (let i = 0; i < n; i++) this.em(1, P, DUST, 0, 0.7, 0.1, 0, 1.0, 0, 1, 0.2);
        break;
      case 'tauchen':
        if (once(E, p, 's', 0.0)) au.sfx('swoosh', 0, { gain: 0.7, rate: 0.75 });
        if (once(E, p, 'b', 0.36)) { au.sfx('blubb', 0, { gain: 0.9 }); this.em(14, P, SC.BUBBLE, 6, 0.55, 2.5, 1.2, 1.5, 0.8, 1.6); }
        if (once(E, p, 'r', 0.45)) au.sfx('roll', 0, { gain: 0.8, rate: 1.1 });
        if (n && Math.random() < 0.55) this.em(1, P, SC.BUBBLE, 6, 0.4 + Math.random() * 0.3, 0.6, 0.4, 1.4, 0.7, 1.5, 0.5);
        break;
      case 'wackeltanz':
        for (const [k, at] of WK) if (once(E, p, k, at)) {
          this.em(16, P, SC.CONF, 2, 0.24, 5, 2.2, 1.6, -3, 1.2, 0.3, null, 10);
          if (k === 'a' || k === 'c') au.sfx('wackel', 0, { gain: 0.9, rate: k === 'a' ? 1 : 1.12 });
          pl.critter && pl.critter.bump(6);
        }
        break;
      case 'superschraube': {
        if (once(E, p, 's', 0.0)) au.sfx('roll', 0, { gain: 0.9, rate: 1.2 });
        if (once(E, p, 'f', 0.5)) au.sfx('funkel', 0, { gain: 0.8 });
        const a = S.side * 3 * Math.PI * 2 * ease(p), r = 1.3;
        if (n) for (let k = 0; k < 8; k++) {
          const b = a + k * Math.PI / 4, ca = Math.cos(b) * r, sa = Math.sin(b) * r;
          _x.set(P.x + rx * ca, P.y + sa, P.z + rz * ca);
          this.em(1, _x, SC.STAR, 1, 0.34, 0, 0, 0.24, 0, 0, 0.02);
        }
        if (once(E, p, 'e', 0.95)) this.ringOut(P, 14, SC.GOLD, 1, 0.45, 4.5, 0.6, 0.9);
        break;
      }
      case 'wirbel': {
        if (once(E, p, 's', 0.0)) au.sfx('zauber', 0, { gain: 0.6, rate: 0.85 });
        if (once(E, p, 'f', 0.5)) au.sfx('funkel', 0, { gain: 0.8, rate: 0.95 });
        const wid = this.world.def.id;
        const cols = wid === 'kirsch' ? SC.PETAL : wid === 'abend' ? SC.FIREFLY : this.world.def.flowers;
        const shape = wid === 'abend' ? 0 : 2, sz = wid === 'abend' ? 0.28 : 0.2; // 0,5/0,3 und 3/Frame: Konfetti-Sturm vor der Kamera
        const a0 = S.side * 2 * Math.PI * 2 * ease(p) * 1.25, r = 1.8 - 0.7 * p;
        for (let i = 0; i < n; i++) for (let k = 0; k < 2; k++) {
          const b = a0 + k * Math.PI + i * 0.3;
          _x.set(P.x + Math.cos(b) * r, P.y - 0.6 + p * 1.6 + k * 0.25, P.z + Math.sin(b) * r);
          _y.set(-Math.sin(b) * 2.2 * S.side, 0.8, Math.cos(b) * 2.2 * S.side);
          this.em(1, _x, cols, shape, sz, 0, 0, 0.85, -0.3, 1.2, 0.1, _y, 6);
        }
        break;
      }
    }
  }
  once(E, p, k, at) { if (p >= at && !E[k]) { E[k] = true; return true; } return false; }
  onShowDone() {
    const pl = this.player;
    if (this.state === 'won') { this.finaleEnd(); return; }
    this.em(10, pl.pos, SC.STAR, 1, 0.3, 2.5, 0.8, 0.7, -0.8);
    pl.critter && pl.critter.bump(3);
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
        if (a === 'show') this.showStunt();
      }
    }
    pl.update(dt, t, playing ? input : null);
    this.showFx(dt);
    pl.updateCamera(this.app.camera, dt, t);
    this.animals.update(dt, t, pl.pos);
    this.flyers.update(dt, t);
    for (const task of this.tasks) task.update(dt, t);
    if (this.glitter) this.glitter.update(dt, t);
    if (this.rollQ && !pl.landed && pl.airT >= 0.3 && this.state === 'play') { const q = this.rollQ; this.rollQ = null; this.doRoll(q.col, q.big); }
    this.rollTrail(dt);
    if (playing) this.hazards(dt, t);
    else this.wasps.update(dt, t, null);
    // Kombo verfällt
    if (this.combo > 0 && this.time - this.lastHit > this.diffCfg.comboWin) { this.combo = 0; this.app.ui.combo(0); this.app.audio.setIntensity(0.4); }
    // Zielanzeige (v2.6) bzw. alter Zielpfeil (?ziel=pfeil)
    if (this.guideMode === 'pfeil') this.updateArrow(dt, t); else this.updateGuide(dt);
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
    const A = this.arrow, pl = this.player, cam = this.app.camera, AR = ARROW;
    const tg = this.state === 'play' && this.diffCfg.arrow ? this.guideTarget() : null;
    let want = 0;
    if (tg) {
      _v.subVectors(tg, pl.pos);
      // Zielnähe: weich ausblenden (Ziel ist dann nah an der Figur im Bild, der Pfeil hoch oben hilft nicht mehr)
      want = THREE.MathUtils.smoothstep(_v.length(), AR.near, AR.far);
    }
    if (want > 0) {
      // Lage im Bild: Mitte waagrecht, senkrecht knapp unter der HUD-Leiste (hoch: auch unter dem Hinweis-Toast)
      const L = this.arrowLayout(cam);
      cam.updateMatrixWorld();
      _w.set(L.ndcX, L.ndcY, 0.5).unproject(cam).sub(cam.position).normalize();
      _x.set(0, 0, -1).applyQuaternion(cam.quaternion);
      A.position.copy(cam.position).addScaledVector(_w, L.D / Math.max(0.3, _w.dot(_x)));
      A.position.y += uBendAt(A.position, cam.position); // Weltkrümmung im Shader ausgleichen → sitzt genau dort
      // Richtung Figur → Ziel; senkrechter Anteil verstärkt, damit „tief unten“ sichtbar nach unten zeigt
      _v.normalize(); _v.y = THREE.MathUtils.clamp(_v.y * 1.4, -0.9, 0.9); _v.normalize();
      // nie genau auf die Kamera zu/von ihr weg (sonst nur ein runder Fleck wie ein Mond): mind. 60° quer zur Blickachse
      const a = _v.dot(_x), qMin = 0.87; // sin 60° (flacher wirkt die Spitze verkürzt wie ein Klecks)
      _y.copy(_v).addScaledVector(_x, -a);
      if (a < 0) {
        // Ziel hinter der Blickrichtung: deutlich zur Seite zeigen (umdrehen – links oder rechts), Höhe nur halb
        _pr.set(1, 0, 0).applyQuaternion(cam.quaternion); _pu.set(0, 1, 0).applyQuaternion(cam.quaternion);
        let lat = _y.dot(_pr); const up = _y.dot(_pu) * 0.5;
        if (Math.abs(lat) < qMin) lat = (lat < 0 ? -1 : 1) * qMin;
        _y.copy(_pr).multiplyScalar(lat).addScaledVector(_pu, up);
      } else if (_y.length() < qMin) {
        if (_y.length() < 1e-3) _y.set(0, 1, 0).addScaledVector(_x, -_x.y); // genau voraus: leicht nach oben
        _y.normalize().multiplyScalar(qMin);
      }
      const q = Math.min(0.999, _y.length());
      _v.copy(_y).addScaledVector(_x, Math.sign(a || 1) * Math.sqrt(1 - q * q)).normalize();
      _y.copy(A.position).add(_v); A.lookAt(_y);
      A.scale.setScalar(L.k * (0.95 + 0.05 * Math.sin(t * 6)));
      A.position.y += Math.sin(t * 4) * 0.05 * L.k;
      // Konvexe Teile ohne Tiefentest: was näher an der Kamera ist, zuletzt zeichnen (nur beim Umklappen neu hochladen)
      const ord = _v.dot(_x) > 0 ? 'away' : 'toward', O = this.arrowOrder;
      if (O.cur !== ord) { O.cur = ord; A.geometry.index.array.set(O[ord]); A.geometry.index.needsUpdate = true; }
      // nie über Figur, Ringen, Tropfen, Landeplätzen oder dem Toast/der Kombo-Anzeige: dann ausblenden
      A.updateMatrixWorld(true);
      this.arrowRect = screenRect(A, cam, L.W, L.H, this.arrowRect);
      if (this.arrowBlocked(cam, L)) want = 0;
    }
    this.arrowA += (want - this.arrowA) * Math.min(1, dt * 6);
    const facing = tg ? _v.x * Math.sin(pl.yaw) + _v.z * Math.cos(pl.yaw) : 0;
    const op = this.arrowA * THREE.MathUtils.clamp(1 - facing * 0.35, 0.6, 1);
    A.visible = op > 0.02;
    A.material.uniforms.uOpacity.value = op;
  }
  // Bildschirm-Lage des Pfeils, aus dem echten HUD gemessen (zweimal pro Sekunde, sonst zwischengespeichert)
  arrowLayout(cam) {
    const sz = this.app.renderer.r.getSize(_sz), H = sz.y || innerHeight, W = sz.x || innerWidth; // (kein DOM-Lesen je Bild → kein Zwangs-Layout)
    const now = performance.now(), C = this._arrowL || (this._arrowL = { t: -1e9 });
    if (now - C.t > 500 || C.W !== W || C.H !== H || C.fov !== cam.fov) {
      C.t = now; C.W = W; C.H = H; C.fov = cam.fov;
      const q = (sel) => { const e = document.querySelector(sel); return e ? e.getBoundingClientRect() : null; };
      const top = q('.hudtop'), toast = q('#toast'), combo = q('#combo'), up = q('#zones .zu i'); // ▲-Steuerhilfe (nur Tipp-Modus)
      const port = W < H, hudB = top && top.height ? top.bottom : 62;
      C.port = port;
      C.D = port ? AR_D.port : AR_D.land;                    // Abstand zur Kamera (weiter als die Figur)
      // Pfeil-Länge im Bild (v2.4: ≈ 43 / 31 px). Quer passt er zwischen Kopfleiste und Toast (dort kaum Platz)
      const lenPx = port ? Math.min(84, H * 0.092) : Math.max(30, Math.min(48, H * 0.12, toast ? toast.top + 3 - hudB - 16 : 48));
      const pxU = H / 2 / Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) / C.D; // Pixel je Meter in diesem Abstand
      C.k = lenPx / (0.98 * pxU);                             // Geometrie ist 0,98 m lang
      const half = lenPx * 0.5;                               // senkrechte halbe Höhe, auch steil geneigt
      const under = port && toast ? Math.max(hudB, toast.top + 54) : hudB; // Toast-Höhe fest (leer ist er flacher)
      const cy = Math.min(under + (port ? 10 : 7) + half, H / 3 - half * 0.2);
      // waagrecht mittig über der Figur; liegt dort die ▲-Steuerhilfe (quer), rechts daneben
      let cx = W / 2;
      if (up && up.width && cy + half > up.top - 4 && cy - half < up.bottom + 4) cx = up.right + 10 + half;
      C.ndcX = 2 * cx / W - 1; C.ndcY = 1 - 2 * cy / H; C.cx = cx; C.cy = cy; C.half = half;
      C.toast = toast; C.combo = combo;
    }
    return C;
  }
  arrowBlocked(cam, L) {
    const R = this.arrowRect, W = L.W, H = L.H, pad = 6, f = H / 2 / Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
    const hit = (x, y, rad) => x + rad > R[0] - pad && x - rad < R[2] + pad && y + rad > R[1] - pad && y - rad < R[3] + pad;
    const ui = this.app.ui.el;
    for (const [el, rc] of [[ui.toast, L.toast]]) { // (Kombo-Text liegt ohnehin darüber und ist gleich wieder weg)
      if (rc && el.classList.contains('show') && rc.right > R[0] && rc.left < R[2] && rc.bottom > R[1] && rc.top < R[3]) return true;
    }
    // Figur
    const c = this.player.critter, pp = proj(this.player.pos, cam, W, H);
    if (c && pp[2] < 1 && hit(pp[0], pp[1], 0.9 * (c.size || 1) * f / Math.max(0.5, this.player.pos.distanceTo(cam.position)))) return true;
    // Aufgaben-Ziele (nächste Ringe, Tropfen, Landeplätze, Herzen …) und Glitzerstern
    const pts = this._arrowPts || (this._arrowPts = []); pts.length = 0;
    for (const tk of this.tasks) tk.marks && tk.marks(pts);
    if (this.glitter && !this.glitter.found) pts.push(this.glitter.pos, 1);
    for (let i = 0; i < pts.length; i += 2) {
      const p = pts[i], d = p.distanceTo(cam.position); if (d < 0.5) continue;
      const [x, y, z] = proj(p, cam, W, H); if (z > 1) continue;
      if (hit(x, y, pts[i + 1] * f / d)) return true;
    }
    return false;
  }

  // ---------------------------------------------------------------- Zielanzeige v2.6 (DOM über dem Bild, 0 Draw-Calls)
  buildGuide() {
    const root = document.getElementById('guide'), q = (s) => root && root.querySelector(s);
    this.guide = { mode: null, side: 0, badge: '', clamp: false, aM: 0, aE: 0, x: 0, y: 0, size: 0, tx: 0, ty: 0, ex: 0, ey: 0, dim: 1,
      el: root ? { m: q('.gm'), e: q('.ge'), mb: q('.gm .bdg'), eb: q('.ge .bdg') } : null, w: {} };
  }
  guideOff() {
    const S = this.guide; if (!S) return;
    S.aM = S.aE = 0; S.mode = null; S.side = 0;
    this.guideDraw();
  }
  // Ziel-Radius (Ring, Tropfen, Landeplatz …) aus den Aufgaben-Marken
  guideMarks(tg) {
    const pts = this._arrowPts || (this._arrowPts = []); pts.length = 0;
    for (const tk of this.tasks) tk.marks && tk.marks(pts);
    for (let i = 0; i < pts.length; i += 2) if (pts[i] === tg) return pts[i + 1];
    return 0.7;
  }
  updateGuide(dt) {
    const S = this.guide, G = GUIDE, pl = this.player, cam = this.app.camera, mm = THREE.MathUtils;
    if (!S.el) return;
    const tg = this.state === 'play' && this.diffCfg.arrow ? this.guideTarget() : null;
    const want = tg ? mm.smoothstep(_v.subVectors(tg, pl.pos).length(), G.near, G.far) : 0;
    let wantM = 0, wantE = 0;
    if (want > 0) {
      const L = this.guideLayout(cam), W = L.W, H = L.H;
      cam.updateMatrixWorld();
      const r = this.guideMarks(tg);
      const [tx, ty, tz] = proj(tg, cam, W, H);
      S.tx = tx; S.ty = ty;
      // waagrechter Kamera-Rahmen: vorn/rechts → Winkel des Ziels um die Hochachse (0 = geradeaus, ±π = genau hinten)
      _x.set(0, 0, -1).applyQuaternion(cam.quaternion); _x.y = 0; _x.normalize();
      _w.subVectors(tg, cam.position);
      const fw = _w.x * _x.x + _w.z * _x.z, rt = _w.z * _x.x - _w.x * _x.z;
      const ang = Math.atan2(rt, fw);
      let side = ang < 0 ? -1 : 1;
      if (S.side && side !== S.side && Math.abs(ang) > Math.PI - G.backHyst) side = S.side; // kein Flackern hinten
      S.side = side; S.ang = ang;
      const dy = tg.y - pl.pos.y, tall = Math.abs(dy) > (S.badge ? G.badgeDy - G.badgeHyst : G.badgeDy);
      const hy = S.mode === 'marker' ? -G.edgeHyst : G.edgeHyst; // drinbleiben leichter als hineinkommen
      if (tz < 1 && fw > 0.5 && tx > L.x0 + hy && tx < L.x1 - hy) {
        // Ziel im Bild (waagrecht): Stern schwebt darüber, Spitze zeigt auf das Ziel
        S.mode = 'marker';
        const d = Math.max(0.5, tg.distanceTo(cam.position));
        const size = mm.clamp(G.sizeM * L.f / d, L.px[0], L.px[1]);
        _pu.copy(tg); _pu.y += r;
        const topY = proj(_pu, cam, W, H)[1];
        const yMin = L.y0 + size, yMax = L.y1, vy = S.clamp ? G.edgeHyst : 0;
        const out = ty < L.y0 - vy || ty > L.y1 + vy; // senkrecht außerhalb (sehr hoch/tief): Stern am Rand, ohne Spitze
        let x = tx, y = out ? mm.clamp(ty, yMin, yMax) : mm.clamp(Math.min(ty, topY) - G.lift, yMin, yMax);
        S.clamp = out; S.badge = out && tall ? (dy > 0 ? 'up' : 'dn') : '';
        // ▲/▼-Steuerhilfe und STUNT-Knopf nicht verdecken: senkrecht daran vorbei (Spitze bleibt über dem Ziel, z. B. im
        // Ring); nur wenn das Ziel selbst darunter liegt, seitlich daneben
        for (const u of L.icons) {
          if (!(x + size / 2 > u.left - 4 && x - size / 2 < u.right + 4 && y > u.top - 4 && y - size < u.bottom + 4)) continue;
          const yy = u.bottom < H / 2 ? u.bottom + 4 + size : u.top - 4;
          if (yy <= ty + 2 && yy - size >= L.y0) y = yy;
          else x = tx < (u.left + u.right) / 2 ? u.left - size / 2 - 6 : u.right + size / 2 + 6;
        }
        // nie über der Figur: Stern über ihren Kopf heben (bleibt senkrecht über dem Ziel); geht das nicht, blasser.
        // Andere Ringe/Tropfen dürfen dahinter liegen – bei Ring-Parcours liegen die nächsten Ringe fast immer genau dort.
        const F = this.guideFig(cam, L);
        const onFig = (yy) => F && F[0] < x + size / 2 && F[2] > x - size / 2 && F[1] < yy && F[3] > yy - size;
        S.lifted = false; S.dim = 1;
        if (onFig(y)) {
          const yy = F[1] - 3;
          if (yy - size >= L.y0 && !L.icons.some(u => x + size / 2 > u.left && x - size / 2 < u.right && yy > u.top && yy - size < u.bottom)) { y = yy; S.lifted = true; }
          else S.dim = G.dimFig;
        }
        S.x = x; S.y = y; S.size = size;
        wantM = this.guideHidden([x - size / 2, y - size, x + size / 2, y], L) ? 0 : 1;
      } else {
        // Ziel außerhalb des Bildes oder hinten: Randpfeil links/rechts = dorthin drehen
        S.mode = 'edge'; S.clamp = false;
        S.badge = tall ? (dy > 0 ? 'up' : 'dn') : '';
        S.ex = side < 0 ? L.eL : L.eR;
        if (L.eY !== null) S.ey = L.eY;
        else { const pp = proj(pl.pos, cam, W, H); S.ey = mm.clamp(pp[1], H * 0.32, H * 0.68); }
        const h = 40 * L.ek, w = 32 * L.ek;
        wantE = this.guideHidden([S.ex - w, S.ey - h - (S.badge === 'up' ? 30 : 0), S.ex + w, S.ey + h + (S.badge === 'dn' ? 30 : 0)], L) ? 0 : 1;
      }
    }
    const k = Math.min(1, dt * G.fade);
    S.aM += (want * wantM - S.aM) * k; S.aE += (want * wantE - S.aE) * k;
    if (S.aM < 0.01 && wantM === 0) S.aM = 0;
    if (S.aE < 0.01 && wantE === 0) S.aE = 0;
    this.guideDraw();
  }
  // Bildschirm-Rechteck der Figur (Flügel, Hut … eingeschlossen): Hülle relativ zur Figur zweimal pro Sekunde messen,
  // je Bild nur 8 Ecken projizieren
  guideFig(cam, L) {
    const pl = this.player, c = pl.critter; if (!c) return null;
    if (L.figT !== L.t) { L.figT = L.t; const b = _fb.setFromObject(c.root); L.fb0 = b.min.sub(pl.pos).toArray(L.fb0); L.fb1 = b.max.sub(pl.pos).toArray(L.fb1); }
    const a = L.fb0, b = L.fb1, R = this._figR || (this._figR = [0, 0, 0, 0]);
    R[0] = R[1] = 1e9; R[2] = R[3] = -1e9;
    for (let i = 0; i < 8; i++) {
      _pr.set(pl.pos.x + (i & 1 ? b[0] : a[0]), pl.pos.y + (i & 2 ? b[1] : a[1]), pl.pos.z + (i & 4 ? b[2] : a[2]));
      const [x, y, z] = proj(_pr, cam, L.W, L.H); if (z > 1) return null;
      R[0] = Math.min(R[0], x); R[1] = Math.min(R[1], y); R[2] = Math.max(R[2], x); R[3] = Math.max(R[3], y);
    }
    return R;
  }
  // Toast oder Kombo-Anzeige liegt drüber → ausblenden (wie beim v2.5-Pfeil)
  guideHidden(R, L) {
    const ui = this.app.ui.el;
    for (const [el, rc] of [[ui.toast, L.toast], [ui.combo, L.combo]]) {
      if (rc && el && el.classList.contains('show') && rc.right > R[0] && rc.left < R[2] && rc.bottom > R[1] && rc.top < R[3]) return true;
    }
    return false;
  }
  // Nur schreiben, was sich geändert hat (Stil-Schreiben ohne Layout-Lesen)
  guideDraw() {
    const S = this.guide, E = S.el; if (!E) return;
    const w = S.w, L = this._guideL;
    const set = (el, key, prop, val) => { if (w[key] !== val) { w[key] = val; el.style[prop] = val; } };
    const om = S.aM * S.dim, oe = S.aE;
    set(E.m, 'mv', 'visibility', om > 0.01 ? 'visible' : 'hidden');
    set(E.e, 'ev', 'visibility', oe > 0.01 ? 'visible' : 'hidden');
    if (om > 0.01) {
      set(E.m, 'mo', 'opacity', om.toFixed(2));
      set(E.m, 'mt', 'transform', `translate3d(${S.x.toFixed(1)}px,${S.y.toFixed(1)}px,0) scale(${(S.size / 64).toFixed(3)})`);
      const cls = 'gm' + (S.clamp ? ' clamp' : ''); if (w.mc !== cls) { w.mc = cls; E.m.className = cls; }
      const b = S.mode === 'marker' ? S.badge : ''; if (w.mb !== b) { w.mb = b; E.mb.className = 'bdg ' + b; E.mb.textContent = b === 'up' ? '▲' : b === 'dn' ? '▼' : ''; }
    }
    if (oe > 0.01) {
      set(E.e, 'eo', 'opacity', oe.toFixed(2));
      set(E.e, 'et', 'transform', `translate3d(${S.ex.toFixed(1)}px,${S.ey.toFixed(1)}px,0) scale(${(L ? L.ek : 1).toFixed(3)})`);
      const cls = 'ge' + (S.side < 0 ? ' l' : ' r'); if (w.ec !== cls) { w.ec = cls; E.e.className = cls; }
      const b = S.mode === 'edge' ? S.badge : ''; if (w.eb !== b) { w.eb = b; E.eb.className = 'bdg ' + b; E.eb.textContent = b === 'up' ? '▲' : b === 'dn' ? '▼' : ''; }
    }
  }
  // Bildbereiche aus dem echten HUD (zweimal pro Sekunde gemessen): Stern-Zone zwischen den Lenkzonen-Symbolen ◀ ▶ und
  // unter der Kopfleiste; Randpfeil gleich innen neben ◀ bzw. ▶ (auf deren Höhe) bzw. mit Joystick am Bildrand
  guideLayout(cam) {
    const sz = this.app.renderer.r.getSize(_sz), H = sz.y || innerHeight, W = sz.x || innerWidth;
    const now = performance.now(), C = this._guideL || (this._guideL = { t: -1e9 });
    if (now - C.t > 500 || C.W !== W || C.H !== H || C.fov !== cam.fov) {
      C.t = now; C.W = W; C.H = H; C.fov = cam.fov;
      const q = (sel) => { const e = document.querySelector(sel), r = e && e.getBoundingClientRect(); return r && r.width ? r : null; };
      const top = q('.hudtop'), zl = q('#zones .zl i'), zr = q('#zones .zr i'), zu = q('#zones .zu i'), zd = q('#zones .zd i'), show = q('#bShow');
      const port = W < H, G = GUIDE;
      C.f = H / 2 / Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
      C.px = port ? G.px.port : G.px.land; C.ek = port ? G.edgeK.port : G.edgeK.land;
      C.x0 = zl ? zl.right + 6 : W * 0.08; C.x1 = zr ? zr.left - 6 : W * 0.92;
      C.y0 = (top ? top.bottom : 62) + 6; C.y1 = H - 28;
      C.icons = [zu, zd, show].filter(Boolean);               // ▲/▼-Steuerhilfe und STUNT-Knopf frei lassen
      const hw = 32 * C.ek;
      C.eL = (zl ? zl.right + 14 : 8) + hw; C.eR = (zr ? zr.left - 14 : W - 8) - hw; // Abstand: Schubs-Animation nach außen
      C.eY = zl ? (zl.top + zl.bottom) / 2 : null;
      C.toast = q('#toast'); C.combo = q('#combo');
      // (leere Meldung ist flacher: Höhe fest wie beim Pfeil)
      if (C.toast && port) C.toast = { left: C.toast.left, right: C.toast.right, top: C.toast.top, bottom: C.toast.top + 54 };
    }
    return C;
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
    // Wettflug: gewonnen · schneller als par · Blitzzeit (auf allen Stufen, auch Schwer statt Kombo)
    const third = this.isRace ? this.time <= this.blitz : this.diffCfg.id === 'schwer' ? this.maxCombo >= this.comboReq : this.bonusFound;
    const stars = 1 + (this.time <= this.par ? 1 : 0) + (third ? 1 : 0);
    this.stars = stars;
    this.player.frozen = false;
    this.arrow.visible = false; this.guideOff();
    document.body.classList.add('won'); // Steuer-Pfeile ausblenden – Bühne frei fürs Finale
    this.app.audio.setIntensity(0.9);
    this.startFinale();
    this.app.onWon({ stars, time: this.time, par: this.par, blitz: this.blitz, race: this.isRace, maxCombo: this.maxCombo, comboReq: this.comboReq, bonus: this.bonusFound, hits: this.hits });
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
