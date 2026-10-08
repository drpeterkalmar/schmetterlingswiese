// E2 (v2.9): Anschluss der Grafikstufen an den Kern-Autopiloten (js/engine/qualitaet.js) an einem simulierten Gerät.
// Prüft: Reihenfolge Renderskala → Deko → Stufe, maxTier (gesenkte Stufe kommt nicht wieder), Aufstieg Mittel → Hoch
// bei Luft, gescheiterter Aufstieg wird nicht wiederholt (keine Pendelei), Deko nach Stufenwechsel wieder voll,
// Render-Target-Größe, Endbild-Shader enthält das Hochskalieren.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { erzeugeAutopilot, dekoFaktor, SKALA } from '../../js/engine/qualitaet.js';
import { rtGroesse, KANTEN_SR } from '../../js/engine/kern/hochskalieren.js';

// Gerät: GPU = (fest + pix · Skala² · Stufenpixel) · Last + Deko; CPU fest. Bildabstand = max(Takt, Arbeit) (Vsync 60 Hz).
const STUFE_PIX = [1, 2.25, 4 * 1.3]; // DPR 1 / 1,5 / 2 (Hoch mit MSAA 4)
const STUFE_FEST = [0, 0, 6];          // Hoch: Tiefenschärfe, MSAA-Auflösen (skaliert nicht mit der Renderskala)
function lauf(o, sek, last = () => 1) {
  const G = { fest: 1.5, pix: 3, deko: 1.2, cpu: 3, ...o.geraet };
  const st = { skala: 1, deko: 1, stufe: o.stufe ?? 1, wechsel: [] };
  const ap = erzeugeAutopilot({
    stufe: st.stufe, maxStufe: o.maxStufe ?? 2, skala: o.skala,
    setzeSkala: (s) => { st.skala = s; }, setzeDeko: (s) => { st.deko = s; },
    setzeStufe: (t) => { st.wechsel.push({ t: +ap.t.toFixed(1), von: st.stufe, nach: t }); st.stufe = t; },
  });
  const spur = [];
  let t = 0;
  while (t < sek) {
    const gpu = (G.fest + STUFE_FEST[st.stufe] + G.pix * st.skala * st.skala * STUFE_PIX[st.stufe]) * last(t) + (st.deko ? G.deko : 0);
    const arbeit = Math.max(gpu, G.cpu);
    const abstand = Math.max(1000 / 60, arbeit) / 1000;
    ap.bild(abstand, G.cpu, gpu);
    t += abstand;
    spur.push({ t, skala: st.skala, deko: st.deko, stufe: st.stufe });
  }
  return { ap, st, spur };
}

test('leichtes Gerät, Start Mittel (Handy): volle Skala, steigt auf Hoch', () => {
  const { st, ap } = lauf({ stufe: 1, geraet: { pix: 1.2, deko: 0.3 } }, 40);
  assert.equal(st.stufe, 2, JSON.stringify(ap.log));
  assert.ok(st.skala >= SKALA[2][0] && st.skala <= 1);
  assert.equal(st.deko, 1);
});

test('schwere Last: erst Skala, dann Deko, dann Stufe; danach Deko wieder voll und Stufe kommt nicht wieder (maxTier)', () => {
  // ab t = 2 s schwere Last, ab 40 s wieder leicht
  const { st, ap } = lauf({ stufe: 2, geraet: { pix: 3 } }, 90, (t) => (t > 2 && t < 40 ? 3.2 : 1));
  const was = ap.log.filter((e) => e.richtung < 0).map((e) => e.was);
  const iSkala = was.indexOf('skala'), iDeko = was.indexOf('deko'), iStufe = was.indexOf('stufe');
  assert.ok(iSkala >= 0 && iDeko > iSkala && iStufe > iDeko, 'Reihenfolge: ' + was.join(','));
  assert.ok(st.wechsel.length >= 1 && st.wechsel[0].nach === 1, JSON.stringify(st.wechsel));
  assert.ok(st.wechsel.every((w) => w.nach < w.von), 'nie wieder hoch: ' + JSON.stringify(st.wechsel));
  assert.ok(ap.maxStufe <= 1);
  assert.equal(st.deko, 1, 'Deko nach Stufenwechsel wieder voll');
  assert.equal(dekoFaktor(ap), 1);
});

test('Skala sinkt stufenlos (nicht in 0,25-Sprüngen) und bleibt im Bereich der Stufe', () => {
  const { spur } = lauf({ stufe: 1, maxStufe: 1, geraet: { pix: 7, deko: 0.2 } }, 30);
  const sk = [...new Set(spur.map((s) => s.skala))];
  assert.ok(sk.length >= 2, 'hat geregelt');
  for (const s of sk) assert.ok(s >= SKALA[1][0] - 1e-9 && s <= 1, s);
  assert.ok(sk.some((s) => Math.abs(s * 4 - Math.round(s * 4)) > 0.01), 'Zwischenwerte: ' + sk.join(','));
});

test('Aufstieg auf Hoch scheitert → zurück auf Mittel, kein zweiter Versuch (keine Pendelei)', () => {
  // Mittel passt knapp, Hoch ist zu teuer; ohne GPU-Zeit regelt er nach Bildrate (Probe)
  const G = { fest: 2, pix: 5, deko: 0.6, cpu: 3 };
  const st = { skala: 1, deko: 1, stufe: 1, wechsel: [] };
  const ap = erzeugeAutopilot({ stufe: 1, maxStufe: 2, setzeSkala: (s) => { st.skala = s; }, setzeDeko: (s) => { st.deko = s; },
    setzeStufe: (t) => { st.wechsel.push(t); st.stufe = t; } });
  for (let t = 0; t < 180;) {
    const gpu = G.fest + STUFE_FEST[st.stufe] + G.pix * st.skala * st.skala * STUFE_PIX[st.stufe] + (st.deko ? G.deko : 0);
    const ab = Math.max(1000 / 60, gpu, G.cpu) / 1000;
    ap.bild(ab, G.cpu, null); // ohne GPU-Zeit
    t += ab;
  }
  const rauf = st.wechsel.filter((x) => x === 2).length;
  assert.ok(rauf <= 1, 'höchstens ein Versuch: ' + JSON.stringify(st.wechsel));
  assert.equal(rauf, 1, 'Probe nach oben fand statt (ohne GPU-Zeit)');
  if (rauf) assert.ok(ap.maxStufe === 1 && st.stufe === 1, JSON.stringify({ w: st.wechsel, max: ap.maxStufe }));
});

test('Deko-Faktor 0,5 solange der Autopilot die Deko abgeschaltet hat', () => {
  const ap = erzeugeAutopilot({ stufe: 1, maxStufe: 1 });
  assert.equal(dekoFaktor(ap), 1);
  ap.ding('deko').stufe = 0;
  assert.equal(dekoFaktor(ap), 0.5);
  assert.equal(dekoFaktor(null), 1);
});

test('Render-Target-Größe aus Zeichenpuffer × Renderskala', () => {
  assert.deepEqual(rtGroesse(618, 1373, 1), [618, 1373]);
  assert.deepEqual(rtGroesse(618, 1373, 0.6), [371, 824]);
  assert.deepEqual(rtGroesse(10, 10, 0), [10, 10]); // ungültig → 1
  assert.deepEqual(rtGroesse(1, 1, 0.3), [1, 1]);
});

test('Endbild: Hochskalierer mit Kantenglättung/Schärfen, in die Composite-Stufe eingebunden', async () => {
  assert.match(KANTEN_SR, /vec3 kantenSR\(sampler2D tex, vec2 uv\)/);
  assert.match(KANTEN_SR, /#ifdef AA/); assert.match(KANTEN_SR, /#ifdef SHARP/);
  const THREE = await import('three');
  const { Post } = await import('../../js/engine/gfx.js');
  // Post ohne WebGL: nur die Materialien prüfen (Attrappe des Renderers)
  const fake = { getContext: () => ({}), extensions: { has: () => true }, capabilities: { isWebGL2: true } };
  const P = new Post(fake);
  assert.match(P.mComp.fragmentShader, /vec3 c = kantenSR\(tCol, vUv\);/);
  P.endbild({ aa: true, sharp: 0.4 });
  assert.deepEqual(Object.keys(P.mComp.defines).sort(), ['AA', 'SHARP']);
  assert.equal(P.mComp.uniforms.uSharp.value, 0.4);
  P.endbild(null);
  assert.deepEqual(Object.keys(P.mComp.defines), []);
  assert.ok(P.mComp.uniforms.uSrcTexel.value instanceof THREE.Vector2);
});
