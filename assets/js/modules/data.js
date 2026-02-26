// ================================================================
//  BMS — modules/data.js  v1.0
//  Phase 5 — ES Modules Refactor
//  Exports: loadAllFromFirestore, setupRealtimeListeners,
//           addLog, renderLog, clearLog, updateFBStatus,
//           setDefaultDates, fillDropdowns, syncData, initData,
//           updateDate, applyInvoiceFilter, resetInvoiceFilter,
//           getFilteredInvoices, resetLaporanFilter
//  Dependencies: ./constants.js, ./theme.js (updateRunningText)
//
//  CROSS-MODULE BRIDGE NOTE:
//  Render functions from phases 6-7 are called via window.*
//  until those phases are refactored.
// ================================================================

import { DB, state, pagination, PAGE_SIZE, invoiceFilter, renderPagination } from './constants.js';
import { updateRunningText } from './theme.js';

// ── INIT DATA ─────────────────────────────────────────────────────
// Called by auth.js applySession() after login.
export function initData() {
  if (window.FIREBASE_READY) {
    loadAllFromFirestore();
  } else {
    let waited = 0;
    const timer = setInterval(() => {
      waited += 200;
      if (window.FIREBASE_READY) {
        clearInterval(timer);
        loadAllFromFirestore();
      } else if (waited >= 4000) {
        clearInterval(timer);
        window.renderAllFull?.();        // → app.js (phase 6-7)
        window.showToast('⚠️ Mode offline', 'warning');
      }
    }, 200);
  }
  setDefaultDates();
  window.renderChatMessages?.();         // → ui-render.js (phase 7)
  window.updateKategoriDropdowns?.();    // → settings.js  (phase 6)
  const invNoEl = document.getElementById('inv-no');
  if (invNoEl) invNoEl.value = `TRX-${new Date().getFullYear()}-${state.invCounter}`;
}

// ── LOAD ALL FROM FIRESTORE ────────────────────────────────────────
export async function loadAllFromFirestore() {
  const { FS }         = window;
  const role           = state.currentUser?.role || 'sales';
  const isOwnerAdmin   = role === 'owner' || role === 'admin';
  updateFBStatus('loading');

  try {
    const baseQueries = [
      FS.getDocs(FS.query(FS.col('barang'),       FS.orderBy('_ts','desc'))),
      FS.getDocs(FS.query(FS.col('invoice'),      FS.orderBy('_ts','desc'))),
      FS.getDocs(FS.query(FS.col('mitra'),        FS.orderBy('_ts','desc'))),
      FS.getDocs(FS.query(FS.col('notifikasi'),   FS.orderBy('_ts','desc'), FS.limit(50))),
      FS.getDocs(FS.query(FS.col('gudang'),       FS.orderBy('_ts','desc'))),
      FS.getDocs(FS.query(FS.col('surat_jalan'),  FS.orderBy('_ts','desc'))),
    ];
    const adminQueries = isOwnerAdmin ? [
      FS.getDocs(FS.query(FS.col('pengeluaran'),  FS.orderBy('_ts','desc'))),
      FS.getDocs(FS.query(FS.col('pembelian'),    FS.orderBy('_ts','desc'))),
      FS.getDocs(FS.query(FS.col('log'),          FS.orderBy('_ts','desc'), FS.limit(100))),
    ] : [];

    const results         = await Promise.all([...baseQueries, ...adminQueries]);
    const [sB, sI, sM, sN, sG, sSJ] = results;
    const [sP, sPm, sL]  = isOwnerAdmin ? results.slice(6) : [null, null, null];

    if (!sB.empty)  DB.barang      = sB.docs.map(d  => ({ _id: d.id, ...d.data() }));
    if (!sI.empty)  DB.invoice     = sI.docs.map(d  => ({ _id: d.id, ...d.data() }));
    if (!sM.empty)  DB.mitra       = sM.docs.map(d  => ({ _id: d.id, ...d.data() }));
    if (sP  && !sP.empty)  DB.pengeluaran = sP.docs.map(d  => ({ _id: d.id, ...d.data() }));
    if (sPm && !sPm.empty) DB.pembelian   = sPm.docs.map(d => ({ _id: d.id, ...d.data() }));
    if (sL  && !sL.empty)  DB.log         = sL.docs.map(d  => ({ _id: d.id, ...d.data() }));
    if (!sN.empty)  DB.notifikasi  = sN.docs.map(d  => ({ _id: d.id, ...d.data() }));
    if (!sG.empty)  DB.gudang      = sG.docs.map(d  => ({ _id: d.id, ...d.data() }));
    if (!sSJ.empty) DB.surat_jalan = sSJ.docs.map(d => ({ _id: d.id, ...d.data() }));

    setupRealtimeListeners();
    window.renderAllFull?.();            // → app.js (phase 6-7)
    renderLog();
    updateFBStatus('online');
    window.showToast('☁️ Data berhasil dimuat dari Firebase!', 'success');
  } catch(err) {
    console.error('Firestore error:', err);
    updateFBStatus('offline');
    window.renderAllFull?.();
    window.showToast('⚠️ Firebase error — ' + err.message, 'warning');
  }
}

// ── REALTIME LISTENERS ────────────────────────────────────────────
export function setupRealtimeListeners() {
  const { FS }       = window;
  const isOwnerAdmin = state.currentUser?.role === 'owner' || state.currentUser?.role === 'admin';

  // Barang — all roles
  FS.onSnapshot(FS.query(FS.col('barang'), FS.orderBy('_ts','desc')), s => {
    DB.barang = s.docs.map(d => ({ _id: d.id, ...d.data() }));
    window.renderBarang?.();           // → ui-render.js (phase 7)
    window.renderStok?.();             // → ui-render.js (phase 7)
    window.renderStokKritis?.();       // → ui-render.js (phase 7)
    fillDropdowns();
    window.buildMainChart?.();         // → ui-render.js (phase 7)
    updateRunningText();
    window.renderDashboardStats?.();   // → ui-render.js (phase 7)
  });

  // Invoice — all roles
  FS.onSnapshot(FS.query(FS.col('invoice'), FS.orderBy('_ts','desc')), s => {
    DB.invoice = s.docs.map(d => ({ _id: d.id, ...d.data() }));
    window.renderInvoice?.();          // → ui-render.js (phase 7)
    window.renderInvoiceStats?.();     // → ui-render.js (phase 7)
    window.renderDashboardStats?.();
    window.buildMainChart?.();
    if (window.isPageActive?.('laporan')) {
      window.buildLaporanChart?.();
      window.renderLaporanPiutang?.();
    }
  });

  // Mitra — all roles
  FS.onSnapshot(FS.query(FS.col('mitra'), FS.orderBy('_ts','desc')), s => {
    DB.mitra = s.docs.map(d => ({ _id: d.id, ...d.data() }));
    window.renderMitra?.();            // → ui-render.js (phase 7)
    fillDropdowns();
  });

  // Pengeluaran, pembelian, log — owner/admin only
  if (isOwnerAdmin) {
    FS.onSnapshot(FS.query(FS.col('pengeluaran'), FS.orderBy('_ts','desc')), s => {
      DB.pengeluaran = s.docs.map(d => ({ _id: d.id, ...d.data() }));
      window.renderPengeluaran?.();    // → ui-render.js (phase 7)
      if (window.isPageActive?.('keuangan')) window.renderAssets?.();
    });
    FS.onSnapshot(FS.query(FS.col('pembelian'), FS.orderBy('_ts','desc')), s => {
      DB.pembelian = s.docs.map(d => ({ _id: d.id, ...d.data() }));
      window.renderPembelian?.();      // → ui-render.js (phase 7)
      if (window.isPageActive?.('keuangan')) window.renderAssets?.();
    });
    FS.onSnapshot(FS.query(FS.col('log'), FS.orderBy('_ts','desc'), FS.limit(100)), s => {
      DB.log = s.docs.map(d => ({ _id: d.id, ...d.data() }));
      renderLog();
    });
  }

  // Chat — all roles
  FS.onSnapshot(FS.query(FS.col('chat'), FS.orderBy('_ts','asc'), FS.limit(50)), s => {
    const newMessages = s.docs.map(d => ({ _id: d.id, ...d.data() }));
    // Sound notification for new messages from others while chat is closed
    if (!state.chatOpen && newMessages.length > state._lastChatCount) {
      const latest = newMessages[newMessages.length - 1];
      const myUid  = window.FA?.currentUser()?.uid;
      if (latest.uid !== myUid) {
        window.playChatNotifSound?.();  // → ui-render.js (phase 7)
        const badge = document.getElementById('chat-unread-badge');
        if (badge) { badge.style.display = ''; badge.textContent = '!'; }
      }
    }
    state._lastChatCount = newMessages.length;
    DB.chat = newMessages;
    window.renderChatMessages?.();     // → ui-render.js (phase 7)
  });

  // Notifikasi — all roles
  FS.onSnapshot(FS.query(FS.col('notifikasi'), FS.orderBy('_ts','desc'), FS.limit(50)), s => {
    if (!s.empty) {
      DB.notifikasi = s.docs.map(d => ({ _id: d.id, ...d.data() }));
      window.renderNotifications?.();  // → ui-render.js (phase 7)
    }
  });

  // Gudang — all roles
  FS.onSnapshot(FS.query(FS.col('gudang'), FS.orderBy('_ts','desc')), s => {
    DB.gudang = s.docs.map(d => ({ _id: d.id, ...d.data() }));
    window.renderGudangList?.();       // → ui-render.js (phase 7)
    const badge = document.getElementById('total-gudang-badge');
    if (badge) badge.textContent = DB.gudang.length + ' Gudang';
  });

  // Surat Jalan — all roles
  FS.onSnapshot(FS.query(FS.col('surat_jalan'), FS.orderBy('_ts','desc')), s => {
    DB.surat_jalan = s.docs.map(d => ({ _id: d.id, ...d.data() }));
    window.renderSuratJalanList?.();   // → ui-render.js (phase 7)
  });
}

// ── ACTIVITY LOG ──────────────────────────────────────────────────
export async function addLog(aksi, detail) {
  if (!state.currentUser) return;
  const data = {
    user  : state.currentUser.name,
    role  : state.currentUser.role,
    aksi, detail,
    waktu : new Date().toISOString(),
  };
  try {
    await window.FS.addDoc(window.FS.col('log'), data);
  } catch(e) {
    DB.log.unshift({ ...data, _id: Date.now().toString() });
    renderLog();
  }
}

export function renderLog() {
  const tbody = document.getElementById('tbody-log');
  if (!tbody) return;
  const icons = {
    login  : 'fa-sign-in-alt',
    tambah : 'fa-plus',
    hapus  : 'fa-trash',
    invoice: 'fa-file-invoice',
    stok   : 'fa-warehouse',
    chat   : 'fa-comment',
    edit   : 'fa-edit',
    export : 'fa-download',
    setting: 'fa-cog',
  };
  const total = DB.log.length;
  const page  = pagination.log.page;
  const start = (page - 1) * PAGE_SIZE;
  const paged = DB.log.slice(start, start + PAGE_SIZE);

  tbody.innerHTML = paged.map(l => `
    <tr>
      <td><span class="badge badge-blue"><i class="fas ${icons[l.aksi] || 'fa-circle'} me-1"></i>${l.aksi}</span></td>
      <td><strong>${l.user}</strong></td>
      <td><span class="badge ${l.role==='owner'?'badge-purple':l.role==='admin'?'badge-amber':'badge-green'}">${l.role}</span></td>
      <td>${l.detail}</td>
      <td style="color:var(--text-muted);font-size:12px">${new Date(l.waktu).toLocaleString('id-ID')}</td>
    </tr>`).join('')
    || '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted)">📋 Log kosong</td></tr>';

  renderPagination('log', total);
}

export async function clearLog() {
  if (state.currentUser?.role !== 'owner') {
    window.showToast('❌ Hanya Owner yang bisa hapus log!', 'error'); return;
  }
  if (!confirm('Hapus semua log aktivitas dari cloud? Tindakan ini permanen!')) return;
  try {
    const snap  = await window.FS.getDocs(window.FS.col('log'));
    const batch = window.FS.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    DB.log = [];
    renderLog();
    window.showToast('🗑️ Log berhasil dihapus dari cloud!');
    addLog('setting', 'Log aktivitas dibersihkan');
  } catch(e) {
    window.showToast('❌ Gagal hapus log: ' + e.message, 'error');
  }
}

// ── FIREBASE STATUS INDICATOR ─────────────────────────────────────
export function updateFBStatus(state_) {
  const el  = document.getElementById('fb-status');
  const txt = document.getElementById('fb-status-text');
  if (!el || !txt) return;
  const states = {
    online  : { cls:'online',  text:'☁️ Firebase terhubung — data real-time' },
    offline : { cls:'offline', text:'⚠️ Tidak terhubung — cek koneksi internet atau Firestore Rules' },
    loading : { cls:'offline', text:'🔄 Menghubungkan ke Firebase...' },
    rules   : { cls:'offline', text:'🔒 Akses ditolak — periksa Firestore Security Rules' },
  };
  const s = states[state_] || states.offline;
  el.className    = `firebase-status ${s.cls}`;
  txt.textContent = s.text;
}

// ── DEFAULT DATES ─────────────────────────────────────────────────
export function setDefaultDates() {
  const today = new Date().toISOString().split('T')[0];
  ['inv-tgl','pe-tgl','sm-tgl','sk-tgl','pb-tgl'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = today;
  });
  const t30 = new Date();
  t30.setDate(t30.getDate() + 30);
  const tempoEl = document.getElementById('inv-tempo');
  if (tempoEl) tempoEl.value = t30.toISOString().split('T')[0];
}

// ── DATE DISPLAY ──────────────────────────────────────────────────
export function updateDate() {
  const el = document.getElementById('topbar-date');
  if (el) el.textContent = new Date().toLocaleDateString('id-ID', {
    weekday:'short', day:'numeric', month:'short', year:'numeric',
  });
}

// ── DROPDOWNS ─────────────────────────────────────────────────────
export function fillDropdowns() {
  const mitraOpts   = DB.mitra.map(m => `<option>${m.nama}</option>`).join('');
  const barangOpts  = DB.barang.map(b => `<option>${b.nama}</option>`).join('');
  const pemasokOpts = DB.mitra
    .filter(m => m.tipe === 'Pemasok')
    .map(m => `<option>${m.nama}</option>`).join('');

  const safe = (id, inner) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = inner;
  };
  safe('inv-mitra',  '<option value="">Pilih Mitra...</option>'   + mitraOpts);
  safe('sm-barang',  '<option value="">Pilih Barang...</option>'  + barangOpts);
  safe('sk-barang',  '<option value="">Pilih Barang...</option>'  + barangOpts);
  safe('pb-barang',  '<option value="">Pilih Barang...</option>'  + barangOpts);
  safe('sm-pemasok', '<option value="">Pilih Pemasok...</option>' + pemasokOpts);
  safe('pb-pemasok', '<option value="">Pilih Pemasok...</option>' + pemasokOpts);
}

// ── SYNC BUTTON ───────────────────────────────────────────────────
export async function syncData() {
  const icon = document.getElementById('sync-icon');
  if (icon) icon.style.animation = 'spin 1s linear infinite';
  window.showToast('🔄 Sinkronisasi data...', 'info');
  try {
    await loadAllFromFirestore();
    if (icon) icon.style.animation = '';
    window.showToast('☁️ Data tersinkronkan!');
  } catch(e) {
    if (icon) icon.style.animation = '';
    window.showToast('❌ Gagal sinkronisasi', 'error');
  }
}

// ── INVOICE FILTER ────────────────────────────────────────────────
export function applyInvoiceFilter() {
  invoiceFilter.dari   = document.getElementById('filter-inv-dari')?.value   || '';
  invoiceFilter.sampai = document.getElementById('filter-inv-sampai')?.value || '';
  invoiceFilter.status = document.getElementById('filter-inv-status')?.value || '';
  invoiceFilter.metode = document.getElementById('filter-inv-metode')?.value || '';
  pagination.invoice.page = 1;
  window.renderInvoice?.();
}

export function resetInvoiceFilter() {
  ['filter-inv-dari','filter-inv-sampai','filter-inv-status','filter-inv-metode']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  invoiceFilter.dari = invoiceFilter.sampai = invoiceFilter.status = invoiceFilter.metode = '';
  pagination.invoice.page = 1;
  window.renderInvoice?.();
}

export function getFilteredInvoices() {
  let list = [...DB.invoice];
  // Sales: show only own invoices
  if (state.currentUser?.role === 'sales') {
    list = list.filter(i =>
      i.salesUid === state.currentUser.uid ||
      i.salesName === state.currentUser.name
    );
  }
  if (invoiceFilter.dari)   list = list.filter(i => i.tgl >= invoiceFilter.dari);
  if (invoiceFilter.sampai) list = list.filter(i => i.tgl <= invoiceFilter.sampai);
  if (invoiceFilter.status) list = list.filter(i => i.status === invoiceFilter.status);
  if (invoiceFilter.metode) list = list.filter(i => i.metodeBayar === invoiceFilter.metode);

  const info      = document.getElementById('filter-inv-info');
  const hasFilter = invoiceFilter.dari || invoiceFilter.sampai ||
                    invoiceFilter.status || invoiceFilter.metode;
  if (info) info.textContent = hasFilter ? `${list.length} transaksi ditemukan` : '';
  return list;
}

// ── LAPORAN FILTER ────────────────────────────────────────────────
export function resetLaporanFilter() {
  ['filter-lap-dari','filter-lap-sampai'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  window.buildLaporanChart?.();
}
