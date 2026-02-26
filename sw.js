// ================================================================
//  BMS — Service Worker v11.3
//  PWA Support: Cache, Offline Fallback
//  FIX v11.3: Path correction untuk GitHub Pages subdirectory
// ================================================================

const CACHE_NAME   = 'bms-cache-v11.3';
const BASE_PATH    = '/-Baitul-Ma-mur-Safaaah';
const OFFLINE_URL  = BASE_PATH + '/index.html';

const PRECACHE_ASSETS = [
  BASE_PATH + '/',
  BASE_PATH + '/index.html',
  BASE_PATH + '/assets/css/style.css',
  BASE_PATH + '/assets/js/main.js',
  BASE_PATH + '/assets/js/firebase.js',
  BASE_PATH + '/assets/js/modules/constants.js',
  BASE_PATH + '/assets/js/modules/theme.js',
  BASE_PATH + '/assets/js/modules/nav.js',
  BASE_PATH + '/assets/js/modules/auth.js',
  BASE_PATH + '/assets/js/modules/data.js',
  BASE_PATH + '/assets/js/modules/business.js',
  BASE_PATH + '/assets/js/modules/ui-render.js',
  BASE_PATH + '/assets/js/modules/ui-helpers.js',
  BASE_PATH + '/assets/js/modules/utils.js',
  BASE_PATH + '/manifest.json',
];

// ── INSTALL: skipWaiting DULU, baru cache ────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW v11.3] Installing...');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .catch(err => console.warn('[SW] Precache failed (non-critical):', err))
  );
});

// ── ACTIVATE: hapus cache lama, ambil alih semua klien ───────────
self.addEventListener('activate', (event) => {
  console.log('[SW v11.3] Activated');
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

// ── MESSAGE: terima perintah skipWaiting dari halaman ────────────
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// ── FETCH: Network-first dengan path correction untuk GitHub Pages ──
self.addEventListener('fetch', (event) => {
  // Hanya handle GET requests
  if (event.request.method !== 'GET') return;

  // Ambil URL dari request
  let request = event.request;
  const url = new URL(request.url);
  
  // ============================================================
  // 1. ABAIKAN REQUEST YANG TIDAK PERLU DI-CACHE
  // ============================================================
  
  // Abaikan jika bukan HTTP/HTTPS
  if (!url.protocol.startsWith('http')) return;
  
  // Abaikan semua request ke Firebase (biarkan network langsung)
  if (url.hostname.includes('firebase') || 
      url.hostname.includes('googleapis') ||
      url.hostname.includes('gstatic')) {
    return; // Tidak di-cache, langsung fetch normal
  }

  // ============================================================
  // 2. KOREKSI PATH UNTUK GITHUB PAGES SUBDIRECTORY
  // ============================================================
  
  // BASE_PATH sudah dideklarasikan di GLOBAL (tidak perlu declare ulang)
  
  // Logika koreksi path:
  // Jika request ke /assets/... TAPI tidak diawali BASE_PATH,
  // maka kita tambahkan BASE_PATH di depannya
  if (url.pathname.startsWith('/assets/') && !url.pathname.startsWith(BASE_PATH + '/assets/')) {
    // Buat path baru yang benar
    const correctedPath = BASE_PATH + url.pathname;
    const correctedUrl = url.origin + correctedPath + url.search;
    
    console.log('[SW] Correcting path:', url.pathname, '→', correctedPath);
    
    // Buat request baru dengan URL yang sudah dikoreksi
    request = new Request(correctedUrl, {
      method: request.method,
      headers: request.headers,
      mode: 'cors',
      credentials: 'omit'
    });
  }
  
  // ============================================================
  // 3. HANDLE KHUSUS UNTUK index.html (OFFLINE PAGE)
  // ============================================================
  
  // Jika request ke root atau index.html tanpa BASE_PATH
  if (url.pathname === '/' || url.pathname === '/index.html') {
    const correctedUrl = url.origin + BASE_PATH + '/index.html';
    request = new Request(correctedUrl, request);
  }

  // ============================================================
  // 4. STRATEGI CACHE: NETWORK FIRST, FALLBACK KE CACHE
  // ============================================================

  event.respondWith(
    // Coba ambil dari network dulu
    fetch(request)
      .then(response => {
        // Pastikan response valid sebelum di-cache
        if (response && response.status === 200) {
          // Clone response karena response stream hanya bisa dipakai sekali
          const responseToCache = response.clone();
          
          // Buka cache dan simpan response
          caches.open(CACHE_NAME)
            .then(cache => {
              // Simpan dengan key berupa request URL yang ASLI (sebelum koreksi)
              cache.put(event.request, responseToCache);
            })
            .catch(err => console.warn('[SW] Cache put failed:', err));
        }
        return response;
      })
      .catch(error => {
        // ========================================================
        // 5. OFFLINE FALLBACK: Ambil dari cache
        // ========================================================
        console.log('[SW] Network failed, serving from cache:', error.message);
        
        // Coba cari di cache berdasarkan request asli
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // Jika tidak ditemukan, fallback ke halaman offline
            console.log('[SW] No cache for:', event.request.url, '→ serving offline page');
            return caches.match(BASE_PATH + '/index.html');
          });
      })
  );
});

// ── PUSH NOTIFICATION ────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { 
    title: 'BMS — Notifikasi', 
    body: 'Ada notifikasi baru', 
    icon: BASE_PATH + '/assets/img/logo.png'  // ← PERBAIKAN: tambah BASE_PATH
  };
  try { data = { ...data, ...event.data.json() }; } catch(e) {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body, 
      icon: data.icon || (BASE_PATH + '/assets/img/logo.png'),
      badge: BASE_PATH + '/assets/img/logo.png',  // ← PERBAIKAN
      tag: data.tag || 'bms-notif',
      requireInteraction: data.urgent || false, 
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  let targetUrl = event.notification.data?.url || '/';
  
  // Tambahkan BASE_PATH jika targetUrl relatif dan belum ada BASE_PATH
  if (targetUrl.startsWith('/') && !targetUrl.startsWith(BASE_PATH)) {
    targetUrl = BASE_PATH + targetUrl;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});