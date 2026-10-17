// v3.1 Flugschule: reine Funktionen (js/game/flugschule.js) und das Flugmodell in Player.update ohne Browser.
// Messgrößen aus dem Vorlagen-Datenblatt, Abschnitt 5 (Nr. 1–3, 5, 6, 12).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as FS from '../../js/game/flugschule.js';

const dt = 1 / 60;
const { FLUG, tempoSchritt } = FS;
// Tempo-Modell allein: 10 s Vollausschlag (Nick-Lerp wie Player: Ziel climb·0,58, 4/s)
function verlauf(v0, climb, leicht = false, sek = 10) {
  let p = 0, v = v0, min = v, max = v;
  for (let i = 0; i < sek * 60; i++) { p += (climb * 0.58 - p) * Math.min(1, dt * 4); v = tempoSchritt(v, v0, p, dt, leicht); min = Math.min(min, v); max = Math.max(max, v); }
  return { v, min, max, p };
}

test('Schwung: voller Sturz +30…+40 % (Mittel), nie über +45 %; Dauer-Steigen nie unter 75 %', () => {
  const s = verlauf(7, -1), u = verlauf(7, 1);
  assert.ok(s.v / 7 > 1.30 && s.v / 7 < 1.40, 'Sturz-Gleichgewicht ' + s.v / 7);
  for (const v0 of [6.3, 7, 7.8]) {
    const a = verlauf(v0, -1, v0 < 6.5, 30), b = verlauf(v0, 1, v0 < 6.5, 30);
    assert.ok(a.max <= 1.45 * v0 + 1e-9, 'Deckel'); assert.ok(b.min >= 0.75 * v0 - 1e-9, 'Boden');
  }
  // auch extreme Nickwinkel (Sturz senkrecht) bleiben in den Grenzen
  let v = 7; for (let i = 0; i < 2000; i++) v = tempoSchritt(v, 7, -Math.PI / 2, dt);
  assert.ok(Math.abs(v - 1.45 * 7) < 1e-9);
  v = 7; for (let i = 0; i < 2000; i++) v = tempoSchritt(v, 7, Math.PI / 2, dt);
  assert.ok(Math.abs(v - 0.75 * 7) < 1e-9);
});

test('Schwung: nach dem Loslassen in ≤ 2,5 s wieder ±5 % am Reisetempo', () => {
  for (const climb of [-1, 1]) {
    let { v, p } = verlauf(7, climb), t = 0;
    while (Math.abs(v - 7) > 0.35 && t < 10) { p += (0 - p) * Math.min(1, dt * 4); v = tempoSchritt(v, 7, p, dt); t += dt; }
    assert.ok(t <= 2.5, `Rückkehr nach ${t.toFixed(2)} s (climb ${climb})`);
  }
});

test('Kurve: Eng-Kurve erst nach 0,7 s Dauer-Drehen, Lage ≤ 46° bzw. 60°', () => {
  const K = new FS.KurvenHilfe();
  let t = 0;
  for (; t < 0.69; t += dt) K.schritt(1, dt);
  assert.ok(K.rate < 1.01, 'vor 0,7 s keine Eng-Kurve');
  assert.ok(Math.abs(K.lage(-1.9)) <= 46 * Math.PI / 180 + 1e-9);
  for (; t < 2; t += dt) K.schritt(1, dt);
  assert.ok(Math.abs(K.rate - 1.35) < 0.01, 'Eng-Kurve ×1,35: ' + K.rate);
  assert.ok(Math.abs(K.lage(-2.6)) <= 60 * Math.PI / 180 + 1e-9 && Math.abs(K.lage(-2.6)) > 50 * Math.PI / 180);
  for (let i = 0; i < 60; i++) K.schritt(0, dt);
  assert.ok(K.rate < 1.01, 'Loslassen → normale Kurve');
  // Richtungswechsel startet neu
  for (let i = 0; i < 90; i++) K.schritt(1, dt);
  K.schritt(-1, dt); assert.ok(K.t < 0.02);
});

test('Eingabekurve: Standard linear, ?expo=1.6 feiner um die Mitte', () => {
  assert.equal(FS.expoKurve(0.5), 0.5);
  assert.ok(Math.abs(FS.expoKurve(0.5, 1.6) - Math.pow(0.5, 1.6)) < 1e-12);
  assert.equal(FS.expoKurve(-1, 1.6), -1);
});

// Messgröße 12: alle Regler auf 0 → genau die v3.0-Flugbahn (Referenz tests/node/v30_flugbahn.json, ±1 cm nach 10 s)
const AUS = '?schwung=0&kurve=0&flatter=0&ringschub=0&kette=0&saugen=0&aufwind=0&landewertung=0&schweif=0&rolle=0';
function bahn(q) {
  const out = join(mkdtempSync(join(tmpdir(), 'bahn-')), 'b.json');
  execFileSync(process.execPath, ['--import', './tests/node/umgebung.mjs', 'tests/node/flugbahn_ref.mjs', out], { env: { ...process.env, URLQ: q }, stdio: 'pipe' });
  return JSON.parse(readFileSync(out, 'utf8'));
}
test('Regler = 0 ergibt die v3.0-Flugbahn (±1 cm nach 10 s Eingabeskript)', () => {
  const ref = JSON.parse(readFileSync('tests/node/v30_flugbahn.json', 'utf8')), b = bahn(AUS);
  for (const s of Object.keys(ref)) for (let i = 0; i < ref[s].length; i++) {
    const r = ref[s][i], n = b[s][i];
    const d = Math.hypot(r.x - n.x, r.y - n.y, r.z - n.z);
    assert.ok(d < 0.01, `${s} t=${r.t}: ${d.toFixed(4)} m`);
  }
  // Gegenprobe: mit den neuen Mechaniken weicht die Bahn ab (Schwung/Kurve wirken)
  const an = bahn('');
  const r = ref.mittel.at(-1), n = an.mittel.at(-1);
  assert.ok(Math.hypot(r.x - n.x, r.y - n.y, r.z - n.z) > 0.5);
});
