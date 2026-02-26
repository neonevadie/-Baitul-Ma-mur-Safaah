// ================================================================
//  BMS — business.js  (ES Module) v11.0
//  Semua CRUD: Barang, Invoice, Mitra, Stok, Keuangan,
//  Opname, Settings, Chat, Export, Surat Jalan, Gudang
//
//  UPGRADE 4.1 — Foto: base64 → Firebase Storage (URL)
//  UPGRADE 7.3 — Error handling informatif di semua catch()
// ================================================================
import { DB, state } from './constants.js';
import { showToast, addLog, openModal, closeModal, isPageActive,
         getKategoriList, getPPNRate, setDefaultDates, fillDropdowns,
         updateRunningText } from './utils.js';
import * as fb from '../firebase.js';
import { createUser, reauthenticate, doUpdatePassword, currentFbUser } from '../firebase.js';

// ─── Internal shorthand ──────────────────────────────────────────
const FS = () => window.FS;  // Compat shim jika window.FS masih dipakai (app.js lama)
const cu = () => state.currentUser;

// ─── BARANG CRUD ─────────────────────────────────────────────────

/** UPGRADE 4.1: Kompres + upload foto ke Firebase Storage. Return array URL. */
async function _uploadFotoFiles(files, barangId) {
  const urls = [];
  for (const file of Array.from(files).slice(0, 4)) {
    try {
      // Kompres canvas sebelum upload
      const compressed = await _compressImage(file);
      const url = await fb.uploadFoto(compressed, barangId);
      urls.push(url);
    } catch(e) {
      // Upgrade 7.3: warning tapi tidak blokir
      console.warn('Upload foto gagal:', e.message);
      showToast('⚠️ Foto gagal diupload ke cloud: ' + e.message, 'warning');
    }
  }
  return urls;
}

async function _compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const MAX = 600;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else       { w = Math.round(w * MAX / h); h = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Compress gagal')), 'image/jpeg', 0.8);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function simpanBarang() {
  if (cu()?.role === 'sales') { showToast('❌ Sales tidak bisa tambah barang!', 'error'); return; }
  const nama = document.getElementById('b-nama')?.value.trim();
  const kode = document.getElementById('b-kode')?.value.trim();
  if (!nama || !kode) { showToast('Nama dan kode wajib diisi!', 'error'); return; }

  const baseData = {
    kode, nama,
    kategori: document.getElementById('b-kategori')?.value || 'Lainnya',
    satuan  : document.getElementById('b-satuan')?.value || 'Pcs',
    stok    : parseInt(document.getElementById('b-stok')?.value) || 0,
    hbeli   : parseInt(document.getElementById('b-hbeli')?.value) || 0,
    hjual   : parseInt(document.getElementById('b-hjual')?.value) || 0,
    minStok : parseInt(document.getElementById('b-minstock')?.value) || 20,
    lokasi  : document.getElementById('b-lokasi')?.value || '',
    masuk   : parseInt(document.getElementById('b-stok')?.value) || 0,
    keluar  : 0,
    foto    : [],
  };

  try {
    // Simpan dulu tanpa foto untuk dapat ID dokumen
    const ref    = await fb.addDoc(fb.col('barang'), baseData);
    const docId  = ref.id;
    // UPGRADE 4.1: Upload foto ke Storage menggunakan docId
    const fotoInput = document.getElementById('foto-input');
    if (fotoInput?.files?.length) {
      const urls = await _uploadFotoFiles(fotoInput.files, docId);
      if (urls.length) await fb.updateDoc(fb.docRef('barang', docId), { foto: urls });
      baseData.foto = urls;
    }
    addLog('tambah', 'Tambah barang: ' + nama);
    showToast('✅ Barang tersimpan ke cloud!');
  } catch(e) {
    // Upgrade 7.3: error informatif
    if (e.code === 'permission-denied') {
      showToast('❌ Akses ditolak — cek Firestore Rules!', 'error'); return;
    }
    DB.barang.unshift(baseData);
    const { renderBarang } = await import('./ui-render.js');
    renderBarang();
    showToast('✅ Barang ditambahkan (offline)');
  }

  fillDropdowns();
  closeModal('modal-barang');
  ['b-kode','b-nama','b-stok','b-hbeli','b-hjual','b-desc'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const prev = document.getElementById('foto-preview'); if (prev) prev.innerHTML = '';
}

export function editBarang(i) {
  const b = DB.barang[i]; if (!b) return;
  const safe = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
  safe('eb-idx',   i);
  safe('eb-kode',  b.kode);
  safe('eb-nama',  b.nama);
  safe('eb-hbeli', b.hbeli || 0);
  safe('eb-hjual', b.hjual || 0);
  safe('eb-stok',  b.stok || 0);
  safe('eb-minstock', b.minStok || 20);
  safe('eb-lokasi', b.lokasi || '');
  const katEl = document.getElementById('eb-kategori');
  if (katEl) {
    const cats = getKategoriList();
    katEl.innerHTML = cats.map(c => `<option${c === b.kategori ? ' selected' : ''}>${c}</option>`).join('');
  }
  const satEl = document.getElementById('eb-satuan'); if (satEl) satEl.value = b.satuan || 'Pcs';
  const prevEl = document.getElementById('eb-foto-preview');
  if (prevEl) {
    prevEl.innerHTML = (b.foto || []).map(src =>
      `<img src="${src}" style="width:64px;height:64px;object-fit:cover;border-radius:10px;border:2px solid var(--border)">`
    ).join('');
  }
  openModal('modal-edit-barang');
}

export async function simpanEditBarang() {
  if (cu()?.role === 'sales') { showToast('❌ Sales tidak bisa edit barang!', 'error'); return; }
  const i    = parseInt(document.getElementById('eb-idx')?.value);
  const b    = DB.barang[i]; if (!b) return;
  const nama = document.getElementById('eb-nama')?.value.trim();
  const kode = document.getElementById('eb-kode')?.value.trim();
  if (!nama || !kode) { showToast('Nama dan kode wajib diisi!', 'error'); return; }

  let fotoArr = b.foto || [];
  const newFotoInput = document.getElementById('eb-foto-input');
  if (newFotoInput?.files?.length) {
    // UPGRADE 4.1: Upload foto baru ke Storage
    const docId = b._id || kode;
    fotoArr = await _uploadFotoFiles(newFotoInput.files, docId);
  }

  const updated = {
    kode, nama,
    kategori: document.getElementById('eb-kategori')?.value || b.kategori,
    satuan  : document.getElementById('eb-satuan')?.value   || b.satuan,
    hbeli   : parseInt(document.getElementById('eb-hbeli')?.value) || 0,
    hjual   : parseInt(document.getElementById('eb-hjual')?.value) || 0,
    stok    : parseInt(document.getElementById('eb-stok')?.value) || 0,
    minStok : parseInt(document.getElementById('eb-minstock')?.value) || 20,
    lokasi  : document.getElementById('eb-lokasi')?.value || '',
    masuk   : b.masuk || 0, keluar: b.keluar || 0,
    foto    : fotoArr,
  };

  try {
    if (b._id) {
      await fb.updateDoc(fb.docRef('barang', b._id), updated);
    } else {
      DB.barang[i] = { ...b, ...updated };
      const { renderBarang, renderStok } = await import('./ui-render.js');
      renderBarang(); renderStok(); fillDropdowns();
    }
    addLog('edit', 'Edit barang: ' + nama);
    showToast('✅ Barang berhasil diupdate!');
  } catch(e) {
    if (e.code === 'permission-denied') {
      showToast('❌ Akses ditolak — cek Firestore Rules!', 'error');
    } else {
      DB.barang[i] = { ...b, ...updated };
      const { renderBarang, renderStok } = await import('./ui-render.js');
      renderBarang(); renderStok(); fillDropdowns();
      showToast('✅ Barang diupdate (offline)');
    }
  }
  closeModal('modal-edit-barang');
}

export async function hapusBarang(i) {
  if (cu()?.role === 'sales') { showToast('❌ Sales tidak bisa hapus barang!', 'error'); return; }
  const b = DB.barang[i]; if (!b) return;
  if (!confirm(`Hapus barang "${b.nama}"?`)) return;
  try {
    if (b._id) await fb.deleteDoc_(fb.docRef('barang', b._id));
    else { DB.barang.splice(i, 1); const { renderBarang } = await import('./ui-render.js'); renderBarang(); }
    addLog('hapus', 'Hapus barang: ' + b.nama);
    showToast('🗑️ Barang dihapus!');
  } catch(e) {
    if (e.code === 'permission-denied') {
      showToast('❌ Akses ditolak — cek Firestore Rules!', 'error');
    } else {
      DB.barang.splice(i, 1);
      const { renderBarang } = await import('./ui-render.js');
      renderBarang();
      showToast('🗑️ Barang dihapus (offline)');
    }
  }
}

/** UPGRADE 4.1: Preview foto dengan kompresi canvas */
export function previewFoto(event) {
  const preview  = document.getElementById('foto-preview');
  if (!preview) return;
  preview.innerHTML = '';
  const MAX_MB = 1;
  Array.from(event.target.files).slice(0, 4).forEach(file => {
    if (file.size > MAX_MB * 1024 * 1024) {
      showToast(`⚠️ "${file.name}" terlalu besar (maks ${MAX_MB}MB).`, 'warning'); return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const imgEl = new Image();
      imgEl.onload = () => {
        const MAX_DIM = 400;
        let w = imgEl.width, h = imgEl.height;
        if (w > MAX_DIM || h > MAX_DIM) {
          if (w > h) { h = Math.round(h * MAX_DIM / w); w = MAX_DIM; }
          else       { w = Math.round(w * MAX_DIM / h); h = MAX_DIM; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(imgEl, 0, 0, w, h);
        const compressed = canvas.toDataURL('image/jpeg', 0.75);
        const img = document.createElement('img');
        img.src = compressed;
        img.style.cssText = 'width:80px;height:80px;object-fit:cover;border-radius:10px;border:2px solid var(--border)';
        preview.appendChild(img);
        const kb = Math.round(compressed.length * 0.75 / 1024);
        if (kb > 200) showToast(`⚠️ Foto ${kb}KB — akan diupload ke Firebase Storage.`, 'info');
      };
      imgEl.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ─── INVOICE ITEMS ────────────────────────────────────────────────

export function addInvItem() {
  const items = state.invItems;
  const idx   = items.length;
  items.push({ nama: '', qty: 1, harga: 0, total: 0, satuan: 'Pcs' });
  const row = document.createElement('tr');
  row.id    = `inv-row-${idx}`;
  row.innerHTML = `
    <td>
      <select class="form-control" onchange="updateItemBarang(${idx},this)" style="min-width:180px">
        <option value="">-- Pilih Barang --</option>
        ${DB.barang.map(b => `<option value="${b.nama}" data-harga="${b.hjual}" data-satuan="${b.satuan}">${b.nama} (Stok: ${b.stok})</option>`).join('')}
      </select>
    </td>
    <td><input type="number" id="inv-qty-${idx}" class="form-control" value="1" min="1" style="width:80px" oninput="updateItemQty(${idx},this)"></td>
    <td id="inv-harga-${idx}" style="padding:8px;font-weight:600">Rp 0</td>
    <td id="inv-total-${idx}" style="padding:8px;font-weight:700;color:var(--primary-light)">Rp 0</td>
    <td><button class="btn btn-sm btn-danger" onclick="removeInvItem(${idx},this.closest('tr'))"><i class="fas fa-trash"></i></button></td>`;
  document.getElementById('inv-items')?.appendChild(row);
}

export function updateItemBarang(idx, sel) {
  const opt   = sel.selectedOptions[0];
  const nama  = sel.value;
  const harga = parseInt(opt?.dataset.harga) || 0;
  const sat   = opt?.dataset.satuan || 'Pcs';
  const qty   = parseInt(document.getElementById(`inv-qty-${idx}`)?.value) || 1;
  state.invItems[idx] = { nama, qty, harga, total: qty * harga, satuan: sat };
  const hEl = document.getElementById(`inv-harga-${idx}`);
  const tEl = document.getElementById(`inv-total-${idx}`);
  if (hEl) hEl.textContent = 'Rp ' + harga.toLocaleString('id-ID');
  if (tEl) tEl.textContent = 'Rp ' + (qty * harga).toLocaleString('id-ID');
  hitungTotal();
}

export function updateItemQty(idx, input) {
  const qty   = parseInt(input.value) || 1;
  const item  = state.invItems[idx];
  if (!item) return;
  item.qty   = qty;
  item.total = qty * item.harga;
  const tEl  = document.getElementById(`inv-total-${idx}`);
  if (tEl) tEl.textContent = 'Rp ' + item.total.toLocaleString('id-ID');
  hitungTotal();
}

export function removeInvItem(idx, row) { state.invItems[idx] = null; row?.remove(); hitungTotal(); }

export function hitungTotal() {
  const items    = state.invItems.filter(Boolean);
  const subtotal = items.reduce((s, i) => s + (i.total || 0), 0);
  const diskon   = parseFloat(document.getElementById('inv-diskon')?.value) || 0;
  const afterD   = subtotal * (1 - diskon / 100);
  const ppnRate  = getPPNRate();
  const ppn      = afterD * (ppnRate / 100);
  const total    = Math.round(afterD + ppn);
  const fmt      = n => 'Rp ' + n.toLocaleString('id-ID');
  const safe     = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  safe('inv-subtotal', fmt(subtotal));
  safe('inv-diskon-val', fmt(subtotal - afterD));
  safe('inv-ppn-val', fmt(ppn));
  safe('inv-total', fmt(total));
  // Toggle PPN row visibility
  const ppnRow = document.getElementById('inv-ppn-row');
  if (ppnRow) ppnRow.style.display = ppnRate > 0 ? '' : 'none';
  const ppnLbl = document.getElementById('inv-ppn-label');
  if (ppnLbl) ppnLbl.textContent = ppnRate === 0 ? 'PPN (nonaktif)' : `PPN ${ppnRate}%`;
}

export function toggleTempoField(metode) {
  const row = document.getElementById('tempo-row');
  if (row) row.style.display = metode === 'Tempo' ? 'flex' : 'none';
}

// ─── INVOICE CRUD ─────────────────────────────────────────────────

export async function simpanInvoice() {
  const mitra = document.getElementById('inv-mitra')?.value;
  const items = state.invItems.filter(Boolean);
  if (!mitra)           { showToast('Pilih mitra terlebih dahulu!', 'error'); return; }
  if (!items.length)    { showToast('Tambahkan minimal 1 item!', 'error'); return; }

  // Validasi stok
  for (const item of items) {
    if (!item.nama) continue;
    const b = DB.barang.find(b => b.nama === item.nama);
    if (!b) { showToast(`❌ Barang "${item.nama}" tidak ditemukan!`, 'error'); return; }
    if (b.stok < item.qty) {
      showToast(`❌ Stok ${item.nama} tidak cukup! Sisa: ${b.stok} ${b.satuan}`, 'error'); return;
    }
  }

  const subtotal    = items.reduce((s, i) => s + i.total, 0);
  const diskon      = parseFloat(document.getElementById('inv-diskon')?.value) || 0;
  const afterD      = subtotal * (1 - diskon / 100);
  const ppnRate     = getPPNRate();
  const ppn         = afterD * (ppnRate / 100);
  const total       = Math.round(afterD + ppn);
  const metodeBayar = document.getElementById('inv-bayar')?.value || 'Tempo';
  const status      = (metodeBayar === 'Tunai' || metodeBayar === 'Transfer') ? 'Lunas' : 'Belum Lunas';

  state.invCounter++;
  const data = {
    no          : document.getElementById('inv-no')?.value,
    tgl         : document.getElementById('inv-tgl')?.value,
    tempo       : metodeBayar === 'Tempo' ? (document.getElementById('inv-tempo')?.value || '-') : '-',
    metodeBayar, mitra, total, status, items, diskon,
    ppnRate, ppnAktif: ppnRate > 0,
    catatan     : document.getElementById('inv-catatan')?.value.trim() || '',
    salesName   : cu()?.name || '',
    salesUid    : cu()?.uid  || '',
  };

  try {
    await fb.addDoc(fb.col('invoice'), data);
    // Update stok + piutang
    for (const item of items) {
      if (!item.nama) continue;
      const b = DB.barang.find(b => b.nama === item.nama);
      if (b && b._id) {
        const newStok   = Math.max(0, b.stok - item.qty);
        const newKeluar = (b.keluar || 0) + item.qty;
        await fb.updateDoc(fb.docRef('barang', b._id), { stok: newStok, keluar: newKeluar }).catch(() => {});
        b.stok = newStok; b.keluar = newKeluar;
      }
    }
    if (status === 'Belum Lunas' && mitra) {
      const m = DB.mitra.find(m => m.nama === mitra);
      if (m) {
        m.piutang = (m.piutang || 0) + total;
        if (m._id) fb.updateDoc(fb.docRef('mitra', m._id), { piutang: m.piutang }).catch(() => {});
      }
    }
    addLog('invoice', 'Buat ' + data.no + ' (' + metodeBayar + ') — Rp ' + total.toLocaleString('id-ID'));
    showToast('✅ Transaksi tersimpan! Status: ' + status);
  } catch(e) {
    if (e.code === 'permission-denied') {
      showToast('❌ Akses ditolak — cek Firestore Rules!', 'error'); return;
    }
    for (const item of items) {
      const b = DB.barang.find(b => b.nama === item.nama);
      if (b) { b.stok = Math.max(0, b.stok - item.qty); b.keluar = (b.keluar || 0) + item.qty; }
    }
    DB.invoice.unshift(data);
    const r = await import('./ui-render.js');
    r.renderInvoice(); r.renderBarang(); r.renderStok();
    showToast('✅ Transaksi dibuat (offline). Status: ' + status);
  }

  closeModal('modal-invoice');
  state.invItems = [];
  document.getElementById('inv-items').innerHTML = '';
  document.getElementById('inv-no').value = `TRX-${new Date().getFullYear()}-${state.invCounter}`;
  const catatanEl = document.getElementById('inv-catatan'); if (catatanEl) catatanEl.value = '';
  hitungTotal();
  const r = await import('./ui-render.js');
  r.renderBarang(); r.renderStok(); r.renderStokKritis();
}

export async function tandaiLunas(i) {
  const inv = DB.invoice[i]; if (!inv) return;
  const prevStatus = inv.status;
  const updates    = { status: 'Lunas', tglLunas: new Date().toISOString().slice(0, 10) };
  if (inv._id) {
    try {
      await fb.updateDoc(fb.docRef('invoice', inv._id), updates);
      Object.assign(inv, updates);
    } catch(e) {
      if (e.code === 'permission-denied') {
        showToast('❌ Tidak ada izin. Cek Firestore Rules!', 'error'); return;
      }
      Object.assign(inv, updates);
      showToast('⚠️ Offline — status diupdate lokal', 'warning');
    }
  } else { Object.assign(inv, updates); }

  // Update piutang mitra
  if (prevStatus !== 'Lunas' && inv.mitra) {
    const m = DB.mitra.find(m => m.nama === inv.mitra);
    if (m) {
      m.piutang = Math.max(0, (m.piutang || 0) - (inv.total || 0));
      if (m._id) fb.updateDoc(fb.docRef('mitra', m._id), { piutang: m.piutang }).catch(() => {});
    }
  }
  const r = await import('./ui-render.js');
  r.renderInvoice(); r.renderInvoiceStats(); r.renderMitra(); r.renderDashboardStats();
  if (isPageActive('laporan')) r.buildLaporanChart();
  addLog('invoice', 'Tandai lunas: ' + inv.no);
  showToast('✅ Invoice ' + inv.no + ' ditandai Lunas!');
}

export function editInvoice(i) {
  const inv = DB.invoice[i]; if (!inv) return;
  const safe = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
  safe('ei-idx',     i);
  safe('ei-no',      inv.no);
  safe('ei-tempo',   inv.tempo !== '-' ? inv.tempo : '');
  safe('ei-catatan', inv.catatan || '');
  const sEl = document.getElementById('ei-status'); if (sEl) sEl.value = inv.status || 'Belum Lunas';
  openModal('modal-edit-invoice');
}

export async function simpanEditInvoice() {
  const i   = parseInt(document.getElementById('ei-idx')?.value);
  const inv = DB.invoice[i]; if (!inv) return;
  if (cu()?.role === 'sales' && inv.salesUid !== cu().uid) {
    showToast('❌ Sales hanya bisa edit invoice miliknya!', 'error'); return;
  }
  const updates = {
    status  : document.getElementById('ei-status')?.value,
    tempo   : document.getElementById('ei-tempo')?.value || '-',
    catatan : document.getElementById('ei-catatan')?.value.trim() || '',
  };
  try {
    if (inv._id) await fb.updateDoc(fb.docRef('invoice', inv._id), updates);
    else { Object.assign(DB.invoice[i], updates); const r = await import('./ui-render.js'); r.renderInvoice(); }
    addLog('edit', `Edit invoice ${inv.no}: status → ${updates.status}`);
    showToast('✅ Invoice berhasil diupdate!');
  } catch(e) {
    Object.assign(DB.invoice[i], updates);
    const r = await import('./ui-render.js'); r.renderInvoice();
    showToast('✅ Invoice diupdate (offline)');
  }
  closeModal('modal-edit-invoice');
}

export async function hapusTransaksi(i) {
  const inv = DB.invoice[i]; if (!inv) return;
  if (!confirm(`Hapus invoice "${inv.no}"? Stok tidak akan dikembalikan.`)) return;
  try {
    if (inv._id) await fb.deleteDoc_(fb.docRef('invoice', inv._id));
    else { DB.invoice.splice(i, 1); }
    addLog('hapus', 'Hapus invoice: ' + inv.no);
    showToast('🗑️ Invoice dihapus!');
  } catch(e) {
    if (e.code === 'permission-denied') {
      showToast('❌ Akses ditolak — cek Firestore Rules!', 'error');
    } else {
      DB.invoice.splice(i, 1);
      const r = await import('./ui-render.js'); r.renderInvoice();
      showToast('🗑️ Invoice dihapus (offline)');
    }
  }
}

export function previewInvoice() {
  const mitra    = document.getElementById('inv-mitra')?.value || 'Nama Mitra';
  const items    = state.invItems.filter(Boolean);
  const subtotal = items.reduce((s, i) => s + (i.total || 0), 0);
  const diskon   = parseFloat(document.getElementById('inv-diskon')?.value) || 0;
  const afterD   = subtotal * (1 - diskon / 100);
  const ppnRate  = getPPNRate();
  const ppn      = afterD * (ppnRate / 100);
  const total    = afterD + ppn;
  const catatan  = document.getElementById('inv-catatan')?.value.trim() || '';
  const co       = state.appConfig?.company || {};
  const fmt      = n => 'Rp ' + n.toLocaleString('id-ID');
  document.getElementById('invoice-preview-content').innerHTML = `
    <div class="invoice-header">
      <div class="invoice-company">
        <h2>${co.nama || "Baitul Ma'mur Syafaah"}</h2>
        <p>${co.alamat || 'Ruko Villa Bogor Indah 5, Bogor'}<br>
        Telp: ${co.telp || '(0251) 8xxx'} | Email: ${co.email || 'info@bms-syafaah.id'} | NPWP: ${co.npwp || 'xx.xxx'}</p>
      </div>
      <div class="invoice-meta">
        <h1>INVOICE</h1>
        <p>No: <strong>${document.getElementById('inv-no')?.value}</strong></p>
        <p>Tanggal: ${document.getElementById('inv-tgl')?.value}</p>
        <p>Jatuh Tempo: ${document.getElementById('inv-tempo')?.value || '-'}</p>
      </div>
    </div>
    <div class="invoice-client"><strong>Kepada Yth:</strong><br><strong>${mitra}</strong></div>
    <table class="invoice-table">
      <thead><tr><th>#</th><th>Barang</th><th>Qty</th><th>Harga</th><th>Subtotal</th></tr></thead>
      <tbody>
        ${items.map((it, i) => `<tr><td>${i+1}</td><td>${it.nama}</td><td>${it.qty} ${it.satuan || ''}</td><td>${fmt(it.harga)}</td><td>${fmt(it.total)}</td></tr>`).join('')}
      </tbody>
    </table>
    <div class="invoice-totals">
      <div class="total-row"><span>Subtotal</span><span>${fmt(subtotal)}</span></div>
      ${diskon ? `<div class="total-row"><span>Diskon ${diskon}%</span><span>- ${fmt(subtotal - afterD)}</span></div>` : ''}
      ${ppnRate > 0 ? `<div class="total-row"><span>PPN ${ppnRate}%</span><span>${fmt(ppn)}</span></div>` : ''}
      <div class="total-row grand-total"><span>TOTAL</span><span>${fmt(total)}</span></div>
    </div>
    ${catatan ? `<div class="invoice-catatan"><strong>Catatan:</strong> ${catatan}</div>` : ''}`;
  openModal('modal-invoice-preview');
}

export function printInvoice() {
  const content = document.getElementById('invoice-preview-content')?.innerHTML;
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><title>Invoice</title>
    <style>body{font-family:Arial,sans-serif;padding:20px}
    .invoice-header{display:flex;justify-content:space-between;margin-bottom:20px}
    .invoice-table{width:100%;border-collapse:collapse;margin:20px 0}
    .invoice-table th,.invoice-table td{border:1px solid #ddd;padding:8px}
    .invoice-totals{text-align:right}.total-row{display:flex;justify-content:space-between;padding:4px 0}
    .grand-total{font-weight:800;font-size:1.1em;border-top:2px solid #333;margin-top:4px}
    </style></head><body>${content}</body></html>`);
  w.document.close(); w.focus(); w.print();
}

// ─── MITRA CRUD ───────────────────────────────────────────────────

export async function simpanMitra() {
  if (cu()?.role === 'sales') { showToast('❌ Sales tidak bisa tambah mitra!', 'error'); return; }
  const nama = document.getElementById('m-nama')?.value.trim();
  if (!nama) { showToast('Nama mitra wajib diisi!', 'error'); return; }
  const kode = `MTR-${String(DB.mitra.length + 1).padStart(3, '0')}`;
  const data = {
    kode, nama,
    tipe   : document.getElementById('m-tipe')?.value || 'Pelanggan',
    pic    : document.getElementById('m-pic')?.value || '',
    hp     : document.getElementById('m-hp')?.value || '',
    kota   : document.getElementById('m-kota')?.value || '',
    alamat : document.getElementById('m-alamat')?.value.trim() || '',
    piutang: 0, status: 'Aktif',
  };
  try {
    await fb.addDoc(fb.col('mitra'), data);
    addLog('tambah', 'Tambah mitra: ' + nama);
    showToast('✅ Mitra tersimpan ke cloud!');
  } catch(e) {
    if (e.code === 'permission-denied') { showToast('❌ Akses ditolak — cek Firestore Rules!', 'error'); return; }
    DB.mitra.push(data);
    const { renderMitra } = await import('./ui-render.js'); renderMitra();
    showToast('✅ Mitra ditambahkan (offline)');
  }
  fillDropdowns();
  closeModal('modal-mitra');
  ['m-nama','m-pic','m-hp','m-kota','m-alamat'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
}

export async function hapusMitra(i) {
  if (cu()?.role === 'sales') { showToast('❌ Sales tidak bisa hapus mitra!', 'error'); return; }
  const m = DB.mitra[i]; if (!confirm(`Hapus mitra "${m.nama}"?`)) return;
  try {
    if (m._id) await fb.deleteDoc_(fb.docRef('mitra', m._id));
    else { DB.mitra.splice(i, 1); const { renderMitra } = await import('./ui-render.js'); renderMitra(); }
    addLog('hapus', 'Hapus mitra: ' + m.nama);
    showToast('🗑️ Mitra dihapus!');
  } catch(e) {
    DB.mitra.splice(i, 1);
    const { renderMitra } = await import('./ui-render.js'); renderMitra();
    showToast('🗑️ Mitra dihapus (offline)');
  }
}

// ─── STOK ─────────────────────────────────────────────────────────

export async function simpanStokMasuk() {
  if (cu()?.role === 'sales') { showToast('❌ Sales tidak bisa input stok masuk!', 'error'); return; }
  const nama    = document.getElementById('sm-barang')?.value;
  const qty     = parseInt(document.getElementById('sm-qty')?.value) || 0;
  const harga   = parseInt(document.getElementById('sm-harga')?.value) || 0;
  const pemasok = document.getElementById('sm-pemasok')?.value || '-';
  const tgl     = document.getElementById('sm-tgl')?.value;
  if (!nama || qty <= 0) { showToast('Lengkapi data stok masuk!', 'error'); return; }
  const b = DB.barang.find(b => b.nama === nama); if (!b) return;
  b.stok += qty; b.masuk = (b.masuk || 0) + qty;
  if (b._id) {
    try { await fb.updateDoc(fb.docRef('barang', b._id), { stok: b.stok, masuk: b.masuk }); }
    catch(e) { /* offline — local ok */ }
  }
  if (harga > 0) {
    const pbData = { tgl, pemasok, barang: nama, qty, total: qty * harga };
    try { await fb.addDoc(fb.col('pembelian'), pbData); }
    catch(e) { DB.pembelian.unshift(pbData); }
    const { renderPembelian } = await import('./ui-render.js'); renderPembelian();
  }
  const r = await import('./ui-render.js'); r.renderStok(); r.renderBarang(); r.renderStokKritis();
  addLog('stok', `Stok masuk ${nama} +${qty}`);
  closeModal('modal-stok-masuk');
  showToast(`✅ Stok ${nama} +${qty}!`);
}

export async function simpanStokKeluar() {
  if (cu()?.role === 'sales') { showToast('❌ Sales tidak bisa input stok keluar manual!', 'error'); return; }
  const nama = document.getElementById('sk-barang')?.value;
  const qty  = parseInt(document.getElementById('sk-qty')?.value) || 0;
  if (!nama || qty <= 0) { showToast('Lengkapi data stok keluar!', 'error'); return; }
  const b = DB.barang.find(b => b.nama === nama); if (!b) return;
  if (b.stok < qty) { showToast('❌ Stok tidak mencukupi!', 'error'); return; }
  b.stok -= qty; b.keluar = (b.keluar || 0) + qty;
  if (b._id) try { await fb.updateDoc(fb.docRef('barang', b._id), { stok: b.stok, keluar: b.keluar }); } catch(e) {}
  const r = await import('./ui-render.js'); r.renderStok(); r.renderBarang(); r.renderStokKritis();
  addLog('stok', `Stok keluar ${nama} -${qty}`);
  closeModal('modal-stok-keluar');
  showToast(`✅ Stok keluar ${nama} -${qty}!`);
}

// ─── KEUANGAN ────────────────────────────────────────────────────

export async function simpanPengeluaran() {
  if (cu()?.role === 'sales') { showToast('❌ Sales tidak bisa input pengeluaran!', 'error'); return; }
  const ket = document.getElementById('pe-ket')?.value.trim();
  const jml = parseInt(document.getElementById('pe-jml')?.value) || 0;
  if (!ket || jml <= 0) { showToast('Lengkapi data pengeluaran!', 'error'); return; }
  const data = { tgl: document.getElementById('pe-tgl')?.value, ket, jml, kat: document.getElementById('pe-kat')?.value || 'Lain-lain' };
  try {
    await fb.addDoc(fb.col('pengeluaran'), data);
    addLog('tambah', 'Pengeluaran: ' + ket);
    showToast('✅ Pengeluaran tersimpan!');
  } catch(e) {
    DB.pengeluaran.unshift(data);
    const { renderPengeluaran } = await import('./ui-render.js'); renderPengeluaran();
    showToast('✅ Pengeluaran dicatat (offline)');
  }
  closeModal('modal-pengeluaran');
}

export async function simpanPembelian() {
  if (cu()?.role === 'sales') { showToast('❌ Sales tidak bisa input pembelian!', 'error'); return; }
  const pemasok = document.getElementById('pb-pemasok')?.value;
  const barang  = document.getElementById('pb-barang')?.value;
  const qty     = parseInt(document.getElementById('pb-qty')?.value) || 0;
  const harga   = parseInt(document.getElementById('pb-harga')?.value) || 0;
  if (!pemasok || !barang || qty <= 0) { showToast('Lengkapi data pembelian!', 'error'); return; }
  const data = { tgl: document.getElementById('pb-tgl')?.value, pemasok, barang, qty, total: qty * harga };
  try {
    await fb.addDoc(fb.col('pembelian'), data);
    addLog('tambah', 'Pembelian: ' + barang);
    showToast('✅ Pembelian tersimpan!');
  } catch(e) {
    DB.pembelian.unshift(data);
    const { renderPembelian } = await import('./ui-render.js'); renderPembelian();
    showToast('✅ Pembelian dicatat (offline)');
  }
  const b = DB.barang.find(x => x.nama === barang);
  if (b) {
    b.stok = (b.stok || 0) + qty; b.masuk = (b.masuk || 0) + qty;
    if (b._id) try { await fb.updateDoc(fb.docRef('barang', b._id), { stok: b.stok, masuk: b.masuk }); } catch(e) {}
    const r = await import('./ui-render.js'); r.renderBarang(); r.renderStok(); r.renderStokKritis();
  }
  closeModal('modal-pembelian');
}

// ─── OPNAME ──────────────────────────────────────────────────────

export async function simpanOpnameRow(i) {
  if (cu()?.role === 'sales') { showToast('❌ Sales tidak bisa melakukan opname!', 'error'); return; }
  const b      = DB.barang[i]; if (!b) return;
  const aktual = parseInt(document.getElementById(`op-act-${i}`)?.value) || 0;
  const note   = document.getElementById(`op-note-${i}`)?.value || '';
  const selisih = aktual - b.stok;
  if (!confirm(`Simpan stok aktual "${b.nama}"?\nSistem: ${b.stok} → Aktual: ${aktual} (${selisih >= 0 ? '+' : ''}${selisih})`)) return;
  const btn = document.getElementById(`op-save-${i}`);
  if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; btn.disabled = true; }
  try {
    if (b._id) {
      await fb.updateDoc(fb.docRef('barang', b._id), {
        stok  : aktual,
        keluar: (b.keluar || 0) + Math.max(0, b.stok - aktual),
        masuk : (b.masuk  || 0) + Math.max(0, aktual - b.stok),
      });
    } else { b.stok = aktual; }
    await fb.addDoc(fb.col('opname'), {
      tgl: new Date().toISOString().slice(0, 10),
      kode: b.kode, nama: b.nama, satuan: b.satuan,
      stokSistem: b.stok, stokAktual: aktual, selisih,
      catatan: note, user: cu()?.name || '-',
    });
    addLog('stok', `Opname ${b.nama}: ${b.stok} → ${aktual}`);
    showToast(`✅ Stok ${b.nama} diupdate ke ${aktual}!`);
    b.stok = aktual;
    if (btn) { btn.innerHTML = '<i class="fas fa-check"></i>'; btn.style.background = 'var(--accent2)'; }
    setTimeout(() => { import('./ui-render.js').then(r => r.renderOpname()); }, 800);
  } catch(e) {
    showToast('❌ Gagal simpan opname: ' + e.message, 'error');
    if (btn) { btn.innerHTML = '<i class="fas fa-save"></i>'; btn.disabled = false; }
  }
}

export async function simpanSemuaOpname() {
  const changed = DB.barang.filter((b, i) => {
    const a = parseInt(document.getElementById(`op-act-${i}`)?.value); return !isNaN(a) && a !== b.stok;
  });
  if (!changed.length) { showToast('Tidak ada perubahan.', 'info'); return; }
  if (!confirm(`Simpan ${changed.length} perubahan stok?`)) return;
  showToast('⏳ Menyimpan semua...', 'info');
  let ok = 0;
  for (let i = 0; i < DB.barang.length; i++) {
    const b = DB.barang[i];
    const a = parseInt(document.getElementById(`op-act-${i}`)?.value);
    if (isNaN(a) || a === b.stok) continue;
    try {
      if (b._id) await fb.updateDoc(fb.docRef('barang', b._id), { stok: a });
      await fb.addDoc(fb.col('opname'), {
        tgl: new Date().toISOString().slice(0, 10),
        kode: b.kode, nama: b.nama, satuan: b.satuan,
        stokSistem: b.stok, stokAktual: a, selisih: a - b.stok,
        catatan: document.getElementById(`op-note-${i}`)?.value || '',
        user: cu()?.name || '-',
      });
      b.stok = a; ok++;
    } catch(e) { console.warn('Opname row error:', e.message); }
  }
  addLog('stok', `Opname massal: ${ok} barang diupdate`);
  showToast(`✅ ${ok} stok berhasil disimpan!`);
  setTimeout(() => { import('./ui-render.js').then(r => r.renderOpname()); }, 600);
}

export async function generateOpname() {
  const rows = DB.barang.map((b, i) => {
    const a = parseInt(document.getElementById(`op-act-${i}`)?.value) ?? b.stok;
    const n = document.getElementById(`op-note-${i}`)?.value || '';
    const s = a - b.stok;
    const st = a <= 0 ? 'Habis' : a <= b.minStok ? 'Kritis' : 'Aman';
    return [b.kode, `"${b.nama}"`, b.satuan, b.stok, a, s, st, `"${n}"`].join(',');
  });
  const csv  = ['Kode,Nama,Satuan,Stok Sistem,Stok Aktual,Selisih,Status,Catatan', ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `StockOpname_BMS_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
  addLog('export', 'Stock Opname digenerate');
  showToast('📊 Laporan Stock Opname berhasil diunduh!');
}

// ─── SETTINGS ────────────────────────────────────────────────────

export async function saveCompanyProfile() {
  if (cu()?.role === 'sales') { showToast('❌ Sales tidak bisa ubah profil!', 'error'); return; }
  const g = id => document.getElementById(id)?.value.trim() || '';
  const company   = { nama: g('set-company-nama'), alamat: g('set-company-alamat'), telp: g('set-company-telp'), email: g('set-company-email'), npwp: g('set-company-npwp'), rekening: g('set-company-rek') };
  const bonusRate = parseInt(document.getElementById('set-bonus-rate')?.value) || 2;
  const ppnRate   = parseInt(document.getElementById('set-ppn-rate')?.value) ?? 11;
  const ppnAktif  = document.getElementById('set-ppn-aktif')?.checked !== false;
  if (!state.appConfig) state.appConfig = {};
  Object.assign(state.appConfig, { company, bonusRate, ppnRate, ppnAktif, kategori: getKategoriList() });
  try {
    await fb.setDoc(fb.docRef('test', 'appConfig'), state.appConfig);
    showToast('✅ Profil perusahaan tersimpan!');
    addLog('setting', 'Update profil perusahaan');
  } catch(e) { showToast('❌ Gagal simpan profil: ' + e.message, 'error'); }
}

export async function tambahUserSales() {
  if (cu()?.role !== 'owner') { showToast('❌ Hanya Owner yang bisa tambah akun sales!', 'error'); return; }
  const name  = document.getElementById('new-sales-name')?.value.trim();
  const email = document.getElementById('new-sales-email')?.value.trim();
  const pass  = document.getElementById('new-sales-pass')?.value.trim();
  if (!name || !email || !pass) { showToast('Lengkapi semua field!', 'error'); return; }
  try {
    showToast('⏳ Membuat akun...', 'info');
    const uid = await createUser(email, pass);
    if (!state.appConfig) state.appConfig = {};
    if (!state.appConfig.salesUsers) state.appConfig.salesUsers = [];
    const id = 's' + Date.now();
    state.appConfig.salesUsers.push({ id, name, email, avatar: name[0].toUpperCase() });
    await fb.setDoc(fb.docRef('test', 'appConfig'), state.appConfig);
    const { renderUsersList } = await import('./ui-render.js');
    const { renderSalesDropdown } = await import('./ui-helpers.js');
    renderUsersList(); renderSalesDropdown();
    ['new-sales-name','new-sales-email','new-sales-pass'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    showToast('✅ Akun sales ' + name + ' berhasil dibuat!');
    addLog('setting', 'Tambah akun sales: ' + name);
  } catch(e) { showToast('❌ Gagal buat akun: ' + e.message, 'error'); }
}

export async function hapusUserSales(i) {
  if (cu()?.role !== 'owner') { showToast('❌ Hanya Owner!', 'error'); return; }
  const s = state.appConfig?.salesUsers?.[i]; if (!s) return;
  if (!confirm(`Hapus akun sales ${s.name}?`)) return;
  state.appConfig.salesUsers.splice(i, 1);
  await fb.setDoc(fb.docRef('test', 'appConfig'), state.appConfig).catch(() => {});
  const { renderUsersList } = await import('./ui-render.js');
  const { renderSalesDropdown } = await import('./ui-helpers.js');
  renderUsersList(); renderSalesDropdown();
  showToast('🗑️ Akun sales dihapus'); addLog('setting', 'Hapus akun sales: ' + s.name);
}

export async function gantiPassword() {
  const old  = document.getElementById('gp-old')?.value.trim();
  const neu  = document.getElementById('gp-new')?.value.trim();
  const conf = document.getElementById('gp-confirm')?.value.trim();
  if (!old || !neu || !conf)  { showToast('❌ Semua field wajib diisi!', 'error'); return; }
  if (neu.length < 6)          { showToast('❌ Password baru minimal 6 karakter!', 'error'); return; }
  if (neu !== conf)             { showToast('❌ Konfirmasi tidak cocok!', 'error'); return; }
  if (neu === old)              { showToast('❌ Password baru tidak boleh sama!', 'error'); return; }
  const btn = document.getElementById('btn-ganti-pass');
  if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...'; btn.disabled = true; }
  try {
    const fbUser = currentFbUser();
    if (!fbUser) throw new Error('Sesi tidak ditemukan. Silakan login ulang.');
    await reauthenticate(fbUser.email, old);
    await doUpdatePassword(neu);
    ['gp-old','gp-new','gp-confirm'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    showToast('✅ Password berhasil diubah! Auto logout 3 detik...', 'success');
    addLog('setting', 'Ganti password: ' + cu()?.name);
    setTimeout(() => window._doLogout?.(), 3000);
  } catch(err) {
    const msgs = {
      'auth/wrong-password'        : '❌ Password lama salah!',
      'auth/invalid-credential'    : '❌ Password lama salah!',
      'auth/too-many-requests'     : '❌ Terlalu banyak percobaan. Tunggu beberapa menit.',
      'auth/requires-recent-login' : '❌ Sesi terlalu lama. Logout lalu login ulang.',
      'auth/weak-password'         : '❌ Password baru terlalu lemah!',
      'auth/network-request-failed': '❌ Gagal koneksi — cek internet.',
    };
    showToast(msgs[err.code] || ('❌ ' + err.message), 'error');
  } finally {
    if (btn) { btn.innerHTML = '<i class="fas fa-key"></i> Ganti Password'; btn.disabled = false; }
  }
}

// ─── CLEAR / BACKUP / RESTORE ─────────────────────────────────────

export async function clearCollection(colName, label) {
  if (cu()?.role !== 'owner') { showToast('❌ Hanya Owner yang bisa hapus semua data!', 'error'); return; }
  if (!confirm(`Hapus SEMUA data ${label} dari cloud? Tindakan PERMANEN!`)) return;
  try {
    const snap  = await fb.getDocs_(fb.col(colName));
    const batch = fb.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    DB[colName] = [];
    const { renderAll } = await import('./ui-render.js'); renderAll();
    showToast(`🗑️ Data ${label} berhasil dihapus!`);
    addLog('setting', 'Clear data: ' + label);
  } catch(e) { showToast('❌ Gagal hapus ' + label + ': ' + e.message, 'error'); }
}

export function clearInvoice()    { clearCollection('invoice', 'Invoice'); }
export function clearKeuangan()   { clearCollection('pengeluaran', 'Pengeluaran'); clearCollection('pembelian', 'Pembelian'); }
export function clearDataBarang() { clearCollection('barang', 'Barang'); }

export async function backupData() {
  if (cu()?.role === 'sales') { showToast('❌ Sales tidak bisa backup data!', 'error'); return; }
  const backup = { exportedAt: new Date().toISOString(), version: '4.0', barang: DB.barang, invoice: DB.invoice, mitra: DB.mitra, pengeluaran: DB.pengeluaran, pembelian: DB.pembelian };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `BMS_Backup_${new Date().toISOString().slice(0, 10)}.json`; a.click();
  URL.revokeObjectURL(url);
  addLog('export', 'Backup data JSON');
  showToast('💾 Backup berhasil diunduh!');
}

export async function restoreData(event) {
  const file = event.target.files[0]; if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!data.barang) { showToast('❌ File backup tidak valid!', 'error'); return; }
    if (!confirm(`Restore backup dari ${data.exportedAt}?\nSemua data saat ini akan DIGANTI!`)) return;
    showToast('⏳ Memulai restore...', 'info');
    for (const col of ['barang','invoice','mitra','pengeluaran','pembelian']) {
      if (!data[col]) continue;
      const snap  = await fb.getDocs_(fb.col(col));
      const batch = fb.batch();
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      for (const item of data[col]) {
        const { _id, _ts, ...clean } = item;
        await fb.addDoc(fb.col(col), clean);
      }
    }
    showToast('✅ Restore selesai! Halaman akan refresh...');
    addLog('setting', 'Restore backup data');
    setTimeout(() => location.reload(), 2000);
  } catch(e) { showToast('❌ Gagal restore: ' + e.message, 'error'); }
}

// ─── EXPORT ──────────────────────────────────────────────────────

export function exportCSV(type) {
  const esc = v => { if (v == null) return ''; const s = String(v).replace(/\r?\n/g, ' '); return (s.includes(',') || s.includes('"')) ? `"${s.replace(/"/g, '""')}"` : s; };
  const maps = {
    barang     : { h:['Kode','Nama','Kategori','Satuan','H.Beli','H.Jual','Stok','Min Stok'], d:DB.barang.map(b=>[b.kode,b.nama,b.kategori,b.satuan,b.hbeli,b.hjual,b.stok,b.minStok]) },
    invoice    : { h:['No Invoice','Tanggal','Mitra','Sales','Total','Status','Jatuh Tempo','Catatan'], d:DB.invoice.map(i=>[i.no,i.tgl,i.mitra,i.salesName,i.total,i.status,i.tempo,i.catatan||'']) },
    mitra      : { h:['Kode','Nama','Tipe','PIC','HP','Kota','Alamat','Piutang'], d:DB.mitra.map(m=>[m.kode,m.nama,m.tipe,m.pic,m.hp,m.kota,m.alamat||'',m.piutang]) },
    stok       : { h:['Kode','Nama','Kategori','Masuk','Keluar','Stok','Min Stok'], d:DB.barang.map(b=>[b.kode,b.nama,b.kategori,b.masuk,b.keluar,b.stok,b.minStok]) },
    pengeluaran: { h:['Tanggal','Keterangan','Kategori','Jumlah'], d:DB.pengeluaran.map(p=>[p.tgl,p.ket,p.kat,p.jml]) },
    surat_jalan: { h:['No SJ','No Invoice','Tanggal','Mitra','Sopir','Kendaraan','Status'], d:DB.surat_jalan.map(s=>[s.noSJ,s.noInvoice,s.tgl,s.mitra,s.sopir,s.kendaraan,s.status]) },
  };
  const m = maps[type]; if (!m) return;
  const csv  = [m.h.map(esc).join(','), ...m.d.map(r => r.map(esc).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `BMS_${type}_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  URL.revokeObjectURL(url);
  addLog('export', 'Export CSV: ' + type);
  showToast(`📊 Export ${type} CSV berhasil!`);
}

export function exportExcel(type) {
  if (typeof XLSX === 'undefined') { showToast('❌ Library Excel belum siap.', 'error'); return; }
  const maps = {
    barang     : { sheet:'Data Barang',  h:['Kode','Nama','Kategori','Satuan','H.Beli','H.Jual','Stok','Min Stok'], d:DB.barang.map(b=>[b.kode,b.nama,b.kategori,b.satuan,b.hbeli||0,b.hjual||0,b.stok||0,b.minStok||0]) },
    invoice    : { sheet:'Transaksi',    h:['No Invoice','Tanggal','Mitra','Sales','Total','Status','Jatuh Tempo','Catatan'], d:DB.invoice.map(i=>[i.no,i.tgl,i.mitra,i.salesName||'',i.total||0,i.status,i.tempo||'-',i.catatan||'']) },
    mitra      : { sheet:'Mitra Bisnis', h:['Kode','Nama','Tipe','PIC','HP','Kota','Alamat','Piutang'], d:DB.mitra.map(m=>[m.kode,m.nama,m.tipe,m.pic||'',m.hp||'',m.kota||'',m.alamat||'',m.piutang||0]) },
    stok       : { sheet:'Info Stok',    h:['Kode','Nama','Kategori','Masuk','Keluar','Stok','Min Stok'], d:DB.barang.map(b=>[b.kode,b.nama,b.kategori,b.masuk||0,b.keluar||0,b.stok||0,b.minStok||0]) },
    pengeluaran: { sheet:'Pengeluaran',  h:['Tanggal','Keterangan','Kategori','Jumlah'], d:DB.pengeluaran.map(p=>[p.tgl,p.ket,p.kat,p.jml||0]) },
    surat_jalan: { sheet:'Surat Jalan',  h:['No SJ','No Invoice','Tanggal','Mitra','Sopir','Kendaraan','Status'], d:DB.surat_jalan.map(s=>[s.noSJ,s.noInvoice,s.tgl,s.mitra,s.sopir||'',s.kendaraan||'',s.status||'']) },
  };
  const m = maps[type]; if (!m) return;
  const wb  = XLSX.utils.book_new();
  const ws  = XLSX.utils.aoa_to_sheet([m.h, ...m.d]);
  ws['!cols'] = m.h.map((hdr, ci) => ({ wch: Math.min(Math.max(hdr.length, ...m.d.map(r => String(r[ci]||'').length)) + 2, 40) }));
  XLSX.utils.book_append_sheet(wb, ws, m.sheet);
  XLSX.writeFile(wb, `BMS_${type}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  addLog('export', 'Export Excel: ' + type);
  showToast(`📊 Export ${type} Excel berhasil!`);
}

// ─── CHAT ─────────────────────────────────────────────────────────

export async function sendMessage() {
  const inp = document.getElementById('chat-input');
  const msg = inp?.value.trim(); if (!msg) return;
  const data = { uid: currentFbUser()?.uid, user: cu()?.name || 'User', role: cu()?.role || 'sales', pesan: msg, waktu: new Date().toLocaleTimeString('id-ID') };
  inp.value = '';
  try { await fb.addDoc(fb.col('chat'), data); }
  catch(e) { showToast('❌ Gagal kirim pesan: ' + e.message, 'error'); }
}

export async function clearChat() {
  if (!['owner','admin'].includes(cu()?.role)) { showToast('❌ Hanya Owner/Admin yang bisa hapus chat!', 'error'); return; }
  if (!confirm('Hapus semua chat? Tindakan permanen!')) return;
  try {
    const snap  = await fb.getDocs_(fb.col('chat'));
    const batch = fb.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    DB.chat = [];
    const { renderChatMessages } = await import('./ui-render.js'); renderChatMessages();
    showToast('🗑️ Chat berhasil dihapus!');
  } catch(e) { showToast('❌ Gagal hapus chat: ' + e.message, 'error'); }
}

export function sendBroadcast() {
  const msg = document.getElementById('broadcast-msg')?.value.trim();
  if (!msg) { showToast('Pesan broadcast tidak boleh kosong!', 'error'); return; }
  const data = { uid: currentFbUser()?.uid, user: cu()?.name || 'Admin', role: cu()?.role, pesan: `📢 BROADCAST: ${msg}`, waktu: new Date().toLocaleTimeString('id-ID') };
  fb.addDoc(fb.col('chat'), data).then(() => showToast('📢 Broadcast terkirim!')).catch(e => showToast('❌ Gagal: ' + e.message, 'error'));
  const el = document.getElementById('broadcast-msg'); if (el) el.value = '';
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────

export async function checkStokKritisNotif() {
  for (const b of DB.barang.filter(bb => bb.stok <= bb.minStok)) {
    const key    = 'stok-kritis-' + b.kode;
    const exists = DB.notifikasi.some(n => n.key === key && !n.baca);
    if (!exists) {
      const notif = { key, pesan: `⚠️ Stok ${b.nama} kritis — sisa ${b.stok} ${b.satuan}`, waktu: 'Baru saja', tipe: 'danger', baca: false };
      try { await fb.addDoc(fb.col('notifikasi'), notif); } catch(e) { DB.notifikasi.unshift({ _id: Date.now().toString(), ...notif }); }
    }
  }
  // Jatuh tempo
  const today = new Date().toISOString().slice(0, 10);
  for (const inv of DB.invoice.filter(i => i.status === 'Belum Lunas' && i.tempo && i.tempo !== '-')) {
    const daysLeft = Math.ceil((new Date(inv.tempo) - new Date(today)) / 86400000);
    if (daysLeft <= 3 && daysLeft >= 0) {
      const key    = `jt-${inv.no}_d${daysLeft}`;
      const exists = DB.notifikasi.some(n => n.key === key && !n.baca);
      if (!exists) {
        const label = daysLeft === 0 ? 'HARI INI' : `${daysLeft} hari lagi`;
        const notif = { key, pesan: `🔔 Jatuh Tempo ${label}: Invoice ${inv.no} — ${inv.mitra} (${inv.total?.toLocaleString('id-ID')})`, waktu: 'Baru saja', tipe: daysLeft === 0 ? 'danger' : 'warning', baca: false };
        try { await fb.addDoc(fb.col('notifikasi'), notif); } catch(e) { DB.notifikasi.unshift({ _id: Date.now().toString(), ...notif }); }
      }
    }
  }
}

export async function bacaNotif(i) {
  const n = DB.notifikasi[i]; if (!n || n.baca) return;
  n.baca = true;
  try { if (n._id) await fb.updateDoc(fb.docRef('notifikasi', n._id), { baca: true }); }
  catch(e) { /* offline ok */ }
  const { renderNotifications } = await import('./ui-render.js'); renderNotifications();
}

export async function markAllRead() {
  const unread = DB.notifikasi.filter(n => !n.baca);
  unread.forEach(n => { n.baca = true; });
  try {
    const batch = fb.batch();
    unread.filter(n => n._id).forEach(n => batch.update(fb.docRef('notifikasi', n._id), { baca: true }));
    if (unread.some(n => n._id)) await batch.commit();
  } catch(e) { /* offline ok */ }
  const { renderNotifications } = await import('./ui-render.js'); renderNotifications();
}

// ─── SURAT JALAN ─────────────────────────────────────────────────

export async function generateSuratJalan(invoiceId) {
  const inv = DB.invoice.find(i => i._id === invoiceId || i.no === invoiceId);
  if (!inv) { showToast('Invoice tidak ditemukan!', 'error'); return; }
  const noSJ = 'SJ-' + Date.now().toString().slice(-6);
  const data = {
    noSJ, noInvoice: inv.no, tgl: new Date().toISOString().slice(0, 10),
    mitra: inv.mitra, alamatMitra: inv.alamatMitra || '-', items: inv.items || [],
    totalBerat: '-', sopir: '', kendaraan: '', catatan: '', status: 'Draft',
    salesUid: inv.salesUid || cu()?.uid || '', salesName: inv.salesName || cu()?.name || '',
  };
  try {
    const ref = await fb.addDoc(fb.col('surat_jalan'), data);
    DB.surat_jalan.unshift({ _id: ref.id, ...data });
    const { renderSuratJalanList } = await import('./ui-render.js'); renderSuratJalanList();
    showToast(`✅ Surat Jalan ${noSJ} berhasil dibuat!`);
    openPreviewSuratJalan(ref.id);
  } catch(e) { showToast('❌ Gagal buat SJ: ' + e.message, 'error'); }
}

export function openPreviewSuratJalan(id) {
  window._lastSJId = id;
  const sj      = DB.surat_jalan.find(s => s._id === id); if (!sj) return;
  const co      = state.appConfig?.company || {};
  const content = document.getElementById('surat-jalan-preview-content'); if (!content) return;
  content.innerHTML = `
    <div class="sj-print-area" id="sj-print-${sj._id}">
      <div class="sj-header">
        <div class="sj-company"><h2>${co.nama || "CV. Baitul Ma'mur Syafaah"}</h2><p>${co.alamat || ''}</p><p>Telp: ${co.telp || ''} | ${co.email || ''}</p></div>
        <div class="sj-title-box"><h1>SURAT JALAN</h1><table class="sj-meta-table"><tr><td>No. SJ</td><td>: <strong>${sj.noSJ}</strong></td></tr><tr><td>No. Invoice</td><td>: ${sj.noInvoice}</td></tr><tr><td>Tanggal</td><td>: ${sj.tgl}</td></tr></table></div>
      </div>
      <div class="sj-recipient"><strong>Kepada Yth:</strong><br><strong>${sj.mitra}</strong><br>${sj.alamatMitra}</div>
      <div class="sj-transport">
        <div class="sj-transport-item"><label>Sopir</label><div class="sj-input-field" contenteditable="true" id="sj-sopir-${sj._id}" onblur="updateSJField('${sj._id}','sopir',this.innerText)">${sj.sopir || 'Klik untuk isi'}</div></div>
        <div class="sj-transport-item"><label>No. Kendaraan</label><div class="sj-input-field" contenteditable="true" id="sj-kend-${sj._id}" onblur="updateSJField('${sj._id}','kendaraan',this.innerText)">${sj.kendaraan || 'Klik untuk isi'}</div></div>
      </div>
      <table class="sj-items-table"><thead><tr><th>No</th><th>Nama Barang</th><th>Qty</th><th>Satuan</th><th>Keterangan</th></tr></thead>
        <tbody>${(sj.items||[]).map((it,i) => `<tr><td>${i+1}</td><td>${it.nama}</td><td>${it.qty}</td><td>${it.satuan||''}</td><td></td></tr>`).join('')}</tbody>
      </table>
      <div class="sj-catatan"><label>Catatan:</label><div class="sj-input-field" contenteditable="true" onblur="updateSJField('${sj._id}','catatan',this.innerText)">${sj.catatan || '-'}</div></div>
      <div class="sj-ttd">
        <div class="sj-ttd-col"><div class="sj-ttd-label">Disiapkan Oleh,</div><div class="sj-ttd-space"></div><div class="sj-ttd-name">( _________________ )</div></div>
        <div class="sj-ttd-col"><div class="sj-ttd-label">Pengantar / Sopir,</div><div class="sj-ttd-space"></div><div class="sj-ttd-name">( ${sj.sopir || '________________'} )</div></div>
        <div class="sj-ttd-col"><div class="sj-ttd-label">Penerima,</div><div class="sj-ttd-space"></div><div class="sj-ttd-name">( _________________ )</div></div>
      </div>
    </div>`;
  openModal('modal-surat-jalan-preview');
}

export async function updateSJField(id, field, value) {
  const sj = DB.surat_jalan.find(s => s._id === id); if (!sj) return;
  sj[field] = value;
  try { await fb.updateDoc(fb.docRef('surat_jalan', id), { [field]: value }); }
  catch(e) { console.warn('Update SJ gagal — data lokal tetap tersimpan:', e.message); }
}

export async function updateStatusSJ(id) {
  const sj  = DB.surat_jalan.find(s => s._id === id); if (!sj) return;
  const map = { 'Draft':'Dikirim', 'Dikirim':'Diterima', 'Diterima':'Selesai' };
  const nxt = map[sj.status] || sj.status;
  sj.status = nxt;
  try { await fb.updateDoc(fb.docRef('surat_jalan', id), { status: nxt }); }
  catch(e) { showToast('⚠️ Status update tersimpan lokal saja', 'warning'); }
  const { renderSuratJalanList } = await import('./ui-render.js'); renderSuratJalanList();
  showToast(`✅ Status SJ diupdate ke ${nxt}`);
}

export async function hapusSuratJalan(id) {
  if (!['owner','admin'].includes(cu()?.role)) { showToast('❌ Hanya Owner/Admin!', 'error'); return; }
  const sj = DB.surat_jalan.find(s => s._id === id);
  if (!confirm(`Hapus Surat Jalan ${sj?.noSJ}?`)) return;
  try { await fb.deleteDoc_(fb.docRef('surat_jalan', id)); }
  catch(e) { showToast('❌ Gagal hapus SJ: ' + e.message, 'error'); return; }
  DB.surat_jalan = DB.surat_jalan.filter(s => s._id !== id);
  const { renderSuratJalanList } = await import('./ui-render.js'); renderSuratJalanList();
  showToast('🗑️ Surat Jalan dihapus!');
}

export function printSuratJalanFromModal() {
  const id = window._lastSJId;
  if (!id) return;
  const area = document.getElementById('sj-print-' + id);
  if (!area) { showToast('❌ Area cetak tidak ditemukan!', 'error'); return; }
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><title>Surat Jalan</title>
    <style>body{font-family:Arial,sans-serif;padding:24px;max-width:800px;margin:0 auto}
    .sj-header{display:flex;justify-content:space-between;margin-bottom:16px}
    .sj-items-table{width:100%;border-collapse:collapse;margin:16px 0}
    .sj-items-table th,.sj-items-table td{border:1px solid #333;padding:8px;text-align:left}
    .sj-ttd{display:flex;justify-content:space-around;margin-top:40px;text-align:center}
    .sj-ttd-space{height:60px}.sj-input-field{border:none;background:none;min-height:20px}
    h1{font-size:1.5em}h2{margin:0}
    </style></head><body>${area.innerHTML}</body></html>`);
  w.document.close(); w.focus(); w.print();
}

export function kirimWASuratJalan(id) {
  const sj  = DB.surat_jalan.find(s => s._id === id); if (!sj) return;
  const inv = DB.invoice.find(i => i.no === sj.noInvoice);
  const fmt = n => n?.toLocaleString('id-ID') || '0';
  const tgl = new Date(sj.tgl).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });
  const msg = [
    `📦 *SURAT JALAN — ${sj.noSJ}*`,
    `No. Invoice : ${sj.noInvoice}`,
    `Tanggal     : ${tgl}`,
    `Kepada      : *${sj.mitra}*`,
    `Sopir       : ${sj.sopir || '-'}  |  Kendaraan: ${sj.kendaraan || '-'}`,
    `Total Item  : ${(sj.items||[]).length} jenis barang`,
    inv ? `Nilai       : Rp ${fmt(inv.total)}` : '',
    sj.catatan ? `Catatan     : ${sj.catatan}` : '',
    ``,
    `Status: *${sj.status}*`,
    `--- BMS CV. Baitul Ma'mur Syafaah ---`,
  ].filter(Boolean).join('\n');
  window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
}

// ─── GUDANG ───────────────────────────────────────────────────────

export async function simpanGudang() {
  if (cu()?.role === 'sales') { showToast('❌ Sales tidak bisa tambah gudang!', 'error'); return; }
  const nama   = document.getElementById('gd-nama')?.value.trim();
  const lokasi = document.getElementById('gd-lokasi')?.value.trim();
  const pic    = document.getElementById('gd-pic')?.value.trim();
  const telp   = document.getElementById('gd-telp')?.value.trim();
  if (!nama) { showToast('Nama gudang wajib diisi!', 'error'); return; }
  const data = { nama, lokasi, pic, telp, status: 'Aktif', stokItems: [] };
  try {
    const ref = await fb.addDoc(fb.col('gudang'), data);
    DB.gudang.unshift({ _id: ref.id, ...data });
    const { renderGudangList } = await import('./ui-render.js'); renderGudangList();
    closeModal('modal-gudang');
    showToast(`✅ Gudang "${nama}" berhasil ditambahkan!`);
    addLog('tambah', 'Gudang: ' + nama);
  } catch(e) { showToast('❌ Gagal simpan gudang: ' + e.message, 'error'); }
}

export async function hapusGudang(id) {
  if (cu()?.role === 'sales') { showToast('❌ Sales tidak bisa hapus gudang!', 'error'); return; }
  const g = DB.gudang.find(x => x._id === id);
  if (!confirm(`Hapus gudang "${g?.nama}"? Semua data stok di gudang ini akan hilang.`)) return;
  try {
    await fb.deleteDoc_(fb.docRef('gudang', id));
    DB.gudang = DB.gudang.filter(x => x._id !== id);
    const { renderGudangList } = await import('./ui-render.js'); renderGudangList();
    showToast('Gudang dihapus.');
  } catch(e) { showToast('❌ Gagal hapus gudang: ' + e.message, 'error'); }
}

export function lihatStokGudang(id) {
  const g = DB.gudang.find(x => x._id === id); if (!g) return;
  const body = document.getElementById('stok-gudang-body');
  const ttl  = document.getElementById('stok-gudang-title');
  if (!body) return;
  if (ttl) ttl.textContent = `📦 Stok Gudang — ${g.nama}`;
  const items = g.stokItems || [];
  body.innerHTML = items.length
    ? `<table style="width:100%"><thead><tr><th>Barang</th><th>Qty</th><th>Satuan</th><th>Update Terakhir</th></tr></thead><tbody>${items.map(it => `<tr><td><strong>${it.nama}</strong></td><td style="font-weight:800">${it.qty}</td><td>${it.satuan||'-'}</td><td style="color:var(--text-muted);font-size:12px">${it.updatedAt||'-'}</td></tr>`).join('')}</tbody></table>`
    : '<p style="color:var(--text-muted);padding:20px;text-align:center">Belum ada stok terdaftar.</p>';
  openModal('modal-stok-gudang');
}

let _transferFromId = null;
export function openTransferModal(fromId) {
  _transferFromId = fromId;
  const from = DB.gudang.find(g => g._id === fromId); if (!from) return;
  const sel  = document.getElementById('tf-tujuan');
  if (sel) sel.innerHTML = DB.gudang.filter(g => g._id !== fromId).map(g => `<option value="${g._id}">${g.nama}</option>`).join('') || '<option value="">-- Tidak ada gudang lain --</option>';
  const selB = document.getElementById('tf-barang');
  if (selB) { const items = from.stokItems || []; selB.innerHTML = items.length ? items.map(it => `<option value="${it.nama}">${it.nama} (stok: ${it.qty})</option>`).join('') : '<option value="">-- Belum ada stok --</option>'; }
  const fromEl = document.getElementById('tf-dari-nama'); if (fromEl) fromEl.textContent = from.nama;
  openModal('modal-transfer-stok');
}

export async function simpanTransferStok() {
  if (cu()?.role === 'sales') { showToast('❌ Sales tidak bisa transfer stok!', 'error'); return; }
  const tujuanId   = document.getElementById('tf-tujuan')?.value;
  const namaBarang = document.getElementById('tf-barang')?.value;
  const qty        = parseInt(document.getElementById('tf-qty')?.value || '0');
  const catatan    = document.getElementById('tf-catatan')?.value.trim();
  if (!tujuanId)    { showToast('Pilih gudang tujuan!', 'error'); return; }
  if (!namaBarang)  { showToast('Pilih barang!', 'error'); return; }
  if (!qty || qty < 1) { showToast('Jumlah harus lebih dari 0!', 'error'); return; }
  const from = DB.gudang.find(g => g._id === _transferFromId);
  const to   = DB.gudang.find(g => g._id === tujuanId);
  if (!from || !to) return;
  const itemFrom = (from.stokItems||[]).find(it => it.nama === namaBarang);
  if (!itemFrom || itemFrom.qty < qty) { showToast(`❌ Stok tidak cukup! Tersedia: ${itemFrom?.qty || 0}`, 'error'); return; }
  itemFrom.qty -= qty;
  let itemTo = (to.stokItems||[]).find(it => it.nama === namaBarang);
  if (itemTo) { itemTo.qty += qty; itemTo.updatedAt = new Date().toISOString().slice(0, 10); }
  else { to.stokItems = to.stokItems || []; to.stokItems.push({ nama: namaBarang, qty, satuan: itemFrom.satuan, updatedAt: new Date().toISOString().slice(0, 10) }); }
  try {
    await Promise.all([
      fb.updateDoc(fb.docRef('gudang', _transferFromId), { stokItems: from.stokItems }),
      fb.updateDoc(fb.docRef('gudang', tujuanId),        { stokItems: to.stokItems }),
    ]);
    const { renderGudangList } = await import('./ui-render.js'); renderGudangList();
    closeModal('modal-transfer-stok');
    showToast(`✅ Transfer ${qty} ${namaBarang}: ${from.nama} → ${to.nama} berhasil!`);
    addLog('Transfer Stok', `${qty}x ${namaBarang}: ${from.nama} → ${to.nama}. ${catatan || ''}`);
  } catch(e) {
    showToast('❌ Gagal transfer: ' + e.message, 'error');
    itemFrom.qty += qty; if (itemTo) itemTo.qty -= qty;
  }
}

export async function simpanStokMasukGudang(gudangId, barangId, qty) {
  const g = DB.gudang.find(x => x._id === gudangId);
  const b = DB.barang.find(x => x._id === barangId);
  if (!g || !b) return;
  g.stokItems = g.stokItems || [];
  const item = g.stokItems.find(it => it.nama === b.nama);
  if (item) { item.qty += qty; item.updatedAt = new Date().toISOString().slice(0, 10); }
  else g.stokItems.push({ nama: b.nama, qty, satuan: b.satuan, barangId: b._id, updatedAt: new Date().toISOString().slice(0, 10) });
  try { await fb.updateDoc(fb.docRef('gudang', gudangId), { stokItems: g.stokItems }); }
  catch(e) { showToast('⚠️ Stok gudang gagal tersinkron: ' + e.message, 'warning'); }
}

// ─── SYNC ─────────────────────────────────────────────────────────

export async function syncData() {
  const icon = document.getElementById('sync-icon');
  if (icon) icon.style.animation = 'spin 1s linear infinite';
  showToast('🔄 Sinkronisasi data...', 'info');
  try {
    const { loadAllFromFirestore } = await import('./data.js');
    await loadAllFromFirestore();
    if (icon) icon.style.animation = '';
    showToast('☁️ Data tersinkronkan!');
  } catch(e) {
    if (icon) icon.style.animation = '';
    showToast('❌ Gagal sinkronisasi — cek koneksi internet.', 'error');
  }
}
