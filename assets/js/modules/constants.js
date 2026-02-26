// ================================================================
//  BMS — modules/constants.js  v1.0
//  Phase 2 — ES Modules Refactor
//  Exports: MENU_CONFIG, MENU_GROUPS, state (mutable), DB,
//           pagination, invoiceFilter, helpers (fmtRp, terbilang),
//           DEFAULT_KATEGORI, PAGE_SIZE
//
//  NOTE ON MUTABLE STATE:
//  ES module `let` exports create live bindings that are read-only
//  from importing modules. We use a shared `state` object so any
//  module can both read and write shared state without circular deps.
//  Example: state.currentUser = user;  (not: currentUser = user;)
// ================================================================

// ── MENU CONFIG ──────────────────────────────────────────────────
export const MENU_CONFIG = [
  { id:'dashboard',  label:'Dashboard',          icon:'fa-gauge',          sub:'Ringkasan bisnis hari ini' },
  { id:'invoice',    label:'Transaksi',           icon:'fa-receipt',        sub:'Daftar transaksi penjualan' },
  { id:'barang',     label:'Data Barang',         icon:'fa-box-open',       sub:'Kelola produk & inventaris' },
  { id:'stok',       label:'Info Stok',           icon:'fa-warehouse',      sub:'Informasi stok barang' },
  { id:'mitra',      label:'Mitra Bisnis',        icon:'fa-handshake',      sub:'Pelanggan & pemasok' },
  { id:'keuangan',   label:'Keuangan',            icon:'fa-chart-line',     sub:'Laporan keuangan & aset' },
  { id:'laporan',    label:'Laporan & Analitik',  icon:'fa-chart-bar',      sub:'Analisis performa bisnis' },
  { id:'sales_dash', label:'Dashboard Sales',     icon:'fa-user-chart',     sub:'Performa & bonus penjualan' },
  { id:'opname',     label:'Stock Opname',        icon:'fa-clipboard-check',sub:'Audit & generate laporan stok' },
  { id:'settings',   label:'Pengaturan',          icon:'fa-cog',            sub:'Kelola pengguna & data' },
  { id:'log',        label:'Log Aktivitas',       icon:'fa-list-check',     sub:'Rekam jejak aktivitas tim' },
  { id:'tutorial',   label:'Panduan',             icon:'fa-circle-question',sub:'Cara pakai sistem' },
  { id:'gudang',     label:'Multi-Gudang',        icon:'fa-warehouse',      sub:'Kelola stok per gudang' },
  { id:'tren_stok',  label:'Tren Stok',           icon:'fa-chart-line',     sub:'Grafik naik/turun stok' },
  { id:'surat_jalan',label:'Surat Jalan',         icon:'fa-truck',          sub:'Generate & kirim surat jalan' },
];

// ── MENU GROUPS ──────────────────────────────────────────────────
export const MENU_GROUPS = [
  { id:'g-dashboard', label:'Dashboard',     icon:'fa-gauge',           single:'dashboard' },
  { id:'g-transaksi', label:'Transaksi',     icon:'fa-receipt',         single:'invoice'   },
  { id:'g-data',      label:'Data Bisnis',   icon:'fa-boxes-stacked',   children:[
      { id:'barang',  label:'Data Barang',   icon:'fa-box-open'   },
      { id:'mitra',   label:'Mitra Bisnis',  icon:'fa-handshake'  },
      { id:'stok',    label:'Info Stok',     icon:'fa-warehouse'  },
  ]},
  { id:'g-keu',       label:'Keuangan',      icon:'fa-chart-line',      children:[
      { id:'keuangan',   label:'Keuangan',           icon:'fa-wallet'     },
      { id:'laporan',    label:'Laporan & Analitik',  icon:'fa-chart-bar'  },
      { id:'sales_dash', label:'Dashboard Sales',     icon:'fa-user-chart' },
  ]},
  { id:'g-stok',      label:'Stock Opname', icon:'fa-clipboard-check',  single:'opname'    },
  { id:'g-gudang',    label:'Multi-Gudang', icon:'fa-warehouse',        children:[
      { id:'gudang',     label:'Kelola Gudang',   icon:'fa-building'   },
      { id:'tren_stok',  label:'Tren Stok',       icon:'fa-chart-line' },
  ]},
  { id:'g-pengiriman',label:'Pengiriman',   icon:'fa-truck',            single:'surat_jalan'},
  { id:'g-setting',   label:'Pengaturan',   icon:'fa-cog',              children:[
      { id:'settings', label:'Pengaturan',    icon:'fa-cog'        },
      { id:'log',      label:'Log Aktivitas', icon:'fa-list-check' },
  ]},
  { id:'g-tutorial',  label:'Panduan',      icon:'fa-circle-question',  single:'tutorial'  },
];

// ── SHARED MUTABLE STATE ─────────────────────────────────────────
// All modules read/write this object. Never reassign the object
// itself — only mutate its properties.
// e.g.:  state.currentUser = user;    ✓
//        state = newObj;              ✗  (would break other importers)
export const state = {
  // Auth
  currentUser    : null,
  selectedRole   : 'owner',
  selectedSalesId: null,

  // Invoice form
  invItems  : [],
  invCounter: 1000,

  // App config (from Firestore /test/appConfig)
  appConfig : null,

  // Online tracking
  onlineUsers: {},

  // Chat
  chatMessages : [],
  chatOpen     : false,
  activeChatTab: 'messages',
  _lastChatCount: 0,

  // Notifications
  _notifPermission: (typeof Notification !== 'undefined')
    ? Notification.permission
    : 'default',

  // Gudang transfer
  _transferFromId: null,

  // Toast
  toastTimer: null,
};

// ── LOCAL DB — mirrors Firestore collections ─────────────────────
// Mutated in-place (never reassigned), so direct import works fine.
export const DB = {
  barang      : [],
  invoice     : [],
  mitra       : [],
  pengeluaran : [],
  pembelian   : [],
  log         : [],
  chat        : [],
  notifikasi  : [],
  gudang      : [],
  surat_jalan : [],
};

// ── PAGINATION ───────────────────────────────────────────────────
export const PAGE_SIZE = 25;

export const pagination = {
  barang  : { page: 1, total: 0 },
  invoice : { page: 1, total: 0 },
  mitra   : { page: 1, total: 0 },
  log     : { page: 1, total: 0 },
};

export function resetPage(key) {
  if (pagination[key]) pagination[key].page = 1;
}

export function goPage(key, dir) {
  if (!pagination[key]) return;
  const maxPage = Math.ceil(pagination[key].total / PAGE_SIZE);
  pagination[key].page = Math.min(
    Math.max(1, pagination[key].page + dir),
    maxPage || 1
  );
  // Delegate to render functions (still in app.js phase 6-7)
  if      (key === 'barang')  window.renderBarang?.();
  else if (key === 'invoice') window.renderInvoice?.();
  else if (key === 'mitra')   window.renderMitra?.();
  else if (key === 'log')     window.renderLog?.();
}

export function renderPagination(key, total) {
  pagination[key].total = total;
  const page    = pagination[key].page;
  const maxPage = Math.ceil(total / PAGE_SIZE) || 1;
  const from    = (page - 1) * PAGE_SIZE + 1;
  const to      = Math.min(page * PAGE_SIZE, total);
  const el = document.getElementById(`pagination-${key}`);
  if (!el) return;
  if (total === 0) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <div class="pagination-wrap">
      <span class="page-info">${from}–${to} dari ${total}</span>
      <div class="page-btns">
        <button class="page-btn" onclick="goPage('${key}',-1)" ${page<=1?'disabled':''}>
          <i class="fas fa-chevron-left"></i>
        </button>
        <span class="page-current">${page} / ${maxPage}</span>
        <button class="page-btn" onclick="goPage('${key}',1)" ${page>=maxPage?'disabled':''}>
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>`;
}

// ── INVOICE FILTER STATE ─────────────────────────────────────────
export const invoiceFilter = { dari: '', sampai: '', status: '', metode: '' };

// ── DEFAULT KATEGORI ─────────────────────────────────────────────
export const DEFAULT_KATEGORI = [
  'Beras & Tepung','Minyak & Lemak','Gula & Pemanis',
  'Bumbu & Rempah','Minuman','Snack & Camilan','Lainnya',
];

// ── CURRENCY HELPER ──────────────────────────────────────────────
// fmtRp(n) → "Rp 384.000" — used throughout the entire app
export function fmtRp(n) {
  return 'Rp ' + (Number(n) || 0).toLocaleString('id-ID');
}

// ── TERBILANG ────────────────────────────────────────────────────
// terbilang(n) → "Satu Juta Lima Ratus Ribu Rupiah"
export function terbilang(angka) {
  const satuan = [
    '','Satu','Dua','Tiga','Empat','Lima','Enam','Tujuh','Delapan','Sembilan',
    'Sepuluh','Sebelas','Dua Belas','Tiga Belas','Empat Belas','Lima Belas',
    'Enam Belas','Tujuh Belas','Delapan Belas','Sembilan Belas',
  ];
  const puluhan = [
    '','','Dua Puluh','Tiga Puluh','Empat Puluh','Lima Puluh',
    'Enam Puluh','Tujuh Puluh','Delapan Puluh','Sembilan Puluh',
  ];
  function baca(n) {
    if (n < 20)          return satuan[n];
    if (n < 100)         return puluhan[Math.floor(n/10)] + (n%10 ? ' ' + satuan[n%10] : '');
    if (n < 200)         return 'Seratus' + (n%100 ? ' ' + baca(n%100) : '');
    if (n < 1000)        return satuan[Math.floor(n/100)] + ' Ratus' + (n%100 ? ' ' + baca(n%100) : '');
    if (n < 2000)        return 'Seribu' + (n%1000 ? ' ' + baca(n%1000) : '');
    if (n < 1e6)         return baca(Math.floor(n/1000)) + ' Ribu' + (n%1000 ? ' ' + baca(n%1000) : '');
    if (n < 1e9)         return baca(Math.floor(n/1e6))  + ' Juta' + (n%1e6  ? ' ' + baca(n%1e6)  : '');
    if (n < 1e12)        return baca(Math.floor(n/1e9))  + ' Miliar' + (n%1e9 ? ' ' + baca(n%1e9) : '');
    return n.toString();
  }
  const n = Math.round(Number(angka) || 0);
  if (n === 0) return 'Nol Rupiah';
  return baca(n) + ' Rupiah';
}
