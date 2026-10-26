var CACHE = 'solitaire-v5', FILES = ['./', 'index.html', 'style.css', 'engine.js', 'levels.js', 'cursors.js', 'cards.js', 'cardfonts.js', 'faces.js', 'themes.js', 'audio.js', 'fx.js', 'app.js', 'manifest.json',
  'fonts/outfit.woff2', 'fonts/cinzel.woff2',
  'bg/casino.webp', 'bg/casino_t.webp', 'bg/walnut_t.webp', 'bg/neon_t.webp', 'bg/forest_t.webp', 'bg/nebula_t.webp', 'bg/zen_t.webp', 'bg/reef_t.webp', 'bg/classic_t.webp',
  'audio/slide0.wav', 'audio/slide1.wav', 'audio/slide2.wav', 'audio/slide3.wav', 'audio/place0.wav', 'audio/place1.wav', 'audio/place2.wav', 'audio/place3.wav',
  'audio/flip0.wav', 'audio/flip1.wav', 'audio/deal.wav', 'audio/shuffle.wav', 'audio/chime.wav', 'audio/win.wav', 'audio/tap.wav', 'audio/bad.wav',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-192.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png', 'favicon.ico'];
// other table art and music are cached the first time they are used
self.addEventListener('install', function (e) { e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); })); self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); })); self.clients.claim(); });
self.addEventListener('fetch', function (e) { // network first so updates land, cache fallback offline
  if (e.request.method !== 'GET' || e.request.headers.get('range')) return; // media range requests go straight to the network
  e.respondWith(fetch(e.request).then(function (r) { if (r.ok && r.status === 200) { var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, cp); }); } return r; }).catch(function () { return caches.match(e.request, { ignoreSearch: true }); }));
});
