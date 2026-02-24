// ================================================================
//   BMS — app.js  v3.0
//   Baitul Ma'mur Syafaah — Sistem Manajemen Bisnis
//   Fitur: Firebase Auth + Firestore, Live Chat Realtime,
//          Log Aktivitas, Stok Bersih, Role-based Access
// ================================================================

// ===== USERS (fallback lokal jika Firebase Auth mati) =====
const USERS = {
  owner: { pass:'BmS@0wn3r#2025', name:"Owner BMS", label:'Pemilik / Administrator', avatar:'O', email:'owner@bms-syafaah.id',
           menus:['dashboard','barang','invoice','stok','mitra','keuangan','laporan','log','tutorial'] },
  admin: { pass:'BmS@4dm1n#2025', name:'Admin',     label:'Admin Keuangan',          avatar:'A', email:'admin@bms-syafaah.id',
           menus:['dashboard','barang','invoice','stok','mitra','keuangan'] },
  sales: { pass:'BmS@S4l3s#2025', name:'Sales',     label:'Tim Sales',               avatar:'S', email:'sales@bms-syafaah.id',
           menus:['dashboard','stok','invoice','mitra'] },
};

const MENU_CONFIG = [
  { id:'dashboard', label:'Dashboard',        icon:'fa-gauge',          sub:'Ringkasan bisnis hari ini' },
  { id:'barang',    label:'Data Barang',       icon:'fa-box-open',       sub:'Kelola produk & inventaris' },
  { id:'invoice',   label:'Invoice',           icon:'fa-file-invoice',   sub:'Buat & kelola invoice', badge:'!' },
  { id:'stok',      label:'Info Stok',         icon:'fa-warehouse',      sub:'Informasi stok barang' },
  { id:'mitra',     label:'Mitra Bisnis',      icon:'fa-handshake',      sub:'Pelanggan & pemasok' },
  { id:'keuangan',  label:'Keuangan',          icon:'fa-chart-line',     sub:'Laporan keuangan' },
  { id:'laporan',   label:'Laporan & Analitik',icon:'fa-chart-bar',      sub:'Analisis performa' },
  { id:'log',       label:'Log Aktivitas',     icon:'fa-clock-rotate-left', sub:'Riwayat semua aksi tim' },
  { id:'tutorial',  label:'Panduan',           icon:'fa-circle-question',sub:'Cara pakai & setup' },
];

let currentUser  = null;
let invItems     = [];
let invCounter   = 1;
let chatOpen     = false;
let activeChatTab= 'messages';
let chatListener = null;
let logListener  = null;

// ===== DATA LOKAL (stok = 0, hanya nama barang) =====
const DB = {
  barang: [
    { kode:'BRS-001', nama:'Beras Premium 5kg',   kategori:'Beras & Tepung',  satuan:'Karung', hbeli:0, hjual:0, stok:0, minStok:20, masuk:0, keluar:0, foto:[], lokasi:'' },
    { kode:'BRS-002', nama:'Beras Medium 25kg',   kategori:'Beras & Tepung',  satuan:'Karung', hbeli:0, hjual:0, stok:0, minStok:20, masuk:0, keluar:0, foto:[], lokasi:'' },
    { kode:'MNY-001', nama:'Minyak Goreng 5L',    kategori:'Minyak & Lemak',  satuan:'Dus',    hbeli:0, hjual:0, stok:0, minStok:10, masuk:0, keluar:0, foto:[], lokasi:'' },
    { kode:'GUL-001', nama:'Gula Pasir 50kg',     kategori:'Gula & Pemanis',  satuan:'Karung', hbeli:0, hjual:0, stok:0, minStok:10, masuk:0, keluar:0, foto:[], lokasi:'' },
    { kode:'TPG-001', nama:'Tepung Terigu 25kg',  kategori:'Beras & Tepung',  satuan:'Karung', hbeli:0, hjual:0, stok:0, minStok:15, masuk:0, keluar:0, foto:[], lokasi:'' },
    { kode:'KCP-001', nama:'Kecap Manis 620ml',   kategori:'Bumbu & Rempah',  satuan:'Karton', hbeli:0, hjual:0, stok:0, minStok:10, masuk:0, keluar:0, foto:[], lokasi:'' },
    { kode:'GRM-001', nama:'Garam Dapur 500g',    kategori:'Bumbu & Rempah',  satuan:'Dus',    hbeli:0, hjual:0, stok:0, minStok:20, masuk:0, keluar:0, foto:[], lokasi:'' },
  ],
  invoice     : [],
  mitra       : [],
  pengeluaran : [],
  pembelian   : [],
  notifikasi  : [],
  chatMessages: [],
  log         : [],
};

// ================================================================
//   LOGIN — STEP 1: Pilih Role  |  STEP 2: Masukkan Password
// ================================================================
let loginStep    = 1;
let loginRole    = null;

function selectRole(role) {
  loginRole = role;
  document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('role-' + role).classList.add('active');

  // Animasi masuk ke step 2
  const step1 = document.getElementById('login-step1');
  const step2 = document.getElementById('login-step2');
  const roleLabel = { owner:"Owner", admin:"Admin Keuangan", sales:"Tim Sales" };
  document.getElementById('login-role-label').textContent = roleLabel[role];
  document.getElementById('login-role-icon').className =
    role==='owner' ? 'fas fa-crown' : role==='admin' ? 'fas fa-calculator' : 'fas fa-handshake';

  step1.style.animation = 'fadeOut 0.25s forwards';
  setTimeout(() => {
    step1.style.display = 'none';
    step2.style.display = 'block';
    step2.style.animation = 'loginAppear 0.35s forwards';
    document.getElementById('login-pass').focus();
  }, 250);
}

function backToRoleSelect() {
  const step1 = document.getElementById('login-step1');
  const step2 = document.getElementById('login-step2');
  step2.style.display = 'none';
  step1.style.display = 'block';
  step1.style.animation = 'loginAppear 0.35s forwards';
  document.getElementById('login-pass').value = '';
  loginRole = null;
}

async function doLogin() {
  if (!loginRole) { showToast('Pilih role terlebih dahulu!', 'error'); return; }
  const pass = document.getElementById('login-pass').value.trim();
  if (!pass) { showToast('Masukkan password!', 'error'); return; }

  const btnLogin = document.getElementById('btn-login');
  btnLogin.disabled = true;
  btnLogin.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Masuk...';

  // Coba Firebase Auth dulu
  const user = USERS[loginRole];
  let loginOK = false;

  if (window.FA && pass === user.pass) {
    try {
      await window.FA.signIn(user.email, pass);
      loginOK = true;
    } catch(e) {
      // Firebase Auth gagal — coba fallback lokal
      console.warn('Firebase Auth gagal, pakai lokal:', e.message);
    }
  }

  // Fallback: cek password lokal
  if (!loginOK) {
    if (pass !== user.pass) {
      showToast('❌ Password salah!', 'error');
      document.getElementById('login-pass').style.borderColor = 'rgba(239,68,68,0.7)';
      setTimeout(() => document.getElementById('login-pass').style.borderColor = '', 2000);
      btnLogin.disabled = false;
      btnLogin.innerHTML = '<i class="fas fa-sign-in-alt"></i> Masuk';
      return;
    }
    loginOK = true;
  }

  if (loginOK) {
    currentUser = { ...user, username: loginRole };
    localStorage.setItem('bms_session', JSON.stringify({ username: loginRole }));
    applySession(currentUser);
    addLog('login', `Login sebagai ${user.label}`);
  }

  btnLogin.disabled = false;
  btnLogin.innerHTML = '<i class="fas fa-sign-in-alt"></i> Masuk';
}

function applySession(user) {
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('app').style.display        = 'block';
  document.getElementById('sb-avatar').textContent    = user.avatar;
  document.getElementById('sb-name').textContent      = user.name;
  document.getElementById('sb-role').textContent      = user.label;
  buildNav(user.menus);
  applyRoleRestrictions(user.username);
  initData();
  navigateTo('dashboard');
  updateDate();
  renderNotifications();
  showToast(`✅ Selamat datang, ${user.name}!`);
}

function doLogout() {
  if (!confirm('Yakin ingin keluar?')) return;
  addLog('logout', 'Logout dari sistem');
  localStorage.removeItem('bms_session');
  if (window.FA) window.FA.signOut().catch(()=>{});
  document.getElementById('login-page').style.display = 'flex';
  document.getElementById('app').style.display        = 'none';
  // Reset login step
  document.getElementById('login-step1').style.display = 'block';
  document.getElementById('login-step2').style.display = 'none';
  document.getElementById('login-pass').value = '';
  loginRole = null;
  currentUser = null;
  if (chatListener)  { chatListener(); chatListener = null; }
  if (logListener)   { logListener();  logListener  = null; }
}

function restoreSession() {
  const saved = localStorage.getItem('bms_session');
  if (!saved) return;
  try {
    const { username } = JSON.parse(saved);
    const user = USERS[username];
    if (!user) { localStorage.removeItem('bms_session'); return; }
    currentUser = { ...user, username };
    applySession(currentUser);
  } catch(e) { localStorage.removeItem('bms_session'); }
}

function applyRoleRestrictions(username) {
  const isSales = username === 'sales';
  const isOwner = username === 'owner';
  // Tombol tambah barang: owner & admin saja
  document.querySelectorAll('.owner-admin-only').forEach(el => {
    el.style.display = isSales ? 'none' : '';
  });
  // Tombol stok masuk/keluar: sembunyikan untuk sales
  document.querySelectorAll('.stok-action-btn').forEach(el => {
    el.style.display = isSales ? 'none' : '';
  });
  // Log hanya owner
  const navLog = document.getElementById('nav-log');
  if (navLog) navLog.style.display = isOwner ? '' : 'none';
}

// ================================================================
//   NAVIGASI
// ================================================================
function buildNav(allowed) {
  const nav = document.getElementById('sidebar-nav');
  nav.innerHTML = '<div class="nav-label">MENU UTAMA</div>';
  MENU_CONFIG.filter(m => allowed.includes(m.id)).forEach(m => {
    const el = document.createElement('div');
    el.className = 'nav-item';
    el.id        = 'nav-' + m.id;
    el.onclick   = () => { navigateTo(m.id); if(window.innerWidth<=768) toggleSidebar(); };
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
    document.getElementById('page-title').textContent = cfg.label;
    document.getElementById('page-sub').textContent   = cfg.sub;
  }
  if (id === 'laporan') buildLaporanChart();
  if (id === 'log')     renderLog();
}

// ================================================================
//   INIT DATA
// ================================================================
function initData() {
  if (window.FIREBASE_READY) {
    loadAllFromFirestore();
  } else {
    let waited = 0;
    const waitFB = setInterval(() => {
      waited += 200;
      if (window.FIREBASE_READY) { clearInterval(waitFB); loadAllFromFirestore(); }
      else if (waited >= 3000)   { clearInterval(waitFB); renderAll(); showToast('⚠️ Mode offline — data lokal aktif', 'warning'); }
    }, 200);
  }
  buildMainChart();
  fillDropdowns();
  setDefaultDates();
  setupChatRealtime();
  setupLogRealtime();
  document.getElementById('inv-no').value = `INV-${new Date().getFullYear()}-${String(invCounter).padStart(4,'0')}`;
  document.getElementById('m-kode').value = `MTR-${String(DB.mitra.length+1).padStart(3,'0')}`;
}

function renderAll() {
  renderBarang(); renderInvoice(); renderStok();
  renderMitra(); renderPengeluaran(); renderPembelian();
  renderStokKritis(); fillDropdowns();
  if (currentUser) applyRoleRestrictions(currentUser.username);
}

// ================================================================
//   FIRESTORE — LOAD & REALTIME
// ================================================================
async function loadAllFromFirestore() {
  const { FS } = window;
  updateFBStatus('loading');
  try {
    const [sBarang, sInv, sMitra, sPeng, sPemb] = await Promise.all([
      FS.getDocs(FS.query(FS.col('barang'),      FS.orderBy('_ts','desc'))),
      FS.getDocs(FS.query(FS.col('invoice'),     FS.orderBy('_ts','desc'))),
      FS.getDocs(FS.query(FS.col('mitra'),       FS.orderBy('_ts','desc'))),
      FS.getDocs(FS.query(FS.col('pengeluaran'), FS.orderBy('_ts','desc'))),
      FS.getDocs(FS.query(FS.col('pembelian'),   FS.orderBy('_ts','desc'))),
    ]);

    // Jika Firestore kosong → seed data barang (stok=0)
    if (sBarang.empty) {
      await seedBarang();
    } else {
      DB.barang = sBarang.docs.map(d => ({ _id: d.id, ...d.data() }));
    }
    if (!sInv.empty)   DB.invoice      = sInv.docs.map(d   => ({ _id: d.id, ...d.data() }));
    if (!sMitra.empty) DB.mitra        = sMitra.docs.map(d  => ({ _id: d.id, ...d.data() }));
    if (!sPeng.empty)  DB.pengeluaran  = sPeng.docs.map(d   => ({ _id: d.id, ...d.data() }));
    if (!sPemb.empty)  DB.pembelian    = sPemb.docs.map(d   => ({ _id: d.id, ...d.data() }));

    setupRealtimeListeners();
    renderAll();
    updateFBStatus('online');
    showToast('☁️ Data dimuat dari Firebase!', 'success');
  } catch(err) {
    console.error('Firestore error:', err);
    updateFBStatus('offline');
    renderAll();
    showToast('⚠️ Gagal koneksi Firebase — data lokal aktif', 'warning');
  }
}

async function seedBarang() {
  const { FS } = window;
  showToast('⏳ Inisialisasi daftar barang...', 'info');
  await Promise.all(DB.barang.map(b => FS.addDoc(FS.col('barang'), b)));
  showToast('✅ Daftar barang berhasil dibuat!');
}

function setupRealtimeListeners() {
  const { FS } = window;
  FS.onSnapshot(FS.query(FS.col('barang'),      FS.orderBy('_ts','desc')), snap => {
    if(!snap.empty) { DB.barang      = snap.docs.map(d => ({_id:d.id,...d.data()})); renderBarang(); renderStok(); renderStokKritis(); fillDropdowns(); }
  });
  FS.onSnapshot(FS.query(FS.col('invoice'),     FS.orderBy('_ts','desc')), snap => {
    if(!snap.empty) { DB.invoice     = snap.docs.map(d => ({_id:d.id,...d.data()})); renderInvoice(); updateInvoiceBadge(); }
  });
  FS.onSnapshot(FS.query(FS.col('mitra'),       FS.orderBy('_ts','desc')), snap => {
    if(!snap.empty) { DB.mitra       = snap.docs.map(d => ({_id:d.id,...d.data()})); renderMitra(); fillDropdowns(); }
  });
  FS.onSnapshot(FS.query(FS.col('pengeluaran'), FS.orderBy('_ts','desc')), snap => {
    if(!snap.empty) { DB.pengeluaran = snap.docs.map(d => ({_id:d.id,...d.data()})); renderPengeluaran(); }
  });
  FS.onSnapshot(FS.query(FS.col('pembelian'),   FS.orderBy('_ts','desc')), snap => {
    if(!snap.empty) { DB.pembelian   = snap.docs.map(d => ({_id:d.id,...d.data()})); renderPembelian(); }
  });
}

function updateFBStatus(state) {
  const el  = document.getElementById('fb-status');
  const txt = document.getElementById('fb-status-text');
  if (!el || !txt) return;
  const map = {
    online : { cls:'online',  text:'☁️ Firebase terhubung — data tersimpan di cloud' },
    offline: { cls:'offline', text:'⚠️ Offline — data lokal aktif' },
    loading: { cls:'offline', text:'🔄 Menghubungkan ke Firebase...' },
  };
  const s = map[state] || map.offline;
  el.className      = `firebase-status ${s.cls}`;
  txt.textContent   = s.text;
}

// ================================================================
//   LOG AKTIVITAS
// ================================================================
async function addLog(aksi, detail) {
  if (!currentUser) return;
  const data = {
    user  : currentUser.name,
    role  : currentUser.label,
    aksi,
    detail,
    waktu : new Date().toLocaleString('id-ID'),
  };
  DB.log.unshift(data);
  if (window.FIREBASE_READY) {
    try { await window.FS.addDoc(window.FS.col('log'), data); } catch(e) {}
  }
}

function setupLogRealtime() {
  if (!window.FIREBASE_READY) return;
  if (logListener) logListener();
  logListener = window.FS.onSnapshot(
    window.FS.query(window.FS.col('log'), window.FS.orderBy('_ts','desc'), window.FS.limit(100)),
    snap => { DB.log = snap.docs.map(d => ({_id:d.id,...d.data()})); renderLog(); }
  );
}

function renderLog() {
  const tbody = document.getElementById('tbody-log');
  if (!tbody) return;
  const iconMap = {
    login:'fa-sign-in-alt', logout:'fa-sign-out-alt',
    tambah:'fa-plus-circle', hapus:'fa-trash', edit:'fa-edit',
    stok:'fa-boxes', invoice:'fa-file-invoice', chat:'fa-comment',
  };
  const colorMap = {
    login:'var(--accent2)', logout:'var(--text-muted)',
    tambah:'var(--primary-light)', hapus:'var(--danger)', edit:'var(--accent)',
    stok:'var(--cyan)', invoice:'var(--accent2)', chat:'var(--purple)',
  };
  tbody.innerHTML = DB.log.length ? DB.log.map(l => `
    <tr>
      <td><i class="fas ${iconMap[l.aksi]||'fa-circle-dot'}" style="color:${colorMap[l.aksi]||'var(--text-muted)'}"></i></td>
      <td><strong>${l.user}</strong><br><span style="font-size:11px;color:var(--text-muted)">${l.role}</span></td>
      <td><span class="badge badge-blue">${l.aksi}</span></td>
      <td>${l.detail}</td>
      <td style="color:var(--text-muted);font-size:12px">${l.waktu}</td>
    </tr>`).join('')
  : '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-muted)">Belum ada aktivitas</td></tr>';
}

// ================================================================
//   LIVE CHAT REALTIME (Firebase Firestore)
// ================================================================
function setupChatRealtime() {
  if (!window.FIREBASE_READY) return;
  if (chatListener) chatListener();
  chatListener = window.FS.onSnapshot(
    window.FS.query(window.FS.col('chat'), window.FS.orderBy('_ts','asc'), window.FS.limit(100)),
    snap => {
      DB.chatMessages = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
      renderChatMessages();
      // Badge unread jika chat tertutup
      if (!chatOpen) {
        const badge = document.getElementById('chat-unread-badge');
        const unread = DB.chatMessages.filter(m => !m.mine && m.sender !== (currentUser?.name)).length;
        if (badge) badge.textContent = unread > 0 ? (unread > 9 ? '9+' : unread) : '';
      }
    }
  );
}

function toggleChat() {
  chatOpen = !chatOpen;
  document.getElementById('chat-window').classList.toggle('open', chatOpen);
  if (chatOpen) {
    document.getElementById('chat-unread-badge').textContent = '';
    document.getElementById('chat-input').focus();
  }
}

function switchChatTab(tab) {
  activeChatTab = tab;
  document.querySelectorAll('.chat-tab').forEach((t,i) => {
    t.classList.toggle('active', ['messages','contacts','broadcast'][i] === tab);
  });
  document.getElementById('chat-messages').style.display        = tab==='messages'  ? 'flex' : 'none';
  document.getElementById('chat-contacts-panel').style.display  = tab==='contacts'  ? 'block': 'none';
  document.getElementById('chat-broadcast-panel').style.display = tab==='broadcast' ? 'block': 'none';
  document.getElementById('chat-input-area').style.display      = tab==='messages'  ? 'flex' : 'none';
  if (tab === 'contacts') renderContactsList();
}

function renderChatMessages() {
  const body = document.getElementById('chat-messages');
  if (!body) return;
  if (!DB.chatMessages.length) {
    body.innerHTML = `<div style="text-align:center;margin:auto;color:var(--text-muted);font-size:13px">
      <i class="fas fa-comments" style="font-size:32px;display:block;margin-bottom:10px;opacity:0.3"></i>
      Belum ada pesan. Mulai percakapan!
    </div>`;
    return;
  }
  body.innerHTML = DB.chatMessages.map(m => {
    const isMine = currentUser && m.sender === currentUser.name;
    return `<div class="msg ${isMine?'mine':'other'}">
      <div class="msg-avatar" style="background:${avatarColor(m.sender)}">${m.avatar||m.sender[0]}</div>
      <div>
        ${!isMine?`<div style="font-size:11px;color:var(--text-muted);margin-bottom:3px;font-weight:600">${m.sender}</div>`:''}
        <div class="msg-bubble">${escHtml(m.text)}</div>
        <span class="msg-time">${m.waktu||''}</span>
      </div>
    </div>`;
  }).join('');
  body.scrollTop = body.scrollHeight;
}

function avatarColor(name) {
  const colors = ['#1a3a5c','#f59e0b','#10b981','#7c3aed','#ef4444','#0891b2'];
  let h = 0;
  for (let i=0; i<name.length; i++) h = name.charCodeAt(i) + ((h<<5)-h);
  return colors[Math.abs(h) % colors.length];
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text  = input.value.trim();
  if (!text || !currentUser) return;
  const now  = new Date();
  const data = {
    sender: currentUser.name,
    avatar: currentUser.avatar,
    role  : currentUser.label,
    text,
    waktu : now.getHours().toString().padStart(2,'0') + '.' + now.getMinutes().toString().padStart(2,'0'),
  };
  input.value = '';
  if (window.FIREBASE_READY) {
    try { await window.FS.addDoc(window.FS.col('chat'), data); }
    catch(e) { DB.chatMessages.push({...data, mine:true}); renderChatMessages(); }
  } else {
    DB.chatMessages.push({...data, mine:true}); renderChatMessages();
  }
  addLog('chat', `Kirim pesan: "${text.substring(0,40)}${text.length>40?'...':''}"`);
}

function renderContactsList() {
  const panel = document.getElementById('chat-contacts-panel');
  panel.innerHTML = Object.entries(USERS).map(([key, u]) => `
    <div class="chat-contact" onclick="switchChatTab('messages')">
      <div class="contact-avatar" style="background:${avatarColor(u.name)}">${u.avatar}</div>
      <div class="contact-info">
        <div class="contact-name">${u.name}</div>
        <div class="contact-last">${u.label}</div>
      </div>
      <div class="contact-meta">
        <div class="contact-time" style="color:var(--accent2);font-size:11px">● Online</div>
      </div>
    </div>`).join('');
}

async function sendBroadcast() {
  const judul = document.getElementById('bc-judul').value.trim();
  const pesan = document.getElementById('bc-pesan').value.trim();
  if (!judul || !pesan) { showToast('Isi judul dan pesan broadcast!', 'error'); return; }
  const text = `📢 [BROADCAST] ${judul}: ${pesan}`;
  const now  = new Date();
  const data = {
    sender: currentUser.name,
    avatar: currentUser.avatar,
    role  : currentUser.label,
    text,
    waktu : now.getHours().toString().padStart(2,'0')+'.'+now.getMinutes().toString().padStart(2,'0'),
    isBroadcast: true,
  };
  if (window.FIREBASE_READY) {
    try { await window.FS.addDoc(window.FS.col('chat'), data); }
    catch(e) {}
  }
  document.getElementById('bc-judul').value = '';
  document.getElementById('bc-pesan').value = '';
  switchChatTab('messages');
  showToast(`📢 Broadcast terkirim ke semua tim!`);
  addLog('chat', `Broadcast: "${judul}"`);
}

// ================================================================
//   NAV & UTILS
// ================================================================
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('mobile-open');
}

function toggleNotif() {
  document.getElementById('notif-panel').classList.toggle('open');
}

async function syncData() {
  const icon = document.getElementById('sync-icon');
  icon.style.animation = 'spin 1s linear infinite';
  showToast('🔄 Memuat ulang data...', 'info');
  try {
    await loadAllFromFirestore();
    icon.style.animation = '';
  } catch(e) {
    icon.style.animation = '';
    showToast('❌ Gagal sinkronisasi', 'error');
  }
}

function openModal(id)  { const el=document.getElementById(id); if(el){el.classList.add('open'); document.body.style.overflow='hidden';} }
function closeModal(id) { const el=document.getElementById(id); if(el){el.classList.remove('open'); document.body.style.overflow='';} }

document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) { e.target.classList.remove('open'); document.body.style.overflow=''; }
  if (!e.target.closest('.notif-panel') && !e.target.closest('[onclick="toggleNotif()"]'))
    document.getElementById('notif-panel')?.classList.remove('open');
});

// ================================================================
//   BARANG — CRUD
// ================================================================
async function simpanBarang() {
  const nama = document.getElementById('b-nama').value.trim();
  const kode = document.getElementById('b-kode').value.trim();
  if (!nama || !kode) { showToast('Nama dan kode barang wajib diisi!', 'error'); return; }
  const data = {
    kode, nama,
    kategori: document.getElementById('b-kategori').value || 'Lainnya',
    satuan  : document.getElementById('b-satuan').value,
    stok    : parseInt(document.getElementById('b-stok').value)    || 0,
    hbeli   : parseInt(document.getElementById('b-hbeli').value)   || 0,
    hjual   : parseInt(document.getElementById('b-hjual').value)   || 0,
    minStok : parseInt(document.getElementById('b-minstock').value)|| 20,
    lokasi  : document.getElementById('b-lokasi').value  || '',
    masuk   : parseInt(document.getElementById('b-stok').value)    || 0,
    keluar  : 0, foto: [],
  };
  if (window.FIREBASE_READY) {
    try { await window.FS.addDoc(window.FS.col('barang'), data); showToast('✅ Barang tersimpan ke cloud!'); }
    catch(e) { DB.barang.unshift(data); renderBarang(); renderStok(); showToast('✅ Barang ditambahkan (offline)'); }
  } else {
    DB.barang.unshift(data); renderBarang(); renderStok(); showToast('✅ Barang ditambahkan!');
  }
  fillDropdowns();
  closeModal('modal-barang');
  ['b-kode','b-nama','b-stok','b-hbeli','b-hjual','b-desc'].forEach(id => { const el=document.getElementById(id); if(el)el.value=''; });
  addLog('tambah', `Tambah barang: ${nama} (${kode})`);
}

async function hapusBarang(i) {
  const b = DB.barang[i];
  if (!confirm(`Hapus barang "${b.nama}"?`)) return;
  if (window.FIREBASE_READY && b._id) {
    try { await window.FS.deleteDoc(window.FS.docRef('barang', b._id)); showToast('🗑️ Barang dihapus!'); }
    catch(e) { DB.barang.splice(i,1); renderBarang(); renderStok(); }
  } else { DB.barang.splice(i,1); renderBarang(); renderStok(); showToast('🗑️ Barang dihapus!'); }
  addLog('hapus', `Hapus barang: ${b.nama}`);
}

async function editBarang(i) {
  const b = DB.barang[i];
  const hjual = prompt(`Harga jual baru untuk ${b.nama} (saat ini: Rp ${b.hjual.toLocaleString('id-ID')}):`, b.hjual);
  if (hjual === null) return;
  const hbeli = prompt(`Harga beli baru (saat ini: Rp ${b.hbeli.toLocaleString('id-ID')}):`, b.hbeli);
  if (hbeli === null) return;
  const stok  = prompt(`Stok saat ini (saat ini: ${b.stok}):`, b.stok);
  if (stok === null) return;
  b.hjual = parseInt(hjual)||0; b.hbeli = parseInt(hbeli)||0; b.stok = parseInt(stok)||0;
  if (window.FIREBASE_READY && b._id) {
    try { await window.FS.updateDoc(window.FS.docRef('barang', b._id), { hjual: b.hjual, hbeli: b.hbeli, stok: b.stok }); }
    catch(e) {}
  }
  renderBarang(); renderStok();
  showToast(`✅ Barang ${b.nama} diupdate!`);
  addLog('edit', `Edit barang: ${b.nama} — stok=${b.stok}, hjual=${b.hjual}`);
}

// ================================================================
//   RENDER TABLES
// ================================================================
function renderBarang() {
  const tbody = document.getElementById('tbody-barang');
  const badge = document.getElementById('total-barang-badge');
  if (badge) badge.textContent = DB.barang.length + ' Item';
  const canEdit = currentUser && currentUser.username !== 'sales';
  tbody.innerHTML = DB.barang.map((b,i) => `
    <tr>
      <td><div style="width:44px;height:44px;border-radius:10px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:22px">📦</div></td>
      <td><code style="background:#f1f5f9;padding:2px 8px;border-radius:6px;font-size:12px;font-weight:700">${b.kode}</code></td>
      <td><strong>${b.nama}</strong><br><span style="font-size:11.5px;color:var(--text-muted)">${b.lokasi||'—'}</span></td>
      <td><span class="badge badge-blue">${b.kategori}</span></td>
      <td>${b.satuan}</td>
      <td>${b.hbeli>0?'Rp '+b.hbeli.toLocaleString('id-ID'):'<span style="color:var(--text-muted)">Belum diisi</span>'}</td>
      <td>${b.hjual>0?'<strong>Rp '+b.hjual.toLocaleString('id-ID')+'</strong>':'<span style="color:var(--text-muted)">Belum diisi</span>'}</td>
      <td class="${b.stok===0?'stock-low':b.stok<=b.minStok?'stock-low':'stock-ok'}" style="font-weight:800">${b.stok}</td>
      <td><span class="badge ${b.stok===0?'badge-red':b.stok<=b.minStok?'badge-amber':'badge-green'}">${b.stok===0?'⛔ Kosong':b.stok<=b.minStok?'⚠️ Kritis':'✅ Aman'}</span></td>
      <td>
        <div style="display:flex;gap:6px">
          ${canEdit?`<button class="btn btn-outline btn-icon btn-sm owner-admin-only" onclick="editBarang(${i})" title="Edit"><i class="fas fa-edit"></i></button>
          <button class="btn btn-danger btn-icon btn-sm owner-admin-only" onclick="hapusBarang(${i})" title="Hapus"><i class="fas fa-trash"></i></button>`:'<span style="font-size:12px;color:var(--text-muted)">Read-only</span>'}
        </div>
      </td>
    </tr>`).join('');
}

function renderInvoice() {
  const tbody = document.getElementById('tbody-invoice');
  tbody.innerHTML = DB.invoice.length ? DB.invoice.map((inv,i) => `
    <tr>
      <td><strong style="color:var(--primary-light)">${inv.no}</strong></td>
      <td>${inv.tgl}</td>
      <td><strong>${inv.mitra}</strong></td>
      <td><strong>Rp ${inv.total.toLocaleString('id-ID')}</strong></td>
      <td><span class="badge ${inv.status==='Lunas'?'badge-green':inv.status==='Jatuh Tempo'?'badge-red':'badge-amber'}">${inv.status}</span></td>
      <td>${inv.tempo}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-outline btn-icon btn-sm" onclick="showInvoicePreview(${i})" title="Preview"><i class="fas fa-eye"></i></button>
          <button class="btn btn-success btn-icon btn-sm" onclick="tandaiLunas(${i})" title="Lunas"><i class="fas fa-check"></i></button>
          <button class="btn btn-primary btn-icon btn-sm" onclick="window.print()" title="Cetak"><i class="fas fa-print"></i></button>
        </div>
      </td>
    </tr>`).join('')
  : '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted)">Belum ada invoice</td></tr>';
  updateInvoiceBadge();
}

function updateInvoiceBadge() {
  const belumLunas = DB.invoice.filter(i => i.status !== 'Lunas').length;
  const navInv = document.getElementById('nav-invoice');
  if (navInv) {
    let badge = navInv.querySelector('.nav-badge');
    if (belumLunas > 0) {
      if (!badge) { badge = document.createElement('span'); badge.className = 'nav-badge'; navInv.appendChild(badge); }
      badge.textContent = belumLunas;
    } else if (badge) badge.remove();
  }
}

function renderStok() {
  const tbody = document.getElementById('tbody-stok');
  tbody.innerHTML = DB.barang.map((b,i) => `
    <tr>
      <td><code style="background:#f1f5f9;padding:2px 8px;border-radius:6px;font-size:12px">${b.kode}</code></td>
      <td><strong>${b.nama}</strong></td>
      <td><span class="badge badge-blue">${b.kategori}</span></td>
      <td style="color:var(--accent2);font-weight:700">+${b.masuk||0}</td>
      <td style="color:var(--danger);font-weight:700">-${b.keluar||0}</td>
      <td class="${b.stok===0?'stock-low':b.stok<=b.minStok?'stock-low':'stock-ok'}" style="font-size:16px;font-weight:900">${b.stok}</td>
      <td style="color:var(--text-muted)">${b.minStok}</td>
      <td><span class="badge ${b.stok===0?'badge-red':b.stok<=b.minStok?'badge-amber':'badge-green'}">${b.stok===0?'⛔ Kosong':b.stok<=b.minStok?'⚠️ Kritis':'✅ Aman'}</span></td>
    </tr>`).join('');
}

function renderMitra() {
  const tbody = document.getElementById('tbody-mitra');
  tbody.innerHTML = DB.mitra.length ? DB.mitra.map((m,i) => `
    <tr>
      <td><code style="background:#f1f5f9;padding:2px 8px;border-radius:6px;font-size:12px">${m.kode}</code></td>
      <td><strong>${m.nama}</strong></td>
      <td><span class="badge ${m.tipe==='Pelanggan'?'badge-blue':'badge-green'}">${m.tipe}</span></td>
      <td>${m.pic||'—'}</td>
      <td>${m.hp||'—'}</td>
      <td>${m.kota||'—'}</td>
      <td>${m.piutang>0?'<span class="badge badge-amber">Rp '+m.piutang.toLocaleString('id-ID')+'</span>':'—'}</td>
      <td><span class="badge badge-green">${m.status}</span></td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-outline btn-icon btn-sm" onclick="chatMitra('${m.nama}')" title="Chat"><i class="fas fa-comment"></i></button>
          <button class="btn btn-danger btn-icon btn-sm owner-admin-only" onclick="hapusMitra(${i})" title="Hapus"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`).join('')
  : '<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text-muted)">Belum ada mitra</td></tr>';
}

function renderPengeluaran() {
  const tbody = document.getElementById('tbody-pengeluaran');
  tbody.innerHTML = DB.pengeluaran.length ? DB.pengeluaran.map(p => `
    <tr>
      <td>${p.tgl}</td>
      <td>${p.ket}</td>
      <td><span class="badge badge-purple">${p.kat}</span></td>
      <td style="color:var(--danger);font-weight:700">Rp ${p.jml.toLocaleString('id-ID')}</td>
    </tr>`).join('')
  : '<tr><td colspan="4" style="text-align:center;padding:30px;color:var(--text-muted)">Belum ada pengeluaran</td></tr>';
}

function renderPembelian() {
  const tbody = document.getElementById('tbody-pembelian');
  tbody.innerHTML = DB.pembelian.length ? DB.pembelian.map(p => `
    <tr>
      <td>${p.tgl}</td>
      <td>${p.pemasok}</td>
      <td>${p.barang}</td>
      <td style="font-weight:700">Rp ${p.total.toLocaleString('id-ID')}</td>
    </tr>`).join('')
  : '<tr><td colspan="4" style="text-align:center;padding:30px;color:var(--text-muted)">Belum ada pembelian</td></tr>';
}

function renderStokKritis() {
  const list = document.getElementById('stok-kritis-list');
  if (!list) return;
  const kritis = DB.barang.filter(b => b.stok <= b.minStok);
  list.innerHTML = kritis.length ? kritis.map(b => `
    <div class="act-item">
      <div class="act-dot" style="background:rgba(239,68,68,0.1);color:var(--danger)"><i class="fas fa-box"></i></div>
      <div class="act-text">
        <p style="font-weight:700">${b.nama}</p>
        <span class="stock-low">${b.stok===0?'⛔ Stok Kosong':'Sisa '+b.stok+' '+b.satuan+' ⚠️ Min: '+b.minStok}</span>
      </div>
    </div>`).join('')
  : '<div style="padding:20px;text-align:center;color:var(--text-muted)">✅ Semua stok aman</div>';
}

// ================================================================
//   NOTIFICATIONS
// ================================================================
function renderNotifications() {
  const list   = document.getElementById('notif-list');
  const notifs = DB.notifikasi;
  const unread = notifs.filter(n => !n.baca).length;
  const dot    = document.getElementById('notif-dot');
  if (dot) dot.style.display = unread ? '' : 'none';
  const iconMap  = { danger:'fa-exclamation-circle', warning:'fa-clock', success:'fa-check-circle', info:'fa-info-circle' };
  const colorMap = { danger:'rgba(239,68,68,0.1)', warning:'rgba(245,158,11,0.1)', success:'rgba(16,185,129,0.1)', info:'rgba(37,99,168,0.1)' };
  const fgMap    = { danger:'var(--danger)', warning:'var(--accent)', success:'var(--accent2)', info:'var(--primary-light)' };
  list.innerHTML = notifs.length ? notifs.map((n,i) => `
    <div class="notif-item" onclick="bacaNotif(${i})">
      <div class="notif-icon" style="background:${colorMap[n.tipe]};color:${fgMap[n.tipe]}"><i class="fas ${iconMap[n.tipe]}"></i></div>
      <div style="flex:1"><p>${n.pesan}</p><span>${n.waktu}</span></div>
      ${!n.baca?'<div class="unread-dot"></div>':''}
    </div>`).join('')
  : '<div style="padding:30px;text-align:center;color:var(--text-muted)">Tidak ada notifikasi</div>';
}

function bacaNotif(i) { DB.notifikasi[i].baca = true; renderNotifications(); }
function markAllRead() { DB.notifikasi.forEach(n=>n.baca=true); renderNotifications(); showToast('✅ Semua notifikasi dibaca'); }

// ================================================================
//   CHARTS
// ================================================================
function buildMainChart() {
  const vals = [0,0,0,0,0,0];
  // Hitung dari DB.invoice jika ada
  if (DB.invoice.length) {
    DB.invoice.slice(0,6).forEach((inv,i) => { vals[i] = Math.round(inv.total/1000000); });
  }
  const max = Math.max(...vals, 1);
  const el  = document.getElementById('main-chart');
  if (!el) return;
  el.innerHTML = vals.map(v => {
    const h = Math.round((v/max)*100);
    return `<div class="bar-wrap"><div class="bar" style="height:${Math.max(h,4)}%"><div class="bar-tooltip">${v>0?'Rp '+v+' Jt':'Kosong'}</div></div></div>`;
  }).join('');
}

function buildLaporanChart() {
  const el = document.getElementById('laporan-chart');
  if (!el) return;
  const vals = Array(12).fill(0);
  DB.invoice.forEach(inv => {
    const m = parseInt((inv.tgl||'').split('-')[1]) - 1;
    if (m >= 0 && m < 12) vals[m] += Math.round(inv.total/1000000);
  });
  const max = Math.max(...vals, 1);
  el.innerHTML = vals.map((v,i) => {
    const h     = Math.round((v/max)*100);
    const color = v===Math.max(...vals)?'linear-gradient(180deg,var(--accent),#f97316)':'linear-gradient(180deg,var(--primary-light),var(--primary))';
    return `<div class="bar-wrap"><div class="bar" style="height:${Math.max(h,4)}%;background:${color}"><div class="bar-tooltip">${v>0?'Rp '+v+' Jt':'—'}</div></div></div>`;
  }).join('');
}

// ================================================================
//   INVOICE
// ================================================================
function addInvItem() {
  const tbody = document.getElementById('inv-items');
  const idx   = invItems.length;
  invItems.push({ nama:'', qty:1, satuan:'', harga:0, total:0 });
  const opts  = DB.barang.map(b => `<option data-harga="${b.hjual}" data-satuan="${b.satuan}">${b.nama}</option>`).join('');
  const row   = document.createElement('tr');
  row.innerHTML = `
    <td><select style="border:1px solid var(--border);border-radius:8px;padding:6px;font-size:12.5px;width:180px;font-family:'Plus Jakarta Sans',sans-serif" onchange="updateItemBarang(${idx},this)">
      <option>Pilih...</option>${opts}</select></td>
    <td><input type="number" value="1" min="1" style="width:60px;border:1px solid var(--border);border-radius:8px;padding:6px;text-align:center" oninput="updateItemQty(${idx},this)"></td>
    <td id="inv-sat-${idx}" style="color:var(--text-muted)">—</td>
    <td id="inv-hp-${idx}"  style="color:var(--text-muted)">Rp 0</td>
    <td id="inv-tot-${idx}" style="font-weight:700">Rp 0</td>
    <td><button class="btn btn-danger btn-icon btn-sm" onclick="removeInvItem(${idx},this.closest('tr'))"><i class="fas fa-trash"></i></button></td>`;
  tbody.appendChild(row);
  hitungTotal();
}

function updateItemBarang(idx, sel) {
  const opt = sel.options[sel.selectedIndex];
  const harga = parseInt(opt.dataset.harga)||0;
  const satuan = opt.dataset.satuan||'—';
  invItems[idx] = { ...invItems[idx], nama:opt.text, harga, satuan, total: harga*(invItems[idx].qty||1) };
  document.getElementById(`inv-sat-${idx}`).textContent = satuan;
  document.getElementById(`inv-hp-${idx}`).textContent  = 'Rp '+harga.toLocaleString('id-ID');
  document.getElementById(`inv-tot-${idx}`).textContent = 'Rp '+invItems[idx].total.toLocaleString('id-ID');
  hitungTotal();
}

function updateItemQty(idx, input) {
  invItems[idx].qty   = parseInt(input.value)||0;
  invItems[idx].total = invItems[idx].harga * invItems[idx].qty;
  const el = document.getElementById(`inv-tot-${idx}`);
  if (el) el.textContent = 'Rp '+invItems[idx].total.toLocaleString('id-ID');
  hitungTotal();
}

function removeInvItem(idx, row) { invItems[idx] = null; row.remove(); hitungTotal(); }

function hitungTotal() {
  const items    = invItems.filter(Boolean);
  const subtotal = items.reduce((s,i)=>s+(i.total||0),0);
  const diskon   = parseFloat(document.getElementById('inv-diskon').value)||0;
  const after    = subtotal*(1-diskon/100);
  const ppn      = after*0.11;
  const total    = after+ppn;
  document.getElementById('inv-subtotal').textContent = 'Rp '+subtotal.toLocaleString('id-ID');
  document.getElementById('inv-ppn').textContent      = 'Rp '+Math.round(ppn).toLocaleString('id-ID');
  document.getElementById('inv-total').textContent    = 'Rp '+Math.round(total).toLocaleString('id-ID');
}

async function simpanInvoice() {
  const mitra = document.getElementById('inv-mitra').value;
  const items = invItems.filter(Boolean);
  if (!mitra || !items.length) { showToast('Pilih mitra dan tambahkan item!', 'error'); return; }
  const subtotal = items.reduce((s,i)=>s+i.total,0);
  const diskon   = parseFloat(document.getElementById('inv-diskon').value)||0;
  const total    = Math.round(subtotal*(1-diskon/100)*1.11);
  invCounter++;
  const noInv = `INV-${new Date().getFullYear()}-${String(invCounter).padStart(4,'0')}`;
  const data  = {
    no:noInv, tgl:document.getElementById('inv-tgl').value,
    mitra, total, status:'Belum Lunas',
    tempo:document.getElementById('inv-tempo').value, items, diskon,
    dibuat_oleh: currentUser.name,
  };
  if (window.FIREBASE_READY) {
    try { await window.FS.addDoc(window.FS.col('invoice'), data); showToast('✅ Invoice tersimpan ke cloud!'); }
    catch(e) { DB.invoice.unshift(data); renderInvoice(); showToast('✅ Invoice dibuat (offline)'); }
  } else { DB.invoice.unshift(data); renderInvoice(); showToast('✅ Invoice berhasil dibuat!'); }
  closeModal('modal-invoice');
  invItems = [];
  document.getElementById('inv-items').innerHTML = '';
  document.getElementById('inv-no').value = `INV-${new Date().getFullYear()}-${String(invCounter).padStart(4,'0')}`;
  hitungTotal();
  addLog('invoice', `Buat invoice ${noInv} — ${mitra} — Rp ${total.toLocaleString('id-ID')}`);
}

async function tandaiLunas(i) {
  const inv = DB.invoice[i];
  if (inv.status === 'Lunas') { showToast('Invoice sudah lunas!', 'info'); return; }
  inv.status = 'Lunas';
  if (window.FIREBASE_READY && inv._id) {
    try { await window.FS.updateDoc(window.FS.docRef('invoice', inv._id), { status:'Lunas' }); }
    catch(e) {}
  }
  renderInvoice();
  showToast('✅ Invoice ditandai Lunas!');
  addLog('edit', `Invoice ${inv.no} ditandai Lunas`);
}

function previewInvoice() {
  const mitra  = document.getElementById('inv-mitra').value || 'Nama Mitra';
  const items  = invItems.filter(Boolean);
  const sub    = items.reduce((s,i)=>s+(i.total||0),0);
  const diskon = parseFloat(document.getElementById('inv-diskon').value)||0;
  const after  = sub*(1-diskon/100);
  const ppn    = after*0.11;
  const total  = after+ppn;
  const rows   = items.map((it,i)=>`
    <tr><td>${i+1}</td><td>${it.nama}</td><td>${it.satuan}</td>
    <td style="text-align:right">${it.qty}</td>
    <td style="text-align:right">Rp ${it.harga.toLocaleString('id-ID')}</td>
    <td style="text-align:right"><strong>Rp ${it.total.toLocaleString('id-ID')}</strong></td></tr>`).join('');
  document.getElementById('invoice-preview-content').innerHTML = invoiceHTML(
    document.getElementById('inv-no').value, document.getElementById('inv-tgl').value,
    document.getElementById('inv-tempo').value, mitra, rows, sub, diskon, ppn, total
  );
  openModal('modal-preview-inv');
}

function showInvoicePreview(i) {
  const inv  = DB.invoice[i];
  const rows = (inv.items||[]).map((it,j)=>`
    <tr><td>${j+1}</td><td>${it.nama}</td><td>${it.satuan}</td>
    <td style="text-align:right">${it.qty}</td>
    <td style="text-align:right">Rp ${it.harga.toLocaleString('id-ID')}</td>
    <td style="text-align:right"><strong>Rp ${it.total.toLocaleString('id-ID')}</strong></td></tr>`).join('');
  const sub    = (inv.items||[]).reduce((s,it)=>s+(it.total||0),0);
  const diskon = inv.diskon||0;
  const after  = sub*(1-diskon/100);
  const ppn    = after*0.11;
  document.getElementById('invoice-preview-content').innerHTML = invoiceHTML(
    inv.no, inv.tgl, inv.tempo, inv.mitra, rows, sub, diskon, ppn, inv.total
  );
  openModal('modal-preview-inv');
}

function invoiceHTML(no, tgl, tempo, mitra, rows, sub, diskon, ppn, total) {
  return `
  <div class="invoice-header">
    <div class="invoice-company">
      <h2>Baitul Ma'mur Syafaah</h2>
      <p>Distributor Sembako Nasional<br>
      Ruko Villa Bogor Indah 5, Bogor, Jawa Barat<br>
      WA: 0812-xxxx-xxxx | Email: info@bms-syafaah.id</p>
    </div>
    <div class="invoice-meta">
      <h1>INVOICE</h1>
      <p>No: <strong>${no}</strong></p>
      <p>Tgl: ${tgl} | Tempo: ${tempo}</p>
    </div>
  </div>
  <div class="invoice-to"><h4>Kepada Yth.</h4><p><strong>${mitra}</strong></p></div>
  <table class="invoice-table">
    <thead><tr><th>No</th><th>Nama Barang</th><th>Satuan</th><th style="text-align:right">Qty</th><th style="text-align:right">Harga</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>${rows||'<tr><td colspan="6" style="text-align:center;padding:20px">Tidak ada item</td></tr>'}</tbody>
  </table>
  <div class="invoice-totals"><table>
    <tr><td>Subtotal</td><td style="text-align:right">Rp ${Math.round(sub).toLocaleString('id-ID')}</td></tr>
    ${diskon>0?`<tr><td>Diskon (${diskon}%)</td><td style="text-align:right;color:var(--danger)">- Rp ${Math.round(sub*diskon/100).toLocaleString('id-ID')}</td></tr>`:''}
    <tr><td>PPN 11%</td><td style="text-align:right">Rp ${Math.round(ppn).toLocaleString('id-ID')}</td></tr>
    <tr class="total-row"><td>TOTAL</td><td style="text-align:right">Rp ${Math.round(total).toLocaleString('id-ID')}</td></tr>
  </table></div>
  <div class="invoice-footer">
    <p>Terima kasih atas kepercayaan Anda di Baitul Ma'mur Syafaah</p>
    <p>Pembayaran via Transfer BCA 123-456-7890 a/n Baitul Ma'mur Syafaah</p>
  </div>`;
}

// ================================================================
//   MITRA
// ================================================================
async function simpanMitra() {
  const nama = document.getElementById('m-nama').value.trim();
  if (!nama) { showToast('Nama mitra wajib diisi!', 'error'); return; }
  const kode = `MTR-${String(DB.mitra.length+1).padStart(3,'0')}`;
  const data = {
    kode, nama,
    tipe : document.getElementById('m-tipe').value,
    pic  : document.getElementById('m-pic').value,
    hp   : document.getElementById('m-hp').value,
    kota : document.getElementById('m-kota').value,
    piutang:0, status:'Aktif',
  };
  if (window.FIREBASE_READY) {
    try { await window.FS.addDoc(window.FS.col('mitra'), data); showToast('✅ Mitra tersimpan ke cloud!'); }
    catch(e) { DB.mitra.push(data); renderMitra(); showToast('✅ Mitra ditambahkan (offline)'); }
  } else { DB.mitra.push(data); renderMitra(); showToast('✅ Mitra ditambahkan!'); }
  fillDropdowns();
  closeModal('modal-mitra');
  ['m-nama','m-pic','m-hp','m-kota'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  addLog('tambah', `Tambah mitra: ${nama} (${data.tipe})`);
}

async function hapusMitra(i) {
  const m = DB.mitra[i];
  if (!confirm(`Hapus mitra "${m.nama}"?`)) return;
  if (window.FIREBASE_READY && m._id) {
    try { await window.FS.deleteDoc(window.FS.docRef('mitra', m._id)); showToast('🗑️ Mitra dihapus!'); }
    catch(e) { DB.mitra.splice(i,1); renderMitra(); }
  } else { DB.mitra.splice(i,1); renderMitra(); showToast('🗑️ Mitra dihapus!'); }
  addLog('hapus', `Hapus mitra: ${m.nama}`);
}

function chatMitra(nama) {
  toggleChat();
  showToast(`💬 Mulai chat — mention ${nama}`);
}

// ================================================================
//   STOK
// ================================================================
async function simpanStokMasuk() {
  const nama = document.getElementById('sm-barang').value;
  const qty  = parseInt(document.getElementById('sm-qty').value)||0;
  if (!nama || qty<=0) { showToast('Lengkapi data stok masuk!', 'error'); return; }
  const b = DB.barang.find(b=>b.nama===nama);
  if (!b) return;
  b.stok += qty; b.masuk = (b.masuk||0) + qty;
  if (window.FIREBASE_READY && b._id) {
    try { await window.FS.updateDoc(window.FS.docRef('barang', b._id), { stok:b.stok, masuk:b.masuk }); }
    catch(e) {}
  }
  renderStok(); renderBarang(); renderStokKritis();
  closeModal('modal-stok-masuk');
  showToast(`✅ Stok ${nama} +${qty}!`);
  addLog('stok', `Stok masuk: ${nama} +${qty} (total: ${b.stok})`);
}

async function simpanStokKeluar() {
  const nama = document.getElementById('sk-barang').value;
  const qty  = parseInt(document.getElementById('sk-qty').value)||0;
  if (!nama || qty<=0) { showToast('Lengkapi data stok keluar!', 'error'); return; }
  const b = DB.barang.find(b=>b.nama===nama);
  if (!b) return;
  if (b.stok < qty) { showToast('❌ Stok tidak mencukupi!', 'error'); return; }
  b.stok -= qty; b.keluar = (b.keluar||0) + qty;
  if (window.FIREBASE_READY && b._id) {
    try { await window.FS.updateDoc(window.FS.docRef('barang', b._id), { stok:b.stok, keluar:b.keluar }); }
    catch(e) {}
  }
  renderStok(); renderBarang(); renderStokKritis();
  closeModal('modal-stok-keluar');
  showToast(`✅ Stok keluar ${nama} -${qty}!`);
  addLog('stok', `Stok keluar: ${nama} -${qty} (sisa: ${b.stok})`);
}

// ================================================================
//   KEUANGAN
// ================================================================
async function simpanPengeluaran() {
  const ket = document.getElementById('pe-ket').value.trim();
  const jml = parseInt(document.getElementById('pe-jml').value)||0;
  if (!ket || jml<=0) { showToast('Lengkapi data pengeluaran!', 'error'); return; }
  const data = { tgl:document.getElementById('pe-tgl').value, ket, jml, kat:document.getElementById('pe-kat').value, dicatat_oleh:currentUser.name };
  if (window.FIREBASE_READY) {
    try { await window.FS.addDoc(window.FS.col('pengeluaran'), data); showToast('✅ Pengeluaran tersimpan!'); }
    catch(e) { DB.pengeluaran.unshift(data); renderPengeluaran(); }
  } else { DB.pengeluaran.unshift(data); renderPengeluaran(); showToast('✅ Pengeluaran dicatat!'); }
  closeModal('modal-pengeluaran');
  addLog('tambah', `Pengeluaran: ${ket} — Rp ${jml.toLocaleString('id-ID')}`);
}

async function simpanPembelian() {
  const pemasok = document.getElementById('pb-pemasok').value;
  const barang  = document.getElementById('pb-barang').value;
  const qty     = parseInt(document.getElementById('pb-qty').value)||0;
  const harga   = parseInt(document.getElementById('pb-harga').value)||0;
  if (!pemasok || !barang || qty<=0) { showToast('Lengkapi data pembelian!', 'error'); return; }
  const data = { tgl:document.getElementById('pb-tgl').value, pemasok, barang, total:qty*harga };
  if (window.FIREBASE_READY) {
    try { await window.FS.addDoc(window.FS.col('pembelian'), data); showToast('✅ Pembelian tersimpan!'); }
    catch(e) { DB.pembelian.unshift(data); renderPembelian(); }
  } else { DB.pembelian.unshift(data); renderPembelian(); showToast('✅ Pembelian dicatat!'); }
  closeModal('modal-pembelian');
  addLog('tambah', `Pembelian: ${barang} dari ${pemasok} — Rp ${(qty*harga).toLocaleString('id-ID')}`);
}

// ================================================================
//   EXPORT CSV
// ================================================================
function exportCSV(type) {
  const maps = {
    barang  : { h:['Kode','Nama','Kategori','Satuan','H.Beli','H.Jual','Stok','Min Stok','Lokasi'], d: DB.barang.map(b=>[b.kode,b.nama,b.kategori,b.satuan,b.hbeli,b.hjual,b.stok,b.minStok,b.lokasi||'']) },
    invoice : { h:['No Invoice','Tanggal','Mitra','Total','Status','Jatuh Tempo','Dibuat Oleh'], d: DB.invoice.map(i=>[i.no,i.tgl,i.mitra,i.total,i.status,i.tempo,i.dibuat_oleh||'']) },
    mitra   : { h:['Kode','Nama','Tipe','PIC','HP','Kota','Piutang'], d: DB.mitra.map(m=>[m.kode,m.nama,m.tipe,m.pic,m.hp,m.kota,m.piutang]) },
    stok    : { h:['Kode','Nama','Masuk','Keluar','Stok','Min Stok'], d: DB.barang.map(b=>[b.kode,b.nama,b.masuk||0,b.keluar||0,b.stok,b.minStok]) },
    log     : { h:['User','Role','Aksi','Detail','Waktu'], d: DB.log.map(l=>[l.user,l.role,l.aksi,l.detail,l.waktu]) },
  };
  const m = maps[type]; if (!m) return;
  const csv  = [m.h.join(','), ...m.d.map(r=>r.map(v=>`"${v}"`).join(','))].join('\n');
  const blob = new Blob(['\uFEFF'+csv], { type:'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `BMS_${type}_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  showToast(`📊 Export ${type} berhasil!`);
  addLog('tambah', `Export CSV: ${type}`);
}

// ================================================================
//   SEARCH & DATE & TOAST
// ================================================================
function setDefaultDates() {
  const today = new Date().toISOString().split('T')[0];
  ['inv-tgl','pe-tgl','sm-tgl','sk-tgl','pb-tgl'].forEach(f => { const el=document.getElementById(f); if(el)el.value=today; });
  const tempo = new Date(); tempo.setDate(tempo.getDate()+30);
  const et = document.getElementById('inv-tempo'); if(et) et.value=tempo.toISOString().split('T')[0];
}

function fillDropdowns() {
  const mitraOpts   = DB.mitra.map(m=>`<option>${m.nama}</option>`).join('');
  const barangOpts  = DB.barang.map(b=>`<option>${b.nama}</option>`).join('');
  const pemasokOpts = DB.mitra.filter(m=>m.tipe==='Pemasok').map(m=>`<option>${m.nama}</option>`).join('');
  ['inv-mitra'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML='<option value="">Pilih Mitra...</option>'+mitraOpts;});
  ['sm-barang','sk-barang','pb-barang'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML='<option value="">Pilih Barang...</option>'+barangOpts;});
  ['sm-pemasok','pb-pemasok'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML='<option value="">Pilih Pemasok...</option>'+pemasokOpts;});
}

function previewFoto(event) {
  const prev = document.getElementById('foto-preview');
  prev.innerHTML = '';
  Array.from(event.target.files).slice(0,4).forEach(file => {
    const reader = new FileReader();
    reader.onload = e => { const img=document.createElement('img'); img.src=e.target.result; prev.appendChild(img); };
    reader.readAsDataURL(file);
  });
}

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
  const icons = { success:'fa-check-circle', error:'fa-times-circle', info:'fa-info-circle', warning:'fa-exclamation-circle' };
  icon.className    = 'fas '+(icons[type]||'fa-check-circle');
  icon.style.color  = type==='error'?'#ef4444':type==='warning'?'#f59e0b':type==='info'?'#2563a8':'#10b981';
  toast.style.display = 'flex';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>{ toast.style.display='none'; }, 3500);
}

// ================================================================
//   SEARCH
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
  updateDate();
  restoreSession();

  const searches = [
    { input:'search-barang',  rows:'#tbody-barang tr' },
    { input:'search-invoice', rows:'#tbody-invoice tr' },
    { input:'search-mitra',   rows:'#tbody-mitra tr' },
    { input:'search-stok',    rows:'#tbody-stok tr' },
    { input:'search-log',     rows:'#tbody-log tr' },
  ];
  searches.forEach(({ input, rows }) => {
    const el = document.getElementById(input);
    if (el) el.addEventListener('input', e => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll(rows).forEach(r => {
        r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  });

  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeOut { to { opacity:0; transform:translateY(-10px); } }
  `;
  document.head.appendChild(style);

  window.addEventListener('load', () => {
    setTimeout(() => {
      if (!window.FIREBASE_READY) {
        const txt = document.getElementById('fb-status-text');
        const el  = document.getElementById('fb-status');
        if (txt) txt.textContent = '⚠️ Firebase belum tersambung — cek koneksi';
      }
    }, 5000);
  });
});
