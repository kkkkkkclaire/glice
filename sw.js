/* ═══════════════════════════════════════════════════════════
   Glice Service Worker
   - Network-first strategy: always fetch latest, fallback to cache
   ═══════════════════════════════════════════════════════════ */

const CACHE_NAME = 'glice-v8';
const ASSETS_TO_CACHE = [
  '/',
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
      // Use catch to prevent one failed asset from breaking the entire installation
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url => cache.add(url).catch(err => console.log('Failed to cache:', url, err)))
      );
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
          .filter((name) => name !== CACHE_NAME && name.startsWith('glice-'))
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

/* ─── Fetch: Stale-While-Revalidate Strategy ─── */
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      
      // The background network fetch to update the cache
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch((err) => {
        console.log('Network fetch failed, using cache only', err);
      });

      // 1. If we have it in cache, return immediately (instant load, NO VPN needed)
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // 2. If it's a page request and not in cache, fallback to /
      if (event.request.mode === 'navigate' || event.request.destination === 'document') {
        return caches.match('/', { ignoreSearch: true }).then(res => {
          return res || fetchPromise;
        });
      }

      // 3. Otherwise wait for the network fetch
      return fetchPromise;
    })
  );
});
