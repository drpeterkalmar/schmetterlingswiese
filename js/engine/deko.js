// v2.8 Deko: neue Optik (Wiesenblüten, Lichtstrahlen, Schirmchen, Himmel, Wasser, Schimmer …).
// ?deko=0 in der URL = Aussehen bis v2.7 (A/B-Vergleich); ?rm=1 = reduzierte Bewegung erzwingen (Test).
const q = new URLSearchParams(location.search);
export const DEKO = q.get('deko') !== '0';
// prefers-reduced-motion: weniger Schweben/Wackeln, kein Kamera-Ruckeln, weniger Partikelregen
export const RM = q.get('rm') === '1' || !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
// Präfix für Shader: neue Teile nur mit #ifdef DEKO (ohne Deko bleiben die Shader wie bis v2.7)
export const DEF = DEKO ? '#define DEKO\n' : '';
