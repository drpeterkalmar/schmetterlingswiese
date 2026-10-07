// Welt-Aufbau: Palette/Licht setzen und Umgebung erzeugen
import * as THREE from 'three';
import { G, skyMat } from '../engine/gfx.js';
import { rng, hashStr } from '../engine/geo.js';
import { setTerrain, setPatch, patchAmt, buildTerrain, buildFar, height, pond } from './terrain.js';
import * as N from './nature.js';
const _c = new THREE.Color(), _v = new THREE.Vector3();
import { Ambient } from './particles.js';
import { Life } from './life.js';
import { Deko } from './deko.js';
import { DEKO } from '../engine/deko.js';

export class World {
  constructor(scene) {
    this.scene = scene;
    // v2.8 Deko: feinere Kugel (Milchstraße je Eckpunkt) und Himmel NACH der Landschaft zeichnen → verdeckte Himmelspixel
    // fallen beim Tiefentest weg (vorher wurde der ganze Bildschirm erst mit Himmel gefüllt)
    this.sky = new THREE.Mesh(DEKO ? new THREE.SphereGeometry(900, 96, 48) : new THREE.SphereGeometry(900, 32, 16), skyMat());
    this.sky.frustumCulled = false; this.sky.renderOrder = DEKO ? 2 : -2;
    scene.add(this.sky);
    this.group = null;
    this.grass = null;
    this.ambient = null;
  }

  applyPalette(w) {
    const el = w.sun.el, az = w.sun.az;
    G.uSunDir.value.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).normalize();
    G.uSunCol.value.set(w.sun.col).multiplyScalar(w.sun.k);
    G.uSkyAmb.value.set(w.amb.sky).multiplyScalar(w.amb.k);
    G.uGndAmb.value.set(w.amb.gnd).multiplyScalar(w.amb.k);
    G.uRim.value.set(w.rim);
    G.uFogCol.value.set(w.fog.col); G.uFogSun.value.set(w.fog.sun);
    G.uFog.value.set(w.fog.near, w.fog.far, 0, w.fog.max);
    G.uGrassA.value.set(w.grass[0]); G.uGrassB.value.set(w.grass[1]); G.uGrassC.value.set(w.grass[2]);
    G.uWind.value.set(w.wind[0], w.wind[1], 0);
    const su = this.sky.material.uniforms;
    su.uZenith.value.set(w.sky.zenith); su.uHorizon.value.set(w.sky.horizon);
    su.uGlow.value.set(w.sky.glow); su.uSunCol.value.set(w.sky.sunCol); su.uSunSize.value = w.sky.size;
    su.uStars.value = w.sky.stars || 0; su.uMoon.value = w.sky.moon || 0;
    if (w.sky.moon) su.uMoonDir.value.copy(G.uSunDir.value);
    G.uWaterY.value = w.terrain.pond ? 0 : -99;
    // v2.8 Deko: Nachtblüten glimmen, Wasser spiegelt den Himmel
    G.uNight.value = DEKO && w.sky.stars ? 1 : 0;
    G.uSkyZen.value.set(w.sky.zenith); G.uSkyHor.value.set(w.sky.horizon);
    // v2.3: Regenbogen, goldene Graslichter, Sternschnuppen
    su.uRainbow.value = w.sky.rainbow || 0; su.uShootT.value = -1;
    const gd = w.gold || [0xffffff, 0]; _c.set(gd[0]); G.uGold.value.set(_c.r, _c.g, _c.b, gd[1]);
  }

  build(w, quality, seedStr = w.id) {
    this.dispose();
    this.def = w;
    setTerrain(w.terrain);
    setPatch(w.patch);
    this.applyPalette(w);
    const rnd = rng(hashStr(seedStr));
    const g = this.group = new THREE.Group();
    this.terrain = buildTerrain(w); g.add(this.terrain);
    this.far = buildFar(w, hashStr(w.id)); g.add(this.far);
    this.grass = N.buildGrass(quality.grassMax, 64, rng(99)); g.add(this.grass);
    this.grass.userData.setCount(quality.grass);
    // v2.8: Wiesenblüten, Lichtstrahlen, Schirmchen (nur mit Deko; Stückzahl je Qualitätsstufe)
    this.deko = DEKO ? new Deko(w, quality, quality.dekoK ?? 1) : null;
    if (this.deko) g.add(this.deko.group);
    G.uDq.value = DEKO && quality.id > 0 ? (quality.dekoK ?? 1) : 0;
    const P0 = pond();
    const avoidPond = P0[2] > 1 ? (x, z) => Math.hypot(x - P0[0], z - P0[1]) < P0[2] * 1.35 : null;
    const sfC = w.sunflowers ? { x: 0, z: 0, R: 62 } : null;
    const avoid = (x, z) => (avoidPond && avoidPond(x, z)) || (sfC && Math.hypot(x - sfC.x, z - sfC.z) < sfC.R + 4) || Math.hypot(x, z) < 10;
    this.flowers = N.buildFlowers(w, rnd, Math.round(w.flowerN * quality.deco)); g.add(this.flowers);
    this.trees = N.buildTrees(w, rnd, avoid); g.add(this.trees);
    // v2.3: Blütenteppiche + Grasbüschel/Klee (Anzahl skaliert mit der Deko-Stufe)
    const avoidWater = (x, z) => (avoidPond && avoidPond(x, z)) || patchAmt(x, z) > 0.3;
    g.add(N.buildCarpet(w, rnd, Math.round(22 * quality.deco), avoidWater));
    g.add(N.buildTufts(w, rnd, Math.round(460 * quality.deco), avoidWater));
    this.bushes = N.buildBushes(w, rnd, 24, avoid); g.add(this.bushes);
    // Pilze nie in/auf Blumen (sah im Vordergrund wie schwebende Deko aus)
    g.add(N.buildMushrooms(rnd, 40, (x, z) => (avoidPond && avoidPond(x, z)) || this.flowers.userData.near(x, z, 1.8)));
    g.add(N.buildRocks(w, rnd, 22));
    if (w.sunflowers) { this.sunflowers = N.buildSunflowers(rnd, Math.round(w.sunflowers * quality.deco), sfC.x, sfC.z, sfC.R); g.add(this.sunflowers); }
    else this.sunflowers = null;
    if (w.terrain.pond) { this.pond = N.buildPondStuff(rnd, w.pads || 30); g.add(this.pond); } else this.pond = null;
    // v2.3: Bank am Teich bzw. Bank mit Laterne am Abend (freier Platz, Blick zur Mitte)
    this.benchPos = null;
    if (w.bench) {
      const trees = Object.values(this.trees.userData).flat();
      for (let k = 0; k < 40; k++) {
        const a = rnd() * 6.28, r = P0[2] > 1 ? P0[2] * 1.2 : 32 + rnd() * 16; // abseits der Startlinie (Start liegt nahe der Mitte)
        const x = (P0[2] > 1 ? P0[0] : 0) + Math.cos(a) * r, z = (P0[2] > 1 ? P0[1] : 0) + Math.sin(a) * r;
        if (trees.some(t => (t.x - x) ** 2 + (t.z - z) ** 2 < 49) || height(x, z) < 0.3) continue;
        g.add(N.buildBench(x, z, Math.atan2(-Math.cos(a), -Math.sin(a)), w.bench === 'lantern'));
        this.benchPos = new THREE.Vector3(x, height(x, z), z);
        break;
      }
    }
    this.clouds = N.buildClouds(w, rnd, w.cloudN); g.add(this.clouds);
    // v2.3: Wolkenschatten ziehen mit dem Wind über die Wiese (Shader-Flecken, kein Draw-Call)
    const wl = Math.hypot(w.wind[0], w.wind[1]) || 1;
    this.shadowWind = [w.wind[0] / wl * 2.2, w.wind[1] / wl * 2.2];
    this.shadows = G.uCloudSh.value.map((v, i) => { const a = rnd() * 6.28, r = rnd() * 110; return v.set(Math.cos(a) * r, Math.sin(a) * r, 16 + rnd() * 12, (w.cloudShadow ?? 0.3) * (0.8 + rnd() * 0.3)); });
    this.shootT = 8 + rnd() * 6; this.shoot = -1;
    this.ambient = new Ambient(w.particles, quality.particles); g.add(this.ambient.points);
    // v2.3: Wiesen-Leben (Vögel, Schwarm, Bienen, Marienkäfer, Häschen, Fisch, fallende Blätter)
    this.life = new Life(this, w, rnd, this.fx); g.add(this.life.group);
    this.scene.add(g);
    return this;
  }

  update(dt, cam, focus) {
    this.sky.position.copy(cam.position);
    this.far.position.set(cam.position.x * 0.6, 0, cam.position.z * 0.6);
    // Gras-Feld in Blickrichtung vorschieben (weniger Halme hinter der Kamera)
    if (this.grass) {
      const c = this.grass.material.uniforms.uCenter.value;
      const dx = focus.x - cam.position.x, dz = focus.z - cam.position.z, l = Math.hypot(dx, dz) || 1;
      c.set(focus.x + dx / l * 9, focus.y, focus.z + dz / l * 9);
      if (this.deko) this.deko.update(dt, cam, focus, c);
    }
    if (this.clouds) this.clouds.userData.update(dt);
    if (this.pond) this.pond.userData.update(dt, G.uTime.value);
    if (this.life) this.life.update(dt, G.uTime.value, focus, cam);
    if (this.ambient) this.ambient.update(dt, focus);
    if (this.shadows) for (const v of this.shadows) {
      v.x += this.shadowWind[0] * dt; v.y += this.shadowWind[1] * dt;
      if (v.x > 140) v.x -= 280; if (v.x < -140) v.x += 280; if (v.y > 140) v.y -= 280; if (v.y < -140) v.y += 280;
    }
    // Sternschnuppe am Abendhimmel: alle ~20 s, in Blickrichtung, 0,9 s lang
    if (this.def && this.def.sky.stars) {
      const su = this.sky.material.uniforms;
      if (this.shoot >= 0) { this.shoot += dt / 0.9; su.uShootT.value = this.shoot; if (this.shoot >= 1) { this.shoot = -1; su.uShootT.value = -1; } }
      else if ((this.shootT -= dt) <= 0) {
        this.shootT = 16 + Math.random() * 8; this.shoot = 0;
        cam.getWorldDirection(_v);
        const az = Math.atan2(_v.x, _v.z) + (Math.random() - 0.5) * 1.0, el = 0.4 + Math.random() * 0.3, dz = Math.random() < 0.5 ? -1 : 1;
        su.uShootA.value.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
        su.uShootB.value.set(Math.sin(az + dz * 0.4) * Math.cos(el - 0.22), Math.sin(el - 0.22), Math.cos(az + dz * 0.4) * Math.cos(el - 0.22));
        this.onShoot && this.onShoot();
      }
    }
  }

  setQuality(q, k = 1) {
    if (this.grass) this.grass.userData.setCount(q.grass);
    if (this.ambient) this.ambient.setCount(q.particles);
    if (this.deko) this.deko.setQuality(q, k);
    G.uDq.value = DEKO && q.id > 0 ? k : 0;
  }

  dispose() {
    if (!this.group) return;
    this.scene.remove(this.group);
    this.group.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => m.dispose()); }
    });
    this.group = null;
  }
}
export { height };
