/* ================================================================
   BMS — App Logic (app.js)
   CV. Baitul Ma'mur Syafaah | Sistem Manajemen Bisnis v3.1
   ================================================================ */

// ================================================================
// DATA
// ================================================================
const USERS = {
  owner: { pass:'bms2024', name:'Owner BMS',      label:'Pemilik',      avatar:'O', menus:['dashboard','barang','invoice','stok','mitra','keuangan','laporan','sales_dash','opname','settings','log','tutorial'] },
  admin: { pass:'bms2024', name:'Admin Keuangan', label:'Tim Keuangan', avatar:'A', menus:['dashboard','barang','invoice','stok','mitra','keuangan','laporan','opname','settings','tutorial'] },
  sales: { pass:'bms2024', name:'Tim Sales',      label:'Tim Sales',    avatar:'S', menus:['dashboard','stok','invoice','mitra','sales_dash','tutorial'] },
};

const MENU_CONFIG = [
  { id:'dashboard',  label:'Dashboard',       sub:'Ringkasan bisnis hari ini',      icon:'fa-gauge-high'      },
  { id:'barang',     label:'Data Barang',      sub:'Kelola produk & inventaris',     icon:'fa-boxes-stacked'   },
  { id:'invoice',    label:'Transaksi',        sub:'Buat & kelola invoice',          icon:'fa-file-invoice-dollar' },
  { id:'stok',       label:'Info Stok',        sub:'Monitor stok masuk/keluar',      icon:'fa-warehouse'       },
  { id:'mitra',      label:'Mitra Bisnis',     sub:'Pelanggan & pemasok',            icon:'fa-handshake'       },
  { id:'keuangan',   label:'Keuangan',         sub:'Laporan laba rugi & pengeluaran',icon:'fa-coins'           },
  { id:'laporan',    label:'Laporan & Analitik',sub:'Grafik & statistik bisnis',     icon:'fa-chart-line'      },
  { id:'sales_dash', label:'Dashboard Sales',  sub:'Performa & estimasi bonus',      icon:'fa-user-tie'        },
  { id:'opname',     label:'Stock Opname',     sub:'Audit stok fisik vs sistem',     icon:'fa-clipboard-list'  },
  { id:'settings',   label:'Pengaturan',       sub:'Profil & konfigurasi sistem',    icon:'fa-gear'            },
  { id:'log',        label:'Log Aktivitas',    sub:'Rekam jejak semua tindakan',     icon:'fa-list-check'      },
  { id:'tutorial',   label:'Panduan',          sub:'Cara penggunaan BMS',            icon:'fa-book-open'       },
];

const DB = {
  barang: [
    { kode:'BRS-001', nama:'Beras Premium 5kg',   kategori:'Beras & Tepung',  satuan:'Karung', hbeli:65000,  hjual:72000,  stok:450, minStok:50,  masuk:600, keluar:150, foto:[], lokasi:'Rak A-1', desc:'' },
    { kode:'MNY-001', nama:'Minyak Goreng 5L',    kategori:'Minyak & Lemak',  satuan:'Dus',    hbeli:68000,  hjual:76000,  stok:8,   minStok:20,  masuk:100, keluar:92,  foto:[], lokasi:'Rak B-2', desc:'' },
    { kode:'GUL-001', nama:'Gula Pasir 50kg',     kategori:'Gula & Pemanis',  satuan:'Karung', hbeli:640000, hjual:710000, stok:12,  minStok:15,  masuk:80,  keluar:68,  foto:[], lokasi:'Rak C-1', desc:'' },
    { kode:'TPG-001', nama:'Tepung Terigu 25kg',  kategori:'Beras & Tepung',  satuan:'Karung', hbeli:155000, hjual:175000, stok:25,  minStok:30,  masuk:120, keluar:95,  foto:[], lokasi:'Rak A-3', desc:'' },
    { kode:'KCP-001', nama:'Kecap Manis 620ml',   kategori:'Bumbu & Rempah',  satuan:'Karton', hbeli:72000,  hjual:85000,  stok:30,  minStok:25,  masuk:50,  keluar:20,  foto:[], lokasi:'Rak D-4', desc:'' },
    { kode:'GRM-001', nama:'Garam Dapur 500g',    kategori:'Bumbu & Rempah',  satuan:'Dus',    hbeli:18000,  hjual:22000,  stok:180, minStok:50,  masuk:200, keluar:20,  foto:[], lokasi:'Rak D-1', desc:'' },
  ],
  invoice: [
    { no:'TRX-2025-0892', tgl:'2025-01-20', mitra:'PT Sinar Mas',      total:52450000, status:'Belum Lunas', tempo:'2025-02-20', bayar:'Tempo',    sales:'owner' },
    { no:'TRX-2025-0891', tgl:'2025-01-18', mitra:'UD Maju Jaya',      total:28900000, status:'Lunas',       tempo:'2025-02-17', bayar:'Transfer',  sales:'owner' },
    { no:'TRX-2025-0890', tgl:'2025-01-15', mitra:'CV Berkah Indah',   total:15600000, status:'Jatuh Tempo', tempo:'2025-01-15', bayar:'Tempo',    sales:'admin' },
    { no:'TRX-2025-0889', tgl:'2025-01-12', mitra:'Toko Makmur',       total:8750000,  status:'Lunas',       tempo:'2025-02-12', bayar:'Tunai',    sales:'sales' },
    { no:'TRX-2025-0888', tgl:'2025-01-10', mitra:'PT Fajar Sejahtera',total:67000000, status:'Belum Lunas', tempo:'2025-02-10', bayar:'Tempo',    sales:'owner' },
  ],
  mitra: [
    { kode:'MTR-001', nama:'PT Sinar Mas',        tipe:'Pelanggan', pic:'Bapak Santoso', hp:'0812-1111-2222', kota:'Jakarta',   piutang:52450000, status:'Aktif' },
    { kode:'MTR-002', nama:'UD Maju Jaya',         tipe:'Pelanggan', pic:'Ibu Dewi',      hp:'0813-3333-4444', kota:'Bogor',     piutang:0,        status:'Aktif' },
    { kode:'MTR-003', nama:'CV Gula Nusantara',    tipe:'Pemasok',   pic:'Pak Herman',    hp:'0821-5555-6666', kota:'Surabaya',  piutang:0,        status:'Aktif' },
    { kode:'MTR-004', nama:'CV Berkah Indah',      tipe:'Pelanggan', pic:'Ibu Sari',      hp:'0856-7777-8888', kota:'Depok',     piutang:15600000, status:'Aktif' },
    { kode:'MTR-005', nama:'PT Beras Jaya',        tipe:'Pemasok',   pic:'Pak Heru',      hp:'0878-9999-0000', kota:'Bandung',   piutang:0,        status:'Aktif' },
  ],
  pengeluaran: [
    { tgl:'2025-01-20', ket:'Gaji Karyawan Jan',   jml:18000000, kat:'Gaji & Tunjangan' },
    { tgl:'2025-01-15', ket:'Listrik & Air Gudang', jml:2400000,  kat:'Listrik & Air'    },
    { tgl:'2025-01-10', ket:'Transport & BBM',      jml:3500000,  kat:'Transport'        },
  ],
  pembelian: [
    { tgl:'2025-01-19', pemasok:'PT Beras Jaya',       barang:'Beras Premium 5kg', total:130000000 },
    { tgl:'2025-01-15', pemasok:'CV Gula Nusantara',   barang:'Gula Pasir 50kg',   total:87000000  },
  ],
  notifikasi: [
    { id:1, pesan:'Stok Gula Pasir kritis — sisa 12 karung',          waktu:'2 menit lalu',  tipe:'danger',  baca:false },
    { id:2, pesan:'Invoice TRX-2025-0890 sudah jatuh tempo',           waktu:'1 jam lalu',    tipe:'warning', baca:false },
    { id:3, pesan:'Mitra baru: CV Berkah Jaya Makmur',                 waktu:'3 jam lalu',    tipe:'success', baca:false },
    { id:4, pesan:'Stok Minyak Goreng hampir habis — sisa 8 dus',      waktu:'Kemarin',       tipe:'danger',  baca:true  },
    { id:5, pesan:'Pembayaran Rp 45 Jt diterima dari UD Maju Jaya',    waktu:'Kemarin',       tipe:'success', baca:true  },
  ],
  kategori: ['Beras & Tepung','Minyak & Lemak','Gula & Pemanis','Bumbu & Rempah','Minuman','Snack & Camilan','Lainnya'],
  log: [],
};

let currentUser = null;
let selectedRole = 'owner';
let invCounter   = 893;
let invItems     = [];
let chatMessages = [
  { id:1, sender:'Admin Rina', avatar:'R', text:'Selamat pagi! Stok gula hampir habis ya.', time:'09.15', mine:false },
  { id:2, sender:'Owner',      avatar:'O', text:'Sudah saya kontak pemasok. PO sudah dikirim.', time:'09.18', mine:true  },
  { id:3, sender:'Sales Budi', avatar:'B', text:'Ada order besar dari PT Sinar Mas, 500 karung beras.', time:'09.45', mine:false },
];

// ================================================================
// FIREBASE LOADER
// firebase.js (module) bisa saja run SEBELUM app.js (defer) sempat addEventListener
// Solusi: cek FIREBASE_READY di DOMContentLoaded JUGA, bukan hanya event listener
// ================================================================
window.addEventListener('firebase-ready', () => {
  console.log('✅ firebase-ready event received by app.js');
  updateFBStatus('online');
  if (currentUser) loadAllFromFirestore();
});
window.addEventListener('firebase-failed', () => {
  updateFBStatus('offline');
});

// ================================================================
// STATUS INDICATOR
// ================================================================
function updateFBStatus(state) {
  const el  = document.getElementById('fb-status');
  const txt = document.getElementById('fb-status-text');
  if (!el || !txt) return;
  const map = {
    online : { cls:'online',  text:'☁️ Firebase terhubung — data tersinkron ke cloud' },
    offline: { cls:'offline', text:'⚠️ Tidak terhubung — cek koneksi internet' },
    loading: { cls:'offline', text:'🔄 Menghubungkan ke Firebase...' },
  };
  const s = map[state] || map.offline;
  el.className = 'firebase-status ' + s.cls;
  txt.textContent = s.text;
}

// ================================================================
// FIRESTORE CRUD
// ================================================================
async function loadAllFromFirestore() {
  if (!window.FS) { renderAll(); return; }
  updateFBStatus('loading');
  try {
    const F = window.FS;
    const [sB, sI, sM, sPe, sPb] = await Promise.all([
      F.getDocs(F.query(F.col('barang'),      F.orderBy('_ts','desc'))),
      F.getDocs(F.query(F.col('invoice'),     F.orderBy('_ts','desc'))),
      F.getDocs(F.query(F.col('mitra'),       F.orderBy('_ts','desc'))),
      F.getDocs(F.query(F.col('pengeluaran'), F.orderBy('_ts','desc'))),
      F.getDocs(F.query(F.col('pembelian'),   F.orderBy('_ts','desc'))),
    ]);
    if (sB.empty && sI.empty) {
      await seedDemoData();
    } else {
      if (!sB.empty)  DB.barang      = sB.docs.map(d  => ({_id:d.id,...d.data()}));
      if (!sI.empty)  DB.invoice     = sI.docs.map(d  => ({_id:d.id,...d.data()}));
      if (!sM.empty)  DB.mitra       = sM.docs.map(d  => ({_id:d.id,...d.data()}));
      if (!sPe.empty) DB.pengeluaran = sPe.docs.map(d => ({_id:d.id,...d.data()}));
      if (!sPb.empty) DB.pembelian   = sPb.docs.map(d => ({_id:d.id,...d.data()}));
    }
    setupRealtimeListeners();
    renderAll();
    updateFBStatus('online');
    showToast('☁️ Data dimuat dari Firebase!', 'success');
  } catch(err) {
    console.error('Firestore error:', err);
    renderAll();
    updateFBStatus('offline');
    showToast('⚠️ Firebase gagal — pakai data lokal', 'warning');
  }
}

function setupRealtimeListeners() {
  const F = window.FS;
  F.onSnapshot(F.query(F.col('barang'),      F.orderBy('_ts','desc')), s => {
    if (!s.empty) { DB.barang      = s.docs.map(d => ({_id:d.id,...d.data()})); renderBarang(); renderStok(); renderStokKritis(); fillDropdowns(); updateDashboard(); }
  });
  F.onSnapshot(F.query(F.col('invoice'),     F.orderBy('_ts','desc')), s => {
    if (!s.empty) { DB.invoice     = s.docs.map(d => ({_id:d.id,...d.data()})); renderInvoice(); updateDashboard(); }
  });
  F.onSnapshot(F.query(F.col('mitra'),       F.orderBy('_ts','desc')), s => {
    if (!s.empty) { DB.mitra       = s.docs.map(d => ({_id:d.id,...d.data()})); renderMitra(); fillDropdowns(); updateDashboard(); }
  });
  F.onSnapshot(F.query(F.col('pengeluaran'), F.orderBy('_ts','desc')), s => {
    if (!s.empty) { DB.pengeluaran = s.docs.map(d => ({_id:d.id,...d.data()})); renderPengeluaran(); }
  });
  F.onSnapshot(F.query(F.col('pembelian'),   F.orderBy('_ts','desc')), s => {
    if (!s.empty) { DB.pembelian   = s.docs.map(d => ({_id:d.id,...d.data()})); renderPembelian(); }
  });
}

async function seedDemoData() {
  const F = window.FS;
  showToast('⏳ Inisialisasi database pertama kali...', 'info');
  await Promise.all([
    ...DB.barang.map(b      => F.addDoc(F.col('barang'),      b)),
    ...DB.invoice.map(i     => F.addDoc(F.col('invoice'),     i)),
    ...DB.mitra.map(m       => F.addDoc(F.col('mitra'),       m)),
    ...DB.pengeluaran.map(p => F.addDoc(F.col('pengeluaran'), p)),
    ...DB.pembelian.map(p   => F.addDoc(F.col('pembelian'),   p)),
  ]);
  showToast('✅ Data awal tersimpan ke Firebase!');
}

// Sync manual
async function syncData() {
  const icon = document.getElementById('sync-icon');
  if (icon) icon.style.animation = 'spin 1s linear infinite';
  showToast('🔄 Sinkronisasi...', 'info');
  try {
    await loadAllFromFirestore();
  } catch(e) {
    showToast('❌ Gagal sinkronisasi', 'error');
  } finally {
    if (icon) icon.style.animation = '';
  }
}

// ================================================================
// LOGIN / LOGOUT
// ================================================================
function selectRole(role) {
  selectedRole = role;
  document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('role-' + role);
  if (btn) btn.classList.add('active');
  const names = { owner:'Owner BMS', admin:'Admin Keuangan', sales:'Tim Sales' };
  const disp  = document.getElementById('login-user-display');
  if (disp) disp.textContent = names[role] || role;
  // Tampilkan/sembunyikan sales list panel
  const panel = document.getElementById('sales-list-panel');
  if (panel) panel.style.display = role === 'sales' ? 'block' : 'none';
}

function doLogin() {
  const pass = (document.getElementById('login-pass')?.value || '').trim();
  const user  = USERS[selectedRole];
  if (!user || user.pass !== pass) {
    showToast('❌ Password salah!', 'error');
    const el = document.getElementById('login-pass');
    if (el) { el.style.borderColor = 'rgba(239,68,68,0.7)'; setTimeout(() => el.style.borderColor = '', 2000); }
    return;
  }
  currentUser = { ...user, username: selectedRole };
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('app').style.display        = 'block';

  const av   = document.getElementById('sb-avatar');
  const nm   = document.getElementById('sb-name');
  const role = document.getElementById('sb-role');
  if (av)   av.textContent   = user.avatar;
  if (nm)   nm.textContent   = user.name;
  if (role) role.textContent = user.label;

  buildNav(user.menus);
  navigateTo('dashboard');
  setDefaultDates();
  fillDropdowns();
  renderAll();
  updateDate();
  renderNotifications();
  addLog('Login', user.name + ' masuk ke sistem');
  showToast('✅ Selamat datang, ' + user.name + '!');

  // Load Firebase data setelah login
  if (window.FS) {
    loadAllFromFirestore();
  } else {
    // Tunggu firebase-ready event (maks 5 detik)
    let waited = 0;
    const t = setInterval(() => {
      waited += 300;
      if (window.FS) { clearInterval(t); loadAllFromFirestore(); }
      else if (waited >= 5000) { clearInterval(t); updateFBStatus('offline'); }
    }, 300);
  }
}

function doLogout() {
  if (!confirm('Yakin ingin keluar?')) return;
  currentUser = null;
  document.getElementById('login-page').style.display = 'flex';
  document.getElementById('app').style.display        = 'none';
  document.getElementById('login-pass').value         = '';
}

// ================================================================
// NAV
// ================================================================
function buildNav(allowed) {
  const nav = document.getElementById('sidebar-nav');
  nav.innerHTML = '<div class="nav-label">MENU UTAMA</div>';
  MENU_CONFIG.filter(m => allowed.includes(m.id)).forEach(m => {
    const el = document.createElement('div');
    el.className = 'nav-item';
    el.id = 'nav-' + m.id;
    el.innerHTML = '<i class="fas ' + m.icon + '"></i><span>' + m.label + '</span>';
    el.onclick = () => { navigateTo(m.id); closeSidebar(); };
    nav.appendChild(el);
  });
}

function navigateTo(id) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const navEl  = document.getElementById('nav-' + id);
  const pageEl = document.getElementById('page-' + id);
  if (navEl)  navEl.classList.add('active');
  if (pageEl) pageEl.classList.add('active');
  const cfg = MENU_CONFIG.find(m => m.id === id);
  if (cfg) {
    const pt = document.getElementById('page-title');
    const ps = document.getElementById('page-sub');
    if (pt) pt.textContent = cfg.label;
    if (ps) ps.textContent = cfg.sub;
  }
  if (id === 'laporan')    { buildLaporanChart(); renderLaporanStats(); }
  if (id === 'sales_dash') { renderSalesDash(); }
  if (id === 'opname')     { renderOpname(); }
  if (id === 'keuangan')   { renderAssets(); renderKeuanganKPI(); }
}

// ================================================================
// SIDEBAR
// ================================================================
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('mobile-open');
  document.getElementById('sidebar-overlay')?.classList.toggle('show');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('sidebar-overlay')?.classList.remove('show');
}

// ================================================================
// INIT & RENDER ALL
// ================================================================
function renderAll() {
  renderBarang(); renderInvoice(); renderStok(); renderMitra();
  renderPengeluaran(); renderPembelian(); renderStokKritis();
  updateDashboard(); buildMainChart(); updateRunningText();
}

function setDefaultDates() {
  const today = new Date().toISOString().split('T')[0];
  const t30   = new Date(); t30.setDate(t30.getDate() + 30);
  const t30s  = t30.toISOString().split('T')[0];
  ['inv-tgl','pe-tgl','sm-tgl','sk-tgl','pb-tgl'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = today;
  });
  const tempo = document.getElementById('inv-tempo');
  if (tempo) tempo.value = t30s;
}

function fillDropdowns() {
  const mitraOpts   = DB.mitra.map(m => '<option>' + m.nama + '</option>').join('');
  const barangOpts  = DB.barang.map(b => '<option>' + b.nama + '</option>').join('');
  const pemasokOpts = DB.mitra.filter(m => m.tipe === 'Pemasok').map(m => '<option>' + m.nama + '</option>').join('');

  const set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
  set('inv-mitra',   '<option value="">Pilih Mitra...</option>'   + mitraOpts);
  set('sm-barang',   '<option value="">Pilih Barang...</option>'  + barangOpts);
  set('sm-pemasok',  '<option value="">Pilih Pemasok...</option>' + pemasokOpts);
  set('sk-barang',   '<option value="">Pilih Barang...</option>'  + barangOpts);
  set('pb-barang',   '<option value="">Pilih Barang...</option>'  + barangOpts);
  set('pb-pemasok',  '<option value="">Pilih Pemasok...</option>' + pemasokOpts);

  // Kategori dropdown di form tambah barang
  const katOpts = DB.kategori.map(k => '<option>' + k + '</option>').join('');
  const bKat = document.getElementById('b-kategori'); if (bKat) bKat.innerHTML = katOpts;
  const ebKat = document.getElementById('eb-kategori'); if (ebKat) ebKat.innerHTML = katOpts;

  // Invoice no
  const invNo = document.getElementById('inv-no');
  if (invNo) invNo.value = 'TRX-2025-0' + invCounter;
  // Mitra kode
  const mKode = document.getElementById('m-kode');
  if (mKode) mKode.value = 'MTR-' + String(DB.mitra.length + 1).padStart(3,'0');
}

// ================================================================
// DASHBOARD
// ================================================================
function updateDashboard() {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('dash-total-barang',  DB.barang.length);
  set('dash-total-invoice', DB.invoice.length);
  set('dash-total-mitra',   DB.mitra.length);
  const kritis = DB.barang.filter(b => b.stok <= b.minStok).length;
  set('dash-stok-kritis', kritis);
  set('dash-barang-aman', (DB.barang.length - kritis) + ' aman');

  // Invoice pending
  const pending = document.getElementById('invoice-pending-list');
  if (pending) {
    const belum = DB.invoice.filter(i => i.status !== 'Lunas').slice(0,5);
    pending.innerHTML = belum.length
      ? belum.map(i => '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">' +
          '<span>' + i.no + ' — <b>' + i.mitra + '</b></span>' +
          '<span style="color:var(--danger);font-weight:700">Rp ' + i.total.toLocaleString('id-ID') + '</span></div>').join('')
      : '<p style="color:var(--text-muted);font-size:13px">Semua invoice sudah lunas 🎉</p>';
  }
}

function renderStokKritis() {
  const el = document.getElementById('stok-kritis-list');
  if (!el) return;
  const kritis = DB.barang.filter(b => b.stok <= b.minStok);
  el.innerHTML = kritis.length
    ? kritis.map(b =>
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--border)">' +
        '<div><strong>' + b.nama + '</strong><br><small style="color:var(--text-muted)">' + b.lokasi + '</small></div>' +
        '<span style="color:var(--danger);font-weight:800">' + b.stok + ' ' + b.satuan + '</span></div>').join('')
    : '<p style="color:var(--text-muted);font-size:13px;text-align:center;padding:20px 0">Tidak ada stok kritis 🎉</p>';
}

function updateRunningText() {
  const el = document.getElementById('running-text-content');
  if (!el || !DB.barang.length) return;
  el.textContent = DB.barang.map(b => '🔥 ' + b.nama + ' — Stok: ' + b.stok + ' ' + b.satuan + '  |  ').join('');
}

// ================================================================
// RENDER TABLES
// ================================================================
function renderBarang() {
  const tbody = document.getElementById('tbody-barang');
  if (!tbody) return;
  const badge = document.getElementById('total-barang-badge');
  if (badge) badge.textContent = DB.barang.length + ' Item';
  tbody.innerHTML = DB.barang.map((b, i) => {
    const stokStatus = b.stok <= b.minStok
      ? '<span class="badge badge-red">Kritis</span>'
      : b.stok <= b.minStok * 2
        ? '<span class="badge badge-yellow">Rendah</span>'
        : '<span class="badge badge-green">Aman</span>';
    return '<tr>' +
      '<td><div style="width:38px;height:38px;border-radius:10px;background:var(--bg);display:flex;align-items:center;justify-content:center"><i class="fas fa-box" style="color:var(--primary-light);font-size:14px"></i></div></td>' +
      '<td><code style="font-size:11px">' + b.kode + '</code></td>' +
      '<td><strong>' + b.nama + '</strong><br><small style="color:var(--text-muted)">' + (b.desc||b.lokasi||'') + '</small></td>' +
      '<td><span class="badge badge-blue">' + b.kategori + '</span></td>' +
      '<td>' + b.satuan + '</td>' +
      '<td>Rp ' + b.hbeli.toLocaleString('id-ID') + '</td>' +
      '<td>Rp ' + b.hjual.toLocaleString('id-ID') + '</td>' +
      '<td><strong>' + b.stok + '</strong></td>' +
      '<td>' + stokStatus + '</td>' +
      '<td><button class="btn btn-outline btn-sm" onclick="editBarang(' + i + ')" title="Edit"><i class="fas fa-edit"></i></button> ' +
          '<button class="btn btn-sm" style="background:rgba(239,68,68,0.12);color:var(--danger);border:none" onclick="hapusBarang(' + i + ')" title="Hapus"><i class="fas fa-trash"></i></button></td>' +
      '</tr>';
  }).join('');
}

function renderInvoice() {
  const tbody = document.getElementById('tbody-invoice');
  if (!tbody) return;
  // KPI
  const total  = DB.invoice.reduce((s, i) => s + i.total, 0);
  const lunas  = DB.invoice.filter(i => i.status === 'Lunas').length;
  const belum  = DB.invoice.filter(i => i.status !== 'Lunas').length;
  const cash   = DB.invoice.filter(i => i.bayar === 'Tunai').reduce((s,i)=>s+i.total,0);
  const setEl  = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setEl('trx-total-count', DB.invoice.length);
  setEl('trx-lunas',       lunas);
  setEl('trx-belum',       belum);
  setEl('trx-cash',        'Rp ' + cash.toLocaleString('id-ID'));

  tbody.innerHTML = DB.invoice.map((inv, i) => {
    const badgeColor = inv.status === 'Lunas' ? 'badge-green' : inv.status === 'Jatuh Tempo' ? 'badge-red' : 'badge-yellow';
    return '<tr>' +
      '<td><code>' + inv.no + '</code></td>' +
      '<td>' + inv.tgl + '</td>' +
      '<td><strong>' + inv.mitra + '</strong></td>' +
      '<td>' + (inv.sales || '—') + '</td>' +
      '<td><strong>Rp ' + inv.total.toLocaleString('id-ID') + '</strong></td>' +
      '<td><span class="badge ' + badgeColor + '">' + inv.status + '</span></td>' +
      '<td>' + (inv.tempo || '—') + '</td>' +
      '<td>' +
        (inv.status !== 'Lunas' ? '<button class="btn btn-sm" style="background:rgba(16,185,129,0.12);color:var(--accent2);border:none;margin-right:4px" onclick="tandaiLunas(' + i + ')"><i class="fas fa-check"></i> Lunas</button>' : '') +
        '<button class="btn btn-outline btn-sm" onclick="showInvoicePreview(' + i + ')"><i class="fas fa-eye"></i></button>' +
      '</td></tr>';
  }).join('');
}

function renderStok() {
  const tbody = document.getElementById('tbody-stok');
  if (!tbody) return;
  tbody.innerHTML = DB.barang.map((b, i) => {
    const pct = b.masuk > 0 ? Math.round(b.keluar / b.masuk * 100) : 0;
    return '<tr>' +
      '<td><div style="width:34px;height:34px;border-radius:8px;background:var(--bg);display:flex;align-items:center;justify-content:center"><i class="fas fa-box" style="color:var(--primary-light);font-size:12px"></i></div></td>' +
      '<td><code style="font-size:11px">' + b.kode + '</code></td>' +
      '<td><strong>' + b.nama + '</strong></td>' +
      '<td>' + b.kategori + '</td>' +
      '<td style="color:var(--accent2)"><strong>+' + b.masuk + '</strong></td>' +
      '<td style="color:var(--danger)"><strong>-' + b.keluar + '</strong></td>' +
      '<td><strong>' + b.stok + '</strong> ' + b.satuan + '</td>' +
      '<td>' + b.minStok + '</td>' +
      '<td><div style="background:var(--bg);border-radius:20px;height:8px;width:80px;overflow:hidden"><div style="background:var(--primary-light);height:100%;width:' + Math.min(pct,100) + '%"></div></div><small>' + pct + '%</small></td>' +
      '<td>' + (b.stok <= b.minStok ? '<span class="badge badge-red">Kritis</span>' : '<span class="badge badge-green">Aman</span>') + '</td>' +
      '</tr>';
  }).join('');
}

function renderMitra() {
  const tbody = document.getElementById('tbody-mitra');
  if (!tbody) return;
  tbody.innerHTML = DB.mitra.map((m, i) => '<tr>' +
    '<td><code>' + m.kode + '</code></td>' +
    '<td><strong>' + m.nama + '</strong></td>' +
    '<td><span class="badge ' + (m.tipe === 'Pemasok' ? 'badge-blue' : 'badge-green') + '">' + m.tipe + '</span></td>' +
    '<td>' + (m.pic||'—') + '</td>' +
    '<td>' + (m.hp||'—') + '</td>' +
    '<td>' + (m.kota||'—') + '</td>' +
    '<td style="color:' + (m.piutang > 0 ? 'var(--danger)' : 'var(--accent2)') + '"><strong>Rp ' + (m.piutang||0).toLocaleString('id-ID') + '</strong></td>' +
    '<td><span class="badge badge-green">' + m.status + '</span></td>' +
    '<td><button class="btn btn-sm" style="background:rgba(239,68,68,0.12);color:var(--danger);border:none" onclick="hapusMitra(' + i + ')"><i class="fas fa-trash"></i></button></td>' +
    '</tr>').join('');
}

function renderPengeluaran() {
  const tbody = document.getElementById('tbody-pengeluaran');
  if (!tbody) return;
  tbody.innerHTML = DB.pengeluaran.map(p => '<tr>' +
    '<td>' + p.tgl + '</td>' +
    '<td>' + p.ket + '</td>' +
    '<td><span class="badge badge-blue">' + p.kat + '</span></td>' +
    '<td><strong style="color:var(--danger)">Rp ' + p.jml.toLocaleString('id-ID') + '</strong></td>' +
    '</tr>').join('');
}

function renderPembelian() {
  const tbody = document.getElementById('tbody-pembelian');
  if (!tbody) return;
  tbody.innerHTML = DB.pembelian.map(p => '<tr>' +
    '<td>' + p.tgl + '</td>' +
    '<td>' + p.pemasok + '</td>' +
    '<td>' + p.barang + '</td>' +
    '<td><strong>Rp ' + p.total.toLocaleString('id-ID') + '</strong></td>' +
    '</tr>').join('');
}

// ================================================================
// FIRESTORE CRUD FUNCTIONS
// ================================================================
async function simpanBarang() {
  const nama = document.getElementById('b-nama')?.value.trim();
  const kode = document.getElementById('b-kode')?.value.trim();
  if (!nama || !kode) { showToast('Nama dan kode wajib diisi!', 'error'); return; }
  const data = {
    kode, nama,
    kategori: document.getElementById('b-kategori')?.value || 'Lainnya',
    satuan  : document.getElementById('b-satuan')?.value   || 'Pcs',
    stok    : parseInt(document.getElementById('b-stok')?.value)     || 0,
    hbeli   : parseInt(document.getElementById('b-hbeli')?.value)    || 0,
    hjual   : parseInt(document.getElementById('b-hjual')?.value)    || 0,
    minStok : parseInt(document.getElementById('b-minstock')?.value) || 20,
    lokasi  : document.getElementById('b-lokasi')?.value || '',
    masuk   : parseInt(document.getElementById('b-stok')?.value)     || 0,
    desc    : document.getElementById('b-desc')?.value || '',
    keluar  : 0, foto: [],
  };
  if (window.FS) {
    try { await window.FS.addDoc(window.FS.col('barang'), data); showToast('✅ Barang tersimpan ke cloud!'); }
    catch(e) { DB.barang.unshift(data); renderBarang(); renderStok(); showToast('✅ Barang ditambahkan (offline)'); }
  } else { DB.barang.unshift(data); renderBarang(); renderStok(); showToast('✅ Barang ditambahkan!'); }
  addLog('Tambah Barang', 'Menambahkan ' + nama);
  fillDropdowns(); renderStokKritis(); updateDashboard();
  closeModal('modal-barang');
  ['b-kode','b-nama','b-stok','b-hbeli','b-hjual','b-desc'].forEach(id => { const el = document.getElementById(id); if (el) el.value=''; });
}

function editBarang(i) {
  const b = DB.barang[i];
  if (!b) return;
  document.getElementById('eb-idx').value    = i;
  document.getElementById('eb-kode').value   = b.kode;
  document.getElementById('eb-nama').value   = b.nama;
  document.getElementById('eb-stok').value   = b.stok;
  document.getElementById('eb-hbeli').value  = b.hbeli;
  document.getElementById('eb-hjual').value  = b.hjual;
  document.getElementById('eb-minstock').value = b.minStok;
  document.getElementById('eb-lokasi').value = b.lokasi || '';
  const ebKat = document.getElementById('eb-kategori');
  if (ebKat) { const katOpts = DB.kategori.map(k => '<option' + (k===b.kategori?' selected':'') + '>' + k + '</option>').join(''); ebKat.innerHTML = katOpts; }
  const ebSat = document.getElementById('eb-satuan');
  if (ebSat) { Array.from(ebSat.options).forEach(o => o.selected = o.value === b.satuan); }
  openModal('modal-edit-barang');
}

async function simpanEditBarang() {
  const i = parseInt(document.getElementById('eb-idx')?.value);
  const b = DB.barang[i];
  if (!b) return;
  const updated = {
    ...b,
    kode   : document.getElementById('eb-kode')?.value.trim()    || b.kode,
    nama   : document.getElementById('eb-nama')?.value.trim()    || b.nama,
    kategori:document.getElementById('eb-kategori')?.value       || b.kategori,
    satuan : document.getElementById('eb-satuan')?.value         || b.satuan,
    stok   : parseInt(document.getElementById('eb-stok')?.value) || b.stok,
    hbeli  : parseInt(document.getElementById('eb-hbeli')?.value)|| b.hbeli,
    hjual  : parseInt(document.getElementById('eb-hjual')?.value)|| b.hjual,
    minStok: parseInt(document.getElementById('eb-minstock')?.value)||b.minStok,
    lokasi : document.getElementById('eb-lokasi')?.value         || b.lokasi,
  };
  if (window.FS && b._id) {
    try { await window.FS.updateDoc(window.FS.docRef('barang', b._id), updated); showToast('✅ Barang diupdate ke cloud!'); }
    catch(e) { DB.barang[i] = updated; renderBarang(); renderStok(); showToast('✅ Barang diupdate!'); }
  } else { DB.barang[i] = updated; renderBarang(); renderStok(); showToast('✅ Barang diupdate!'); }
  addLog('Edit Barang', 'Mengupdate ' + updated.nama);
  fillDropdowns(); renderStokKritis();
  closeModal('modal-edit-barang');
}

async function hapusBarang(i) {
  const b = DB.barang[i];
  if (!confirm('Hapus barang "' + b.nama + '"?')) return;
  if (window.FS && b._id) {
    try { await window.FS.deleteDoc(window.FS.docRef('barang', b._id)); showToast('🗑️ Barang dihapus!'); }
    catch(e) { DB.barang.splice(i,1); renderBarang(); renderStok(); showToast('🗑️ Barang dihapus.'); }
  } else { DB.barang.splice(i,1); renderBarang(); renderStok(); showToast('🗑️ Barang dihapus.'); }
  addLog('Hapus Barang', 'Menghapus ' + b.nama);
  fillDropdowns(); renderStokKritis(); updateDashboard();
}

// INVOICE

function toggleTempoField(val) {
  const row = document.getElementById('tempo-row');
  if (row) row.style.display = val === 'Tempo' ? '' : 'none';
}

function addInvItem() {
  const idx = invItems.length;
  const barangOpts = DB.barang.map(b => '<option data-harga="'+b.hjual+'" data-satuan="'+b.satuan+'">'+b.nama+'</option>').join('');
  const row = document.createElement('tr');
  row.id = 'inv-row-' + idx;
  row.innerHTML =
    '<td><select onchange="updateItemBarang('+idx+',this)" style="width:100%;background:var(--surface);border:1px solid var(--border);padding:6px;border-radius:8px"><option value="">Pilih...</option>'+barangOpts+'</select></td>' +
    '<td><input type="number" id="inv-qty-'+idx+'" value="1" min="1" style="width:65px;background:var(--surface);border:1px solid var(--border);padding:6px;border-radius:8px" onchange="updateItemQty('+idx+',this)"></td>' +
    '<td id="inv-sat-'+idx+'">—</td>' +
    '<td id="inv-hrg-'+idx+'">Rp 0</td>' +
    '<td id="inv-tot-'+idx+'">Rp 0</td>' +
    '<td><button onclick="removeInvItem('+idx+',this.closest(\'tr\'))" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:16px">✕</button></td>';
  document.getElementById('inv-items').appendChild(row);
  invItems[idx] = null;
}
function updateItemBarang(idx, sel) {
  const opt   = sel.options[sel.selectedIndex];
  const harga = parseInt(opt.dataset.harga) || 0;
  const sat   = opt.dataset.satuan || '';
  const qty   = parseInt(document.getElementById('inv-qty-'+idx)?.value) || 1;
  invItems[idx] = { nama:sel.value, satuan:sat, harga, qty, total:harga*qty };
  document.getElementById('inv-sat-'+idx).textContent = sat;
  document.getElementById('inv-hrg-'+idx).textContent = 'Rp '+harga.toLocaleString('id-ID');
  document.getElementById('inv-tot-'+idx).textContent = 'Rp '+(harga*qty).toLocaleString('id-ID');
  hitungTotal();
}
function updateItemQty(idx, input) {
  const qty = parseInt(input.value) || 1;
  if (invItems[idx]) { invItems[idx].qty = qty; invItems[idx].total = invItems[idx].harga * qty; document.getElementById('inv-tot-'+idx).textContent = 'Rp '+invItems[idx].total.toLocaleString('id-ID'); }
  hitungTotal();
}
function removeInvItem(idx, row) { invItems[idx] = null; if (row) row.remove(); hitungTotal(); }
function hitungTotal() {
  const items    = invItems.filter(Boolean);
  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const diskon   = parseFloat(document.getElementById('inv-diskon')?.value) || 0;
  const afterD   = subtotal * (1 - diskon / 100);
  const ppn      = afterD * 0.11;
  const total    = afterD + ppn;
  const fmt      = n => 'Rp ' + Math.round(n).toLocaleString('id-ID');
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('inv-subtotal', fmt(subtotal));
  set('inv-ppn',      fmt(ppn));
  set('inv-total',    fmt(total));
}

async function simpanInvoice() {
  const mitra = document.getElementById('inv-mitra')?.value;
  const items = invItems.filter(Boolean);
  if (!mitra || !items.length) { showToast('Pilih mitra dan tambahkan item!', 'error'); return; }
  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const diskon   = parseFloat(document.getElementById('inv-diskon')?.value) || 0;
  const afterD   = subtotal * (1 - diskon / 100);
  const total    = Math.round(afterD * 1.11);
  const bayar    = document.getElementById('inv-bayar')?.value || 'Tunai';
  invCounter++;
  const data = {
    no    : 'TRX-2025-0' + invCounter,
    tgl   : document.getElementById('inv-tgl')?.value,
    mitra, total, items, diskon, bayar,
    status: bayar === 'Tunai' || bayar === 'Transfer' ? 'Lunas' : 'Belum Lunas',
    tempo : bayar === 'Tempo' ? document.getElementById('inv-tempo')?.value : '',
    sales : currentUser?.username || '',
  };
  // Kurangi stok otomatis
  items.forEach(item => {
    const b = DB.barang.find(x => x.nama === item.nama);
    if (b) { b.stok = Math.max(0, b.stok - item.qty); b.keluar += item.qty; }
  });
  if (window.FS) {
    try { await window.FS.addDoc(window.FS.col('invoice'), data); showToast('✅ Invoice tersimpan ke cloud!'); }
    catch(e) { DB.invoice.unshift(data); renderInvoice(); showToast('✅ Invoice dibuat (offline)'); }
  } else { DB.invoice.unshift(data); renderInvoice(); showToast('✅ Invoice berhasil dibuat!'); }
  addLog('Buat Invoice', data.no + ' — ' + mitra + ' — Rp ' + total.toLocaleString('id-ID'));
  renderStok(); renderBarang(); renderStokKritis(); updateDashboard();
  closeModal('modal-invoice');
  invItems = [];
  document.getElementById('inv-items').innerHTML = '';
  document.getElementById('inv-no').value = 'TRX-2025-0' + invCounter;
  hitungTotal();
}

async function tandaiLunas(i) {
  const inv = DB.invoice[i];
  if (!inv) return;
  inv.status = 'Lunas';
  if (window.FS && inv._id) {
    try { await window.FS.updateDoc(window.FS.docRef('invoice', inv._id), { status:'Lunas' }); }
    catch(e) { console.warn(e); }
  }
  addLog('Tandai Lunas', inv.no);
  renderInvoice(); updateDashboard();
  showToast('✅ Invoice ditandai Lunas!');
}

function previewInvoice() {
  const mitra = document.getElementById('inv-mitra')?.value || '—';
  const items = invItems.filter(Boolean);
  const subtotal = items.reduce((s, i) => s + (i.total||0), 0);
  const diskon = parseFloat(document.getElementById('inv-diskon')?.value) || 0;
  const afterD = subtotal * (1 - diskon / 100);
  const ppn    = afterD * 0.11;
  const total  = afterD + ppn;
  const rows   = items.map((it, i) =>
    '<tr><td>'+(i+1)+'</td><td>'+it.nama+'</td><td>'+it.satuan+'</td><td>'+it.qty+'</td>' +
    '<td>Rp '+it.harga.toLocaleString('id-ID')+'</td><td><b>Rp '+it.total.toLocaleString('id-ID')+'</b></td></tr>').join('');
  document.getElementById('invoice-preview-content').innerHTML =
    '<div class="invoice-header"><div class="invoice-company"><h2>Baitul Ma\'mur Syafaah</h2><p>Distributor Sembako · Villa Bogor Indah 5, Bogor</p></div>' +
    '<div class="invoice-meta"><h1>INVOICE</h1><p>No: <b>'+document.getElementById('inv-no')?.value+'</b></p><p>Tgl: '+document.getElementById('inv-tgl')?.value+'</p></div></div>' +
    '<div class="invoice-to"><h4>Kepada Yth.</h4><p><b>'+mitra+'</b></p></div>' +
    '<table class="invoice-table"><thead><tr><th>No</th><th>Barang</th><th>Sat</th><th>Qty</th><th>Harga</th><th>Total</th></tr></thead><tbody>'+rows+'</tbody></table>' +
    '<div class="invoice-totals"><table>' +
    '<tr><td>Subtotal</td><td>Rp '+Math.round(subtotal).toLocaleString('id-ID')+'</td></tr>' +
    (diskon ? '<tr><td>Diskon ('+diskon+'%)</td><td style="color:var(--danger)">-Rp '+Math.round(subtotal*diskon/100).toLocaleString('id-ID')+'</td></tr>' : '') +
    '<tr><td>PPN 11%</td><td>Rp '+Math.round(ppn).toLocaleString('id-ID')+'</td></tr>' +
    '<tr class="total-row"><td>TOTAL</td><td>Rp '+Math.round(total).toLocaleString('id-ID')+'</td></tr>' +
    '</table></div>' +
    '<div class="invoice-footer"><p>Terima kasih atas kepercayaan Anda!</p><p>Transfer BCA 123-456-7890 a/n Baitul Ma\'mur Syafaah</p></div>';
  openModal('modal-preview-inv');
}

function showInvoicePreview(i) {
  const inv = DB.invoice[i];
  document.getElementById('invoice-preview-content').innerHTML =
    '<div class="invoice-header"><div class="invoice-company"><h2>Baitul Ma\'mur Syafaah</h2><p>Distributor Sembako · Villa Bogor Indah 5, Bogor</p></div>' +
    '<div class="invoice-meta"><h1>INVOICE</h1><p>No: <b>'+inv.no+'</b></p><p>Tgl: '+inv.tgl+'</p></div></div>' +
    '<div class="invoice-to"><h4>Kepada</h4><p><b>'+inv.mitra+'</b></p></div>' +
    '<div style="padding:20px;text-align:center;color:var(--text-muted)">Total: <b style="font-size:20px">Rp '+inv.total.toLocaleString('id-ID')+'</b></div>' +
    '<div class="invoice-footer"><p>Status: <b>'+inv.status+'</b> · Bayar: '+inv.bayar+'</p>' +
    (inv.tempo ? '<p>Jatuh Tempo: '+inv.tempo+'</p>' : '') + '</div>';
  openModal('modal-preview-inv');
}

// MITRA
async function simpanMitra() {
  const nama = document.getElementById('m-nama')?.value.trim();
  if (!nama) { showToast('Nama mitra wajib diisi!', 'error'); return; }
  const kodeNum = String(DB.mitra.length + 1).padStart(3,'0');
  const data = {
    kode:'MTR-'+kodeNum, nama,
    tipe   : document.getElementById('m-tipe')?.value   || 'Pelanggan',
    pic    : document.getElementById('m-pic')?.value    || '',
    hp     : document.getElementById('m-hp')?.value     || '',
    kota   : document.getElementById('m-kota')?.value   || '',
    piutang: 0, status:'Aktif',
  };
  if (window.FS) {
    try { await window.FS.addDoc(window.FS.col('mitra'), data); showToast('✅ Mitra tersimpan ke cloud!'); }
    catch(e) { DB.mitra.push(data); renderMitra(); showToast('✅ Mitra ditambahkan (offline)'); }
  } else { DB.mitra.push(data); renderMitra(); showToast('✅ Mitra ditambahkan!'); }
  addLog('Tambah Mitra', nama);
  fillDropdowns(); updateDashboard();
  closeModal('modal-mitra');
  ['m-nama'].forEach(id => { const el = document.getElementById(id); if (el) el.value=''; });
}

async function hapusMitra(i) {
  const m = DB.mitra[i];
  if (!confirm('Hapus mitra "' + m.nama + '"?')) return;
  if (window.FS && m._id) {
    try { await window.FS.deleteDoc(window.FS.docRef('mitra', m._id)); showToast('🗑️ Mitra dihapus!'); }
    catch(e) { DB.mitra.splice(i,1); renderMitra(); showToast('🗑️ Mitra dihapus.'); }
  } else { DB.mitra.splice(i,1); renderMitra(); showToast('🗑️ Mitra dihapus.'); }
  addLog('Hapus Mitra', m.nama);
  fillDropdowns(); updateDashboard();
}

// STOK
async function simpanStokMasuk() {
  const nama = document.getElementById('sm-barang')?.value;
  const qty  = parseInt(document.getElementById('sm-qty')?.value) || 0;
  if (!nama || qty <= 0) { showToast('Lengkapi data stok masuk!', 'error'); return; }
  const b = DB.barang.find(x => x.nama === nama);
  if (!b) return;
  b.stok += qty; b.masuk += qty;
  if (window.FS && b._id) {
    try { await window.FS.updateDoc(window.FS.docRef('barang', b._id), { stok:b.stok, masuk:b.masuk }); }
    catch(e) { console.warn(e); }
  }
  addLog('Stok Masuk', nama + ' +' + qty);
  renderStok(); renderBarang(); renderStokKritis(); updateDashboard();
  closeModal('modal-stok-masuk');
  showToast('✅ Stok ' + nama + ' +' + qty + '!');
}

async function simpanStokKeluar() {
  const nama = document.getElementById('sk-barang')?.value;
  const qty  = parseInt(document.getElementById('sk-qty')?.value) || 0;
  if (!nama || qty <= 0) { showToast('Lengkapi data stok keluar!', 'error'); return; }
  const b = DB.barang.find(x => x.nama === nama);
  if (!b) return;
  if (b.stok < qty) { showToast('❌ Stok tidak mencukupi! Sisa: ' + b.stok, 'error'); return; }
  b.stok -= qty; b.keluar += qty;
  if (window.FS && b._id) {
    try { await window.FS.updateDoc(window.FS.docRef('barang', b._id), { stok:b.stok, keluar:b.keluar }); }
    catch(e) { console.warn(e); }
  }
  addLog('Stok Keluar', nama + ' -' + qty);
  renderStok(); renderBarang(); renderStokKritis(); updateDashboard();
  closeModal('modal-stok-keluar');
  showToast('✅ Stok keluar ' + nama + ' -' + qty + '!');
}

// KEUANGAN
async function simpanPengeluaran() {
  const ket = document.getElementById('pe-ket')?.value.trim();
  const jml = parseInt(document.getElementById('pe-jml')?.value) || 0;
  if (!ket || jml <= 0) { showToast('Lengkapi data pengeluaran!', 'error'); return; }
  const data = { tgl:document.getElementById('pe-tgl')?.value, ket, jml, kat:document.getElementById('pe-kat')?.value };
  if (window.FS) {
    try { await window.FS.addDoc(window.FS.col('pengeluaran'), data); showToast('✅ Pengeluaran tersimpan!'); }
    catch(e) { DB.pengeluaran.unshift(data); renderPengeluaran(); showToast('✅ Pengeluaran dicatat.'); }
  } else { DB.pengeluaran.unshift(data); renderPengeluaran(); showToast('✅ Pengeluaran dicatat!'); }
  addLog('Pengeluaran', ket + ' Rp ' + jml.toLocaleString('id-ID'));
  closeModal('modal-pengeluaran');
}

async function simpanPembelian() {
  const pemasok = document.getElementById('pb-pemasok')?.value;
  const barang  = document.getElementById('pb-barang')?.value;
  const qty     = parseInt(document.getElementById('pb-qty')?.value) || 0;
  const harga   = parseInt(document.getElementById('pb-harga')?.value) || 0;
  if (!pemasok || !barang || qty <= 0) { showToast('Lengkapi data pembelian!', 'error'); return; }
  const data = { tgl:document.getElementById('pb-tgl')?.value, pemasok, barang, total:qty*harga };
  if (window.FS) {
    try { await window.FS.addDoc(window.FS.col('pembelian'), data); showToast('✅ Pembelian tersimpan!'); }
    catch(e) { DB.pembelian.unshift(data); renderPembelian(); showToast('✅ Pembelian dicatat.'); }
  } else { DB.pembelian.unshift(data); renderPembelian(); showToast('✅ Pembelian dicatat!'); }
  addLog('Pembelian', barang + ' dari ' + pemasok);
  closeModal('modal-pembelian');
}

// ================================================================
// KEUANGAN KPI & ASET
// ================================================================
function renderKeuanganKPI() {
  const totalPengeluaran = DB.pengeluaran.reduce((s,p) => s+p.jml, 0);
  const totalPembelian   = DB.pembelian.reduce((s,p) => s+p.total, 0);
  const totalPendapatan  = DB.invoice.filter(i=>i.status==='Lunas').reduce((s,i)=>s+i.total,0);
  const laba             = totalPendapatan - totalPengeluaran - totalPembelian;
  const fmt = n => 'Rp ' + Math.abs(n).toLocaleString('id-ID');
  const set = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  set('keu-total-pengeluaran', fmt(totalPengeluaran));
  set('keu-total-pembelian',   fmt(totalPembelian));
  set('keu-total-pendapatan',  fmt(totalPendapatan));
  set('keu-laba', (laba >= 0 ? '' : '-') + fmt(laba));
}

function renderAssets() {
  renderKeuanganKPI();
  const el = document.getElementById('asset-list');
  if (!el) return;
  const nilaiStok   = DB.barang.reduce((s,b) => s + b.stok * b.hbeli, 0);
  const totalPiutang = DB.mitra.reduce((s,m) => s + (m.piutang||0), 0);
  el.innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">' +
    '<div class="kpi-mini"><h4>Nilai Stok Barang</h4><div class="amount" style="color:var(--primary-light)">Rp '+nilaiStok.toLocaleString('id-ID')+'</div></div>' +
    '<div class="kpi-mini"><h4>Total Piutang Mitra</h4><div class="amount" style="color:var(--danger)">Rp '+totalPiutang.toLocaleString('id-ID')+'</div></div>' +
    '<div class="kpi-mini"><h4>Jumlah Produk Aktif</h4><div class="amount" style="color:var(--accent2)">'+DB.barang.length+' SKU</div></div>' +
    '<div class="kpi-mini"><h4>Total Mitra Bisnis</h4><div class="amount" style="color:var(--accent)">'+DB.mitra.length+' Mitra</div></div>' +
    '</div>';
}

// ================================================================
// CHARTS
// ================================================================
function buildMainChart() {
  const el = document.getElementById('main-chart');
  if (!el) return;
  const months = ['Agu','Sep','Okt','Nov','Des','Jan'];
  const vals   = [42, 58, 51, 73, 65, Math.max(1, DB.invoice.reduce((s,i)=>s+i.total,0)/1000000)];
  const max    = Math.max(...vals);
  el.innerHTML = months.map((m, i) =>
    '<div style="display:flex;flex-direction:column;align-items:center;flex:1;gap:4px">' +
    '<div style="font-size:11px;color:var(--text-muted)">' + Math.round(vals[i]) + 'M</div>' +
    '<div style="background:' + (i===5 ? 'var(--primary-light)' : 'rgba(37,99,168,0.25)') + ';width:100%;border-radius:6px 6px 0 0;transition:height .3s;height:' + Math.round(vals[i]/max*130) + 'px"></div>' +
    '<div style="font-size:11px;color:var(--text-muted)">' + m + '</div></div>').join('');

  // Distribusi stok
  const distEl = document.getElementById('distribusi-stok');
  if (distEl) {
    const cats = [...new Set(DB.barang.map(b=>b.kategori))];
    distEl.innerHTML = cats.map(c => {
      const n = DB.barang.filter(b=>b.kategori===c).length;
      const pct = Math.round(n/DB.barang.length*100);
      return '<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px"><span>'+c+'</span><span>'+n+' item ('+pct+'%)</span></div>' +
        '<div style="background:var(--bg);border-radius:20px;height:8px"><div style="background:var(--primary-light);height:100%;border-radius:20px;width:'+pct+'%"></div></div></div>';
    }).join('');
  }
}

function buildLaporanChart() {
  const el = document.getElementById('laporan-chart');
  if (!el) return;
  const year  = document.getElementById('laporan-year-sel')?.value || '2025';
  const bulan = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const vals  = bulan.map((b,i) => {
    const m = DB.invoice.filter(inv => inv.tgl && inv.tgl.startsWith(year+'-'+String(i+1).padStart(2,'0')));
    return m.reduce((s,inv)=>s+inv.total,0)/1000000;
  });
  const max = Math.max(...vals, 1);
  const total = vals.reduce((s,v)=>s+v,0);
  const totEl = document.getElementById('laporan-total-year');
  if (totEl) totEl.textContent = 'Total ' + year + ': Rp ' + Math.round(total) + 'M';
  el.innerHTML = bulan.map((b,i) =>
    '<div style="display:flex;flex-direction:column;align-items:center;flex:1;gap:3px">' +
    '<div style="font-size:10px;color:var(--text-muted)">' + (vals[i]>0?Math.round(vals[i])+'M':'') + '</div>' +
    '<div style="background:' + (vals[i]>0?'var(--primary-light)':'rgba(37,99,168,0.15)') + ';width:100%;border-radius:4px 4px 0 0;height:' + Math.round(vals[i]/max*160) + 'px"></div>' +
    '<div style="font-size:10px;color:var(--text-muted)">' + b + '</div></div>').join('');

  // Distribusi laporan
  const distEl = document.getElementById('laporan-distribusi');
  if (distEl) {
    const cats = [...new Set(DB.barang.map(b=>b.kategori))];
    distEl.innerHTML = cats.map(c => {
      const n   = DB.barang.filter(b=>b.kategori===c).length;
      const pct = Math.round(n/DB.barang.length*100);
      return '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">' +
        '<div style="width:12px;height:12px;border-radius:3px;background:var(--primary-light);flex-shrink:0"></div>' +
        '<div style="flex:1"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px"><span>'+c+'</span><span>'+n+' item</span></div>' +
        '<div style="background:var(--bg);height:6px;border-radius:20px"><div style="background:var(--primary-light);height:100%;border-radius:20px;width:'+pct+'%"></div></div></div></div>';
    }).join('');
  }
}

function renderLaporanStats() {
  const topBarang = DB.barang.reduce((a,b)=>b.keluar>a.keluar?b:a, {keluar:0,nama:'—'});
  const topMitra  = DB.mitra.reduce((a,m)=>{ const t=DB.invoice.filter(i=>i.mitra===m.nama).reduce((s,i)=>s+i.total,0); return t>a.t?{t,nama:m.nama}:a; },{t:0,nama:'—'});
  const avgMargin = DB.barang.length ? Math.round(DB.barang.reduce((s,b)=>s+(b.hjual-b.hbeli)/b.hbeli*100,0)/DB.barang.length) : 0;
  const perputaran = DB.barang.length ? Math.round(DB.barang.reduce((s,b)=>s+(b.masuk>0?b.keluar/b.masuk:0),0)/DB.barang.length*10)/10 : 0;
  const set = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  set('lap-produk-terlaris',   topBarang.nama);
  set('lap-pelanggan-terbaik', topMitra.nama);
  set('lap-margin',            avgMargin + '%');
  set('lap-perputaran',        perputaran + 'x');
}

// ================================================================
// SALES DASHBOARD
// ================================================================
function renderSalesDash() {
  const user = currentUser;
  if (!user) return;
  const el = document.getElementById('sales-dash-name');
  if (el) el.textContent = user.name;
  const myInvoice = DB.invoice.filter(i => i.sales === user.username);
  const total     = myInvoice.reduce((s,i)=>s+i.total,0);
  const lunas     = myInvoice.filter(i=>i.status==='Lunas').length;
  const bonus     = Math.round(total * 0.02);
  const kpi = document.getElementById('sales-kpi-area');
  if (kpi) kpi.innerHTML =
    '<div class="stats-grid" style="margin-bottom:22px">' +
    '<div class="stat-card blue"><div class="stat-glow"></div><div class="stat-icon"><i class="fas fa-file-invoice"></i></div><h3>'+myInvoice.length+'</h3><p>Total Transaksi</p></div>' +
    '<div class="stat-card green"><div class="stat-glow"></div><div class="stat-icon"><i class="fas fa-check"></i></div><h3>'+lunas+'</h3><p>Transaksi Lunas</p></div>' +
    '<div class="stat-card amber"><div class="stat-glow"></div><div class="stat-icon"><i class="fas fa-coins"></i></div><h3>Rp '+total.toLocaleString('id-ID')+'</h3><p>Total Penjualan</p></div>' +
    '<div class="stat-card red"><div class="stat-glow"></div><div class="stat-icon"><i class="fas fa-gift"></i></div><h3>Rp '+bonus.toLocaleString('id-ID')+'</h3><p>Est. Bonus (2%)</p></div>' +
    '</div>';

  const tbody = document.getElementById('sales-invoice-table');
  if (tbody) tbody.innerHTML = myInvoice.map(i =>
    '<tr><td>'+i.no+'</td><td>'+i.tgl+'</td><td>'+i.mitra+'</td>' +
    '<td>Rp '+i.total.toLocaleString('id-ID')+'</td>' +
    '<td><span class="badge '+(i.status==='Lunas'?'badge-green':'badge-red')+'">'+i.status+'</span></td>' +
    '<td>Rp '+Math.round(i.total*0.02).toLocaleString('id-ID')+'</td></tr>').join('') ||
    '<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">Belum ada transaksi</td></tr>';
}

// ================================================================
// STOCK OPNAME
// ================================================================
function renderOpname() {
  const el = document.getElementById('opname-table-body');
  if (!el) return;
  const dateEl = document.getElementById('opname-date');
  if (dateEl) dateEl.textContent = 'Audit per: ' + new Date().toLocaleDateString('id-ID');
  el.innerHTML = DB.barang.map((b, i) =>
    '<tr id="opname-row-'+i+'">' +
    '<td><code>'+b.kode+'</code></td><td><strong>'+b.nama+'</strong></td><td>'+b.satuan+'</td>' +
    '<td><strong>'+b.stok+'</strong></td>' +
    '<td><input type="number" id="opname-aktual-'+i+'" value="'+b.stok+'" min="0" style="width:80px;background:var(--surface);border:1px solid var(--border);padding:6px;border-radius:8px" oninput="hitungSelisih('+i+')"></td>' +
    '<td id="opname-selisih-'+i+'">0</td>' +
    '<td id="opname-status-'+i+'"><span class="badge badge-green">✅ OK</span></td>' +
    '<td><input type="text" id="opname-catatan-'+i+'" placeholder="Catatan..." style="width:130px;background:var(--surface);border:1px solid var(--border);padding:6px;border-radius:8px"></td>' +
    '<td><button class="btn btn-sm btn-outline" onclick="simpanSatuOpname('+i+')"><i class="fas fa-save"></i></button></td>' +
    '</tr>').join('');
}

function hitungSelisih(i) {
  const aktual  = parseInt(document.getElementById('opname-aktual-'+i)?.value) || 0;
  const selisih = aktual - DB.barang[i].stok;
  const selEl   = document.getElementById('opname-selisih-'+i);
  const statEl  = document.getElementById('opname-status-'+i);
  if (selEl)  selEl.textContent = selisih > 0 ? '+'+selisih : selisih;
  if (statEl) statEl.innerHTML  = selisih === 0
    ? '<span class="badge badge-green">✅ OK</span>'
    : selisih > 0
      ? '<span class="badge badge-blue">⬆ Lebih</span>'
      : '<span class="badge badge-red">⬇ Kurang</span>';
}

async function simpanSatuOpname(i) {
  const aktual = parseInt(document.getElementById('opname-aktual-'+i)?.value);
  if (isNaN(aktual)) return;
  const b = DB.barang[i];
  b.stok = aktual;
  if (window.FS && b._id) {
    try { await window.FS.updateDoc(window.FS.docRef('barang', b._id), { stok: aktual }); }
    catch(e) { console.warn(e); }
  }
  addLog('Stock Opname', b.nama + ' → ' + aktual + ' ' + b.satuan);
  showToast('✅ Stok ' + b.nama + ' diperbarui!');
  renderBarang(); renderStok(); renderStokKritis(); updateDashboard();
}

async function simpanSemuaOpname() {
  const updates = DB.barang.map((b, i) => {
    const aktual = parseInt(document.getElementById('opname-aktual-'+i)?.value);
    return isNaN(aktual) ? null : { b, i, aktual };
  }).filter(Boolean);
  for (const u of updates) {
    u.b.stok = u.aktual;
    if (window.FS && u.b._id) {
      try { await window.FS.updateDoc(window.FS.docRef('barang', u.b._id), { stok: u.aktual }); }
      catch(e) { console.warn(e); }
    }
  }
  addLog('Stock Opname Massal', updates.length + ' barang diperbarui');
  showToast('✅ Semua stok diperbarui!');
  renderBarang(); renderStok(); renderStokKritis(); updateDashboard();
}

function generateOpname() {
  const rows = DB.barang.map((b, i) => {
    const aktual  = parseInt(document.getElementById('opname-aktual-'+i)?.value) || b.stok;
    const selisih = aktual - b.stok;
    return [b.kode, b.nama, b.satuan, b.stok, aktual, selisih, selisih===0?'OK':selisih>0?'Lebih':'Kurang'].join(',');
  }).join('\n');
  const csv = 'Kode,Nama,Satuan,Stok Sistem,Stok Aktual,Selisih,Status\n' + rows;
  const a   = document.createElement('a');
  a.href    = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'StockOpname_BMS_' + new Date().toISOString().split('T')[0] + '.csv';
  a.click();
  showToast('📥 Laporan Stock Opname berhasil diunduh!');
}

// ================================================================
// SETTINGS
// ================================================================
function saveCompanyProfile() {
  const nama = document.getElementById('set-company-nama')?.value;
  showToast('✅ Profil perusahaan disimpan!' + (nama ? ' (' + nama + ')' : ''));
  addLog('Settings', 'Update profil perusahaan');
}

function tambahUserSales() {
  const nama = document.getElementById('new-sales-name')?.value.trim();
  const email = document.getElementById('new-sales-email')?.value.trim();
  if (!nama || !email) { showToast('Nama dan email wajib diisi!', 'error'); return; }
  showToast('✅ Akun sales ' + nama + ' dibuat!');
  addLog('Settings', 'Tambah akun sales: ' + nama);
  ['new-sales-name','new-sales-email','new-sales-pass'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
}

function tambahKategori() {
  const input = document.querySelector('#settings-kategori-list input[type="text"]');
  const newKat = input?.value.trim();
  if (!newKat) { showToast('Nama kategori kosong!', 'error'); return; }
  if (DB.kategori.includes(newKat)) { showToast('Kategori sudah ada!', 'warning'); return; }
  DB.kategori.push(newKat);
  fillDropdowns();
  showToast('✅ Kategori "' + newKat + '" ditambahkan!');
  if (input) input.value = '';
}

function backupData() {
  const blob = new Blob([JSON.stringify(DB, null, 2)], { type:'application/json' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = 'BMS_Backup_' + new Date().toISOString().split('T')[0] + '.json';
  a.click();
  showToast('📥 Backup berhasil diunduh!');
}

function restoreData(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try { const d = JSON.parse(ev.target.result); Object.assign(DB, d); renderAll(); showToast('✅ Data berhasil di-restore!'); }
    catch(err) { showToast('❌ File tidak valid!', 'error'); }
  };
  reader.readAsText(file);
}

function clearInvoice()    { if (confirm('Hapus SEMUA invoice?'))      { DB.invoice=[]; renderInvoice(); updateDashboard(); showToast('🗑️ Semua invoice dihapus.'); } }
function clearKeuangan()   { if (confirm('Hapus data keuangan?'))      { DB.pengeluaran=[]; DB.pembelian=[]; renderPengeluaran(); renderPembelian(); showToast('🗑️ Data keuangan dihapus.'); } }
function clearDataBarang() { if (confirm('Hapus SEMUA data barang?'))  { DB.barang=[]; renderBarang(); renderStok(); updateDashboard(); showToast('🗑️ Data barang dihapus.'); } }
function clearLog()        { DB.log=[]; const el=document.getElementById('tbody-log'); if(el) el.innerHTML=''; showToast('🗑️ Log dibersihkan.'); }

// ================================================================
// LOG AKTIVITAS
// ================================================================
function addLog(aksi, detail) {
  if (!currentUser) return;
  DB.log.unshift({ aksi, detail, user:currentUser.name, role:currentUser.label, waktu:new Date().toLocaleString('id-ID') });
  const tbody = document.getElementById('tbody-log');
  if (!tbody) return;
  tbody.innerHTML = DB.log.slice(0,100).map(l =>
    '<tr><td><span class="badge badge-blue">'+l.aksi+'</span></td><td>'+l.user+'</td><td>'+l.role+'</td><td>'+l.detail+'</td><td>'+l.waktu+'</td></tr>'
  ).join('');
}

// ================================================================
// NOTIFIKASI
// ================================================================
function toggleNotif() {
  document.getElementById('notif-panel')?.classList.toggle('open');
}
function renderNotifications() {
  const unread = DB.notifikasi.filter(n => !n.baca).length;
  const dot    = document.getElementById('notif-dot');
  if (dot) dot.style.display = unread ? '' : 'none';
  const list = document.getElementById('notif-list');
  if (!list) return;
  list.innerHTML = DB.notifikasi.map((n, i) =>
    '<div class="notif-item' + (n.baca ? '' : ' unread') + '" onclick="bacaNotif(' + i + ')" style="cursor:pointer">' +
    '<div style="width:8px;height:8px;border-radius:50%;background:var(--' + (n.tipe==='danger'?'danger':n.tipe==='warning'?'accent':'accent2') + ');flex-shrink:0;margin-top:4px"></div>' +
    '<div><p>' + n.pesan + '</p><small>' + n.waktu + '</small></div></div>'
  ).join('');
}
function bacaNotif(i) { DB.notifikasi[i].baca = true; renderNotifications(); }
function markAllRead() { DB.notifikasi.forEach(n => n.baca = true); renderNotifications(); }

// ================================================================
// CHAT
// ================================================================
let chatOpen = false;
let activeTab = 'messages';

function toggleChat() {
  chatOpen = !chatOpen;
  const win = document.getElementById('chat-window');
  if (win) win.classList.toggle('open', chatOpen);
  if (chatOpen) {
    document.getElementById('chat-unread-badge').style.display = 'none';
    document.getElementById('chat-input')?.focus();
    renderChatMessages();
  }
}
function switchChatTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
  const tabs = document.querySelectorAll('.chat-tab');
  const idx  = ['messages','contacts','broadcast'].indexOf(tab);
  if (tabs[idx]) tabs[idx].classList.add('active');
  document.getElementById('chat-messages').style.display        = tab === 'messages'   ? 'flex' : 'none';
  document.getElementById('chat-input-area').style.display      = tab === 'messages'   ? 'flex' : 'none';
  document.getElementById('chat-contacts-panel').style.display  = tab === 'contacts'   ? 'block': 'none';
  document.getElementById('chat-broadcast-panel').style.display = tab === 'broadcast'  ? 'block': 'none';
  if (tab === 'contacts') renderContactsList();
}
function renderChatMessages() {
  const el = document.getElementById('chat-messages');
  if (!el) return;
  el.innerHTML = chatMessages.map(m =>
    '<div style="display:flex;gap:8px;justify-content:' + (m.mine?'flex-end':'flex-start') + ';margin-bottom:12px">' +
    (!m.mine ? '<div style="width:30px;height:30px;border-radius:50%;background:var(--primary-light);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0">' + m.avatar + '</div>' : '') +
    '<div style="max-width:75%"><div style="font-size:11px;color:var(--text-muted);margin-bottom:3px">' + (m.mine?'':''+m.sender+' · ') + m.time + '</div>' +
    '<div style="background:' + (m.mine?'var(--primary-light)':'var(--surface)') + ';color:' + (m.mine?'#fff':'var(--text)') + ';padding:10px 14px;border-radius:' + (m.mine?'18px 18px 4px 18px':'18px 18px 18px 4px') + ';font-size:13px;line-height:1.5">' + m.text + '</div></div>' +
    (m.mine ? '<div style="width:30px;height:30px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0">' + (currentUser?.avatar||'?') + '</div>' : '') +
    '</div>').join('');
  el.scrollTop = el.scrollHeight;
}
function renderContactsList() {
  const el = document.getElementById('chat-contacts-panel');
  if (!el) return;
  const team = [
    { name:'Owner BMS',      av:'O', status:'online' },
    { name:'Admin Keuangan', av:'A', status:'online' },
    { name:'Tim Sales',      av:'S', status:'online' },
  ];
  el.innerHTML = '<h4 style="font-size:13px;font-weight:700;margin-bottom:12px">Tim Online</h4>' +
    team.map(t => '<div style="display:flex;align-items:center;gap:10px;padding:8px;border-radius:10px;cursor:pointer;hover:background:var(--bg)">' +
      '<div style="position:relative"><div style="width:36px;height:36px;border-radius:50%;background:var(--primary-light);display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff">'+t.av+'</div>' +
      '<div style="position:absolute;bottom:0;right:0;width:10px;height:10px;border-radius:50%;background:#10b981;border:2px solid var(--surface)"></div></div>' +
      '<span style="font-size:13px;font-weight:600">'+t.name+'</span></div>').join('');
}
function sendMessage() {
  const input = document.getElementById('chat-input');
  const text  = input?.value.trim();
  if (!text) return;
  const now = new Date();
  const time = now.getHours().toString().padStart(2,'0') + '.' + now.getMinutes().toString().padStart(2,'0');
  chatMessages.push({ id:Date.now(), sender:currentUser?.name||'User', avatar:currentUser?.avatar||'?', text, time, mine:true });
  renderChatMessages();
  if (input) input.value = '';
}
function sendBroadcast() {
  const judul = document.getElementById('bc-judul')?.value.trim();
  const pesan = document.getElementById('bc-pesan')?.value.trim();
  if (!judul || !pesan) { showToast('Isi judul dan pesan!', 'error'); return; }
  showToast('📣 Broadcast "' + judul + '" terkirim!');
  addLog('Broadcast', judul);
  ['bc-judul','bc-pesan'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
}

// ================================================================
// EXPORT CSV
// ================================================================
function exportCSV(type) {
  let headers, rows, filename;
  if (type==='barang')      { headers=['Kode','Nama','Kategori','Satuan','H.Beli','H.Jual','Stok','Min.Stok','Lokasi']; rows=DB.barang.map(b=>[b.kode,b.nama,b.kategori,b.satuan,b.hbeli,b.hjual,b.stok,b.minStok,b.lokasi]); filename='Barang_BMS'; }
  else if (type==='invoice') { headers=['No','Tgl','Mitra','Sales','Total','Status','Bayar','Tempo']; rows=DB.invoice.map(i=>[i.no,i.tgl,i.mitra,i.sales||'',i.total,i.status,i.bayar||'',i.tempo||'']); filename='Invoice_BMS'; }
  else if (type==='mitra')   { headers=['Kode','Nama','Tipe','PIC','HP','Kota','Piutang','Status']; rows=DB.mitra.map(m=>[m.kode,m.nama,m.tipe,m.pic,m.hp,m.kota,m.piutang,m.status]); filename='Mitra_BMS'; }
  else if (type==='stok')    { headers=['Kode','Nama','Kategori','Masuk','Keluar','Stok','Min','Lokasi']; rows=DB.barang.map(b=>[b.kode,b.nama,b.kategori,b.masuk,b.keluar,b.stok,b.minStok,b.lokasi]); filename='Stok_BMS'; }
  else if (type==='pengeluaran') { headers=['Tgl','Keterangan','Kategori','Jumlah']; rows=DB.pengeluaran.map(p=>[p.tgl,p.ket,p.kat,p.jml]); filename='Pengeluaran_BMS'; }
  else return;
  const csv = [headers, ...rows].map(r => r.map(v => '"'+String(v||'').replace(/"/g,'""')+'"').join(',')).join('\n');
  const a   = document.createElement('a');
  a.href    = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = filename + '_' + new Date().toISOString().split('T')[0] + '.csv';
  a.click();
  showToast('📥 CSV diunduh!');
}

// ================================================================
// THEME
// ================================================================
function toggleTheme() { applyTheme(document.body.classList.contains('dark-mode') ? 'light' : 'dark'); }
function applyTheme(t) {
  document.body.classList.toggle('dark-mode', t === 'dark');
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) btn.innerHTML = t === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
  localStorage.setItem('bms-theme', t);
}

// ================================================================
// MODAL
// ================================================================
function openModal(id)  { const el=document.getElementById(id); if(el){ el.classList.add('open'); document.body.style.overflow='hidden'; } }
function closeModal(id) { const el=document.getElementById(id); if(el){ el.classList.remove('open'); document.body.style.overflow=''; } }

// ================================================================
// FOTO PREVIEW
// ================================================================
function previewFoto(event) {
  const preview = document.getElementById('foto-preview');
  if (!preview) return;
  preview.innerHTML = '';
  Array.from(event.target.files).slice(0,4).forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = document.createElement('img');
      img.src = e.target.result;
      img.style.cssText = 'width:70px;height:70px;object-fit:cover;border-radius:10px';
      preview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
}

// ================================================================
// SEARCH
// ================================================================
function setupSearch() {
  ['search-barang','search-invoice','search-stok','search-mitra'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', e => {
      const q    = e.target.value.toLowerCase();
      const type = id.replace('search-','');
      if (type === 'barang' || type === 'stok') {
        const tbody = document.getElementById('tbody-' + type);
        if (!tbody) return;
        if (!q) { type==='barang'?renderBarang():renderStok(); return; }
        const filtered = DB.barang.filter(b => b.nama.toLowerCase().includes(q) || b.kode.toLowerCase().includes(q));
        if (type === 'barang') {
          tbody.innerHTML = filtered.map((b,i)=>{
            const stokStatus = b.stok<=b.minStok?'<span class="badge badge-red">Kritis</span>':'<span class="badge badge-green">Aman</span>';
            return '<tr><td><div style="width:34px;height:34px;border-radius:8px;background:var(--bg);display:flex;align-items:center;justify-content:center"><i class="fas fa-box" style="color:var(--primary-light);font-size:12px"></i></div></td><td><code>'+b.kode+'</code></td><td><strong>'+b.nama+'</strong></td><td>'+b.kategori+'</td><td>'+b.satuan+'</td><td>Rp '+b.hbeli.toLocaleString('id-ID')+'</td><td>Rp '+b.hjual.toLocaleString('id-ID')+'</td><td>'+b.stok+'</td><td>'+stokStatus+'</td><td><button class="btn btn-outline btn-sm" onclick="editBarang('+DB.barang.indexOf(b)+')"><i class="fas fa-edit"></i></button></td></tr>';
          }).join('');
        }
      } else if (type === 'invoice') {
        const tbody = document.getElementById('tbody-invoice');
        if (!tbody) return;
        if (!q) { renderInvoice(); return; }
        const filtered = DB.invoice.filter(i => i.no.toLowerCase().includes(q)||i.mitra.toLowerCase().includes(q));
        tbody.innerHTML = filtered.map((inv,i)=>{
          const bc = inv.status==='Lunas'?'badge-green':inv.status==='Jatuh Tempo'?'badge-red':'badge-yellow';
          return '<tr><td><code>'+inv.no+'</code></td><td>'+inv.tgl+'</td><td>'+inv.mitra+'</td><td>'+(inv.sales||'')+'</td><td>Rp '+inv.total.toLocaleString('id-ID')+'</td><td><span class="badge '+bc+'">'+inv.status+'</span></td><td>'+(inv.tempo||'—')+'</td><td><button class="btn btn-outline btn-sm" onclick="showInvoicePreview('+DB.invoice.indexOf(inv)+')"><i class="fas fa-eye"></i></button></td></tr>';
        }).join('');
      } else if (type === 'mitra') {
        const tbody = document.getElementById('tbody-mitra');
        if (!tbody) return;
        if (!q) { renderMitra(); return; }
        const filtered = DB.mitra.filter(m => m.nama.toLowerCase().includes(q)||m.kode.toLowerCase().includes(q));
        tbody.innerHTML = filtered.map((m,i)=>'<tr><td><code>'+m.kode+'</code></td><td>'+m.nama+'</td><td><span class="badge '+(m.tipe==='Pemasok'?'badge-blue':'badge-green')+'">'+m.tipe+'</span></td><td>'+(m.pic||'—')+'</td><td>'+(m.hp||'—')+'</td><td>'+(m.kota||'—')+'</td><td>Rp '+(m.piutang||0).toLocaleString('id-ID')+'</td><td><span class="badge badge-green">'+m.status+'</span></td><td><button class="btn btn-sm" style="background:rgba(239,68,68,0.12);color:var(--danger);border:none" onclick="hapusMitra('+DB.mitra.indexOf(m)+')"><i class="fas fa-trash"></i></button></td></tr>').join('');
      }
    });
  });

  // Global search
  const gs = document.getElementById('global-search');
  if (gs) gs.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    if (!q) return;
    const found = DB.barang.find(b => b.nama.toLowerCase().includes(q) || b.kode.toLowerCase().includes(q));
    if (found) { navigateTo('barang'); showToast('🔍 Ditemukan: ' + found.nama); }
  });
}

// ================================================================
// DATE
// ================================================================
function updateDate() {
  const el = document.getElementById('topbar-date');
  if (!el) return;
  const opts = { weekday:'long', year:'numeric', month:'long', day:'numeric' };
  el.textContent = new Date().toLocaleDateString('id-ID', opts);
}

// ================================================================
// TOAST
// ================================================================
let toastTimer;
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  const icon  = document.getElementById('toast-icon');
  const msgEl = document.getElementById('toast-msg');
  if (!toast) return;
  const icons   = { success:'fa-circle-check', error:'fa-circle-xmark', warning:'fa-triangle-exclamation', info:'fa-circle-info' };
  const colors  = { success:'#10b981', error:'#ef4444', warning:'#f59e0b', info:'#2563a8' };
  const bgColor = { success:'rgba(16,185,129,0.12)', error:'rgba(239,68,68,0.12)', info:'rgba(37,99,168,0.12)', warning:'rgba(245,158,11,0.12)' };
  if (icon)  { icon.className = 'fas ' + (icons[type]||icons.success); icon.style.color = colors[type]||colors.success; }
  if (msgEl) msgEl.textContent = msg;
  toast.style.background = bgColor[type] || bgColor.success;
  toast.style.display = 'flex';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.style.display = 'none'; }, 3500);
}

// ================================================================
// INIT
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Apply saved theme
  const saved = localStorage.getItem('bms-theme');
  if (saved) applyTheme(saved);

  // Update date
  updateDate();

  // ── FIREBASE FALLBACK: module bisa saja sudah run sebelum event listener terpasang ──
  // Cek apakah firebase.js sudah set window.FIREBASE_READY = true
  if (window.FIREBASE_READY) {
    updateFBStatus('online');
  }
  // Tunggu maksimal 6 detik, kalau FIREBASE_READY belum true, tandai offline
  let fbWait = 0;
  const fbCheck = setInterval(() => {
    fbWait += 500;
    if (window.FIREBASE_READY) {
      updateFBStatus('online');
      clearInterval(fbCheck);
    } else if (fbWait >= 6000) {
      updateFBStatus('offline');
      clearInterval(fbCheck);
    }
  }, 500);

  // Close modal on overlay click
  document.addEventListener('click', ev => {
    if (ev.target.classList.contains('modal-overlay')) {
      ev.target.classList.remove('open');
      document.body.style.overflow = '';
    }
    if (!ev.target.closest('.notif-panel') && !ev.target.closest('.topbar-btn')) {
      document.getElementById('notif-panel')?.classList.remove('open');
    }
  });

  // Sidebar overlay click
  document.getElementById('sidebar-overlay')?.addEventListener('click', closeSidebar);

  // Setup search
  setupSearch();

  // Default selectRole
  selectRole('owner');
});
