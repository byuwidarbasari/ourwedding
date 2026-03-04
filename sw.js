// ===== SERVICE WORKER DENGAN VERSIONING =====
// VERSI - GANTI SETIAP KALI UPDATE APLIKASI!
const CACHE_NAME = 'slide-show-cache-v1.0.0';
const APP_VERSION = '1.0.0';

// File yang wajib di-cache
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// ===== INSTALL EVENT =====
self.addEventListener('install', event => {
  console.log('🔄 Service Worker menginstall versi ' + APP_VERSION);
  
  // Force waiting worker to become active
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Cache dibuka:', CACHE_NAME);
        return cache.addAll(urlsToCache).catch(error => {
          console.log('❌ Gagal cache beberapa file:', error);
        });
      })
  );
});

// ===== FETCH EVENT =====
self.addEventListener('fetch', event => {
  // Abaikan request ke Google Drive dan Apps Script
  if (event.request.url.includes('googleapis.com') || 
      event.request.url.includes('script.google.com') ||
      event.request.url.includes('drive.google.com') ||
      event.request.url.includes('googleusercontent.com')) {
    // Network only untuk API
    event.respondWith(fetch(event.request));
    return;
  }
  
  // Untuk file statis: cache first, network fallback
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Kembalikan dari cache jika ada
        if (response) {
          return response;
        }
        
        // Jika tidak ada di cache, fetch dari network
        return fetch(event.request).then(
          networkResponse => {
            // Cek apakah response valid
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }
            
            // Clone response
            const responseToCache = networkResponse.clone();
            
            // Simpan ke cache
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return networkResponse;
          }
        ).catch(() => {
          // Jika offline dan tidak ada di cache, kembalikan response fallback
          if (event.request.url.includes('.png') || event.request.url.includes('.jpg')) {
            return caches.match('/icon-192.png');
          }
        });
      })
  );
});

// ===== ACTIVATE EVENT =====
self.addEventListener('activate', event => {
  console.log('✅ Service Worker aktif, versi:', APP_VERSION);
  
  // Hapus cache lama
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName.startsWith('slide-show-cache')) {
            console.log('🗑️ Menghapus cache lama:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Mengambil alih kontrol segera
      return self.clients.claim();
    })
  );
});

// ===== MESSAGE EVENT =====
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage(APP_VERSION);
  }
});

console.log('🚀 Service Worker dimuat, versi:', APP_VERSION);