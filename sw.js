/* ═══════════════════════════════════════════════════════════
   Glice Service Worker - Ultimate Offline Cache
   ═══════════════════════════════════════════════════════════ */

const CACHE_NAME = 'glice-v9';
const ASSETS = [
  '/',
  '/index.html', // Add back just in case they land on it
  '/style.css',
  '/data.js',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Manually fetch and cache to avoid cache.add() throwing on Vercel headers/redirects
      for (let url of ASSETS) {
        try {
          const response = await fetch(url);
          if (response.ok || response.type === 'opaque') {
            await cache.put(url, response);
          }
        } catch (e) {
          console.error('SW Cache Error:', url, e);
        }
      }
    })
  );
});

self.addEventListener('activate', (event) => {
  self.clients.claim();
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME && key.startsWith('glice-'))
            .map(key => caches.delete(key))
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedRes) => {
      // 1. CACHE FIRST: If it's in the cache, return it instantly!
      if (cachedRes) {
        // Optionally update cache in background
        fetch(event.request).then(netRes => {
          if (netRes && netRes.ok) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, netRes));
          }
        }).catch(()=>{});
        
        return cachedRes;
      }

      // 2. NETWORK FALLBACK: If not in cache, go to network
      return fetch(event.request).then((netRes) => {
        if (netRes && netRes.ok) {
          const clone = netRes.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return netRes;
      }).catch((err) => {
        // 3. OFFLINE FALLBACK: If network fails and it's a page, load / from cache
        if (event.request.mode === 'navigate' || event.request.destination === 'document') {
          return caches.match('/', { ignoreSearch: true });
        }
        throw err;
      });
    })
  );
});
