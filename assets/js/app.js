// ================================================================
//  BMS app.js v3.0 — CV. Baitul Ma'mur Syafaah
//  Firebase Auth + Firestore | Dark/Light | Sales Dashboard
//  Multiple Sales | Settings | Stock Opname | Running Text
//  Dibuat oleh hantu @gostcyber 2026
// ================================================================

// ───────────────────── MENU CONFIG ─────────────────────────────
const MENU_CONFIG = [
  { id:'dashboard',  label:'Dashboard',          icon:'fa-gauge',         sub:'Ringkasan bisnis hari ini' },
  { id:'barang',     label:'Data Barang',         icon:'fa-box-open',      sub:'Kelola produk & inventaris' },
  { id:'invoice',    label:'Transaksi',           icon:'fa-receipt',       sub:'Daftar transaksi penjualan' },
  { id:'stok',       label:'Info Stok',           icon:'fa-warehouse',     sub:'Informasi stok barang' },
  { id:'mitra',      label:'Mitra Bisnis',        icon:'fa-handshake',     sub:'Pelanggan & pemasok' },
  { id:'keuangan',   label:'Keuangan',            icon:'fa-chart-line',    sub:'Laporan keuangan & aset' },
  { id:'laporan',    label:'Laporan & Analitik',  icon:'fa-chart-bar',     sub:'Analisis performa bisnis' },
  { id:'sales_dash', label:'Dashboard Sales',     icon:'fa-user-chart',    sub:'Performa & bonus penjualan' },
  { id:'opname',     label:'Stock Opname',        icon:'fa-clipboard-check',sub:'Audit & generate laporan stok' },
  { id:'settings',   label:'Pengaturan',          icon:'fa-cog',           sub:'Kelola pengguna & data' },
  { id:'tutorial',   label:'Panduan',             icon:'fa-circle-question',sub:'Cara pakai sistem' },
];

// ───────────────────── STATE ────────────────────────────────────
let currentUser  = null;
let selectedRole = 'owner';
let selectedSalesId = null;
let invItems  = [];
let invCounter = 1000;
let appConfig = null;   // loaded from Firestore /test/appConfig
let onlineUsers = {};   // uid → { name, role, lastSeen }

// ───────────────────── LOCAL DATA ───────────────────────────────
const DB = {
  barang: [], invoice: [], mitra: [],
  pengeluaran: [], pembelian: [],
  log: [], chat: [],
  notifikasi: [
    { id:1, pesan:'Stok Gula Pasir kritis — sisa 12 karung', waktu:'2 menit lalu', tipe:'danger', baca:false },
    { id:2, pesan:'Invoice jatuh tempo menunggu konfirmasi', waktu:'1 jam lalu',   tipe:'warning', baca:false },
    { id:3, pesan:'Data berhasil disinkronkan ke Firebase',  waktu:'5 menit lalu', tipe:'success', baca:true  },
  ],
};

let chatMessages = [];
let chatOpen = false;
let activeChatTab = 'messages';

// ───────────────────── THEME ────────────────────────────────────
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
  const cur = document.body.dataset.theme || 'light';
  applyTheme(cur === 'dark' ? 'light' : 'dark');
}

// ───────────────────── RUNNING TEXT ─────────────────────────────
function updateRunningText() {
  const el = document.getElementById('running-text-content');
  if (!el || !DB.barang.length) return;
  const sorted = [...DB.barang].sort((a,b) => (b.keluar||0)-(a.keluar||0));
  const items = sorted.slice(0,5).map(b =>
    `🔥 ${b.nama} — Rp ${(b.hjual||0).toLocaleString('id-ID')} / ${b.satuan}`
  ).join('   ⬥   ');
  el.textContent = items + '   ⬥   ' + items;
}

// ───────────────────── FIREBASE AUTH LOGIN ───────────────────────
async function loadAppConfig() {
  try {
    const snap = await window.FS.getDoc(window.FS.docRef('test','appConfig'));
    if (snap.exists()) {
      appConfig = snap.data();
    } else {
      // Default config — owner wajib setup via Settings
      appConfig = {
        roleEmails: {
          owner: 'owner@bms-syafaah.id',
          admin : 'admin@bms-syafaah.id',
        },
        salesUsers: [
          { id:'s1', name:'Sales Budi',  email:'sales1@bms-syafaah.id', avatar:'B' },
          { id:'s2', name:'Sales Andi',  email:'sales2@bms-syafaah.id', avatar:'A' },
          { id:'s3', name:'Sales Citra', email:'sales3@bms-syafaah.id', avatar:'C' },
        ],
        company: {
          nama: "CV. Baitul Ma'mur Syafaah",
          alamat: 'Ruko Villa Bogor Indah 5, Bogor, Jawa Barat',
          telp: '(0251) 8xxx-xxxx',
          email: 'info@bms-syafaah.id',
          npwp: 'xx.xxx.xxx.x-xxx.xxx',
          rekening: 'BCA 123-456-7890 a/n Baitul Mamur Syafaah',
        },
        bonusRate: 2,  // % komisi sales
      };
    }
    renderSalesDropdown();
  } catch(e) {
    console.warn('appConfig load failed:', e);
  }
}

function renderSalesDropdown() {
  const list = document.getElementById('sales-user-list');
  if (!list || !appConfig) return;
  const users = appConfig.salesUsers || [];
  list.innerHTML = users.map(s =>
    `<div class="sales-user-btn ${selectedSalesId===s.id?'active':''}"
      onclick="selectSalesUser('${s.id}','${s.name}','${s.email}')">${s.avatar} ${s.name}</div>`
  ).join('');
}

function selectSalesUser(id, name, email) {
  selectedSalesId = id;
  document.querySelectorAll('.sales-user-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('login-user-display').textContent = name;
}

function selectRole(role) {
  selectedRole = role;
  selectedSalesId = null;
  document.querySelectorAll('.role-btn').forEach(c => c.classList.remove('active'));
  document.getElementById('role-' + role).classList.add('active');
  const salesPanel = document.getElementById('sales-list-panel');
  if (salesPanel) salesPanel.style.display = role === 'sales' ? 'block' : 'none';
  const display = document.getElementById('login-user-display');
  if (display) display.textContent = role === 'sales' ? 'Pilih akun sales di bawah' :
    (role === 'owner' ? 'Owner BMS' : 'Admin Keuangan');
}

async function doLogin() {
  const password = document.getElementById('login-pass').value.trim();
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
    // onAuthStateChanged akan handle sisanya
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
  // Update online status
  if (currentUser && window.FA.currentUser()) {
    const uid = window.FA.currentUser().uid;
    window.FS.setDoc(window.FS.docRef('test','online_'+uid), { active: false, lastSeen: window.FS.ts() }).catch(()=>{});
  }
  await window.FA.signOut();
  currentUser = null;
  document.getElementById('login-page').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}

// ───────────────────── AUTH STATE LISTENER ───────────────────────
window.FA.onAuth(async (fbUser) => {
  if (!fbUser) return; // not logged in
  try {
    const snap = await window.FS.getDoc(window.FS.docRef('users', fbUser.uid));
    let profile = snap.exists() ? snap.data() : null;

    if (!profile) {
      // Pertama login — buat profil berdasarkan email
      profile = buildProfileFromEmail(fbUser.email, fbUser.uid);
      await window.FS.setDoc(window.FS.docRef('users', fbUser.uid), profile);
    }

    currentUser = { ...profile, uid: fbUser.uid, email: fbUser.email };
    applySession(currentUser);
  } catch(e) {
    console.error('Auth profile load error:', e);
    showToast('❌ Gagal memuat profil. Cek Firestore rules.', 'error');
  }
});

function buildProfileFromEmail(email, uid) {
  const cfg = appConfig || {};
  const roleEmails = cfg.roleEmails || {};
  let role = 'sales', name = 'Sales User', avatar = 'S', label = 'Tim Sales';
  let menus = ['dashboard','stok','invoice','mitra','sales_dash'];

  if (email === roleEmails.owner || email.startsWith('owner@')) {
    role='owner'; name='Owner BMS'; avatar='O'; label='Pemilik / Administrator';
    menus=['dashboard','barang','invoice','stok','mitra','keuangan','laporan','opname','settings','tutorial'];
  } else if (email === roleEmails.admin || email.startsWith('admin@')) {
    role='admin'; name='Admin Keuangan'; avatar='R'; label='Admin Keuangan';
    menus=['dashboard','barang','invoice','stok','mitra','keuangan','opname','settings'];
  } else {
    const su = (cfg.salesUsers || []).find(s => s.email === email);
    if (su) { name=su.name; avatar=su.avatar||name[0]; }
  }
  return { role, name, avatar, label, menus, uid };
}

function applySession(user) {
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  document.getElementById('sb-avatar').textContent = user.avatar || user.name[0];
  document.getElementById('sb-name').textContent = user.name;
  document.getElementById('sb-role').textContent = user.label;
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
}

function applyRoleRestrictions(role) {
  const isSales = role === 'sales';
  const isOwner = role === 'owner';
  const el = (id) => document.getElementById(id);
  if (el('btn-tambah-barang')) el('btn-tambah-barang').style.display = isSales ? 'none' : '';
  document.querySelectorAll('#page-stok .btn-success, #page-stok .btn-danger')
    .forEach(b => b.style.display = isSales ? 'none' : '');
  // Log Aktivitas hanya owner
  const logNav = document.getElementById('nav-log');
  if (logNav) logNav.style.display = isOwner ? '' : 'none';
}

// ───────────────────── ONLINE STATUS ────────────────────────────
function updateOnlineStatus(user) {
  if (!window.FA.currentUser()) return;
  const uid = window.FA.currentUser().uid;
  const ref = window.FS.docRef('test','online_'+uid);
  const data = { uid, name: user.name, role: user.role, avatar: user.avatar, active: true, lastSeen: window.FS.ts() };
  window.FS.setDoc(ref, data).catch(()=>{});
  // Update every 60s
  setInterval(() => window.FS.updateDoc(ref, { lastSeen: window.FS.ts() }).catch(()=>{}), 60000);
  // Listen online users
  window.FS.onSnapshot(window.FS.query(window.FS.col('test')), snap => {
    onlineUsers = {};
    snap.docs.forEach(d => {
      const data = d.data();
      if (data.active && data.uid) onlineUsers[data.uid] = data;
    });
    renderContactsList();
    updateOnlineCount();
  });
}

function updateOnlineCount() {
  const count = Object.keys(onlineUsers).length;
  const el = document.getElementById('online-count');
  if (el) el.textContent = count + ' online';
}

// ───────────────────── NAV ───────────────────────────────────────
function buildNav(allowed) {
  const nav = document.getElementById('sidebar-nav');
  nav.innerHTML = '<div class="nav-label">MENU UTAMA</div>';
  MENU_CONFIG.filter(m => allowed.includes(m.id)).forEach(m => {
    const el = document.createElement('div');
    el.className = 'nav-item';
    el.id = 'nav-' + m.id;
    el.onclick = () => { navigateTo(m.id); if(window.innerWidth<=768) toggleSidebar(); };
    el.innerHTML = `<i class="fas ${m.icon}"></i> <span>${m.label}</span>`;
    nav.appendChild(el);
  });
}

function navigateTo(id) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const navEl = document.getElementById('nav-' + id);
  if (navEl) navEl.classList.add('active');
  const pageEl = document.getElementById('page-' + id);
  if (pageEl) pageEl.classList.add('active');
  const cfg = MENU_CONFIG.find(m => m.id === id);
  if (cfg) {
    document.getElementById('page-title').textContent = cfg.label;
    document.getElementById('page-sub').textContent = cfg.sub;
  }
  if (id === 'laporan')    buildLaporanChart();
  if (id === 'sales_dash') buildSalesDashboard();
  if (id === 'settings')   renderSettings();
  if (id === 'opname')     renderOpname();
  if (id === 'keuangan')   renderAssets();
}

// ───────────────────── INIT ─────────────────────────────────────
function initData() {
  if (window.FIREBASE_READY) {
    loadAllFromFirestore();
  } else {
    let w = 0;
    const t = setInterval(() => {
      w += 200;
      if (window.FIREBASE_READY) { clearInterval(t); loadAllFromFirestore(); }
      else if (w >= 4000) { clearInterval(t); renderAll(); showToast('⚠️ Mode offline', 'warning'); }
    }, 200);
  }
  setDefaultDates();
  renderChatMessages();
  updateKategoriDropdowns();
  document.getElementById('inv-no').value = `TRX-${new Date().getFullYear()}-${invCounter}`;
}

function renderAll() {
  renderBarang(); renderInvoice(); renderStok();
  renderMitra(); renderPengeluaran(); renderPembelian();
  renderStokKritis(); buildMainChart(); fillDropdowns();
  updateRunningText();
  if (currentUser) applyRoleRestrictions(currentUser.role);
}

// ───────────────────── FIRESTORE LOAD ───────────────────────────
async function loadAllFromFirestore() {
  const { FS } = window;
  updateFBStatus('loading');
  try {
    const [sB, sI, sM, sP, sPm, sL] = await Promise.all([
      FS.getDocs(FS.query(FS.col('barang'),       FS.orderBy('_ts','desc'))),
      FS.getDocs(FS.query(FS.col('invoice'),      FS.orderBy('_ts','desc'))),
      FS.getDocs(FS.query(FS.col('mitra'),        FS.orderBy('_ts','desc'))),
      FS.getDocs(FS.query(FS.col('pengeluaran'),  FS.orderBy('_ts','desc'))),
      FS.getDocs(FS.query(FS.col('pembelian'),    FS.orderBy('_ts','desc'))),
      FS.getDocs(FS.query(FS.col('log'),          FS.orderBy('_ts','desc'), FS.limit(100))),
    ]);
    if (!sB.empty) DB.barang      = sB.docs.map(d  => ({ _id:d.id,...d.data() }));
    if (!sI.empty) DB.invoice     = sI.docs.map(d  => ({ _id:d.id,...d.data() }));
    if (!sM.empty) DB.mitra       = sM.docs.map(d  => ({ _id:d.id,...d.data() }));
    if (!sP.empty) DB.pengeluaran = sP.docs.map(d  => ({ _id:d.id,...d.data() }));
    if (!sPm.empty) DB.pembelian  = sPm.docs.map(d => ({ _id:d.id,...d.data() }));
    if (!sL.empty) DB.log         = sL.docs.map(d  => ({ _id:d.id,...d.data() }));

    setupRealtimeListeners();
    renderAll();
    renderLog();
    updateFBStatus('online');
    showToast('☁️ Data berhasil dimuat dari Firebase!', 'success');
  } catch(err) {
    console.error('Firestore error:', err);
    updateFBStatus('offline');
    renderAll();
    showToast('⚠️ Firebase error — ' + err.message, 'warning');
  }
}

function setupRealtimeListeners() {
  const { FS } = window;
  FS.onSnapshot(FS.query(FS.col('barang'),     FS.orderBy('_ts','desc')), s => {
    if(!s.empty) { DB.barang=s.docs.map(d=>({_id:d.id,...d.data()})); renderBarang(); renderStok(); renderStokKritis(); fillDropdowns(); buildMainChart(); updateRunningText(); }
  });
  FS.onSnapshot(FS.query(FS.col('invoice'),    FS.orderBy('_ts','desc')), s => {
    if(!s.empty) { DB.invoice=s.docs.map(d=>({_id:d.id,...d.data()})); renderInvoice(); buildMainChart(); }
  });
  FS.onSnapshot(FS.query(FS.col('mitra'),      FS.orderBy('_ts','desc')), s => {
    if(!s.empty) { DB.mitra=s.docs.map(d=>({_id:d.id,...d.data()})); renderMitra(); fillDropdowns(); }
  });
  FS.onSnapshot(FS.query(FS.col('pengeluaran'),FS.orderBy('_ts','desc')), s => {
    if(!s.empty) { DB.pengeluaran=s.docs.map(d=>({_id:d.id,...d.data()})); renderPengeluaran(); }
  });
  FS.onSnapshot(FS.query(FS.col('pembelian'),  FS.orderBy('_ts','desc')), s => {
    if(!s.empty) { DB.pembelian=s.docs.map(d=>({_id:d.id,...d.data()})); renderPembelian(); }
  });
  FS.onSnapshot(FS.query(FS.col('log'),        FS.orderBy('_ts','desc'), FS.limit(100)), s => {
    DB.log=s.docs.map(d=>({_id:d.id,...d.data()})); renderLog();
  });
  FS.onSnapshot(FS.query(FS.col('chat'),       FS.orderBy('_ts','asc'),  FS.limit(50)),  s => {
    if(!s.empty) { DB.chat=s.docs.map(d=>({_id:d.id,...d.data()})); renderChatMessages(); }
  });
}

// ───────────────────── ACTIVITY LOG ────────────────────────────
async function addLog(aksi, detail) {
  if (!currentUser) return;
  const data = {
    user: currentUser.name, role: currentUser.role,
    aksi, detail, waktu: new Date().toISOString()
  };
  try { await window.FS.addDoc(window.FS.col('log'), data); }
  catch(e) { DB.log.unshift({...data, _id:Date.now().toString()}); renderLog(); }
}

function renderLog() {
  const tbody = document.getElementById('tbody-log');
  if (!tbody) return;
  const icons = { login:'fa-sign-in-alt', tambah:'fa-plus', hapus:'fa-trash', invoice:'fa-file-invoice', stok:'fa-warehouse', chat:'fa-comment', edit:'fa-edit', export:'fa-download', setting:'fa-cog' };
  tbody.innerHTML = DB.log.map((l,i) => `
    <tr>
      <td><span class="badge badge-blue"><i class="fas ${icons[l.aksi]||'fa-circle'} me-1"></i>${l.aksi}</span></td>
      <td><strong>${l.user}</strong></td>
      <td><span class="badge ${l.role==='owner'?'badge-purple':l.role==='admin'?'badge-amber':'badge-green'}">${l.role}</span></td>
      <td>${l.detail}</td>
      <td style="color:var(--text-muted);font-size:12px">${new Date(l.waktu).toLocaleString('id-ID')}</td>
    </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted)">📋 Log kosong</td></tr>';
}

async function clearLog() {
  if (!confirm('Hapus semua log aktivitas dari cloud? Tindakan ini permanen!')) return;
  try {
    const snap = await window.FS.getDocs(window.FS.col('log'));
    const batch = window.FS.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    DB.log = [];
    renderLog();
    showToast('🗑️ Log berhasil dihapus dari cloud!');
    addLog('setting', 'Log aktivitas dibersihkan');
  } catch(e) { showToast('❌ Gagal hapus log: ' + e.message, 'error'); }
}

// ───────────────────── FIREBASE STATUS ──────────────────────────
function updateFBStatus(state) {
  const el  = document.getElementById('fb-status');
  const txt = document.getElementById('fb-status-text');
  if (!el || !txt) return;
  const states = {
    online  : { cls:'online',  text:'☁️ Firebase terhubung — data real-time' },
    offline : { cls:'offline', text:'⚠️ Offline — data lokal aktif' },
    loading : { cls:'offline', text:'🔄 Menghubungkan ke Firebase...' },
  };
  const s = states[state] || states.offline;
  el.className = `firebase-status ${s.cls}`;
  txt.textContent = s.text;
}

function setDefaultDates() {
  const today = new Date().toISOString().split('T')[0];
  ['inv-tgl','pe-tgl','sm-tgl','sk-tgl','pb-tgl'].forEach(id => {
    const el = document.getElementById(id); if(el) el.value = today;
  });
  const t30 = new Date(); t30.setDate(t30.getDate()+30);
  const el = document.getElementById('inv-tempo'); if(el) el.value = t30.toISOString().split('T')[0];
}

function fillDropdowns() {
  const mitraOpts   = DB.mitra.map(m => `<option>${m.nama}</option>`).join('');
  const barangOpts  = DB.barang.map(b => `<option>${b.nama}</option>`).join('');
  const pemasokOpts = DB.mitra.filter(m=>m.tipe==='Pemasok').map(m=>`<option>${m.nama}</option>`).join('');
  const safe = (id,inner) => { const el=document.getElementById(id); if(el) el.innerHTML=inner; };
  safe('inv-mitra',   '<option value="">Pilih Mitra...</option>' + mitraOpts);
  safe('sm-barang',   '<option value="">Pilih Barang...</option>' + barangOpts);
  safe('sk-barang',   '<option value="">Pilih Barang...</option>' + barangOpts);
  safe('pb-barang',   '<option value="">Pilih Barang...</option>' + barangOpts);
  safe('sm-pemasok',  '<option value="">Pilih Pemasok...</option>' + pemasokOpts);
  safe('pb-pemasok',  '<option value="">Pilih Pemasok...</option>' + pemasokOpts);
}

// ───────────────────── RENDER TABLES ───────────────────────────
function renderBarang() {
  const tbody = document.getElementById('tbody-barang');
  if (!tbody) return;
  const badge = document.getElementById('total-barang-badge');
  if (badge) badge.textContent = DB.barang.length + ' Item';
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
  }).join('');
}

function renderInvoice() {
  const tbody = document.getElementById('tbody-invoice');
  if (!tbody) return;
  const canEdit = currentUser && (currentUser.role==='owner'||currentUser.role==='admin');
  tbody.innerHTML = DB.invoice.map((inv,i) => {
    const metodeBayar = inv.metodeBayar || 'Tempo';
    const badgeMetode = metodeBayar === 'Tunai'
      ? 'badge-green' : metodeBayar === 'Transfer'
      ? 'badge-blue' : 'badge-amber';
    const badgeStatus = inv.status==='Lunas'?'badge-green':inv.status==='Jatuh Tempo'?'badge-red':'badge-amber';
    return `<tr>
      <td><strong style="color:var(--primary-light)">${inv.no}</strong></td>
      <td>${inv.tgl}</td>
      <td><strong>${inv.mitra}</strong></td>
      <td>${inv.salesName||'-'}</td>
      <td><strong>Rp ${(inv.total||0).toLocaleString('id-ID')}</strong></td>
      <td><span class="badge ${badgeMetode}">${metodeBayar}</span></td>
      <td><span class="badge ${badgeStatus}">${inv.status}</span></td>
      <td>${metodeBayar==='Tempo'?inv.tempo:'-'}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-outline btn-icon btn-sm" onclick="showInvoicePreview(${i})" title="Preview"><i class="fas fa-eye"></i></button>
          ${canEdit&&inv.status!=='Lunas'?`<button class="btn btn-success btn-icon btn-sm" onclick="tandaiLunas(${i})" title="Tandai Lunas"><i class="fas fa-check"></i></button>`:''}
          <button class="btn btn-primary btn-icon btn-sm" onclick="window.print()" title="Cetak"><i class="fas fa-print"></i></button>
          ${canEdit?`<button class="btn btn-danger btn-icon btn-sm" onclick="hapusTransaksi(${i})" title="Hapus"><i class="fas fa-trash"></i></button>`:''}
        </div>
      </td>
    </tr>`;
  }).join('') || '<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--text-muted)">Belum ada transaksi</td></tr>';
  renderInvoiceStats();
}

function renderStok() {
  const tbody = document.getElementById('tbody-stok');
  if (!tbody) return;
  tbody.innerHTML = DB.barang.map((b,i) => {
    const fotoSrc = (b.foto && b.foto.length) ? b.foto[0] : null;
    const fotoEl  = fotoSrc
      ? `<img src="${fotoSrc}" style="width:36px;height:36px;border-radius:8px;object-fit:cover">`
      : `<div style="width:36px;height:36px;border-radius:8px;background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:18px">📦</div>`;
    const pct = DB.barang.reduce((s,x)=>s+(x.stok||0),0);
    const distPct = pct > 0 ? Math.round((b.stok/pct)*100) : 0;
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
            <div style="width:${distPct}%;background:var(--primary-light);height:100%;border-radius:20px"></div>
          </div>
          <span style="font-size:12px;font-weight:700;color:var(--text-muted);width:35px">${distPct}%</span>
        </div>
      </td>
      <td><span class="badge ${b.stok<=b.minStok?'badge-red':'badge-green'}">${b.stok<=b.minStok?'⚠️ Kritis':'✅ Aman'}</span></td>
    </tr>`;
  }).join('');
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
      <td>${m.piutang>0?'<span class="badge badge-amber">Rp '+m.piutang.toLocaleString('id-ID')+'</span>':'-'}</td>
      <td><span class="badge badge-green">${m.status||'Aktif'}</span></td>
      <td><div style="display:flex;gap:6px">
        <button class="btn btn-outline btn-icon btn-sm" onclick="chatMitra('${m.nama}')" title="Chat"><i class="fas fa-comment"></i></button>
        <button class="btn btn-danger btn-icon btn-sm" onclick="hapusMitra(${i})" title="Hapus"><i class="fas fa-trash"></i></button>
      </div></td>
    </tr>`).join('');
}

function renderPengeluaran() {
  const tbody = document.getElementById('tbody-pengeluaran');
  if (!tbody) return;
  tbody.innerHTML = DB.pengeluaran.map(p => `
    <tr>
      <td>${p.tgl}</td><td>${p.ket}</td>
      <td><span class="badge badge-purple">${p.kat}</span></td>
      <td style="color:var(--danger);font-weight:700">Rp ${(p.jml||0).toLocaleString('id-ID')}</td>
    </tr>`).join('');
}

function renderPembelian() {
  const tbody = document.getElementById('tbody-pembelian');
  if (!tbody) return;
  tbody.innerHTML = DB.pembelian.map(p => `
    <tr>
      <td>${p.tgl}</td><td>${p.pemasok}</td><td>${p.barang}</td>
      <td style="font-weight:700">Rp ${(p.total||0).toLocaleString('id-ID')}</td>
    </tr>`).join('');
}

function renderAssets() {
  const el = document.getElementById('asset-list');
  if (!el) return;
  const totalStokValue = DB.barang.reduce((s,b)=>(s+(b.hbeli||0)*(b.stok||0)),0);
  const totalPiutang   = DB.mitra.reduce((s,m)=>(s+(m.piutang||0)),0);
  const totalPembelian = DB.pembelian.reduce((s,p)=>(s+(p.total||0)),0);
  el.innerHTML = `
    <div class="pl-row"><strong>Nilai Stok Barang</strong><span>Rp ${totalStokValue.toLocaleString('id-ID')}</span></div>
    <div class="pl-row"><strong>Total Piutang Mitra</strong><span style="color:var(--accent)">Rp ${totalPiutang.toLocaleString('id-ID')}</span></div>
    <div class="pl-row"><strong>Total Pembelian</strong><span style="color:var(--danger)">Rp ${totalPembelian.toLocaleString('id-ID')}</span></div>
    <div class="pl-row total"><strong>Total Aset Operasional</strong><strong>Rp ${(totalStokValue+totalPiutang).toLocaleString('id-ID')}</strong></div>`;
}

// ───────────────────── STOK KRITIS ──────────────────────────────
function renderStokKritis() {
  const list = document.getElementById('stok-kritis-list');
  if (!list) return;
  const kritis = DB.barang.filter(b => b.stok <= b.minStok);
  list.innerHTML = kritis.map(b => `
    <div class="act-item">
      <div class="act-dot" style="background:rgba(239,68,68,0.1);color:var(--danger)"><i class="fas fa-box"></i></div>
      <div class="act-text"><p style="font-weight:700">${b.nama}</p>
        <span class="stock-low">Sisa ${b.stok} ${b.satuan} ⚠️ Min: ${b.minStok}</span></div>
    </div>`).join('') || '<div style="padding:20px;text-align:center;color:var(--text-muted)">✅ Semua stok aman</div>';
}

// ───────────────────── CHARTS ───────────────────────────────────
function buildMainChart() {
  // Agregasi penjualan 6 bulan terakhir dari invoice
  const months = [];
  for (let i=5;i>=0;i--) {
    const d = new Date(); d.setMonth(d.getMonth()-i);
    months.push({ key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`, label:d.toLocaleString('id-ID',{month:'short'}) });
  }
  const data = months.map(m => {
    const total = DB.invoice.filter(inv => inv.tgl?.startsWith(m.key)).reduce((s,inv)=>s+(inv.total||0),0);
    return Math.round(total/1000000) || 0;
  });
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
  // Trend 2024–2035 berdasarkan invoice nyata
  const yearSel = document.getElementById('laporan-year-sel');
  const year = yearSel ? parseInt(yearSel.value) : new Date().getFullYear();
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
  const data = months.map((_,mi) => {
    const key = `${year}-${String(mi+1).padStart(2,'0')}`;
    return DB.invoice.filter(inv => inv.tgl?.startsWith(key)).reduce((s,inv)=>s+(inv.total||0),0);
  }).map(v => Math.round(v/1000000));
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
  if (totalEl) totalEl.textContent = 'Total ' + year + ': Rp ' + totalYear.toLocaleString('id-ID') + ' Jt';
}

// ───────────────────── SALES DASHBOARD ──────────────────────────
function buildSalesDashboard() {
  const salesName = currentUser?.name || '';
  const allInv = DB.invoice.filter(inv => inv.salesName === salesName || currentUser?.role !== 'sales');
  const myInv  = currentUser?.role === 'sales'
    ? DB.invoice.filter(inv => inv.salesName === salesName)
    : DB.invoice;

  const totalSales = myInv.reduce((s,inv)=>(s+(inv.total||0)),0);
  const lunas      = myInv.filter(i=>i.status==='Lunas').reduce((s,i)=>s+(i.total||0),0);
  const pending    = myInv.filter(i=>i.status!=='Lunas').reduce((s,i)=>s+(i.total||0),0);
  const bonus      = Math.round(lunas * ((appConfig?.bonusRate||2)/100));

  const el = document.getElementById('sales-kpi-area');
  if (!el) return;
  el.innerHTML = `
    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
      <div class="stat-card blue"><div class="stat-glow"></div><div class="stat-icon"><i class="fas fa-file-invoice-dollar"></i></div>
        <h3>${myInv.length}</h3><p>Total Invoice</p></div>
      <div class="stat-card green"><div class="stat-glow"></div><div class="stat-icon"><i class="fas fa-check-circle"></i></div>
        <h3>Rp ${Math.round(lunas/1000000)}Jt</h3><p>Sudah Lunas</p></div>
      <div class="stat-card amber"><div class="stat-glow"></div><div class="stat-icon"><i class="fas fa-clock"></i></div>
        <h3>Rp ${Math.round(pending/1000000)}Jt</h3><p>Belum Lunas</p></div>
      <div class="stat-card red" style="background:linear-gradient(135deg,rgba(16,185,129,0.08),rgba(16,185,129,0.04))"><div class="stat-glow" style="background:var(--accent2)"></div>
        <div class="stat-icon" style="background:rgba(16,185,129,0.12);color:var(--accent2)"><i class="fas fa-gift"></i></div>
        <h3 style="color:var(--accent2)">Rp ${bonus.toLocaleString('id-ID')}</h3><p>Estimasi Bonus (${appConfig?.bonusRate||2}%)</p></div>
    </div>`;

  // Chart penjualan per bulan untuk sales ini
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
  const year = new Date().getFullYear();
  const chartData = months.map((_,mi) => {
    const key = `${year}-${String(mi+1).padStart(2,'0')}`;
    return myInv.filter(i=>i.tgl?.startsWith(key)).reduce((s,i)=>s+(i.total||0),0);
  }).map(v => Math.round(v/1000000));
  const max = Math.max(...chartData,1);

  const chartEl = document.getElementById('sales-chart');
  if (!chartEl) return;
  chartEl.innerHTML = chartData.map((v,i) => `
    <div class="bar-wrap">
      <div class="bar" style="height:${Math.max(Math.round((v/max)*100),2)}%">
        <div class="bar-tooltip">Rp ${v} Jt</div>
      </div>
      <div class="bar-label">${months[i]}</div>
    </div>`).join('');

  // Recent invoices
  const tableEl = document.getElementById('sales-invoice-table');
  if (!tableEl) return;
  tableEl.innerHTML = myInv.slice(0,10).map(inv => `
    <tr>
      <td><strong style="color:var(--primary-light)">${inv.no}</strong></td>
      <td>${inv.tgl}</td>
      <td>${inv.mitra}</td>
      <td>Rp ${(inv.total||0).toLocaleString('id-ID')}</td>
      <td><span class="badge ${inv.status==='Lunas'?'badge-green':inv.status==='Jatuh Tempo'?'badge-red':'badge-amber'}">${inv.status}</span></td>
      <td>Rp ${Math.round((inv.total||0)*((appConfig?.bonusRate||2)/100)).toLocaleString('id-ID')}</td>
    </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-muted)">Belum ada invoice</td></tr>';
}

// ───────────────────── STOCK OPNAME ─────────────────────────────
function renderOpname() {
  const el = document.getElementById('opname-table-body');
  if (!el) return;
  const date = new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
  document.getElementById('opname-date').textContent = 'Tanggal: ' + date;
  el.innerHTML = DB.barang.map((b,i) => `
    <tr>
      <td><code>${b.kode}</code></td>
      <td><strong>${b.nama}</strong></td>
      <td>${b.satuan}</td>
      <td style="font-weight:700">${b.stok}</td>
      <td><input type="number" id="op-act-${i}" value="${b.stok}" min="0" style="width:80px;border:1.5px solid var(--border);border-radius:8px;padding:6px;text-align:center" oninput="updateOpnameDiff(${i})"></td>
      <td id="op-diff-${i}" style="font-weight:700">0</td>
      <td><span class="badge ${b.stok<=b.minStok?'badge-red':'badge-green'}">${b.stok<=b.minStok?'⚠️ Kritis':'✅ Aman'}</span></td>
      <td><input type="text" id="op-note-${i}" placeholder="Catatan..." style="width:120px;border:1.5px solid var(--border);border-radius:8px;padding:6px;font-size:12px"></td>
    </tr>`).join('');
}

function updateOpnameDiff(i) {
  const sistem  = DB.barang[i].stok || 0;
  const aktual  = parseInt(document.getElementById(`op-act-${i}`)?.value)||0;
  const selisih = aktual - sistem;
  const el = document.getElementById(`op-diff-${i}`);
  if (!el) return;
  el.textContent = (selisih > 0 ? '+' : '') + selisih;
  el.style.color = selisih < 0 ? 'var(--danger)' : selisih > 0 ? 'var(--accent2)' : 'var(--text-muted)';
}

async function generateOpname() {
  const rows = DB.barang.map((b,i) => {
    const aktual = parseInt(document.getElementById(`op-act-${i}`)?.value)||b.stok;
    const note   = document.getElementById(`op-note-${i}`)?.value||'';
    return `${b.kode},${b.nama},${b.satuan},${b.stok},${aktual},${aktual-b.stok},"${note}"`;
  });
  const csv = ['Kode,Nama,Satuan,Stok Sistem,Stok Aktual,Selisih,Catatan', ...rows].join('\n');
  const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `StockOpname_BMS_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  addLog('export','Stock Opname digenerate');
  showToast('📊 Laporan Stock Opname berhasil diunduh!');
}

// ───────────────────── SETTINGS PAGE ────────────────────────────
function renderSettings() {
  // Company profile
  const c = appConfig?.company || {};
  const safe = (id,v) => { const el=document.getElementById(id); if(el) el.value=v||''; };
  safe('set-company-nama',  c.nama);
  safe('set-company-alamat',c.alamat);
  safe('set-company-telp',  c.telp);
  safe('set-company-email', c.email);
  safe('set-company-npwp',  c.npwp);
  safe('set-company-rek',   c.rekening);
  safe('set-bonus-rate', appConfig?.bonusRate||2);
  // Load kategori dari appConfig cloud jika ada
  if (appConfig?.kategori?.length) {
    localStorage.setItem('bms_kategori', JSON.stringify(appConfig.kategori));
  }
  renderKategoriSettings();
  updateKategoriDropdowns();
  // Render users list
  renderUsersList();
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
      <span class="badge badge-amber">Admin</span>
      <strong>Admin Keuangan</strong>
      <span style="color:var(--text-muted);font-size:12px">${appConfig.roleEmails?.admin||'admin@bms-syafaah.id'}</span>
      <span class="badge badge-green">Aktif</span>
    </div>
    ${sales.map((s,i)=>`
    <div class="settings-user-row">
      <span class="badge badge-green">Sales</span>
      <strong>${s.name}</strong>
      <span style="color:var(--text-muted);font-size:12px">${s.email}</span>
      <button class="btn btn-danger btn-sm" onclick="hapusUserSales(${i})"><i class="fas fa-trash"></i></button>
    </div>`).join('')}`;
}

// ───────────────────── KATEGORI MANAGEMENT ─────────────────────
const DEFAULT_KATEGORI = ['Beras & Tepung','Minyak & Lemak','Gula & Pemanis','Bumbu & Rempah','Minuman','Snack & Camilan','Lainnya'];

function getKategoriList() {
  try {
    const saved = localStorage.getItem('bms_kategori');
    return saved ? JSON.parse(saved) : [...DEFAULT_KATEGORI];
  } catch(e) { return [...DEFAULT_KATEGORI]; }
}

function saveKategoriList(list) {
  localStorage.setItem('bms_kategori', JSON.stringify(list));
  // Sinkronisasi ke Firestore appConfig jika online
  if (appConfig) {
    appConfig.kategori = list;
    window.FS?.setDoc(window.FS.docRef('test','appConfig'), appConfig).catch(()=>{});
  }
}

function renderKategoriSettings() {
  const el = document.getElementById('settings-kategori-list');
  if (!el) return;
  const list = getKategoriList();
  el.innerHTML = list.map((k,i) => `
    <div class="settings-user-row" style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--bg);border-radius:10px;margin-bottom:8px">
      <span class="badge badge-blue" style="flex-shrink:0"><i class="fas fa-tag"></i></span>
      <strong style="flex:1;font-size:13.5px">${k}</strong>
      ${DEFAULT_KATEGORI.includes(k)
        ? '<span style="font-size:11px;color:var(--text-muted)">Default</span>'
        : `<button class="btn btn-danger btn-sm" onclick="hapusKategori(${i})" style="padding:4px 10px"><i class="fas fa-trash"></i></button>`
      }
    </div>`).join('');
}

function tambahKategori() {
  const input = document.getElementById('new-kategori-nama');
  const nama  = input?.value.trim();
  if (!nama) { showToast('Isi nama kategori!','error'); return; }
  const list = getKategoriList();
  if (list.some(k=>k.toLowerCase()===nama.toLowerCase())) { showToast('Kategori sudah ada!','warning'); return; }
  list.push(nama);
  saveKategoriList(list);
  if (input) input.value='';
  renderKategoriSettings();
  updateKategoriDropdowns();
  addLog('setting','Tambah kategori: '+nama);
  showToast('✅ Kategori "'+nama+'" ditambahkan!');
}

function hapusKategori(i) {
  const list = getKategoriList();
  const nama = list[i];
  if (!confirm(`Hapus kategori "${nama}"?`)) return;
  list.splice(i,1);
  saveKategoriList(list);
  renderKategoriSettings();
  updateKategoriDropdowns();
  addLog('setting','Hapus kategori: '+nama);
  showToast('🗑️ Kategori dihapus!');
}

function updateKategoriDropdowns() {
  const list = getKategoriList();
  const opts = list.map(k=>`<option>${k}</option>`).join('');
  // Update semua dropdown kategori di form
  ['b-kategori','eb-kategori'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { const cur=el.value; el.innerHTML=opts; if(cur) el.value=cur; }
  });
}

async function saveCompanyProfile() {
  const g = (id) => document.getElementById(id)?.value.trim()||'';
  const company = {
    nama: g('set-company-nama'), alamat: g('set-company-alamat'),
    telp: g('set-company-telp'), email: g('set-company-email'),
    npwp: g('set-company-npwp'), rekening: g('set-company-rek'),
  };
  const bonusRate = parseInt(document.getElementById('set-bonus-rate')?.value)||2;
  if (!appConfig) appConfig = {};
  appConfig.company   = company;
  appConfig.bonusRate = bonusRate;
  appConfig.kategori  = getKategoriList();
  try {
    await window.FS.setDoc(window.FS.docRef('test','appConfig'), appConfig);
    showToast('✅ Profil perusahaan tersimpan!');
    addLog('setting','Update profil perusahaan');
  } catch(e) { showToast('❌ Gagal simpan: '+e.message, 'error'); }
}

async function tambahUserSales() {
  const name  = document.getElementById('new-sales-name')?.value.trim();
  const email = document.getElementById('new-sales-email')?.value.trim();
  const pass  = document.getElementById('new-sales-pass')?.value.trim();
  if (!name||!email||!pass) { showToast('Lengkapi semua field!', 'error'); return; }
  try {
    showToast('⏳ Membuat akun...', 'info');
    const uid = await window.FA.createUser(email, pass);
    // Save profile ke Firestore users/{uid}
    const profile = {
      role:'sales', name, label:'Tim Sales', avatar:name[0].toUpperCase(),
      menus:['dashboard','stok','invoice','mitra','sales_dash'], email, uid
    };
    await window.FS.setDoc(window.FS.docRef('users', uid), profile);
    // Add to appConfig salesUsers
    if (!appConfig) appConfig = {};
    if (!appConfig.salesUsers) appConfig.salesUsers = [];
    const id = 's' + Date.now();
    appConfig.salesUsers.push({ id, name, email, avatar:name[0].toUpperCase() });
    await window.FS.setDoc(window.FS.docRef('test','appConfig'), appConfig);
    renderUsersList(); renderSalesDropdown();
    ['new-sales-name','new-sales-email','new-sales-pass'].forEach(id=>{ const el=document.getElementById(id); if(el)el.value=''; });
    showToast('✅ Akun sales ' + name + ' berhasil dibuat!');
    addLog('setting','Tambah akun sales: '+name);
  } catch(e) { showToast('❌ Gagal buat akun: '+e.message, 'error'); }
}

async function hapusUserSales(i) {
  const s = appConfig?.salesUsers?.[i];
  if (!s) return;
  if (!confirm(`Hapus akun sales ${s.name}?`)) return;
  appConfig.salesUsers.splice(i,1);
  await window.FS.setDoc(window.FS.docRef('test','appConfig'), appConfig).catch(()=>{});
  renderUsersList(); renderSalesDropdown();
  showToast('🗑️ Akun sales dihapus dari konfigurasi');
  addLog('setting','Hapus akun sales: '+s.name);
}

// ───────────────────── CLEAR DATA FUNCTIONS ─────────────────────
async function clearCollection(colName, label) {
  if (!confirm(`Hapus SEMUA data ${label} dari cloud? Tindakan PERMANEN!`)) return;
  try {
    const snap = await window.FS.getDocs(window.FS.col(colName));
    const batch = window.FS.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    DB[colName] = [];
    renderAll();
    showToast(`🗑️ Data ${label} berhasil dihapus!`);
    addLog('setting', `Clear data: ${label}`);
  } catch(e) { showToast('❌ Gagal hapus: '+e.message,'error'); }
}

function clearInvoice()    { clearCollection('invoice','Invoice'); }
function clearKeuangan()   { clearCollection('pengeluaran','Pengeluaran'); clearCollection('pembelian','Pembelian'); }
function clearDataBarang() { clearCollection('barang','Barang'); }

// ───────────────────── BACKUP / RESTORE ─────────────────────────
async function backupData() {
  const backup = {
    exportedAt: new Date().toISOString(),
    version: '3.0',
    barang: DB.barang, invoice: DB.invoice, mitra: DB.mitra,
    pengeluaran: DB.pengeluaran, pembelian: DB.pembelian,
  };
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json],{type:'application/json'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `BMS_Backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  addLog('export','Backup data JSON');
  showToast('💾 Backup berhasil diunduh!');
}

async function restoreData(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!data.barang) { showToast('❌ File backup tidak valid!','error'); return; }
    if (!confirm(`Restore backup dari ${data.exportedAt}?\nSemua data saat ini akan DIGANTI!`)) return;
    showToast('⏳ Memulai restore...','info');
    for (const col of ['barang','invoice','mitra','pengeluaran','pembelian']) {
      if (!data[col]) continue;
      const snap = await window.FS.getDocs(window.FS.col(col));
      const batch = window.FS.batch();
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      for (const item of data[col]) {
        const { _id, _ts, ...clean } = item;
        await window.FS.addDoc(window.FS.col(col), clean);
      }
    }
    showToast('✅ Restore selesai! Halaman akan refresh...');
    addLog('setting','Restore backup data');
    setTimeout(()=>location.reload(), 2000);
  } catch(e) { showToast('❌ Gagal restore: '+e.message,'error'); }
}

// ───────────────────── NOTIFICATIONS ────────────────────────────
function renderNotifications() {
  const list  = document.getElementById('notif-list');
  if (!list) return;
  const unread = DB.notifikasi.filter(n=>!n.baca).length;
  const dot = document.getElementById('notif-dot');
  if (dot) dot.style.display = unread ? '' : 'none';
  const iM = {danger:'fa-exclamation-circle',warning:'fa-clock',success:'fa-check-circle',info:'fa-info-circle'};
  const cM = {danger:'rgba(239,68,68,0.1)',warning:'rgba(245,158,11,0.1)',success:'rgba(16,185,129,0.1)',info:'rgba(37,99,168,0.1)'};
  const fM = {danger:'var(--danger)',warning:'var(--accent)',success:'var(--accent2)',info:'var(--primary-light)'};
  list.innerHTML = DB.notifikasi.map((n,i) => `
    <div class="notif-item" onclick="bacaNotif(${i})">
      <div class="notif-icon" style="background:${cM[n.tipe]};color:${fM[n.tipe]}"><i class="fas ${iM[n.tipe]}"></i></div>
      <div style="flex:1"><p>${n.pesan}</p><span>${n.waktu}</span></div>
      ${!n.baca?'<div class="unread-dot"></div>':''}
    </div>`).join('');
  // Auto-notif stok kritis
  DB.barang.filter(b=>b.stok<=b.minStok).forEach(b=>{
    const exists = DB.notifikasi.some(n=>n.pesan.includes(b.nama)&&n.baca===false);
    if (!exists) {
      DB.notifikasi.unshift({ id:Date.now(), pesan:`⚠️ Stok ${b.nama} kritis — sisa ${b.stok} ${b.satuan}`, waktu:'Baru saja', tipe:'danger', baca:false });
    }
  });
}

function bacaNotif(i)  { DB.notifikasi[i].baca=true; renderNotifications(); }
function markAllRead() { DB.notifikasi.forEach(n=>n.baca=true); renderNotifications(); showToast('✅ Semua notifikasi dibaca'); }
function toggleNotif() { document.getElementById('notif-panel').classList.toggle('open'); }
function toggleSidebar(){ document.getElementById('sidebar').classList.toggle('mobile-open'); }

// ───────────────────── SYNC ──────────────────────────────────────
async function syncData() {
  const icon = document.getElementById('sync-icon');
  if (icon) icon.style.animation = 'spin 1s linear infinite';
  showToast('🔄 Sinkronisasi data...','info');
  try { await loadAllFromFirestore(); if(icon) icon.style.animation=''; showToast('☁️ Data tersinkronkan!'); }
  catch(e) { if(icon) icon.style.animation=''; showToast('❌ Gagal sinkronisasi','error'); }
}

// ───────────────────── MODAL ─────────────────────────────────────
function openModal(id)  { const el=document.getElementById(id); if(el){el.classList.add('open'); document.body.style.overflow='hidden';} }
function closeModal(id) { const el=document.getElementById(id); if(el){el.classList.remove('open'); document.body.style.overflow='';} }
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) { e.target.classList.remove('open'); document.body.style.overflow=''; }
  if (!e.target.closest('.notif-panel')&&!e.target.closest('.topbar-btn')) document.getElementById('notif-panel')?.classList.remove('open');
});

// ───────────────────── BARANG CRUD ──────────────────────────────
async function simpanBarang() {
  const nama = document.getElementById('b-nama')?.value.trim();
  const kode = document.getElementById('b-kode')?.value.trim();
  if (!nama||!kode) { showToast('Nama dan kode wajib diisi!','error'); return; }
  const fotoEl  = document.getElementById('foto-preview');
  const fotoArr = fotoEl ? Array.from(fotoEl.querySelectorAll('img')).map(img=>img.src) : [];
  const data = {
    kode, nama,
    kategori: document.getElementById('b-kategori')?.value||'Lainnya',
    satuan  : document.getElementById('b-satuan')?.value||'Pcs',
    stok    : parseInt(document.getElementById('b-stok')?.value)||0,
    hbeli   : parseInt(document.getElementById('b-hbeli')?.value)||0,
    hjual   : parseInt(document.getElementById('b-hjual')?.value)||0,
    minStok : parseInt(document.getElementById('b-minstock')?.value)||20,
    lokasi  : document.getElementById('b-lokasi')?.value||'',
    masuk   : parseInt(document.getElementById('b-stok')?.value)||0,
    keluar  : 0, foto: fotoArr,
  };
  try {
    await window.FS.addDoc(window.FS.col('barang'), data);
    addLog('tambah','Tambah barang: '+nama);
    showToast('✅ Barang tersimpan ke cloud!');
  } catch(e) { DB.barang.unshift(data); renderBarang(); showToast('✅ Barang ditambahkan (offline)'); }
  fillDropdowns(); closeModal('modal-barang');
  ['b-kode','b-nama','b-stok','b-hbeli','b-hjual','b-desc'].forEach(id=>{ const el=document.getElementById(id); if(el)el.value=''; });
}

function editBarang(i) {
  const b = DB.barang[i];
  if (!b) return;
  // Isi form modal edit
  const safe = (id,v) => { const el=document.getElementById(id); if(el) el.value=v||''; };
  safe('eb-idx',   i);
  safe('eb-kode',  b.kode);
  safe('eb-nama',  b.nama);
  safe('eb-hbeli', b.hbeli||0);
  safe('eb-hjual', b.hjual||0);
  safe('eb-stok',  b.stok||0);
  safe('eb-minstock', b.minStok||20);
  safe('eb-lokasi', b.lokasi||'');
  // Kategori & satuan
  const katEl = document.getElementById('eb-kategori');
  if (katEl) {
    // Isi options dari kategori yg ada + kategori barang ini
    const cats = getKategoriList();
    katEl.innerHTML = cats.map(c => `<option${c===b.kategori?' selected':''}>${c}</option>`).join('');
  }
  const satEl = document.getElementById('eb-satuan');
  if (satEl) satEl.value = b.satuan||'Pcs';
  // Preview foto existing
  const prevEl = document.getElementById('eb-foto-preview');
  if (prevEl) {
    prevEl.innerHTML = (b.foto||[]).map(src =>
      `<img src="${src}" style="width:64px;height:64px;object-fit:cover;border-radius:10px;border:2px solid var(--border)">`
    ).join('');
  }
  openModal('modal-edit-barang');
}

async function simpanEditBarang() {
  const i    = parseInt(document.getElementById('eb-idx')?.value);
  const b    = DB.barang[i];
  if (!b) return;
  const nama = document.getElementById('eb-nama')?.value.trim();
  const kode = document.getElementById('eb-kode')?.value.trim();
  if (!nama||!kode) { showToast('Nama dan kode wajib diisi!','error'); return; }
  // Ambil foto baru jika ada, jika tidak pakai foto lama
  const prevEl  = document.getElementById('eb-foto-preview');
  const newFoto = document.getElementById('eb-foto-input');
  let fotoArr   = b.foto || [];
  if (newFoto?.files?.length) {
    const reads = Array.from(newFoto.files).slice(0,4).map(file => new Promise(res=>{
      const r = new FileReader(); r.onload=e=>res(e.target.result); r.readAsDataURL(file);
    }));
    fotoArr = await Promise.all(reads);
  }
  const updated = {
    kode, nama,
    kategori : document.getElementById('eb-kategori')?.value || b.kategori,
    satuan   : document.getElementById('eb-satuan')?.value   || b.satuan,
    hbeli    : parseInt(document.getElementById('eb-hbeli')?.value)||0,
    hjual    : parseInt(document.getElementById('eb-hjual')?.value)||0,
    stok     : parseInt(document.getElementById('eb-stok')?.value)||0,
    minStok  : parseInt(document.getElementById('eb-minstock')?.value)||20,
    lokasi   : document.getElementById('eb-lokasi')?.value||'',
    masuk    : b.masuk||0,
    keluar   : b.keluar||0,
    foto     : fotoArr,
  };
  try {
    if (b._id) {
      await window.FS.updateDoc(window.FS.docRef('barang', b._id), updated);
    } else {
      DB.barang[i] = { ...b, ...updated };
      renderBarang(); renderStok(); fillDropdowns();
    }
    addLog('edit', `Edit barang: ${nama}`);
    showToast('✅ Barang berhasil diupdate!');
  } catch(e) {
    DB.barang[i] = { ...b, ...updated };
    renderBarang(); renderStok(); fillDropdowns();
    showToast('✅ Barang diupdate (offline)');
  }
  closeModal('modal-edit-barang');
}

async function hapusBarang(i) {
  const b = DB.barang[i];
  if (!confirm(`Hapus barang "${b.nama}"?`)) return;
  try {
    if (b._id) await window.FS.deleteDoc(window.FS.docRef('barang',b._id));
    else { DB.barang.splice(i,1); renderBarang(); }
    addLog('hapus','Hapus barang: '+b.nama);
    showToast('🗑️ Barang dihapus!');
  } catch(e) { DB.barang.splice(i,1); renderBarang(); showToast('🗑️ Barang dihapus (offline)'); }
}

function previewFoto(event) {
  const preview = document.getElementById('foto-preview');
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

// Toggle field jatuh tempo berdasarkan metode bayar
function toggleTempoField(metode) {
  const row = document.getElementById('tempo-row');
  if (row) row.style.display = metode === 'Tempo' ? 'flex' : 'none';
}

// Render ringkasan KPI di halaman transaksi
function renderInvoiceStats() {
  const total   = DB.invoice.length;
  const lunas   = DB.invoice.filter(i=>i.status==='Lunas').reduce((s,i)=>s+(i.total||0),0);
  const belum   = DB.invoice.filter(i=>i.status!=='Lunas').reduce((s,i)=>s+(i.total||0),0);
  const cash    = DB.invoice.filter(i=>i.metodeBayar==='Tunai'||i.metodeBayar==='Transfer').reduce((s,i)=>s+(i.total||0),0);
  const safe = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  safe('trx-total-count', total);
  safe('trx-lunas',  'Rp '+Math.round(lunas/1000)+'rb');
  safe('trx-belum',  'Rp '+Math.round(belum/1000)+'rb');
  safe('trx-cash',   'Rp '+Math.round(cash/1000)+'rb');
}

// ───────────────────── INVOICE CRUD ─────────────────────────────
function addInvItem() {
  const tbody = document.getElementById('inv-items');
  const idx   = invItems.length;
  invItems.push({ nama:'', qty:1, satuan:'', harga:0, total:0 });
  const opts = DB.barang.map(b=>`<option data-harga="${b.hjual}" data-satuan="${b.satuan}" data-stok="${b.stok}" ${b.stok<=0?'style="color:var(--danger)"':''}>
    ${b.nama}${b.stok<=0?' (Habis)':' (Stok: '+b.stok+')'}
  </option>`).join('');
  const row  = document.createElement('tr');
  row.innerHTML = `
    <td><select style="border:1px solid var(--border);border-radius:8px;padding:6px;font-size:12.5px;width:200px" onchange="updateItemBarang(${idx},this)">
      <option>Pilih Barang...</option>${opts}</select></td>
    <td><input type="number" value="1" min="1" style="width:65px;border:1px solid var(--border);border-radius:8px;padding:6px;text-align:center" oninput="updateItemQty(${idx},this)"></td>
    <td id="inv-sat-${idx}" style="color:var(--text-muted)">-</td>
    <td id="inv-hp-${idx}"  style="color:var(--text-muted)">Rp 0</td>
    <td id="inv-stok-${idx}" style="font-size:11.5px;color:var(--text-muted)">-</td>
    <td id="inv-tot-${idx}" style="font-weight:700">Rp 0</td>
    <td><button class="btn btn-danger btn-icon btn-sm" onclick="removeInvItem(${idx},this.closest('tr'))"><i class="fas fa-trash"></i></button></td>`;
  tbody.appendChild(row);
  hitungTotal();
}

function updateItemBarang(idx, sel) {
  const opt    = sel.options[sel.selectedIndex];
  const harga  = parseInt(opt.dataset.harga)||0;
  const satuan = opt.dataset.satuan||'-';
  const stok   = parseInt(opt.dataset.stok)||0;
  // Nama bersih tanpa "(Stok:...)"
  const nama   = opt.text.trim().replace(/\s*\(.*\)$/, '').trim();
  invItems[idx] = { ...invItems[idx], nama, harga, satuan, stok, total:harga*(invItems[idx].qty||1) };
  document.getElementById(`inv-sat-${idx}`).textContent  = satuan;
  document.getElementById(`inv-hp-${idx}`).textContent   = 'Rp '+harga.toLocaleString('id-ID');
  const stokEl = document.getElementById(`inv-stok-${idx}`);
  if (stokEl) {
    stokEl.innerHTML = stok <= 0
      ? `<span style="color:var(--danger);font-weight:700">⛔ Habis</span>`
      : `<span style="color:${stok<=10?'var(--accent)':'var(--accent2)'}">Sisa: ${stok}</span>`;
  }
  document.getElementById(`inv-tot-${idx}`).textContent  = 'Rp '+invItems[idx].total.toLocaleString('id-ID');
  hitungTotal();
}

function updateItemQty(idx, input) {
  const item  = invItems[idx];
  const qty   = parseInt(input.value)||0;
  const stok  = item.stok ?? 9999;
  // Cegah input qty > stok
  if (qty > stok) {
    input.value = stok;
    showToast(`⚠️ Maks qty: ${stok} (stok tersedia)`, 'warning');
    invItems[idx].qty = stok;
  } else {
    invItems[idx].qty = qty;
  }
  invItems[idx].total = invItems[idx].harga * invItems[idx].qty;
  const el = document.getElementById(`inv-tot-${idx}`);
  if (el) el.textContent = 'Rp '+invItems[idx].total.toLocaleString('id-ID');
  hitungTotal();
}

function removeInvItem(idx, row) { invItems[idx]=null; row.remove(); hitungTotal(); }

function hitungTotal() {
  const items    = invItems.filter(Boolean);
  const subtotal = items.reduce((s,i)=>s+(i.total||0),0);
  const diskon   = parseFloat(document.getElementById('inv-diskon')?.value)||0;
  const afterD   = subtotal*(1-diskon/100);
  const ppn      = afterD*0.11;
  const total    = afterD+ppn;
  const safe = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  safe('inv-subtotal','Rp '+subtotal.toLocaleString('id-ID'));
  safe('inv-ppn',     'Rp '+Math.round(ppn).toLocaleString('id-ID'));
  safe('inv-total',   'Rp '+Math.round(total).toLocaleString('id-ID'));
}

async function hapusTransaksi(i) {
  const inv = DB.invoice[i];
  if (!inv) return;
  if (!confirm(`Hapus transaksi ${inv.no}?`)) return;
  try {
    if (inv._id) await window.FS.deleteDoc(window.FS.docRef('invoice', inv._id));
    else { DB.invoice.splice(i,1); renderInvoice(); }
    addLog('hapus','Hapus transaksi: '+inv.no);
    showToast('🗑️ Transaksi dihapus!');
  } catch(e) { DB.invoice.splice(i,1); renderInvoice(); showToast('🗑️ Transaksi dihapus (offline)'); }
}

async function simpanInvoice() {
  const mitra = document.getElementById('inv-mitra')?.value;
  const items = invItems.filter(Boolean);
  if (!mitra) { showToast('Pilih mitra terlebih dahulu!','error'); return; }
  if (items.length === 0) { showToast('Tambahkan minimal 1 item!','error'); return; }

  // BUG 4 FIX: Validasi stok sebelum simpan
  for (const item of items) {
    if (!item.nama) continue;
    const b = DB.barang.find(b => b.nama === item.nama);
    if (!b) { showToast(`❌ Barang "${item.nama}" tidak ditemukan!`,'error'); return; }
    if (b.stok < item.qty) {
      showToast(`❌ Stok ${item.nama} tidak mencukupi! Sisa: ${b.stok} ${b.satuan}`, 'error'); return;
    }
  }

  const subtotal   = items.reduce((s,i)=>s+i.total,0);
  const diskon     = parseFloat(document.getElementById('inv-diskon')?.value)||0;
  const afterD     = subtotal*(1-diskon/100);
  const ppn        = afterD*0.11;
  const total      = Math.round(afterD+ppn);
  const metodeBayar = document.getElementById('inv-bayar')?.value || 'Tempo';
  // Tunai / Transfer langsung Lunas, Tempo = Belum Lunas
  const status     = (metodeBayar==='Tunai'||metodeBayar==='Transfer') ? 'Lunas' : 'Belum Lunas';

  invCounter++;
  const data = {
    no          : document.getElementById('inv-no')?.value,
    tgl         : document.getElementById('inv-tgl')?.value,
    tempo       : metodeBayar==='Tempo' ? (document.getElementById('inv-tempo')?.value||'-') : '-',
    metodeBayar,
    mitra, total, status,
    items, diskon,
    salesName   : currentUser?.name||'',
    salesUid    : currentUser?.uid||'',
  };
  try {
    await window.FS.addDoc(window.FS.col('invoice'), data);
    // Kurangi stok otomatis setelah transaksi tersimpan
    for (const item of items) {
      if (!item.nama) continue;
      const b = DB.barang.find(b=>b.nama===item.nama);
      if (b && b._id) {
        const newStok   = Math.max(0, b.stok - item.qty);
        const newKeluar = (b.keluar||0) + item.qty;
        await window.FS.updateDoc(window.FS.docRef('barang',b._id),{stok:newStok,keluar:newKeluar}).catch(()=>{});
        b.stok   = newStok;
        b.keluar = newKeluar;
      }
    }
    addLog('invoice','Buat '+data.no+' ('+metodeBayar+') — Rp '+total.toLocaleString('id-ID'));
    showToast('✅ Transaksi tersimpan! Status: '+status);
  } catch(e) {
    // Offline: kurangi stok lokal
    for (const item of items) {
      if (!item.nama) continue;
      const b = DB.barang.find(b=>b.nama===item.nama);
      if (b) { b.stok=Math.max(0,b.stok-item.qty); b.keluar=(b.keluar||0)+item.qty; }
    }
    DB.invoice.unshift(data);
    renderInvoice(); renderBarang(); renderStok();
    showToast('✅ Transaksi dibuat (offline). Status: '+status);
  }
  closeModal('modal-invoice');
  invItems = [];
  document.getElementById('inv-items').innerHTML = '';
  document.getElementById('inv-no').value = `TRX-${new Date().getFullYear()}-${invCounter}`;
  hitungTotal();
  renderBarang(); renderStok(); renderStokKritis();
}

async function tandaiLunas(i) {
  const inv = DB.invoice[i];
  if (inv._id) {
    try { await window.FS.updateDoc(window.FS.docRef('invoice',inv._id),{status:'Lunas'}); }
    catch(e) { inv.status='Lunas'; renderInvoice(); }
  } else { inv.status='Lunas'; renderInvoice(); }
  addLog('invoice','Tandai lunas: '+inv.no);
  showToast('✅ Invoice ditandai Lunas!');
}

function previewInvoice() {
  const mitra = document.getElementById('inv-mitra')?.value||'Nama Mitra';
  const items = invItems.filter(Boolean);
  const subtotal = items.reduce((s,i)=>s+(i.total||0),0);
  const diskon   = parseFloat(document.getElementById('inv-diskon')?.value)||0;
  const afterD   = subtotal*(1-diskon/100);
  const ppn      = afterD*0.11;
  const total    = afterD+ppn;
  const co = appConfig?.company || {};
  document.getElementById('invoice-preview-content').innerHTML = `
    <div class="invoice-header">
      <div class="invoice-company">
        <h2>${co.nama||"Baitul Ma'mur Syafaah"}</h2>
        <p>${co.alamat||'Ruko Villa Bogor Indah 5, Bogor'}<br>
        Telp: ${co.telp||'(0251) 8xxx'} | WA: ${co.telp||'0812-xxxx'}<br>
        Email: ${co.email||'info@bms-syafaah.id'} | NPWP: ${co.npwp||'xx.xxx.xxx'}</p>
      </div>
      <div class="invoice-meta">
        <h1>INVOICE</h1>
        <p>No: <strong>${document.getElementById('inv-no')?.value}</strong></p>
        <p>Tanggal: ${document.getElementById('inv-tgl')?.value}</p>
        <p>Jatuh Tempo: ${document.getElementById('inv-tempo')?.value}</p>
      </div>
    </div>
    <div class="invoice-to"><h4>Kepada Yth.</h4><p><strong>${mitra}</strong></p></div>
    <table class="invoice-table">
      <thead><tr><th>No</th><th>Nama Barang</th><th>Satuan</th><th style="text-align:right">Qty</th><th style="text-align:right">Harga</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${items.map((item,i)=>`<tr><td>${i+1}</td><td>${item.nama}</td><td>${item.satuan}</td><td style="text-align:right">${item.qty}</td><td style="text-align:right">Rp ${item.harga.toLocaleString('id-ID')}</td><td style="text-align:right"><strong>Rp ${item.total.toLocaleString('id-ID')}</strong></td></tr>`).join('')}</tbody>
    </table>
    <div class="invoice-totals"><table>
      <tr><td>Subtotal</td><td style="text-align:right">Rp ${subtotal.toLocaleString('id-ID')}</td></tr>
      ${diskon>0?`<tr><td>Diskon (${diskon}%)</td><td style="text-align:right;color:var(--danger)">- Rp ${Math.round(subtotal*diskon/100).toLocaleString('id-ID')}</td></tr>`:''}
      <tr><td>PPN 11%</td><td style="text-align:right">Rp ${Math.round(ppn).toLocaleString('id-ID')}</td></tr>
      <tr class="total-row"><td>TOTAL</td><td style="text-align:right">Rp ${Math.round(total).toLocaleString('id-ID')}</td></tr>
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
      <div class="invoice-company"><h2>Baitul Ma'mur Syafaah</h2><p>Distributor Sembako · Bogor</p></div>
      <div class="invoice-meta"><h1>INVOICE</h1><p>No: <strong>${inv.no}</strong></p><p>Tgl: ${inv.tgl}</p></div>
    </div>
    <div class="invoice-to"><h4>Kepada</h4><p><strong>${inv.mitra}</strong></p></div>
    ${inv.items?`<table class="invoice-table"><thead><tr><th>No</th><th>Barang</th><th>Sat</th><th>Qty</th><th>Harga</th><th>Total</th></tr></thead><tbody>${inv.items.filter(Boolean).map((it,j)=>`<tr><td>${j+1}</td><td>${it.nama}</td><td>${it.satuan}</td><td>${it.qty}</td><td>Rp ${it.harga.toLocaleString('id-ID')}</td><td>Rp ${it.total.toLocaleString('id-ID')}</td></tr>`).join('')}</tbody></table>`:`<div style="padding:20px;text-align:center;color:var(--text-muted)">Rp ${inv.total.toLocaleString('id-ID')}</div>`}
    <div class="invoice-totals"><table><tr class="total-row"><td>TOTAL</td><td>Rp ${inv.total.toLocaleString('id-ID')}</td></tr></table></div>
    <div class="invoice-footer"><p>Status: <strong>${inv.status}</strong> · Jatuh Tempo: ${inv.tempo}</p></div>`;
  openModal('modal-preview-inv');
}

// ───────────────────── MITRA CRUD ───────────────────────────────
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
  try { await window.FS.addDoc(window.FS.col('mitra'),data); addLog('tambah','Tambah mitra: '+nama); showToast('✅ Mitra tersimpan ke cloud!'); }
  catch(e) { DB.mitra.push(data); renderMitra(); showToast('✅ Mitra ditambahkan (offline)'); }
  fillDropdowns(); closeModal('modal-mitra');
  const el=document.getElementById('m-nama'); if(el) el.value='';
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

// ───────────────────── STOK ─────────────────────────────────────
async function simpanStokMasuk() {
  const nama = document.getElementById('sm-barang')?.value;
  const qty  = parseInt(document.getElementById('sm-qty')?.value)||0;
  if (!nama||qty<=0) { showToast('Lengkapi data stok masuk!','error'); return; }
  const b = DB.barang.find(b=>b.nama===nama);
  if (!b) return;
  b.stok+=qty; b.masuk=(b.masuk||0)+qty;
  if (b._id) try { await window.FS.updateDoc(window.FS.docRef('barang',b._id),{stok:b.stok,masuk:b.masuk}); } catch(e){}
  renderStok(); renderBarang(); renderStokKritis();
  addLog('stok','Stok masuk '+nama+' +'+qty);
  closeModal('modal-stok-masuk');
  showToast(`✅ Stok ${nama} +${qty}!`);
}

async function simpanStokKeluar() {
  const nama = document.getElementById('sk-barang')?.value;
  const qty  = parseInt(document.getElementById('sk-qty')?.value)||0;
  if (!nama||qty<=0) { showToast('Lengkapi data stok keluar!','error'); return; }
  const b = DB.barang.find(b=>b.nama===nama);
  if (!b) return;
  if (b.stok<qty) { showToast('❌ Stok tidak mencukupi!','error'); return; }
  b.stok-=qty; b.keluar=(b.keluar||0)+qty;
  if (b._id) try { await window.FS.updateDoc(window.FS.docRef('barang',b._id),{stok:b.stok,keluar:b.keluar}); } catch(e){}
  renderStok(); renderBarang(); renderStokKritis();
  addLog('stok','Stok keluar '+nama+' -'+qty);
  closeModal('modal-stok-keluar');
  showToast(`✅ Stok keluar ${nama} -${qty}!`);
}

// ───────────────────── KEUANGAN ─────────────────────────────────
async function simpanPengeluaran() {
  const ket = document.getElementById('pe-ket')?.value.trim();
  const jml = parseInt(document.getElementById('pe-jml')?.value)||0;
  if (!ket||jml<=0) { showToast('Lengkapi data pengeluaran!','error'); return; }
  const data = { tgl:document.getElementById('pe-tgl')?.value, ket, jml, kat:document.getElementById('pe-kat')?.value||'Lain-lain' };
  try { await window.FS.addDoc(window.FS.col('pengeluaran'),data); addLog('tambah','Pengeluaran: '+ket); showToast('✅ Pengeluaran tersimpan!'); }
  catch(e) { DB.pengeluaran.unshift(data); renderPengeluaran(); showToast('✅ Pengeluaran dicatat (offline)'); }
  closeModal('modal-pengeluaran');
}

async function simpanPembelian() {
  const pemasok = document.getElementById('pb-pemasok')?.value;
  const barang  = document.getElementById('pb-barang')?.value;
  const qty     = parseInt(document.getElementById('pb-qty')?.value)||0;
  const harga   = parseInt(document.getElementById('pb-harga')?.value)||0;
  if (!pemasok||!barang||qty<=0) { showToast('Lengkapi data pembelian!','error'); return; }
  const data = { tgl:document.getElementById('pb-tgl')?.value, pemasok, barang, total:qty*harga };
  try { await window.FS.addDoc(window.FS.col('pembelian'),data); addLog('tambah','Pembelian: '+barang); showToast('✅ Pembelian tersimpan!'); }
  catch(e) { DB.pembelian.unshift(data); renderPembelian(); showToast('✅ Pembelian dicatat (offline)'); }
  closeModal('modal-pembelian');
}

// ───────────────────── CHAT ─────────────────────────────────────
function toggleChat() {
  chatOpen = !chatOpen;
  document.getElementById('chat-window').classList.toggle('open',chatOpen);
  if (chatOpen) { document.getElementById('chat-unread-badge').style.display='none'; document.getElementById('chat-input')?.focus(); }
}
function openChat() { chatOpen=true; document.getElementById('chat-window').classList.add('open'); document.getElementById('chat-unread-badge').style.display='none'; }

function switchChatTab(tab) {
  activeChatTab = tab;
  document.querySelectorAll('.chat-tab').forEach((t,i)=>t.classList.toggle('active',['messages','contacts','broadcast'][i]===tab));
  document.getElementById('chat-messages').style.display         = tab==='messages'?'flex':'none';
  document.getElementById('chat-contacts-panel').style.display   = tab==='contacts'?'block':'none';
  document.getElementById('chat-broadcast-panel').style.display  = tab==='broadcast'?'block':'none';
  document.getElementById('chat-input-area').style.display       = tab==='messages'?'flex':'none';
}

function renderChatMessages() {
  const body = document.getElementById('chat-messages');
  if (!body) return;
  const messages = DB.chat.length ? DB.chat : chatMessages;
  const myUid = window.FA?.currentUser()?.uid;
  body.innerHTML = messages.map(m => {
    const isMine = m.uid === myUid || m.mine;
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
  const colors = ['#1a3a5c','#f59e0b','#10b981','#7c3aed','#ef4444'];
  const onlineList = Object.values(onlineUsers);
  panel.innerHTML = onlineList.length
    ? onlineList.map((u,i)=>`
      <div class="chat-contact">
        <div class="contact-avatar" style="background:${colors[i%colors.length]}">${u.avatar||u.name[0]}</div>
        <div class="contact-info">
          <div class="contact-name">${u.name}</div>
          <div class="contact-last" style="color:var(--accent2)">🟢 Online</div>
        </div>
        <div class="contact-meta"><div class="contact-time">${u.role}</div></div>
      </div>`).join('')
    : '<div style="padding:20px;text-align:center;color:var(--text-muted)">Tidak ada yang online</div>';
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text  = input?.value.trim();
  if (!text||!currentUser) return;
  const now  = new Date();
  const time = now.getHours().toString().padStart(2,'0')+'.'+now.getMinutes().toString().padStart(2,'0');
  const data = {
    sender: currentUser.name, avatar: currentUser.avatar,
    uid   : window.FA.currentUser()?.uid||'',
    text, time, mine:true,
  };
  if (input) input.value = '';
  try { await window.FS.addDoc(window.FS.col('chat'), data); }
  catch(e) { chatMessages.push({...data,id:Date.now()}); renderChatMessages(); }
}

function sendBroadcast() {
  const judul = document.getElementById('bc-judul')?.value.trim();
  const pesan = document.getElementById('bc-pesan')?.value.trim();
  if (!judul||!pesan) { showToast('Isi judul dan pesan!','error'); return; }
  showToast(`📢 Broadcast "${judul}" terkirim!`);
  addLog('chat','Broadcast: '+judul);
  if (document.getElementById('bc-judul')) document.getElementById('bc-judul').value='';
  if (document.getElementById('bc-pesan')) document.getElementById('bc-pesan').value='';
}

// ───────────────────── EXPORT CSV ───────────────────────────────
function exportCSV(type) {
  let headers=[], data=[];
  const maps = {
    barang    : { h:['Kode','Nama','Kategori','Satuan','H.Beli','H.Jual','Stok','Min Stok'], d:DB.barang.map(b=>[b.kode,b.nama,b.kategori,b.satuan,b.hbeli,b.hjual,b.stok,b.minStok]) },
    invoice   : { h:['No Invoice','Tanggal','Mitra','Sales','Total','Status','Jatuh Tempo'], d:DB.invoice.map(i=>[i.no,i.tgl,i.mitra,i.salesName,i.total,i.status,i.tempo]) },
    mitra     : { h:['Kode','Nama','Tipe','PIC','HP','Kota','Piutang'], d:DB.mitra.map(m=>[m.kode,m.nama,m.tipe,m.pic,m.hp,m.kota,m.piutang]) },
    stok      : { h:['Kode','Nama','Kategori','Masuk','Keluar','Stok','Min Stok'], d:DB.barang.map(b=>[b.kode,b.nama,b.kategori,b.masuk,b.keluar,b.stok,b.minStok]) },
    pengeluaran:{ h:['Tanggal','Keterangan','Kategori','Jumlah'], d:DB.pengeluaran.map(p=>[p.tgl,p.ket,p.kat,p.jml]) },
  };
  const m = maps[type]; if (!m) return;
  const csv = [m.h.join(','),...m.d.map(r=>r.join(','))].join('\n');
  const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href=url; a.download=`BMS_${type}_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  addLog('export','Export CSV: '+type);
  showToast(`📊 Export ${type} berhasil!`);
}

// ───────────────────── SEARCH ───────────────────────────────────
function initSearch() {
  const searchMap = [
    { inputId:'search-barang',   tbodyId:'tbody-barang'   },
    { inputId:'search-invoice',  tbodyId:'tbody-invoice'  },
    { inputId:'search-mitra',    tbodyId:'tbody-mitra'    },
    { inputId:'search-stok',     tbodyId:'tbody-stok'     },
  ];
  searchMap.forEach(({ inputId, tbodyId }) => {
    const inp = document.getElementById(inputId);
    if (!inp) return;
    inp.addEventListener('input', e => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll(`#${tbodyId} tr`).forEach(r => {
        r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  });
  // Global search
  const gs = document.getElementById('global-search');
  if (gs) gs.addEventListener('input', e => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) return;
    if (DB.barang.some(b=>b.nama.toLowerCase().includes(q)||b.kode.toLowerCase().includes(q)))
      { navigateTo('barang'); showToast('🔍 Hasil ditemukan di Data Barang'); return; }
    if (DB.invoice.some(i=>i.no.toLowerCase().includes(q)||i.mitra.toLowerCase().includes(q)))
      { navigateTo('invoice'); showToast('🔍 Hasil ditemukan di Invoice'); return; }
    if (DB.mitra.some(m=>m.nama.toLowerCase().includes(q)))
      { navigateTo('mitra'); showToast('🔍 Hasil ditemukan di Mitra'); return; }
    showToast('🔍 Tidak ditemukan hasil untuk "'+q+'"', 'info');
  });
}

// ───────────────────── DATE & TOAST ─────────────────────────────
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
  icon.className = 'fas '+(icons[type]||'fa-check-circle');
  icon.style.color = type==='error'?'#ef4444':'#10b981';
  const bgs = {success:'rgba(16,185,129,0.12)',error:'rgba(239,68,68,0.12)',info:'rgba(37,99,168,0.12)',warning:'rgba(245,158,11,0.12)'};
  toast.style.background = bgs[type]||bgs.success;
  toast.style.display = 'flex';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>{ toast.style.display='none'; }, 3500);
}

// ───────────────────── DOM READY ────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  updateDate();
  const style = document.createElement('style');
  style.textContent = '@keyframes spin{to{transform:rotate(360deg)}} @keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}';
  document.head.appendChild(style);

  // Load app config dulu (public)
  if (window.FIREBASE_READY) {
    await loadAppConfig();
  } else {
    let w=0;
    const t = setInterval(async()=>{
      w+=200;
      if(window.FIREBASE_READY){ clearInterval(t); await loadAppConfig(); }
      else if(w>=5000) { clearInterval(t); }
    },200);
  }

  // Init search
  initSearch();

  // Check if already logged in (Firebase Auth persistent)
  // onAuthStateChanged in firebase.js will handle auto-login
});

window.addEventListener('load',()=>{
  setTimeout(()=>{
    if (!window.FIREBASE_READY) {
      const txt = document.getElementById('fb-status-text');
      if (txt) txt.textContent = '⚠️ Firebase belum tersambung — cek koneksi internet';
    }
  },6000);
});

// ═══════════════════════════════════════════════════════════════
//  FUNGSI TAMBAHAN — Dashboard Stats & Distribusi
// ═══════════════════════════════════════════════════════════════

// Render KPI cards di dashboard
function renderDashboardStats() {
  const totalBarang  = DB.barang.length;
  const stokAman     = DB.barang.filter(b=>b.stok>b.minStok).length;
  const stokKritis   = DB.barang.filter(b=>b.stok<=b.minStok).length;
  const totalInvoice = DB.invoice.length;
  const totalMitra   = DB.mitra.length;
  const safe = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  safe('dash-total-barang',  totalBarang);
  safe('dash-barang-aman',   stokAman+' aman');
  safe('dash-total-invoice', totalInvoice);
  safe('dash-total-mitra',   totalMitra);
  safe('dash-stok-kritis',   stokKritis);

  // Invoice pending list
  const pendingEl = document.getElementById('invoice-pending-list');
  if (pendingEl) {
    const pending = DB.invoice.filter(i=>i.status!=='Lunas').slice(0,5);
    pendingEl.innerHTML = pending.map(inv=>`
      <div class="act-item">
        <div class="act-dot" style="background:rgba(245,158,11,0.1);color:var(--accent)"><i class="fas fa-file-invoice"></i></div>
        <div class="act-text">
          <p style="font-weight:700">${inv.mitra}</p>
          <span style="color:var(--danger)">${inv.no} — Rp ${(inv.total||0).toLocaleString('id-ID')}</span>
        </div>
        <span class="badge badge-amber">${inv.status}</span>
      </div>`).join('') || '<div style="padding:16px;text-align:center;color:var(--text-muted)">✅ Semua invoice lunas</div>';
  }

  // Distribusi stok — gambar sesungguhnya
  renderDistribusiStok('distribusi-stok');
  renderDistribusiStok('laporan-distribusi');

  // Keuangan KPI
  const totalPengeluaran = DB.pengeluaran.reduce((s,p)=>s+(p.jml||0),0);
  const totalPembelian   = DB.pembelian.reduce((s,p)=>s+(p.total||0),0);
  const totalPendapatan  = DB.invoice.filter(i=>i.status==='Lunas').reduce((s,i)=>s+(i.total||0),0);
  const laba             = totalPendapatan - totalPengeluaran - totalPembelian;
  const keuSafe = (id,v) => { const el=document.getElementById(id); if(el) el.textContent='Rp '+v.toLocaleString('id-ID'); };
  keuSafe('keu-total-pengeluaran', totalPengeluaran);
  keuSafe('keu-total-pembelian',   totalPembelian);
  keuSafe('keu-total-pendapatan',  totalPendapatan);
  keuSafe('keu-laba',              laba);

  // Laporan KPI
  const maxKeluar  = DB.barang.reduce((max,b)=>((b.keluar||0)>(max.keluar||0)?b:max), {keluar:0});
  const mitraCount = {};
  DB.invoice.forEach(inv=>{ mitraCount[inv.mitra]=(mitraCount[inv.mitra]||0)+(inv.total||0); });
  const bestMitra  = Object.entries(mitraCount).sort((a,b)=>b[1]-a[1])[0];
  const avgMargin  = DB.barang.reduce((s,b)=>{ if(!b.hbeli||!b.hjual)return s; return s+((b.hjual-b.hbeli)/b.hbeli*100); },0) / (DB.barang.length||1);
  const totalKeluar = DB.barang.reduce((s,b)=>s+(b.keluar||0),0);
  const totalStok   = DB.barang.reduce((s,b)=>s+(b.stok||0),0);
  const perputaran  = totalStok > 0 ? (totalKeluar/totalStok).toFixed(1) : 0;

  const lapSafe = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  lapSafe('lap-produk-terlaris',    maxKeluar.nama||'—');
  lapSafe('lap-pelanggan-terbaik',  bestMitra?bestMitra[0]:'—');
  lapSafe('lap-margin',             Math.round(avgMargin)+'%');
  lapSafe('lap-perputaran',         perputaran+'x');

  // Sales dash name
  const sName = document.getElementById('sales-dash-name');
  if (sName) sName.textContent = currentUser?.name||'';
}

// Render distribusi stok dengan nama produk nyata + persentase
function renderDistribusiStok(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const totalStok = DB.barang.reduce((s,b)=>s+(b.stok||0),0);
  if (totalStok === 0) { el.innerHTML='<p style="color:var(--text-muted);font-size:13px">Belum ada data stok</p>'; return; }
  const sorted = [...DB.barang].sort((a,b)=>(b.stok||0)-(a.stok||0)).slice(0,8);
  const colors = ['var(--primary-light)','var(--accent)','var(--accent2)','var(--danger)','var(--purple)','var(--cyan)','#f97316','#06b6d4'];
  el.innerHTML = sorted.map((b,i)=>{
    const pct = Math.round(((b.stok||0)/totalStok)*100);
    return `<div class="dist-item">
      <div class="legend-dot" style="background:${colors[i%colors.length]};width:10px;height:10px;border-radius:50%;flex-shrink:0"></div>
      <span class="dist-name">${b.nama}</span>
      <div class="dist-bar-wrap"><div class="dist-bar" style="width:${pct}%;background:${colors[i%colors.length]}"></div></div>
      <span class="dist-pct">${pct}%</span>
    </div>`;
  }).join('');
}

// Override renderAll to also update dashboard stats
const _origRenderAll = renderAll;
// We hook into the existing renderAll
const _baseRenderAll = renderAll;
function renderAll() {
  renderBarang(); renderInvoice(); renderStok();
  renderMitra(); renderPengeluaran(); renderPembelian();
  renderStokKritis(); buildMainChart(); fillDropdowns();
  updateRunningText();
  renderDashboardStats();
  renderInvoiceStats();
  updateKategoriDropdowns();
  if (currentUser) applyRoleRestrictions(currentUser.role);
}
