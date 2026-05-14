/* ═══════════════════════════════════════════════════════════
   Glice Service Worker
   - Caches app shell and static assets for offline use
   - Implements cache-first strategy for core resources
   ═══════════════════════════════════════════════════════════ */

const CACHE_NAME = 'glice-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/data.js',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

/* ─── Install: Pre-cache core app shell ─── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

/* ─── Activate: Clean up old caches ─── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

/* ─── Fetch: Cache-first with network fallback ─── */
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) return response;
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      });
    }).catch(() => {
      if (event.request.destination === 'document') {
        return caches.match('/index.html');
      }
    })
  );
});
