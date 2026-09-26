// Service-Worker: offline spielbar, sauberes Cache-Busting über Inhalts-Hash (tools/update_sw.py)
const VERSION = 'e748b40cf1';
const CACHE = 'schmetterlingswiese-' + VERSION;
const ASSETS = [
  './',
  'css/style.css',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'index.html',
  'js/actors/characters.js',
  'js/actors/npcs.js',
  'js/actors/player.js',
  'js/audio/audio.js',
  'js/audio/music.js',
  'js/audio/synth.js',
  'js/build.js',
  'js/engine/geo.js',
  'js/engine/gfx.js',
  'js/engine/renderer.js',
  'js/engine/textures.js',
  'js/game/game.js',
  'js/game/levels.js',
  'js/game/objectives.js',
  'js/game/progress.js',
  'js/game/worlds.js',
  'js/input.js',
  'js/main.js',
  'js/ui/ui.js',
  'js/world/nature.js',
  'js/world/particles.js',
  'js/world/terrain.js',
  'js/world/world.js',
  'lib/three.core.min.js',
  'lib/three.module.min.js',
  'manifest.webmanifest'
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('schmetterlingswiese-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(caches.match('index.html', { cacheName: CACHE }).then((r) => r || fetch(req)));
    return;
  }
  e.respondWith(caches.match(req, { cacheName: CACHE, ignoreSearch: true }).then((r) => r || fetch(req).then((res) => {
    if (res.ok) { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); }
    return res;
  })));
});
