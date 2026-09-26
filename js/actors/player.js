// Spieler: Flugmodell (echte Loopings), Landen, Kamera mit Kicks
import * as THREE from 'three';
import { Critter } from './characters.js';
import { height } from '../world/terrain.js';
import { blobTex } from '../engine/textures.js';

const TAU = Math.PI * 2;
const ease = (p) => 0.5 - 0.5 * Math.cos(Math.PI * p);
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _f = new THREE.Vector3();

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
    // Blob-Schatten
    const sm = new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false, color: 0x1a2a10, opacity: 0.35 });
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.9, 20), sm);
    this.shadow.rotation.x = -Math.PI / 2; this.shadow.renderOrder = 1;
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
    this.landed = false; this.landSpot = null; this.landing = null; this.stunt = null; this.wetT = 0; this.dizzyT = 0; this.carry = null;
    this.camInit = false; this.orbit = 0; this.hover = false; this.cheer = false;
  }
  emit(ev, a) { const f = this.on[ev]; if (f) f(a); }
  tryStunt(type) {
    if (this.landed && !this.frozen) { this.takeoff(); return false; }
    if (this.stunt || this.frozen) return false;
    const dur = type === 'loop' ? 1.35 : 1.0;
    this.stunt = { type, t: 0, dur, dir: this.yawRate > 0.2 ? -1 : 1 };
    if (type === 'loop') this.pos.y = Math.max(this.pos.y, height(this.pos.x, this.pos.z) + 1.6);
    this.emit('stunt', type);
    return true;
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

    if (this.hover) {
      this.pitch *= Math.max(0, 1 - dt * 4); this.yawRate *= Math.max(0, 1 - dt * 4);
      this.pos.y += (Math.max(this.pos.y, gh + 1.6) - this.pos.y) * Math.min(1, dt * 3);
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
    } else if (this.stunt) {
      const S = this.stunt;
      S.t += dt;
      const p = Math.min(1, S.t / S.dur), e = ease(p);
      this.yawRate *= Math.max(0, 1 - dt * 4);
      this.yaw += this.yawRate * dt;
      const sp = this.baseSpeed * 1.15;
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
      // Landeanflug: runter halten nahe Landeplatz/Boden
      this.landing = null;
      if (climb < -0.3) {
        let best = null, bd = 1e9;
        for (const L of this.landables) {
          if (L.done) continue;
          const dx = L.pos.x - this.pos.x, dz = L.pos.z - this.pos.z, dh = Math.hypot(dx, dz);
          if (dh < (L.r || 2.6) && this.pos.y - L.pos.y < 6 && dh < bd) { bd = dh; best = L; }
        }
        if (best) {
          this.landing = best;
          // sanft in den Landeplatz gleiten (fast schweben)
          this.pos.x += (best.pos.x - this.pos.x) * Math.min(1, dt * 4.5);
          this.pos.z += (best.pos.z - this.pos.z) * Math.min(1, dt * 4.5);
          this.pos.y += (best.pos.y - this.pos.y) * Math.min(1, dt * 3.4);
          const want = Math.atan2(best.pos.x - this.pos.x, best.pos.z - this.pos.z);
          if (bd > 0.4) { let dd = want - this.yaw; dd = Math.atan2(Math.sin(dd), Math.cos(dd)); this.yaw += dd * Math.min(1, dt * 3); }
          tp = -0.15;
          if (Math.abs(this.pos.y - best.pos.y) < 0.4 && bd < 1.4) this.land(best);
        } else if (alt < 1.3) {
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
    for (const C of this.colliders) {
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
      c.tilt.rotation.x += (-visPitch - c.tilt.rotation.x) * (this.stunt ? 1 : Math.min(1, dt * 10));
      c.tilt.rotation.z += (visRoll - c.tilt.rotation.z) * (this.stunt ? 1 : Math.min(1, dt * 8));
      if (!this.stunt && Math.abs(c.tilt.rotation.x) > Math.PI) c.tilt.rotation.x = 0;
      if (!this.stunt && Math.abs(c.tilt.rotation.z) > Math.PI) c.tilt.rotation.z = 0;
      c.update(dt, t, { speed01: THREE.MathUtils.clamp(this.speed / 10, 0, 1), landed: this.landed, climb: this.landed ? 0 : this.pitch, flapBoost: Math.max(0, climb), cheer: this.cheer });
    }
    // Schatten
    const sgh = height(this.pos.x, this.pos.z);
    const hh = Math.max(0, this.pos.y - sgh);
    this.shadow.position.set(this.pos.x, Math.max(sgh + 0.05, -0.0) + 0.03, this.pos.z);
    const ss = THREE.MathUtils.clamp(1.1 - hh * 0.03, 0.35, 1.1);
    this.shadow.scale.set(ss, ss, 1);
    this.shadow.material.opacity = THREE.MathUtils.clamp(0.4 - hh * 0.012, 0.05, 0.4);
  }
  land(spot) {
    this.landed = true; this.landSpot = spot; this.landing = null; this.landT = 0;
    this.pitch = 0; this.yawRate = 0; this.ext.set(0, 0, 0);
    this.critter && this.critter.bump(-4);
    this.emit('land', spot);
  }
  takeoff() {
    this.landed = false; const s = this.landSpot; this.landSpot = null; this.pitch = 0.4; this.pos.y += 0.35; this.speed = this.baseSpeed * 0.7;
    this.critter && this.critter.bump(5);
    this.emit('takeoff', s);
  }
  kick(fov = 4, shake = 0.15) { this.fovKick = Math.max(this.fovKick, fov); this.shakeT = Math.max(this.shakeT, shake); }

  updateCamera(cam, dt, t) {
    const aspect = cam.aspect;
    const portrait = aspect < 1;
    const dist = portrait ? 6.4 : 4.7, hgt = portrait ? 2.3 : 1.6;
    _f.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    // gelandet: Kamera schwenkt langsam nach vorn (Gesicht zeigen)
    const orbitT = this.hover ? 2.75 : this.landed ? 2.2 : 0;
    this.orbit += (orbitT - this.orbit) * Math.min(1, dt * (this.landed || this.hover ? 0.9 : 3));
    const ca = Math.cos(this.orbit), sa = Math.sin(this.orbit);
    const bx = -_f.x * ca + _f.z * sa, bz = -_f.z * ca - _f.x * sa;
    const d = this.landed || this.hover ? dist * 0.72 : dist;
    const pitchLift = this.stunt ? 1.2 : THREE.MathUtils.clamp(-this.pitch * 2.2, -1.0, 2.0);
    _v.set(this.pos.x + bx * d, this.pos.y + hgt + pitchLift - (this.landed || this.hover ? 0.7 : 0), this.pos.z + bz * d);
    const g = height(_v.x, _v.z) + 0.8;
    if (_v.y < g) _v.y = g;
    if (!this.camInit) { this.camPos.copy(_v); this.camLook.copy(this.pos); this.camInit = true; }
    // im Orbit (gelandet/Jubel) direkt auf dem Kreis bleiben – nie durch die Figur schneiden
    const orbiting = this.orbit > 0.05;
    this.camPos.lerp(_v, 1 - Math.exp(-dt * (orbiting ? 14 : this.stunt ? 3.2 : 5.5)));
    _w.copy(this.pos).addScaledVector(_f, this.landed || this.hover ? 0 : 2.4); _w.y += this.landed || this.hover ? 0.15 : 0.45;
    this.camLook.lerp(_w, 1 - Math.exp(-dt * 9));
    cam.position.copy(this.camPos);
    if (this.shakeT > 0) {
      this.shakeT -= dt; const k = this.shakeT * 0.5;
      cam.position.x += Math.sin(t * 61) * k; cam.position.y += Math.sin(t * 47 + 1) * k;
    }
    cam.lookAt(this.camLook);
    // FOV: Seitenverhältnis + Tempo + Kick
    const base = portrait ? THREE.MathUtils.clamp(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(33)) / aspect) * 180 / Math.PI, 60, 76) : 62;
    this.fovKick = Math.max(0, this.fovKick - dt * 12);
    const fov = base + (this.stunt ? 7 : 0) + this.fovKick + (this.speed - this.baseSpeed) * 0.6;
    cam.fov += (fov - cam.fov) * Math.min(1, dt * 5);
    cam.updateProjectionMatrix();
  }
}
