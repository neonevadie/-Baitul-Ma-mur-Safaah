// ================================================================
//  BMS — constants.js  (ES Module)
//  State terpusat, konfigurasi menu, dan DB lokal
// ================================================================

export const PAGE_SIZE = 25;

export const MENU_CONFIG = [
  { id:'dashboard',   label:'Dashboard',          icon:'fa-gauge',           sub:'Ringkasan bisnis hari ini' },
  { id:'invoice',     label:'Transaksi',           icon:'fa-receipt',         sub:'Daftar transaksi penjualan' },
  { id:'barang',      label:'Data Barang',         icon:'fa-box-open',        sub:'Kelola produk & inventaris' },
  { id:'stok',        label:'Info Stok',           icon:'fa-warehouse',       sub:'Informasi stok barang' },
  { id:'mitra',       label:'Mitra Bisnis',        icon:'fa-handshake',       sub:'Pelanggan & pemasok' },
  { id:'keuangan',    label:'Keuangan',            icon:'fa-chart-line',      sub:'Laporan keuangan & aset' },
  { id:'laporan',     label:'Laporan & Analitik',  icon:'fa-chart-bar',       sub:'Analisis performa bisnis' },
  { id:'sales_dash',  label:'Dashboard Sales',     icon:'fa-user-chart',      sub:'Performa & bonus penjualan' },
  { id:'opname',      label:'Stock Opname',        icon:'fa-clipboard-check', sub:'Audit & generate laporan stok' },
  { id:'settings',    label:'Pengaturan',          icon:'fa-cog',             sub:'Kelola pengguna & data' },
  { id:'log',         label:'Log Aktivitas',       icon:'fa-list-check',      sub:'Rekam jejak aktivitas tim' },
  { id:'tutorial',    label:'Panduan',             icon:'fa-circle-question', sub:'Cara pakai sistem' },
  { id:'gudang',      label:'Multi-Gudang',        icon:'fa-warehouse',       sub:'Kelola stok per gudang' },
  { id:'tren_stok',   label:'Tren Stok',           icon:'fa-chart-line',      sub:'Grafik naik/turun stok' },
  { id:'surat_jalan', label:'Surat Jalan',         icon:'fa-truck',           sub:'Generate & kirim surat jalan' },
];

export const MENU_GROUPS = [
  { id:'g-dashboard',  label:'Dashboard',    icon:'fa-gauge',          single:'dashboard'    },
  { id:'g-transaksi',  label:'Transaksi',    icon:'fa-receipt',        single:'invoice'      },
  { id:'g-data',       label:'Data Bisnis',  icon:'fa-boxes-stacked',  children:[
      { id:'barang', label:'Data Barang',  icon:'fa-box-open'  },
      { id:'mitra',  label:'Mitra Bisnis', icon:'fa-handshake' },
      { id:'stok',   label:'Info Stok',    icon:'fa-warehouse' },
  ]},
  { id:'g-keu',        label:'Keuangan',     icon:'fa-chart-line',     children:[
      { id:'keuangan',   label:'Keuangan',          icon:'fa-wallet'    },
      { id:'laporan',    label:'Laporan & Analitik', icon:'fa-chart-bar' },
      { id:'sales_dash', label:'Dashboard Sales',    icon:'fa-user-chart'},
  ]},
  { id:'g-stok',       label:'Stock Opname', icon:'fa-clipboard-check', single:'opname'      },
  { id:'g-gudang',     label:'Multi-Gudang', icon:'fa-warehouse',      children:[
      { id:'gudang',    label:'Kelola Gudang', icon:'fa-building'   },
      { id:'tren_stok', label:'Tren Stok',     icon:'fa-chart-line' },
  ]},
  { id:'g-pengiriman', label:'Pengiriman',   icon:'fa-truck',           single:'surat_jalan' },
  { id:'g-setting',    label:'Pengaturan',   icon:'fa-cog',            children:[
      { id:'settings', label:'Pengaturan',    icon:'fa-cog'        },
      { id:'log',      label:'Log Aktivitas', icon:'fa-list-check'  },
  ]},
  { id:'g-tutorial',   label:'Panduan',      icon:'fa-circle-question', single:'tutorial'    },
];

// ── Local Database (mutable object shared across modules) ─────────
export const DB = {
  barang: [], invoice: [], mitra: [],
  pengeluaran: [], pembelian: [],
  log: [], chat: [], notifikasi: [],
  gudang: [], surat_jalan: [],
};

// ── Application State ─────────────────────────────────────────────
export const state = {
  currentUser    : null,
  selectedRole   : 'owner',
  selectedSalesId: null,
  invItems       : [],
  invCounter     : 1000,
  appConfig      : null,
  onlineUsers    : {},
  chatMessages   : [],
  chatOpen       : false,
  activeChatTab  : 'messages',
  openGroups     : new Set(['g-data']),
  _lastChatCount : 0,
  // Staged foto files untuk upload ke Storage (sebelum simpan)
  _stagedFotoFiles: [],
};

// ── Pagination State ──────────────────────────────────────────────
export const pagination = {
  barang : { page: 1, total: 0 },
  invoice: { page: 1, total: 0 },
  mitra  : { page: 1, total: 0 },
  log    : { page: 1, total: 0 },
};

// ── Cursor-based Pagination State (Upgrade 4.2) ───────────────────
export const cursors = {
  barang : { stack: [null], lastVisible: null, hasMore: true },
  invoice: { stack: [null], lastVisible: null, hasMore: true },
  mitra  : { stack: [null], lastVisible: null, hasMore: true },
};

// ── Filter State ──────────────────────────────────────────────────
export const invoiceFilter = { dari: '', sampai: '', status: '', metode: '' };
export const laporanFilter = { dari: '', sampai: '' };

// ── Kategori Default ──────────────────────────────────────────────
export const DEFAULT_KATEGORI = [
  'Beras & Tepung','Minyak & Lemak','Gula & Pemanis',
  'Bumbu & Rempah','Minuman','Snack & Camilan','Lainnya'
];
