// ================================================================
//  BMS — Service Worker v11.4
//  PWA Support: Cache, Offline Fallback
//  FIX: Root-relative paths, hapus logika GitHub Pages
// ================================================================

const CACHE_NAME   = 'bms-cache-v11.4';
const OFFLINE_URL  = '/index.html';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/assets/css/style.css',
  '/assets/js/main.js',
  '/assets/js/firebase.js',
  '/assets/js/modules/constants.js',
  '/assets/js/modules/theme.js',
  '/assets/js/modules/nav.js',
  '/assets/js/modules/auth.js',
  '/assets/js/modules/data.js',
  '/assets/js/modules/business.js',
  '/assets/js/modules/ui-render.js',
  '/assets/js/modules/ui-helpers.js',
  '/assets/js/modules/utils.js',
  '/manifest.json',
];

// ── INSTALL: skipWaiting, lalu cache ────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW v11.4] Installing...');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .catch(err => console.warn('[SW] Precache failed (non-critical):', err))
  );
});

// ── ACTIVATE: hapus cache lama ──────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW v11.4] Activated');
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Clearing old cache:', k);
          return caches.delete(k);
        })
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH: Network-first, fallback ke cache ─────────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  
  // Abaikan request ke Firebase
  if (url.hostname.includes('firebase') || 
      url.hostname.includes('googleapis') ||
      url.hostname.includes('gstatic')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, responseToCache))
            .catch(() => {});
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request)
          .then(cached => cached || caches.match(OFFLINE_URL));
      })
  );
});

// ── PUSH NOTIFICATION ────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { 
    title: 'BMS — Notifikasi', 
    body: 'Ada notifikasi baru', 
    icon: '/assets/img/logo.png'
  };
  try { data = { ...data, ...event.data.json() }; } catch(e) {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body, 
      icon: data.icon || '/assets/img/logo.png',
      badge: '/assets/img/logo.png',
      tag: data.tag || 'bms-notif',
      requireInteraction: data.urgent || false, 
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  let targetUrl = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});