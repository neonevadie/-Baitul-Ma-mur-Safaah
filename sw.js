// ================================================================
//  BMS — Service Worker v11.2
//  PWA Support: Cache, Offline Fallback
//  FIX v11.2: skipWaiting UNCONDITIONAL agar update langsung aktif
// ================================================================

const CACHE_NAME   = 'bms-cache-v11.2';
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

// ── INSTALL: skipWaiting DULU, baru cache ────────────────────────
// FIX: self.skipWaiting() dipanggil PERTAMA agar SW langsung aktif
// tanpa perlu menutup semua tab. Cache gagal pun tidak jadi masalah.
self.addEventListener('install', (event) => {
  console.log('[SW v11.2] Installing...');
  self.skipWaiting(); // ← UNCONDITIONAL: tidak tunggu precache selesai
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .catch(err => console.warn('[SW] Precache failed (non-critical):', err))
  );
});

// ── ACTIVATE: hapus cache lama, ambil alih semua klien ───────────
self.addEventListener('activate', (event) => {
  console.log('[SW v11.2] Activated');
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Clearing old cache:', k);
          return caches.delete(k);
        })
      ))
      .then(() => self.clients.claim()) // ambil alih semua tab yang terbuka
  );
});

// ── MESSAGE: terima perintah skipWaiting dari halaman ────────────
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// ── FETCH: Network-first, fallback ke cache ───────────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // Abaikan URL non-http dan Firebase API calls
  if (!url.startsWith('http')) return;
  if (url.includes('firebaseio.com') ||
      url.includes('firestore.googleapis.com') ||
      url.includes('identitytoolkit.googleapis.com') ||
      url.includes('googleapis.com') ||
      url.includes('gstatic.com')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache versi terbaru jika valid
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, clone))
            .catch(() => {});
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

// ── PUSH NOTIFICATION ────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'BMS — Notifikasi', body: 'Ada notifikasi baru', icon: '/assets/img/logo.png' };
  try { data = { ...data, ...event.data.json() }; } catch(e) {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body, icon: data.icon || '/assets/img/logo.png',
      badge: '/assets/img/logo.png', tag: data.tag || 'bms-notif',
      requireInteraction: data.urgent || false, data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
