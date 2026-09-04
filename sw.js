// soonenote V6.1 Service Worker (Force Cache Purge)
const CACHE_NAME = 'soonenote-v6.1-' + Date.now();

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Always fetch latest from network first
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
