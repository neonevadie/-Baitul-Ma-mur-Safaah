// ================================================================
//  BMS — modules/auth.js  v1.0
//  Phase 4 — ES Modules Refactor
//  Exports: loadAppConfig, renderSalesDropdown, selectSalesUser,
//           selectRole, doLogin, doLogout, buildProfileFromEmail,
//           applySession, applyRoleRestrictions, updateOnlineStatus,
//           updateOnlineCount
//  Side-effect: registers window.FA.onAuth listener on import
//  Dependencies: ./constants.js, ./nav.js
//
//  CROSS-MODULE BRIDGE NOTE:
//  Functions from phases 6-7 are called via window.* until those
//  phases are refactored. Each bridge call is annotated.
// ================================================================

import { state }                        from './constants.js';
import { buildNav, navigateTo }         from './nav.js';

// ── LOAD APP CONFIG ───────────────────────────────────────────────
export async function loadAppConfig() {
  const defaultConfig = () => ({
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
      nama    : "CV. Baitul Ma'mur Syafaah",
      alamat  : 'Ruko Villa Bogor Indah 5, Bogor, Jawa Barat',
      telp    : '(0251) 8xxx-xxxx',
      email   : 'info@bms-syafaah.id',
      npwp    : 'xx.xxx.xxx.x-xxx.xxx',
      rekening: 'BCA 123-456-7890 a/n Baitul Mamur Syafaah',
    },
    bonusRate: 2,
  });

  try {
    const snap = await window.FS.getDoc(window.FS.docRef('test', 'appConfig'));
    state.appConfig = snap.exists() ? snap.data() : defaultConfig();
    renderSalesDropdown();

    // Realtime listener — keeps sales dropdown & settings page in sync
    window.FS.onSnapshot(window.FS.docRef('test', 'appConfig'), docSnap => {
      if (!docSnap.exists()) return;
      state.appConfig = docSnap.data();
      renderSalesDropdown();
      if (state.currentUser) {
        window.renderUsersList?.();            // → settings.js (phase 6)
        if (window.isPageActive?.('settings')) window.renderSettings?.(); // → settings.js (phase 6)
      }
    });
  } catch(e) {
    console.warn('appConfig load failed:', e);
    if (!state.appConfig) state.appConfig = defaultConfig();
    renderSalesDropdown();
    if (e.code === 'permission-denied') {
      window.updateFBStatus?.('rules');        // → data.js ✓
    } else {
      window.updateFBStatus?.('offline');      // → data.js ✓
    }
  }
}

// ── LOGIN PAGE — SALES DROPDOWN ───────────────────────────────────
export function renderSalesDropdown() {
  const list = document.getElementById('sales-user-list');
  if (!list || !state.appConfig) return;
  const users = state.appConfig.salesUsers || [];
  list.innerHTML = users.map(s =>
    `<div class="sales-user-btn ${state.selectedSalesId === s.id ? 'active' : ''}"
      onclick="selectSalesUser('${s.id}','${s.name}','${s.email}')">${s.avatar} ${s.name}</div>`
  ).join('');
}

export function selectSalesUser(id, name /*, email */) {
  state.selectedSalesId = id;
  document.querySelectorAll('.sales-user-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('login-user-display').textContent = name;
}

export function selectRole(role) {
  state.selectedRole   = role;
  state.selectedSalesId = null;
  document.querySelectorAll('.role-btn').forEach(c => c.classList.remove('active'));
  document.getElementById('role-' + role).classList.add('active');
  const salesPanel = document.getElementById('sales-list-panel');
  if (salesPanel) salesPanel.style.display = role === 'sales' ? 'block' : 'none';
  const display = document.getElementById('login-user-display');
  if (display) display.textContent =
    role === 'sales' ? 'Pilih akun sales di bawah' :
    role === 'owner' ? 'Owner BMS'                  : 'Admin Keuangan';
}

// ── LOGIN ─────────────────────────────────────────────────────────
export async function doLogin() {
  const password = document.getElementById('login-pass').value.trim();
  if (!password) { window.showToast('Password wajib diisi!', 'error'); return; }

  let email = '';
  if (state.selectedRole === 'sales') {
    if (!state.selectedSalesId) {
      window.showToast('Pilih akun sales terlebih dahulu!', 'error'); return;
    }
    const su = (state.appConfig?.salesUsers || []).find(s => s.id === state.selectedSalesId);
    email = su?.email || '';
  } else {
    email = state.appConfig?.roleEmails?.[state.selectedRole]
          || `${state.selectedRole}@bms-syafaah.id`;
  }

  if (!email) { window.showToast('Konfigurasi email tidak ditemukan!', 'error'); return; }

  const btn = document.getElementById('btn-login');
  if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Masuk...';

  try {
    await window.FA.signIn(email, password);
    // onAuthStateChanged handles the rest
  } catch(err) {
    const msgs = {
      'auth/wrong-password'        : 'Password salah!',
      'auth/user-not-found'        : 'Akun tidak ditemukan. Hubungi Owner.',
      'auth/invalid-email'         : 'Format email tidak valid.',
      'auth/too-many-requests'     : 'Terlalu banyak percobaan. Coba lagi nanti.',
      'auth/network-request-failed': 'Gagal koneksi — cek internet.',
      'auth/invalid-credential'    : 'Email atau password salah!',
    };
    window.showToast('❌ ' + (msgs[err.code] || err.message), 'error');
    if (btn) btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Masuk ke Dashboard';
  }
}

// ── LOGOUT ────────────────────────────────────────────────────────
export async function doLogout() {
  if (!confirm('Yakin ingin keluar?')) return;
  if (state.currentUser && window.FA.currentUser()) {
    const uid = window.FA.currentUser().uid;
    window.FS.setDoc(
      window.FS.docRef('test', 'online_' + uid),
      { active: false, lastSeen: window.FS.ts() }
    ).catch(() => {});
  }
  await window.FA.signOut();
  state.currentUser = null;
  document.getElementById('login-page').style.display = 'flex';
  document.getElementById('app').style.display        = 'none';
}

// ── AUTH STATE LISTENER (side-effect on import) ───────────────────
// Runs once when this module is first imported by main.js
function setupAuthListener() {
  window.FA.onAuth(async (fbUser) => {
    if (!fbUser) return;
    try {
      const snap    = await window.FS.getDoc(window.FS.docRef('users', fbUser.uid));
      let profile   = snap.exists() ? snap.data() : null;

      if (!profile) {
        profile = buildProfileFromEmail(fbUser.email, fbUser.uid);
        await window.FS.setDoc(window.FS.docRef('users', fbUser.uid), profile);
      }

      // Ensure 'tutorial' is always accessible (fixes older accounts)
      if (profile.menus && !profile.menus.includes('tutorial')) {
        profile.menus.push('tutorial');
      }

      state.currentUser = { ...profile, uid: fbUser.uid, email: fbUser.email };
      applySession(state.currentUser);
    } catch(e) {
      console.error('Auth profile load error:', e);
      window.showToast('❌ Gagal memuat profil. Cek Firestore rules.', 'error');
    }
  });
}

// ── BUILD PROFILE FROM EMAIL ──────────────────────────────────────
export function buildProfileFromEmail(email, uid) {
  const cfg        = state.appConfig || {};
  const roleEmails = cfg.roleEmails  || {};
  let role = 'sales', name = 'Sales User', avatar = 'S', label = 'Tim Sales';
  let menus = ['dashboard','stok','invoice','mitra','sales_dash'];

  if (email === roleEmails.owner || email.startsWith('owner@')) {
    role='owner'; name='Owner BMS'; avatar='O'; label='Pemilik / Administrator';
    menus=['dashboard','barang','invoice','stok','mitra','keuangan','laporan','sales_dash',
           'opname','gudang','tren_stok','surat_jalan','settings','log','tutorial'];
  } else if (email === roleEmails.admin || email.startsWith('admin@')) {
    role='admin'; name='Admin Keuangan'; avatar='R'; label='Admin Keuangan';
    menus=['dashboard','barang','invoice','stok','mitra','keuangan','laporan','sales_dash',
           'opname','gudang','tren_stok','surat_jalan','settings','tutorial'];
  } else {
    const su = (cfg.salesUsers || []).find(s => s.email === email);
    if (su) { name = su.name; avatar = su.avatar || name[0]; }
    menus = ['dashboard','invoice','stok','mitra','sales_dash','surat_jalan','tutorial'];
  }
  return { role, name, avatar, label, menus, uid };
}

// ── APPLY SESSION ─────────────────────────────────────────────────
export function applySession(user) {
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('app').style.display        = 'block';
  document.getElementById('sb-avatar').textContent    = user.avatar || user.name[0];
  document.getElementById('sb-name').textContent      = user.name;
  document.getElementById('sb-role').textContent      = user.label;

  buildNav(user.menus);
  applyRoleRestrictions(user.role);
  updateOnlineStatus(user);
  window.initData?.();                          // → data.js ✓
  navigateTo('dashboard');
  window.updateDate?.();                        // → data.js ✓
  window.renderNotifications?.();               // → ui-render.js (phase 7)
  window.renderNotifPermissionBtn?.();          // → ui-render.js (phase 7)
  window.showToast(`✅ Selamat datang, ${user.name}!`);

  const btn = document.getElementById('btn-login');
  if (btn) btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Masuk ke Dashboard';
}

// ── ROLE RESTRICTIONS ─────────────────────────────────────────────
export function applyRoleRestrictions(role) {
  const isSales = role === 'sales';
  const isOwner = role === 'owner';
  const el      = id => document.getElementById(id);

  // Barang: sales view-only
  if (el('btn-tambah-barang')) el('btn-tambah-barang').style.display = isSales ? 'none' : '';

  // Stok: sales can't do manual stok masuk/keluar
  document.querySelectorAll('#page-stok .btn-success, #page-stok .btn-danger')
    .forEach(b => b.style.display = isSales ? 'none' : '');

  // Mitra: sales can't add/delete
  if (el('btn-tambah-mitra')) el('btn-tambah-mitra').style.display = isSales ? 'none' : '';

  // Log: owner only
  const logNav = document.getElementById('nav-log');
  if (logNav) logNav.style.display = isOwner ? '' : 'none';

  // Gudang: sales can't add/delete
  if (el('btn-tambah-gudang')) el('btn-tambah-gudang').style.display = isSales ? 'none' : '';
}

// ── ONLINE STATUS ─────────────────────────────────────────────────
export function updateOnlineStatus(user) {
  if (!window.FA.currentUser()) return;
  const uid  = window.FA.currentUser().uid;
  const ref  = window.FS.docRef('test', 'online_' + uid);
  const data = {
    uid,
    name    : user.name,
    role    : user.role,
    avatar  : user.avatar,
    active  : true,
    lastSeen: window.FS.ts(),
  };
  window.FS.setDoc(ref, data).catch(() => {});

  // Heartbeat every 60s
  setInterval(
    () => window.FS.updateDoc(ref, { lastSeen: window.FS.ts() }).catch(() => {}),
    60_000
  );

  // Realtime listener for online users panel
  window.FS.onSnapshot(window.FS.query(window.FS.col('test')), snap => {
    state.onlineUsers = {};
    snap.docs.forEach(d => {
      const docData = d.data();
      if (docData.active && docData.uid) state.onlineUsers[docData.uid] = docData;
    });
    window.renderContactsList?.();   // → ui-render.js (phase 7)
    updateOnlineCount();
  });
}

export function updateOnlineCount() {
  const count = Object.keys(state.onlineUsers).length;
  const el    = document.getElementById('online-count');
  if (el) el.textContent = count + ' online';
}

// ── REGISTER AUTH LISTENER (runs immediately on module load) ──────
setupAuthListener();
