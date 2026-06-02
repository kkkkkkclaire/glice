const CACHE_NAME = 'glice-v16';
const ASSETS = [
  '/',
  '/index.html',
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
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        ASSETS.map(url => {
          return fetch(url).then(response => {
            if (!response.ok) return;
            return cache.put(url, response);
          }).catch(err => console.log('Precache failed for', url, err));
        })
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  self.clients.claim();
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME && key.startsWith('glice-')) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.ok) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return networkResponse;
      }).catch((e) => {
        console.log('Network fetch failed', e);
      });

      // 1. Stale-while-revalidate: return cache instantly, let network update cache in background
      if (cachedResponse) {
        return cachedResponse;
      }

      // 2. If not in cache, wait for network
      return fetchPromise.then(response => {
        if (response) return response;
        // 3. If network fails and we have no cache, fallback to / for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/', { ignoreSearch: true })
            .then(res => res || caches.match('/index.html', { ignoreSearch: true }));
        }
        return new Response('', { status: 408, statusText: 'Request Timeout' });
      });
    })
  );
});
