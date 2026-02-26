// ================================================================
//  BMS — Service Worker v1.0
//  PWA Support: Cache, Offline Fallback, Push Notifikasi
//  CV. Baitul Ma'mur Syafaah · 2026
// ================================================================

const CACHE_NAME   = 'bms-cache-v2';  // bumped — ES Modules phase 1-5
const OFFLINE_URL  = '/index.html';

// Aset yang di-cache saat install
// Update ini setiap kali ada modul baru (fase 6, 7, dst.)
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/assets/css/style.css',
  '/manifest.json',
  // ── Entry point & modul ES (jangan tambahkan defer/async) ──────
  '/assets/js/main.js',
  '/assets/js/app.js',              // fase 6-7 (belum dipecah)
  // ── Modul fase 1-5 ─────────────────────────────────────────────
  '/assets/js/modules/constants.js',
  '/assets/js/modules/theme.js',
  '/assets/js/modules/nav.js',
  '/assets/js/modules/auth.js',
  '/assets/js/modules/data.js',
  // ── Firebase SDK ────────────────────────────────────────────────
  '/assets/js/firebase.js',
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

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache response baru
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        // Offline: ambil dari cache
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
