// ================================================================
//  BMS — Service Worker v1.0
//  PWA Support: Cache, Offline Fallback, Push Notifikasi
//  CV. Baitul Ma'mur Syafaah · 2026
// ================================================================

const CACHE_NAME   = 'bms-cache-v11.1';
const OFFLINE_URL  = '/index.html';

// Aset yang di-cache saat install — v11.0 ES Modules
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

// ── INSTALL: cache aset utama ─────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing BMS Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('[SW] Precache failed:', err))
  );
});

// ── ACTIVATE: bersihkan cache lama ───────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] BMS Service Worker activated');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => { console.log('[SW] Deleting old cache:', k); return caches.delete(k); })
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: Network-first, fallback ke cache ───────────────────────
self.addEventListener('fetch', (event) => {
  // Abaikan request non-GET dan Firebase
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('firebaseio.com') ||
      event.request.url.includes('firestore.googleapis.com') ||
      event.request.url.includes('identitytoolkit.googleapis.com') ||
      event.request.url.includes('googleapis.com')) return;

  // FIX v11.1: Abaikan URL non-http (chrome-extension, dll.)
  const url = event.request.url;
  if (!url.startsWith('http')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone)).catch(()=>{});
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request)
          .then(cached => cached || caches.match(OFFLINE_URL))
      )
  );
});

// ── PUSH NOTIFICATION: stok kritis & invoice jatuh tempo ─────────
self.addEventListener('push', (event) => {
  let data = { title: 'BMS — Notifikasi', body: 'Ada notifikasi baru', icon: '/assets/img/logo.png' };
  try { data = { ...data, ...event.data.json() }; } catch(e) {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body      : data.body,
      icon      : data.icon || '/assets/img/logo.png',
      badge     : '/assets/img/logo.png',
      tag       : data.tag || 'bms-notif',
      requireInteraction: data.urgent || false,
      data      : { url: data.url || '/' },
    })
  );
});

// ── NOTIFIKASI DIKLIK: buka app ───────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Fokus window yang sudah buka jika ada
        for (const client of clientList) {
          if (client.url === targetUrl && 'focus' in client) return client.focus();
        }
        // Buka window baru
        if (clients.openWindow) return clients.openWindow(targetUrl);
      })
  );
});
