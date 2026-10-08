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
import { RINGE, RING_ANZAHL, RING_MAX, RING_VOR, wickelMitte } from './grasringe.js';
import { himmelsLicht } from '../engine/himmelslicht.js';
import { backeBaumschatten, KONTAKT_AN } from '../engine/schatten.js';
// v2.9 Stärke der gebackenen Baumschatten (nachts halb). TODO Heavy-Job am Bild abstimmen.
export const BAUM_STAERKE = 0.32;
// v2.9 weiches Himmelslicht (SH9 aus dem Welthimmel), ?himmel=0 = feste Halbkugel wie bis v2.8.
// Anteil gegenüber der alten Halbkugel: TODO Heavy-Job am Bild abstimmen (Startwert 0,7; 1 = nur Himmelslicht)
export const HIMMEL_AN = new URLSearchParams(location.search).get('himmel') !== '0';
export const HIMMEL_ANTEIL = 0.7;
const rgb = (c) => [c.r, c.g, c.b];
// v2.9 Gras in Ringen mit Kachel-Culling (?ringe=0 = ein Feld wie bis v2.8)
export const RINGE_AN = new URLSearchParams(location.search).get('ringe') !== '0';
const _fr = new THREE.Frustum(), _pm = new THREE.Matrix4();
const ebenenAus = (fr) => fr.planes.map((p) => [p.normal.x, p.normal.y, p.normal.z, p.constant]);

export class World {
  constructor(scene) {
    this.scene = scene;
    // v2.8 Deko: feinere Kugel (Milchstraße je Eckpunkt) und Himmel NACH der Landschaft zeichnen → verdeckte Himmelspixel
    // fallen beim Tiefentest weg (vorher wurde der ganze Bildschirm erst mit Himmel gefüllt)
    this.skyLo = new THREE.SphereGeometry(900, 32, 16); this.skyHi = DEKO ? new THREE.SphereGeometry(900, 96, 48) : this.skyLo;
    this.sky = new THREE.Mesh(this.skyHi, skyMat());
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
    this.himmelsLicht(w);
  }
  // v2.9: Baumschatten als Bodentextur backen (Gelände + Gras lesen sie; ?kontakt=0 = keine)
  baumSchatten(w) {
    if (this.baumTex) { this.baumTex.dispose(); this.baumTex = null; }
    G.uBaumShP.value.y = 0; G.uBaumSh.value = null;
    if (!KONTAKT_AN || !this.trees) return;
    const S = G.uSunDir.value;
    const { daten, N, W } = backeBaumschatten(Object.values(this.trees.userData).flat(), [S.x, S.y, S.z]);
    const tex = new THREE.DataTexture(daten, N, N, THREE.RedFormat, THREE.UnsignedByteType);
    tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false; tex.needsUpdate = true;
    this.baumTex = tex; G.uBaumSh.value = tex;
    G.uBaumShP.value.set(W, BAUM_STAERKE * (w.sky.stars ? 0.5 : 1), 0, 0);
  }
  // v2.9: Umgebungslicht aus dem Himmel dieser Welt (einmal je Welt, ≈ 1 200 Proben)
  himmelsLicht(w) {
    G.uHimmel.value = HIMMEL_AN ? HIMMEL_ANTEIL : 0;
    if (!HIMMEL_AN) return;
    const boden = [0, 0, 0];
    for (const h of w.ground) { _c.set(h); boden[0] += _c.r / w.ground.length; boden[1] += _c.g / w.ground.length; boden[2] += _c.b / w.ground.length; }
    const S = G.uSunDir.value;
    const sh = himmelsLicht({
      zenit: rgb(_c.set(w.sky.zenith)), horizont: rgb(_c.set(w.sky.horizon)), glow: rgb(_c.set(w.sky.glow)),
      sonne: [S.x, S.y, S.z], sonnenFarbe: rgb(G.uSunCol.value), boden,
      alt: { himmel: rgb(G.uSkyAmb.value), boden: rgb(G.uGndAmb.value) },
    });
    sh.forEach((c, i) => G.uSH.value[i].set(c[0], c[1], c[2]));
    this.sh = sh;
  }

  build(w, quality, seedStr = w.id) {
    this.dispose();
    this.def = w;
    setTerrain(w.terrain);
    setPatch(w.patch);
    this.applyPalette(w);
    const rnd = rng(hashStr(seedStr));
    const g = this.group = new THREE.Group();
    this.terrain = buildTerrain(w, { ringe: RINGE_AN }); g.add(this.terrain);
    this.far = buildFar(w, hashStr(w.id)); g.add(this.far);
    if (RINGE_AN) {
      // v2.9: Nahring (volle Halme, dicht) + Mittelring (halbe Dichte, breiter); fern nur Grasrauschen im Gelände
      this.grass = null;
      this.ringe = [N.buildGrassRing(RINGE.nah, RING_MAX[0], rng(99)), N.buildGrassRing(RINGE.mitte, RING_MAX[1], rng(98))];
      this.ringe.forEach((m, i) => { g.add(m); m.userData.setCount(RING_ANZAHL[quality.id][i]); });
      this.grassC = new THREE.Vector3(); // Feldmitte wie bisher (Wiesenblüten der Deko folgen ihr)
    } else {
      this.ringe = null;
      this.grass = N.buildGrass(quality.grassMax, 64, rng(99)); g.add(this.grass);
      this.grass.userData.setCount(quality.grass);
    }
    // v2.8: Wiesenblüten, Lichtstrahlen, Schirmchen (nur mit Deko; Stückzahl je Qualitätsstufe)
    this.deko = DEKO ? new Deko(w, quality, quality.dekoK ?? 1) : null;
    if (this.deko) g.add(this.deko.group);
    G.uDq.value = DEKO && quality.id > 0 ? (quality.dekoK ?? 1) : 0;
    this.skyQ(quality);
    const P0 = pond();
    const avoidPond = P0[2] > 1 ? (x, z) => Math.hypot(x - P0[0], z - P0[1]) < P0[2] * 1.35 : null;
    const sfC = w.sunflowers ? { x: 0, z: 0, R: 62 } : null;
    const avoid = (x, z) => (avoidPond && avoidPond(x, z)) || (sfC && Math.hypot(x - sfC.x, z - sfC.z) < sfC.R + 4) || Math.hypot(x, z) < 10;
    this.flowers = N.buildFlowers(w, rnd, Math.round(w.flowerN * quality.deco)); g.add(this.flowers);
    this.trees = N.buildTrees(w, rnd, avoid); g.add(this.trees);
    this.baumSchatten(w);
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
    } else if (this.ringe) {
      // v2.9: Ringmitte näher an der Figur (Kamera liegt im Nahring), Kacheln gegen den Sichtkegel prüfen
      const dx = focus.x - cam.position.x, dz = focus.z - cam.position.z, l = Math.hypot(dx, dz) || 1;
      const rc = G.uRingC.value.set(focus.x + dx / l * RING_VOR, focus.y, focus.z + dz / l * RING_VOR);
      cam.updateMatrixWorld();
      _fr.setFromProjectionMatrix(_pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
      const eb = ebenenAus(_fr), c2 = [rc.x, rc.z];
      for (const m of this.ringe) {
        const u = m.material.uniforms, R = m.userData.ring;
        u.uCenter.value.copy(rc); u.uWrapC.value.set(wickelMitte(rc.x, R), 0, wickelMitte(rc.z, R));
        m.userData.cull(c2, eb);
      }
      this.grassC.set(focus.x + dx / l * 9, focus.y, focus.z + dz / l * 9);
      if (this.deko) this.deko.update(dt, cam, focus, this.grassC);
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
    if (this.ringe) this.ringe.forEach((m, i) => m.userData.setCount(RING_ANZAHL[q.id][i]));
    if (this.ambient) this.ambient.setCount(q.particles);
    if (this.deko) this.deko.setQuality(q, k);
    G.uDq.value = DEKO && q.id > 0 ? k : 0;
    this.skyQ(q);
  }
  // v2.8: Himmel auf Niedrig wie bisher (grobe Kugel, zuerst gezeichnet), sonst feine Kugel und nach der Landschaft
  skyQ(q) {
    const hi = DEKO && q.id > 0;
    this.sky.geometry = hi ? this.skyHi : this.skyLo; this.sky.renderOrder = hi ? 2 : -2;
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
