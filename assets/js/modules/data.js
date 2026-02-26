// ================================================================
//  BMS — data.js  (ES Module)
//  Firestore: load, realtime listeners, server-side filter,
//  cursor-based pagination, auto-cleanup log
// ================================================================
import { DB, state, cursors, invoiceFilter, PAGE_SIZE } from './constants.js';
import { showToast, updateFBStatus, addLog, fillDropdowns, updateRunningText, isPageActive } from './utils.js';
import * as fb from '../firebase.js';

// ── UPGRADE 4.2: Cursor-based Pagination ─────────────────────────
/**
 * Load halaman pertama koleksi dengan cursor pagination.
 * Menyimpan lastVisible agar halaman berikutnya bisa dimuat.
 */
export async function loadPagedCollection(colName, orderField = '_ts') {
  const q = fb.query(fb.col(colName), fb.orderBy(orderField,'desc'), fb.limit(PAGE_SIZE));
  const snap = await fb.getDocs_(q);
  const docs = snap.docs.map(d => ({ _id:d.id,...d.data() }));
  cursors[colName] = {
    stack      : [null],
    lastVisible: snap.docs[snap.docs.length - 1] || null,
    hasMore    : snap.docs.length === PAGE_SIZE,
  };
  return docs;
}

/**
 * Load halaman berikutnya menggunakan startAfter cursor.
 */
export async function loadNextPage(colName, orderField = '_ts') {
  const cur = cursors[colName];
  if (!cur || !cur.hasMore || !cur.lastVisible) return null;
  const q    = fb.query(fb.col(colName), fb.orderBy(orderField,'desc'), fb.startAfter(cur.lastVisible), fb.limit(PAGE_SIZE));
  const snap = await fb.getDocs_(q);
  const docs = snap.docs.map(d => ({ _id:d.id,...d.data() }));
  cur.stack.push(cur.lastVisible);
  cur.lastVisible = snap.docs[snap.docs.length - 1] || null;
  cur.hasMore     = snap.docs.length === PAGE_SIZE;
  return docs;
}

// ── UPGRADE 4.3: Server-side Filter Invoice ───────────────────────
/**
 * Query invoice dengan filter dari server — hanya data relevan yang dikirim.
 * Membutuhkan Firestore composite index: status + _ts, metodeBayar + _ts.
 */
export async function queryInvoiceServerSide(filters = {}) {
  let constraints = [fb.orderBy('_ts','desc'), fb.limit(200)];
  // Tambah where clause jika filter aktif
  if (filters.status)  constraints.unshift(fb.where('status','==',filters.status));
  if (filters.metode)  constraints.unshift(fb.where('metodeBayar','==',filters.metode));
  // Filter tanggal via server jika ada
  if (filters.dari)    constraints.unshift(fb.where('tgl','>=',filters.dari));
  if (filters.sampai)  constraints.unshift(fb.where('tgl','<=',filters.sampai));
  // Filter sales — hanya tampilkan invoice milik sales ini
  if (state.currentUser?.role === 'sales') {
    constraints.unshift(fb.where('salesUid','==',state.currentUser.uid));
  }
  try {
    const q    = fb.query(fb.col('invoice'), ...constraints);
    const snap = await fb.getDocs_(q);
    return snap.docs.map(d => ({ _id:d.id,...d.data() }));
  } catch(e) {
    // Composite index belum ada — fallback ke client-side filter
    console.warn('Server-side filter fallback (index belum aktif):', e.message);
    return null;
  }
}

// ── UPGRADE 4.4: Auto-Cleanup Log > 90 hari ──────────────────────
export async function cleanupOldLogs() {
  const lastCleanup = state.appConfig?.lastLogCleanup;
  const now         = new Date();
  // Jalankan max 1x per bulan
  if (lastCleanup) {
    const daysSince = (now - new Date(lastCleanup)) / (1000 * 60 * 60 * 24);
    if (daysSince < 30) return;
  }
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 90);
  const cutoffISO = cutoff.toISOString();
  try {
    const snap = await fb.getDocs_(fb.query(fb.col('log'), fb.where('waktu','<',cutoffISO)));
    if (snap.empty) return;
    const batch = fb.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    const deleted = snap.size;
    // Catat waktu cleanup di appConfig
    if (state.appConfig) {
      state.appConfig.lastLogCleanup = now.toISOString();
      fb.setDoc(fb.docRef('test','appConfig'), state.appConfig).catch(()=>{});
    }
    console.log(`✅ Cleanup: ${deleted} log lama dihapus (> 90 hari)`);
    // Update local DB
    DB.log = DB.log.filter(l => l.waktu >= cutoffISO);
  } catch(e) {
    // Upgrade 7.3: error handling informatif
    console.warn('Cleanup log gagal:', e.message);
  }
}

// ── Load All from Firestore ───────────────────────────────────────
export async function loadAllFromFirestore() {
  const role        = state.currentUser?.role || 'sales';
  const isOwnerAdmin = role==='owner' || role==='admin';
  updateFBStatus('loading');
  try {
    // Base queries semua role
    const baseQ = [
      fb.getDocs_(fb.query(fb.col('barang'),      fb.orderBy('_ts','desc'))),
      fb.getDocs_(fb.query(fb.col('invoice'),     fb.orderBy('_ts','desc'))),
      fb.getDocs_(fb.query(fb.col('mitra'),       fb.orderBy('_ts','desc'))),
      fb.getDocs_(fb.query(fb.col('notifikasi'),  fb.orderBy('_ts','desc'), fb.limit(50))),
      fb.getDocs_(fb.query(fb.col('gudang'),      fb.orderBy('_ts','desc'))),
      fb.getDocs_(fb.query(fb.col('surat_jalan'), fb.orderBy('_ts','desc'))),
    ];
    // Owner/Admin only
    const adminQ = isOwnerAdmin ? [
      fb.getDocs_(fb.query(fb.col('pengeluaran'), fb.orderBy('_ts','desc'))),
      fb.getDocs_(fb.query(fb.col('pembelian'),   fb.orderBy('_ts','desc'))),
      fb.getDocs_(fb.query(fb.col('log'),         fb.orderBy('_ts','desc'), fb.limit(100))),
    ] : [];

    const results = await Promise.all([...baseQ, ...adminQ]);
    const [sB,sI,sM,sN,sG,sSJ] = results;
    const [sP,sPm,sL]           = isOwnerAdmin ? results.slice(6) : [null,null,null];

    if (!sB.empty)  DB.barang      = sB.docs.map(d=>({_id:d.id,...d.data()}));
    if (!sI.empty)  DB.invoice     = sI.docs.map(d=>({_id:d.id,...d.data()}));
    if (!sM.empty)  DB.mitra       = sM.docs.map(d=>({_id:d.id,...d.data()}));
    if (sP &&!sP.empty)  DB.pengeluaran = sP.docs.map(d=>({_id:d.id,...d.data()}));
    if (sPm&&!sPm.empty) DB.pembelian   = sPm.docs.map(d=>({_id:d.id,...d.data()}));
    if (sL &&!sL.empty)  DB.log         = sL.docs.map(d=>({_id:d.id,...d.data()}));
    if (!sN.empty)  DB.notifikasi  = sN.docs.map(d=>({_id:d.id,...d.data()}));
    if (!sG.empty)  DB.gudang      = sG.docs.map(d=>({_id:d.id,...d.data()}));
    if (!sSJ.empty) DB.surat_jalan = sSJ.docs.map(d=>({_id:d.id,...d.data()}));

    setupRealtimeListeners();

    const { renderAllFull, renderLog } = await import('./ui-render.js');
    renderAllFull(); renderLog();
    updateFBStatus('online');
    showToast('☁️ Data berhasil dimuat dari Firebase!', 'success');

    // UPGRADE 4.4: Cleanup log lama setelah data dimuat
    if (isOwnerAdmin) cleanupOldLogs().catch(()=>{});

  } catch(e) {
    // Upgrade 7.3: error handling informatif
    console.error('Firestore load error:', e);
    updateFBStatus('offline');
    const { renderAllFull } = await import('./ui-render.js');
    renderAllFull();
    if (e.code === 'permission-denied') {
      showToast('❌ Akses ditolak Firestore — deploy Security Rules v2.1 di Firebase Console!', 'error');
    } else if (e.code === 'unavailable' || e.message?.includes('network')) {
      showToast('❌ Tidak ada koneksi internet — data lokal ditampilkan.', 'warning');
    } else {
      showToast('⚠️ Gagal memuat data: ' + e.message, 'warning');
    }
  }
}

// ── Realtime Listeners ────────────────────────────────────────────
export function setupRealtimeListeners() {
  const isOwnerAdmin = ['owner','admin'].includes(state.currentUser?.role);

  fb.onSnapshot(fb.query(fb.col('barang'),     fb.orderBy('_ts','desc')), s => {
    DB.barang = s.docs.map(d=>({_id:d.id,...d.data()}));
    import('./ui-render.js').then(r=>{ r.renderBarang(); r.renderStok(); r.renderStokKritis(); r.buildMainChart(); r.renderDashboardStats(); });
    fillDropdowns(); updateRunningText();
  });

  fb.onSnapshot(fb.query(fb.col('invoice'),    fb.orderBy('_ts','desc')), s => {
    DB.invoice = s.docs.map(d=>({_id:d.id,...d.data()}));
    import('./ui-render.js').then(r=>{ r.renderInvoice(); r.renderInvoiceStats(); r.renderDashboardStats(); r.buildMainChart(); if(isPageActive('laporan')){ r.buildLaporanChart(); r.renderLaporanPiutang(); } });
  });

  fb.onSnapshot(fb.query(fb.col('mitra'),      fb.orderBy('_ts','desc')), s => {
    DB.mitra = s.docs.map(d=>({_id:d.id,...d.data()}));
    import('./ui-render.js').then(r=>r.renderMitra()); fillDropdowns();
  });

  if (isOwnerAdmin) {
    fb.onSnapshot(fb.query(fb.col('pengeluaran'), fb.orderBy('_ts','desc')), s => {
      DB.pengeluaran = s.docs.map(d=>({_id:d.id,...d.data()}));
      import('./ui-render.js').then(r=>{ r.renderPengeluaran(); if(isPageActive('keuangan')) r.renderAssets(); });
    });
    fb.onSnapshot(fb.query(fb.col('pembelian'),   fb.orderBy('_ts','desc')), s => {
      DB.pembelian = s.docs.map(d=>({_id:d.id,...d.data()}));
      import('./ui-render.js').then(r=>{ r.renderPembelian(); if(isPageActive('keuangan')) r.renderAssets(); });
    });
    fb.onSnapshot(fb.query(fb.col('log'),         fb.orderBy('_ts','desc'), fb.limit(100)), s => {
      DB.log = s.docs.map(d=>({_id:d.id,...d.data()}));
      import('./ui-render.js').then(r=>r.renderLog());
    });
  }

  fb.onSnapshot(fb.query(fb.col('chat'), fb.orderBy('_ts','asc'), fb.limit(50)), s => {
    const msgs = s.docs.map(d=>({_id:d.id,...d.data()}));
    if (!state.chatOpen && msgs.length > state._lastChatCount) {
      const last = msgs[msgs.length-1];
      if (last.uid !== window._currentFbUid?.()) {
        import('./utils.js').then(u=>u.playChatNotifSound());
        const badge = document.getElementById('chat-unread-badge');
        if (badge) { badge.style.display=''; badge.textContent='!'; }
      }
    }
    state._lastChatCount = msgs.length;
    DB.chat = msgs;
    import('./ui-render.js').then(r=>r.renderChatMessages());
  });

  fb.onSnapshot(fb.query(fb.col('notifikasi'), fb.orderBy('_ts','desc'), fb.limit(50)), s => {
    if (!s.empty) { DB.notifikasi=s.docs.map(d=>({_id:d.id,...d.data()})); import('./ui-render.js').then(r=>r.renderNotifications()); }
  });

  fb.onSnapshot(fb.query(fb.col('gudang'),      fb.orderBy('_ts','desc')), s => {
    DB.gudang = s.docs.map(d=>({_id:d.id,...d.data()}));
    import('./ui-render.js').then(r=>r.renderGudangList());
    const badge = document.getElementById('total-gudang-badge');
    if (badge) badge.textContent = DB.gudang.length + ' Gudang';
  });

  fb.onSnapshot(fb.query(fb.col('surat_jalan'), fb.orderBy('_ts','desc')), s => {
    DB.surat_jalan = s.docs.map(d=>({_id:d.id,...d.data()}));
    import('./ui-render.js').then(r=>r.renderSuratJalanList());
  });
}
