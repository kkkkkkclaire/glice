/* ═══════════════════════════════════════════════════════════
   Glice Service Worker
   - Network-first strategy: always fetch latest, fallback to cache
   ═══════════════════════════════════════════════════════════ */

const CACHE_NAME = 'glice-v5';
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

/* ─── Fetch: Network-first with robust offline fallback ─── */
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).then((networkResponse) => {
      // Don't cache opaque responses or non-success
      if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
      }
      return networkResponse;
    }).catch(() => {
      // Offline mode: match cache ignoring search parameters
      return caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        // If nothing matches and it's a page request, return index.html
        if (event.request.mode === 'navigate' || event.request.destination === 'document') {
          return caches.match('/index.html', { ignoreSearch: true });
        }
        // Or if the request is for the root path
        if (new URL(event.request.url).pathname === '/') {
          return caches.match('/index.html', { ignoreSearch: true });
        }
      });
    })
  );
});
