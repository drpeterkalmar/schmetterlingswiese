// Node-Testumgebung (v2.9): 'three' → lib/three.module.min.js (wie die Importmap in index.html) und eine minimale
// Browser-Attrappe (location, window, document.createElement('canvas')), damit Spielmodule ohne Browser laden.
// Aufruf:  node --import ./tests/node/umgebung.mjs --test tests/node/
//   URL-Regler für einen Testlauf: URLQ='?takt=0' node --import … (location.search wird beim Laden der Module gelesen)
import { register } from 'node:module';
register('./aufloeser.mjs', import.meta.url);

const g = globalThis;
g.window = g;
g.location = { search: process.env.URLQ || '', protocol: 'http:', href: 'http://localhost/index.html' + (process.env.URLQ || '') };
g.devicePixelRatio = 1; g.innerWidth = 412; g.innerHeight = 915;
// Leinwand-Attrappe: jede 2D-Funktion ist ein No-op, Bilddaten sind leere Felder (Texturen werden nicht angesehen)
const ctx2d = new Proxy({}, {
  get(t, k) {
    if (k in t) return t[k];
    if (k === 'createImageData' || k === 'getImageData') return (w, h) => ({ width: w || 1, height: h || 1, data: new Uint8ClampedArray(4 * (w || 1) * (h || 1)) });
    if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return () => ({ addColorStop() {} });
    if (k === 'measureText') return () => ({ width: 10 });
    return () => {};
  },
  set(t, k, v) { t[k] = v; return true; },
});
const leinwand = () => ({ width: 1, height: 1, style: {}, getContext: () => ctx2d, toDataURL: () => '', addEventListener() {} });
g.document = g.document || {
  createElement: (n) => (n === 'canvas' ? leinwand() : { style: {}, appendChild() {}, addEventListener() {}, classList: { add() {}, remove() {}, toggle() {} } }),
  createElementNS: () => leinwand(),
  getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
  addEventListener() {}, body: { classList: { add() {}, remove() {}, toggle() {} } }, hidden: false,
};
g.addEventListener = g.addEventListener || (() => {});
