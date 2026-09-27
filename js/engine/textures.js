// Prozedurale Texturen: Flügel-Masken (R=Punkte, G=Zweitfarbe, B=Rand/Adern, A=Form),
// verrückte Flügel-Skins (Vollfarbe) und Glasflügel
import * as THREE from 'three';

const S = 256;
function cv() { const c = document.createElement('canvas'); c.width = c.height = S; return c; }

// Flügel-Umrisse (rechte Seite; Scharnier links, vorne oben). rund = Grundform seit v2.0
const PATHS = {
  rund: (x) => {
    x.moveTo(6, 40);
    x.bezierCurveTo(40, 6, 150, -4, 222, 22);
    x.bezierCurveTo(250, 34, 252, 70, 232, 96);
    x.bezierCurveTo(200, 128, 120, 136, 60, 130);
    x.bezierCurveTo(150, 136, 204, 168, 200, 204);
    x.bezierCurveTo(196, 240, 150, 254, 110, 246);
    x.bezierCurveTo(60, 236, 20, 196, 8, 150);
    x.bezierCurveTo(2, 110, 2, 70, 6, 40);
  },
  // spitze Vorderflügel + Schwalbenschwanz
  spitz: (x) => {
    x.moveTo(6, 40);
    x.bezierCurveTo(50, 8, 170, -2, 252, 4);
    x.bezierCurveTo(238, 36, 238, 76, 226, 100);
    x.bezierCurveTo(196, 126, 120, 134, 60, 130);
    x.bezierCurveTo(140, 134, 202, 156, 204, 188);
    x.bezierCurveTo(204, 204, 196, 214, 186, 220);
    x.bezierCurveTo(190, 234, 186, 250, 174, 255);
    x.bezierCurveTo(160, 256, 150, 246, 146, 234);
    x.bezierCurveTo(96, 240, 32, 208, 8, 150);
    x.bezierCurveTo(2, 110, 2, 70, 6, 40);
  },
  // lange, schmale Flügel (Passionsfalter)
  lang: (x) => {
    x.moveTo(6, 52);
    x.bezierCurveTo(60, 16, 180, 10, 246, 30);
    x.bezierCurveTo(258, 40, 256, 72, 238, 84);
    x.bezierCurveTo(190, 108, 110, 116, 50, 118);
    x.bezierCurveTo(130, 126, 176, 150, 174, 180);
    x.bezierCurveTo(172, 210, 124, 222, 88, 212);
    x.bezierCurveTo(48, 200, 14, 172, 8, 142);
    x.bezierCurveTo(3, 110, 3, 80, 6, 52);
  },
  // Mondfalter: breite Vorderflügel, Hinterflügel mit langem Schwänzchen
  luna: (x) => {
    x.moveTo(6, 44);
    x.bezierCurveTo(50, 12, 160, 2, 222, 16);
    x.bezierCurveTo(248, 24, 250, 52, 236, 70);
    x.bezierCurveTo(212, 102, 130, 122, 60, 126);
    x.bezierCurveTo(130, 134, 176, 152, 178, 178);
    x.bezierCurveTo(180, 196, 196, 212, 214, 228);
    x.bezierCurveTo(232, 242, 228, 258, 208, 254);
    x.bezierCurveTo(188, 250, 166, 232, 146, 222);
    x.bezierCurveTo(96, 222, 30, 196, 8, 150);
    x.bezierCurveTo(2, 110, 2, 74, 6, 44);
  },
  // Mini-Drache: Hautflügel mit gewellter Hinterkante zwischen den Fingerspitzen
  drache: (x) => {
    x.moveTo(6, 54);
    x.quadraticCurveTo(60, 2, 136, 10);
    x.quadraticCurveTo(206, 16, 252, 26);
    x.quadraticCurveTo(212, 58, 236, 112);
    x.quadraticCurveTo(184, 104, 180, 166);
    x.quadraticCurveTo(136, 136, 106, 180);
    x.quadraticCurveTo(66, 138, 8, 132);
    x.closePath();
  },
  // Flugkatze: Federflügel mit runden Federspitzen
  feder: (x) => {
    x.moveTo(6, 56);
    x.bezierCurveTo(50, 8, 170, -2, 250, 24);
    const tips = [[250, 24], [238, 62], [220, 96], [196, 126], [166, 150], [132, 166], [96, 172], [58, 166], [24, 150]];
    for (let i = 1; i < tips.length; i++) {
      const [ax, ay] = tips[i - 1], [bx, by] = tips[i];
      x.quadraticCurveTo((ax + bx) / 2 + (bx - ax) * 0.1 + (by - ay) * 0.35, (ay + by) / 2 + (by - ay) * 0.1 - (bx - ax) * 0.35, bx, by);
    }
    x.bezierCurveTo(10, 130, 4, 90, 6, 56);
  },
};
export const WING_SHAPES = Object.keys(PATHS);
function wingPath(x, shape = 'rund') { x.beginPath(); (PATHS[shape] || PATHS.rund)(x); x.closePath(); }

function star(x, cx, cy, r) {
  x.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
  x.closePath(); x.fill();
}
function heart(x, cx, cy, r) {
  x.beginPath();
  x.moveTo(cx, cy + r * 0.9);
  x.bezierCurveTo(cx - r * 1.4, cy - r * 0.1, cx - r * 0.6, cy - r * 1.2, cx, cy - r * 0.4);
  x.bezierCurveTo(cx + r * 0.6, cy - r * 1.2, cx + r * 1.4, cy - r * 0.1, cx, cy + r * 0.9);
  x.fill();
}
function srand(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

export const WING_PATTERNS = ['monarch', 'verlauf', 'punkte', 'herzen', 'streifen', 'sterne', 'augen'];

// Adern je Form (B-Kanal)
function veins(x, shape, style) {
  x.strokeStyle = style; x.lineWidth = 3;
  const V = shape === 'drache'
    ? [[8, 60, 136, 10], [136, 10, 252, 26], [136, 10, 236, 112], [136, 10, 180, 166], [136, 10, 106, 180], [20, 80, 106, 180]]
    : shape === 'feder'
      ? [[10, 70, 238, 62], [10, 80, 220, 96], [10, 90, 196, 126], [10, 100, 166, 150], [10, 110, 132, 166], [10, 118, 96, 172], [10, 126, 58, 166]]
      : [[10, 60, 200, 30], [10, 70, 230, 60], [10, 90, 220, 100], [14, 128, 180, 190], [14, 140, 130, 236], [14, 150, 70, 220]];
  V.forEach(([a, b, c2, d]) => { x.beginPath(); x.moveTo(a, b); x.quadraticCurveTo((a + c2) / 2, (b + d) / 2 - 10, c2, d); x.stroke(); });
}

export function wingMask(pattern = 'monarch', shape = 'rund') {
  const c = cv(), x = c.getContext('2d');
  x.fillStyle = '#000'; wingPath(x, shape); x.fill();
  x.save(); wingPath(x, shape); x.clip();
  x.globalCompositeOperation = 'lighter';
  const G = (a) => `rgba(0,${a},0,1)`, B = (a) => `rgba(0,0,${a},1)`, R = (a) => `rgba(${a},0,0,1)`;
  if (pattern === 'verlauf' || pattern === 'monarch' || pattern === 'augen' || pattern === 'membran' || pattern === 'feder') {
    const full = pattern === 'verlauf' || pattern === 'feder';
    const g = x.createRadialGradient(0, 128, 20, 0, 128, 250);
    g.addColorStop(0, G(0)); g.addColorStop(full ? 1 : 0.9, G(full ? 255 : 150)); g.addColorStop(1, G(full ? 255 : 150));
    x.fillStyle = g; x.fillRect(0, 0, S, S);
  }
  if (pattern === 'punkte') { x.fillStyle = G(255); for (let i = 0; i < 16; i++) { const a = i * 2.4, r = 40 + (i * 37) % 170; x.beginPath(); x.arc(20 + Math.abs(Math.cos(a)) * r, 128 + Math.sin(a) * r * 0.6, 12 + (i % 3) * 4, 0, 7); x.fill(); } }
  if (pattern === 'herzen') { x.fillStyle = G(255); [[80, 60, 22], [160, 50, 18], [200, 88, 14], [100, 190, 22], [155, 205, 16], [50, 150, 14]].forEach(([a, b, r]) => heart(x, a, b, r)); }
  if (pattern === 'sterne') { x.fillStyle = G(255); [[90, 55, 22], [165, 45, 17], [205, 85, 13], [110, 190, 22], [160, 215, 15], [55, 140, 13]].forEach(([a, b, r]) => star(x, a, b, r)); }
  if (pattern === 'streifen') {
    for (let i = 0; i < 6; i++) { x.strokeStyle = G(i % 2 ? 255 : 0); x.lineWidth = 22; x.beginPath(); x.arc(0, 128, 60 + i * 30, -1.6, 1.6); x.stroke(); }
  }
  if (pattern === 'augen') {
    const spots = shape === 'luna' ? [[150, 62, 26], [128, 180, 22]] : shape === 'lang' ? [[160, 62, 24], [110, 176, 22]] : [[150, 60, 30], [140, 196, 26]];
    spots.forEach(([a, b, r]) => {
      x.fillStyle = B(255); x.beginPath(); x.arc(a, b, r, 0, 7); x.fill();
      x.fillStyle = G(255); x.beginPath(); x.arc(a, b, r * 0.72, 0, 7); x.fill();
      x.fillStyle = R(255); x.beginPath(); x.arc(a - r * 0.2, b - r * 0.2, r * 0.25, 0, 7); x.fill();
    });
  }
  if (pattern === 'feder') { // Federlinien
    x.strokeStyle = B(90); x.lineWidth = 2;
    for (let i = 0; i < 14; i++) { const a = -0.9 + i * 0.13; x.beginPath(); x.moveTo(12, 100); x.lineTo(12 + Math.cos(a) * 260, 100 + Math.sin(a) * 260 + 40); x.stroke(); }
  }
  // Adern
  veins(x, shape, B(pattern === 'membran' ? 255 : 120));
  // Körpernahes Dunkel (Wurzel) – der Flügelansatz bleibt am Körper sichtbar
  const rg = x.createRadialGradient(0, 95, 4, 0, 95, 64);
  rg.addColorStop(0, B(255)); rg.addColorStop(0.5, B(150)); rg.addColorStop(1, B(0));
  x.fillStyle = rg; x.fillRect(0, 0, 70, 200);
  // Rand (v2.1: ohne weiße Randpunkte – die saßen halb auf der Silhouette und wirkten wie Artefakte)
  x.globalCompositeOperation = 'source-over';
  x.lineWidth = pattern === 'monarch' ? 22 : pattern === 'feder' ? 6 : 12;
  x.strokeStyle = 'rgb(0,0,255)'; wingPath(x, shape); x.stroke();
  x.restore();
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4; t.generateMipmaps = true;
  return t;
}

// ---------------------------------------------------------------- Verrückte Flügel-Skins (Vollfarbe)
const RAINBOW = ['#ff5a6e', '#ff9a3c', '#ffd84a', '#7ee06a', '#4fc8ff', '#8a7bff', '#d67cff'];
export const SKIN_RIM = { regenbogen: '#ffffff', melone: '#2e7d32', galaxie: '#c8b8ff', disco: '#8a90a8', leucht: '#eaffc0' };
// Malt einen Skin in den (bereits geclippten) Flügel. cx/cy = Flügelwurzel
function paintSkin(x, id, shapeFn, cx = 0, cy = 128) {
  const r = srand(id.length * 977 + 13);
  if (id === 'regenbogen') {
    for (let i = RAINBOW.length - 1; i >= -1; i--) { x.fillStyle = i < 0 ? '#fff4fb' : RAINBOW[i]; x.beginPath(); x.arc(cx, cy, 40 + (i + 1) * 30, 0, 7); x.fill(); }
    x.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 12; i++) { x.beginPath(); x.arc(40 + r() * 200, 20 + r() * 220, 3 + r() * 5, 0, 7); x.fill(); }
  } else if (id === 'melone') {
    x.fillStyle = '#ff5a6a'; x.fillRect(0, 0, S, S);
    const g = x.createRadialGradient(cx, cy, 10, cx, cy, 220); g.addColorStop(0, 'rgba(255,140,150,0.5)'); g.addColorStop(1, 'rgba(255,60,80,0)');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    x.fillStyle = '#2a1a1a';
    for (let i = 0; i < 22; i++) {
      const a = -1.3 + r() * 2.6, d = 50 + r() * 150, px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d * 1.1;
      x.save(); x.translate(px, py); x.rotate(a); x.beginPath(); x.ellipse(0, 0, 7, 4, 0, 0, 7); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.5)'; x.beginPath(); x.arc(2, -1.5, 1.4, 0, 7); x.fill(); x.fillStyle = '#2a1a1a'; x.restore();
    }
    // Schale: von außen dunkelgrün, hellgrün, weißlich (Strich mit Clip = nur innere Hälfte)
    [[64, '#f4ffe0'], [46, '#8fdc5a'], [28, '#2e8b3a']].forEach(([w, c]) => { x.lineWidth = w; x.strokeStyle = c; x.beginPath(); shapeFn(x); x.closePath(); x.stroke(); });
  } else if (id === 'galaxie') {
    const g = x.createRadialGradient(cx, cy, 10, cx, cy, 260); g.addColorStop(0, '#5a2a9a'); g.addColorStop(0.5, '#27206a'); g.addColorStop(1, '#101848');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    [[150, 60, 70, 'rgba(255,110,200,0.35)'], [110, 190, 60, 'rgba(90,200,255,0.3)'], [200, 110, 50, 'rgba(160,120,255,0.35)']].forEach(([a, b, rr, c]) => {
      const n = x.createRadialGradient(a, b, 0, a, b, rr); n.addColorStop(0, c); n.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = n; x.fillRect(0, 0, S, S);
    });
    for (let i = 0; i < 90; i++) { x.fillStyle = r() < 0.2 ? '#fff2a0' : '#ffffff'; x.beginPath(); x.arc(r() * S, r() * S, 0.6 + r() * 1.6, 0, 7); x.fill(); }
    x.fillStyle = '#fff6c0'; [[170, 50, 9], [90, 200, 7], [210, 100, 6]].forEach(([a, b, rr]) => star(x, a, b, rr));
    // kleiner Ringplanet
    x.fillStyle = '#ffb36b'; x.beginPath(); x.arc(120, 110, 11, 0, 7); x.fill();
    x.strokeStyle = '#ffe0a8'; x.lineWidth = 3; x.beginPath(); x.ellipse(120, 110, 20, 6, -0.4, 0, 7); x.stroke();
  } else if (id === 'disco') {
    x.fillStyle = '#6a6e80'; x.fillRect(0, 0, S, S);
    const T = 18;
    for (let yy = 0; yy < S; yy += T) for (let xx = 0; xx < S; xx += T) { const v = 170 + (r() * 85) | 0; x.fillStyle = `rgb(${v},${v},${Math.min(255, v + 8)})`; x.fillRect(xx + 1.5, yy + 1.5, T - 3, T - 3); }
    x.fillStyle = '#ffffff'; for (let i = 0; i < 9; i++) star(x, 30 + r() * 200, 20 + r() * 210, 6 + r() * 6);
  } else if (id === 'leucht') {
    const g = x.createRadialGradient(cx, cy, 10, cx, cy, 250); g.addColorStop(0, '#fffbd0'); g.addColorStop(0.35, '#b6ff8a'); g.addColorStop(0.75, '#5affd6'); g.addColorStop(1, '#8ad8ff');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 26; i++) { const px = 30 + r() * 210, py = 16 + r() * 224, rr = 4 + r() * 7; const d = x.createRadialGradient(px, py, 0, px, py, rr * 2); d.addColorStop(0, 'rgba(255,255,230,0.95)'); d.addColorStop(1, 'rgba(255,255,200,0)'); x.fillStyle = d; x.fillRect(px - rr * 2, py - rr * 2, rr * 4, rr * 4); }
  }
}

// Skin in Schmetterlings-Flügelform (undurchsichtig, alphaTest)
export function skinWing(id, shape = 'rund') {
  const c = cv(), x = c.getContext('2d');
  x.save(); wingPath(x, shape); x.clip();
  paintSkin(x, id, PATHS[shape] || PATHS.rund);
  veins(x, shape, 'rgba(255,255,255,0.18)');
  x.lineWidth = 10; x.strokeStyle = SKIN_RIM[id] || '#ffffff'; wingPath(x, shape); x.stroke();
  x.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// Glasflügel (Biene, Hummel, Marienkäfer, Libelle): Adern + Schimmer. shape: bee | round | tip | long | longtip
function glassPath(x, shape) {
  x.beginPath();
  if (shape === 'long') x.ellipse(128, 128, 124, 34, 0, 0, 7);
  else if (shape === 'longtip') { x.moveTo(4, 128); x.bezierCurveTo(40, 88, 200, 90, 254, 124); x.bezierCurveTo(200, 150, 60, 166, 4, 128); }
  else if (shape === 'round') x.ellipse(118, 124, 114, 92, -0.08, 0, 7);
  else if (shape === 'tip') { x.moveTo(4, 118); x.bezierCurveTo(30, 40, 180, 36, 254, 96); x.bezierCurveTo(200, 170, 60, 196, 4, 118); }
  else x.ellipse(120, 118, 118, 70, -0.1, 0, 7);
  x.closePath();
}
export function glassWing(shape = 'bee', skin = null) {
  const c = cv(), x = c.getContext('2d');
  x.clearRect(0, 0, S, S);
  glassPath(x, shape);
  x.save(); x.clip();
  if (skin) {
    x.globalAlpha = 0.88; paintSkin(x, skin, (xx) => glassPath(xx, shape), 0, 120); x.globalAlpha = 1;
  } else {
    const g = x.createLinearGradient(0, 0, S, S);
    g.addColorStop(0, 'rgba(235,250,255,0.55)'); g.addColorStop(0.5, 'rgba(255,240,250,0.4)'); g.addColorStop(1, 'rgba(230,255,240,0.5)');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
  }
  x.strokeStyle = skin ? 'rgba(255,255,255,0.35)' : 'rgba(120,110,140,0.55)'; x.lineWidth = 3;
  for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(2, 118); x.quadraticCurveTo(120, 70 + i * 22, 250, 60 + i * 30); x.stroke(); }
  x.lineWidth = 6; x.strokeStyle = skin ? (SKIN_RIM[skin] || '#fff') : 'rgba(110,100,130,0.7)';
  glassPath(x, shape); x.stroke();
  x.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Kleines Vorschau-Bild (dataURL) eines Flügels: Maske eingefärbt oder Skin
const _icons = new Map();
export function wingIcon(key, make) {
  if (_icons.has(key)) return _icons.get(key);
  const src = make(), img = src.image;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0, 64, 64);
  const url = c.toDataURL();
  src.dispose && src.dispose();
  _icons.set(key, url);
  return url;
}
// Maske → Farbbild (für Icons): alb = mix(mix(a,b,G), c, B), dann Weiß über R
export function tintMask(tex, a, b, c) {
  const src = tex.image, out = document.createElement('canvas'); out.width = out.height = S;
  const x = out.getContext('2d'); x.drawImage(src, 0, 0);
  const d = x.getImageData(0, 0, S, S), p = d.data;
  const A = [(a >> 16) & 255, (a >> 8) & 255, a & 255], Bc = [(b >> 16) & 255, (b >> 8) & 255, b & 255], C = [(c >> 16) & 255, (c >> 8) & 255, c & 255];
  for (let i = 0; i < p.length; i += 4) {
    const g = p[i + 1] / 255, bl = p[i + 2] / 255, r = p[i] / 255 * 0.9;
    for (let k = 0; k < 3; k++) { let v = A[k] + (Bc[k] - A[k]) * g; v += (C[k] - v) * bl; v += (255 - v) * r; p[i + k] = v; }
  }
  x.putImageData(d, 0, 0);
  return { image: out };
}

// Weicher runder Klecks (Schatten, Glow)
export function blobTex() {
  const c = cv(), x = c.getContext('2d');
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  return new THREE.CanvasTexture(c);
}
