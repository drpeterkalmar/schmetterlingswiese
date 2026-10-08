// Spieler: Flugmodell (echte Loopings), Landen, Kamera mit Kicks
import * as THREE from 'three';
import { Critter } from './characters.js';
import { height, pond } from '../world/terrain.js';
import { blobTex } from '../engine/textures.js';
import { RM } from '../engine/deko.js';
import { G, kontaktMat } from '../engine/gfx.js';
import { kontaktParameter, KONTAKT_AN } from '../engine/schatten.js';
// v2.9 gerichteter Kontaktschatten nach Sonnenstand (?kontakt=0 = runder Blob wie bis v2.8)
const _sd = [0, 1, 0];
import { showOffset, showOrient, showLift, liftAt, showBounds } from '../game/stunts.js';

const TAU = Math.PI * 2;
// v2.5.1 Landen leichter: Fangbereich-Faktor gegenüber v2.5.0 (URL ?landen=<Faktor>, 1 = altes Verhalten ohne Einrasten)
export const LAND_K = 1.9;
const _UPV = new THREE.Vector3(0, 1, 0);
const ease = (p) => 0.5 - 0.5 * Math.cos(Math.PI * p);
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _f = new THREE.Vector3(), _q = new THREE.Quaternion(), _gc = new THREE.Vector3();
const _seat = { pos: new THREE.Vector3(), n: new THREE.Vector3(), yaw: null }, _n = new THREE.Vector3();
const lerpAng = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.ext = new THREE.Vector3(); // Schubs (Wind, Wespe)
    this.yaw = 0; this.pitch = 0; this.yawRate = 0; this.speed = 7;
    this.baseSpeed = 7; this.turnRate = 1.9;
    this.landed = false; this.landSpot = null; this.landing = null;
    this.stunt = null; this.wetT = 0; this.dizzyT = 0;
    this.carry = null;
    this.on = {};
    this.colliders = []; this.landables = [];
    this.bounds = 108;
    this.critter = null;
    this.frozen = false;
    // Blob-Schatten (v2.9: gerichteter Kontaktschatten, Quad 2×2 in xz, Größe/Richtung je Bild)
    if (KONTAKT_AN) {
      const g = new THREE.PlaneGeometry(2, 2); g.rotateX(-Math.PI / 2);
      this.shadow = new THREE.Mesh(g, kontaktMat(0x1a2a10, 0.4));
    } else {
      const sm = new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, color: 0x1a2a10, opacity: 0.35 });
      sm.userData.keinBloom = true;
      this.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.9, 20), sm);
      this.shadow.rotation.x = -Math.PI / 2;
    }
    this.shadow.renderOrder = 1;
    scene.add(this.shadow);
    // Kamera-Zustand
    this.camPos = new THREE.Vector3(); this.camLook = new THREE.Vector3(); this.orbit = 0; this.shakeT = 0; this.fovKick = 0;
    this.camInit = false;
    this.stats = { loops: 0, rolls: 0 };
  }
  setCharacter(kind, look) {
    if (this.critter) { this.scene.remove(this.critter.root); this.critter.dispose(); }
    this.critter = new Critter(kind, look);
    this.scene.add(this.critter.root);
    this.critter.root.position.copy(this.pos);
  }
  reset(pos, yaw) {
    this.pos.copy(pos); this.yaw = yaw; this.pitch = 0; this.yawRate = 0; this.ext.set(0, 0, 0);
    this.landed = false; this.landSpot = null; this.landing = null; this.stunt = null; this.wetT = 0; this.dizzyT = 0; this.carry = null; this.showReset = true;
    this.airT = 9; this.seatTilt = null; this.seatOrbit = null;
    this.camInit = false; this.orbit = 0; this.hover = false; this.cheer = false; this.grandBlend = 0;
  }
  emit(ev, a) { const f = this.on[ev]; if (f) f(a); }
  // o.grand = Sieger-Looping (länger, größerer Kreis, Seitenkamera)
  tryStunt(type, o = {}) {
    if (this.landed && !this.frozen) { this.takeoff(); if (!o.grand) return false; }
    if (this.stunt || this.frozen) return false;
    const dur = o.dur || (type === 'loop' ? 1.35 : 1.0);
    this.stunt = { type, t: 0, dur, dir: this.yawRate > 0.2 ? -1 : 1, grand: !!o.grand };
    if (type === 'loop') this.pos.y = Math.max(this.pos.y, height(this.pos.x, this.pos.z) + 1.6);
    if (o.grand) {
      // Kreis: Radius aus Tempo·Dauer; Tiefpunkt mind. 2,6 m über dem Boden (Rest wird in den ersten 35 % angehoben)
      const R = this.baseSpeed * 1.5 * dur / TAU, fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
      const lift = Math.max(0, height(this.pos.x, this.pos.z) + 2.6 - this.pos.y);
      this.stunt.lift = this.stunt.lift0 = lift;
      this.stunt.c = new THREE.Vector3(this.pos.x + fx * R * 0.3, this.pos.y + lift + R, this.pos.z + fz * R * 0.3);
      // Kamera-Seite schräg von hinten (Hochformat 55°, quer 75°) → Kreis als Ellipse, passt ins schmale Bild
      const port = (this.camAspect || 1) < 1, th = port ? 0.8 : 1.3;
      this.stunt.side = new THREE.Vector3(fz * Math.sin(th) - fx * Math.cos(th), 0, -fx * Math.sin(th) - fz * Math.cos(th));
      this.stunt.R = R;
    }
    this.emit('stunt', type);
    return true;
  }
  // 🎪 Zufalls-Einlage (v2.3): gleiche Muster wie der Sieger-Looping (abheben am Boden, Sicherheitshöhe, harter
  // Winkel-Reset am Ende), Bahn aus stunts.js. Feuert bewusst weder 'stunt' noch 'stuntDone' → zählt nicht als Aufgabe.
  // v2.4 o.grand = Sieger-Einlage: Bahn ×o.amp, Dauer ×o.durK, Seitenkamera um die mitwandernde Bahnmitte (wie der Looping)
  tryShow(def, side = 1, o = {}) {
    if (this.frozen || this.stunt || !def) return false;
    if (this.landed) this.takeoff();
    const sp = this.baseSpeed * (def.spd || 1.15), dur = def.dur * (o.durK || 1);
    const S = { type: 'show', def, id: def.id, t: 0, dur, L: sp * dur, side: side < 0 ? -1 : 1, yaw: this.yaw, amp: o.amp || 1,
      prev: new THREE.Vector3(), anchor: this.pos.clone(), qt: new THREE.Quaternion(), q: new THREE.Quaternion(), p: 0 };
    S.lift = showLift(S, this.pos.x, this.pos.y, this.pos.z, height);
    if (o.grand) {
      S.grand = true; S.start = this.pos.clone(); S.mid = new THREE.Vector3(); S.c = new THREE.Vector3();
      S.R = showBounds(S, S.mid);
      // Kamera-Seite schräg von hinten (Hochformat 55°, quer 75°), gegenüber dem seitlichen Ausschlag der Bahn
      const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw), port = (this.camAspect || 1) < 1, th = port ? 0.8 : 1.3;
      const k = S.mid.x * S.side > 0.3 ? -S.side : S.side;
      S.camSide = new THREE.Vector3(k * (fz * Math.sin(th)) - fx * Math.cos(th), 0, k * (-fx * Math.sin(th)) - fz * Math.cos(th));
      this.showCenter(S, 0);
    }
    this.stunt = S; this.yawRate = 0; this.pitch = 0; this.landing = null;
    return true;
  }
  // Mitte der Sieger-Bahn in Weltkoordinaten: Start + Fluglinie + Bahnmitte + Hub
  showCenter(S, p) {
    const fx = Math.sin(S.yaw), fz = Math.cos(S.yaw), rx = Math.cos(S.yaw), rz = -Math.sin(S.yaw);
    const z = S.mid.z + S.L * p, x = S.mid.x;
    S.c.set(S.start.x + rx * x + fx * z, S.start.y + S.mid.y + S.lift * liftAt(p), S.start.z + rz * x + fz * z);
  }
  forward(out = _f) { const cp = Math.cos(this.pitch); return out.set(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp); }
  push(v) { this.ext.add(v); }

  update(dt, t, inp) {
    const c = this.critter;
    if (this.frozen) { c && c.update(dt, t, { frozen: true }); return; }
    const turn = inp ? inp.turn : 0, climb = inp ? inp.climb : 0;
    const gh = height(this.pos.x, this.pos.z);
    let visPitch = 0, visRoll = 0;
    this.wetT = Math.max(0, this.wetT - dt); this.dizzyT = Math.max(0, this.dizzyT - dt);
    if (!this.landed) this.airT += dt;

    if (this.hover) {
      this.pitch *= Math.max(0, 1 - dt * 4); this.yawRate *= Math.max(0, 1 - dt * 4);
      this.pos.y += (Math.max(this.pos.y, gh + 1.6) - this.pos.y) * Math.min(1, dt * 3);
    } else if (this.landed && this.landSpot && this.landSpot.seatPose && c) {
      // v2.5 Sitzplatz auf der Blüte: weich vom Landepunkt auf den Sitz, danach exakt mitgeführt
      // (wiegt die Blume, wiegt die Figur mit). Ausgerichtet an der Blüten-Normalen; Sonnenblume: Blick fest nach vorn.
      this.landT += dt;
      const S = this.landSpot.seatPose(t, c, this.yaw, _seat);
      if (S.yaw !== null) { this.yawRate = 0; }
      else { this.yawRate += (-turn * 1.2 - this.yawRate) * Math.min(1, dt * 5); this.yaw += this.yawRate * dt; }
      // Aufsetzen in 0,5 s: erst über dem Sitz ausrichten (drehen/neigen, mind. 30 cm darüber), dann entlang der Normalen absenken
      this.seatK = Math.min(1, this.seatK + dt / 0.5);
      const k = this.seatK, e = ease(Math.min(1, k / 0.55)), kT = ease(Math.min(1, k / 0.6)), kN = ease(THREE.MathUtils.clamp((k - 0.35) / 0.65, 0, 1));
      if (S.yaw !== null) this.yaw = lerpAng(this.seatYaw0, S.yaw, e);
      _w.subVectors(this.seatFrom, S.pos); const dn = _w.dot(S.n); _w.addScaledVector(S.n, -dn);
      this.pos.copy(S.pos).addScaledVector(_w, 1 - kT).addScaledVector(S.n, Math.max(dn, this.seatHover()) * (1 - kN));
      // Neigung aus der Normalen (im Gier-Rahmen): x = vorn runter, z = seitlich
      _n.copy(S.n).applyAxisAngle(_UPV, -this.yaw);
      const tx = Math.atan2(_n.z, _n.y), tz = -Math.asin(THREE.MathUtils.clamp(_n.x, -1, 1));
      this.seatTilt = this.seatTilt || [0, 0];
      this.seatTilt[0] = this.tiltFrom[0] + (tx - this.tiltFrom[0]) * e; this.seatTilt[1] = this.tiltFrom[1] + (tz - this.tiltFrom[1]) * e;
      this.pitch = 0; this.speed = 0;
      if (climb > 0.35 && this.landT > 0.25) this.takeoff();
    } else if (this.landed) {
      const L = this.landSpot;
      const ly = L ? L.pos.y : gh + 0.35;
      if (L) { this.pos.x += (L.pos.x - this.pos.x) * Math.min(1, dt * 6); this.pos.z += (L.pos.z - this.pos.z) * Math.min(1, dt * 6); }
      this.pos.y += (ly - this.pos.y) * Math.min(1, dt * 8);
      this.yawRate += (-turn * 1.2 - this.yawRate) * Math.min(1, dt * 5);
      this.yaw += this.yawRate * dt;
      this.pitch *= Math.max(0, 1 - dt * 5);
      this.landT += dt;
      if (climb > 0.35 && this.landT > 0.25) this.takeoff();
    } else if (this.stunt && this.stunt.type === 'show') {
      // Zufalls-Einlage: Bahn schrittweise (Δ der gemeinsamen Bahnfunktion) → Schubser/Hindernisse wirken wie sonst
      const S = this.stunt;
      S.t += dt;
      const p = S.p = Math.min(1, S.t / S.dur);
      const fx = Math.sin(S.yaw), fz = Math.cos(S.yaw), rx = Math.cos(S.yaw), rz = -Math.sin(S.yaw);
      showOffset(S, p, _v); _v.y += S.lift * liftAt(p);
      const dx = _v.x - S.prev.x, dy = _v.y - S.prev.y, dz = _v.z - S.prev.z;
      this.pos.x += rx * dx + fx * dz; this.pos.y += dy; this.pos.z += rz * dx + fz * dz;
      S.prev.copy(_v);
      // Kamera-Anker: nahe der Fluglinie (70 % des Figuren-Ausschlags herausgerechnet) → ruhiges Bild, Figur bleibt drin
      const ox = _v.x, oy = _v.y - S.lift * liftAt(p), oz = _v.z - S.L * p;
      S.anchor.set(this.pos.x - (rx * ox + fx * oz) * 0.7, this.pos.y - oy * 0.7, this.pos.z - (rz * ox + fz * oz) * 0.7);
      showOrient(S, p, S.q);
      if (S.grand) this.showCenter(S, p);
      this.speed = this.baseSpeed;
      this.pos.y = Math.max(this.pos.y, gh + 0.6);
      if (p >= 1) { const id = S.id; this.stunt = null; this.showReset = true; this.emit('showDone', id); } // Winkel hart nullen (unten)
    } else if (this.stunt) {
      const S = this.stunt;
      S.t += dt;
      const p = Math.min(1, S.t / S.dur), e = ease(p);
      this.yawRate *= Math.max(0, 1 - dt * 4);
      this.yaw += this.yawRate * dt;
      const sp = this.baseSpeed * (S.grand ? 1.5 : 1.15);
      if (S.grand && S.lift > 0) { // Sieger-Looping: sanft auf Sicherheitshöhe heben (erste 35 %)
        const dy = Math.min(S.lift, S.lift0 * dt / (S.dur * 0.35)); this.pos.y += dy; S.lift -= dy;
      }
      if (S.type === 'loop') {
        const a = e * TAU;
        const cp = Math.cos(a);
        _v.set(Math.sin(this.yaw) * cp, Math.sin(a), Math.cos(this.yaw) * cp);
        this.pos.addScaledVector(_v, sp * dt);
        visPitch = a;
      } else {
        this.forward(_v); _v.y = 0; _v.normalize();
        this.pos.addScaledVector(_v, sp * dt);
        this.pos.y += Math.sin(Math.PI * p) * 2.2 * dt;
        visRoll = e * TAU * S.dir;
      }
      this.pos.y = Math.max(this.pos.y, gh + 0.6);
      if (p >= 1) {
        const type = S.type; this.stunt = null; visPitch = 0; visRoll = 0; // Winkel hart nullen
        if (type === 'loop') this.stats.loops++; else this.stats.rolls++;
        this.emit('stuntDone', type);
      }
    } else {
      const dizzy = this.dizzyT > 0 ? 0.4 : 1;
      this.yawRate += (-turn * this.turnRate * dizzy - this.yawRate) * Math.min(1, dt * 5.5);
      this.yaw += this.yawRate * dt;
      let tp = climb * 0.58;
      const alt = this.pos.y - gh;
      // Landeanflug: runter halten nahe Landeplatz/Boden.
      // v2.5.1: großer Fangbereich; einmal gefangen rastet der Platz ein und die Figur landet von selbst, auch wenn ▼
      // losgelassen wird. Abbrechen nur aktiv: ▲ (steigen) oder deutlich wegsteuern. (landK = 1: wie v2.5.0)
      const K = this.landK || 1, easy = K > 1.001;
      let best = null;
      if (easy && this.landing && !this.landing.done) {
        const L = this.landing, dh = Math.hypot(L.pos.x - this.pos.x, L.pos.z - this.pos.z);
        this.steerAway = Math.abs(turn) > 0.5 ? (this.steerAway || 0) + dt : 0;
        if (climb > 0.35 || this.steerAway > 0.45 || dh > this.catchR(L) * 1.6) { this.landing = null; this.emit('unlock', L); }
        else best = L;
      } else this.landing = null;
      if (!best && climb < -0.3) {
        let bd = 1e9;
        for (const L of this.landables) {
          if (L.done) continue;
          const dx = L.pos.x - this.pos.x, dz = L.pos.z - this.pos.z, dh = Math.hypot(dx, dz), dy = this.pos.y - L.pos.y;
          // von unten nur außerhalb der Blüte (dann erst steigen, dann hinübergleiten – nie von unten hinein)
          const inY = easy ? dy < 8 && dy > -2.5 && (dy > -0.3 || dh > this.footR(L)) : dy < 6;
          if (dh < (easy ? this.catchR(L) : (L.r || 2.6)) && inY && dh < bd) { bd = dh; best = L; }
        }
        if (best && easy) { this.steerAway = 0; this.emit('lock', best); }
      }
      {
        if (best) {
          this.landing = best;
          // v2.5 Blüten-Sitz: Ziel ist ein Schwebepunkt über dem figur-genauen Sitz (Riesen höher); von oben anfliegen
          // (Höhe wächst mit dem Abstand) – nie flach seitlich durch den Blütenkranz, beim Aufsetzen kein Sprung
          const T = _gc.copy(best.pos);
          if (best.seatPose && c) { const S = best.seatPose(t, c, this.yaw, _seat, true); T.copy(S.pos).addScaledVector(S.n, this.seatHover()); }
          const bt = Math.hypot(T.x - this.pos.x, T.z - this.pos.z);
          const hy = T.y + (best.seatPose ? Math.max(0, bt - 0.3) * 0.8 : 0);
          // sanft in den Landeplatz gleiten (fast schweben); liegt die Figur unter dem Anflug-Kegel: erst steigen
          const gx = !easy || this.pos.y >= hy - 0.35 ? 1 : 0;
          this.pos.x += (T.x - this.pos.x) * Math.min(1, dt * 4.5) * gx;
          this.pos.z += (T.z - this.pos.z) * Math.min(1, dt * 4.5) * gx;
          this.pos.y += (hy - this.pos.y) * Math.min(1, dt * 3.4);
          const want = Math.atan2(T.x - this.pos.x, T.z - this.pos.z);
          if (bt > 0.4) { let dd = want - this.yaw; dd = Math.atan2(Math.sin(dd), Math.cos(dd)); this.yaw += dd * Math.min(1, dt * 3); }
          tp = -0.15;
          // v2.5: erst aufsetzen, wenn eine laufende Freuden-Schraube fertig ist (sonst dreht sich die Figur auf der Blüte)
          if (Math.abs(this.pos.y - hy) < 0.4 && bt < 1.4 && !(c && c.rollBusy)) this.land(best);
        } else if (climb < -0.3 && alt < 1.3 && !(easy && this.overWater())) { // (v2.5.1: nie aufs Wasser)
          this.pos.y += (gh + 0.35 - this.pos.y) * Math.min(1, dt * 4);
          if (this.pos.y - gh < 0.5) this.land(null);
        }
      }
      this.pitch += (tp - this.pitch) * Math.min(1, dt * 4);
      const wet = this.wetT > 0 ? 0.7 : 1;
      this.speed += (this.baseSpeed * (1 - this.pitch * 0.28) * wet * (this.landing ? 0.08 : 1) - this.speed) * Math.min(1, dt * (this.landing ? 5 : 2));
      this.forward(_v);
      this.pos.addScaledVector(_v, this.speed * dt);
      visPitch = this.pitch * 0.8;
      visRoll = THREE.MathUtils.clamp(-this.yawRate * 0.36, -0.55, 0.55);
      // Boden & Decke
      const minY = height(this.pos.x, this.pos.z) + 0.9;
      if (this.pos.y < minY && !this.landed && !(climb < -0.3)) {
        this.pos.y += (minY - this.pos.y) * Math.min(1, dt * 10);
        if (this.pitch < 0.1) this.pitch += (0.1 - this.pitch) * Math.min(1, dt * 5);
      }
      if (this.pos.y < minY - 0.6 && !this.landing) this.pos.y = minY - 0.6;
      const ceil = Math.min(46, gh + 34);
      if (this.pos.y > ceil) { this.pos.y += (ceil - this.pos.y) * Math.min(1, dt * 2); if (this.pitch > 0) this.pitch *= 0.9; }
    }
    // Äußere Kräfte (Wind/Schubs), nicht im Landezustand
    if (!this.landed) {
      this.pos.addScaledVector(this.ext, dt);
      const gy = height(this.pos.x, this.pos.z) + 0.5;
      if (this.pos.y < gy && !this.landing) this.pos.y = gy;
    }
    this.ext.multiplyScalar(Math.exp(-dt * 2.2));
    // Grenzen: sanft zurücklenken
    const r = Math.hypot(this.pos.x, this.pos.z);
    this.outside = r > this.bounds;
    if (r > this.bounds && !this.landed) {
      const des = Math.atan2(-this.pos.x, -this.pos.z);
      let d = des - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yaw += d * Math.min(1, (r - this.bounds) / 18) * dt * 2.5;
      if (r > this.bounds + 22) { this.pos.x *= (this.bounds + 22) / r; this.pos.z *= (this.bounds + 22) / r; }
    }
    // Hindernisse (Baumkronen/Stämme) weich umfliegen
    if (!(this.landed && this.seatTilt)) for (const C of this.colliders) { // (sitzend auf der Blüte nicht schubsen)
      _w.subVectors(this.pos, C.c);
      if (C.cyl) _w.y = 0;
      const d = _w.length();
      if (d < C.r && (!C.cyl || (this.pos.y > C.c.y && this.pos.y < C.c.y + C.h))) {
        if (d < 1e-3) _w.set(1, 0, 0); else _w.multiplyScalar(1 / d);
        this.pos.addScaledVector(_w, C.r - d);
      }
    }
    // Visuals
    if (c) {
      const R = c.root;
      R.position.copy(this.pos);
      R.rotation.y = this.yaw;
      if (this.stunt && this.stunt.type === 'show') c.tilt.quaternion.copy(this.stunt.q);
      else if (this.landed && this.seatTilt) c.tilt.rotation.set(this.seatTilt[0], 0, this.seatTilt[1]);
      else {
      if (this.showReset || Math.abs(c.tilt.rotation.y) > 1e-6) { c.tilt.rotation.set(0, 0, 0); this.showReset = false; } // Einlage vorbei/abgebrochen: hart nullen
      c.tilt.rotation.x += (-visPitch - c.tilt.rotation.x) * (this.stunt ? 1 : Math.min(1, dt * 10));
      c.tilt.rotation.z += (visRoll - c.tilt.rotation.z) * (this.stunt ? 1 : Math.min(1, dt * 8));
      if (!this.stunt && Math.abs(c.tilt.rotation.x) > Math.PI) c.tilt.rotation.x = 0;
      if (!this.stunt && Math.abs(c.tilt.rotation.z) > Math.PI) c.tilt.rotation.z = 0;
      }
      c.update(dt, t, { speed01: THREE.MathUtils.clamp(this.speed / 10, 0, 1), landed: this.landed, climb: this.landed ? 0 : this.pitch, flapBoost: Math.max(0, climb), cheer: this.cheer });
    }
    this.updateShadow();
  }
  // Schatten unter der Figur; alpha = feste Deckkraft (Menü-Schaukasten), sonst nach Höhe
  updateShadow(alpha = null) {
    const sgh = height(this.pos.x, this.pos.z);
    const hh = Math.max(0, this.pos.y - sgh);
    if (KONTAKT_AN) {
      const S = G.uSunDir.value; _sd[0] = S.x; _sd[1] = S.y; _sd[2] = S.z;
      const k = kontaktParameter(_sd, hh, 1);
      const x = this.pos.x + k.x, z = this.pos.z + k.z;
      this.shadow.position.set(x, Math.max(height(x, z) + 0.05, -0.0) + 0.03, z);
      this.shadow.rotation.y = k.yaw;
      this.shadow.scale.set(k.breite * 0.9, 1, k.laenge * 0.9);
      this.shadow.material.uniforms.uOpacity.value = alpha ?? k.alpha;
      return;
    }
    this.shadow.position.set(this.pos.x, Math.max(sgh + 0.05, -0.0) + 0.03, this.pos.z);
    const ss = THREE.MathUtils.clamp(1.1 - hh * 0.03, 0.35, 1.1);
    this.shadow.scale.set(ss, ss, 1);
    this.shadow.material.opacity = alpha ?? THREE.MathUtils.clamp(0.4 - hh * 0.012, 0.05, 0.4);
  }
  land(spot) {
    this.landed = true; this.landSpot = spot; this.landing = null; this.landT = 0;
    this.pitch = 0; this.yawRate = 0; this.ext.set(0, 0, 0);
    // Sitz-Übergang (Blüte): Start = jetzige Lage/Blickrichtung/Neigung
    this.seatK = 0; this.seatFrom = (this.seatFrom || new THREE.Vector3()).copy(this.pos); this.seatYaw0 = this.yaw; this.seatOrbit = null;
    const tr = this.critter ? this.critter.tilt.rotation : null;
    this.tiltFrom = tr ? [Math.abs(tr.x) < Math.PI ? tr.x : 0, Math.abs(tr.z) < Math.PI ? tr.z : 0] : [0, 0];
    this.seatTilt = spot && spot.seatPose ? [this.tiltFrom[0], this.tiltFrom[1]] : null;
    this.critter && this.critter.bump(-4);
    this.emit('land', spot);
  }
  takeoff() {
    this.landed = false; const s = this.landSpot; this.landSpot = null; this.pitch = 0.4; this.pos.y += 0.35; this.speed = this.baseSpeed * 0.7;
    this.airT = 0; this.seatTilt = null; this.seatOrbit = null;
    this.critter && this.critter.bump(5);
    this.emit('takeoff', s);
  }
  // v2.5.1 Fangbereich (m, waagrecht): Grundradius × Faktor, mit der Figurgröße (Riese mehr, Winzling etwas weniger)
  catchR(L) { return (L.r || 2.6) * (this.landK || 1) * (0.8 + 0.2 * ((this.critter && this.critter.size) || 1)); }
  // Grundfläche der Blüte (m): darunter wird nicht eingefangen
  footR(L) { const S = L.seat, k = (this.critter && this.critter.size) || 1; return (S ? (S.kind === 'lily' ? S.s : 1.1 * S.s) : 1) + 0.6 * k; }
  overWater() { const P0 = pond(); return P0[2] > 1 && Math.hypot(this.pos.x - P0[0], this.pos.z - P0[1]) < P0[2] * 1.05; }
  seatHover() { return 0.25 + 0.35 * ((this.critter && this.critter.size) || 1); } // Schwebe-Abstand über dem Sitz (m)
  // Kamera-Winkel beim Sitzen: erst der gewohnte (2,2 rad, Gesicht zeigen), sonst der nächste freie
  pickSeatOrbit(obs, portrait) {
    const d = (portrait ? 6.4 : 4.7) * 0.72, hy = (portrait ? 2.3 : 1.6) - 0.7, fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    const T = _gc.copy(this.pos); T.y += 0.15;
    let best = 2.2, bs = -1e9;
    for (const o of [2.2, 1.8, 2.6, -2.2, 1.4, 3.0, -1.8, 1.0, -2.6, 0.6, -1.2, 0.2]) {
      const ca = Math.cos(o), sa = Math.sin(o), bx = -fx * ca + fz * sa, bz = -fz * ca - fx * sa;
      _v.set(this.pos.x + bx * d, this.pos.y + hy, this.pos.z + bz * d);
      let clr = 1e9;
      for (const q of obs) {
        clr = Math.min(clr, _v.distanceTo(q.c) - q.r);
        if (!q.own) { // Sichtlinie Kamera → Figur
          _w.subVectors(T, _v); const L2 = _w.lengthSq(), k = THREE.MathUtils.clamp(_f.subVectors(q.c, _v).dot(_w) / L2, 0, 1);
          clr = Math.min(clr, _f.copy(_v).addScaledVector(_w, k).distanceTo(q.c) - q.r);
        }
      }
      const sc = clr >= 0.45 ? 100 - Math.abs(o - 2.2) : clr;
      if (sc > bs) { bs = sc; best = o; }
    }
    return best;
  }
  kick(fov = 4, shake = 0.15) { this.fovKick = Math.max(this.fovKick, fov); this.shakeT = Math.max(this.shakeT, shake); }

  updateCamera(cam, dt, t) {
    const aspect = cam.aspect; this.camAspect = aspect;
    const portrait = aspect < 1;
    const dist = portrait ? 6.4 : 4.7, hgt = portrait ? 2.3 : 1.6;
    _f.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    // gelandet: Kamera schwenkt langsam nach vorn (Gesicht zeigen)
    // Sieger-Looping: Kamera schwenkt zur Seite (Kreis gut sichtbar), danach weiter nach vorn zum Jubel
    const grand = this.stunt && this.stunt.grand ? this.stunt : null;
    // 🎪 Einlagen mit Loopings: Kamera etwas seitlich (Kreis als Ellipse sichtbar), vor dem Ende zurück
    const show = this.stunt && this.stunt.type === 'show' ? this.stunt : null;
    // v2.5 Sitzen auf Blüten: Orbit-Winkel so wählen, dass Kamera und Blick frei von Nachbar-Blumen/Baumkronen sind
    const obs = this.landed && this.landSpot && this.landSpot.camObs;
    if (obs && this.seatOrbit === null && this.seatK >= 1) this.seatOrbit = this.pickSeatOrbit(obs, portrait);
    const orbitT = this.hover ? 2.75 : this.landed ? (obs && this.seatOrbit !== null ? this.seatOrbit : 2.2) : grand ? Math.PI / 2 : show && show.p < 0.8 ? (show.def.cam || 0) : 0;
    if (grand) this.grandBlend = 0.7; else this.grandBlend = Math.max(0, (this.grandBlend || 0) - dt);
    this.orbit += (orbitT - this.orbit) * Math.min(1, dt * (this.landed || this.hover ? 0.9 : 3));
    if (grand) {
      // Sieger-Looping: Kamera steht seitlich am Kreis → der ganze Looping ist als Kreis zu sehen
      // Polar um den Kreismittelpunkt fahren (Winkel/Radius/Höhe getrennt) – ein Positions-Lerp würde die
      // Sehne schneiden und die Kamera mitten durch die Figur schicken.
      // Abstand so, dass der ganze Kreis (+20 % Rand) ins Bild passt; Blick fast fest auf die Kreismitte
      const portrait = cam.aspect < 1, D = Math.max(7, grand.R * (portrait ? 2.4 : 2.1));
      const side = grand.camSide || grand.side;
      // Sieger-Einlagen (v2.4): Kreismitte wandert zu 50 % mit der Figur – seitliche Bahnen bleiben im schmalen Hochformat drin
      const C = grand.camSide ? _gc.copy(grand.c).lerp(this.pos, 0.5) : grand.c;
      if (!this.camInit) { this.camPos.copy(C).addScaledVector(side, D); this.camLook.copy(C); this.camInit = true; }
      if (!grand.cam) {
        const dx = this.camPos.x - C.x, dz = this.camPos.z - C.z;
        grand.cam = { a: Math.atan2(dx, dz), r: Math.max(3, Math.hypot(dx, dz)), y: this.camPos.y - C.y };
      }
      const K = grand.cam, k = 1 - Math.exp(-dt * 3.4);
      let da = Math.atan2(side.x, side.z) - K.a; da = Math.atan2(Math.sin(da), Math.cos(da));
      K.a += da * k; K.r += (D - K.r) * k; K.y += (0.9 - K.y) * k;
      this.camPos.set(C.x + Math.sin(K.a) * K.r, C.y + K.y, C.z + Math.cos(K.a) * K.r);
      const g2 = height(this.camPos.x, this.camPos.z) + 0.8; if (this.camPos.y < g2) this.camPos.y = g2;
      _w.copy(C).lerp(this.pos, grand.camSide ? 0.4 : 0.2);
      this.camLook.lerp(_w, 1 - Math.exp(-dt * 6));
      cam.position.copy(this.camPos);
      cam.lookAt(this.camLook);
      this.fovKick = Math.max(0, this.fovKick - dt * 12);
      const base = portrait ? THREE.MathUtils.clamp(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(33)) / cam.aspect) * 180 / Math.PI, 60, 76) : 62;
      cam.fov += (base + this.fovKick - cam.fov) * Math.min(1, dt * 5);
      cam.updateProjectionMatrix();
      return;
    }
    const ca = Math.cos(this.orbit), sa = Math.sin(this.orbit);
    const bx = -_f.x * ca + _f.z * sa, bz = -_f.z * ca - _f.x * sa;
    const d = this.landed || this.hover ? dist * 0.72 : dist;
    const pitchLift = this.stunt ? (show ? 0.7 : 1.2) : THREE.MathUtils.clamp(-this.pitch * 2.2, -1.0, 2.0);
    const A = this.stunt && this.stunt.anchor ? this.stunt.anchor : this.pos; // Zufalls-Einlage: Kamera folgt der Fluglinie
    _v.set(A.x + bx * d, A.y + hgt + pitchLift - (this.landed || this.hover ? 0.7 : 0), A.z + bz * d);
    const g = height(_v.x, _v.z) + 0.8;
    if (_v.y < g) _v.y = g;
    if (!this.camInit) { this.camPos.copy(_v); this.camLook.copy(this.pos); this.camInit = true; }
    // im Orbit (gelandet/Jubel) direkt auf dem Kreis bleiben – nie durch die Figur schneiden
    const orbiting = this.orbit > 0.05;
    this.camPos.lerp(_v, 1 - Math.exp(-dt * (this.grandBlend > 0 ? 3.5 : orbiting ? 14 : this.stunt ? (show ? 5 : 3.2) : 5.5)));
    if (obs) for (const o of obs) { // nie in Blütenblätter/Kronen: aus der Hülle schieben
      _w.subVectors(this.camPos, o.c); const d = _w.length(), R = o.r + 0.4;
      if (d < R) this.camPos.copy(o.c).addScaledVector(d > 1e-4 ? _w.multiplyScalar(1 / d) : _w.set(0, 1, 0), R);
    }
    _w.copy(this.pos).addScaledVector(_f, this.landed || this.hover ? 0 : 2.4); _w.y += this.landed || this.hover ? 0.15 : 0.45;
    this.camLook.lerp(_w, 1 - Math.exp(-dt * 9));
    cam.position.copy(this.camPos);
    if (this.shakeT > 0) {
      this.shakeT -= dt; const k = RM ? 0 : this.shakeT * 0.5; // v2.8: prefers-reduced-motion → kein Ruckeln
      cam.position.x += Math.sin(t * 61) * k; cam.position.y += Math.sin(t * 47 + 1) * k;
    }
    cam.lookAt(this.camLook);
    // FOV: Seitenverhältnis + Tempo + Kick
    const base = portrait ? THREE.MathUtils.clamp(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(33)) / aspect) * 180 / Math.PI, 60, 76) : 62;
    this.fovKick = Math.max(0, this.fovKick - dt * 12);
    const fov = base + (this.stunt ? (show ? 3 : 7) : 0) + this.fovKick + (this.speed - this.baseSpeed) * 0.6;
    cam.fov += (fov - cam.fov) * Math.min(1, dt * 5);
    cam.updateProjectionMatrix();
  }
}
