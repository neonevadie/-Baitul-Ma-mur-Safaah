// ================================================================
//  BMS — utils.js  (ES Module)
//  Utilitas bersama: format, toast, modal, log, helper
// ================================================================
import { state, DB, DEFAULT_KATEGORI } from './constants.js';
import { col, addDoc } from '../firebase.js';

// ── Format ────────────────────────────────────────────────────────
export function fmtRp(n) {
  return 'Rp ' + (Number(n) || 0).toLocaleString('id-ID');
}

export function terbilang(angka) {
  const satuan  = ['','Satu','Dua','Tiga','Empat','Lima','Enam','Tujuh','Delapan','Sembilan',
    'Sepuluh','Sebelas','Dua Belas','Tiga Belas','Empat Belas','Lima Belas','Enam Belas',
    'Tujuh Belas','Delapan Belas','Sembilan Belas'];
  const puluhan = ['','','Dua Puluh','Tiga Puluh','Empat Puluh','Lima Puluh',
    'Enam Puluh','Tujuh Puluh','Delapan Puluh','Sembilan Puluh'];
  function baca(n) {
    if (n < 20)         return satuan[n];
    if (n < 100)        return puluhan[Math.floor(n/10)] + (n%10 ? ' '+satuan[n%10] : '');
    if (n < 200)        return 'Seratus' + (n%100 ? ' '+baca(n%100) : '');
    if (n < 1000)       return satuan[Math.floor(n/100)] + ' Ratus' + (n%100 ? ' '+baca(n%100) : '');
    if (n < 2000)       return 'Seribu' + (n%1000 ? ' '+baca(n%1000) : '');
    if (n < 1e6)        return baca(Math.floor(n/1000)) + ' Ribu' + (n%1000 ? ' '+baca(n%1000) : '');
    if (n < 1e9)        return baca(Math.floor(n/1e6)) + ' Juta' + (n%1e6 ? ' '+baca(n%1e6) : '');
    if (n < 1e12)       return baca(Math.floor(n/1e9)) + ' Miliar' + (n%1e9 ? ' '+baca(n%1e9) : '');
    return n.toString();
  }
  const n = Math.round(Number(angka) || 0);
  return n === 0 ? 'Nol Rupiah' : baca(n) + ' Rupiah';
}

// ── Toast ─────────────────────────────────────────────────────────
let _toastTimer;
export function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  const icon  = document.getElementById('toast-icon');
  const msgEl = document.getElementById('toast-msg');
  if (!toast) return;
  msgEl.textContent = msg;
  const icons = { success:'fa-check-circle', error:'fa-times-circle', info:'fa-info-circle', warning:'fa-exclamation-circle' };
  icon.className = 'fas ' + (icons[type] || 'fa-check-circle');
  icon.style.color = type === 'error' ? '#ef4444' : '#10b981';
  const bgs = { success:'rgba(16,185,129,0.12)', error:'rgba(239,68,68,0.12)', info:'rgba(37,99,168,0.12)', warning:'rgba(245,158,11,0.12)' };
  toast.style.background = bgs[type] || bgs.success;
  toast.style.display = 'flex';
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { toast.style.display = 'none'; }, 3500);
}

// ── Modal ─────────────────────────────────────────────────────────
export function openModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.add('open'); document.body.style.overflow = 'hidden'; }
  if (id === 'modal-invoice') {
    setTimeout(() => {
      const rate = getPPNRate();
      const lbl  = document.getElementById('inv-ppn-label');
      if (lbl) lbl.textContent = rate === 0 ? 'PPN (nonaktif)' : `PPN ${rate}%`;
    }, 50);
  }
}

export function closeModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.remove('open'); document.body.style.overflow = ''; }
}

// ── Firebase Status ───────────────────────────────────────────────
export function updateFBStatus(s) {
  const el  = document.getElementById('fb-status');
  const txt = document.getElementById('fb-status-text');
  if (!el || !txt) return;
  const map = {
    online : { cls:'online',  text:'☁️ Firebase terhubung — data real-time' },
    offline: { cls:'offline', text:'⚠️ Tidak terhubung — cek koneksi internet atau Firestore Rules' },
    loading: { cls:'offline', text:'🔄 Menghubungkan ke Firebase...' },
    rules  : { cls:'offline', text:'🔒 Akses ditolak — periksa Firestore Security Rules v2.2' },
  };
  const v = map[s] || map.offline;
  el.className   = `firebase-status ${v.cls}`;
  txt.textContent = v.text;
}

// ── Log Aktivitas ─────────────────────────────────────────────────
export async function addLog(aksi, detail) {
  if (!state.currentUser) return;
  const data = {
    user: state.currentUser.name, role: state.currentUser.role,
    aksi, detail, waktu: new Date().toISOString()
  };
  try {
    await addDoc(col('log'), data);
  } catch(e) {
    DB.log.unshift({ ...data, _id: Date.now().toString() });
    if (e.code === 'permission-denied') {
      console.warn('Log gagal — permission denied. Pastikan Firestore Rules v2.1 aktif.');
    }
  }
}

// ── Date Helpers ──────────────────────────────────────────────────
export function updateDate() {
  const el = document.getElementById('topbar-date');
  if (el) el.textContent = new Date().toLocaleDateString('id-ID', {
    weekday:'short', day:'numeric', month:'short', year:'numeric'
  });
}

export function setDefaultDates() {
  const today = new Date().toISOString().split('T')[0];
  ['inv-tgl','pe-tgl','sm-tgl','sk-tgl','pb-tgl'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = today;
  });
  const t30 = new Date(); t30.setDate(t30.getDate() + 30);
  const el  = document.getElementById('inv-tempo');
  if (el) el.value = t30.toISOString().split('T')[0];
}

// ── Kategori ──────────────────────────────────────────────────────
export function getKategoriList() {
  try {
    const saved = localStorage.getItem('bms_kategori');
    return saved ? JSON.parse(saved) : [...DEFAULT_KATEGORI];
  } catch(e) { return [...DEFAULT_KATEGORI]; }
}

export function saveKategoriList(list) {
  localStorage.setItem('bms_kategori', JSON.stringify(list));
  if (state.appConfig) {
    state.appConfig.kategori = list;
  }
}

export function updateKategoriDropdowns() {
  const list = getKategoriList();
  const opts = list.map(k => `<option>${k}</option>`).join('');
  ['b-kategori','eb-kategori'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { const cur = el.value; el.innerHTML = opts; if (cur) el.value = cur; }
  });
}

// ── Page Check ────────────────────────────────────────────────────
export function isPageActive(id) {
  const el = document.getElementById('page-' + id);
  return el && el.classList.contains('active');
}

// ── PPN Rate ──────────────────────────────────────────────────────
export function getPPNRate() {
  const cbEl   = document.getElementById('set-ppn-aktif');
  const rateEl = document.getElementById('set-ppn-rate');
  if (cbEl && !cbEl.checked) return 0;
  const rate = parseFloat(rateEl?.value ?? state.appConfig?.ppnRate ?? 11);
  return isNaN(rate) ? (state.appConfig?.ppnRate ?? 11) : rate;
}

// ── Fill Dropdowns ────────────────────────────────────────────────
export function fillDropdowns() {
  const mitraOpts   = DB.mitra.map(m => `<option>${m.nama}</option>`).join('');
  const barangOpts  = DB.barang.map(b => `<option>${b.nama}</option>`).join('');
  const pemasokOpts = DB.mitra.filter(m => m.tipe === 'Pemasok').map(m => `<option>${m.nama}</option>`).join('');
  const safe = (id, inner) => { const el = document.getElementById(id); if (el) el.innerHTML = inner; };
  safe('inv-mitra',  '<option value="">Pilih Mitra...</option>'   + mitraOpts);
  safe('sm-barang',  '<option value="">Pilih Barang...</option>'  + barangOpts);
  safe('sk-barang',  '<option value="">Pilih Barang...</option>'  + barangOpts);
  safe('pb-barang',  '<option value="">Pilih Barang...</option>'  + barangOpts);
  safe('sm-pemasok', '<option value="">Pilih Pemasok...</option>' + pemasokOpts);
  safe('pb-pemasok', '<option value="">Pilih Pemasok...</option>' + pemasokOpts);
}

// ── Running Text ──────────────────────────────────────────────────
export function updateRunningText() {
  const el = document.getElementById('running-text-content');
  if (!el || !DB.barang.length) return;
  const sorted = [...DB.barang].sort((a, b) => (b.keluar || 0) - (a.keluar || 0));
  const items  = sorted.slice(0, 5).map(b =>
    `🔥 ${b.nama} — Rp ${(b.hjual || 0).toLocaleString('id-ID')} / ${b.satuan}`
  ).join('   ⬥   ');
  el.textContent = items + '   ⬥   ' + items;
}

// ── Notif Sound ───────────────────────────────────────────────────
export function playChatNotifSound() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.35);
  } catch(e) { /* AudioContext tidak tersedia */ }
}

// ── Kategori Management ───────────────────────────────────────────
export function tambahKategori() {
  const input = document.getElementById('new-kategori-nama');
  const nama  = input?.value.trim();
  if (!nama) { showToast('Isi nama kategori!', 'error'); return; }
  const list  = getKategoriList();
  if (list.some(k => k.toLowerCase() === nama.toLowerCase())) { showToast('Kategori sudah ada!', 'warning'); return; }
  list.push(nama);
  saveKategoriList(list);
  if (input) input.value = '';
  import('./ui-render.js').then(r => r.renderKategoriSettings());
  updateKategoriDropdowns();
  addLog('setting', 'Tambah kategori: ' + nama);
  showToast(`✅ Kategori "${nama}" ditambahkan!`);
}

export function hapusKategori(i) {
  const list = getKategoriList();
  const nama = list[i];
  if (!confirm(`Hapus kategori "${nama}"?`)) return;
  list.splice(i, 1);
  saveKategoriList(list);
  import('./ui-render.js').then(r => r.renderKategoriSettings());
  updateKategoriDropdowns();
  addLog('setting', 'Hapus kategori: ' + nama);
  showToast('🗑️ Kategori dihapus!');
}

// ── Browser Notification — FIX Safari iOS ────────────────────────
// Safari iOS tidak support Notification API → cek dulu sebelum akses
const _hasNotif = typeof Notification !== 'undefined';
let _notifPermission = _hasNotif ? (Notification.permission || 'default') : 'denied';

export async function requestNotifPermission() {
  if (!_hasNotif || !('Notification' in window)) return false;
  if (_notifPermission === 'granted') return true;
  try {
    const result = await Notification.requestPermission();
    _notifPermission = result;
    if (result === 'granted') {
      showBrowserNotif('BMS Notifikasi Aktif', 'Kamu akan menerima notifikasi stok kritis & invoice jatuh tempo.', 'success');
      addLog('setting', 'Aktifkan notifikasi browser');
    }
    return result === 'granted';
  } catch(e) { return false; }
}

export function showBrowserNotif(title, body, type, urgent = false) {
  if (!_hasNotif || !('Notification' in window) || _notifPermission !== 'granted') return;
  const opts = { body, icon: 'assets/img/logo.png', badge: 'assets/img/logo.png', tag: 'bms-' + (type||'info') + '-' + Date.now(), requireInteraction: urgent, silent: !urgent };
  if (navigator.serviceWorker?.ready) {
    navigator.serviceWorker.ready.then(reg => reg.showNotification(title, opts)).catch(() => { try { new Notification(title, opts); } catch(e){} });
  } else { try { new Notification(title, opts); } catch(e){} }
}

export function checkAndPushBrowserNotif() {
  if (!_hasNotif || _notifPermission !== 'granted') return;
  const today = new Date().toISOString().slice(0, 10);
  DB.barang.filter(b => b.stok <= b.minStok && b.stok > 0).forEach(b => {
    const key = 'notif_stok_' + b.kode + '_' + today;
    if (!sessionStorage.getItem(key)) { showBrowserNotif('Stok Kritis: ' + b.nama, `Sisa ${b.stok} ${b.satuan} — di bawah minimum (${b.minStok})`, 'danger', true); sessionStorage.setItem(key, '1'); }
  });
  DB.barang.filter(b => b.stok <= 0).forEach(b => {
    const key = 'notif_habis_' + b.kode + '_' + today;
    if (!sessionStorage.getItem(key)) { showBrowserNotif('Stok Habis: ' + b.nama, 'Produk ini tidak bisa dijual sampai stok diisi ulang.', 'danger', true); sessionStorage.setItem(key, '1'); }
  });
  DB.invoice.filter(i => i.status !== 'Lunas' && i.tempo === today).forEach(inv => {
    const key = 'notif_tempo_' + inv.no;
    if (!sessionStorage.getItem(key)) { showBrowserNotif('Invoice Jatuh Tempo: ' + inv.no, `${inv.mitra} — Rp ${(inv.total||0).toLocaleString('id-ID')} jatuh tempo hari ini!`, 'warning', true); sessionStorage.setItem(key, '1'); }
  });
}

export function renderNotifPermissionBtn() {
  const el = document.getElementById('notif-permission-btn');
  if (!el) return;
  if (!_hasNotif || !('Notification' in window)) { el.style.display = 'none'; return; }
  if (_notifPermission === 'granted') {
    el.innerHTML = '<i class="fas fa-bell"></i> Notifikasi Browser Aktif';
    el.style.opacity = '0.55'; el.style.cursor = 'default'; el.onclick = null;
  } else {
    el.innerHTML = '<i class="fas fa-bell"></i> Aktifkan Notifikasi Browser';
    el.style.opacity = '1'; el.style.cursor = 'pointer';
    el.onclick = async () => { await requestNotifPermission(); renderNotifPermissionBtn(); };
  }
}

// ── Search ────────────────────────────────────────────────────────
export function initSearch() {
  const searchMap = [
    { inputId:'search-barang',  tbodyId:'tbody-barang'  },
    { inputId:'search-invoice', tbodyId:'tbody-invoice' },
    { inputId:'search-mitra',   tbodyId:'tbody-mitra'   },
    { inputId:'search-stok',    tbodyId:'tbody-stok'    },
  ];
  const keyToRender = { 'search-barang':'barang', 'search-invoice':'invoice', 'search-mitra':'mitra' };
  searchMap.forEach(({ inputId, tbodyId }) => {
    const inp = document.getElementById(inputId); if (!inp) return;
    inp.addEventListener('input', e => {
      const q    = e.target.value.toLowerCase();
      const pKey = keyToRender[inputId];
      if (pKey) {
        import('./ui-render.js').then(r => {
          if (pKey === 'barang')  r.renderBarang();
          if (pKey === 'invoice') r.renderInvoice();
          if (pKey === 'mitra')   r.renderMitra();
        });
        return;
      }
      document.querySelectorAll(`#${tbodyId} tr`).forEach(r => {
        r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  });
  const gs = document.getElementById('global-search');
  if (gs) gs.addEventListener('input', e => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) return;
    if (DB.barang.some(b => b.nama.toLowerCase().includes(q) || b.kode.toLowerCase().includes(q)))
      { window.navigateTo?.('barang'); showToast('🔍 Hasil di Data Barang'); return; }
    if (DB.invoice.some(i => i.no.toLowerCase().includes(q) || i.mitra.toLowerCase().includes(q)))
      { window.navigateTo?.('invoice'); showToast('🔍 Hasil di Invoice'); return; }
    if (DB.mitra.some(m => m.nama.toLowerCase().includes(q)))
      { window.navigateTo?.('mitra'); showToast('🔍 Hasil di Mitra'); return; }
    showToast(`🔍 Tidak ditemukan hasil untuk "${q}"`, 'info');
  });
}
