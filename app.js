// ================================================================
//   BMS — app.js
//   Logika utama: login, navigasi, render tabel, CRUD,
//   Firebase sync, chat internal, export CSV
//   Bergantung pada firebase.js yang harus dimuat lebih dulu
// ================================================================

// ===== USERS =====
const USERS = {
  owner: { pass:'bms2024', name:'Owner BMS', label:'Pemilik / Administrator', avatar:'O', menus:['dashboard','barang','invoice','stok','mitra','keuangan','laporan','tutorial'] },
  admin: { pass:'bms2024', name:'Admin Rina', label:'Admin Keuangan', avatar:'R', menus:['dashboard','invoice','stok','keuangan','mitra'] },
  sales: { pass:'bms2024', name:'Sales Budi', label:'Tim Sales', avatar:'B', menus:['dashboard','stok','invoice','mitra'] },
};

const MENU_CONFIG = [
  { id:'dashboard', label:'Dashboard', icon:'fa-gauge', sub:'Ringkasan bisnis hari ini' },
  { id:'barang', label:'Data Barang', icon:'fa-box-open', sub:'Kelola produk & inventaris' },
  { id:'invoice', label:'Invoice', icon:'fa-file-invoice', sub:'Buat & kelola invoice', badge:42 },
  { id:'stok', label:'Info Stok', icon:'fa-warehouse', sub:'Informasi stok barang' },
  { id:'mitra', label:'Mitra Bisnis', icon:'fa-handshake', sub:'Pelanggan & pemasok' },
  { id:'keuangan', label:'Keuangan', icon:'fa-chart-line', sub:'Laporan keuangan' },
  { id:'laporan', label:'Laporan & Analitik', icon:'fa-chart-bar', sub:'Analisis performa' },
  { id:'tutorial', label:'Panduan & Deploy', icon:'fa-circle-question', sub:'Cara setup & upload' },
];

let currentUser = null;
let selectedRole = 'owner';
let invItems = [];
let invCounter = 893;

// ===== DATA =====
const DB = {
  barang: [
    { kode:'BRS-001', nama:'Beras Premium 5kg', kategori:'Beras & Tepung', satuan:'Karung', hbeli:65000, hjual:72000, stok:450, minStok:50, masuk:600, keluar:150, foto:[], lokasi:'Rak A-1' },
    { kode:'MNY-001', nama:'Minyak Goreng 5L', kategori:'Minyak & Lemak', satuan:'Dus', hbeli:68000, hjual:76000, stok:8, minStok:20, masuk:100, keluar:92, foto:[], lokasi:'Rak B-2' },
    { kode:'GUL-001', nama:'Gula Pasir 50kg', kategori:'Gula & Pemanis', satuan:'Karung', hbeli:640000, hjual:710000, stok:12, minStok:15, masuk:80, keluar:68, foto:[], lokasi:'Rak C-1' },
    { kode:'TPG-001', nama:'Tepung Terigu 25kg', kategori:'Beras & Tepung', satuan:'Karung', hbeli:155000, hjual:175000, stok:25, minStok:30, masuk:120, keluar:95, foto:[], lokasi:'Rak A-3' },
    { kode:'KCP-001', nama:'Kecap Manis 620ml', kategori:'Bumbu & Rempah', satuan:'Karton', hbeli:72000, hjual:85000, stok:30, minStok:25, masuk:50, keluar:20, foto:[], lokasi:'Rak D-4' },
    { kode:'GRM-001', nama:'Garam Dapur 500g', kategori:'Bumbu & Rempah', satuan:'Dus', hbeli:18000, hjual:22000, stok:180, minStok:50, masuk:200, keluar:20, foto:[], lokasi:'Rak D-1' },
  ],
  invoice: [
    { no:'INV-2025-0892', tgl:'2025-01-20', mitra:'PT Sinar Mas', total:52450000, status:'Belum Lunas', tempo:'2025-02-20' },
    { no:'INV-2025-0891', tgl:'2025-01-18', mitra:'UD Maju Jaya', total:28900000, status:'Lunas', tempo:'2025-02-17' },
    { no:'INV-2025-0890', tgl:'2025-01-15', mitra:'CV Berkah Indah', total:15600000, status:'Jatuh Tempo', tempo:'2025-01-15' },
    { no:'INV-2025-0889', tgl:'2025-01-12', mitra:'Toko Makmur', total:8750000, status:'Lunas', tempo:'2025-02-12' },
    { no:'INV-2025-0888', tgl:'2025-01-10', mitra:'PT Fajar Sejahtera', total:67000000, status:'Belum Lunas', tempo:'2025-02-10' },
  ],
  mitra: [
    { kode:'MTR-001', nama:'PT Sinar Mas', tipe:'Pelanggan', pic:'Bapak Santoso', hp:'0812-1111-2222', kota:'Jakarta', piutang:52450000, status:'Aktif' },
    { kode:'MTR-002', nama:'UD Maju Jaya', tipe:'Pelanggan', pic:'Ibu Dewi', hp:'0813-3333-4444', kota:'Bogor', piutang:0, status:'Aktif' },
    { kode:'MTR-003', nama:'CV Gula Nusantara', tipe:'Pemasok', pic:'Pak Herman', hp:'0821-5555-6666', kota:'Surabaya', piutang:0, status:'Aktif' },
    { kode:'MTR-004', nama:'CV Berkah Indah', tipe:'Pelanggan', pic:'Ibu Sari', hp:'0856-7777-8888', kota:'Depok', piutang:15600000, status:'Aktif' },
    { kode:'MTR-005', nama:'PT Beras Jaya', tipe:'Pemasok', pic:'Pak Heru', hp:'0878-9999-0000', kota:'Bandung', piutang:0, status:'Aktif' },
  ],
  pengeluaran: [
    { tgl:'2025-01-20', ket:'Gaji Karyawan Jan', jml:18000000, kat:'Gaji & Tunjangan' },
    { tgl:'2025-01-15', ket:'Listrik & Air Gudang', jml:2400000, kat:'Listrik & Air' },
    { tgl:'2025-01-10', ket:'Transport & BBM', jml:3500000, kat:'Transport' },
  ],
  pembelian: [
    { tgl:'2025-01-19', pemasok:'PT Beras Jaya', barang:'Beras Premium 5kg', total:130000000 },
    { tgl:'2025-01-15', pemasok:'CV Gula Nusantara', barang:'Gula Pasir 50kg', total:87000000 },
  ],
  notifikasi: [
    { id:1, pesan:'Stok Gula Pasir kritis — sisa 12 karung', waktu:'2 menit lalu', tipe:'danger', baca:false },
    { id:2, pesan:'Invoice INV-2025-0890 sudah jatuh tempo', waktu:'1 jam lalu', tipe:'warning', baca:false },
    { id:3, pesan:'Mitra baru: CV Berkah Jaya Makmur', waktu:'3 jam lalu', tipe:'success', baca:false },
    { id:4, pesan:'Stok Minyak Goreng hampir habis — sisa 8 dus', waktu:'Kemarin', tipe:'danger', baca:true },
    { id:5, pesan:'Pembayaran Rp 45 Jt diterima dari UD Maju Jaya', waktu:'Kemarin', tipe:'success', baca:true },
  ],
};

// ===== CHAT DATA =====
let chatMessages = [
  { id:1, sender:'Admin Rina', avatar:'R', text:'Selamat pagi! Stok gula hampir habis ya, segera order.', time:'09.15', mine:false },
  { id:2, sender:'Owner', avatar:'O', text:'Iya sudah saya kontak pemasok tadi. PO sudah dikirim.', time:'09.18', mine:true },
  { id:3, sender:'Sales Budi', avatar:'B', text:'Ada order besar dari PT Sinar Mas, 500 karung beras. Bisa dipenuhi?', time:'09.45', mine:false },
];

let chatOpen = false;
let activeChatTab = 'messages';

// ===== LOGIN =====
function selectRole(role) {
  selectedRole = role;
  document.querySelectorAll('.role-btn').forEach(c => c.classList.remove('active'));
  document.getElementById('role-'+role).classList.add('active');
  const creds = { owner:['owner','bms2024'], admin:['admin','bms2024'], sales:['sales','bms2024'] };
  document.getElementById('login-user').value = creds[role][0];
  document.getElementById('login-pass').value = creds[role][1];
}

function doLogin() {
  const u = document.getElementById('login-user').value.trim();
  const p = document.getElementById('login-pass').value.trim();
  const user = USERS[u];
  if (!user || user.pass !== p) {
    showToast('❌ Username atau password salah!', 'error');
    document.getElementById('login-pass').style.borderColor='rgba(239,68,68,0.7)';
    setTimeout(()=>document.getElementById('login-pass').style.borderColor='',2000);
    return;
  }
  currentUser = { ...user, username: u };
  // Simpan session ke localStorage agar tidak logout saat refresh
  localStorage.setItem('bms_session', JSON.stringify({ username: u }));
  applySession(currentUser);
}

function applySession(user) {
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  document.getElementById('sb-avatar').textContent = user.avatar;
  document.getElementById('sb-name').textContent = user.name;
  document.getElementById('sb-role').textContent = user.label;
  buildNav(user.menus);
  applyRoleRestrictions(user.username);
  initData();
  navigateTo('dashboard');
  updateDate();
  renderNotifications();
  renderStokKritis();
  if (document.getElementById('login-page').style.display === 'none')
    showToast(`✅ Selamat datang, ${user.name}!`);
}

function doLogout() {
  if (!confirm('Yakin ingin keluar?')) return;
  localStorage.removeItem('bms_session');
  document.getElementById('login-page').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  currentUser = null;
}

// Restore session saat halaman di-refresh
function restoreSession() {
  const saved = localStorage.getItem('bms_session');
  if (!saved) return;
  try {
    const { username } = JSON.parse(saved);
    const user = USERS[username];
    if (!user) { localStorage.removeItem('bms_session'); return; }
    currentUser = { ...user, username };
    applySession(currentUser);
  } catch(e) {
    localStorage.removeItem('bms_session');
  }
}

// Terapkan pembatasan UI berdasarkan role
function applyRoleRestrictions(username) {
  const isSales = (username === 'sales');
  // Sembunyikan tombol Tambah Barang untuk sales
  const btnTambahBarang = document.getElementById('btn-tambah-barang');
  if (btnTambahBarang) btnTambahBarang.style.display = isSales ? 'none' : '';
  // Untuk stok page: sales hanya lihat — sembunyikan tombol Stok Masuk/Keluar
  const stokBtns = document.querySelectorAll('#page-stok .btn-success, #page-stok .btn-danger');
  stokBtns.forEach(btn => btn.style.display = isSales ? 'none' : '');
  // Update judul halaman stok untuk sales
  const stokTitle = document.querySelector('#page-stok .card-header h3');
  if (stokTitle) {
    stokTitle.innerHTML = isSales
      ? '<i class="fas fa-warehouse" style="color:var(--primary-light)"></i>Info Stok Barang <span style="font-size:12px;color:var(--text-muted);font-weight:400">(read-only)</span>'
      : '<i class="fas fa-warehouse" style="color:var(--primary-light)"></i>Rekap Stok Barang';
  }
}

// ===== NAV =====
function buildNav(allowed) {
  const nav = document.getElementById('sidebar-nav');
  nav.innerHTML = '<div class="nav-label">MENU UTAMA</div>';
  MENU_CONFIG.filter(m => allowed.includes(m.id)).forEach(m => {
    const el = document.createElement('div');
    el.className = 'nav-item';
    el.id = 'nav-'+m.id;
    el.onclick = () => { navigateTo(m.id); if(window.innerWidth<=768) toggleSidebar(); };
    let badge = '';
    if(m.badge) badge = `<span class="nav-badge">${m.badge}</span>`;
    el.innerHTML = `<i class="fas ${m.icon}"></i> <span>${m.label}</span>${badge}`;
    nav.appendChild(el);
  });
}

function navigateTo(id) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const navEl = document.getElementById('nav-'+id);
  if (navEl) navEl.classList.add('active');
  const pageEl = document.getElementById('page-'+id);
  if (pageEl) pageEl.classList.add('active');
  const cfg = MENU_CONFIG.find(m => m.id === id);
  if(cfg) {
    document.getElementById('page-title').textContent = cfg.label;
    document.getElementById('page-sub').textContent = cfg.sub;
  }
  if(id === 'laporan') buildLaporanChart();
}

// ===== INIT =====
function initData() {
  if (window.FIREBASE_READY) {
    loadAllFromFirestore();
  } else {
    // Tunggu Firebase siap (maks 3 detik), lalu load
    let waited = 0;
    const waitFB = setInterval(() => {
      waited += 200;
      if (window.FIREBASE_READY) {
        clearInterval(waitFB);
        loadAllFromFirestore();
      } else if (waited >= 3000) {
        clearInterval(waitFB);
        // Firebase tidak tersedia — pakai data lokal
        renderAll();
        showToast('⚠️ Mode offline — data lokal aktif', 'warning');
      }
    }, 200);
  }
  buildMainChart();
  fillDropdowns();
  setDefaultDates();
  renderChatMessages();
  renderContactsList();
  document.getElementById('inv-no').value = `INV-2025-0${invCounter}`;
  document.getElementById('m-kode').value = `MTR-${String(DB.mitra.length+1).padStart(3,'0')}`;
}

function renderAll() {
  renderBarang(); renderInvoice(); renderStok();
  renderMitra(); renderPengeluaran(); renderPembelian();
  renderStokKritis(); buildMainChart(); fillDropdowns();
  // Re-terapkan pembatasan role setelah render ulang
  if (currentUser) applyRoleRestrictions(currentUser.username);
}

// ===== FIRESTORE: LOAD SEMUA DATA =====
async function loadAllFromFirestore() {
  const { FS } = window;
  updateFBStatus('loading');
  try {
    // Load paralel semua koleksi
    const [snapBarang, snapInvoice, snapMitra, snapPengeluaran, snapPembelian] = await Promise.all([
      FS.getDocs(FS.query(FS.col('barang'),   FS.orderBy('_ts', 'desc'))),
      FS.getDocs(FS.query(FS.col('invoice'),  FS.orderBy('_ts', 'desc'))),
      FS.getDocs(FS.query(FS.col('mitra'),    FS.orderBy('_ts', 'desc'))),
      FS.getDocs(FS.query(FS.col('pengeluaran'), FS.orderBy('_ts', 'desc'))),
      FS.getDocs(FS.query(FS.col('pembelian'), FS.orderBy('_ts', 'desc'))),
    ]);

    // Kalau Firestore masih kosong, seed data demo ke cloud
    if (snapBarang.empty && snapInvoice.empty) {
      await seedDemoData();
    } else {
      if (!snapBarang.empty)    DB.barang      = snapBarang.docs.map(d    => ({ _id: d.id, ...d.data() }));
      if (!snapInvoice.empty)   DB.invoice     = snapInvoice.docs.map(d   => ({ _id: d.id, ...d.data() }));
      if (!snapMitra.empty)     DB.mitra       = snapMitra.docs.map(d     => ({ _id: d.id, ...d.data() }));
      if (!snapPengeluaran.empty) DB.pengeluaran = snapPengeluaran.docs.map(d => ({ _id: d.id, ...d.data() }));
      if (!snapPembelian.empty) DB.pembelian   = snapPembelian.docs.map(d => ({ _id: d.id, ...d.data() }));
    }

    // Setup realtime listeners setelah load awal
    setupRealtimeListeners();
    renderAll();
    updateFBStatus('online');
    showToast('☁️ Data berhasil dimuat dari Firebase!', 'success');
  } catch(err) {
    console.error('Firestore load error:', err);
    updateFBStatus('offline');
    renderAll();
    showToast('⚠️ Gagal koneksi Firebase — pakai data lokal', 'warning');
  }
}

// ===== REALTIME LISTENERS =====
function setupRealtimeListeners() {
  const { FS } = window;
  // Barang — realtime sync
  FS.onSnapshot(FS.query(FS.col('barang'), FS.orderBy('_ts','desc')), snap => {
    if(!snap.empty) { DB.barang = snap.docs.map(d => ({ _id: d.id, ...d.data() })); renderBarang(); renderStok(); renderStokKritis(); fillDropdowns(); buildMainChart(); }
  });
  // Invoice
  FS.onSnapshot(FS.query(FS.col('invoice'), FS.orderBy('_ts','desc')), snap => {
    if(!snap.empty) { DB.invoice = snap.docs.map(d => ({ _id: d.id, ...d.data() })); renderInvoice(); buildMainChart(); }
  });
  // Mitra
  FS.onSnapshot(FS.query(FS.col('mitra'), FS.orderBy('_ts','desc')), snap => {
    if(!snap.empty) { DB.mitra = snap.docs.map(d => ({ _id: d.id, ...d.data() })); renderMitra(); fillDropdowns(); }
  });
  // Pengeluaran
  FS.onSnapshot(FS.query(FS.col('pengeluaran'), FS.orderBy('_ts','desc')), snap => {
    if(!snap.empty) { DB.pengeluaran = snap.docs.map(d => ({ _id: d.id, ...d.data() })); renderPengeluaran(); }
  });
  // Pembelian
  FS.onSnapshot(FS.query(FS.col('pembelian'), FS.orderBy('_ts','desc')), snap => {
    if(!snap.empty) { DB.pembelian = snap.docs.map(d => ({ _id: d.id, ...d.data() })); renderPembelian(); }
  });
}

// ===== SEED DATA DEMO KE FIRESTORE =====
async function seedDemoData() {
  const { FS } = window;
  showToast('⏳ Menginisialisasi database...', 'info');
  const demoBatch = [
    ...DB.barang.map(b      => FS.addDoc(FS.col('barang'),      b)),
    ...DB.invoice.map(i     => FS.addDoc(FS.col('invoice'),     i)),
    ...DB.mitra.map(m       => FS.addDoc(FS.col('mitra'),       m)),
    ...DB.pengeluaran.map(p => FS.addDoc(FS.col('pengeluaran'), p)),
    ...DB.pembelian.map(p   => FS.addDoc(FS.col('pembelian'),   p)),
  ];
  await Promise.all(demoBatch);
  showToast('✅ Data demo berhasil disimpan ke Firebase!');
}

// ===== STATUS INDICATOR =====
function updateFBStatus(state) {
  const el = document.getElementById('fb-status');
  const txt = document.getElementById('fb-status-text');
  if (!el || !txt) return;
  const states = {
    online  : { cls: 'online',  text: '☁️ Firebase terhubung — data tersimpan di cloud' },
    offline : { cls: 'offline', text: '⚠️ Offline — data lokal aktif' },
    loading : { cls: 'offline', text: '🔄 Menghubungkan ke Firebase...' },
  };
  const s = states[state] || states.offline;
  el.className = `firebase-status ${s.cls}`;
  txt.textContent = s.text;
}

function setDefaultDates() {
  const today = new Date().toISOString().split('T')[0];
  ['inv-tgl','pe-tgl','sm-tgl','sk-tgl','pb-tgl'].forEach(f => { const el=document.getElementById(f); if(el)el.value=today; });
  const tempo = new Date(); tempo.setDate(tempo.getDate()+30);
  document.getElementById('inv-tempo').value = tempo.toISOString().split('T')[0];
}

function fillDropdowns() {
  const mitraOpts = DB.mitra.map(m => `<option>${m.nama}</option>`).join('');
  const barangOpts = DB.barang.map(b => `<option>${b.nama}</option>`).join('');
  const pemasokOpts = DB.mitra.filter(m => m.tipe==='Pemasok').map(m => `<option>${m.nama}</option>`).join('');
  ['inv-mitra'].forEach(id => { const el=document.getElementById(id); if(el) el.innerHTML='<option value="">Pilih Mitra...</option>'+mitraOpts; });
  ['sm-barang','sk-barang','pb-barang'].forEach(id => { const el=document.getElementById(id); if(el) el.innerHTML='<option value="">Pilih Barang...</option>'+barangOpts; });
  ['sm-pemasok','pb-pemasok'].forEach(id => { const el=document.getElementById(id); if(el) el.innerHTML='<option value="">Pilih Pemasok...</option>'+pemasokOpts; });
}

// ===== RENDER TABLES =====
function renderBarang() {
  const tbody = document.getElementById('tbody-barang');
  const badge = document.getElementById('total-barang-badge');
  if(badge) badge.textContent = DB.barang.length + ' Item';
  const canEdit = currentUser && (currentUser.username === 'owner' || currentUser.username === 'admin');
  tbody.innerHTML = DB.barang.map((b,i) => `
    <tr>
      <td><div style="width:44px;height:44px;border-radius:10px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:22px">📦</div></td>
      <td><code style="background:#f1f5f9;padding:2px 8px;border-radius:6px;font-size:12px;font-weight:700">${b.kode}</code></td>
      <td><strong>${b.nama}</strong><br><span style="font-size:11.5px;color:var(--text-muted)">${b.lokasi||''}</span></td>
      <td><span class="badge badge-blue">${b.kategori}</span></td>
      <td>${b.satuan}</td>
      <td>Rp ${b.hbeli.toLocaleString('id-ID')}</td>
      <td><strong>Rp ${b.hjual.toLocaleString('id-ID')}</strong></td>
      <td class="${b.stok<=b.minStok?'stock-low':'stock-ok'}">${b.stok}</td>
      <td><span class="badge ${b.stok<=b.minStok?'badge-red':'badge-green'}">${b.stok<=b.minStok?'⚠️ Kritis':'✅ Aman'}</span></td>
      <td>
        ${canEdit ? `<div style="display:flex;gap:6px">
          <button class="btn btn-outline btn-icon btn-sm" title="Edit" onclick="editBarang(${i})"><i class="fas fa-edit"></i></button>
          <button class="btn btn-danger btn-icon btn-sm" title="Hapus" onclick="hapusBarang(${i})"><i class="fas fa-trash"></i></button>
        </div>` : '<span style="color:var(--text-muted);font-size:12px">—</span>'}
      </td>
    </tr>`).join('');
}

function renderInvoice() {
  document.getElementById('tbody-invoice').innerHTML = DB.invoice.map((inv,i) => `
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
          <button class="btn btn-success btn-icon btn-sm" onclick="tandaiLunas(${i})" title="Tandai Lunas"><i class="fas fa-check"></i></button>
          <button class="btn btn-primary btn-icon btn-sm" onclick="window.print()" title="Cetak"><i class="fas fa-print"></i></button>
        </div>
      </td>
    </tr>`).join('');
}

function renderStok() {
  document.getElementById('tbody-stok').innerHTML = DB.barang.map((b,i) => `
    <tr>
      <td><code style="background:#f1f5f9;padding:2px 8px;border-radius:6px;font-size:12px">${b.kode}</code></td>
      <td><strong>${b.nama}</strong></td>
      <td><span class="badge badge-blue">${b.kategori}</span></td>
      <td style="color:var(--accent2);font-weight:700">+${b.masuk}</td>
      <td style="color:var(--danger);font-weight:700">-${b.keluar}</td>
      <td class="${b.stok<=b.minStok?'stock-low':'stock-ok'}" style="font-size:15px;font-weight:800">${b.stok}</td>
      <td style="color:var(--text-muted)">${b.minStok}</td>
      <td><span class="badge ${b.stok<=b.minStok?'badge-red':'badge-green'}">${b.stok<=b.minStok?'⚠️ Kritis':'✅ Aman'}</span></td>
    </tr>`).join('');
}

function renderMitra() {
  document.getElementById('tbody-mitra').innerHTML = DB.mitra.map((m,i) => `
    <tr>
      <td><code style="background:#f1f5f9;padding:2px 8px;border-radius:6px;font-size:12px">${m.kode}</code></td>
      <td><strong>${m.nama}</strong></td>
      <td><span class="badge ${m.tipe==='Pelanggan'?'badge-blue':'badge-green'}">${m.tipe}</span></td>
      <td>${m.pic||'-'}</td>
      <td>${m.hp||'-'}</td>
      <td>${m.kota||'-'}</td>
      <td>${m.piutang>0?'<span class="badge badge-amber">Rp '+m.piutang.toLocaleString('id-ID')+'</span>':'-'}</td>
      <td><span class="badge badge-green">${m.status}</span></td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-outline btn-icon btn-sm" onclick="chatMitra('${m.nama}')" title="Chat"><i class="fas fa-comment"></i></button>
          <button class="btn btn-danger btn-icon btn-sm" onclick="hapusMitra(${i})" title="Hapus"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`).join('');
}

function renderPengeluaran() {
  document.getElementById('tbody-pengeluaran').innerHTML = DB.pengeluaran.map((p,i) => `
    <tr>
      <td>${p.tgl}</td>
      <td>${p.ket}</td>
      <td><span class="badge badge-purple">${p.kat}</span></td>
      <td style="color:var(--danger);font-weight:700">Rp ${p.jml.toLocaleString('id-ID')}</td>
    </tr>`).join('');
}

function renderPembelian() {
  document.getElementById('tbody-pembelian').innerHTML = DB.pembelian.map((p,i) => `
    <tr>
      <td>${p.tgl}</td>
      <td>${p.pemasok}</td>
      <td>${p.barang}</td>
      <td style="font-weight:700">Rp ${p.total.toLocaleString('id-ID')}</td>
    </tr>`).join('');
}

// ===== STOK KRITIS =====
function renderStokKritis() {
  const list = document.getElementById('stok-kritis-list');
  if(!list) return;
  const kritis = DB.barang.filter(b => b.stok <= b.minStok);
  list.innerHTML = kritis.map(b => `
    <div class="act-item">
      <div class="act-dot" style="background:rgba(239,68,68,0.1);color:var(--danger)"><i class="fas fa-box"></i></div>
      <div class="act-text">
        <p style="font-weight:700">${b.nama}</p>
        <span class="stock-low">Sisa ${b.stok} ${b.satuan} ⚠️ Min: ${b.minStok}</span>
      </div>
    </div>`).join('') || '<div style="padding:20px;text-align:center;color:var(--text-muted)">✅ Semua stok aman</div>';
}

// ===== CHARTS =====
function buildMainChart() {
  const data = [620,710,680,780,840,847];
  const max = Math.max(...data);
  const el = document.getElementById('main-chart');
  if(!el) return;
  el.innerHTML = data.map((v,i)=>{
    const h = Math.round((v/max)*100);
    return `<div class="bar-wrap">
      <div class="bar" style="height:${h}%">
        <div class="bar-tooltip">Rp ${v} Jt</div>
      </div>
    </div>`;
  }).join('');
}

function buildLaporanChart() {
  const data = [580,640,620,710,690,780,800,820,760,840,880,847];
  const max = Math.max(...data);
  const el = document.getElementById('laporan-chart');
  if(!el) return;
  el.innerHTML = data.map((v,i)=>{
    const h = Math.round((v/max)*100);
    const color = v===max?'linear-gradient(180deg,var(--accent),#f97316)':'linear-gradient(180deg,var(--primary-light),var(--primary))';
    return `<div class="bar-wrap">
      <div class="bar" style="height:${h}%;background:${color}">
        <div class="bar-tooltip">Rp ${v} Jt</div>
      </div>
    </div>`;
  }).join('');
}

// ===== NOTIFICATIONS =====
function renderNotifications() {
  const list = document.getElementById('notif-list');
  const unread = DB.notifikasi.filter(n => !n.baca).length;
  document.getElementById('notif-dot').style.display = unread ? '' : 'none';

  const iconMap = { danger:'fa-exclamation-circle', warning:'fa-clock', success:'fa-check-circle', info:'fa-info-circle' };
  const colorMap = { danger:'rgba(239,68,68,0.1)', warning:'rgba(245,158,11,0.1)', success:'rgba(16,185,129,0.1)', info:'rgba(37,99,168,0.1)' };
  const fgMap = { danger:'var(--danger)', warning:'var(--accent)', success:'var(--accent2)', info:'var(--primary-light)' };

  list.innerHTML = DB.notifikasi.map((n,i) => `
    <div class="notif-item" onclick="bacaNotif(${i})">
      <div class="notif-icon" style="background:${colorMap[n.tipe]};color:${fgMap[n.tipe]}"><i class="fas ${iconMap[n.tipe]}"></i></div>
      <div style="flex:1">
        <p>${n.pesan}</p>
        <span>${n.waktu}</span>
      </div>
      ${!n.baca ? '<div class="unread-dot"></div>' : ''}
    </div>`).join('');
}

function bacaNotif(i) {
  DB.notifikasi[i].baca = true;
  renderNotifications();
}

function markAllRead() {
  DB.notifikasi.forEach(n => n.baca = true);
  renderNotifications();
  showToast('✅ Semua notifikasi ditandai dibaca');
}

function toggleNotif() {
  const panel = document.getElementById('notif-panel');
  panel.classList.toggle('open');
}

// ===== SIDEBAR MOBILE =====
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('mobile-open');
}

// ===== SYNC DATA (reload dari Firestore) =====
async function syncData() {
  const icon = document.getElementById('sync-icon');
  icon.style.animation = 'spin 1s linear infinite';
  showToast('🔄 Memuat ulang data dari Firebase...', 'info');
  try {
    await loadAllFromFirestore();
    icon.style.animation = '';
    showToast('☁️ Data berhasil disinkronkan!', 'success');
  } catch(e) {
    icon.style.animation = '';
    showToast('❌ Gagal sinkronisasi — cek koneksi', 'error');
  }
}

// ===== MODAL =====
function openModal(id) {
  const el = document.getElementById(id);
  if(el) { el.classList.add('open'); document.body.style.overflow='hidden'; }
}
function closeModal(id) {
  const el = document.getElementById(id);
  if(el) { el.classList.remove('open'); document.body.style.overflow=''; }
}

// Close modal on overlay click
document.addEventListener('click', e => {
  if(e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
    document.body.style.overflow = '';
  }
  if(!e.target.closest('.notif-panel') && !e.target.closest('.topbar-btn')) {
    document.getElementById('notif-panel').classList.remove('open');
  }
});

// ===== BARANG =====
async function simpanBarang() {
  const nama = document.getElementById('b-nama').value.trim();
  const kode = document.getElementById('b-kode').value.trim();
  if(!nama || !kode) { showToast('Nama dan kode barang wajib diisi!', 'error'); return; }
  const data = {
    kode, nama,
    kategori: document.getElementById('b-kategori').value || 'Lainnya',
    satuan  : document.getElementById('b-satuan').value,
    stok    : parseInt(document.getElementById('b-stok').value)||0,
    hbeli   : parseInt(document.getElementById('b-hbeli').value)||0,
    hjual   : parseInt(document.getElementById('b-hjual').value)||0,
    minStok : parseInt(document.getElementById('b-minstock').value)||20,
    lokasi  : document.getElementById('b-lokasi').value,
    masuk   : parseInt(document.getElementById('b-stok').value)||0,
    keluar  : 0, foto: [],
  };
  // Simpan ke Firestore (listener akan update UI otomatis)
  if (window.FIREBASE_READY) {
    try {
      await window.FS.addDoc(window.FS.col('barang'), data);
      showToast('✅ Barang tersimpan ke cloud!');
    } catch(e) { DB.barang.unshift(data); renderBarang(); renderStok(); renderStokKritis(); showToast('✅ Barang ditambahkan (offline)'); }
  } else {
    DB.barang.unshift(data); renderBarang(); renderStok(); renderStokKritis();
    showToast('✅ Barang berhasil ditambahkan!');
  }
  fillDropdowns();
  closeModal('modal-barang');
  ['b-kode','b-nama','b-stok','b-hbeli','b-hjual','b-desc'].forEach(id => { const el=document.getElementById(id); if(el)el.value=''; });
}

function editBarang(i) { showToast('⚙️ Fitur edit dalam pengembangan...', 'info'); }

async function hapusBarang(i) {
  const b = DB.barang[i];
  if(!confirm(`Hapus barang "${b.nama}"?`)) return;
  if (window.FIREBASE_READY && b._id) {
    try { await window.FS.deleteDoc(window.FS.docRef('barang', b._id)); showToast('🗑️ Barang dihapus dari cloud.'); }
    catch(e) { DB.barang.splice(i,1); renderBarang(); renderStok(); renderStokKritis(); showToast('🗑️ Barang dihapus.'); }
  } else {
    DB.barang.splice(i,1); renderBarang(); renderStok(); renderStokKritis(); showToast('🗑️ Barang dihapus.');
  }
}

function previewFoto(event) {
  const preview = document.getElementById('foto-preview');
  preview.innerHTML = '';
  Array.from(event.target.files).slice(0,4).forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = document.createElement('img');
      img.src = e.target.result;
      preview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
}

// ===== INVOICE =====
function addInvItem() {
  const tbody = document.getElementById('inv-items');
  const idx = invItems.length;
  invItems.push({ nama:'', qty:1, satuan:'Karung', harga:0, total:0 });
  const barangOpts = DB.barang.map(b => `<option data-harga="${b.hjual}" data-satuan="${b.satuan}">${b.nama}</option>`).join('');
  const row = document.createElement('tr');
  row.innerHTML = `
    <td><select style="border:1px solid var(--border);border-radius:8px;padding:6px;font-size:12.5px;width:180px;font-family:'Plus Jakarta Sans',sans-serif" onchange="updateItemBarang(${idx},this)">
      <option>Pilih...</option>${barangOpts}</select></td>
    <td><input type="number" value="1" min="1" style="width:60px;border:1px solid var(--border);border-radius:8px;padding:6px;text-align:center" oninput="updateItemQty(${idx},this)"></td>
    <td id="inv-sat-${idx}" style="color:var(--text-muted)">-</td>
    <td id="inv-hp-${idx}" style="color:var(--text-muted)">Rp 0</td>
    <td id="inv-tot-${idx}" style="font-weight:700">Rp 0</td>
    <td><button class="btn btn-danger btn-icon btn-sm" onclick="removeInvItem(${idx},this.closest('tr'))"><i class="fas fa-trash"></i></button></td>`;
  tbody.appendChild(row);
  hitungTotal();
}

function updateItemBarang(idx, sel) {
  const opt = sel.options[sel.selectedIndex];
  const harga = parseInt(opt.dataset.harga)||0;
  const satuan = opt.dataset.satuan||'-';
  invItems[idx].nama = opt.text;
  invItems[idx].harga = harga;
  invItems[idx].satuan = satuan;
  invItems[idx].total = harga * (invItems[idx].qty||1);
  document.getElementById(`inv-sat-${idx}`).textContent = satuan;
  document.getElementById(`inv-hp-${idx}`).textContent = 'Rp '+harga.toLocaleString('id-ID');
  document.getElementById(`inv-tot-${idx}`).textContent = 'Rp '+invItems[idx].total.toLocaleString('id-ID');
  hitungTotal();
}

function updateItemQty(idx, input) {
  invItems[idx].qty = parseInt(input.value)||0;
  invItems[idx].total = invItems[idx].harga * invItems[idx].qty;
  if(document.getElementById(`inv-tot-${idx}`))
    document.getElementById(`inv-tot-${idx}`).textContent = 'Rp '+invItems[idx].total.toLocaleString('id-ID');
  hitungTotal();
}

function removeInvItem(idx, row) {
  invItems[idx] = null;
  row.remove();
  hitungTotal();
}

function hitungTotal() {
  const items = invItems.filter(Boolean);
  const subtotal = items.reduce((s,i) => s+(i.total||0), 0);
  const diskon = parseFloat(document.getElementById('inv-diskon').value)||0;
  const afterDiskon = subtotal * (1 - diskon/100);
  const ppn = afterDiskon * 0.11;
  const total = afterDiskon + ppn;
  document.getElementById('inv-subtotal').textContent = 'Rp '+subtotal.toLocaleString('id-ID');
  document.getElementById('inv-ppn').textContent = 'Rp '+Math.round(ppn).toLocaleString('id-ID');
  document.getElementById('inv-total').textContent = 'Rp '+Math.round(total).toLocaleString('id-ID');
}

async function simpanInvoice() {
  const mitra = document.getElementById('inv-mitra').value;
  const items = invItems.filter(Boolean);
  if(!mitra || items.length===0) { showToast('Pilih mitra dan tambahkan item!', 'error'); return; }
  const subtotal  = items.reduce((s,i)=>s+i.total,0);
  const diskon    = parseFloat(document.getElementById('inv-diskon').value)||0;
  const afterD    = subtotal*(1-diskon/100);
  const total     = Math.round(afterD*1.11);
  invCounter++;
  const data = {
    no: document.getElementById('inv-no').value,
    tgl: document.getElementById('inv-tgl').value,
    mitra, total, status:'Belum Lunas',
    tempo: document.getElementById('inv-tempo').value,
    items: items,
    diskon,
  };
  if (window.FIREBASE_READY) {
    try { await window.FS.addDoc(window.FS.col('invoice'), data); showToast('✅ Invoice tersimpan ke cloud!'); }
    catch(e) { DB.invoice.unshift(data); renderInvoice(); showToast('✅ Invoice dibuat (offline)'); }
  } else {
    DB.invoice.unshift(data); renderInvoice(); showToast('✅ Invoice berhasil dibuat!');
  }
  closeModal('modal-invoice');
  invItems = [];
  document.getElementById('inv-items').innerHTML = '';
  document.getElementById('inv-no').value = `INV-2025-0${invCounter}`;
  hitungTotal();
}

async function tandaiLunas(i) {
  const inv = DB.invoice[i];
  inv.status = 'Lunas';
  if (window.FIREBASE_READY && inv._id) {
    try { await window.FS.updateDoc(window.FS.docRef('invoice', inv._id), { status:'Lunas' }); }
    catch(e) { console.warn('update lunas failed:', e); }
  }
  renderInvoice();
  showToast('✅ Invoice ditandai Lunas!');
}

function previewInvoice() {
  const mitra = document.getElementById('inv-mitra').value || 'Nama Mitra';
  const items = invItems.filter(Boolean);
  const subtotal = items.reduce((s,i)=>s+(i.total||0),0);
  const diskon = parseFloat(document.getElementById('inv-diskon').value)||0;
  const afterDiskon = subtotal*(1-diskon/100);
  const ppn = afterDiskon*0.11;
  const total = afterDiskon+ppn;
  const itemRows = items.map((item,i)=>`
    <tr>
      <td>${i+1}</td><td>${item.nama}</td><td>${item.satuan}</td>
      <td style="text-align:right">${item.qty}</td>
      <td style="text-align:right">Rp ${item.harga.toLocaleString('id-ID')}</td>
      <td style="text-align:right"><strong>Rp ${item.total.toLocaleString('id-ID')}</strong></td>
    </tr>`).join('');
  document.getElementById('invoice-preview-content').innerHTML = `
    <div class="invoice-header">
      <div class="invoice-company">
        <h2>Baitul Ma'mur Syafaah</h2>
        <p>Distributor Sembako Nasional<br>
        Ruko Villa Bogor Indah 5, Bogor, Jawa Barat<br>
        Telp: (0251) 8xxx-xxxx | WA: 0812-xxxx-xxxx<br>
        Email: info@bms-syafaah.id | NPWP: xx.xxx.xxx.x-xxx.xxx</p>
      </div>
      <div class="invoice-meta">
        <h1>INVOICE</h1>
        <p>No: <strong>${document.getElementById('inv-no').value}</strong></p>
        <p>Tanggal: ${document.getElementById('inv-tgl').value}</p>
        <p>Jatuh Tempo: ${document.getElementById('inv-tempo').value}</p>
      </div>
    </div>
    <div class="invoice-to">
      <h4>Kepada Yth.</h4>
      <p><strong>${mitra}</strong></p>
    </div>
    <table class="invoice-table">
      <thead><tr><th>No</th><th>Nama Barang</th><th>Satuan</th><th style="text-align:right">Qty</th><th style="text-align:right">Harga</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${itemRows}</tbody>
    </table>
    <div class="invoice-totals">
      <table>
        <tr><td>Subtotal</td><td style="text-align:right">Rp ${subtotal.toLocaleString('id-ID')}</td></tr>
        ${diskon>0?`<tr><td>Diskon (${diskon}%)</td><td style="text-align:right;color:var(--danger)">- Rp ${Math.round(subtotal*diskon/100).toLocaleString('id-ID')}</td></tr>`:''}
        <tr><td>PPN 11%</td><td style="text-align:right">Rp ${Math.round(ppn).toLocaleString('id-ID')}</td></tr>
        <tr class="total-row"><td>TOTAL</td><td style="text-align:right">Rp ${Math.round(total).toLocaleString('id-ID')}</td></tr>
      </table>
    </div>
    <div class="invoice-footer">
      <p>Terima kasih atas kepercayaan Anda berbelanja di Baitul Ma'mur Syafaah</p>
      <p>Pembayaran melalui Transfer BCA 123-456-7890 a/n Baitul Ma'mur Syafaah</p>
    </div>`;
  openModal('modal-preview-inv');
}

function showInvoicePreview(i) {
  const inv = DB.invoice[i];
  document.getElementById('invoice-preview-content').innerHTML = `
    <div class="invoice-header">
      <div class="invoice-company"><h2>Baitul Ma'mur Syafaah</h2><p>Distributor Sembako · Villa Bogor Indah 5, Bogor</p></div>
      <div class="invoice-meta"><h1>INVOICE</h1><p>No: <strong>${inv.no}</strong></p><p>Tgl: ${inv.tgl}</p></div>
    </div>
    <div class="invoice-to"><h4>Kepada</h4><p><strong>${inv.mitra}</strong></p></div>
    <div style="padding:20px 0;text-align:center;color:var(--text-muted)">[Detail item tersimpan di sistem — Rp ${inv.total.toLocaleString('id-ID')}]</div>
    <div class="invoice-totals">
      <table><tr class="total-row"><td>TOTAL</td><td>Rp ${inv.total.toLocaleString('id-ID')}</td></tr></table>
    </div>
    <div class="invoice-footer"><p>Status: <strong>${inv.status}</strong> · Jatuh Tempo: ${inv.tempo}</p></div>`;
  openModal('modal-preview-inv');
}

// ===== MITRA =====
async function simpanMitra() {
  const nama = document.getElementById('m-nama').value.trim();
  if(!nama) { showToast('Nama mitra wajib diisi!', 'error'); return; }
  const kodeNum = String(DB.mitra.length+1).padStart(3,'0');
  const data = {
    kode:`MTR-${kodeNum}`,
    nama, tipe:document.getElementById('m-tipe').value,
    pic :document.getElementById('m-pic').value,
    hp  :document.getElementById('m-hp').value,
    kota:document.getElementById('m-kota').value,
    piutang:0, status:'Aktif',
  };
  if (window.FIREBASE_READY) {
    try { await window.FS.addDoc(window.FS.col('mitra'), data); showToast('✅ Mitra tersimpan ke cloud!'); }
    catch(e) { DB.mitra.push(data); renderMitra(); showToast('✅ Mitra ditambahkan (offline)'); }
  } else {
    DB.mitra.push(data); renderMitra(); showToast('✅ Mitra berhasil ditambahkan!');
  }
  fillDropdowns();
  closeModal('modal-mitra');
  document.getElementById('m-nama').value = '';
  document.getElementById('m-kode').value = `MTR-${String(DB.mitra.length+1).padStart(3,'0')}`;
}

async function hapusMitra(i) {
  const m = DB.mitra[i];
  if(!confirm(`Hapus mitra "${m.nama}"?`)) return;
  if (window.FIREBASE_READY && m._id) {
    try { await window.FS.deleteDoc(window.FS.docRef('mitra', m._id)); showToast('🗑️ Mitra dihapus dari cloud.'); }
    catch(e) { DB.mitra.splice(i,1); renderMitra(); showToast('🗑️ Mitra dihapus.'); }
  } else {
    DB.mitra.splice(i,1); renderMitra(); showToast('🗑️ Mitra dihapus.');
  }
}

function chatMitra(nama) {
  openChat();
  showToast(`💬 Memulai chat dengan ${nama}`);
}

// ===== STOK =====
async function simpanStokMasuk() {
  const nama = document.getElementById('sm-barang').value;
  const qty  = parseInt(document.getElementById('sm-qty').value)||0;
  if(!nama||qty<=0) { showToast('Lengkapi data stok masuk!', 'error'); return; }
  const b = DB.barang.find(b=>b.nama===nama);
  if(!b) return;
  b.stok += qty; b.masuk += qty;
  if (window.FIREBASE_READY && b._id) {
    try { await window.FS.updateDoc(window.FS.docRef('barang', b._id), { stok: b.stok, masuk: b.masuk }); }
    catch(e) { console.warn('stok masuk update failed:', e); }
  }
  renderStok(); renderBarang(); renderStokKritis();
  closeModal('modal-stok-masuk');
  showToast(`✅ Stok ${nama} bertambah +${qty}!`);
}

async function simpanStokKeluar() {
  const nama = document.getElementById('sk-barang').value;
  const qty  = parseInt(document.getElementById('sk-qty').value)||0;
  if(!nama||qty<=0) { showToast('Lengkapi data stok keluar!', 'error'); return; }
  const b = DB.barang.find(b=>b.nama===nama);
  if(!b) return;
  if(b.stok < qty) { showToast('❌ Stok tidak mencukupi!', 'error'); return; }
  b.stok -= qty; b.keluar += qty;
  if (window.FIREBASE_READY && b._id) {
    try { await window.FS.updateDoc(window.FS.docRef('barang', b._id), { stok: b.stok, keluar: b.keluar }); }
    catch(e) { console.warn('stok keluar update failed:', e); }
  }
  renderStok(); renderBarang(); renderStokKritis();
  closeModal('modal-stok-keluar');
  showToast(`✅ Stok keluar ${nama} -${qty} tercatat!`);
}

// ===== KEUANGAN =====
async function simpanPengeluaran() {
  const ket = document.getElementById('pe-ket').value.trim();
  const jml = parseInt(document.getElementById('pe-jml').value)||0;
  if(!ket||jml<=0) { showToast('Lengkapi data pengeluaran!', 'error'); return; }
  const data = { tgl:document.getElementById('pe-tgl').value, ket, jml, kat:document.getElementById('pe-kat').value };
  if (window.FIREBASE_READY) {
    try { await window.FS.addDoc(window.FS.col('pengeluaran'), data); showToast('✅ Pengeluaran tersimpan ke cloud!'); }
    catch(e) { DB.pengeluaran.unshift(data); renderPengeluaran(); showToast('✅ Pengeluaran dicatat (offline)'); }
  } else {
    DB.pengeluaran.unshift(data); renderPengeluaran(); showToast('✅ Pengeluaran berhasil dicatat!');
  }
  closeModal('modal-pengeluaran');
}

async function simpanPembelian() {
  const pemasok = document.getElementById('pb-pemasok').value;
  const barang  = document.getElementById('pb-barang').value;
  const qty     = parseInt(document.getElementById('pb-qty').value)||0;
  const harga   = parseInt(document.getElementById('pb-harga').value)||0;
  if(!pemasok||!barang||qty<=0) { showToast('Lengkapi data pembelian!', 'error'); return; }
  const data = { tgl:document.getElementById('pb-tgl').value, pemasok, barang, total:qty*harga };
  if (window.FIREBASE_READY) {
    try { await window.FS.addDoc(window.FS.col('pembelian'), data); showToast('✅ Pembelian tersimpan ke cloud!'); }
    catch(e) { DB.pembelian.unshift(data); renderPembelian(); showToast('✅ Pembelian dicatat (offline)'); }
  } else {
    DB.pembelian.unshift(data); renderPembelian(); showToast('✅ Pembelian berhasil dicatat!');
  }
  closeModal('modal-pembelian');
}

// ===== CHAT =====
function toggleChat() {
  const win = document.getElementById('chat-window');
  chatOpen = !chatOpen;
  win.classList.toggle('open', chatOpen);
  if(chatOpen) {
    document.getElementById('chat-unread-badge').style.display = 'none';
    document.getElementById('chat-input').focus();
  }
}

function openChat() {
  chatOpen = true;
  document.getElementById('chat-window').classList.add('open');
  document.getElementById('chat-unread-badge').style.display = 'none';
}

function switchChatTab(tab) {
  activeChatTab = tab;
  document.querySelectorAll('.chat-tab').forEach((t,i) => {
    t.classList.toggle('active', ['messages','contacts','broadcast'][i]===tab);
  });
  document.getElementById('chat-messages').style.display = tab==='messages'?'flex':'none';
  document.getElementById('chat-contacts-panel').style.display = tab==='contacts'?'block':'none';
  document.getElementById('chat-broadcast-panel').style.display = tab==='broadcast'?'block':'none';
  document.getElementById('chat-input-area').style.display = tab==='messages'?'flex':'none';
}

function renderChatMessages() {
  const body = document.getElementById('chat-messages');
  body.innerHTML = chatMessages.map(m => `
    <div class="msg ${m.mine?'mine':'other'}">
      <div class="msg-avatar">${m.avatar}</div>
      <div>
        ${!m.mine?`<div style="font-size:11px;color:var(--text-muted);margin-bottom:3px;font-weight:600">${m.sender}</div>`:''}
        <div class="msg-bubble">${m.text}</div>
        <span class="msg-time">${m.time}</span>
      </div>
    </div>`).join('');
  body.scrollTop = body.scrollHeight;
}

function renderContactsList() {
  const panel = document.getElementById('chat-contacts-panel');
  const colors = ['#1a3a5c','#f59e0b','#10b981','#7c3aed','#ef4444'];
  panel.innerHTML = DB.mitra.slice(0,5).map((m,i)=>`
    <div class="chat-contact" onclick="switchChatTab('messages')">
      <div class="contact-avatar" style="background:${colors[i%colors.length]}">${m.nama[0]}</div>
      <div class="contact-info">
        <div class="contact-name">${m.nama}</div>
        <div class="contact-last">${m.tipe} · ${m.kota}</div>
      </div>
      <div class="contact-meta">
        <div class="contact-time">Online</div>
      </div>
    </div>`).join('');
}

function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if(!text || !currentUser) return;
  const now = new Date();
  const time = now.getHours().toString().padStart(2,'0')+'.'+now.getMinutes().toString().padStart(2,'0');
  chatMessages.push({
    id: Date.now(),
    sender: currentUser.name,
    avatar: currentUser.avatar,
    text, time, mine: true,
  });
  input.value = '';
  renderChatMessages();

  // Simulasi balasan otomatis
  setTimeout(() => {
    const replies = [
      'Baik, sudah dicatat! 👍',
      'Oke siap, nanti saya update stoknya.',
      'Terima kasih infonya!',
      'Segera diproses ya.',
    ];
    chatMessages.push({
      id: Date.now()+1,
      sender: 'Admin Rina',
      avatar: 'R',
      text: replies[Math.floor(Math.random()*replies.length)],
      time: now.getHours().toString().padStart(2,'0')+'.'+(now.getMinutes()+1).toString().padStart(2,'0'),
      mine: false,
    });
    renderChatMessages();
  }, 1500);
}

function sendBroadcast() {
  const judul = document.getElementById('bc-judul').value.trim();
  const pesan = document.getElementById('bc-pesan').value.trim();
  if(!judul||!pesan) { showToast('Isi judul dan pesan broadcast!', 'error'); return; }
  showToast(`📢 Broadcast "${judul}" terkirim ke semua mitra!`);
  document.getElementById('bc-judul').value = '';
  document.getElementById('bc-pesan').value = '';
}

// ===== EXPORT CSV =====
function exportCSV(type) {
  let rows = [], headers = [], data = [];
  if(type==='barang') {
    headers = ['Kode','Nama','Kategori','Satuan','H.Beli','H.Jual','Stok','Min Stok'];
    data = DB.barang.map(b=>[b.kode,b.nama,b.kategori,b.satuan,b.hbeli,b.hjual,b.stok,b.minStok]);
  } else if(type==='invoice') {
    headers = ['No Invoice','Tanggal','Mitra','Total','Status','Jatuh Tempo'];
    data = DB.invoice.map(i=>[i.no,i.tgl,i.mitra,i.total,i.status,i.tempo]);
  } else if(type==='mitra') {
    headers = ['Kode','Nama','Tipe','PIC','HP','Kota','Piutang'];
    data = DB.mitra.map(m=>[m.kode,m.nama,m.tipe,m.pic,m.hp,m.kota,m.piutang]);
  } else if(type==='stok') {
    headers = ['Kode','Nama','Kategori','Masuk','Keluar','Stok','Min Stok'];
    data = DB.barang.map(b=>[b.kode,b.nama,b.kategori,b.masuk,b.keluar,b.stok,b.minStok]);
  }
  const csv = [headers.join(','), ...data.map(r=>r.join(','))].join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download=`BMS_${type}_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  showToast(`📊 Data ${type} berhasil diexport ke CSV!`);
}

// ===== SEARCH =====
document.addEventListener('DOMContentLoaded', () => {
  // Barang search
  const sb = document.getElementById('search-barang');
  if(sb) sb.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('#tbody-barang tr').forEach(r => {
      r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });
  // Invoice search
  const si = document.getElementById('search-invoice');
  if(si) si.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('#tbody-invoice tr').forEach(r => {
      r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });
  // Mitra search
  const sm = document.getElementById('search-mitra');
  if(sm) sm.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('#tbody-mitra tr').forEach(r => {
      r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });
  // Global search
  const gs = document.getElementById('global-search');
  if(gs) gs.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    if(!q) return;
    const found = DB.barang.find(b=>b.nama.toLowerCase().includes(q)||b.kode.toLowerCase().includes(q));
    if(found) { navigateTo('barang'); showToast(`🔍 Hasil ditemukan di Barang`); }
  });
  // Spin keyframe
  const style = document.createElement('style');
  style.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
  document.head.appendChild(style);
});

// ===== DATE =====
function updateDate() {
  const d = new Date();
  document.getElementById('topbar-date').textContent = d.toLocaleDateString('id-ID', {weekday:'short',day:'numeric',month:'short',year:'numeric'});
}

// ===== TOAST =====
let toastTimer;
function showToast(msg, type='success') {
  const toast = document.getElementById('toast');
  const icon = document.getElementById('toast-icon');
  const msgEl = document.getElementById('toast-msg');
  msgEl.textContent = msg;
  const icons = { success:'fa-check-circle', error:'fa-times-circle', info:'fa-info-circle', warning:'fa-exclamation-circle' };
  icon.className = 'fas '+(icons[type]||'fa-check-circle');
  icon.style.color = type==='error'?'#ef4444':'#10b981';
  const bgColors = { success:'rgba(16,185,129,0.12)', error:'rgba(239,68,68,0.12)', info:'rgba(37,99,168,0.12)', warning:'rgba(245,158,11,0.12)' };
  toast.style.background = bgColors[type] || bgColors.success;
  toast.style.display = 'flex';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.style.display = 'none'; }, 3200);
}

document.addEventListener('DOMContentLoaded', () => {
  updateDate();
  // Restore session jika ada — user tidak perlu login ulang saat refresh
  restoreSession();
});