// Prozedurale Texturen: Flügel-Masken (R=Punkte, G=Zweitfarbe, B=Rand/Adern, A=Form)
import * as THREE from 'three';

const S = 256;
function cv() { const c = document.createElement('canvas'); c.width = c.height = S; return c; }

// Schmetterlingsflügel (rechte Seite; Scharnier links, vorne oben)
function wingPath(x) {
  x.beginPath();
  // Vorderflügel
  x.moveTo(6, 40);
  x.bezierCurveTo(40, 6, 150, -4, 222, 22);
  x.bezierCurveTo(250, 34, 252, 70, 232, 96);
  x.bezierCurveTo(200, 128, 120, 136, 60, 130);
  // Hinterflügel
  x.bezierCurveTo(150, 136, 204, 168, 200, 204);
  x.bezierCurveTo(196, 240, 150, 254, 110, 246);
  x.bezierCurveTo(60, 236, 20, 196, 8, 150);
  x.bezierCurveTo(2, 110, 2, 70, 6, 40);
  x.closePath();
}
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

export const WING_PATTERNS = ['monarch', 'verlauf', 'punkte', 'herzen', 'streifen', 'sterne', 'augen'];

export function wingMask(pattern = 'monarch') {
  const c = cv(), x = c.getContext('2d');
  x.fillStyle = '#000'; wingPath(x); x.fill();
  x.save(); wingPath(x); x.clip();
  x.globalCompositeOperation = 'lighter';
  const G = (a) => `rgba(0,${a},0,1)`, B = (a) => `rgba(0,0,${a},1)`, R = (a) => `rgba(${a},0,0,1)`;
  if (pattern === 'verlauf' || pattern === 'monarch' || pattern === 'augen') {
    const g = x.createRadialGradient(0, 128, 20, 0, 128, 250);
    g.addColorStop(0, G(0)); g.addColorStop(pattern === 'verlauf' ? 1 : 0.9, G(pattern === 'verlauf' ? 255 : 150)); g.addColorStop(1, G(pattern === 'verlauf' ? 255 : 150));
    x.fillStyle = g; x.fillRect(0, 0, S, S);
  }
  if (pattern === 'punkte') { x.fillStyle = G(255); for (let i = 0; i < 16; i++) { const a = i * 2.4, r = 40 + (i * 37) % 170; x.beginPath(); x.arc(20 + Math.abs(Math.cos(a)) * r, 128 + Math.sin(a) * r * 0.6, 12 + (i % 3) * 4, 0, 7); x.fill(); } }
  if (pattern === 'herzen') { x.fillStyle = G(255); [[80, 60, 22], [160, 50, 18], [200, 88, 14], [100, 190, 22], [155, 205, 16], [50, 150, 14]].forEach(([a, b, r]) => heart(x, a, b, r)); }
  if (pattern === 'sterne') { x.fillStyle = G(255); [[90, 55, 22], [165, 45, 17], [205, 85, 13], [110, 190, 22], [160, 215, 15], [55, 140, 13]].forEach(([a, b, r]) => star(x, a, b, r)); }
  if (pattern === 'streifen') {
    for (let i = 0; i < 6; i++) { x.strokeStyle = G(i % 2 ? 255 : 0); x.lineWidth = 22; x.beginPath(); x.arc(0, 128, 60 + i * 30, -1.6, 1.6); x.stroke(); }
  }
  if (pattern === 'augen') {
    [[150, 60, 30], [140, 196, 26]].forEach(([a, b, r]) => {
      x.fillStyle = B(255); x.beginPath(); x.arc(a, b, r, 0, 7); x.fill();
      x.fillStyle = G(255); x.beginPath(); x.arc(a, b, r * 0.72, 0, 7); x.fill();
      x.fillStyle = R(255); x.beginPath(); x.arc(a - r * 0.2, b - r * 0.2, r * 0.25, 0, 7); x.fill();
    });
  }
  // Adern
  x.strokeStyle = B(120); x.lineWidth = 3;
  [[10, 60, 200, 30], [10, 70, 230, 60], [10, 90, 220, 100], [14, 128, 180, 190], [14, 140, 130, 236], [14, 150, 70, 220]].forEach(([a, b, c2, d]) => { x.beginPath(); x.moveTo(a, b); x.quadraticCurveTo((a + c2) / 2, (b + d) / 2 - 10, c2, d); x.stroke(); });
  // Rand + weiße Randpunkte (Monarch)
  x.globalCompositeOperation = 'source-over';
  x.lineWidth = pattern === 'monarch' ? 22 : 12;
  x.strokeStyle = 'rgb(0,0,255)'; wingPath(x); x.stroke();
  if (pattern === 'monarch' || pattern === 'punkte') {
    x.fillStyle = 'rgb(255,0,255)';
    [[210, 26], [236, 58], [230, 90], [200, 118], [196, 186], [190, 216], [160, 240], [120, 244], [80, 230], [44, 200]].forEach(([a, b]) => { x.beginPath(); x.arc(a, b, 4.5, 0, 7); x.fill(); });
  }
  x.restore();
  // Körpernahes Dunkel (Wurzel)
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4; t.generateMipmaps = true;
  return t;
}

// Glasflügel (Biene, Marienkäfer, Libelle): Adern + Schimmer
export function glassWing(shape = 'bee') {
  const c = cv(), x = c.getContext('2d');
  x.clearRect(0, 0, S, S);
  x.beginPath();
  if (shape === 'long') x.ellipse(128, 128, 124, 34, 0, 0, 7);
  else x.ellipse(120, 118, 118, 70, -0.1, 0, 7);
  x.save(); x.clip();
  const g = x.createLinearGradient(0, 0, S, S);
  g.addColorStop(0, 'rgba(235,250,255,0.55)'); g.addColorStop(0.5, 'rgba(255,240,250,0.4)'); g.addColorStop(1, 'rgba(230,255,240,0.5)');
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  x.strokeStyle = 'rgba(120,110,140,0.55)'; x.lineWidth = 3;
  for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(2, 118); x.quadraticCurveTo(120, 70 + i * 22, 250, 60 + i * 30); x.stroke(); }
  x.lineWidth = 6; x.strokeStyle = 'rgba(110,100,130,0.7)';
  if (shape === 'long') x.ellipse(128, 128, 122, 32, 0, 0, 7); else x.ellipse(120, 118, 116, 68, -0.1, 0, 7);
  x.stroke();
  x.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Weicher runder Klecks (Schatten, Glow)
export function blobTex() {
  const c = cv(), x = c.getContext('2d');
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  return new THREE.CanvasTexture(c);
}
