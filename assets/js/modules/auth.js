// ================================================================
//  BMS — auth.js  (ES Module)
//  Firebase Auth: login, logout, session, RBAC
// ================================================================
import { state, DB } from './constants.js';
import { showToast, addLog, updateFBStatus, setDefaultDates, updateKategoriDropdowns, fillDropdowns, updateRunningText } from './utils.js';
import { buildNav, navigateTo, closeSidebar } from './nav.js';
import { onAuth, currentFbUser, signIn, doSignOut, getDoc, setDoc, docRef, ts } from '../firebase.js';
import { renderSalesDropdown } from './ui-helpers.js';

// ── Load appConfig ────────────────────────────────────────────────
export async function loadAppConfig() {
  try {
    const snap = await getDoc(docRef('test','appConfig'));
    if (snap.exists()) {
      state.appConfig = snap.data();
    } else {
      state.appConfig = _defaultConfig();
    }
    updateFBStatus('online');  // FIX v11.1: update status setelah appConfig berhasil
    renderSalesDropdown();
    // Realtime listener appConfig
    import('../firebase.js').then(({ onSnapshot, docRef: dr, col }) => {
      import('../firebase.js').then(fb => {
        fb.onSnapshot(fb.docRef('test','appConfig'), docSnap => {
          if (docSnap.exists()) {
            state.appConfig = docSnap.data();
            renderSalesDropdown();
            if (state.currentUser) {
              import('./ui-render.js').then(r => {
                r.renderUsersList();
                if (_isPageActive('settings')) r.renderSettings();
              });
            }
          }
        });
      });
    });
  } catch(e) {
    console.warn('appConfig load error:', e.message);
    if (!state.appConfig) state.appConfig = _defaultConfig();
    renderSalesDropdown();
    if (e.code === 'permission-denied') { state._rulesError = true; updateFBStatus('rules'); }
    else updateFBStatus('offline');
  }
}

function _defaultConfig() {
  return {
    roleEmails: { owner:'owner@bms-syafaah.id', admin:'admin@bms-syafaah.id' },
    salesUsers: [], // Kosong — Owner tambah manual via halaman Pengaturan
    company: { nama:"CV. Baitul Ma'mur Syafaah", alamat:'Ruko Villa Bogor Indah 5, Bogor', telp:'(0251) 8xxx-xxxx', email:'info@bms-syafaah.id', npwp:'xx.xxx', rekening:'BCA 123-456-7890' },
    bonusRate: 2,
    ppnRate: 11,
    ppnAktif: true,
  };
}

// ── Login ─────────────────────────────────────────────────────────
export async function doLogin() {
  const password = document.getElementById('login-pass')?.value.trim();
  if (!password) { showToast('Password wajib diisi!', 'error'); return; }
  let email = '';
  if (state.selectedRole === 'sales') {
    if (!state.selectedSalesId) { showToast('Pilih akun sales terlebih dahulu!', 'error'); return; }
    const su = (state.appConfig?.salesUsers || []).find(s => s.id === state.selectedSalesId);
    email = su?.email || '';
  } else {
    email = state.appConfig?.roleEmails?.[state.selectedRole] || `${state.selectedRole}@bms-syafaah.id`;
  }
  if (!email) { showToast('Konfigurasi email tidak ditemukan!', 'error'); return; }
  const btn = document.getElementById('btn-login');
  if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Masuk...';
  try {
    await signIn(email, password);
  } catch(err) {
    // Upgrade 7.3: error handling informatif
    const msgs = {
      'auth/wrong-password'       : '❌ Password salah!',
      'auth/user-not-found'       : '❌ Akun tidak ditemukan. Hubungi Owner.',
      'auth/invalid-email'        : '❌ Format email tidak valid.',
      'auth/too-many-requests'    : '❌ Terlalu banyak percobaan. Coba lagi nanti.',
      'auth/network-request-failed':'❌ Gagal koneksi — periksa koneksi internet Anda.',
      'auth/invalid-credential'   : '❌ Email atau password salah!',
    };
    showToast(msgs[err.code] || ('❌ Login gagal: ' + err.message), 'error');
    if (btn) btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Masuk ke Dashboard';
  }
}

// ── Logout ────────────────────────────────────────────────────────
export async function doLogout() {
  if (!confirm('Yakin ingin keluar?')) return;
  try {
    if (state.currentUser && currentFbUser()) {
      const uid = currentFbUser().uid;
      setDoc(docRef('test','online_'+uid), { active:false, lastSeen:ts() }).catch(()=>{});
    }
    await doSignOut();
  } catch(e) {
    showToast('❌ Gagal logout: ' + e.message, 'error');
    return;
  }
  state.currentUser = null;
  document.getElementById('login-page').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}

// ── Auth Listener ─────────────────────────────────────────────────
export function initAuthListener() {
  onAuth(async (fbUser) => {
    if (!fbUser) return;
    try {
      const snap    = await getDoc(docRef('users', fbUser.uid));
      let profile   = snap.exists() ? snap.data() : null;
      if (!profile) {
        profile = buildProfileFromEmail(fbUser.email, fbUser.uid);
        await setDoc(docRef('users', fbUser.uid), profile);
      }
      if (profile.menus && !profile.menus.includes('tutorial')) profile.menus.push('tutorial');
      state.currentUser = { ...profile, uid: fbUser.uid, email: fbUser.email };
      applySession(state.currentUser);
    } catch(e) {
      // Upgrade 7.3: error handling informatif
      console.error('Auth profile load:', e.message);
      if (e.code === 'permission-denied') {
        showToast('❌ Akses ditolak — pastikan Firestore Security Rules v2.1 sudah aktif di Firebase Console.', 'error');
      } else {
        showToast('❌ Gagal memuat profil user. Coba refresh halaman.', 'error');
      }
    }
  });
}

export function buildProfileFromEmail(email, uid) {
  const cfg       = state.appConfig || {};
  const re        = cfg.roleEmails  || {};
  let role='sales', name='Sales User', avatar='S', label='Tim Sales';
  let menus = ['dashboard','stok','invoice','mitra','sales_dash'];
  if (email===re.owner||email.startsWith('owner@')) {
    role='owner'; name='Owner BMS'; avatar='O'; label='Pemilik / Administrator';
    menus=['dashboard','barang','invoice','stok','mitra','keuangan','laporan','sales_dash','opname','gudang','tren_stok','surat_jalan','settings','log','tutorial'];
  } else if (email===re.admin||email.startsWith('admin@')) {
    role='admin'; name='Admin Keuangan'; avatar='R'; label='Admin Keuangan';
    menus=['dashboard','barang','invoice','stok','mitra','keuangan','laporan','sales_dash','opname','gudang','tren_stok','surat_jalan','settings','tutorial'];
  } else {
    const su = (cfg.salesUsers||[]).find(s=>s.email===email);
    if (su) { name=su.name; avatar=su.avatar||name[0]; }
    menus=['dashboard','invoice','stok','mitra','sales_dash','surat_jalan','tutorial'];
  }
  return { role, name, avatar, label, menus, uid };
}

export function applySession(user) {
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  const safe = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  safe('sb-avatar', user.avatar||user.name[0]);
  safe('sb-name',   user.name);
  safe('sb-role',   user.label);
  buildNav(user.menus);
  applyRoleRestrictions(user.role);
  updateOnlineStatus(user);
  window._initData?.();
  navigateTo('dashboard');
  import('./utils.js').then(u => { u.updateDate(); u.setDefaultDates(); });
  import('./ui-render.js').then(r => { r.renderNotifications(); r.renderNotifPermissionBtn(); });
  showToast(`✅ Selamat datang, ${user.name}!`);
  const btn = document.getElementById('btn-login');
  if (btn) btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Masuk ke Dashboard';
}

export function applyRoleRestrictions(role) {
  const isSales = role==='sales', isOwner = role==='owner';
  const el = id => document.getElementById(id);
  if (el('btn-tambah-barang'))  el('btn-tambah-barang').style.display  = isSales?'none':'';
  if (el('btn-tambah-mitra'))   el('btn-tambah-mitra').style.display   = isSales?'none':'';
  if (el('btn-tambah-gudang'))  el('btn-tambah-gudang').style.display  = isSales?'none':'';
  document.querySelectorAll('#page-stok .btn-success, #page-stok .btn-danger').forEach(b=>b.style.display=isSales?'none':'');
  const logNav = document.getElementById('nav-log');
  if (logNav) logNav.style.display = isOwner?'':'none';
}

// ── Online Status ─────────────────────────────────────────────────
function updateOnlineStatus(user) {
  if (!currentFbUser()) return;
  const uid = currentFbUser().uid;
  const ref = docRef('test','online_'+uid);
  setDoc(ref, { uid, name:user.name, role:user.role, avatar:user.avatar, active:true, lastSeen:ts() }).catch(()=>{});
  setInterval(() => import('../firebase.js').then(fb=>fb.updateDoc(ref,{lastSeen:fb.ts()}).catch(()=>{})), 60000);
  import('../firebase.js').then(fb=>{
    fb.onSnapshot(fb.query(fb.col('test')), snap => {
      state.onlineUsers = {};
      snap.docs.forEach(d=>{ const d2=d.data(); if(d2.active&&d2.uid) state.onlineUsers[d2.uid]=d2; });
      import('./ui-render.js').then(r=>{ r.renderContactsList(); });
      const el=document.getElementById('online-count'); if(el) el.textContent=Object.keys(state.onlineUsers).length+' online';
    });
  });
}

function _isPageActive(id) {
  const el=document.getElementById('page-'+id); return el&&el.classList.contains('active');
}

// ── Role & Sales Selection ────────────────────────────────────────
export function selectRole(role) {
  state.selectedRole    = role;
  state.selectedSalesId = null;
  document.querySelectorAll('.role-btn').forEach(c=>c.classList.remove('active'));
  document.getElementById('role-'+role)?.classList.add('active');
  const sp = document.getElementById('sales-list-panel');
  if (sp) sp.style.display = role==='sales'?'block':'none';
  const dp = document.getElementById('login-user-display');
  if (dp) dp.textContent = role==='sales'?'Pilih akun sales di bawah':(role==='owner'?'Owner BMS':'Admin Keuangan');
}

export function selectSalesUser(id, name, email) {
  state.selectedSalesId = id;
  
  // Hapus class active dari semua tombol
  document.querySelectorAll('.sales-user-btn').forEach(b => b.classList.remove('active'));
  
  // Cari tombol berdasarkan data-user-id (bukan event)
  const selectedBtn = document.querySelector(`[data-user-id="${id}"]`);
  if (selectedBtn) {
    selectedBtn.classList.add('active');
  } else {
    // Fallback: cari berdasarkan teks (kalau onclick langsung)
    document.querySelectorAll('.sales-user-btn').forEach(btn => {
      if (btn.textContent.includes(name)) {
        btn.classList.add('active');
      }
    });
  }
  
  const dp = document.getElementById('login-user-display');
  if (dp) dp.textContent = name;
}