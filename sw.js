// sw.js - Service Worker untuk caching lengkap
const CACHE_NAME = 'royal-wedding-v3';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install - cache aset dasar
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate - bersihkan cache lama
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - strategi cache first untuk semua request
self.addEventListener('fetch', event => {
  // Abaikan request non-GET
  if (event.request.method !== 'GET') return;
  
  // Abaikan request chrome-extension
  if (event.request.url.startsWith('chrome-extension://')) return;
  
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) {
          // Kembalikan dari cache
          return cached;
        }
        
        // Coba dari jaringan
        return fetch(event.request)
          .then(response => {
            // Cache file yang baru di-download (kecuali video besar)
            if (response && response.status === 200) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }
            return response;
          })
          .catch(() => {
            // Jika offline dan tidak ada di cache, kembalikan halaman offline
            if (event.request.url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
              return caches.match('/icon-192.png'); // fallback image
            }
            return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
          });
      })
  );
});
