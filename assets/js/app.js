// ================================================================
//  BMS app.js v4.0 — CV. Baitul Ma'mur Syafaah
//  Firebase Auth + Firestore realtime | Multi-role | Dark/Light
//  Owner / Admin Keuangan / Sales | Live Chat | Log Aktivitas
// ================================================================

// ── MENU CONFIG ──────────────────────────────────────────────────
const MENU_CONFIG = [
  { id:'dashboard',  label:'Dashboard',          icon:'fa-gauge',            sub:'Ringkasan bisnis hari ini' },
  { id:'barang',     label:'Data Barang',         icon:'fa-box-open',         sub:'Kelola produk & inventaris' },
  { id:'invoice',    label:'Transaksi',           icon:'fa-file-invoice',     sub:'Buat & kelola invoice penjualan' },
  { id:'stok',       label:'Info Stok',           icon:'fa-warehouse',        sub:'Monitor stok masuk & keluar' },
  { id:'mitra',      label:'Mitra Bisnis',        icon:'fa-handshake',        sub:'Pelanggan & pemasok' },
  { id:'keuangan',   label:'Keuangan',            icon:'fa-chart-line',       sub:'Laporan keuangan & aset' },
  { id:'laporan',    label:'Laporan & Analitik',  icon:'fa-chart-bar',        sub:'Analisis performa bisnis' },
  { id:'sales_dash', label:'Dashboard Sales',     icon:'fa-user-chart',       sub:'Performa & estimasi komisi' },
  { id:'opname',     label:'Stock Opname',        icon:'fa-clipboard-check',  sub:'Audit & rekonsiliasi stok fisik' },
  { id:'log',        label:'Log Aktivitas',       icon:'fa-history',          sub:'Riwayat semua aktivitas sistem' },
  { id:'settings',   label:'Pengaturan',          icon:'fa-cog',              sub:'Kelola pengguna, kategori & data' },
  { id:'tutorial',   label:'Panduan',             icon:'fa-circle-question',  sub:'Cara pakai sistem BMS' },
];

// ── STATE ────────────────────────────────────────────────────────
let currentUser    = null;     // profil user yang sedang login
let selectedRole   = 'owner';  // role dipilih di login
let selectedSalesId = null;
let invItems       = [];       // item baris invoice aktif
let invCounter     = 1000;
let appConfig      = null;     // data dari Firestore /test/appConfig
let onlineUsers    = {};       // uid → { name, role, avatar, ... }
let chatOpen       = false;
let activeChatTab  = 'messages';

const DEFAULT_KATEGORI = [
  'Beras & Tepung', 'Minyak & Lemak', 'Gula & Pemanis',
  'Bumbu & Rempah', 'Minuman', 'Snack & Makanan Ringan',
  'Produk Susu', 'Produk Beku', 'Perawatan Diri', 'Lainnya',
];

// ── LOCAL DATA ───────────────────────────────────────────────────
const DB = {
  barang: [], invoice: [], mitra: [],
  pengeluaran: [], pembelian: [], log: [], chat: [],
  notifikasi: [
    { id:1, pesan:'Stok Gula Pasir kritis — sisa 12 karung', waktu:'2 menit lalu',  tipe:'danger',  baca:false },
    { id:2, pesan:'Invoice jatuh tempo menunggu konfirmasi',  waktu:'1 jam lalu',    tipe:'warning', baca:false },
    { id:3, pesan:'Data berhasil disinkronkan ke Firebase',   waktu:'5 menit lalu',  tipe:'success', baca:true  },
  ],
};

// ── FIREBASE EVENTS ──────────────────────────────────────────────
// Fallback interval: kalau event 'firebase-ready' sudah ter-dispatch
// sebelum listener ini terpasang, FIREBASE_READY sudah true
window.addEventListener('firebase-ready',  () => updateFBStatus('loading'));
window.addEventListener('firebase-failed', () => updateFBStatus('offline'));

// ================================================================
//  THEME
// ================================================================
function initTheme() {
  const saved = localStorage.getItem('bms_theme') || 'light';
  applyTheme(saved);
}
function applyTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem('bms_theme', theme);
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) btn.innerHTML = theme === 'dark'
    ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}
function toggleTheme() {
  applyTheme(document.body.dataset.theme === 'dark' ? 'light' : 'dark');
}

// ================================================================
//  RUNNING TEXT
// ================================================================
function updateRunningText() {
  const el = document.getElementById('running-text-content');
  if (!el || !DB.barang.length) return;
  const sorted = [...DB.barang].sort((a,b) => (b.keluar||0) - (a.keluar||0));
  const items  = sorted.slice(0,5).map(b =>
    `🔥 ${b.nama} — Rp ${(b.hjual||0).toLocaleString('id-ID')} / ${b.satuan}`
  ).join('   ⬥   ');
  el.textContent = items + '   ⬥   ' + items;
}

// ================================================================
//  APP CONFIG — dari Firestore /test/appConfig
// ================================================================
async function loadAppConfig() {
  try {
    const snap = await window.FS.getDoc(window.FS.docRef('test', 'appConfig'));
    if (snap.exists()) {
      appConfig = snap.data();
    } else {
      appConfig = defaultAppConfig();
    }
    // Pastikan kategori ada
    if (!appConfig.kategori || !appConfig.kategori.length) {
      appConfig.kategori = [...DEFAULT_KATEGORI];
    }
    renderSalesDropdown();
  } catch(e) {
    console.warn('appConfig load failed, pakai default:', e.message);
    appConfig = defaultAppConfig();
    renderSalesDropdown();
  }
}

function defaultAppConfig() {
  return {
    roleEmails: {
      owner: 'owner@bms-syafaah.id',
      admin : 'admin@bms-syafaah.id',
    },
    salesUsers: [
      { id:'s1', name:'Sales Budi',  email:'sales1@bms-syafaah.id', avatar:'B' },
      { id:'s2', name:'Sales Andi',  email:'sales2@bms-syafaah.id', avatar:'A' },
    ],
    company: {
      nama     : "CV. Baitul Ma'mur Syafaah",
      alamat   : 'Ruko Villa Bogor Indah 5, Bogor, Jawa Barat',
      telp     : '(0251) 8xxx-xxxx',
      email    : 'info@bms-syafaah.id',
      npwp     : 'xx.xxx.xxx.x-xxx.xxx',
      rekening : 'BCA 123-456-7890 a/n Baitul Mamur Syafaah',
    },
    bonusRate: 2,
    kategori : [...DEFAULT_KATEGORI],
  };
}

function renderSalesDropdown() {
  const list = document.getElementById('sales-user-list');
  if (!list || !appConfig) return;
  list.innerHTML = (appConfig.salesUsers || []).map(s =>
    `<div class="sales-user-btn${selectedSalesId===s.id?' active':''}"
       onclick="selectSalesUser('${s.id}','${s.name}','${s.email}')">
       ${s.avatar} ${s.name}
     </div>`
  ).join('');
}

function selectSalesUser(id, name, email) {
  selectedSalesId = id;
  document.querySelectorAll('.sales-user-btn').forEach(b => b.classList.remove('active'));
  event.currentTarget.classList.add('active');
  const el = document.getElementById('login-user-display');
  if (el) el.textContent = name;
}

function selectRole(role) {
  selectedRole    = role;
  selectedSalesId = null;
  document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('role-' + role);
  if (btn) btn.classList.add('active');
  const panel = document.getElementById('sales-list-panel');
  if (panel) panel.style.display = role === 'sales' ? 'block' : 'none';
  const disp = document.getElementById('login-user-display');
  if (disp) disp.textContent = role === 'sales'
    ? 'Pilih akun sales di bawah'
    : (role === 'owner' ? 'Owner BMS' : 'Admin Keuangan');
}

// ================================================================
//  FIREBASE AUTH — LOGIN / LOGOUT
// ================================================================
async function doLogin() {
  const password = document.getElementById('login-pass')?.value.trim();
  if (!password) { showToast('Password wajib diisi!', 'error'); return; }

  let email = '';
  if (selectedRole === 'sales') {
    if (!selectedSalesId) { showToast('Pilih akun sales terlebih dahulu!', 'error'); return; }
    const su = (appConfig?.salesUsers || []).find(s => s.id === selectedSalesId);
    email = su?.email || '';
  } else {
    email = appConfig?.roleEmails?.[selectedRole] || `${selectedRole}@bms-syafaah.id`;
  }

  if (!email) { showToast('Konfigurasi email tidak ditemukan!', 'error'); return; }

  const btn = document.getElementById('btn-login');
  if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Masuk...';

  try {
    await window.FA.signIn(email, password);
    // onAuthStateChanged di bawah akan menangani selanjutnya
  } catch(err) {
    const msgs = {
      'auth/wrong-password'       : 'Password salah!',
      'auth/user-not-found'       : 'Akun tidak ditemukan. Hubungi Owner.',
      'auth/invalid-email'        : 'Format email tidak valid.',
      'auth/too-many-requests'    : 'Terlalu banyak percobaan. Coba lagi nanti.',
      'auth/network-request-failed': 'Gagal koneksi — cek internet.',
      'auth/invalid-credential'   : 'Email atau password salah!',
    };
    showToast('❌ ' + (msgs[err.code] || err.message), 'error');
    if (btn) btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Masuk ke Dashboard';
  }
}

async function doLogout() {
  if (!confirm('Yakin ingin keluar?')) return;
  // Tandai offline di Firestore
  const uid = window.FA.currentUser()?.uid;
  if (uid) {
    window.FS.setDoc(window.FS.docRef('test', 'online_'+uid), {
      active: false, lastSeen: window.FS.ts()
    }).catch(() => {});
  }
  await window.FA.signOut();
  currentUser = null;
  document.getElementById('login-page').style.display = 'flex';
  document.getElementById('app').style.display        = 'none';
  addLog('login', 'Logout dari sistem').catch(() => {});
}

// ── onAuthStateChanged — dipanggil setiap kali auth berubah ─────
window.FA.onAuth(async (fbUser) => {
  if (!fbUser) return; // tidak ada user login

  try {
    // Coba ambil profil dari Firestore /users/{uid}
    const snap    = await window.FS.getDoc(window.FS.docRef('users', fbUser.uid));
    let profile   = snap.exists() ? snap.data() : null;

    if (!profile) {
      // Pertama kali login — buat profil otomatis berdasarkan email
      profile = buildProfileFromEmail(fbUser.email, fbUser.uid);
      await window.FS.setDoc(window.FS.docRef('users', fbUser.uid), profile);
    }

    currentUser = { ...profile, uid: fbUser.uid, email: fbUser.email };
    applySession(currentUser);
  } catch(e) {
    console.error('Auth profile error:', e);
    showToast('❌ Gagal memuat profil. Cek Firestore Rules.', 'error');
  }
});

function buildProfileFromEmail(email, uid) {
  const cfg        = appConfig || {};
  const roleEmails = cfg.roleEmails || {};
  let role='sales', name='Sales User', avatar='S', label='Tim Sales';
  let menus = ['dashboard','stok','invoice','mitra','sales_dash'];

  if (email === roleEmails.owner || email.startsWith('owner@')) {
    role='owner'; name='Owner BMS'; avatar='O'; label='Pemilik / Administrator';
    menus = ['dashboard','barang','invoice','stok','mitra','keuangan','laporan','opname','log','settings','tutorial'];
  } else if (email === roleEmails.admin || email.startsWith('admin@')) {
    role='admin'; name='Admin Keuangan'; avatar='R'; label='Admin Keuangan';
    menus = ['dashboard','barang','invoice','stok','mitra','keuangan','opname','settings'];
  } else {
    const su = (cfg.salesUsers || []).find(s => s.email === email);
    if (su) { name = su.name; avatar = su.avatar || name[0]; }
  }
  return { role, name, avatar, label, menus, uid };
}

function applySession(user) {
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('app').style.display        = 'block';
  // Sidebar info
  const safe = (id, v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  safe('sb-avatar', user.avatar || user.name[0]);
  safe('sb-name',   user.name);
  safe('sb-role',   user.label);
  // Build nav
  buildNav(user.menus);
  applyRoleRestrictions(user.role);
  updateOnlineStatus(user);
  initData();
  navigateTo('dashboard');
  updateDate();
  renderNotifications();
  showToast(`✅ Selamat datang, ${user.name}!`);
  const btn = document.getElementById('btn-login');
  if (btn) btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Masuk ke Dashboard';
  addLog('login', `Login sebagai ${user.role}: ${user.name}`);
}

function applyRoleRestrictions(role) {
  const isSales = role === 'sales';
  const isOwner = role === 'owner';
  // Sembunyikan tombol tambah/hapus untuk sales
  const btnTambahBarang = document.getElementById('btn-tambah-barang');
  if (btnTambahBarang) btnTambahBarang.style.display = isSales ? 'none' : '';
  document.querySelectorAll('#page-stok .btn-success, #page-stok .btn-danger')
    .forEach(b => b.style.display = isSales ? 'none' : '');
}

// ── Online Status ────────────────────────────────────────────────
function updateOnlineStatus(user) {
  const uid = window.FA.currentUser()?.uid;
  if (!uid) return;
  const ref  = window.FS.docRef('test', 'online_' + uid);
  const data = { uid, name:user.name, role:user.role, avatar:user.avatar, active:true, lastSeen:window.FS.ts() };
  window.FS.setDoc(ref, data).catch(() => {});
  // Refresh heartbeat setiap 60 detik
  setInterval(() => window.FS.updateDoc(ref, { lastSeen: window.FS.ts() }).catch(() => {}), 60000);
  // Dengarkan perubahan status online semua user
  window.FS.onSnapshot(window.FS.query(window.FS.col('test')), snap => {
    onlineUsers = {};
    snap.docs.forEach(d => {
      const dt = d.data();
      if (dt.active && dt.uid) onlineUsers[dt.uid] = dt;
    });
    renderContactsList();
    const el = document.getElementById('online-count');
    if (el) el.textContent = Object.keys(onlineUsers).length + ' online';
  });
}

// ================================================================
//  NAV
// ================================================================
function buildNav(allowed) {
  const nav = document.getElementById('sidebar-nav');
  if (!nav) return;
  nav.innerHTML = '<div class="nav-label">MENU UTAMA</div>';
  MENU_CONFIG.filter(m => allowed.includes(m.id)).forEach(m => {
    const el = document.createElement('div');
    el.className = 'nav-item';
    el.id        = 'nav-' + m.id;
    el.onclick   = () => { navigateTo(m.id); if (window.innerWidth <= 768) closeSidebar(); };
    el.innerHTML = `<i class="fas ${m.icon}"></i> <span>${m.label}</span>`;
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
    const safe = (el, v) => { const e=document.getElementById(el); if(e) e.textContent=v; };
    safe('page-title', cfg.label);
    safe('page-sub',   cfg.sub);
  }
  if (id === 'laporan')    buildLaporanChart();
  if (id === 'sales_dash') buildSalesDashboard();
  if (id === 'settings')   renderSettings();
  if (id === 'opname')     renderOpname();
  if (id === 'keuangan')   renderAssets();
  if (id === 'log')        renderLog();
}

function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('mobile-open');
  document.getElementById('sidebar-overlay')?.classList.remove('show');
}
function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('mobile-open');
  document.getElementById('sidebar-overlay')?.classList.toggle('show');
}

// ================================================================
//  DATA INIT — dipanggil setelah login
// ================================================================
function initData() {
  if (window.FIREBASE_READY) {
    loadAllFromFirestore();
  } else {
    let w = 0;
    const t = setInterval(() => {
      w += 200;
      if (window.FIREBASE_READY) { clearInterval(t); loadAllFromFirestore(); }
      else if (w >= 5000)        { clearInterval(t); renderAll(); showToast('⚠️ Mode offline', 'warning'); }
    }, 200);
  }
  setDefaultDates();
  renderChatMessages();
  document.getElementById('inv-no').value = `INV-${new Date().getFullYear()}-${invCounter}`;
}

// ================================================================
//  FIRESTORE — LOAD ALL DATA
// ================================================================
async function loadAllFromFirestore() {
  const { FS } = window;
  updateFBStatus('loading');
  try {
    const [sB, sI, sM, sP, sPm, sL] = await Promise.all([
      FS.getDocs(FS.query(FS.col('barang'),      FS.orderBy('_ts','desc'))),
      FS.getDocs(FS.query(FS.col('invoice'),     FS.orderBy('_ts','desc'))),
      FS.getDocs(FS.query(FS.col('mitra'),       FS.orderBy('_ts','desc'))),
      FS.getDocs(FS.query(FS.col('pengeluaran'), FS.orderBy('_ts','desc'))),
      FS.getDocs(FS.query(FS.col('pembelian'),   FS.orderBy('_ts','desc'))),
      FS.getDocs(FS.query(FS.col('log'),         FS.orderBy('_ts','desc'), FS.limit(100))),
    ]);
    if (!sB.empty)  DB.barang      = sB.docs.map(d  => ({ _id:d.id, ...d.data() }));
    if (!sI.empty)  DB.invoice     = sI.docs.map(d  => ({ _id:d.id, ...d.data() }));
    if (!sM.empty)  DB.mitra       = sM.docs.map(d  => ({ _id:d.id, ...d.data() }));
    if (!sP.empty)  DB.pengeluaran = sP.docs.map(d  => ({ _id:d.id, ...d.data() }));
    if (!sPm.empty) DB.pembelian   = sPm.docs.map(d => ({ _id:d.id, ...d.data() }));
    if (!sL.empty)  DB.log         = sL.docs.map(d  => ({ _id:d.id, ...d.data() }));

    setupRealtimeListeners();
    renderAll();
    renderLog();
    updateFBStatus('online');
    showToast('☁️ Data berhasil dimuat dari Firebase!');
  } catch(err) {
    console.error('Firestore error:', err);
    updateFBStatus('offline');
    renderAll();
    showToast('⚠️ Firebase error — ' + err.message, 'warning');
  }
}

function setupRealtimeListeners() {
  const { FS } = window;
  // Setiap collection di-listen realtime
  FS.onSnapshot(FS.query(FS.col('barang'),      FS.orderBy('_ts','desc')), s => {
    if (!s.empty) { DB.barang = s.docs.map(d=>({_id:d.id,...d.data()})); renderBarang(); renderStok(); renderStokKritis(); fillDropdowns(); buildMainChart(); updateRunningText(); renderDashboardStats(); }
  });
  FS.onSnapshot(FS.query(FS.col('invoice'),     FS.orderBy('_ts','desc')), s => {
    if (!s.empty) { DB.invoice = s.docs.map(d=>({_id:d.id,...d.data()})); renderInvoice(); buildMainChart(); renderDashboardStats(); }
  });
  FS.onSnapshot(FS.query(FS.col('mitra'),       FS.orderBy('_ts','desc')), s => {
    if (!s.empty) { DB.mitra = s.docs.map(d=>({_id:d.id,...d.data()})); renderMitra(); fillDropdowns(); renderDashboardStats(); }
  });
  FS.onSnapshot(FS.query(FS.col('pengeluaran'), FS.orderBy('_ts','desc')), s => {
    if (!s.empty) { DB.pengeluaran = s.docs.map(d=>({_id:d.id,...d.data()})); renderPengeluaran(); renderDashboardStats(); }
  });
  FS.onSnapshot(FS.query(FS.col('pembelian'),   FS.orderBy('_ts','desc')), s => {
    if (!s.empty) { DB.pembelian = s.docs.map(d=>({_id:d.id,...d.data()})); renderPembelian(); renderDashboardStats(); }
  });
  FS.onSnapshot(FS.query(FS.col('log'),         FS.orderBy('_ts','desc'), FS.limit(100)), s => {
    DB.log = s.docs.map(d=>({_id:d.id,...d.data()})); renderLog();
  });
  FS.onSnapshot(FS.query(FS.col('chat'),        FS.orderBy('_ts','asc'), FS.limit(80)), s => {
    if (!s.empty) { DB.chat = s.docs.map(d=>({_id:d.id,...d.data()})); renderChatMessages(); }
  });
}

function renderAll() {
  renderBarang(); renderInvoice(); renderStok();
  renderMitra(); renderPengeluaran(); renderPembelian();
  renderStokKritis(); buildMainChart(); fillDropdowns();
  updateRunningText(); renderDashboardStats();
  if (currentUser) applyRoleRestrictions(currentUser.role);
}

// ================================================================
//  FIREBASE STATUS
// ================================================================
function updateFBStatus(state) {
  const el  = document.getElementById('fb-status');
  const txt = document.getElementById('fb-status-text');
  if (!el || !txt) return;
  const map = {
    online  : { cls:'online',  text:'☁️ Firebase terhubung — data real-time' },
    offline : { cls:'offline', text:'⚠️ Offline — data lokal aktif' },
    loading : { cls:'offline', text:'🔄 Memuat data dari Firebase...' },
  };
  const s = map[state] || map.offline;
  el.className    = 'firebase-status ' + s.cls;
  txt.textContent = s.text;
}

// ================================================================
//  ACTIVITY LOG
// ================================================================
async function addLog(aksi, detail) {
  if (!currentUser) return;
  const data = {
    user  : currentUser.name,
    role  : currentUser.role,
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

function renderLog() {
  const tbody = document.getElementById('tbody-log');
  if (!tbody) return;
  const icons = {
    login:'fa-sign-in-alt', tambah:'fa-plus', hapus:'fa-trash',
    invoice:'fa-file-invoice', stok:'fa-warehouse', chat:'fa-comment',
    edit:'fa-edit', export:'fa-download', setting:'fa-cog',
  };
  tbody.innerHTML = DB.log.map(l => `
    <tr>
      <td><span class="badge badge-blue"><i class="fas ${icons[l.aksi]||'fa-circle'} me-1"></i>${l.aksi}</span></td>
      <td><strong>${l.user}</strong></td>
      <td><span class="badge ${l.role==='owner'?'badge-purple':l.role==='admin'?'badge-yellow':'badge-green'}">${l.role}</span></td>
      <td>${l.detail}</td>
      <td style="color:var(--text-muted);font-size:12px">${new Date(l.waktu).toLocaleString('id-ID')}</td>
    </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted)">📋 Log kosong</td></tr>';
}

async function clearLog() {
  if (!confirm('Hapus semua log aktivitas dari cloud? Tindakan ini permanen!')) return;
  try {
    const snap  = await window.FS.getDocs(window.FS.col('log'));
    const batch = window.FS.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    DB.log = [];
    renderLog();
    showToast('🗑️ Log berhasil dihapus!');
    addLog('setting', 'Log aktivitas dibersihkan');
  } catch(e) { showToast('❌ Gagal hapus log: ' + e.message, 'error'); }
}

// ================================================================
//  UTILS: DATES, DROPDOWNS, SYNC
// ================================================================
function setDefaultDates() {
  const today = new Date().toISOString().split('T')[0];
  ['inv-tgl','pe-tgl','sm-tgl','sk-tgl','pb-tgl'].forEach(id => {
    const el = document.getElementById(id); if(el) el.value = today;
  });
  const t30 = new Date(); t30.setDate(t30.getDate() + 30);
  const tempo = document.getElementById('inv-tempo');
  if (tempo) tempo.value = t30.toISOString().split('T')[0];
}

function fillDropdowns() {
  const mitraOpts  = DB.mitra.map(m => `<option>${m.nama}</option>`).join('');
  const barangOpts = DB.barang.map(b => `<option>${b.nama}</option>`).join('');
  const pemasokOpts = DB.mitra.filter(m => m.tipe==='Pemasok').map(m=>`<option>${m.nama}</option>`).join('');
  const safeSet = (id, html) => { const el=document.getElementById(id); if(el) el.innerHTML=html; };
  safeSet('inv-mitra',  '<option value="">Pilih Mitra...</option>' + mitraOpts);
  safeSet('sm-barang',  '<option value="">Pilih Barang...</option>' + barangOpts);
  safeSet('sk-barang',  '<option value="">Pilih Barang...</option>' + barangOpts);
  safeSet('pb-barang',  '<option value="">Pilih Barang...</option>' + barangOpts);
  safeSet('sm-pemasok', '<option value="">Pilih Pemasok...</option>' + pemasokOpts);
  safeSet('pb-pemasok', '<option value="">Pilih Pemasok...</option>' + pemasokOpts);
  // Dropdown kategori di form edit barang
  const katOpts = (appConfig?.kategori || DEFAULT_KATEGORI).map(k=>`<option>${k}</option>`).join('');
  ['b-kategori','eb-kategori'].forEach(id => {
    const el = document.getElementById(id); if(el) el.innerHTML = katOpts;
  });
}

async function syncData() {
  const icon = document.getElementById('sync-icon');
  if (icon) icon.className = 'fas fa-sync fa-spin';
  showToast('🔄 Sinkronisasi data...', 'info');
  try {
    await loadAllFromFirestore();
    if (icon) icon.className = 'fas fa-sync';
    showToast('☁️ Data tersinkronkan!');
  } catch(e) {
    if (icon) icon.className = 'fas fa-sync';
    showToast('❌ Gagal sinkronisasi', 'error');
  }
}

// ================================================================
//  RENDER — TABLES & DASHBOARD
// ================================================================
function renderBarang() {
  const tbody = document.getElementById('tbody-barang');
  if (!tbody) return;
  const badge   = document.getElementById('total-barang-badge');
  if (badge)    badge.textContent = DB.barang.length + ' Item';
  const canEdit = currentUser && (currentUser.role==='owner'||currentUser.role==='admin');
  tbody.innerHTML = DB.barang.map((b,i) => {
    const fotoSrc = (b.foto && b.foto.length) ? b.foto[0] : null;
    const fotoEl  = fotoSrc
      ? `<img src="${fotoSrc}" style="width:44px;height:44px;border-radius:10px;object-fit:cover;border:2px solid var(--border)">`
      : `<div style="width:44px;height:44px;border-radius:10px;background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:22px;border:1px solid var(--border)">📦</div>`;
    return `<tr>
      <td>${fotoEl}</td>
      <td><code style="background:var(--bg);padding:2px 8px;border-radius:6px;font-size:12px;font-weight:700">${b.kode}</code></td>
      <td><strong>${b.nama}</strong><br><span style="font-size:11.5px;color:var(--text-muted)">${b.lokasi||''}</span></td>
      <td><span class="badge badge-blue">${b.kategori}</span></td>
      <td>${b.satuan}</td>
      <td>Rp ${(b.hbeli||0).toLocaleString('id-ID')}</td>
      <td><strong>Rp ${(b.hjual||0).toLocaleString('id-ID')}</strong></td>
      <td class="${b.stok<=b.minStok?'stock-low':'stock-ok'}">${b.stok}</td>
      <td><span class="badge ${b.stok<=b.minStok?'badge-red':'badge-green'}">${b.stok<=b.minStok?'⚠️ Kritis':'✅ Aman'}</span></td>
      <td>${canEdit ? `<div style="display:flex;gap:6px">
        <button class="btn btn-outline btn-icon btn-sm" title="Edit" onclick="editBarang(${i})"><i class="fas fa-edit"></i></button>
        <button class="btn btn-danger btn-icon btn-sm" title="Hapus" onclick="hapusBarang(${i})"><i class="fas fa-trash"></i></button>
      </div>` : '<span style="color:var(--text-muted)">—</span>'}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="10" style="text-align:center;padding:20px;color:var(--text-muted)">📦 Belum ada data barang</td></tr>';
}

function renderInvoice() {
  const tbody = document.getElementById('tbody-invoice');
  if (!tbody) return;
  const lunas  = DB.invoice.filter(i => i.status==='Lunas').reduce((s,i)=>s+(i.total||0),0);
  const belum  = DB.invoice.filter(i => i.status!=='Lunas').reduce((s,i)=>s+(i.total||0),0);
  const cash   = DB.invoice.filter(i => i.bayar==='Tunai'||i.bayar==='Transfer').reduce((s,i)=>s+(i.total||0),0);
  const safeSet = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  safeSet('trx-total-count', DB.invoice.length);
  safeSet('trx-lunas',  'Rp ' + lunas.toLocaleString('id-ID'));
  safeSet('trx-belum',  'Rp ' + belum.toLocaleString('id-ID'));
  safeSet('trx-cash',   'Rp ' + cash.toLocaleString('id-ID'));

  tbody.innerHTML = DB.invoice.map((inv,i) => `
    <tr>
      <td><strong style="color:var(--primary-light)">${inv.no}</strong></td>
      <td>${inv.tgl}</td>
      <td><strong>${inv.mitra}</strong></td>
      <td>${inv.salesName||'-'}</td>
      <td><strong>Rp ${(inv.total||0).toLocaleString('id-ID')}</strong></td>
      <td>${inv.bayar||'-'}</td>
      <td><span class="badge ${inv.status==='Lunas'?'badge-green':inv.status==='Jatuh Tempo'?'badge-red':'badge-yellow'}">${inv.status}</span></td>
      <td>${inv.tempo||'-'}</td>
      <td><div style="display:flex;gap:6px">
        <button class="btn btn-outline btn-icon btn-sm" onclick="showInvoicePreview(${i})" title="Preview"><i class="fas fa-eye"></i></button>
        <button class="btn btn-success btn-icon btn-sm" onclick="tandaiLunas(${i})" title="Tandai Lunas"><i class="fas fa-check"></i></button>
        <button class="btn btn-primary btn-icon btn-sm" onclick="window.print()" title="Cetak"><i class="fas fa-print"></i></button>
      </div></td>
    </tr>`).join('') || '<tr><td colspan="9" style="text-align:center;padding:20px;color:var(--text-muted)">🧾 Belum ada transaksi</td></tr>';
}

function renderStok() {
  const tbody = document.getElementById('tbody-stok');
  if (!tbody) return;
  const totalStok = DB.barang.reduce((s,x) => s+(x.stok||0), 0);
  tbody.innerHTML = DB.barang.map((b,i) => {
    const fotoSrc = (b.foto && b.foto.length) ? b.foto[0] : null;
    const fotoEl  = fotoSrc
      ? `<img src="${fotoSrc}" style="width:36px;height:36px;border-radius:8px;object-fit:cover">`
      : `<div style="width:36px;height:36px;border-radius:8px;background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:18px">📦</div>`;
    const pct = totalStok > 0 ? Math.round((b.stok/totalStok)*100) : 0;
    return `<tr>
      <td>${fotoEl}</td>
      <td><code style="background:var(--bg);padding:2px 8px;border-radius:6px;font-size:12px">${b.kode}</code></td>
      <td><strong>${b.nama}</strong></td>
      <td><span class="badge badge-blue">${b.kategori}</span></td>
      <td style="color:var(--accent2);font-weight:700">+${b.masuk||0}</td>
      <td style="color:var(--danger);font-weight:700">-${b.keluar||0}</td>
      <td class="${b.stok<=b.minStok?'stock-low':'stock-ok'}" style="font-size:15px;font-weight:800">${b.stok}</td>
      <td style="color:var(--text-muted)">${b.minStok}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="flex:1;background:var(--border);border-radius:20px;height:8px;overflow:hidden">
            <div style="width:${pct}%;background:var(--primary-light);height:100%;border-radius:20px"></div>
          </div>
          <span style="font-size:12px;font-weight:700;color:var(--text-muted);width:35px">${pct}%</span>
        </div>
      </td>
      <td><span class="badge ${b.stok<=b.minStok?'badge-red':'badge-green'}">${b.stok<=b.minStok?'⚠️ Kritis':'✅ Aman'}</span></td>
    </tr>`;
  }).join('') || '<tr><td colspan="10" style="text-align:center;padding:20px;color:var(--text-muted)">📦 Belum ada data</td></tr>';
}

function renderMitra() {
  const tbody = document.getElementById('tbody-mitra');
  if (!tbody) return;
  tbody.innerHTML = DB.mitra.map((m,i) => `
    <tr>
      <td><code style="background:var(--bg);padding:2px 8px;border-radius:6px;font-size:12px">${m.kode}</code></td>
      <td><strong>${m.nama}</strong></td>
      <td><span class="badge ${m.tipe==='Pelanggan'?'badge-blue':'badge-green'}">${m.tipe}</span></td>
      <td>${m.pic||'-'}</td><td>${m.hp||'-'}</td><td>${m.kota||'-'}</td>
      <td>${m.piutang>0?'<span class="badge badge-yellow">Rp '+m.piutang.toLocaleString('id-ID')+'</span>':'-'}</td>
      <td><span class="badge badge-green">${m.status||'Aktif'}</span></td>
      <td><div style="display:flex;gap:6px">
        <button class="btn btn-outline btn-icon btn-sm" onclick="chatMitra('${m.nama}')" title="Chat"><i class="fas fa-comment"></i></button>
        <button class="btn btn-danger btn-icon btn-sm" onclick="hapusMitra(${i})" title="Hapus"><i class="fas fa-trash"></i></button>
      </div></td>
    </tr>`).join('') || '<tr><td colspan="9" style="text-align:center;padding:20px;color:var(--text-muted)">🤝 Belum ada mitra</td></tr>';
}

function renderPengeluaran() {
  const tbody = document.getElementById('tbody-pengeluaran');
  if (!tbody) return;
  tbody.innerHTML = DB.pengeluaran.map(p => `
    <tr>
      <td>${p.tgl}</td><td>${p.ket}</td>
      <td><span class="badge badge-purple">${p.kat}</span></td>
      <td style="color:var(--danger);font-weight:700">Rp ${(p.jml||0).toLocaleString('id-ID')}</td>
    </tr>`).join('') || '<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--text-muted)">Belum ada data pengeluaran</td></tr>';
}

function renderPembelian() {
  const tbody = document.getElementById('tbody-pembelian');
  if (!tbody) return;
  tbody.innerHTML = DB.pembelian.map(p => `
    <tr>
      <td>${p.tgl}</td><td>${p.pemasok}</td><td>${p.barang}</td>
      <td style="font-weight:700">Rp ${(p.total||0).toLocaleString('id-ID')}</td>
    </tr>`).join('') || '<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--text-muted)">Belum ada data pembelian</td></tr>';
}

function renderAssets() {
  const el = document.getElementById('asset-list');
  if (!el) return;
  const totalStokValue = DB.barang.reduce((s,b) => s+(b.hbeli||0)*(b.stok||0), 0);
  const totalPiutang   = DB.mitra.reduce((s,m) => s+(m.piutang||0), 0);
  const totalPembelian = DB.pembelian.reduce((s,p) => s+(p.total||0), 0);
  el.innerHTML = `
    <div class="pl-row"><strong>Nilai Stok Barang</strong><span>Rp ${totalStokValue.toLocaleString('id-ID')}</span></div>
    <div class="pl-row"><strong>Total Piutang Mitra</strong><span style="color:var(--accent)">Rp ${totalPiutang.toLocaleString('id-ID')}</span></div>
    <div class="pl-row"><strong>Total Pembelian</strong><span style="color:var(--danger)">Rp ${totalPembelian.toLocaleString('id-ID')}</span></div>
    <div class="pl-row total"><strong>Total Aset Operasional</strong><strong>Rp ${(totalStokValue+totalPiutang).toLocaleString('id-ID')}</strong></div>`;
}

function renderStokKritis() {
  const list = document.getElementById('stok-kritis-list');
  if (!list) return;
  const kritis = DB.barang.filter(b => b.stok <= b.minStok);
  list.innerHTML = kritis.map(b => `
    <div class="act-item">
      <div class="act-dot" style="background:rgba(239,68,68,0.1);color:var(--danger)"><i class="fas fa-box"></i></div>
      <div class="act-text"><p style="font-weight:700">${b.nama}</p>
        <span class="stock-low">Sisa ${b.stok} ${b.satuan} ⚠️ Min: ${b.minStok}</span>
      </div>
    </div>`).join('') || '<div style="padding:20px;text-align:center;color:var(--text-muted)">✅ Semua stok aman</div>';
}

// ================================================================
//  DASHBOARD STATS
// ================================================================
function renderDashboardStats() {
  const safeSet = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };

  safeSet('dash-total-barang',  DB.barang.length);
  safeSet('dash-barang-aman',   DB.barang.filter(b=>b.stok>b.minStok).length + ' aman');
  safeSet('dash-total-invoice', DB.invoice.length);
  safeSet('dash-total-mitra',   DB.mitra.length);
  safeSet('dash-stok-kritis',   DB.barang.filter(b=>b.stok<=b.minStok).length);

  // Invoice pending di dashboard
  const pendingEl = document.getElementById('invoice-pending-list');
  if (pendingEl) {
    const pending = DB.invoice.filter(i => i.status!=='Lunas').slice(0,5);
    pendingEl.innerHTML = pending.map(inv => `
      <div class="act-item">
        <div class="act-dot" style="background:rgba(245,158,11,0.1);color:var(--accent)"><i class="fas fa-file-invoice"></i></div>
        <div class="act-text"><p style="font-weight:700">${inv.mitra}</p>
          <span style="color:var(--danger)">${inv.no} — Rp ${(inv.total||0).toLocaleString('id-ID')}</span>
        </div>
        <span class="badge badge-yellow">${inv.status}</span>
      </div>`).join('') || '<div style="padding:16px;text-align:center;color:var(--text-muted)">✅ Semua invoice lunas</div>';
  }

  // Keuangan KPI
  const totalPengeluaran = DB.pengeluaran.reduce((s,p)=>s+(p.jml||0),0);
  const totalPembelian   = DB.pembelian.reduce((s,p)=>s+(p.total||0),0);
  const totalPendapatan  = DB.invoice.filter(i=>i.status==='Lunas').reduce((s,i)=>s+(i.total||0),0);
  const laba             = totalPendapatan - totalPengeluaran - totalPembelian;
  const keuSet = (id,v) => { const el=document.getElementById(id); if(el) el.textContent='Rp '+v.toLocaleString('id-ID'); };
  keuSet('keu-total-pengeluaran', totalPengeluaran);
  keuSet('keu-total-pembelian',   totalPembelian);
  keuSet('keu-total-pendapatan',  totalPendapatan);
  keuSet('keu-laba',              laba);

  // Laporan KPI
  const maxKeluar  = DB.barang.reduce((max,b) => ((b.keluar||0)>(max.keluar||0)?b:max), {keluar:0});
  const mitraCount = {};
  DB.invoice.forEach(inv => { mitraCount[inv.mitra]=(mitraCount[inv.mitra]||0)+(inv.total||0); });
  const bestMitra  = Object.entries(mitraCount).sort((a,b)=>b[1]-a[1])[0];
  const avgMargin  = DB.barang.reduce((s,b)=>{if(!b.hbeli||!b.hjual)return s;return s+((b.hjual-b.hbeli)/b.hbeli*100);},0)/(DB.barang.length||1);
  const totalKeluar = DB.barang.reduce((s,b)=>s+(b.keluar||0),0);
  const totalStok   = DB.barang.reduce((s,b)=>s+(b.stok||0),0);
  const perputaran  = totalStok > 0 ? (totalKeluar/totalStok).toFixed(1) : 0;
  safeSet('lap-produk-terlaris',    maxKeluar.nama||'—');
  safeSet('lap-pelanggan-terbaik',  bestMitra?bestMitra[0]:'—');
  safeSet('lap-margin',             Math.round(avgMargin)+'%');
  safeSet('lap-perputaran',         perputaran+'x');

  // Distribusi stok
  renderDistribusiStok('distribusi-stok');
  renderDistribusiStok('laporan-distribusi');
}

function renderDistribusiStok(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const totalStok = DB.barang.reduce((s,b)=>s+(b.stok||0),0);
  if (totalStok===0) { el.innerHTML='<p style="color:var(--text-muted);font-size:13px">Belum ada data stok</p>'; return; }
  const sorted = [...DB.barang].sort((a,b)=>(b.stok||0)-(a.stok||0)).slice(0,8);
  const colors  = ['var(--primary-light)','var(--accent)','var(--accent2)','var(--danger)','var(--purple)','var(--cyan)','#f97316','#06b6d4'];
  el.innerHTML = sorted.map((b,i) => {
    const pct = Math.round(((b.stok||0)/totalStok)*100);
    return `<div class="dist-item">
      <div class="legend-dot" style="background:${colors[i%colors.length]};width:10px;height:10px;border-radius:50%;flex-shrink:0"></div>
      <span class="dist-name">${b.nama}</span>
      <div class="dist-bar-wrap"><div class="dist-bar" style="width:${pct}%;background:${colors[i%colors.length]}"></div></div>
      <span class="dist-pct">${pct}%</span>
    </div>`;
  }).join('');
}

// ================================================================
//  CHARTS
// ================================================================
function buildMainChart() {
  const months = [];
  for (let i=5;i>=0;i--) {
    const d = new Date(); d.setMonth(d.getMonth()-i);
    months.push({ key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`, label:d.toLocaleString('id-ID',{month:'short'}) });
  }
  const data = months.map(m => Math.round(
    DB.invoice.filter(inv=>inv.tgl?.startsWith(m.key)).reduce((s,inv)=>s+(inv.total||0),0)/1000000
  ) || 0);
  const max = Math.max(...data, 1);
  const el  = document.getElementById('main-chart');
  if (!el) return;
  el.innerHTML = data.map((v,i) => `
    <div class="bar-wrap">
      <div class="bar" style="height:${Math.max(Math.round((v/max)*100),4)}%;${v===Math.max(...data)?'background:linear-gradient(180deg,var(--accent),#f97316)':''}">
        <div class="bar-tooltip">Rp ${v} Jt</div>
      </div>
      <div class="bar-label">${months[i].label}</div>
    </div>`).join('');
}

function buildLaporanChart() {
  const yearSel = document.getElementById('laporan-year-sel');
  const year    = yearSel ? parseInt(yearSel.value) : new Date().getFullYear();
  const months  = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
  const data    = months.map((_,mi) => {
    const key = `${year}-${String(mi+1).padStart(2,'0')}`;
    return Math.round(DB.invoice.filter(inv=>inv.tgl?.startsWith(key)).reduce((s,inv)=>s+(inv.total||0),0)/1000000);
  });
  const max = Math.max(...data, 1);
  const el  = document.getElementById('laporan-chart');
  if (!el) return;
  const totalYear = data.reduce((s,v)=>s+v,0);
  el.innerHTML = data.map((v,i) => `
    <div class="bar-wrap">
      <div class="bar" style="height:${Math.max(Math.round((v/max)*100),2)}%;${v===Math.max(...data)?'background:linear-gradient(180deg,var(--accent),#f97316)':''}">
        <div class="bar-tooltip">Rp ${v} Jt</div>
      </div>
      <div class="bar-label">${months[i]}</div>
    </div>`).join('');
  const totalEl = document.getElementById('laporan-total-year');
  if (totalEl) totalEl.textContent = 'Total ' + year + ': Rp ' + totalYear + ' Jt';
}

// ================================================================
//  SALES DASHBOARD
// ================================================================
function buildSalesDashboard() {
  const myInv = currentUser?.role === 'sales'
    ? DB.invoice.filter(inv => inv.salesName === currentUser.name)
    : DB.invoice;
  const totalSales = myInv.reduce((s,i)=>s+(i.total||0),0);
  const lunas      = myInv.filter(i=>i.status==='Lunas').reduce((s,i)=>s+(i.total||0),0);
  const pending    = myInv.filter(i=>i.status!=='Lunas').reduce((s,i)=>s+(i.total||0),0);
  const bonus      = Math.round(lunas * ((appConfig?.bonusRate||2)/100));
  const el = document.getElementById('sales-kpi-area');
  if (!el) return;
  el.innerHTML = `
    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
      <div class="stat-card blue"><div class="stat-glow"></div><div class="stat-icon"><i class="fas fa-file-invoice-dollar"></i></div><h3>${myInv.length}</h3><p>Total Invoice</p></div>
      <div class="stat-card green"><div class="stat-glow"></div><div class="stat-icon"><i class="fas fa-check-circle"></i></div><h3>Rp ${Math.round(lunas/1000000)}Jt</h3><p>Sudah Lunas</p></div>
      <div class="stat-card amber"><div class="stat-glow"></div><div class="stat-icon"><i class="fas fa-clock"></i></div><h3>Rp ${Math.round(pending/1000000)}Jt</h3><p>Belum Lunas</p></div>
      <div class="stat-card" style="background:linear-gradient(135deg,rgba(16,185,129,0.08),rgba(16,185,129,0.04))"><div class="stat-glow" style="background:var(--accent2)"></div><div class="stat-icon" style="background:rgba(16,185,129,0.12);color:var(--accent2)"><i class="fas fa-gift"></i></div><h3 style="color:var(--accent2)">Rp ${bonus.toLocaleString('id-ID')}</h3><p>Est. Bonus (${appConfig?.bonusRate||2}%)</p></div>
    </div>`;
  const safeSet = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
  safeSet('sales-dash-name', currentUser?.name||'');
  // Chart
  const months  = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
  const year    = new Date().getFullYear();
  const chartData = months.map((_,mi) => {
    const key = `${year}-${String(mi+1).padStart(2,'0')}`;
    return Math.round(myInv.filter(i=>i.tgl?.startsWith(key)).reduce((s,i)=>s+(i.total||0),0)/1000000);
  });
  const max = Math.max(...chartData, 1);
  const chartEl = document.getElementById('sales-chart');
  if (chartEl) chartEl.innerHTML = chartData.map((v,i) => `
    <div class="bar-wrap">
      <div class="bar" style="height:${Math.max(Math.round((v/max)*100),2)}%"><div class="bar-tooltip">Rp ${v} Jt</div></div>
      <div class="bar-label">${months[i]}</div>
    </div>`).join('');
  // Tabel invoice
  const tableEl = document.getElementById('sales-invoice-table');
  if (tableEl) tableEl.innerHTML = myInv.slice(0,10).map(inv => `
    <tr>
      <td><strong style="color:var(--primary-light)">${inv.no}</strong></td>
      <td>${inv.tgl}</td>
      <td>${inv.mitra}</td>
      <td>Rp ${(inv.total||0).toLocaleString('id-ID')}</td>
      <td><span class="badge ${inv.status==='Lunas'?'badge-green':inv.status==='Jatuh Tempo'?'badge-red':'badge-yellow'}">${inv.status}</span></td>
      <td>Rp ${Math.round((inv.total||0)*((appConfig?.bonusRate||2)/100)).toLocaleString('id-ID')}</td>
    </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-muted)">Belum ada invoice</td></tr>';
}

// ================================================================
//  BARANG CRUD
// ================================================================
async function simpanBarang() {
  const nama = document.getElementById('b-nama')?.value.trim();
  const kode = document.getElementById('b-kode')?.value.trim();
  if (!nama||!kode) { showToast('Nama dan kode wajib diisi!','error'); return; }
  const fotoEl  = document.getElementById('foto-preview');
  const fotoArr = fotoEl ? Array.from(fotoEl.querySelectorAll('img')).map(img=>img.src) : [];
  const stok    = parseInt(document.getElementById('b-stok')?.value)||0;
  const data = {
    kode, nama,
    kategori: document.getElementById('b-kategori')?.value||'Lainnya',
    satuan  : document.getElementById('b-satuan')?.value||'Pcs',
    stok,
    hbeli   : parseInt(document.getElementById('b-hbeli')?.value)||0,
    hjual   : parseInt(document.getElementById('b-hjual')?.value)||0,
    minStok : parseInt(document.getElementById('b-minstock')?.value)||20,
    lokasi  : document.getElementById('b-lokasi')?.value||'',
    masuk   : stok,
    keluar  : 0,
    foto    : fotoArr,
  };
  try {
    await window.FS.addDoc(window.FS.col('barang'), data);
    addLog('tambah', 'Tambah barang: ' + nama);
    showToast('✅ Barang tersimpan ke cloud!');
  } catch(e) {
    DB.barang.unshift(data); renderBarang();
    showToast('✅ Barang ditambahkan (offline)');
  }
  fillDropdowns(); closeModal('modal-barang');
  ['b-kode','b-nama','b-stok','b-hbeli','b-hjual','b-desc'].forEach(id => {
    const el = document.getElementById(id); if(el) el.value='';
  });
  if (document.getElementById('foto-preview')) document.getElementById('foto-preview').innerHTML='';
}

function editBarang(i) {
  const b = DB.barang[i];
  if (!b) return;
  const safeSet = (id,v) => { const el=document.getElementById(id); if(el) el.value=v||''; };
  safeSet('eb-idx',      i);
  safeSet('eb-kode',     b.kode);
  safeSet('eb-nama',     b.nama);
  safeSet('eb-stok',     b.stok);
  safeSet('eb-hbeli',    b.hbeli);
  safeSet('eb-hjual',    b.hjual);
  safeSet('eb-minstock', b.minStok);
  safeSet('eb-lokasi',   b.lokasi);
  // Dropdown kategori & satuan
  const katEl = document.getElementById('eb-kategori');
  if (katEl) katEl.value = b.kategori;
  const satEl = document.getElementById('eb-satuan');
  if (satEl) satEl.value = b.satuan;
  // Preview foto lama
  const prevEl = document.getElementById('eb-foto-preview');
  if (prevEl && b.foto?.length) {
    prevEl.innerHTML = b.foto.map(src =>
      `<img src="${src}" style="width:80px;height:80px;object-fit:cover;border-radius:10px;border:2px solid var(--border)">`
    ).join('');
  } else if (prevEl) prevEl.innerHTML='';
  openModal('modal-edit-barang');
}

async function simpanEditBarang() {
  const i    = parseInt(document.getElementById('eb-idx')?.value);
  const b    = DB.barang[i];
  if (!b) return;
  const nama = document.getElementById('eb-nama')?.value.trim();
  const kode = document.getElementById('eb-kode')?.value.trim();
  if (!nama||!kode) { showToast('Nama dan kode wajib diisi!','error'); return; }
  // Cek apakah ada foto baru
  const fotoInput   = document.getElementById('eb-foto-input');
  const hasFotoBaru = fotoInput && fotoInput.files.length > 0;
  const prevEl      = document.getElementById('eb-foto-preview');
  const fotoArr     = hasFotoBaru
    ? Array.from(prevEl.querySelectorAll('img')).map(img=>img.src)
    : (b.foto || []);
  const updates = {
    kode, nama,
    kategori: document.getElementById('eb-kategori')?.value||b.kategori,
    satuan  : document.getElementById('eb-satuan')?.value||b.satuan,
    stok    : parseInt(document.getElementById('eb-stok')?.value)||b.stok,
    hbeli   : parseInt(document.getElementById('eb-hbeli')?.value)||b.hbeli,
    hjual   : parseInt(document.getElementById('eb-hjual')?.value)||b.hjual,
    minStok : parseInt(document.getElementById('eb-minstock')?.value)||b.minStok,
    lokasi  : document.getElementById('eb-lokasi')?.value||'',
    foto    : fotoArr,
  };
  try {
    if (b._id) await window.FS.updateDoc(window.FS.docRef('barang', b._id), updates);
    Object.assign(DB.barang[i], updates);
    addLog('edit', 'Edit barang: ' + nama);
    showToast('✅ Barang berhasil diperbarui!');
  } catch(e) {
    Object.assign(DB.barang[i], updates);
    renderBarang();
    showToast('✅ Barang diperbarui (offline)');
  }
  closeModal('modal-edit-barang');
}

async function hapusBarang(i) {
  const b = DB.barang[i];
  if (!confirm(`Hapus barang "${b.nama}"?`)) return;
  try {
    if (b._id) await window.FS.deleteDoc(window.FS.docRef('barang', b._id));
    else { DB.barang.splice(i,1); renderBarang(); }
    addLog('hapus', 'Hapus barang: ' + b.nama);
    showToast('🗑️ Barang dihapus!');
  } catch(e) { DB.barang.splice(i,1); renderBarang(); showToast('🗑️ Barang dihapus (offline)'); }
}

function previewFoto(event) {
  const preview = document.getElementById('foto-preview');
  if (!preview) return;
  preview.innerHTML = '';
  Array.from(event.target.files).slice(0,4).forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = document.createElement('img');
      img.src = e.target.result;
      img.style.cssText = 'width:80px;height:80px;object-fit:cover;border-radius:10px;border:2px solid var(--border)';
      preview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
}

function previewFotoEdit(event) {
  const preview = document.getElementById('eb-foto-preview');
  if (!preview) return;
  preview.innerHTML = '';
  Array.from(event.target.files).slice(0,4).forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = document.createElement('img');
      img.src = e.target.result;
      img.style.cssText = 'width:80px;height:80px;object-fit:cover;border-radius:10px;border:2px solid var(--border)';
      preview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
}

// ================================================================
//  INVOICE CRUD
// ================================================================
function addInvItem() {
  const tbody = document.getElementById('inv-items');
  const idx   = invItems.length;
  invItems.push({ nama:'', qty:1, satuan:'', harga:0, total:0 });
  const opts = DB.barang.map(b =>
    `<option data-harga="${b.hjual}" data-satuan="${b.satuan}" data-stok="${b.stok}">${b.nama}</option>`
  ).join('');
  const row = document.createElement('tr');
  row.innerHTML = `
    <td><select style="border:1px solid var(--border);border-radius:8px;padding:6px;font-size:12.5px;width:180px" onchange="updateItemBarang(${idx},this)">
      <option>Pilih...</option>${opts}</select></td>
    <td><input type="number" value="1" min="1" style="width:60px;border:1px solid var(--border);border-radius:8px;padding:6px;text-align:center" oninput="updateItemQty(${idx},this)"></td>
    <td id="inv-sat-${idx}" style="color:var(--text-muted)">-</td>
    <td id="inv-hp-${idx}"  style="color:var(--text-muted)">Rp 0</td>
    <td id="inv-stk-${idx}" style="color:var(--text-muted)">-</td>
    <td id="inv-tot-${idx}" style="font-weight:700">Rp 0</td>
    <td><button class="btn btn-danger btn-icon btn-sm" onclick="removeInvItem(${idx},this.closest('tr'))"><i class="fas fa-trash"></i></button></td>`;
  tbody.appendChild(row);
  hitungTotal();
}

function updateItemBarang(idx, sel) {
  const opt    = sel.options[sel.selectedIndex];
  const harga  = parseInt(opt.dataset.harga)||0;
  const satuan = opt.dataset.satuan||'-';
  const stok   = opt.dataset.stok||'?';
  invItems[idx] = { ...invItems[idx], nama:opt.text, harga, satuan, total:harga*(invItems[idx].qty||1) };
  document.getElementById(`inv-sat-${idx}`).textContent = satuan;
  document.getElementById(`inv-hp-${idx}`).textContent  = 'Rp ' + harga.toLocaleString('id-ID');
  document.getElementById(`inv-stk-${idx}`).textContent = 'Stok: ' + stok;
  document.getElementById(`inv-tot-${idx}`).textContent = 'Rp ' + invItems[idx].total.toLocaleString('id-ID');
  hitungTotal();
}

function updateItemQty(idx, input) {
  invItems[idx].qty   = parseInt(input.value)||0;
  invItems[idx].total = invItems[idx].harga * invItems[idx].qty;
  const el = document.getElementById(`inv-tot-${idx}`);
  if (el) el.textContent = 'Rp ' + invItems[idx].total.toLocaleString('id-ID');
  hitungTotal();
}

function removeInvItem(idx, row) { invItems[idx]=null; row?.remove(); hitungTotal(); }

function hitungTotal() {
  const items    = invItems.filter(Boolean);
  const subtotal = items.reduce((s,i)=>s+(i.total||0),0);
  const diskon   = parseFloat(document.getElementById('inv-diskon')?.value)||0;
  const afterD   = subtotal*(1-diskon/100);
  const ppn      = afterD*0.11;
  const total    = afterD+ppn;
  const safeSet  = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  safeSet('inv-subtotal', 'Rp '+subtotal.toLocaleString('id-ID'));
  safeSet('inv-ppn',      'Rp '+Math.round(ppn).toLocaleString('id-ID'));
  safeSet('inv-total',    'Rp '+Math.round(total).toLocaleString('id-ID'));
}

function toggleTempoField(metode) {
  const row = document.getElementById('tempo-row');
  if (row) row.style.display = metode==='Tempo' ? '' : 'none';
}

async function simpanInvoice() {
  const mitra = document.getElementById('inv-mitra')?.value;
  const items = invItems.filter(Boolean);
  if (!mitra||items.length===0) { showToast('Pilih mitra dan tambah item!','error'); return; }
  const subtotal = items.reduce((s,i)=>s+i.total,0);
  const diskon   = parseFloat(document.getElementById('inv-diskon')?.value)||0;
  const total    = Math.round(subtotal*(1-diskon/100)*1.11);
  const bayar    = document.getElementById('inv-bayar')?.value||'Tunai';
  invCounter++;
  const data = {
    no       : document.getElementById('inv-no')?.value,
    tgl      : document.getElementById('inv-tgl')?.value,
    tempo    : bayar==='Tempo' ? (document.getElementById('inv-tempo')?.value||'-') : '-',
    bayar, mitra, total, diskon,
    status   : bayar==='Tempo' ? 'Belum Lunas' : 'Lunas',
    items,
    salesName: currentUser?.name||'',
    salesUid : currentUser?.uid||'',
  };
  try {
    await window.FS.addDoc(window.FS.col('invoice'), data);
    addLog('invoice', 'Buat '+data.no+' — Rp '+total.toLocaleString('id-ID'));
    showToast('✅ Invoice tersimpan ke cloud!');
  } catch(e) { DB.invoice.unshift(data); renderInvoice(); showToast('✅ Invoice dibuat (offline)'); }
  closeModal('modal-invoice');
  invItems = [];
  document.getElementById('inv-items').innerHTML = '';
  document.getElementById('inv-no').value = `INV-${new Date().getFullYear()}-${invCounter}`;
  hitungTotal();
}

async function tandaiLunas(i) {
  const inv = DB.invoice[i];
  if (!inv) return;
  if (inv._id) {
    try { await window.FS.updateDoc(window.FS.docRef('invoice',inv._id), {status:'Lunas'}); }
    catch(e) { inv.status='Lunas'; renderInvoice(); }
  } else { inv.status='Lunas'; renderInvoice(); }
  addLog('invoice', 'Tandai lunas: ' + inv.no);
  showToast('✅ Invoice ditandai Lunas!');
}

function previewInvoice() {
  const mitra  = document.getElementById('inv-mitra')?.value||'Nama Mitra';
  const items  = invItems.filter(Boolean);
  const subtotal = items.reduce((s,i)=>s+(i.total||0),0);
  const diskon   = parseFloat(document.getElementById('inv-diskon')?.value)||0;
  const afterD   = subtotal*(1-diskon/100);
  const ppn      = afterD*0.11;
  const total    = afterD+ppn;
  const co       = appConfig?.company || {};
  document.getElementById('invoice-preview-content').innerHTML = `
    <div class="invoice-header">
      <div class="invoice-company">
        <h2>${co.nama||"Baitul Ma'mur Syafaah"}</h2>
        <p>${co.alamat||'Ruko Villa Bogor Indah 5, Bogor'}<br>
        Telp: ${co.telp||'(0251) 8xxx'} | Email: ${co.email||'info@bms-syafaah.id'}<br>
        NPWP: ${co.npwp||'xx.xxx.xxx'}</p>
      </div>
      <div class="invoice-meta">
        <h1>INVOICE</h1>
        <p>No: <strong>${document.getElementById('inv-no')?.value}</strong></p>
        <p>Tanggal: ${document.getElementById('inv-tgl')?.value}</p>
        ${document.getElementById('inv-bayar')?.value==='Tempo'?`<p>Jatuh Tempo: ${document.getElementById('inv-tempo')?.value}</p>`:''}
      </div>
    </div>
    <div class="invoice-to"><h4>Kepada Yth.</h4><p><strong>${mitra}</strong></p></div>
    <table class="invoice-table">
      <thead><tr><th>No</th><th>Nama Barang</th><th>Satuan</th><th style="text-align:right">Qty</th><th style="text-align:right">Harga</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${items.map((item,i) => `<tr><td>${i+1}</td><td>${item.nama}</td><td>${item.satuan}</td><td style="text-align:right">${item.qty}</td><td style="text-align:right">Rp ${item.harga.toLocaleString('id-ID')}</td><td style="text-align:right"><strong>Rp ${item.total.toLocaleString('id-ID')}</strong></td></tr>`).join('')}</tbody>
    </table>
    <div class="invoice-totals"><table>
      <tr><td>Subtotal</td><td>Rp ${subtotal.toLocaleString('id-ID')}</td></tr>
      ${diskon>0?`<tr><td>Diskon (${diskon}%)</td><td style="color:var(--danger)">- Rp ${Math.round(subtotal*diskon/100).toLocaleString('id-ID')}</td></tr>`:''}
      <tr><td>PPN 11%</td><td>Rp ${Math.round(ppn).toLocaleString('id-ID')}</td></tr>
      <tr class="total-row"><td>TOTAL</td><td>Rp ${Math.round(total).toLocaleString('id-ID')}</td></tr>
    </table></div>
    <div class="invoice-footer">
      <p>Terima kasih atas kepercayaan Anda berbelanja di ${co.nama||"Baitul Ma'mur Syafaah"}</p>
      <p>Pembayaran: ${co.rekening||'BCA 123-456-7890 a/n Baitul Mamur Syafaah'}</p>
    </div>`;
  openModal('modal-preview-inv');
}

function showInvoicePreview(i) {
  const inv = DB.invoice[i];
  document.getElementById('invoice-preview-content').innerHTML = `
    <div class="invoice-header">
      <div class="invoice-company"><h2>${appConfig?.company?.nama||"Baitul Ma'mur Syafaah"}</h2><p>Distributor Sembako · Bogor</p></div>
      <div class="invoice-meta"><h1>INVOICE</h1><p>No: <strong>${inv.no}</strong></p><p>Tgl: ${inv.tgl}</p></div>
    </div>
    <div class="invoice-to"><h4>Kepada</h4><p><strong>${inv.mitra}</strong></p></div>
    ${inv.items?`<table class="invoice-table"><thead><tr><th>No</th><th>Barang</th><th>Sat</th><th>Qty</th><th>Harga</th><th>Total</th></tr></thead><tbody>${inv.items.filter(Boolean).map((it,j)=>`<tr><td>${j+1}</td><td>${it.nama}</td><td>${it.satuan}</td><td>${it.qty}</td><td>Rp ${it.harga.toLocaleString('id-ID')}</td><td>Rp ${it.total.toLocaleString('id-ID')}</td></tr>`).join('')}</tbody></table>`:`<div style="padding:20px;text-align:center">Rp ${inv.total.toLocaleString('id-ID')}</div>`}
    <div class="invoice-totals"><table><tr class="total-row"><td>TOTAL</td><td>Rp ${inv.total.toLocaleString('id-ID')}</td></tr></table></div>
    <div class="invoice-footer"><p>Status: <strong>${inv.status}</strong> · Metode: ${inv.bayar||'-'}</p></div>`;
  openModal('modal-preview-inv');
}

// ================================================================
//  MITRA CRUD
// ================================================================
async function simpanMitra() {
  const nama = document.getElementById('m-nama')?.value.trim();
  if (!nama) { showToast('Nama mitra wajib diisi!','error'); return; }
  const kode = `MTR-${String(DB.mitra.length+1).padStart(3,'0')}`;
  const data = {
    kode, nama,
    tipe   : document.getElementById('m-tipe')?.value||'Pelanggan',
    pic    : document.getElementById('m-pic')?.value||'',
    hp     : document.getElementById('m-hp')?.value||'',
    kota   : document.getElementById('m-kota')?.value||'',
    piutang: 0, status:'Aktif',
  };
  try {
    await window.FS.addDoc(window.FS.col('mitra'), data);
    addLog('tambah','Tambah mitra: '+nama);
    showToast('✅ Mitra tersimpan ke cloud!');
  } catch(e) { DB.mitra.push(data); renderMitra(); showToast('✅ Mitra ditambahkan (offline)'); }
  fillDropdowns(); closeModal('modal-mitra');
  const el = document.getElementById('m-nama'); if(el) el.value='';
}

async function hapusMitra(i) {
  const m = DB.mitra[i];
  if (!confirm(`Hapus mitra "${m.nama}"?`)) return;
  try {
    if (m._id) await window.FS.deleteDoc(window.FS.docRef('mitra',m._id));
    else { DB.mitra.splice(i,1); renderMitra(); }
    addLog('hapus','Hapus mitra: '+m.nama);
    showToast('🗑️ Mitra dihapus!');
  } catch(e) { DB.mitra.splice(i,1); renderMitra(); showToast('🗑️ Mitra dihapus (offline)'); }
}

function chatMitra(nama) { openChat(); showToast(`💬 Memulai chat dengan ${nama}`); }

// ================================================================
//  STOK MASUK / KELUAR
// ================================================================
async function simpanStokMasuk() {
  const nama = document.getElementById('sm-barang')?.value;
  const qty  = parseInt(document.getElementById('sm-qty')?.value)||0;
  if (!nama||qty<=0) { showToast('Lengkapi data stok masuk!','error'); return; }
  const b = DB.barang.find(x => x.nama===nama);
  if (!b) return;
  b.stok += qty; b.masuk = (b.masuk||0) + qty;
  if (b._id) window.FS.updateDoc(window.FS.docRef('barang',b._id), {stok:b.stok,masuk:b.masuk}).catch(()=>{});
  renderStok(); renderBarang(); renderStokKritis();
  addLog('stok','Stok masuk '+nama+' +'+qty);
  closeModal('modal-stok-masuk');
  showToast(`✅ Stok ${nama} +${qty}!`);
}

async function simpanStokKeluar() {
  const nama = document.getElementById('sk-barang')?.value;
  const qty  = parseInt(document.getElementById('sk-qty')?.value)||0;
  if (!nama||qty<=0) { showToast('Lengkapi data stok keluar!','error'); return; }
  const b = DB.barang.find(x => x.nama===nama);
  if (!b) return;
  if (b.stok<qty) { showToast('❌ Stok tidak mencukupi!','error'); return; }
  b.stok -= qty; b.keluar = (b.keluar||0) + qty;
  if (b._id) window.FS.updateDoc(window.FS.docRef('barang',b._id), {stok:b.stok,keluar:b.keluar}).catch(()=>{});
  renderStok(); renderBarang(); renderStokKritis();
  addLog('stok','Stok keluar '+nama+' -'+qty);
  closeModal('modal-stok-keluar');
  showToast(`✅ Stok keluar ${nama} -${qty}!`);
}

// ================================================================
//  KEUANGAN
// ================================================================
async function simpanPengeluaran() {
  const ket = document.getElementById('pe-ket')?.value.trim();
  const jml = parseInt(document.getElementById('pe-jml')?.value)||0;
  if (!ket||jml<=0) { showToast('Lengkapi data pengeluaran!','error'); return; }
  const data = {
    tgl: document.getElementById('pe-tgl')?.value,
    ket, jml,
    kat: document.getElementById('pe-kat')?.value||'Lain-lain',
  };
  try {
    await window.FS.addDoc(window.FS.col('pengeluaran'), data);
    addLog('tambah','Pengeluaran: '+ket);
    showToast('✅ Pengeluaran tersimpan!');
  } catch(e) { DB.pengeluaran.unshift(data); renderPengeluaran(); showToast('✅ Dicatat (offline)'); }
  closeModal('modal-pengeluaran');
}

async function simpanPembelian() {
  const pemasok = document.getElementById('pb-pemasok')?.value;
  const barang  = document.getElementById('pb-barang')?.value;
  const qty     = parseInt(document.getElementById('pb-qty')?.value)||0;
  const harga   = parseInt(document.getElementById('pb-harga')?.value)||0;
  if (!pemasok||!barang||qty<=0) { showToast('Lengkapi data pembelian!','error'); return; }
  const data = {
    tgl    : document.getElementById('pb-tgl')?.value,
    pemasok, barang,
    total  : qty * harga,
  };
  try {
    await window.FS.addDoc(window.FS.col('pembelian'), data);
    addLog('tambah','Pembelian: '+barang);
    showToast('✅ Pembelian tersimpan!');
  } catch(e) { DB.pembelian.unshift(data); renderPembelian(); showToast('✅ Dicatat (offline)'); }
  closeModal('modal-pembelian');
}

// ================================================================
//  STOCK OPNAME
// ================================================================
function renderOpname() {
  const el = document.getElementById('opname-table-body');
  if (!el) return;
  const date = new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
  const opnDateEl = document.getElementById('opname-date');
  if (opnDateEl) opnDateEl.textContent = 'Tanggal: ' + date;
  el.innerHTML = DB.barang.map((b,i) => `
    <tr>
      <td><code>${b.kode}</code></td>
      <td><strong>${b.nama}</strong></td>
      <td>${b.satuan}</td>
      <td style="font-weight:700">${b.stok}</td>
      <td><input type="number" id="op-act-${i}" value="${b.stok}" min="0"
        style="width:80px;border:1.5px solid var(--border);border-radius:8px;padding:6px;text-align:center"
        oninput="updateOpnameDiff(${i})"></td>
      <td id="op-diff-${i}" style="font-weight:700">0</td>
      <td><span class="badge ${b.stok<=b.minStok?'badge-red':'badge-green'}">${b.stok<=b.minStok?'⚠️ Kritis':'✅ Aman'}</span></td>
      <td><input type="text" id="op-note-${i}" placeholder="Catatan..."
        style="width:120px;border:1.5px solid var(--border);border-radius:8px;padding:6px;font-size:12px"></td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="simpanSatuOpname(${i})" title="Simpan baris ini">
          <i class="fas fa-save"></i>
        </button>
      </td>
    </tr>`).join('') || '<tr><td colspan="9" style="text-align:center;padding:20px;color:var(--text-muted)">Belum ada data barang</td></tr>';
}

function updateOpnameDiff(i) {
  const sistem  = DB.barang[i]?.stok || 0;
  const aktual  = parseInt(document.getElementById(`op-act-${i}`)?.value)||0;
  const selisih = aktual - sistem;
  const el = document.getElementById(`op-diff-${i}`);
  if (!el) return;
  el.textContent = (selisih > 0 ? '+' : '') + selisih;
  el.style.color = selisih < 0 ? 'var(--danger)' : selisih > 0 ? 'var(--accent2)' : 'var(--text-muted)';
}

async function simpanSatuOpname(i) {
  const b      = DB.barang[i];
  if (!b) return;
  const aktual = parseInt(document.getElementById(`op-act-${i}`)?.value)||b.stok;
  const note   = document.getElementById(`op-note-${i}`)?.value||'';
  if (b._id) {
    try {
      await window.FS.updateDoc(window.FS.docRef('barang',b._id), { stok: aktual });
      b.stok = aktual;
      updateOpnameDiff(i);
      addLog('stok', `Opname ${b.nama}: stok dikoreksi ke ${aktual}`);
      showToast(`✅ Stok ${b.nama} diperbarui ke ${aktual}!`);
    } catch(e) { showToast('❌ Gagal simpan: '+e.message,'error'); }
  } else {
    b.stok = aktual; updateOpnameDiff(i);
    showToast(`✅ Stok ${b.nama} diperbarui (offline)`);
  }
}

async function simpanSemuaOpname() {
  if (!confirm('Simpan semua koreksi stok opname ke cloud?')) return;
  let saved = 0, errors = 0;
  for (let i=0; i<DB.barang.length; i++) {
    const b      = DB.barang[i];
    const aktual = parseInt(document.getElementById(`op-act-${i}`)?.value);
    if (isNaN(aktual) || aktual===b.stok) continue; // skip yang tidak berubah
    if (b._id) {
      try {
        await window.FS.updateDoc(window.FS.docRef('barang',b._id), { stok: aktual });
        b.stok = aktual;
        saved++;
      } catch(e) { errors++; }
    } else { b.stok = aktual; saved++; }
  }
  // Generate CSV laporan
  generateOpname();
  addLog('export','Stock Opname selesai — '+saved+' item diperbarui');
  showToast(`✅ Opname selesai! ${saved} item diperbarui${errors?' ('+errors+' gagal)':''}`);
}

async function generateOpname() {
  const rows = DB.barang.map((b,i) => {
    const aktual = parseInt(document.getElementById(`op-act-${i}`)?.value)||b.stok;
    const note   = document.getElementById(`op-note-${i}`)?.value||'';
    return `${b.kode},${b.nama},${b.satuan},${b.stok},${aktual},${aktual-b.stok},"${note}"`;
  });
  const csv  = ['Kode,Nama,Satuan,Stok Sistem,Stok Aktual,Selisih,Catatan', ...rows].join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `StockOpname_BMS_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

// ================================================================
//  SETTINGS
// ================================================================
function renderSettings() {
  const c = appConfig?.company || {};
  const safeSet = (id,v) => { const el=document.getElementById(id); if(el) el.value=v||''; };
  safeSet('set-company-nama',   c.nama);
  safeSet('set-company-alamat', c.alamat);
  safeSet('set-company-telp',   c.telp);
  safeSet('set-company-email',  c.email);
  safeSet('set-company-npwp',   c.npwp);
  safeSet('set-company-rek',    c.rekening);
  safeSet('set-bonus-rate',     appConfig?.bonusRate||2);
  renderUsersList();
  renderKategoriSettings();
}

function renderUsersList() {
  const el = document.getElementById('settings-users-list');
  if (!el || !appConfig) return;
  const sales = appConfig.salesUsers || [];
  el.innerHTML = `
    <div class="settings-user-row">
      <span class="badge badge-purple">Owner</span>
      <strong>Owner BMS</strong>
      <span style="color:var(--text-muted);font-size:12px">${appConfig.roleEmails?.owner||'owner@bms-syafaah.id'}</span>
      <span class="badge badge-green">Aktif</span>
    </div>
    <div class="settings-user-row">
      <span class="badge badge-yellow">Admin</span>
      <strong>Admin Keuangan</strong>
      <span style="color:var(--text-muted);font-size:12px">${appConfig.roleEmails?.admin||'admin@bms-syafaah.id'}</span>
      <span class="badge badge-green">Aktif</span>
    </div>
    ${sales.map((s,i) => `
    <div class="settings-user-row">
      <span class="badge badge-green">Sales</span>
      <strong>${s.name}</strong>
      <span style="color:var(--text-muted);font-size:12px">${s.email}</span>
      <button class="btn btn-danger btn-sm" onclick="hapusUserSales(${i})"><i class="fas fa-trash"></i></button>
    </div>`).join('')}`;
}

async function saveCompanyProfile() {
  const g = id => document.getElementById(id)?.value.trim()||'';
  const company = {
    nama     : g('set-company-nama'),
    alamat   : g('set-company-alamat'),
    telp     : g('set-company-telp'),
    email    : g('set-company-email'),
    npwp     : g('set-company-npwp'),
    rekening : g('set-company-rek'),
  };
  const bonusRate = parseInt(document.getElementById('set-bonus-rate')?.value)||2;
  if (!appConfig) appConfig = defaultAppConfig();
  appConfig.company   = company;
  appConfig.bonusRate = bonusRate;
  try {
    await window.FS.setDoc(window.FS.docRef('test','appConfig'), appConfig);
    showToast('✅ Profil perusahaan tersimpan!');
    addLog('setting','Update profil perusahaan');
  } catch(e) { showToast('❌ Gagal simpan: '+e.message,'error'); }
}

async function tambahUserSales() {
  const name  = document.getElementById('new-sales-name')?.value.trim();
  const email = document.getElementById('new-sales-email')?.value.trim();
  const pass  = document.getElementById('new-sales-pass')?.value.trim();
  if (!name||!email||!pass) { showToast('Lengkapi semua field!','error'); return; }
  if (pass.length < 6) { showToast('Password minimal 6 karakter!','error'); return; }
  try {
    showToast('⏳ Membuat akun Firebase Auth...','info');
    const uid = await window.FA.createUser(email, pass);
    // Simpan profil ke Firestore /users/{uid}
    const profile = {
      role   : 'sales',
      name, label:'Tim Sales',
      avatar : name[0].toUpperCase(),
      menus  : ['dashboard','stok','invoice','mitra','sales_dash'],
      email, uid,
    };
    await window.FS.setDoc(window.FS.docRef('users', uid), profile);
    // Tambah ke appConfig.salesUsers
    if (!appConfig) appConfig = defaultAppConfig();
    if (!appConfig.salesUsers) appConfig.salesUsers = [];
    const id = 's' + Date.now();
    appConfig.salesUsers.push({ id, name, email, avatar: name[0].toUpperCase() });
    await window.FS.setDoc(window.FS.docRef('test','appConfig'), appConfig);
    renderUsersList(); renderSalesDropdown();
    ['new-sales-name','new-sales-email','new-sales-pass'].forEach(id => {
      const el = document.getElementById(id); if(el) el.value='';
    });
    showToast('✅ Akun sales ' + name + ' berhasil dibuat!');
    addLog('setting','Tambah akun sales: '+name);
  } catch(e) { showToast('❌ Gagal buat akun: '+e.message,'error'); }
}

async function hapusUserSales(i) {
  const s = appConfig?.salesUsers?.[i];
  if (!s) return;
  if (!confirm(`Hapus akun sales ${s.name}? (akun Firebase Auth tidak ikut terhapus)`)) return;
  appConfig.salesUsers.splice(i,1);
  await window.FS.setDoc(window.FS.docRef('test','appConfig'), appConfig).catch(()=>{});
  renderUsersList(); renderSalesDropdown();
  showToast('🗑️ Akun sales dihapus dari konfigurasi');
  addLog('setting','Hapus akun sales: '+s.name);
}

// ── Kategori ─────────────────────────────────────────────────────
function renderKategoriSettings() {
  const el = document.getElementById('settings-kategori-list');
  if (!el) return;
  const kategori = appConfig?.kategori || DEFAULT_KATEGORI;
  el.innerHTML = kategori.map((k,i) => `
    <div class="settings-user-row" style="padding:8px 14px">
      <i class="fas fa-tag" style="color:var(--accent)"></i>
      <span style="flex:1">${k}</span>
      ${!DEFAULT_KATEGORI.includes(k) ? `<button class="btn btn-danger btn-sm" onclick="hapusKategori(${i})"><i class="fas fa-trash"></i></button>` : ''}
    </div>`).join('') || '<p style="color:var(--text-muted)">Belum ada kategori</p>';
}

async function tambahKategori() {
  const nama = document.getElementById('new-kategori-nama')?.value.trim();
  if (!nama) { showToast('Nama kategori wajib diisi!','error'); return; }
  if (!appConfig) appConfig = defaultAppConfig();
  if (!appConfig.kategori) appConfig.kategori = [...DEFAULT_KATEGORI];
  if (appConfig.kategori.includes(nama)) { showToast('Kategori sudah ada!','warning'); return; }
  appConfig.kategori.push(nama);
  await window.FS.setDoc(window.FS.docRef('test','appConfig'), appConfig).catch(()=>{});
  renderKategoriSettings();
  fillDropdowns();
  const el = document.getElementById('new-kategori-nama'); if(el) el.value='';
  showToast('✅ Kategori "'+nama+'" ditambahkan!');
}

async function hapusKategori(i) {
  if (!appConfig?.kategori) return;
  const nama = appConfig.kategori[i];
  if (DEFAULT_KATEGORI.includes(nama)) { showToast('Kategori default tidak bisa dihapus!','warning'); return; }
  if (!confirm(`Hapus kategori "${nama}"?`)) return;
  appConfig.kategori.splice(i,1);
  await window.FS.setDoc(window.FS.docRef('test','appConfig'), appConfig).catch(()=>{});
  renderKategoriSettings();
  fillDropdowns();
  showToast('🗑️ Kategori dihapus!');
}

// ================================================================
//  BACKUP / RESTORE / CLEAR
// ================================================================
async function backupData() {
  const backup = {
    exportedAt : new Date().toISOString(),
    version    : '4.0',
    barang     : DB.barang,
    invoice    : DB.invoice,
    mitra      : DB.mitra,
    pengeluaran: DB.pengeluaran,
    pembelian  : DB.pembelian,
    appConfig,
  };
  const blob = new Blob([JSON.stringify(backup,null,2)], {type:'application/json'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `BMS_Backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  addLog('export','Backup data JSON v4.0');
  showToast('💾 Backup berhasil diunduh!');
}

async function restoreData(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!data.barang) { showToast('❌ File backup tidak valid!','error'); return; }
    if (!confirm(`Restore backup dari ${data.exportedAt}?\nSemua data saat ini akan DIGANTI!`)) return;
    showToast('⏳ Memulai restore...','info');
    for (const col of ['barang','invoice','mitra','pengeluaran','pembelian']) {
      if (!data[col]) continue;
      const snap  = await window.FS.getDocs(window.FS.col(col));
      const batch = window.FS.batch();
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      for (const item of data[col]) {
        const {_id,_ts,...clean} = item;
        await window.FS.addDoc(window.FS.col(col), clean);
      }
    }
    showToast('✅ Restore selesai! Halaman akan refresh...');
    addLog('setting','Restore backup data');
    setTimeout(() => location.reload(), 2000);
  } catch(e) { showToast('❌ Gagal restore: '+e.message,'error'); }
}

async function clearCollection(colName, label) {
  if (!confirm(`Hapus SEMUA data ${label} dari cloud? PERMANEN!`)) return;
  try {
    const snap  = await window.FS.getDocs(window.FS.col(colName));
    const batch = window.FS.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    DB[colName] = [];
    renderAll();
    showToast(`🗑️ Data ${label} berhasil dihapus!`);
    addLog('setting','Clear data: '+label);
  } catch(e) { showToast('❌ Gagal hapus: '+e.message,'error'); }
}
function clearInvoice()    { clearCollection('invoice','Invoice'); }
function clearKeuangan()   { clearCollection('pengeluaran','Pengeluaran'); clearCollection('pembelian','Pembelian'); }
function clearDataBarang() { clearCollection('barang','Barang'); }

// ================================================================
//  NOTIFICATIONS
// ================================================================
function renderNotifications() {
  const list = document.getElementById('notif-list');
  if (!list) return;
  const unread = DB.notifikasi.filter(n=>!n.baca).length;
  const dot = document.getElementById('notif-dot');
  if (dot) dot.style.display = unread ? '' : 'none';
  const badge = document.getElementById('notif-count-badge');
  if (badge) { badge.textContent = unread; badge.style.display = unread ? '' : 'none'; }
  const iM = {danger:'fa-exclamation-circle',warning:'fa-clock',success:'fa-check-circle',info:'fa-info-circle'};
  const cM = {danger:'rgba(239,68,68,0.1)',warning:'rgba(245,158,11,0.1)',success:'rgba(16,185,129,0.1)',info:'rgba(37,99,168,0.1)'};
  const fM = {danger:'var(--danger)',warning:'var(--accent)',success:'var(--accent2)',info:'var(--primary-light)'};
  list.innerHTML = DB.notifikasi.map((n,i) => `
    <div class="notif-item${n.baca?'':' unread'}" onclick="bacaNotif(${i})">
      <div class="notif-icon" style="background:${cM[n.tipe]};color:${fM[n.tipe]};width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="fas ${iM[n.tipe]}"></i></div>
      <div style="flex:1"><p>${n.pesan}</p><small>${n.waktu}</small></div>
      ${!n.baca?'<div class="unread-dot" style="width:8px;height:8px;border-radius:50%;background:var(--primary-light);flex-shrink:0;margin-top:4px"></div>':''}
    </div>`).join('');
  // Auto-notif stok kritis
  DB.barang.filter(b=>b.stok<=b.minStok).forEach(b => {
    const exists = DB.notifikasi.some(n=>n.pesan.includes(b.nama)&&!n.baca);
    if (!exists) DB.notifikasi.unshift({ id:Date.now(), pesan:`⚠️ Stok ${b.nama} kritis — sisa ${b.stok} ${b.satuan}`, waktu:'Baru saja', tipe:'danger', baca:false });
  });
}
function bacaNotif(i)   { DB.notifikasi[i].baca=true; renderNotifications(); }
function markAllRead()  { DB.notifikasi.forEach(n=>n.baca=true); renderNotifications(); showToast('✅ Semua notifikasi dibaca'); }
function toggleNotif()  { document.getElementById('notif-panel')?.classList.toggle('open'); }

// ================================================================
//  CHAT REALTIME
// ================================================================
function toggleChat() {
  chatOpen = !chatOpen;
  document.getElementById('chat-window')?.classList.toggle('open', chatOpen);
  if (chatOpen) {
    document.getElementById('chat-unread-badge').style.display = 'none';
    document.getElementById('chat-input')?.focus();
  }
}
function openChat() {
  chatOpen = true;
  document.getElementById('chat-window')?.classList.add('open');
  document.getElementById('chat-unread-badge').style.display = 'none';
}
function switchChatTab(tab) {
  activeChatTab = tab;
  document.querySelectorAll('.chat-tab').forEach((t,i) =>
    t.classList.toggle('active', ['messages','contacts','broadcast'][i]===tab));
  const safe = (id,disp) => { const el=document.getElementById(id); if(el) el.style.display=disp; };
  safe('chat-messages',       tab==='messages' ?'flex':'none');
  safe('chat-contacts-panel', tab==='contacts' ?'block':'none');
  safe('chat-broadcast-panel',tab==='broadcast'?'block':'none');
  safe('chat-input-area',     tab==='messages' ?'flex':'none');
}

function renderChatMessages() {
  const body = document.getElementById('chat-messages');
  if (!body) return;
  const messages = DB.chat.length ? DB.chat : [];
  const myUid    = window.FA?.currentUser()?.uid;
  body.innerHTML = messages.map(m => {
    const isMine = m.uid === myUid;
    return `<div class="msg ${isMine?'mine':'other'}">
      <div class="msg-avatar">${m.avatar||m.sender?.[0]||'?'}</div>
      <div>
        ${!isMine?`<div style="font-size:11px;color:var(--text-muted);margin-bottom:3px;font-weight:600">${m.sender}</div>`:''}
        <div class="msg-bubble">${m.text}</div>
        <span class="msg-time">${m.time||''}</span>
      </div>
    </div>`;
  }).join('');
  body.scrollTop = body.scrollHeight;
}

function renderContactsList() {
  const panel = document.getElementById('chat-contacts-panel');
  if (!panel) return;
  const colors     = ['#1a3a5c','#f59e0b','#10b981','#7c3aed','#ef4444'];
  const onlineList = Object.values(onlineUsers);
  panel.innerHTML = onlineList.length
    ? onlineList.map((u,i) => `
      <div class="chat-contact">
        <div class="contact-avatar" style="width:36px;height:36px;border-radius:50%;background:${colors[i%colors.length]};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700">${u.avatar||u.name[0]}</div>
        <div class="contact-info" style="flex:1;margin-left:10px">
          <div style="font-weight:600">${u.name}</div>
          <div style="font-size:12px;color:var(--accent2)">🟢 Online · ${u.role}</div>
        </div>
      </div>`).join('')
    : '<div style="padding:20px;text-align:center;color:var(--text-muted)">Tidak ada yang online saat ini</div>';
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text  = input?.value.trim();
  if (!text||!currentUser) return;
  const now  = new Date();
  const time = now.getHours().toString().padStart(2,'0')+'.'+now.getMinutes().toString().padStart(2,'0');
  const data = {
    sender: currentUser.name,
    avatar: currentUser.avatar,
    uid   : window.FA.currentUser()?.uid||'',
    text, time,
  };
  if (input) input.value = '';
  try {
    await window.FS.addDoc(window.FS.col('chat'), data);
  } catch(e) {
    // fallback lokal
    const local = [...DB.chat, {...data,_id:Date.now().toString()}];
    DB.chat = local;
    renderChatMessages();
  }
}

function sendBroadcast() {
  const judul = document.getElementById('bc-judul')?.value.trim();
  const pesan = document.getElementById('bc-pesan')?.value.trim();
  if (!judul||!pesan) { showToast('Isi judul dan pesan broadcast!','error'); return; }
  // Kirim broadcast sebagai pesan chat dengan format khusus
  const now  = new Date();
  const data = {
    sender: currentUser?.name||'System',
    avatar: '📢',
    uid   : window.FA.currentUser()?.uid||'',
    text  : `📢 <strong>${judul}</strong><br>${pesan}`,
    time  : now.getHours().toString().padStart(2,'0')+'.'+now.getMinutes().toString().padStart(2,'0'),
    isBroadcast: true,
  };
  window.FS.addDoc(window.FS.col('chat'), data).catch(()=>{});
  showToast(`📢 Broadcast "${judul}" terkirim!`);
  addLog('chat','Broadcast: '+judul);
  const jEl = document.getElementById('bc-judul'); if(jEl) jEl.value='';
  const pEl = document.getElementById('bc-pesan'); if(pEl) pEl.value='';
}

// ================================================================
//  EXPORT CSV
// ================================================================
function exportCSV(type) {
  const maps = {
    barang     : { h:['Kode','Nama','Kategori','Satuan','H.Beli','H.Jual','Stok','Min Stok','Lokasi'], d:DB.barang.map(b=>[b.kode,b.nama,b.kategori,b.satuan,b.hbeli,b.hjual,b.stok,b.minStok,b.lokasi||'']) },
    invoice    : { h:['No Invoice','Tanggal','Mitra','Sales','Metode','Total','Status','Jatuh Tempo'], d:DB.invoice.map(i=>[i.no,i.tgl,i.mitra,i.salesName||'',i.bayar||'',i.total,i.status,i.tempo||'']) },
    mitra      : { h:['Kode','Nama','Tipe','PIC','HP','Kota','Piutang'], d:DB.mitra.map(m=>[m.kode,m.nama,m.tipe,m.pic||'',m.hp||'',m.kota||'',m.piutang||0]) },
    stok       : { h:['Kode','Nama','Kategori','Masuk','Keluar','Stok','Min Stok'], d:DB.barang.map(b=>[b.kode,b.nama,b.kategori,b.masuk||0,b.keluar||0,b.stok,b.minStok]) },
    pengeluaran: { h:['Tanggal','Keterangan','Kategori','Jumlah'], d:DB.pengeluaran.map(p=>[p.tgl,p.ket,p.kat,p.jml]) },
  };
  const m = maps[type]; if (!m) return;
  const csv  = [m.h.join(','), ...m.d.map(r=>r.map(v=>`"${v}"`).join(','))].join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `BMS_${type}_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  addLog('export','Export CSV: '+type);
  showToast(`📊 Export ${type} berhasil!`);
}

// ================================================================
//  MODAL & SEARCH
// ================================================================
function openModal(id)  { const el=document.getElementById(id); if(el){el.classList.add('open');document.body.style.overflow='hidden';} }
function closeModal(id) { const el=document.getElementById(id); if(el){el.classList.remove('open');document.body.style.overflow='';} }

document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open'); document.body.style.overflow='';
  }
  if (!e.target.closest('.notif-panel') && !e.target.closest('.topbar-btn')) {
    document.getElementById('notif-panel')?.classList.remove('open');
  }
});

function initSearch() {
  [
    { inputId:'search-barang',  tbodyId:'tbody-barang'  },
    { inputId:'search-invoice', tbodyId:'tbody-invoice' },
    { inputId:'search-mitra',   tbodyId:'tbody-mitra'   },
    { inputId:'search-stok',    tbodyId:'tbody-stok'    },
  ].forEach(({ inputId, tbodyId }) => {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.addEventListener('input', e => {
      const q = e.target.value.toLowerCase().trim();
      const tbody = document.getElementById(tbodyId);
      if (!tbody) return;
      Array.from(tbody.querySelectorAll('tr')).forEach(r => {
        r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  });
  // Global search
  const gs = document.getElementById('global-search');
  if (gs) gs.addEventListener('input', e => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) return;
    if (DB.barang.some(b=>b.nama.toLowerCase().includes(q)||b.kode.toLowerCase().includes(q))) {
      navigateTo('barang'); showToast('🔍 Hasil ditemukan di Data Barang'); return;
    }
    if (DB.invoice.some(i=>i.no.toLowerCase().includes(q)||i.mitra.toLowerCase().includes(q))) {
      navigateTo('invoice'); showToast('🔍 Hasil ditemukan di Transaksi'); return;
    }
    if (DB.mitra.some(m=>m.nama.toLowerCase().includes(q))) {
      navigateTo('mitra'); showToast('🔍 Hasil ditemukan di Mitra'); return;
    }
    showToast(`🔍 Tidak ditemukan hasil untuk "${q}"`, 'info');
  });
}

// ================================================================
//  DATE & TOAST
// ================================================================
function updateDate() {
  const el = document.getElementById('topbar-date');
  if (el) el.textContent = new Date().toLocaleDateString('id-ID',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
}

let toastTimer;
function showToast(msg, type='success') {
  const toast = document.getElementById('toast');
  const icon  = document.getElementById('toast-icon');
  const msgEl = document.getElementById('toast-msg');
  if (!toast) return;
  msgEl.textContent = msg;
  const icons = {success:'fa-check-circle',error:'fa-times-circle',info:'fa-info-circle',warning:'fa-exclamation-circle'};
  if (icon) {
    icon.className = 'fas '+(icons[type]||'fa-check-circle');
    icon.style.color = type==='error'?'#ef4444':type==='warning'?'#f59e0b':'#10b981';
  }
  const bgs = {success:'rgba(16,185,129,0.12)',error:'rgba(239,68,68,0.12)',info:'rgba(37,99,168,0.12)',warning:'rgba(245,158,11,0.12)'};
  toast.style.background = bgs[type]||bgs.success;
  toast.style.display    = 'flex';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.style.display='none'; }, 3500);
}

// ================================================================
//  DOM READY
// ================================================================
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  updateDate();

  // Tambah keyframe CSS yang dibutuhkan
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin    { to { transform: rotate(360deg); } }
    @keyframes marquee { 0% { transform: translateX(60vw); } 100% { transform: translateX(-100%); } }
    .msg { display:flex;gap:10px;margin-bottom:12px;align-items:flex-start }
    .msg.mine { flex-direction:row-reverse }
    .msg-avatar { width:30px;height:30px;border-radius:50%;background:var(--primary-light);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700;flex-shrink:0 }
    .msg.mine .msg-avatar { background:var(--accent) }
    .msg-bubble { background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:8px 12px;font-size:13px;max-width:240px;line-height:1.5 }
    .msg.mine .msg-bubble { background:var(--primary-light);color:#fff;border-color:var(--primary-light) }
    .msg-time { font-size:10px;color:var(--text-muted);margin-top:3px;display:block }
    .chat-contact { display:flex;align-items:center;padding:10px 14px;border-bottom:1px solid var(--border);transition:.15s;cursor:pointer }
    .chat-contact:hover { background:var(--bg) }
    .dist-item { display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:13px }
    .dist-name { width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap }
    .dist-bar-wrap { flex:1;background:var(--border);border-radius:20px;height:8px;overflow:hidden }
    .dist-bar { height:100%;border-radius:20px;transition:width .3s }
    .dist-pct { width:32px;text-align:right;font-size:12px;font-weight:700;color:var(--text-muted) }
    .settings-user-row { display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border);font-size:13px }
    .settings-user-row strong { flex:1 }
    .stock-ok  { color:var(--accent2) }
    .stock-low { color:var(--danger) }
  `;
  document.head.appendChild(style);

  // Pasang event listener file input edit barang
  const ebFoto = document.getElementById('eb-foto-input');
  if (ebFoto) ebFoto.addEventListener('change', previewFotoEdit);

  // Load appConfig dulu (public, tidak perlu login)
  if (window.FIREBASE_READY) {
    await loadAppConfig();
  } else {
    let w = 0;
    const t = setInterval(async () => {
      w += 200;
      if (window.FIREBASE_READY) { clearInterval(t); await loadAppConfig(); }
      else if (w >= 6000)        { clearInterval(t); appConfig = defaultAppConfig(); renderSalesDropdown(); }
    }, 200);
  }

  initSearch();
});

// Fallback: jika 6 detik setelah halaman load Firebase masih belum ready
window.addEventListener('load', () => {
  setTimeout(() => {
    if (!window.FIREBASE_READY) {
      const txt = document.getElementById('fb-status-text');
      if (txt) txt.textContent = '⚠️ Firebase tidak tersambung — cek koneksi internet';
    }
  }, 6000);
});
