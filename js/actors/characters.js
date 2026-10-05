// Spielfiguren: Schmetterling, Marienkäfer, Biene, Libelle, Hummel, Mondfalter + verrückte Figuren
// (Mini-Drache, Einhorn-Falter, Flugkatze) – große Augen, Wangen, Freude-Animationen.
// v2.2: freie Farben je Figur, Größe/Flügelform/Fühler/Augenstil, Flügel-Skins, Hüte + Extras.
import * as THREE from 'three';
import { toonMat } from '../engine/gfx.js';
import { Build, P, petalGeo } from '../engine/geo.js';
import { wingMask, glassWing, skinWing } from '../engine/textures.js';

// ---------------------------------------------------------------- Kataloge
// Freischalt-Stufen (Sterne). Alles ohne Stern-Angabe ist ab Start frei.
// v2.7: 40 statt 15 Missionen → max. Sterne 360 statt 135 (nur Leicht: 120 statt 45). Die ersten Schwellen bleiben gleich
// (schnelles Erfolgserlebnis), danach wachsen sie auf ≈ das Doppelte: neu ≈ alt · (1 + min(1, alt/40)). Reihenfolge gleich.
// Wer Leicht durchspielt (≈ 2,5 ⭐ je Mission), hat nach Welt 1 ≈ 20 ⭐ (6 Sachen) – v2.6: 6 Sachen nach Welt 2 (6 Level).
export const STARS = {
  blasen: 2, brille: 4, herzen: 7, regenbogen: 10, propeller: 13, bart: 17, pups: 22, drache: 30, melone: 36, pizza: 43,
  riesig: 50, glitzer: 58, umhang: 68, einhorn: 80, galaxie: 90, hupe: 100, disco: 112, schweif: 124, helm: 136, katze: 150, leucht: 170, konfetti: 190,
};
// Schwellen bis v2.6 – nur für den Bestandsschutz alter Profile (progress.js: was damit frei war, bleibt frei)
export const STARS_V26 = {
  blasen: 2, brille: 4, herzen: 6, regenbogen: 8, propeller: 10, bart: 13, pups: 16, drache: 20, melone: 23, pizza: 26,
  riesig: 29, glitzer: 32, umhang: 36, einhorn: 40, galaxie: 45, hupe: 50, disco: 56, schweif: 62, helm: 68, katze: 75, leucht: 85, konfetti: 95,
};

// Eigene kleine Icons, wo es kein passendes Emoji gibt (Kranz statt Strauß, Hut statt Person/Gesicht)
const svg = (inner) => `<svg class="ico" viewBox="0 0 48 48" aria-hidden="true">${inner}</svg>`;
const bloom = (x, y, c) => [0, 72, 144, 216, 288].map(a => `<circle cx="${(x + Math.cos(a * Math.PI / 180) * 3.2).toFixed(1)}" cy="${(y + Math.sin(a * Math.PI / 180) * 3.2).toFixed(1)}" r="3" fill="${c}"/>`).join('') + `<circle cx="${x}" cy="${y}" r="2.1" fill="#ffd23f"/>`;
export const ICONS = {
  kranz: svg(`<ellipse cx="24" cy="27" rx="17" ry="9" fill="none" stroke="#4f9a3a" stroke-width="4"/>
    <ellipse cx="24" cy="27" rx="17" ry="9" fill="none" stroke="#7cc45a" stroke-width="1.6" stroke-dasharray="3 4"/>
    ${bloom(8, 25, '#ff7eb6')}${bloom(15, 34, '#ffffff')}${bloom(24, 36.5, '#b38cff')}${bloom(33, 34, '#6ec6ff')}${bloom(40, 25, '#ff7eb6')}${bloom(16, 19, '#ffffff')}${bloom(32, 19, '#ffe070')}`),
  party: svg(`<clipPath id="pc"><path d="M24 5 L37 39 Q24 44 11 39 Z"/></clipPath>
    <path d="M24 5 L37 39 Q24 44 11 39 Z" fill="#ff6fb0"/>
    <g clip-path="url(#pc)" fill="#5fd0ff"><rect x="0" y="12" width="48" height="5"/><rect x="0" y="22" width="48" height="5"/><rect x="0" y="32" width="48" height="5"/></g>
    <circle cx="24" cy="6" r="4.5" fill="#ffe04a"/><circle cx="17" cy="30" r="1.6" fill="#fff"/><circle cx="29" cy="20" r="1.6" fill="#fff"/>`),
  zauber: svg(`<ellipse cx="24" cy="39" rx="20" ry="5.5" fill="#6a4ac8"/>
    <path d="M13 38 Q20 22 22 12 Q24 4 33 3 Q28 9 31 20 Q33 30 35 38 Q24 42 13 38 Z" fill="#7a5ae0"/>
    <path d="M14 34 Q24 38 34 34 L35 38 Q24 42 13 38 Z" fill="#ffd23f"/>
    <path d="M24 17 l1.6 3.3 3.6 .5 -2.6 2.5 .6 3.6 -3.2 -1.7 -3.2 1.7 .6 -3.6 -2.6 -2.5 3.6 -.5 Z" fill="#ffe04a"/>`),
  propeller: svg(`<path d="M8 38 A16 15 0 0 1 40 38 Z" fill="#ff5a6e"/><path d="M24 23 A16 15 0 0 1 40 38 L24 38 Z" fill="#4fc8ff"/><path d="M8 38 A16 15 0 0 1 24 23 L24 38 Z" fill="#ffd84a"/>
    <rect x="6" y="37" width="36" height="4" rx="2" fill="#3f6fff"/><rect x="22.5" y="13" width="3" height="11" fill="#6a6a80"/>
    <ellipse cx="14" cy="12" rx="10" ry="3.2" fill="#ff5a6e"/><ellipse cx="34" cy="12" rx="10" ry="3.2" fill="#7ee06a"/><circle cx="24" cy="12" r="3" fill="#ffd84a"/>`),
  helm: svg(`<circle cx="24" cy="22" r="17" fill="#cfefff" fill-opacity=".55" stroke="#ffffff" stroke-width="2.5"/><path d="M13 13 Q17 8 23 8" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>
    <rect x="9" y="36" width="30" height="7" rx="3.5" fill="#f4f6ff" stroke="#9aa4c4" stroke-width="1.5"/><line x1="33" y1="8" x2="37" y2="2" stroke="#9aa4c4" stroke-width="2"/><circle cx="37.5" cy="2.5" r="2.5" fill="#ff5a6e"/>`),
  umhang: svg(`<path d="M16 8 L32 8 L42 42 Q24 46 6 42 Z" fill="#ff3a5a"/><path d="M16 8 L32 8 L35 18 Q24 21 13 18 Z" fill="#d8284a"/>
    <path d="M24 25 l2 4.2 4.6 .6 -3.4 3.2 .8 4.6 -4 -2.2 -4 2.2 .8 -4.6 -3.4 -3.2 4.6 -.6 Z" fill="#ffd84a"/><circle cx="24" cy="9" r="3.5" fill="#ffd84a"/>`),
  bart: svg(`<path d="M24 22 C19 17 11 18 8 24 C6 28 9 32 12 29 C14 26 18 29 24 27 C30 29 34 26 36 29 C39 32 42 28 40 24 C37 18 29 17 24 22 Z" fill="#5a3a28"/>`),
  brille: svg(`<path d="M24 20 Q22 17 18 17" stroke="#ff4fa0" stroke-width="2.5" fill="none"/>
    <path d="M13 34 C3 27 5 16 12 18 C14 18.5 13 20 13 20 C13 20 13 18.5 15 18 C21 16 23 27 13 34 Z" fill="#3a1840" stroke="#ff4fa0" stroke-width="2.5" transform="translate(-1 -1)"/>
    <path d="M35 34 C25 27 27 16 34 18 C36 18.5 35 20 35 20 C35 20 35 18.5 37 18 C43 16 45 27 35 34 Z" fill="#3a1840" stroke="#ff4fa0" stroke-width="2.5" transform="translate(1 -1)"/>
    <path d="M18 18 Q24 15 30 18" stroke="#ff4fa0" stroke-width="2.5" fill="none"/><circle cx="9" cy="22" r="1.6" fill="#fff"/><circle cx="31" cy="22" r="1.6" fill="#fff"/>`),
  hummel: svg(`<ellipse cx="17" cy="14" rx="9" ry="6" fill="#e8f6ff" stroke="#9ab" stroke-width="1"/><ellipse cx="30" cy="13" rx="8" ry="5.5" fill="#e8f6ff" stroke="#9ab" stroke-width="1"/>
    <clipPath id="hc"><ellipse cx="27" cy="29" rx="16" ry="13"/></clipPath><ellipse cx="27" cy="29" rx="16" ry="13" fill="#ffd23f"/>
    <g clip-path="url(#hc)"><rect x="20" y="10" width="6" height="40" fill="#2a2024"/><rect x="32" y="10" width="5" height="40" fill="#2a2024"/><rect x="37" y="10" width="10" height="40" fill="#fff6ea"/></g>
    <circle cx="11" cy="28" r="8" fill="#2a2024"/><circle cx="8.5" cy="26.5" r="3" fill="#fff"/><circle cx="8" cy="27" r="1.6" fill="#2a2024"/>`),
  mondfalter: svg(`<path d="M24 16 C30 4 44 3 45 12 C46 20 36 24 26 25 C36 27 40 34 38 40 C40 45 44 46 44 47 C38 47 34 43 32 40 C28 38 26 32 24 28 Z" fill="#a8f0c8" stroke="#9a5a8a" stroke-width="1.6"/>
    <path d="M24 16 C18 4 4 3 3 12 C2 20 12 24 22 25 C12 27 8 34 10 40 C8 45 4 46 4 47 C10 47 14 43 16 40 C20 38 22 32 24 28 Z" fill="#a8f0c8" stroke="#9a5a8a" stroke-width="1.6"/>
    <circle cx="36" cy="14" r="3" fill="#9a5a8a"/><circle cx="12" cy="14" r="3" fill="#9a5a8a"/><ellipse cx="24" cy="24" rx="3.2" ry="10" fill="#fff8f0"/>
    <path d="M23 15 Q19 8 16 6 M25 15 Q29 8 32 6" stroke="#c89a5a" stroke-width="1.6" fill="none"/>`),
  katze: svg(`<path d="M3 20 Q12 10 20 22 Z" fill="#fff" stroke="#d8c8b8"/><path d="M45 20 Q36 10 28 22 Z" fill="#fff" stroke="#d8c8b8"/><path d="M12 14 L15 5 L20 12 Z M36 14 L33 5 L28 12 Z" fill="#ffa24a"/>
    <circle cx="24" cy="24" r="13" fill="#ffa24a"/><path d="M20 12 L22 17 M24 11 L24 16 M28 12 L26 17" stroke="#d0702a" stroke-width="2"/>
    <circle cx="19" cy="23" r="3.2" fill="#fff"/><circle cx="29" cy="23" r="3.2" fill="#fff"/><circle cx="19" cy="23.5" r="2" fill="#3a6a2a"/><circle cx="29" cy="23.5" r="2" fill="#3a6a2a"/>
    <circle cx="21.5" cy="30" r="3" fill="#fff4e6"/><circle cx="26.5" cy="30" r="3" fill="#fff4e6"/><ellipse cx="24" cy="27.5" rx="1.8" ry="1.2" fill="#ff8fb0"/>`),
  hupe: svg(`<circle cx="10" cy="24" r="8" fill="#ff5a6e"/><rect x="16" y="21" width="12" height="6" fill="#ffd84a"/><path d="M28 21 L42 12 L42 36 L28 27 Z" fill="#ffd84a" stroke="#e0a820" stroke-width="1.5"/>
    <path d="M44 16 Q47 24 44 32" stroke="#4fc8ff" stroke-width="2" fill="none"/>`),
};

export const CHARACTERS = [
  { id: 'schmetterling', name: 'Schmetterling', emoji: '🦋', stars: 0, patterns: true, antennae: true },
  { id: 'marienkaefer', name: 'Marienkäfer', emoji: '🐞', stars: 0, antennae: true },
  { id: 'biene', name: 'Biene', emoji: '🐝', stars: 0, antennae: true },
  { id: 'libelle', name: 'Libelle', emoji: '🪽', stars: 0, antennae: true },
  { id: 'hummel', name: 'Hummel', emoji: '🐝', icon: ICONS.hummel, stars: 0, antennae: true },
  { id: 'mondfalter', name: 'Mondfalter', emoji: '🦋', icon: ICONS.mondfalter, stars: 0, patterns: true, antennae: true },
  { id: 'drache', name: 'Mini-Drache', emoji: '🐲', stars: STARS.drache, crazy: true },
  { id: 'einhorn', name: 'Einhorn-Falter', emoji: '🦄', stars: STARS.einhorn, crazy: true, patterns: true },
  { id: 'katze', name: 'Flugkatze', emoji: '🐱', icon: ICONS.katze, stars: STARS.katze, crazy: true },
];

// Farb-Palette für die freie Farbwahl (kindgerecht, 24 Felder)
export const PALETTE = [
  ['Erdbeere', 0xff4d5e], ['Kirsche', 0xd8284a], ['Orange', 0xff8a2a], ['Aprikose', 0xffb36b], ['Sonne', 0xffd23f], ['Zitrone', 0xfff27a],
  ['Apfelgrün', 0x9ce07a], ['Grasgrün', 0x3fbf5f], ['Minze', 0x6fe0c0], ['Türkis', 0x2ac8d0], ['Himmel', 0x5ab8ff], ['Blau', 0x3f6fff],
  ['Nachtblau', 0x2a3a8a], ['Lila', 0x9a6bff], ['Flieder', 0xc8a8ff], ['Pink', 0xff5fa8], ['Rosa', 0xffa8d0], ['Pfirsich', 0xffd0b8],
  ['Schoko', 0x6a3a28], ['Braun', 0xa86a3a], ['Schwarz', 0x241a22], ['Grau', 0x9a94a8], ['Weiß', 0xffffff], ['Gold', 0xffc02e],
].map(([name, c]) => ({ name, c }));

// Grundaussehen je Figur (a = Hauptfarbe, b = Zweitfarbe, c = Muster/Rand, e = Augen & Fühler; null = Standard)
export const DEFAULT_LOOK = {
  schmetterling: { a: 0xff9636, b: 0xffd36b, c: 0x3a2418, pattern: 'monarch' },
  marienkaefer: { a: 0xe8303a, b: 0x241a22, c: 0x1c1418 },
  biene: { a: 0xffc82e, b: 0xffffff, c: 0x3a2410 },
  libelle: { a: 0x2ad0d0, b: 0x7af0ff, c: 0x0a3a4a },
  hummel: { a: 0xffd23f, b: 0xfff6ea, c: 0x2a2024 },
  mondfalter: { a: 0xa8f0c8, b: 0xeafff2, c: 0x9a5a8a, pattern: 'augen', ant: 'feder' },
  drache: { a: 0x6fd88a, b: 0xfff0a8, c: 0x2f9a6a },
  einhorn: { a: 0xffa8d8, b: 0xc8b0ff, c: 0x8a6ad8, pattern: 'verlauf', eyes: 'wimpern' },
  katze: { a: 0xffa24a, b: 0xfff4e6, c: 0xd0702a },
};
// Welche Farbe wirkt wo (für die Werkstatt-Beschriftung)
export const SLOT_NAMES = {
  _: { a: 'Hauptfarbe', b: 'Zweitfarbe', c: 'Muster', e: 'Augen & Fühler' },
  marienkaefer: { a: 'Panzer', b: 'Körper', c: 'Punkte', e: 'Augen & Fühler' },
  biene: { a: 'Körper', b: 'Flügel', c: 'Streifen', e: 'Augen & Fühler' },
  hummel: { a: 'Pelz', b: 'Po', c: 'Streifen & Kopf', e: 'Augen & Fühler' },
  libelle: { a: 'Körper', b: 'Ringel', c: 'Fühler', e: 'Augen & Fühler' },
  drache: { a: 'Schuppen', b: 'Bauch & Flügel', c: 'Zacken', e: 'Augen' },
  einhorn: { a: 'Flügel', b: 'Flügel-Rand', c: 'Muster', e: 'Augen' },
  katze: { a: 'Fell', b: 'Schnauze & Flügel', c: 'Tiger-Streifen', e: 'Augen' },
};

// Fertige Farb-Ideen (v2.0-Farben bleiben erhalten, jetzt alle frei)
export const COLORS = {
  schmetterling: [
    { name: 'Sonnenorange', a: 0xff9636, b: 0xffd36b, c: 0x3a2418 }, { name: 'Rosa Traum', a: 0xff7eb6, b: 0xffe0ef, c: 0x6a2a4a },
    { name: 'Himmelblau', a: 0x3f9dff, b: 0xb0f2ff, c: 0x1c2a5a }, { name: 'Flieder', a: 0xa27bff, b: 0xffc6f2, c: 0x3a2260 },
    { name: 'Minze', a: 0x33d0a0, b: 0xefff9e, c: 0x1e4a40 }, { name: 'Kirschrot', a: 0xff4d6a, b: 0xffc0a8, c: 0x40101a },
    { name: 'Zitrone', a: 0xffd83a, b: 0xffffff, c: 0x5a4010 }, { name: 'Sternengold', a: 0xffb52e, b: 0xfff6c0, c: 0x7a4a08 },
  ],
  marienkaefer: [
    { name: 'Klassisch Rot', a: 0xe8303a, c: 0x1c1418 }, { name: 'Orange', a: 0xff8a2a, c: 0x1c1418 }, { name: 'Sonnengelb', a: 0xffcf2a, c: 0x1c1418 },
    { name: 'Rosa', a: 0xff7fb0, c: 0x4a1a30 }, { name: 'Minze', a: 0x4fd6b0, c: 0x10302a }, { name: 'Nachtblau', a: 0x4a6aff, c: 0xffffff },
  ],
  biene: [
    { name: 'Honig', a: 0xffc82e, c: 0x3a2410 }, { name: 'Zuckerwatte', a: 0xffa8d8, c: 0x6a2a5a }, { name: 'Minzbiene', a: 0x7ef0c0, c: 0x1c4a3a },
    { name: 'Lavendel', a: 0xc8a8ff, c: 0x3a2a6a }, { name: 'Goldbiene', a: 0xffe070, c: 0x8a5a10 },
  ],
  libelle: [
    { name: 'Türkis', a: 0x2ad0d0, b: 0x7af0ff, c: 0x0a3a4a }, { name: 'Smaragd', a: 0x2ad07a, b: 0xb0ff9a, c: 0x0a3a2a }, { name: 'Rubin', a: 0xff4a7a, b: 0xffb0d0, c: 0x4a0a2a },
  ],
  hummel: [
    { name: 'Wiesenhummel', a: 0xffd23f, b: 0xfff6ea, c: 0x2a2024 }, { name: 'Pfirsich', a: 0xffb088, b: 0xfff0f6, c: 0x5a2a3a }, { name: 'Pastell', a: 0xb8e8ff, b: 0xffd0ec, c: 0x6a5aa8 },
  ],
  mondfalter: [
    { name: 'Mondgrün', a: 0xa8f0c8, b: 0xeafff2, c: 0x9a5a8a }, { name: 'Morgenrot', a: 0xffc8a0, b: 0xfff4e0, c: 0xc0504a }, { name: 'Nachthimmel', a: 0x8aa8ff, b: 0xe8f0ff, c: 0x3a2a6a },
  ],
  drache: [
    { name: 'Wiesendrache', a: 0x6fd88a, b: 0xfff0a8, c: 0x2f9a6a }, { name: 'Zuckerdrache', a: 0xff9ec8, b: 0xfff0f6, c: 0xa86ad8 }, { name: 'Himmelsdrache', a: 0x6ab8ff, b: 0xffe8a0, c: 0x3a5ad8 },
  ],
  einhorn: [
    { name: 'Zuckerwatte', a: 0xffa8d8, b: 0xc8b0ff, c: 0x8a6ad8 }, { name: 'Morgentau', a: 0x9af0e0, b: 0xfff0a8, c: 0x3aa8a0 }, { name: 'Sternenstaub', a: 0xc8a8ff, b: 0x8ad0ff, c: 0x4a3a9a },
  ],
  katze: [
    { name: 'Rotkater', a: 0xffa24a, b: 0xfff4e6, c: 0xd0702a }, { name: 'Grautiger', a: 0xb0aabc, b: 0xffffff, c: 0x6a6478 }, { name: 'Schokokatze', a: 0x8a5a3a, b: 0xffe8d0, c: 0x4a2a18 },
  ],
};

export const HATS = [
  { id: 'none', name: 'Ohne', emoji: '🚫', stars: 0 },
  { id: 'kranz', name: 'Blumenkranz', emoji: '🌸', icon: ICONS.kranz, stars: 0 },
  { id: 'schleife', name: 'Schleife', emoji: '🎀', stars: 0 },
  { id: 'party', name: 'Partyhut', emoji: '🎉', icon: ICONS.party, stars: 0 },
  { id: 'stroh', name: 'Sonnenhut', emoji: '👒', stars: 0 },
  { id: 'zauber', name: 'Zauberhut', emoji: '🪄', icon: ICONS.zauber, stars: 0 },
  { id: 'krone', name: 'Krone', emoji: '👑', stars: 0 },
  { id: 'heiligenschein', name: 'Sternenkranz', emoji: '⭐', stars: 0 },
  { id: 'propeller', name: 'Propeller-Mütze', emoji: '🚁', icon: ICONS.propeller, stars: STARS.propeller, crazy: true },
  { id: 'pizza', name: 'Pizza-Hut', emoji: '🍕', stars: STARS.pizza, crazy: true },
  { id: 'helm', name: 'Astronauten-Helm', emoji: '🚀', icon: ICONS.helm, stars: STARS.helm, crazy: true },
];
export const EXTRAS = [
  { id: 'none', name: 'Ohne', emoji: '🚫', stars: 0 },
  { id: 'brille', name: 'Herz-Sonnenbrille', emoji: '🕶️', icon: ICONS.brille, stars: STARS.brille, crazy: true },
  { id: 'bart', name: 'Schnurrbart', emoji: '🥸', icon: ICONS.bart, stars: STARS.bart, crazy: true },
  { id: 'umhang', name: 'Superhelden-Umhang', emoji: '🦸', icon: ICONS.umhang, stars: STARS.umhang, crazy: true },
];
export const PATTERNS = [
  { id: 'monarch', name: 'Monarch' }, { id: 'verlauf', name: 'Verlauf' }, { id: 'punkte', name: 'Punkte' }, { id: 'herzen', name: 'Herzen' },
  { id: 'streifen', name: 'Regenbogen-Bögen' }, { id: 'sterne', name: 'Sterne' }, { id: 'augen', name: 'Pfauenauge' },
].map(p => ({ ...p, stars: 0 }));
export const SKINS = [
  { id: 'none', name: 'Normal', stars: 0 },
  { id: 'regenbogen', name: 'Regenbogen-Flügel', stars: STARS.regenbogen, crazy: true },
  { id: 'melone', name: 'Wassermelonen-Flügel', stars: STARS.melone, crazy: true },
  { id: 'galaxie', name: 'Galaxie-Flügel', stars: STARS.galaxie, crazy: true },
  { id: 'disco', name: 'Disco-Flügel', stars: STARS.disco, crazy: true },
  { id: 'leucht', name: 'Leuchtflügel', stars: STARS.leucht, crazy: true },
];
export const TRAILS = [
  { id: 'none', name: 'Keine', emoji: '🚫', stars: 0 },
  { id: 'blasen', name: 'Seifenblasen', emoji: '🫧', stars: STARS.blasen, crazy: true },
  { id: 'herzen', name: 'Herzchen', emoji: '💕', stars: STARS.herzen, crazy: true },
  { id: 'pups', name: 'Pups-Wölkchen', emoji: '💨', stars: STARS.pups, crazy: true },
  { id: 'glitzer', name: 'Glitzer-Sterne', emoji: '✨', stars: STARS.glitzer, crazy: true },
  { id: 'schweif', name: 'Regenbogen-Schweif', emoji: '🌈', stars: STARS.schweif, crazy: true },
  { id: 'konfetti', name: 'Konfetti', emoji: '🎊', stars: STARS.konfetti, crazy: true },
];
export const SIZES = [
  { id: 'xs', name: 'Winzling', k: 0.6, stars: STARS.riesig, crazy: true },
  { id: 's', name: 'Klein', k: 0.82, stars: 0 },
  { id: 'm', name: 'Mittel', k: 1, stars: 0 },
  { id: 'l', name: 'Groß', k: 1.2, stars: 0 },
  { id: 'xl', name: 'Riese', k: 1.55, stars: STARS.riesig, crazy: true },
];
export const WINGFORMS = [{ id: 'rund', name: 'Rund' }, { id: 'spitz', name: 'Spitz' }, { id: 'lang', name: 'Lang' }];
export const ANTENNAE = [{ id: 'kugel', name: 'Kugel' }, { id: 'herz', name: 'Herzchen' }, { id: 'stern', name: 'Sternchen' }, { id: 'ringel', name: 'Ringel' }, { id: 'feder', name: 'Feder' }];
export const EYESTYLES = [{ id: 'kuller', name: 'Kulleraugen' }, { id: 'wimpern', name: 'Wimpern' }, { id: 'stern', name: 'Sternaugen' }];
export const FUN = [{ id: 'hupe', name: 'Quietsch-Hupe', emoji: '📯', icon: ICONS.hupe, stars: STARS.hupe, crazy: true }];

const BASE_LOOK = { skin: 'none', size: 'm', wing: 'rund', ant: 'kugel', eyes: 'kuller', hat: 'none', extra: 'none', trail: 'none', pattern: 'monarch', e: null };
// Vollständiges Aussehen einer Figur aus gespeicherten Teil-Angaben (auch alte {color: n}-Angaben aus v2.0/2.1)
export function fullLook(kind, look = {}) {
  const L = { ...BASE_LOOK, ...(DEFAULT_LOOK[kind] || DEFAULT_LOOK.schmetterling) };
  const pre = COLORS[kind];
  if (typeof look.color === 'number' && pre) { const p = pre[Math.max(0, Math.min(look.color, pre.length - 1))]; L.a = p.a; if (p.b != null) L.b = p.b; if (p.c != null) L.c = p.c; }
  for (const k in look) if (k !== 'color' && look[k] !== undefined && look[k] !== null) L[k] = look[k];
  return L;
}
// Zufalls-Outfit (can(type, id) = freigeschaltet?)
export function randomLook(kind, can = () => true, rnd = Math.random) {
  const pick = (arr) => arr[(rnd() * arr.length) | 0];
  const ok = (type, list) => list.filter(x => !x.stars || can(type, x.id));
  const pal = PALETTE.map(p => p.c);
  const a = pick(pal); let c = pick(pal); while (c === a) c = pick(pal);
  const ch = CHARACTERS.find(x => x.id === kind) || CHARACTERS[0];
  const L = {
    a, b: pick(pal), c, e: rnd() < 0.5 ? null : pick(pal),
    wing: pick(WINGFORMS).id, eyes: pick(EYESTYLES).id, size: rnd() < 0.6 ? 'm' : pick(ok('size', SIZES)).id,
    skin: rnd() < 0.3 ? pick(ok('skin', SKINS)).id : 'none',
    hat: rnd() < 0.75 ? pick(ok('hat', HATS)).id : 'none',
    extra: rnd() < 0.45 ? pick(ok('extra', EXTRAS)).id : 'none',
    trail: rnd() < 0.6 ? pick(ok('trail', TRAILS)).id : 'none',
  };
  if (ch.patterns) L.pattern = pick(PATTERNS).id;
  if (ch.antennae) L.ant = pick(ANTENNAE).id;
  return L;
}

// ---------------------------------------------------------------- Bau-Helfer
const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _up = new THREE.Vector3(0, 1, 0), _z = new THREE.Vector3(0, 0, 1);
export function surf(c, r, dir, k = 1) { _v.set(dir[0], dir[1], dir[2]).normalize(); return [c[0] + _v.x * r * k, c[1] + _v.y * r * k, c[2] + _v.z * r * k]; }
// Euler-Rotation, die die Achse `from` auf die Richtung d dreht
function rotTo(d, from = _up) { _q.setFromUnitVectors(from, _v.set(d[0], d[1], d[2]).normalize()); _e.setFromQuaternion(_q); return [_e.x, _e.y, _e.z]; }
const add3 = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const norm3 = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const lerpHex = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t).getHex();
// Stab von a nach b
function rod(bld, a, b, r, col, seg = 5, r2 = r) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l = Math.hypot(...d);
  bld.add(P.cyl(r2, r, l * 1.05, seg), col, { p: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], r: rotTo(d) });
}
function heartShape(r) {
  const s = new THREE.Shape(); s.moveTo(0, -r * 0.9);
  s.bezierCurveTo(-r * 1.4, r * 0.1, -r * 0.6, r * 1.2, 0, r * 0.4);
  s.bezierCurveTo(r * 0.6, r * 1.2, r * 1.4, r * 0.1, 0, -r * 0.9);
  return s;
}
function starShape(r, inner = 0.45) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * inner : r; i ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  return s;
}
// flache Form (Herz/Stern) mit Tiefe, zentriert, Vorderseite +Z
function flat(shape, depth) { const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 6 }); g.translate(0, 0, -depth / 2); return g; }
// flauschige Kugel: Vertices entlang der Normalen leicht verrauscht (gleiche Position → gleicher Versatz, keine Risse)
function fuzzy(g, amp) {
  const p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const x = Math.round(p.getX(i) * 1e4), y = Math.round(p.getY(i) * 1e4), z = Math.round(p.getZ(i) * 1e4);
    let h = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; h = (h - Math.floor(h)) * 2 - 1;
    p.setXYZ(i, p.getX(i) + n.getX(i) * h * amp, p.getY(i) + n.getY(i) * h * amp, p.getZ(i) + n.getZ(i) * h * amp);
  }
  return g;
}
// Kugel aus Farbbändern entlang Z (für Streifen); Band 0 = vorne
function bandSphere(b, r, center, scale, bands, o = {}) {
  const tot = bands.length;
  bands.forEach((col, i) => {
    let g = new THREE.SphereGeometry(r, o.w || 16, o.h || 3, 0, Math.PI * 2, (i / tot) * Math.PI, Math.PI / tot);
    if (o.fuzz) g = fuzzy(g, o.fuzz);
    g.rotateX(Math.PI / 2); // Pole auf Z
    b.add(g, col, { p: center, s: scale });
  });
}

// Gesicht auf Kopfkugel: Augen, Glanzpunkte, Wangen, Mund. Liefert {open, happy}-Builds
// o.style: kuller | wimpern | stern · o.outline: dunkler Augenrand (für helle Köpfe) · o.mouth=false: Mund woanders
export function face(b, bOpen, bHappy, c, r, o = {}) {
  const eyeR = r * (o.eye ?? 0.4), sep = o.sep ?? 0.42, up = o.up ?? 0.18;
  const lo = o.lod ? 0.5 : 1, S = (a, b) => [Math.max(5, Math.round(a * lo)), Math.max(4, Math.round(b * lo))];
  const iris = o.iris ?? 0x2a1830, style = o.style || 'kuller';
  for (const s of [-1, 1]) {
    const d = [s * sep, up, 1];
    const sc = surf(c, r, d, 1 - eyeR / r * 0.45);
    if (o.outline != null) bOpen.add(P.sphere(eyeR * 1.1, ...S(14, 10)), o.outline, { p: surf(c, r, d, 1 - eyeR / r * 0.62), s: [1, 1.12, 0.8] });
    bOpen.add(P.sphere(eyeR, ...S(14, 10)), 0xffffff, { p: sc, s: [1, 1.12, 0.8], unlit: 0.35 });
    const pc = surf(c, r, [s * sep * 0.95, up * 0.9, 1], 1 + eyeR / r * 0.12);
    if (style === 'stern') {
      const n = norm3([s * sep * 0.95, up * 0.9, 1]);
      bOpen.add(flat(starShape(eyeR * 0.78, 0.5), eyeR * 0.3), iris, { p: add3(sc, n, eyeR * 0.62), r: rotTo(n, _z) });
    } else bOpen.add(P.sphere(eyeR * 0.72, ...S(12, 8)), iris, { p: pc, s: [1, 1.15, 0.7] });
    const hc = surf(c, r, [s * sep * 0.95 - 0.12, up * 0.9 + 0.18, 1], 1 + eyeR / r * 0.62);
    bOpen.add(P.sphere(eyeR * 0.26, ...S(8, 6)), 0xffffff, { p: hc, unlit: 1 });
    const hc2 = surf(c, r, [s * sep * 0.95 + 0.1, up * 0.9 - 0.12, 1], 1 + eyeR / r * 0.55);
    if (!o.lod) bOpen.add(P.sphere(eyeR * 0.12, 6, 4), 0xffffff, { p: hc2, unlit: 1 });
    if (style === 'wimpern') { // drei geschwungene Wimpern am oberen äußeren Rand (blinzeln mit)
      const n = norm3([sc[0] - c[0], sc[1] - c[1], sc[2] - c[2]]);
      const u = norm3([-n[0] * n[1], 1 - n[1] * n[1], -n[2] * n[1]]);
      let v = [u[1] * n[2] - u[2] * n[1], u[2] * n[0] - u[0] * n[2], u[0] * n[1] - u[1] * n[0]];
      if (v[0] * s < 0) v = v.map(q => -q);
      [0.35, 0.8, 1.25].forEach((a, k) => {
        const rim = norm3([v[0] * Math.cos(a) + u[0] * Math.sin(a), v[1] * Math.cos(a) + u[1] * Math.sin(a), v[2] * Math.cos(a) + u[2] * Math.sin(a)]);
        const base = add3(add3(sc, rim, eyeR * 0.98), n, eyeR * 0.28);
        const dir = norm3(add3(add3(rim, u, 0.45), n, 0.25)), L = eyeR * (0.55 - k * 0.06);
        bOpen.add(P.cone(eyeR * 0.09, L, 5), o.lash ?? 0x2a1830, { p: add3(base, dir, L / 2), r: rotTo(dir) });
      });
    }
    // Freude-Augen ^ ^
    const hp = surf(c, r, d, 1.0);
    const arc = P.torus(eyeR * 0.62, eyeR * 0.16, 4, o.lod ? 6 : 10, Math.PI);
    bHappy.add(arc, o.happyCol ?? (style === 'stern' ? 0x2a1830 : iris), { p: hp, r: [0, s * sep * 0.9, 0] });
    // Wangen
    const ch = surf(c, r, [s * 0.72, -0.1, 0.72], 0.97);
    b.add(P.sphere(r * 0.17, ...S(10, 6)), o.cheek ?? 0xff8fb0, { p: ch, s: [1, 0.6, 0.45], r: [0, s * 0.8, 0], unlit: 0.35 });
  }
  // Mund (kleines Lächeln)
  if (o.mouth !== false) {
    const m = surf(c, r, [0, -0.28, 1], 0.99);
    b.add(P.torus(r * 0.13, r * 0.035, 4, 10, Math.PI), o.mouth ?? 0x5a2030, { p: m, r: [-0.25, 0, Math.PI] });
  }
  return { eyeR, sep, up };
}
// Lächeln auf einer Schnauze
function smile(b, c, r, col = 0x5a2030, dir = [0, -0.35, 1], k = 1) {
  b.add(P.torus(r * 0.22 * k, r * 0.055 * k, 4, 10, Math.PI), col, { p: surf(c, r, dir, 0.99), r: [-0.3, 0, Math.PI] });
}

// Fühler: style kugel | herz | stern | ringel | feder
function antenna(b, c, r, s, col, tip, len = 1, style = 'kugel') {
  const base = surf(c, r, [s * 0.35, 0.8, 0.3], 0.95);
  const segs = style === 'ringel' ? 3 : 5;
  let p = base.slice(), dir = [0, 1, 0];
  const feather = style === 'feder';
  for (let i = 0; i < segs; i++) {
    const t = i / 5;
    dir = feather ? [s * (0.35 + t * 0.35), 1 - t * 0.35, 0.3 + t * 0.2] : [s * (0.25 + t * 0.4), 1 - t * 0.5, 0.35 + t * 0.35];
    const l = 0.07 * len;
    const n = add3(p, norm3(dir), l);
    rod(b, p, n, 0.012, col, 5, 0.011);
    if (feather) { // gefiederte Seitenäste (vor/zurück), zur Spitze kürzer
      const d = norm3(dir), w = norm3([0, -d[2], d[1]]);
      for (const f of [0.35, 0.8]) for (const sg of [-1, 1]) {
        const a = add3(p, d, l * f), bl = 0.075 * len * (1 - t * 0.6);
        rod(b, a, add3(a, norm3(add3(w.map(q => q * sg), d, 0.45)), bl), 0.007, tip, 4);
      }
    }
    p = n;
  }
  if (style === 'ringel') { // Ringel-Locke nach außen (erst hoch, dann außen herum)
    const out = norm3([s, 0.25, 0.1]), r0 = 0.05 * len, cc = add3(p, out, r0);
    let q = p;
    for (let k = 1; k <= 12; k++) {
      const a = k / 12 * Math.PI * 2 * 0.95, rr = r0 * (1 - k / 12 * 0.5);
      const n = add3(add3(cc, out, -Math.cos(a) * rr), [0, 1, 0], Math.sin(a) * rr);
      rod(b, q, n, 0.011, col, 5);
      q = n;
    }
    b.add(P.sphere(0.028, 8, 6), tip, { p: q, unlit: 0.1 });
  } else if (style === 'herz') b.add(flat(heartShape(0.05), 0.03), tip, { p: add3(p, [0, 0.02, 0]), r: [0, s * 0.35, 0], unlit: 0.15 });
  else if (style === 'stern') b.add(flat(starShape(0.058), 0.028), tip, { p: add3(p, [0, 0.02, 0]), r: [0, s * 0.35, 0], unlit: 0.2 });
  else b.add(P.sphere(feather ? 0.025 : 0.04, 10, 8), tip, { p, unlit: 0.1 });
}

// ---------------------------------------------------------------- Hüte & Extras
export function hatGeo(id) {
  const b = new Build();
  if (id === 'kranz') {
    b.add(P.torus(0.17, 0.025, 6, 20), 0x4f9a3a, { r: [Math.PI / 2, 0, 0] });
    const cols = [0xff7eb6, 0xffffff, 0xffd23f, 0xb38cff, 0x6ec6ff];
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2, x = Math.cos(a) * 0.17, z = Math.sin(a) * 0.17;
      for (let k = 0; k < 5; k++) b.add(petalGeo(0.07, 0.06, 0.01, 2), cols[i % 5], { p: [x, 0.02, z], r: [0, k / 5 * Math.PI * 2, 0.25], order: 'YXZ' });
      b.add(P.sphere(0.022, 6, 4), 0xffe070, { p: [x, 0.035, z], unlit: 0.3 });
    }
  } else if (id === 'krone') {
    b.add(P.cyl(0.14, 0.13, 0.1, 16), 0xffc93a, { p: [0, 0.05, 0] });
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2, x = Math.cos(a) * 0.12, z = Math.sin(a) * 0.12;
      b.add(P.cone(0.045, 0.12, 6), 0xffc93a, { p: [x, 0.15, z] });
      b.add(P.sphere(0.022, 6, 4), 0xfff2a0, { p: [x, 0.22, z], unlit: 0.4 });
      b.add(P.sphere(0.024, 6, 4), [0xff3d6a, 0x3dc8ff, 0x6aff7a, 0xc07aff, 0xff9a3d][i], { p: [Math.cos(a) * 0.143, 0.05, Math.sin(a) * 0.143], unlit: 0.5 });
    }
  } else if (id === 'schleife') {
    b.add(P.sphere(0.1, 10, 8), 0xff5fa0, { p: [-0.1, 0.05, 0], s: [1.1, 0.75, 0.4], r: [0, 0, 0.35] });
    b.add(P.sphere(0.1, 10, 8), 0xff5fa0, { p: [0.1, 0.05, 0], s: [1.1, 0.75, 0.4], r: [0, 0, -0.35] });
    b.add(P.sphere(0.045, 8, 6), 0xff8fc0, { p: [0, 0.05, 0.01] });
  } else if (id === 'party') {
    b.add(P.cone(0.13, 0.34, 14), 0xffffff, { p: [0, 0.17, 0], cf: (x, y) => (Math.floor((y + 0.17) * 18) % 2 ? 0x5fd0ff : 0xff6fb0) });
    b.add(P.sphere(0.05, 8, 6), 0xffe04a, { p: [0, 0.35, 0], unlit: 0.2 });
  } else if (id === 'stroh') {
    b.add(P.cyl(0.3, 0.3, 0.02, 20), 0xf4d58a, { p: [0, 0.01, 0] });
    b.add(new THREE.SphereGeometry(0.15, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0xf4d58a, { p: [0, 0.01, 0], s: [1, 0.9, 1] });
    b.add(P.cyl(0.152, 0.152, 0.04, 20), 0xff6f8f, { p: [0, 0.035, 0] });
    b.add(P.sphere(0.04, 6, 4), 0xffffff, { p: [0.15, 0.05, 0.03], unlit: 0.2 });
  } else if (id === 'zauber') {
    b.add(P.cyl(0.26, 0.26, 0.02, 20), 0x6a4ac8, { p: [0, 0.01, 0] });
    b.add(P.cone(0.15, 0.42, 16), 0x7a5ae0, { p: [0, 0.22, 0], r: [0, 0, -0.2] });
    b.add(flat(starShape(0.05, 0.4), 0.015), 0xffe04a, { p: [0.02, 0.22, 0.12], unlit: 0.6 });
  } else if (id === 'heiligenschein') {
    b.add(P.torus(0.17, 0.02, 6, 24), 0xfff0a0, { p: [0, 0.18, 0], r: [Math.PI / 2, 0, 0], unlit: 0.8 });
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; b.add(P.sphere(0.03, 6, 4), 0xffffff, { p: [Math.cos(a) * 0.17, 0.18, Math.sin(a) * 0.17], unlit: 1 }); }
  } else if (id === 'propeller') { // Kappe in vier Farben, Schirm nach vorn, Stab – Rotorblätter extra (drehen sich)
    const Q = [0xff5a6e, 0x4fc8ff, 0xffd84a, 0x7ee06a];
    b.add(new THREE.SphereGeometry(0.15, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0xffffff, { p: [0, 0, 0], s: [1, 0.8, 1], cf: (x, y, z) => Q[((Math.atan2(z, x) / (Math.PI / 2) + 4) | 0) % 4] });
    b.add(P.cyl(0.1, 0.11, 0.012, 16), 0x3f6fff, { p: [0, 0.004, 0.1], s: [1, 1, 0.7] });
    b.add(P.cyl(0.012, 0.012, 0.1, 6), 0x8a8aa0, { p: [0, 0.16, 0] });
    b.add(P.sphere(0.022, 8, 6), 0xffd84a, { p: [0, 0.21, 0], unlit: 0.2 });
  } else if (id === 'pizza') { // ganze Mini-Pizza (ein Stück fehlt), nach vorn gekippt → Belag sichtbar
    const E = new THREE.Euler(0.36, 0, 0.2), m = new THREE.Matrix4().makeRotationFromEuler(E), tilt = [E.x, E.y, E.z];
    const at = (x, y, z) => { const v = new THREE.Vector3(x, y, z).applyMatrix4(m); return [v.x, v.y + 0.06, v.z]; };
    const th0 = 2.3, span = Math.PI * 1.72;
    b.add(new THREE.CylinderGeometry(0.235, 0.235, 0.03, 26, 1, false, th0, span), 0xf0c070, { p: at(0, 0, 0), r: tilt });
    b.add(new THREE.CylinderGeometry(0.205, 0.205, 0.014, 26, 1, false, th0 + 0.03, span - 0.06), 0xffd84a, { p: at(0, 0.018, 0), r: tilt });
    for (let i = 0; i <= 22; i++) { const t = th0 + span * i / 22; b.add(P.sphere(0.03, 8, 6), 0xd8903a, { p: at(Math.sin(t) * 0.215, 0.02, Math.cos(t) * 0.215) }); }
    for (let i = 0; i < 7; i++) {
      const t = th0 + span * (i + 0.5) / 7, r = i % 2 ? 0.145 : 0.075, x = Math.sin(t) * r, z = Math.cos(t) * r;
      b.add(P.cyl(0.036, 0.036, 0.012, 12), 0xd8303a, { p: at(x, 0.03, z), r: tilt });
      if (i % 3 === 1) b.add(P.sphere(0.022, 6, 4), 0x4aa83a, { p: at(x * 0.7 + 0.03, 0.035, z * 0.7), s: [1.3, 0.35, 0.8] });
    }
  } else if (id === 'helm') return null; // eigener Aufbau (Glaskugel um den Kopf)
  else return null;
  return b.build();
}

// ---------------------------------------------------------------- Figur
const _tex = {};
const tex = (key, make) => _tex[key] || (_tex[key] = make());
const SKIN_BODY = { // Körperfarben, die ein Skin mitbringt (Panzer/Streifen)
  regenbogen: { bands: [0xff5a6e, 0xff9a3c, 0xffd84a, 0x7ee06a, 0x4fc8ff, 0x8a7bff, 0xd67cff] },
  melone: { a: 0xff5a6a, c: 0x2e8b3a, spot: 0x2a1a1a },
  galaxie: { a: 0x2a2466, c: 0x7a5aff, spot: 0xfff2a0 },
  disco: { a: 0xe4e8f4, c: 0x9aa0b8, spot: 0xffffff },
  leucht: { a: 0xb6ff8a, c: 0x5affd6, spot: 0xfffbd0 },
};

export class Critter {
  constructor(kind = 'schmetterling', look = {}) {
    this.kind = kind;
    this.root = new THREE.Group();      // Position/Gier
    this.tilt = new THREE.Group();      // Neigung/Rolle (+ Größe)
    this.body = new THREE.Group();      // Squash & Stretch
    this.root.add(this.tilt); this.tilt.add(this.body);
    this.mats = []; this.geos = [];
    this.flapT = Math.random() * 6; this.blinkT = 2; this.happyT = 0; this.squash = 0; this.squashV = 0;
    this.rollAng = 0; this.rollVel = 0; this.rollTarget = 0; // Deko-Schraube (Feder, Steuerung bleibt frei)
    this.build(look);
  }
  mat(o) { const m = toonMat(o); this.mats.push(m); return m; }
  // Schmetterlingsartige Flügel (Maske oder Skin). shape = Umriss, dims = Ebenenmaße
  sheetWings(L, shape, pat, o) {
    const skin = L.skin && L.skin !== 'none' ? L.skin : null;
    const form = L.wing || 'rund';
    const stretch = o.stretch ? o.stretch[form] || [1, 1] : (form === 'lang' ? [1.15, 0.92] : [1, 1]);
    const mshape = o.shapes ? o.shapes[form] : shape;
    let wm;
    if (skin) wm = this.mat({ map: tex('s:' + skin + ':' + mshape, () => skinWing(skin, mshape)), trans: true, alphaTest: 0.5, side: THREE.DoubleSide, rim: 0.5, soft: 0.3, emis: skin === 'leucht' ? 0.55 : 0.05 });
    else wm = this.mat({ map: tex('m:' + pat + ':' + mshape, () => wingMask(pat, mshape)), wing: true, alphaTest: 0.5, side: THREE.DoubleSide, rim: 0.5, wa: o.wa ?? L.a, wb: o.wb ?? L.b, wc: o.wc ?? L.c, soft: 0.3 });
    this.wingMat = wm; this.fxMat(wm, skin);
    const W = o.w * stretch[0], H = o.h * stretch[1];
    for (const s of [1, -1]) {
      const g = new THREE.PlaneGeometry(W, H); g.rotateX(Math.PI / 2); g.translate(W / 2 - 0.005, 0, o.z * stretch[1]);
      if (s < 0) g.rotateZ(Math.PI);
      const piv = new THREE.Group(); piv.position.set(o.px * s, o.py, o.pz);
      const m = new THREE.Mesh(g, wm); piv.add(m); this.body.add(piv);
      this.wings.push({ piv, s, base: o.base, amp: o.amp, freq: o.freq });
    }
    this.wingSpan = W * 0.78;
  }
  // Glasflügel. specs: [{w,h,tx,tz,px,py,pz,ry,base,amp,freq,ph}], shape: bee|round|long
  glassWings(L, shape, specs, tint = 0xffffff) {
    const skin = L.skin && L.skin !== 'none' ? L.skin : null, form = L.wing || 'rund';
    const tshape = form === 'spitz' ? (shape === 'long' ? 'longtip' : 'tip') : shape;
    const st = form === 'lang' ? [1.3, 0.85] : [1, 1];
    const gm = this.mat({ map: tex('g:' + tshape + ':' + (skin || ''), () => glassWing(tshape, skin)), transparent: true, side: THREE.DoubleSide, rim: 1.2, soft: 0.3, emis: skin === 'leucht' ? 0.6 : skin ? 0.2 : 0.15, color: skin ? 0xffffff : tint });
    this.fxMat(gm, skin);
    for (const w of specs) for (const s of [1, -1]) {
      const W = w.w * st[0], H = w.h * st[1];
      const g = new THREE.PlaneGeometry(W, H); g.rotateX(Math.PI / 2); g.translate(W / 2, 0, w.tz || 0);
      if (s < 0) g.rotateZ(Math.PI);
      const piv = new THREE.Group(); piv.position.set(w.px * s, w.py, w.pz); piv.rotation.y = (w.ry || 0) * s;
      piv.add(new THREE.Mesh(g, gm)); this.body.add(piv);
      this.wings.push({ piv, s, base: w.base, amp: w.amp, freq: w.freq, ph: w.ph || 0 });
    }
    this.wingSpan = specs[0].w * st[0] * 0.8;
  }
  fxMat(m, skin) { if (skin === 'disco') this.disco.push(m); if (skin === 'leucht') this.glow.push(m); }

  build(look) {
    const k = this.kind;
    this._seatPts = null; this.footY = -0.25;
    const L = fullLook(k, look);
    this.look = L;
    const b = new Build(), bO = new Build(), bH = new Build();
    let head, headR, fo;
    this.wings = []; this.shells = null; this.disco = []; this.glow = []; this.spinner = null; this.cape = null;
    const skin = L.skin !== 'none' ? L.skin : null, SB = skin ? SKIN_BODY[skin] : null;
    const eyes = L.eyes, antLen = L.hat === 'helm' ? 0.55 : 1;
    // Anker für Accessoires (je Figur überschrieben)
    let hatLift = 0, hatBack = 0.1, hatTilt = -0.15, cape = null, snout = null, stache = null;
    const body = this.body;
    if (k === 'schmetterling') {
      const dark = 0x4a3048;
      head = [0, 0.1, 0.34]; headR = 0.24;
      b.add(P.sphere(headR, 20, 14), dark, { p: head });
      b.add(P.sphere(0.14, 14, 10), dark, { p: [0, 0.02, 0.1], s: [1, 1, 1.25] });
      b.add(P.sphere(0.11, 14, 10), dark, { p: [0, -0.02, -0.28], s: [0.95, 0.95, 2.6], cf: (x, y, z) => (Math.floor((z + 0.11) * 40) % 2 ? 0x5a3a58 : undefined) });
      fo = face(b, bO, bH, head, headR, { iris: L.e ?? 0x1e1226, cheek: 0xff8fb8, style: eyes });
      antenna(b, head, headR, -1, dark, L.e ?? L.a, antLen, L.ant); antenna(b, head, headR, 1, dark, L.e ?? L.a, antLen, L.ant);
      this.sheetWings(L, 'rund', L.pattern || 'monarch', { w: 1.25, h: 1.25, z: -0.18, px: 0.05, py: 0.08, pz: 0.06, base: 0.32, amp: 0.95, freq: 1, shapes: { rund: 'rund', spitz: 'spitz', lang: 'lang' } });
      cape = { at: [0, 0.15, 0.13], len: 0.72, w: 0.34, droop: 0.3 };
    } else if (k === 'marienkaefer') {
      const black = L.b;
      head = [0, 0.04, 0.4]; headR = 0.2;
      b.add(P.sphere(0.27, 16, 12), black, { p: [0, -0.04, -0.04], s: [1, 0.62, 1.1] });
      b.add(P.sphere(headR, 20, 14), black, { p: head });
      fo = face(b, bO, bH, head, headR, { iris: L.e ?? 0x2a2030, cheek: 0xff7aa0, sep: 0.44, style: eyes });
      const tipC = L.e ?? lerpHex(black, 0xffffff, 0.12);
      antenna(b, head, headR, -1, black, tipC, 0.8 * antLen, L.ant); antenna(b, head, headR, 1, black, tipC, 0.8 * antLen, L.ant);
      // Deckflügel (zwei Hälften, klappen im Flug auf)
      this.shells = [];
      const shellMat = this.mat({ vc: true, gloss: skin === 'disco' ? 1.4 : 0.9, rim: 0.45, soft: 0.05, emis: skin === 'leucht' ? 0.45 : 0 });
      this.fxMat(shellMat, skin);
      const shellA = SB ? (SB.a ?? L.a) : L.a, spotC = SB ? (SB.spot ?? L.c) : L.c;
      for (const s of [1, -1]) {
        const sb = new Build();
        const g = new THREE.SphereGeometry(0.4, 18, 12, s > 0 ? Math.PI / 2 : -Math.PI / 2, Math.PI, 0, Math.PI * 0.56);
        const cf = SB && SB.bands ? (x, y, z) => SB.bands[Math.max(0, Math.min(SB.bands.length - 1, Math.floor((0.42 - z) / 0.84 * SB.bands.length)))]
          : skin === 'melone' ? (x, y, z) => (y < 0.08 ? (y < 0.03 ? 0x2e8b3a : 0xb8f090) : undefined) : undefined;
        sb.add(g, shellA, { p: [0, 0, 0], s: [1, 0.82, 1.12], cf });
        const spots = skin === 'galaxie' || skin === 'disco' || skin === 'leucht'
          ? [[0.15, 0.26, 0.12, 0.035], [0.25, 0.15, -0.14, 0.03], [0.11, 0.24, -0.28, 0.03], [0.3, 0.05, 0.1, 0.025], [0.22, 0.25, -0.02, 0.028], [0.3, 0.12, -0.3, 0.025], [0.06, 0.3, 0.02, 0.022]]
          : [[0.15, 0.26, 0.12, 0.075], [0.25, 0.15, -0.14, 0.065], [0.11, 0.24, -0.28, 0.06], [0.3, 0.05, 0.1, 0.05]];
        spots.forEach(([x, y, z, r]) => {
          const n = new THREE.Vector3(x, y / 0.8, z / 1.15).normalize();
          const pp = [n.x * 0.4 * 0.97 * s, n.y * 0.4 * 0.82 * 0.97, n.z * 0.4 * 1.12 * 0.97];
          sb.add(P.sphere(r, 10, 8), spotC, { p: pp, s: skin === 'melone' ? [0.7, 0.7, 1.3] : 1, unlit: skin === 'galaxie' || skin === 'leucht' ? 0.8 : 0 });
        });
        const piv = new THREE.Group(); piv.position.set(0, 0.02, -0.02);
        const geo = sb.build(); this.geos.push(geo);
        piv.add(new THREE.Mesh(geo, shellMat)); body.add(piv);
        this.shells.push({ piv, s });
      }
      b.add(P.sphere(0.035, 8, 6), shellA, { p: [0, 0.3, 0.12], s: [1, 0.5, 1] }); // Nackenpunkt
      this.glassWings(L, 'bee', [{ w: 0.8, h: 0.5, tz: -0.1, px: 0.05, py: 0.12, pz: 0.02, ry: -0.35, base: 0.35, amp: 0.55, freq: 2.6 }]);
      cape = { at: [0, 0.3, 0.22], len: 0.7, w: 0.34, droop: 0.2 };
    } else if (k === 'biene' || k === 'hummel') {
      const hum = k === 'hummel';
      const stripe = SB ? (SB.c ?? L.c) : L.c, fur = SB ? (SB.a ?? L.a) : L.a;
      head = hum ? [0, 0.1, 0.34] : [0, 0.12, 0.34]; headR = hum ? 0.22 : 0.23;
      if (hum) {
        const bands = SB && SB.bands ? SB.bands.slice(0, 6) : [stripe, fur, stripe, L.b, L.b];
        bandSphere(b, 0.3, [0, -0.01, -0.22], [1, 0.95, 1.15], bands, { w: 20, h: 4, fuzz: 0.012 });
        b.add(fuzzy(P.sphere(0.215, 18, 14), 0.012), fur, { p: [0, 0.06, 0.08] });
        b.add(P.sphere(headR, 20, 14), stripe, { p: head });
      } else {
        const bands = SB && SB.bands ? SB.bands.slice(0, 6) : [fur, stripe, fur, stripe, fur, stripe];
        bandSphere(b, 0.28, [0, 0, -0.26], [1, 0.95, 1.3], bands);
        b.add(P.sphere(0.2, 16, 12), new THREE.Color(fur).multiplyScalar(0.92).getHex(), { p: [0, 0.05, 0.08] });
        b.add(P.sphere(headR, 20, 14), fur, { p: head });
        b.add(P.cone(0.04, 0.1, 8), stripe, { p: [0, -0.02, -0.66], r: [-Math.PI / 2, 0, 0] });
      }
      fo = face(b, bO, bH, head, headR, { iris: L.e ?? 0x2a1a10, cheek: hum ? 0xff8a9a : 0xff7a7a, eye: hum ? 0.43 : 0.4, style: eyes });
      antenna(b, head, headR, -1, stripe, L.e ?? stripe, (hum ? 0.8 : 0.9) * antLen, L.ant); antenna(b, head, headR, 1, stripe, L.e ?? stripe, (hum ? 0.8 : 0.9) * antLen, L.ant);
      if (hum) this.glassWings(L, 'round', [{ w: 0.62, h: 0.46, tz: -0.06, px: 0.1, py: 0.24, pz: 0.04, ry: -0.4, base: 0.55, amp: 0.45, freq: 3.4 }]);
      else this.glassWings(L, 'bee', [{ w: 0.75, h: 0.46, tz: -0.08, px: 0.08, py: 0.2, pz: 0.06, ry: -0.4, base: 0.5, amp: 0.45, freq: 3.2 }], L.b);
      cape = hum ? { at: [0, 0.28, 0.14], len: 0.72, w: 0.36, droop: 0.28 } : { at: [0, 0.25, 0.16], len: 0.74, w: 0.34, droop: 0.28 };
    } else if (k === 'libelle') {
      head = [0, 0.06, 0.42]; headR = 0.2;
      const ca = SB ? (SB.a ?? L.a) : L.a, cb = SB ? (SB.c ?? L.b) : L.b;
      b.add(P.sphere(headR, 20, 14), L.a, { p: head });
      b.add(P.sphere(0.13, 14, 10), L.a, { p: [0, 0.02, 0.2], s: [1, 1, 1.3] });
      for (let i = 0; i < 7; i++) b.add(P.sphere(0.065 - i * 0.003, 10, 8), SB && SB.bands ? SB.bands[i % SB.bands.length] : (i % 2 ? ca : cb), { p: [0, 0, 0.02 - i * 0.12], s: [1, 1, 1.25] });
      fo = face(b, bO, bH, head, headR, { iris: L.e ?? 0x10303a, cheek: 0xff8fb0, eye: 0.46, sep: 0.46, style: eyes });
      antenna(b, head, headR, -1, L.c, L.e ?? L.b, 0.6 * antLen, L.ant); antenna(b, head, headR, 1, L.c, L.e ?? L.b, 0.6 * antLen, L.ant);
      const sp = [0, 1].map(f => ({ w: 1.05, h: 0.26, tz: 0, px: 0.05, py: 0.1, pz: 0.22 - f * 0.18, ry: f ? -0.12 : 0.1, base: 0.1, amp: 0.45, freq: 2.2, ph: f * 1.6 }));
      this.glassWings(L, 'long', sp);
      cape = { at: [0, 0.14, 0.26], len: 0.8, w: 0.28, droop: 0.12 };
    } else if (k === 'mondfalter') {
      const fluff = 0xf6f0e6;
      head = [0, 0.08, 0.34]; headR = 0.23;
      b.add(fuzzy(P.sphere(headR, 20, 14), 0.008), fluff, { p: head });
      b.add(fuzzy(P.sphere(0.165, 16, 12), 0.014), fluff, { p: [0, 0.02, 0.1], s: [1, 1, 1.2] });
      b.add(fuzzy(P.sphere(0.12, 14, 10), 0.01), fluff, { p: [0, -0.02, -0.27], s: [0.95, 0.95, 2.4], cf: (x, y, z) => (Math.floor((z + 0.12) * 36) % 2 ? 0xe8dccc : undefined) });
      b.add(P.torus(0.14, 0.03, 6, 18), L.c, { p: [0, 0.03, 0.2], s: [1, 0.9, 1] }); // Kragen
      fo = face(b, bO, bH, head, headR, { iris: L.e ?? 0x2a1a30, cheek: 0xff9ab8, style: eyes, outline: 0x8a7a9a, eye: 0.42 });
      const tip = L.e ?? 0xe0b070;
      antenna(b, head, headR, -1, 0xc89a5a, tip, antLen, L.ant); antenna(b, head, headR, 1, 0xc89a5a, tip, antLen, L.ant);
      this.sheetWings(L, 'luna', L.pattern || 'augen', { w: 1.25, h: 1.25, z: -0.2, px: 0.05, py: 0.08, pz: 0.06, base: 0.3, amp: 0.85, freq: 0.9, shapes: { rund: 'luna', spitz: 'spitz', lang: 'luna' }, stretch: { rund: [1, 1], spitz: [1, 1], lang: [1.12, 1.1] } });
      cape = { at: [0, 0.18, 0.13], len: 0.72, w: 0.34, droop: 0.3 };
    } else if (k === 'drache') {
      head = [0, 0.16, 0.32]; headR = 0.25;
      const belly = L.b, spike = L.c;
      b.add(P.sphere(0.24, 18, 14), L.a, { p: [0, 0, -0.06], s: [1, 0.95, 1.25] });
      b.add(P.sphere(0.2, 16, 12), belly, { p: [0, -0.07, 0.02], s: [0.85, 0.8, 1.15] });
      b.add(P.sphere(headR, 20, 14), L.a, { p: head });
      snout = { c: [0, 0.05, 0.53], r: 0.14 };
      b.add(P.sphere(snout.r, 16, 12), belly, { p: snout.c, s: [1.05, 0.7, 0.95] });
      [-1, 1].forEach(s => b.add(P.sphere(0.018, 8, 6), 0x3a2a2a, { p: [s * 0.045, 0.1, 0.645] }));
      smile(b, [0, 0.05, 0.53], 0.135, 0x5a2030, [0, -0.25, 1]);
      fo = face(b, bO, bH, head, headR, { iris: L.e ?? 0x1e2a30, cheek: 0xff8fb0, up: 0.36, sep: 0.46, eye: 0.4, mouth: false, style: eyes });
      for (const s of [-1, 1]) {
        const hp = surf(head, headR, [s * 0.42, 0.85, -0.3], 0.92), hd = norm3([s * 0.35, 1, -0.45]);
        b.add(P.cone(0.045, 0.15, 10), belly, { p: add3(hp, hd, 0.07), r: rotTo(hd) });
        const ep = surf(head, headR, [s * 0.95, 0.35, -0.1], 0.95), ed = norm3([s, 0.45, -0.3]);
        b.add(P.cone(0.05, 0.13, 8), L.a, { p: add3(ep, ed, 0.05), r: rotTo(ed), s: [1, 1, 0.45] });
      }
      if (L.extra !== 'umhang') [[0.13, 0.19], [-0.02, 0.23], [-0.17, 0.2], [-0.3, 0.12]].forEach(([z, y], i) => b.add(P.cone(0.042 - i * 0.004, 0.1, 8), spike, { p: [0, y, z], r: [-0.35, 0, 0] }));
      for (let i = 0; i <= 16; i++) { // Schwanz, am Ende nach oben geschwungen (dicht → glatt)
        const t = i / 16, z = -0.34 - t * 0.44, y = -0.03 + t * t * 0.26;
        b.add(P.sphere(0.085 - t * 0.045, 12, 8), L.a, { p: [0, y, z] });
      }
      b.add(flat(heartShape(0.07), 0.03), spike, { p: [0, 0.27, -0.83], r: [0, Math.PI / 2, 0.5] });
      [[0.14, 0.14], [-0.14, 0.14], [0.15, -0.2], [-0.15, -0.2]].forEach(([x, z]) => b.add(P.sphere(0.065, 10, 8), L.a, { p: [x, -0.19, z], s: [1, 0.8, 1.2] }));
      this.sheetWings(L, 'drache', 'membran', { w: 0.95, h: 0.95, z: -0.12, px: 0.08, py: 0.2, pz: -0.02, base: 0.45, amp: 0.7, freq: 1.1, wa: L.a, wb: belly, wc: spike, stretch: { rund: [1, 1], spitz: [1.1, 0.82], lang: [1.3, 0.88] } });
      hatLift = 0.02; cape = { at: [0, 0.22, 0.14], len: 0.66, w: 0.36, droop: 0.28 };
    } else if (k === 'einhorn') {
      const pearl = 0xfffafc;
      head = [0, 0.12, 0.36]; headR = 0.24;
      b.add(P.sphere(headR, 20, 14), pearl, { p: head });
      snout = { c: [0, 0.03, 0.54], r: 0.13 };
      b.add(P.sphere(snout.r, 16, 12), 0xffe2ee, { p: snout.c, s: [1, 0.82, 0.88] });
      [-1, 1].forEach(s => b.add(P.sphere(0.016, 8, 6), 0xe08aa8, { p: [s * 0.042, 0.07, 0.65] }));
      smile(b, snout.c, 0.12, 0xc04a78, [0, -0.3, 1]);
      fo = face(b, bO, bH, head, headR, { iris: L.e ?? 0x7a4ac8, cheek: 0xff9ac0, up: 0.34, sep: 0.46, eye: 0.42, mouth: false, style: eyes, outline: 0xc8a8d8, lash: 0x5a3a7a });
      const hd = norm3([0, 0.86, 0.5]), hb = add3(head, hd, headR * 0.9);
      b.add(P.cone(0.05, 0.25, 14, 1), 0xfff4c0, { p: add3(hb, hd, 0.12), r: rotTo(hd), cf: (x, y, z) => (Math.floor(y * 42 + Math.atan2(x, z) * 1.3) % 2 ? 0xffd86a : undefined) });
      for (const s of [-1, 1]) {
        const ed = norm3([s * 0.62, 0.75, -0.2]), ep = add3(head, ed, headR * 0.9);
        b.add(P.cone(0.055, 0.13, 10), pearl, { p: add3(ep, ed, 0.05), r: rotTo(ed), s: [1, 1, 0.55] });
        b.add(P.cone(0.032, 0.08, 8), 0xffb0cc, { p: add3(add3(ep, ed, 0.045), [0, 0, 0.018]), r: rotTo(ed), s: [1, 1, 0.4] });
      }
      const MANE = [0xff9ec8, 0xffc890, 0xfff08a, 0xa8f0b0, 0x9ad0ff, 0xc8a8ff, 0xff9ec8];
      MANE.forEach((col, i) => { const ph = 0.35 + i * 0.3; b.add(P.sphere(0.075 - i * 0.004, 12, 8), col, { p: add3(head, [(i % 2 ? 0.03 : -0.03), Math.cos(ph), -Math.sin(ph)], headR * 0.98) }); });
      b.add(P.sphere(0.15, 14, 10), pearl, { p: [0, 0.02, 0.1], s: [1, 1, 1.2] });
      b.add(P.sphere(0.11, 14, 10), pearl, { p: [0, -0.02, -0.28], s: [0.95, 0.95, 2.5], cf: (x, y, z) => (Math.floor((z + 0.11) * 40) % 2 ? 0xffe0f0 : undefined) });
      MANE.slice(0, 5).forEach((col, i) => b.add(P.sphere(0.055, 10, 8), col, { p: [(i - 2) * 0.03, 0.02 + i * 0.012, -0.58 - i * 0.03] }));
      this.sheetWings(L, 'rund', L.pattern || 'verlauf', { w: 1.2, h: 1.2, z: -0.18, px: 0.05, py: 0.1, pz: 0.06, base: 0.32, amp: 0.9, freq: 1, shapes: { rund: 'rund', spitz: 'spitz', lang: 'lang' } });
      hatBack = 0.42; hatTilt = -0.4; hatLift = 0.06;
      cape = { at: [0, 0.16, 0.13], len: 0.72, w: 0.34, droop: 0.3 };
    } else { // Flugkatze
      head = [0, 0.16, 0.34]; headR = 0.26;
      const fur = L.a, light = L.b, str = L.c;
      b.add(P.sphere(headR, 20, 14), fur, { p: head, cf: (x, y, z) => (y > 0.12 && z > -0.05 && Math.abs(x) < 0.11 && (Math.floor((x + 0.2) * 34) % 3 === 0) ? str : undefined) });
      [-1, 1].forEach(s => b.add(P.sphere(0.11, 12, 10), fur, { p: [s * 0.17, 0.07, 0.38] }));
      snout = { c: [0, 0.1, 0.56], r: 0.08 };
      [-1, 1].forEach(s => b.add(P.sphere(0.066, 12, 10), light, { p: [s * 0.05, 0.08, 0.565] }));
      b.add(P.sphere(0.034, 10, 8), 0xff8fb0, { p: [0, 0.125, 0.6], s: [1.25, 0.8, 0.8] });
      for (const s of [-1, 1]) for (let w = -1; w <= 1; w++) { const a0 = [s * 0.09, 0.085 + w * 0.012, 0.585]; rod(b, a0, add3(a0, norm3([s, w * 0.2, -0.15]), 0.2), 0.005, 0x5a3a2a, 4); }
      fo = face(b, bO, bH, head, headR, { iris: L.e ?? 0x4a9a3a, cheek: 0xff9ab0, up: 0.22, sep: 0.44, eye: 0.42, mouth: false, style: eyes });
      for (const s of [-1, 1]) {
        const ed = norm3([s * 0.55, 0.85, 0.02]), ep = add3(head, ed, headR * 0.86);
        b.add(P.cone(0.1, 0.19, 12), fur, { p: add3(ep, ed, 0.07), r: rotTo(ed), s: [1, 1, 0.5] });
        b.add(P.cone(0.06, 0.12, 10), 0xffa0b8, { p: add3(add3(ep, ed, 0.07), [0, -0.01, 0.03]), r: rotTo(ed), s: [1, 1, 0.3] });
      }
      b.add(P.sphere(0.22, 18, 14), fur, { p: [0, 0, -0.1], s: [1, 0.95, 1.45], cf: (x, y, z) => (y > 0.08 && Math.floor((z + 1) * 11) % 2 ? str : undefined) });
      b.add(P.sphere(0.16, 14, 10), light, { p: [0, -0.07, 0.01], s: [0.82, 0.78, 1.3] });
      [[0.12, 0.14], [-0.12, 0.14], [0.13, -0.3], [-0.13, -0.3]].forEach(([x, z]) => b.add(P.sphere(0.066, 10, 8), light, { p: [x, -0.19, z], s: [1, 0.8, 1.2] }));
      for (let i = 0; i <= 20; i++) { const t = i / 20; b.add(P.sphere(0.062 - t * 0.012, 10, 8), i >= 19 ? light : (Math.floor(i / 3) % 2 ? str : fur), { p: [0, 0.02 + Math.pow(t, 1.6) * 0.42, -0.42 - Math.sin(t * 1.6) * 0.3] }); }
      this.sheetWings(L, 'feder', 'feder', { w: 0.95, h: 0.95, z: -0.1, px: 0.08, py: 0.18, pz: 0.02, base: 0.45, amp: 0.65, freq: 1, wa: light, wb: 0xffffff, wc: 0xc8b8a8, stretch: { rund: [1, 1], spitz: [1.12, 0.8], lang: [1.3, 0.88] } });
      hatLift = 0.04;
      cape = { at: [0, 0.21, 0.12], len: 0.66, w: 0.36, droop: 0.28 };
    }
    this.headPos = new THREE.Vector3(...head); this.headR = headR; this.faceInfo = fo;
    this.faceCol = snout ? (k === 'katze' ? L.b : k === 'einhorn' ? 0xffe2ee : L.b) : { schmetterling: 0x4a3048, marienkaefer: L.b, hummel: L.c, mondfalter: 0xf6f0e6 }[k] ?? L.a;
    const vmat = this.mat({ vc: true, rim: 0.6, gloss: 0.35, soft: 0.08 });
    this.mainMat = vmat;
    this.bodyMesh = new THREE.Mesh(b.build(), vmat); body.add(this.bodyMesh);
    // Augen in eigener Gruppe (Blinzeln = y-Skalierung um Augenhöhe)
    this.eyes = new THREE.Group(); this.eyes.position.set(0, head[1] + headR * 0.15, 0);
    const eo = bO.build(); eo.translate(0, -(head[1] + headR * 0.15), 0);
    this.eyesOpen = new THREE.Mesh(eo, vmat); this.eyes.add(this.eyesOpen);
    const eh = bH.build(); eh.translate(0, -(head[1] + headR * 0.15), 0);
    this.eyesHappy = new THREE.Mesh(eh, vmat); this.eyesHappy.visible = false; this.eyes.add(this.eyesHappy);
    body.add(this.eyes);
    this.hatAnchor = new THREE.Group();
    this.hatAnchor.position.set(head[0], head[1] + headR * 0.86 + hatLift, head[2] - headR * hatBack);
    this.hatAnchor.rotation.x = hatTilt;
    body.add(this.hatAnchor);
    this.capeDef = cape; this.snout = snout;
    this.setHat(L.hat || 'none');
    this.setExtra(L.extra || 'none');
    const sz = SIZES.find(s => s.id === L.size) || SIZES[2];
    this.size = sz.k; this.tilt.scale.setScalar(sz.k);
  }
  setHat(id) {
    this._seatPts = null;
    if (this.hat) { this.hat.parent && this.hat.parent.remove(this.hat); this.hat.traverse(o => o.geometry && o.geometry.dispose()); this.hat = null; }
    this.spinner = null;
    if (id === 'helm') return this.buildHelmet();
    const g = hatGeo(id);
    if (g) {
      this.hat = new THREE.Mesh(g, this.mainMat); this.hat.scale.setScalar(this.headR / 0.22); this.hatAnchor.add(this.hat);
      if (id === 'propeller') {
        const pb = new Build();
        pb.add(P.sphere(0.1, 10, 6), 0xff5a6e, { p: [0.09, 0, 0], s: [1, 0.18, 0.32] });
        pb.add(P.sphere(0.1, 10, 6), 0x7ee06a, { p: [-0.09, 0, 0], s: [1, 0.18, 0.32] });
        pb.add(P.sphere(0.025, 8, 6), 0xffd84a, { unlit: 0.2 });
        this.spinner = new THREE.Mesh(pb.build(), this.mainMat); this.spinner.position.y = 0.2; this.hat.add(this.spinner);
      }
    }
  }
  // Astronauten-Helm: Glaskugel um den Kopf + Kragen + Antenne mit rotem Knopf
  buildHelmet() {
    const R = this.headR, h = this.headPos, grp = new THREE.Group();
    const rr = R * 1.55;
    const glass = this.mat({ color: 0xdff4ff, transparent: true, opacity: 0.22, rim: 2.2, gloss: 1.2, soft: 0.2, depthWrite: false });
    const bubble = new THREE.Mesh(new THREE.SphereGeometry(rr, 24, 16), glass); bubble.position.set(h.x, h.y + R * 0.18, h.z + R * 0.05); bubble.renderOrder = 3;
    const rb = new Build();
    const cd = norm3([0, -0.62, -0.78]), cc = add3([h.x, h.y + R * 0.18, h.z + R * 0.05], cd, rr * 0.9);
    rb.add(P.torus(rr * 0.5, R * 0.14, 8, 24), 0xf4f6ff, { p: cc, r: rotTo(cd, _z) });
    rb.add(P.cyl(0.008, 0.008, R * 0.6, 5), 0x9aa4c4, { p: [h.x + R * 0.55, h.y + R * 0.18 + rr * 0.98, h.z - R * 0.15], r: [0, 0, -0.35] });
    rb.add(P.sphere(R * 0.1, 8, 6), 0xff5a6e, { p: [h.x + R * 0.66, h.y + R * 0.18 + rr * 0.98 + R * 0.28, h.z - R * 0.15], unlit: 0.6 });
    // Glanzstreifen
    rb.add(P.torus(rr * 0.7, R * 0.035, 4, 14, 1.1), 0xffffff, { p: [h.x, h.y + R * 0.18, h.z + R * 0.05], r: [0.2, -0.5, 2.1], unlit: 1 });
    const ring = new THREE.Mesh(rb.build(), this.mainMat);
    grp.add(ring); grp.add(bubble);
    this.body.add(grp); this.hat = grp;
  }
  setExtra(id) {
    this._seatPts = null;
    if (this.extra) { this.extra.parent && this.extra.parent.remove(this.extra); this.extra.geometry.dispose(); this.extra = null; }
    this.cape = null;
    if (id === 'none' || !id) return;
    const b = new Build(), h = this.headPos.toArray(), R = this.headR, fo = this.faceInfo;
    if (id === 'brille') { // Herz-Sonnenbrille: dunkle Herz-Gläser mit pinkem Rand, Steg, Bügel
      const pts = [];
      for (const s of [-1, 1]) {
        const d = [s * fo.sep, fo.up, 1], ec = surf(h, R, d, 1 - fo.eyeR / R * 0.45), n = norm3([ec[0] - h[0], ec[1] - h[1], ec[2] - h[2]]);
        const c = add3(ec, n, fo.eyeR * 0.95), rot = rotTo(n, _z), hr = fo.eyeR * 1.05;
        b.add(flat(heartShape(hr * 1.18), fo.eyeR * 0.12), 0xff4fa0, { p: add3(c, n, -fo.eyeR * 0.05), r: rot });
        b.add(flat(heartShape(hr), fo.eyeR * 0.14), 0x3a1840, { p: c, r: rot });
        b.add(P.sphere(hr * 0.2, 6, 4), 0xffffff, { p: add3(add3(c, n, fo.eyeR * 0.08), [s * -hr * 0.35, hr * 0.3, 0]), s: [1, 0.6, 0.4], unlit: 1 });
        pts.push({ c, n, hr, s });
        const side = add3(c, [s * hr * 1.2, hr * 0.25, 0]), back = surf(h, R, [s * 1, 0.3, -0.25], 1.02);
        rod(b, side, back, fo.eyeR * 0.06, 0xff4fa0, 5);
      }
      const [l, r] = pts;
      rod(b, add3(l.c, [l.hr * 0.5, l.hr * 0.35, 0]), add3(r.c, [-r.hr * 0.5, r.hr * 0.35, 0]), fo.eyeR * 0.06, 0xff4fa0, 5);
    } else if (id === 'bart') { // geschwungener Schnurrbart (auf Schnauze oder Kopf); auf dunklem Kopf karamellfarben
      const S = this.snout, c = S ? S.c : h, r = S ? S.r : R, y0 = S ? 0.25 : -0.14;
      const k = S ? r / 0.24 * 1.3 : R / 0.24, dark = new THREE.Color(this.faceCol ?? 0xffffff).getHSL({}).l < 0.3;
      const col = dark ? 0xc88a58 : 0x5a3a28, n = S ? 10 : 12;
      for (const s of [-1, 1]) for (let i = 0; i < n; i++) {
        const t = i / (n - 1), dir = S ? [s * (0.04 + t * 0.7), y0 - 0.1 * Math.sin(t * Math.PI) + t * t * 0.5, 1] : [s * (0.03 + t * 0.62), y0 - 0.07 * Math.sin(t * Math.PI) + t * t * 0.34, 1];
        b.add(P.sphere((S ? 0.056 : 0.047) * k * (1 - t * (S ? 0.5 : 0.62)), 10, 8), col, { p: surf(c, r, dir, (S ? 1.05 : 1.02) + t * (S ? 0.14 : 0.08)), s: [1.25, 0.8, 0.8] });
      }
    } else if (id === 'umhang') { this.buildCape(); return; }
    const g = b.build();
    this.extra = new THREE.Mesh(g, this.mainMat); this.body.add(this.extra);
  }
  // Superhelden-Umhang: flatternde Fläche am Rücken (Vertex-Welle pro Frame, 35 Punkte)
  buildCape() {
    const C = this.capeDef; if (!C) return;
    // rote Figur → blauer Umhang (sonst Rot auf Rot)
    const hsl = new THREE.Color(this.look.a).getHSL({}), reddish = (hsl.h < 0.05 || hsl.h > 0.9) && hsl.s > 0.4 && this.kind === 'marienkaefer';
    const cols = 4, rows = 6, pos = [], col = [], idx = [], c1 = new THREE.Color(reddish ? 0x3f6fff : 0xff3a5a), c2 = new THREE.Color(reddish ? 0x2a4ad8 : 0xd8284a);
    // Höhenfeld der Körperoberseite: der Umhang liegt immer knapp darüber (nie im Körper versteckt)
    const src = [[this.bodyMesh.geometry, 0, 0]];
    if (this.shells) this.shells.forEach(sh => src.push([sh.piv.children[0].geometry, sh.piv.position.y, sh.piv.position.z]));
    const top = (x, z) => {
      let m = -9;
      for (const [g, oy, oz] of src) { const a = g.attributes.position.array; for (let i = 0; i < a.length; i += 3) if (Math.abs(a[i] - x) < 0.05 && Math.abs(a[i + 2] + oz - z) < 0.05 && a[i + 1] + oy > m) m = a[i + 1] + oy; }
      return m;
    };
    for (let i = 0; i <= rows; i++) for (let j = 0; j <= cols; j++) {
      const t = i / rows, u = j / cols * 2 - 1;
      const x = C.at[0] + u * C.w / 2 * (0.6 + 0.6 * t), z = C.at[2] - t * C.len;
      const y = Math.max(C.at[1] - t * C.len * C.droop - u * u * 0.05 * (0.3 + t), top(x, z) + 0.035 + 0.02 * t);
      pos.push(x, y, z);
      const cc = t < 0.12 ? c2 : c1; col.push(cc.r, cc.g, cc.b, 0);
    }
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) { const a = i * (cols + 1) + j, bb = a + cols + 1; idx.push(a, bb, a + 1, bb, bb + 1, a + 1); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
    g.setIndex(idx); g.computeVertexNormals();
    const m = this.mat({ vc: true, side: THREE.DoubleSide, rim: 0.5, soft: 0.2 });
    const mesh = new THREE.Mesh(g, m);
    // Stern + Schließe
    const sb = new Build();
    const mi = Math.round(rows * 0.45) * (cols + 1) + cols / 2, ni = mi + cols + 1;
    const sp = [pos[mi * 3], pos[mi * 3 + 1] + 0.014, pos[mi * 3 + 2]];
    const slope = Math.atan2(pos[mi * 3 + 1] - pos[ni * 3 + 1], pos[mi * 3 + 2] - pos[ni * 3 + 2]);
    sb.add(flat(starShape(0.07, 0.45), 0.01), 0xffd84a, { p: sp, r: [-Math.PI / 2 - slope, 0, 0], unlit: 0.3 });
    sb.add(P.sphere(0.032, 8, 6), 0xffd84a, { p: [C.at[0], C.at[1] + 0.01, C.at[2] + 0.01], unlit: 0.2 });
    const star = new THREE.Mesh(sb.build(), this.mainMat); mesh.add(star); star.userData.base = true;
    this.body.add(mesh); this.extra = mesh;
    this.cape = { g, base: Float32Array.from(pos), rows, cols, star };
  }
  setLook(look) {
    this.dispose(true);
    this.build(look);
  }
  // v2.5 Sitzen auf Blüten: Punkte der ganzen Figur (Körper, Flügel, Hut, Schmuck, Umhang) in Ruhepose „gelandet“
  // (Flügel angelegt, tiefste Flatter-Stellung; Deckflügel zu; ohne Squash/Schraube), im Figuren-Rahmen inkl. Größe.
  // Große Dreiecke (Flügelflächen) werden innen abgetastet (≤ 3 cm). footY = tiefster Punkt (Körper-Rahmen, unskaliert).
  seatPoints() {
    if (this._seatPts) return this._seatPts;
    const T = this.tilt, B = this.body, sheet = this.kind === 'schmetterling' || this.kind === 'mondfalter' || this.kind === 'einhorn';
    const save = { q: T.quaternion.clone(), p: B.position.clone(), s: B.scale.clone(), r: B.rotation.clone(), rp: this.root.position.clone(), rr: this.root.rotation.clone(),
      w: this.wings.map(w => w.piv.rotation.z), sh: this.shells ? this.shells.map(x => [x.piv.rotation.x, x.piv.rotation.z]) : null };
    T.quaternion.identity(); B.position.set(0, 0, 0); B.scale.set(1, 1, 1); B.rotation.set(0, 0, 0);
    this.root.position.set(0, 0, 0); this.root.rotation.set(0, 0, 0);
    for (const w of this.wings) w.piv.rotation.z = (sheet ? 1.12 : 0.1) * w.s;
    if (this.shells) for (const x of this.shells) { x.piv.rotation.x = 0; x.piv.rotation.z = 0; }
    this.root.updateMatrixWorld(true);
    const out = [], a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    B.traverse(o => {
      if (!o.isMesh || !o.geometry) return;
      const g = o.geometry, pos = g.attributes.position, idx = g.index, M = o.matrixWorld;
      for (let i = 0; i < pos.count; i++) { a.fromBufferAttribute(pos, i).applyMatrix4(M); out.push(a.x, a.y, a.z); }
      const n = idx ? idx.count / 3 : pos.count / 3;
      for (let t = 0; t < n; t++) {
        a.fromBufferAttribute(pos, idx ? idx.getX(t * 3) : t * 3).applyMatrix4(M);
        b.fromBufferAttribute(pos, idx ? idx.getX(t * 3 + 1) : t * 3 + 1).applyMatrix4(M);
        c.fromBufferAttribute(pos, idx ? idx.getX(t * 3 + 2) : t * 3 + 2).applyMatrix4(M);
        const L = Math.max(a.distanceTo(b), b.distanceTo(c), c.distanceTo(a));
        if (L < 0.06) continue;
        const m = Math.ceil(L / 0.03);
        for (let i = 0; i <= m; i++) for (let j = 0; j <= m - i; j++) {
          const u = i / m, w = j / m, r = 1 - u - w;
          out.push(a.x * r + b.x * u + c.x * w, a.y * r + b.y * u + c.y * w, a.z * r + b.z * u + c.z * w);
        }
      }
    });
    T.quaternion.copy(save.q); B.position.copy(save.p); B.scale.copy(save.s); B.rotation.copy(save.r);
    this.root.position.copy(save.rp); this.root.rotation.copy(save.rr);
    this.wings.forEach((w, i) => { w.piv.rotation.z = save.w[i]; });
    if (save.sh) this.shells.forEach((x, i) => { x.piv.rotation.x = save.sh[i][0]; x.piv.rotation.z = save.sh[i][1]; });
    this.root.updateMatrixWorld(true);
    let minY = 0; for (let i = 1; i < out.length; i += 3) if (out[i] < minY) minY = out[i];
    this.footY = minY / (this.size || 1);
    return (this._seatPts = new Float32Array(out));
  }
  happy(dur = 0.9) { this.happyT = dur; this.squashV += 5; this.roll(1); }
  // Schraube um die Längsachse als Belohnung: dreht nur den Körper, Flugbahn/Steuerung bleiben unberührt.
  // Mehrere Aufrufe stapeln sich (Kombo = mehr Umdrehungen).
  roll(turns = 1, dir = 1) { this.rollTarget += turns * Math.PI * 2 * dir; this.happyT = Math.max(this.happyT, 0.6); }
  get rolling() { return Math.abs(this.rollVel) > 2.5; }
  get rollBusy() { return this.rollTarget !== 0 || this.rollAng !== 0; } // Schraube noch nicht ganz ausgeschwungen
  bump(v = 3) { this.squashV += v; }
  // st: {speed01, landed, climb, flapBoost, frozen}
  update(dt, t, st = {}) {
    if (st.frozen) return;
    const landed = !!st.landed;
    const fl = st.speed01 ?? 0.6;
    const boost = st.flapBoost || 0;
    // Flügelschlag
    const rate = landed ? 1.6 : (5 + fl * 5 + boost * 4);
    this.flapT += dt * rate;
    const sheet = this.kind === 'schmetterling' || this.kind === 'mondfalter' || this.kind === 'einhorn';
    for (const w of this.wings) {
      let a;
      const ph = this.flapT * w.freq + (w.ph || 0);
      if (landed) a = sheet ? 1.2 + Math.sin(t * 1.3) * 0.08 : 0.15 + Math.sin(ph) * 0.05;
      else a = w.base + Math.sin(ph) * w.amp * (0.75 + 0.25 * fl);
      w.piv.rotation.z = a * w.s;
    }
    if (this.shells) {
      const open = landed ? 0 : 0.55 + Math.sin(this.flapT * 2.6) * 0.03;
      for (const s of this.shells) { s.piv.rotation.z += (open * s.s - s.piv.rotation.z) * Math.min(1, dt * 8); s.piv.rotation.x += ((landed ? 0 : -0.25) - s.piv.rotation.x) * Math.min(1, dt * 8); }
    }
    // Spaß-Teile: Disco-Farbwechsel, Leuchten, Propeller, Umhang
    if (this.disco.length) { const hue = (t * 0.45) % 1; for (const m of this.disco) m.uniforms.uColor.value.setHSL(hue, 0.95, 0.66); }
    if (this.glow.length) { const e = 0.5 + 0.25 * Math.sin(t * 2.4); for (const m of this.glow) m.uniforms.uEmis.value = e; }
    if (this.spinner) this.spinner.rotation.y += dt * (landed ? 6 : 16 + fl * 10);
    if (this.cape) {
      const C = this.cape, p = C.g.attributes.position, B = C.base, amp = landed ? 0.012 : 0.035 + fl * 0.02;
      for (let i = 0; i <= C.rows; i++) {
        const tt = i / C.rows, wv = Math.sin(t * 9 - tt * 5) * amp * tt;
        for (let j = 0; j <= C.cols; j++) { const k = (i * (C.cols + 1) + j) * 3; p.array[k + 1] = B[k + 1] + wv + Math.sin(t * 7 + j) * amp * 0.3 * tt; }
      }
      p.needsUpdate = true;
    }
    // Squash & Stretch (Feder)
    const target = (st.climb || 0) * 0.08;
    this.squashV += ((target - this.squash) * 90 - this.squashV * 9) * dt;
    this.squash += this.squashV * dt;
    const sq = landed ? THREE.MathUtils.clamp(this.squash, -0.12, 0.12) : THREE.MathUtils.clamp(this.squash, -0.3, 0.3);
    const wobble = Math.sin(this.flapT) * 0.02 * (landed ? 0.3 : 1);
    this.body.scale.set(1 - sq * 0.5, 1 + sq + wobble, 1 - sq * 0.5);
    // v2.5 gelandet: Squash & Stretch am Fuß verankert (die Füße bleiben auf der Blüte), Wippen nur nach oben
    this.body.position.y = landed ? this.footY * (1 - this.body.scale.y) + Math.abs(Math.sin(this.flapT)) * 0.008 : Math.sin(this.flapT) * 0.05;
    // Freude: ^^-Augen + Schraube (kritisch gedämpfte Feder, ~0,7 s pro Umdrehung inkl. Ausschwingen)
    if (this.happyT > 0) this.happyT -= dt;
    if (this.rollTarget !== 0 || this.rollAng !== 0) {
      const h = Math.min(dt, 0.02); // Unterschritte → stabil auch bei 20-fps-Rucklern
      for (let r = dt; r > 1e-6; r -= h) {
        const s = Math.min(h, r);
        this.rollVel += ((this.rollTarget - this.rollAng) * 64 - this.rollVel * 16) * s;
        this.rollAng += this.rollVel * s;
      }
      if (Math.abs(this.rollTarget - this.rollAng) < 0.003 && Math.abs(this.rollVel) < 0.05) { this.rollAng = 0; this.rollTarget = 0; this.rollVel = 0; }
    }
    this.body.rotation.z = this.rollAng;
    const happy = this.happyT > 0 || st.cheer;
    this.eyesOpen.visible = !happy; this.eyesHappy.visible = !!happy;
    // Blinzeln
    this.blinkT -= dt;
    let ey = 1;
    if (this.blinkT < 0.12) ey = Math.abs(this.blinkT - 0.06) / 0.06;
    if (this.blinkT <= 0) this.blinkT = 2 + Math.random() * 3.5;
    this.eyes.scale.y = Math.max(0.08, ey);
  }
  dispose(keepRoot) {
    this.body.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    this.geos.forEach(g => g.dispose()); this.geos = [];
    this.mats.forEach(m => m.dispose()); this.mats = [];
    while (this.body.children.length) this.body.remove(this.body.children[0]);
    this.hat = null; this.extra = null; this.cape = null; this.spinner = null;
  }
}
