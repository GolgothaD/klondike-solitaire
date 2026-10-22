var CACHE = 'solitaire-v2', FILES = ['./', 'index.html', 'style.css', 'engine.js', 'cards.js', 'app.js', 'manifest.json', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-192.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png', 'favicon.ico'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); })); self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); })); self.clients.claim(); });
self.addEventListener('fetch', function (e) { // network first so updates land, cache fallback offline
  e.respondWith(fetch(e.request).then(function (r) { var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, cp); }); return r; }).catch(function () { return caches.match(e.request, { ignoreSearch: true }); }));
});
