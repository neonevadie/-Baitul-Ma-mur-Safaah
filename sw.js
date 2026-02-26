// ================================================================
//  BMS — Service Worker v1.1 (FIXED)
//  PWA Support: Cache, Offline Fallback, Push Notifikasi
//  CV. Baitul Ma'mur Syafaah · 2026
// ================================================================

const CACHE_NAME   = 'bms-cache-v2';
const OFFLINE_URL  = '/index.html';

// Aset yang di-cache saat install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/assets/css/style.css',
  '/manifest.json',
  // ── Entry point & modul ES ────────────────────────────────
  '/assets/js/main.js',
  // ── Modul fase 1-5 ─────────────────────────────────────────
  '/assets/js/core/constants.js',
  '/assets/js/core/theme.js',
  '/assets/js/core/utils.js',
  '/assets/js/core/state.js',
  '/assets/js/core/firebase.js',
  '/assets/js/modules/auth.js',
  '/assets/js/modules/nav.js',
  '/assets/js/modules/data.js',
  // ── Modul fase 6 (akan ditambahkan nanti) ─────────────────
];

// ── HELPER: cek apakah request aman untuk di-cache ─────────────
function isCacheableRequest(request) {
  // Hanya cache request GET
  if (request.method !== 'GET') return false;
  
  // Abaikan request dengan skema yang tidak didukung
  const url = request.url;
  
  // 🔴 FIX: Abaikan chrome-extension://
  if (url.startsWith('chrome-extension://')) return false;
  
  // Abaikan request ke Firebase
  if (url.includes('firebaseio.com') ||
      url.includes('firestore.googleapis.com') ||
      url.includes('identitytoolkit.googleapis.com') ||
      url.includes('googleapis.com') ||
      url.includes('firebasestorage.googleapis.com')) return false;
  
  // Hanya cache dari domain sendiri (opsional)
  // if (!url.includes('neonevadie.github.io')) return false;
  
  return true;
}

// ── INSTALL: cache aset utama ─────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing BMS Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Filter aset yang valid
        const validAssets = PRECACHE_ASSETS.filter(asset => 
          !asset.startsWith('chrome-extension://')
        );
        
        return cache.addAll(validAssets).catch(err => {
          console.warn('[SW] Precache failed for some assets:', err);
          // Tetap lanjutkan meski ada yang gagal
          return Promise.resolve();
        });
      })
      .then(() => {
        console.log('[SW] Install complete');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[SW] Fatal install error:', err);
      })
  );
});

// ── ACTIVATE: bersihkan cache lama ────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] BMS Service Worker activated');
  
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => {
            console.log('[SW] Deleting old cache:', k);
            return caches.delete(k);
          })
      );
    }).then(() => {
      console.log('[SW] Activation complete, taking control');
      return self.clients.claim();
    })
  );
});

// ── FETCH: Network-first, fallback ke cache ────────────────────
self.addEventListener('fetch', (event) => {
  const request = event.request;
  
  // 🔴 FIX: Skip jika request tidak cacheable
  if (!isCacheableRequest(request)) {
    return; // Biarkan browser handle normal
  }
  
  event.respondWith(
    fetch(request)
      .then(response => {
        // Cache response baru jika valid
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone).catch(err => {
              // Abaikan error cache (misal ukuran terlalu besar)
              console.debug('[SW] Cache put failed:', err.message);
            });
          });
        }
        return response;
      })
      .catch(error => {
        console.debug('[SW] Network failed, falling back to cache:', request.url);
        
        // Fallback ke cache
        return caches.match(request).then(cached => {
          if (cached) return cached;
          
          // Fallback ke offline page untuk navigasi
          if (request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
          
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// ── PUSH NOTIFICATION: stok kritis & invoice jatuh tempo ──────
self.addEventListener('push', (event) => {
  let data = { 
    title: 'BMS — Notifikasi', 
    body: 'Ada notifikasi baru', 
    icon: '/assets/img/logo.png',
    badge: '/assets/img/logo.png'
  };
  
  try { 
    data = { ...data, ...event.data.json() }; 
  } catch(e) {
    console.debug('[SW] Push data not JSON');
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag || 'bms-notif',
      requireInteraction: data.urgent || false,
      data: { url: data.url || '/' },
    })
  );
});

// ── NOTIFIKASI DIKLIK: buka app ───────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const targetUrl = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Fokus window yang sudah buka jika ada
        for (const client of clientList) {
          if (client.url === targetUrl && 'focus' in client) {
            return client.focus();
          }
        }
        // Buka window baru
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
      .catch(err => {
        console.debug('[SW] Notification click error:', err);
      })
  );
});

// ── ERROR HANDLING GLOBAL ─────────────────────────────────────
self.addEventListener('error', (event) => {
  console.error('[SW] Uncaught error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled rejection:', event.reason);
});