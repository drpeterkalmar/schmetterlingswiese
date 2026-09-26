// Welt-Aufbau: Palette/Licht setzen und Umgebung erzeugen
import * as THREE from 'three';
import { G, skyMat } from '../engine/gfx.js';
import { rng, hashStr } from '../engine/geo.js';
import { setTerrain, buildTerrain, buildFar, height, pond } from './terrain.js';
import * as N from './nature.js';
import { Ambient } from './particles.js';

export class World {
  constructor(scene) {
    this.scene = scene;
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), skyMat());
    this.sky.frustumCulled = false; this.sky.renderOrder = -2;
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
  }

  build(w, quality, seedStr = w.id) {
    this.dispose();
    this.def = w;
    setTerrain(w.terrain);
    this.applyPalette(w);
    const rnd = rng(hashStr(seedStr));
    const g = this.group = new THREE.Group();
    this.terrain = buildTerrain(w); g.add(this.terrain);
    this.far = buildFar(w, hashStr(w.id)); g.add(this.far);
    this.grass = N.buildGrass(quality.grassMax, 64, rng(99)); g.add(this.grass);
    this.grass.userData.setCount(quality.grass);
    const P0 = pond();
    const avoidPond = P0[2] > 1 ? (x, z) => Math.hypot(x - P0[0], z - P0[1]) < P0[2] * 1.35 : null;
    const sfC = w.sunflowers ? { x: 0, z: 0, R: 62 } : null;
    const avoid = (x, z) => (avoidPond && avoidPond(x, z)) || (sfC && Math.hypot(x - sfC.x, z - sfC.z) < sfC.R + 4) || Math.hypot(x, z) < 10;
    this.flowers = N.buildFlowers(w, rnd, Math.round(w.flowerN * quality.deco)); g.add(this.flowers);
    this.trees = N.buildTrees(w, rnd, avoid); g.add(this.trees);
    this.bushes = N.buildBushes(w, rnd, 24, avoid); g.add(this.bushes);
    // Pilze nie in/auf Blumen (sah im Vordergrund wie schwebende Deko aus)
    g.add(N.buildMushrooms(rnd, 40, (x, z) => (avoidPond && avoidPond(x, z)) || this.flowers.userData.near(x, z, 1.8)));
    g.add(N.buildRocks(w, rnd, 22));
    if (w.sunflowers) { this.sunflowers = N.buildSunflowers(rnd, Math.round(w.sunflowers * quality.deco), sfC.x, sfC.z, sfC.R); g.add(this.sunflowers); }
    else this.sunflowers = null;
    if (w.terrain.pond) { this.pond = N.buildPondStuff(rnd, w.pads || 30); g.add(this.pond); } else this.pond = null;
    this.clouds = N.buildClouds(w, rnd, w.cloudN); g.add(this.clouds);
    this.ambient = new Ambient(w.particles, quality.particles); g.add(this.ambient.points);
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
    }
    if (this.clouds) this.clouds.userData.update(dt);
    if (this.ambient) this.ambient.update(dt, focus);
  }

  setQuality(q) {
    if (this.grass) this.grass.userData.setCount(q.grass);
    if (this.ambient) this.ambient.setCount(q.particles);
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
