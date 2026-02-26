// ================================================================
//  BMS app.js  v11.0 — CV. Baitul Ma'mur Syafaah
//  ES Modules Phase 1-5 Refactor — 2026
//
//  ┌──────────────────────────────────────────────────────────┐
//  │  PERHATIAN — File ini bukan lagi entry point utama       │
//  │  Entry point: assets/js/main.js (type="module")          │
//  │                                                          │
//  │  File ini berisi FASE 6-7 (belum direfactor):            │
//  │  - Business logic (CRUD, invoice, opname, dsb.)          │
//  │  - UI Render functions (renderBarang, renderInvoice, …)  │
//  │                                                          │
//  │  State & helpers dibaca dari window.BMS (di-set oleh     │
//  │  main.js sebelum file ini diimport).                     │
//  └──────────────────────────────────────────────────────────┘
//
//  MODULE MAP — Status Refactor
//  ┌──────────────────┬──────────────────┬───────────────────┐
//  │ Modul            │ File             │ Status            │
//  ├──────────────────┼──────────────────┼───────────────────┤
//  │ Theme            │ modules/theme.js │ ✅ Fase 1 Selesai  │
//  │ Constants/State  │ modules/constants│ ✅ Fase 2 Selesai  │
//  │ Navigation       │ modules/nav.js   │ ✅ Fase 3 Selesai  │
//  │ Auth/Session     │ modules/auth.js  │ ✅ Fase 4 Selesai  │
//  │ Data/Firestore   │ modules/data.js  │ ✅ Fase 5 Selesai  │
//  │ Business CRUD    │ (app.js)         │ 🔄 Fase 6 Antri   │
//  │ UI Render        │ (app.js)         │ 🔄 Fase 7 Antri   │
//  └──────────────────┴──────────────────┴───────────────────┘
// ================================================================

// ── COMPATIBILITY SHIM ────────────────────────────────────────────
// All module state is available via window.BMS (set by main.js).
// These local aliases allow the remaining code in this file to
// continue using the original variable names without modification.
// When phase 6-7 refactor is done, this block is deleted.

const { state: _S, DB, pagination, PAGE_SIZE, invoiceFilter, DEFAULT_KATEGORI } = window.BMS;

// Proxy references — read/write go directly to module state
// Use Object.defineProperty to create live getters/setters
function _proxyState(localName, key) {
  Object.defineProperty(globalThis, localName, {
    get: () => _S[key],
    set: (v) => { _S[key] = v; },
    configurable: true,
  });
}

_proxyState('currentUser',     'currentUser');
_proxyState('selectedRole',    'selectedRole');
_proxyState('selectedSalesId', 'selectedSalesId');
_proxyState('invItems',        'invItems');
_proxyState('invCounter',      'invCounter');
_proxyState('appConfig',       'appConfig');
_proxyState('onlineUsers',     'onlineUsers');
_proxyState('chatMessages',    'chatMessages');
_proxyState('chatOpen',        'chatOpen');
_proxyState('activeChatTab',   'activeChatTab');
_proxyState('_lastChatCount',  '_lastChatCount');
_proxyState('_notifPermission','_notifPermission');
_proxyState('_transferFromId', '_transferFromId');
_proxyState('toastTimer',      'toastTimer');

// openGroups lives in state as well
// nav.js uses state.openGroups directly, but old code uses openGroups bare
Object.defineProperty(globalThis, 'openGroups', {
  get: () => _S.openGroups || (_S.openGroups = new Set(['g-data'])),
  set: (v) => { _S.openGroups = v; },
  configurable: true,
});

// ── HELPER ALIASES ────────────────────────────────────────────────
// fmtRp and terbilang are exposed on window by main.js — alias locally
// for code in this file that calls them as bare names
const fmtRp     = window.fmtRp;
const terbilang = window.terbilang;

// Module functions used in this file — alias from window bridge
const addLog              = (...a) => window.addLog?.(...a);
const renderLog           = (...a) => window.renderLog?.(...a);
const fillDropdowns       = (...a) => window.fillDropdowns?.(...a);
const updateRunningText   = (...a) => window.updateRunningText?.(...a);
const showToast           = (...a) => window.showToast?.(...a);
const openModal           = (...a) => window.openModal?.(...a);
const closeModal          = (...a) => window.closeModal?.(...a);
const isPageActive        = (id)   => window.isPageActive?.(id);
const renderPagination    = (...a) => window.renderPagination?.(...a);
const resetPage           = (...a) => window.resetPage?.(...a);
const navigateTo          = (...a) => window.navigateTo?.(...a);
const updateFBStatus      = (...a) => window.updateFBStatus?.(...a);
const getFilteredInvoices = (...a) => window.getFilteredInvoices?.(...a);

// ───────────────────── RENDER TABLES ───────────────────────────
function renderBarang() {
  const tbody = document.getElementById('tbody-barang');
  if (!tbody) return;
  const badge = document.getElementById('total-barang-badge');
  if (badge) badge.textContent = DB.barang.length + ' Item';
  const canEdit = currentUser && (currentUser.role==='owner'||currentUser.role==='admin');
  // Pagination
  const all   = DB.barang;
  const total = all.length;
  const page  = pagination.barang.page;
  const start = (page - 1) * PAGE_SIZE;
  const paged = all.slice(start, start + PAGE_SIZE);
  tbody.innerHTML = paged.map((b,pi) => {
    const i = start + pi; // indeks asli di DB
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
  renderPagination('barang', total);
}

function renderInvoice() {
  const tbody = document.getElementById('tbody-invoice');
  if (!tbody) return;
  const canEdit = currentUser && (currentUser.role==='owner'||currentUser.role==='admin');
  const isSales = currentUser?.role === 'sales';
  // Terapkan filter & pagination
  const filtered = getFilteredInvoices();
  const total    = filtered.length;
  const page     = pagination.invoice.page;
  const start    = (page - 1) * PAGE_SIZE;
  const paged    = filtered.slice(start, start + PAGE_SIZE);
  tbody.innerHTML = paged.map((inv,pi) => {
    const i = DB.invoice.indexOf(inv); // indeks asli untuk tombol aksi
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
          ${canEdit?`<button class="btn btn-primary btn-icon btn-sm" onclick="editInvoice(${i})" title="Edit Status/Catatan"><i class="fas fa-edit"></i></button>`:''}
          ${(canEdit || (isSales && inv.salesUid === currentUser?.uid)) && inv.status!=='Lunas'?`<button class="btn btn-success btn-icon btn-sm" onclick="tandaiLunas(${i})" title="Tandai Lunas"><i class="fas fa-check"></i></button>`:''}
          <button class="btn btn-accent btn-icon btn-sm" onclick="generateSuratJalan('${inv._id}')" title="Generate Surat Jalan"><i class="fas fa-truck"></i></button>
          ${canEdit?`<button class="btn btn-danger btn-icon btn-sm" onclick="hapusTransaksi(${i})" title="Hapus"><i class="fas fa-trash"></i></button>`:''}
        </div>
      </td>
    </tr>`;
  }).join('') || '<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--text-muted)">Belum ada transaksi</td></tr>';
  renderPagination('invoice', total);
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
  const canEdit = currentUser && (currentUser.role === 'owner' || currentUser.role === 'admin');
  const total = DB.mitra.length;
  const page  = pagination.mitra.page;
  const start = (page - 1) * PAGE_SIZE;
  const paged = DB.mitra.slice(start, start + PAGE_SIZE);
  tbody.innerHTML = paged.map((m,pi) => {
    const i = start + pi;
    return `
    <tr>
      <td><code style="background:var(--bg);padding:2px 8px;border-radius:6px;font-size:12px">${m.kode}</code></td>
      <td><strong>${m.nama}</strong></td>
      <td><span class="badge ${m.tipe==='Pelanggan'?'badge-blue':'badge-green'}">${m.tipe}</span></td>
      <td>${m.pic||'-'}</td><td>${m.hp||'-'}</td><td>${m.kota||'-'}</td>
      <td>${m.piutang>0?'<span class="badge badge-amber">Rp '+m.piutang.toLocaleString('id-ID')+'</span>':'-'}</td>
      <td><span class="badge badge-green">${m.status||'Aktif'}</span></td>
      <td><div style="display:flex;gap:6px">
        <button class="btn btn-outline btn-icon btn-sm" onclick="chatMitra('${m.nama}')" title="Chat"><i class="fas fa-comment"></i></button>
        ${canEdit ? `<button class="btn btn-danger btn-icon btn-sm" onclick="hapusMitra(${i})" title="Hapus"><i class="fas fa-trash"></i></button>` : ''}
      </div></td>
    </tr>`;
  }).join('');
  renderPagination('mitra', total);
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
  // ── Perbarui dropdown tahun secara dinamis dari data invoice ──
  const yearSel = document.getElementById('laporan-year-sel');
  if (yearSel) {
    const currentYear = new Date().getFullYear();
    const invoiceYears = [...new Set(DB.invoice.map(inv => inv.tgl?.slice(0,4)).filter(Boolean).map(Number))];
    const allYears = [...new Set([...invoiceYears, currentYear - 1, currentYear, currentYear + 1])].sort();
    const selectedYear = yearSel.value ? parseInt(yearSel.value) : currentYear;
    yearSel.innerHTML = allYears.map(y => `<option value="${y}" ${y===selectedYear?'selected':''}>${y}</option>`).join('');
  }
  // Cek filter rentang tanggal
  const lapDari   = document.getElementById('filter-lap-dari')?.value   || '';
  const lapSampai = document.getElementById('filter-lap-sampai')?.value || '';
  const hasDateFilter = lapDari || lapSampai;

  // Trend berdasarkan invoice nyata
  const year   = yearSel ? parseInt(yearSel.value) : new Date().getFullYear();
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
  // Filter invoice berdasarkan rentang tanggal jika aktif
  let invoicePool = DB.invoice;
  if (hasDateFilter) {
    invoicePool = DB.invoice.filter(inv => {
      if (lapDari   && inv.tgl < lapDari)   return false;
      if (lapSampai && inv.tgl > lapSampai) return false;
      return true;
    });
    const infoEl = document.getElementById('filter-lap-info');
    if (infoEl) infoEl.textContent = invoicePool.length + ' transaksi dalam rentang ini';
  } else {
    const infoEl = document.getElementById('filter-lap-info');
    if (infoEl) infoEl.textContent = '';
  }
  const data = months.map((_,mi) => {
    const key = `${year}-${String(mi+1).padStart(2,'0')}`;
    return invoicePool.filter(inv => inv.tgl?.startsWith(key)).reduce((s,inv)=>s+(inv.total||0),0);
  }).map(v => Math.round(v/1000000));
  const max = Math.max(...data, 1);
  const el  = document.getElementById('laporan-chart');
  if (!el) return;
  const totalYear = data.reduce((s,v)=>s+v,0);
  const maxVal    = Math.max(...data);
  el.innerHTML = data.map((v,i) => `
    <div class="bar-wrap">
      <div class="bar" style="height:${Math.max(Math.round((v/max)*100),2)}%;${v===maxVal?'background:linear-gradient(180deg,var(--accent),#f97316)':''}">
        <div class="bar-tooltip">Rp ${v} Jt</div>
      </div>
      <div class="bar-label">${months[i]}</div>
    </div>`).join('');
  const totalEl = document.getElementById('laporan-total-year');
  const filterNote = hasDateFilter ? ' (filter aktif)' : '';
  if (totalEl) totalEl.textContent = 'Total ' + year + filterNote + ': Rp ' + totalYear.toLocaleString('id-ID') + ' Jt';
  renderLaporanPiutang();
}

// Render tabel piutang di halaman laporan
function renderLaporanPiutang() {
  const tbody = document.getElementById('lap-piutang-tbody');
  const totalEl = document.getElementById('lap-piutang-total');
  if (!tbody) return;
  const belumLunas = DB.invoice.filter(i => i.status !== 'Lunas');
  const totalPiutang = belumLunas.reduce((s, i) => s + (i.total || 0), 0);
  if (totalEl) totalEl.textContent = 'Total Piutang: ' + fmtRp(totalPiutang);
  if (belumLunas.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:16px">✅ Semua invoice sudah lunas</td></tr>';
    return;
  }
  tbody.innerHTML = belumLunas.map(inv => {
    const today = new Date().toISOString().slice(0,10);
    const isJatuhTempo = inv.tempo && inv.tempo !== '-' && inv.tempo < today;
    return `<tr>
      <td><strong>${inv.no}</strong></td>
      <td>${inv.mitra}</td>
      <td>${inv.tgl}</td>
      <td style="color:${isJatuhTempo ? 'var(--danger)' : 'inherit'}">${inv.tempo !== '-' ? inv.tempo : '-'}${isJatuhTempo ? ' ⚠️' : ''}</td>
      <td style="color:var(--danger);font-weight:700">${fmtRp(inv.total || 0)}</td>
      <td>${inv.salesName || '-'}</td>
    </tr>`;
  }).join('');
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
        <h3>${fmtRp(lunas)}</h3><p>Sudah Lunas</p></div>
      <div class="stat-card amber"><div class="stat-glow"></div><div class="stat-icon"><i class="fas fa-clock"></i></div>
        <h3>${fmtRp(pending)}</h3><p>Belum Lunas</p></div>
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
  const container = document.getElementById('opname-cards');
  if (!container) return;
  const date = new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
  const dateEl = document.getElementById('opname-date');
  if(dateEl) dateEl.textContent = 'Tanggal: ' + date;

  if (DB.barang.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)"><i class="fas fa-box-open" style="font-size:40px;margin-bottom:12px;display:block;opacity:0.3"></i>Belum ada data barang</div>';
    renderOpnameStats();
    return;
  }

  renderOpnameStats();

  container.innerHTML = DB.barang.map((b,i) => {
    const stokNum  = parseInt(b.stok)||0;
    const minStok  = parseInt(b.minStok)||20;
    const statusCls = stokNum <= 0 ? 'badge-red' : stokNum <= minStok ? 'badge-amber' : 'badge-green';
    const statusTxt = stokNum <= 0 ? '⛔ Habis'   : stokNum <= minStok ? '⚠️ Kritis'   : '✅ Aman';
    return `
    <div class="opname-card" id="op-row-${i}">
      <!-- Baris atas: info barang + status -->
      <div class="opname-card-top">
        <div class="opname-card-info">
          <code class="op-kode">${b.kode}</code>
          <strong class="op-nama">${b.nama}</strong>
          <span class="op-satuan">${b.satuan}</span>
        </div>
        <div id="op-status-wrap-${i}">
          <span class="badge ${statusCls}">${statusTxt}</span>
        </div>
      </div>

      <!-- Baris tengah: stok sistem → aktual → selisih -->
      <div class="opname-card-mid">
        <div class="op-field">
          <label>Stok Sistem</label>
          <span class="op-sistem" id="op-sistem-${i}">${stokNum}</span>
        </div>
        <div class="op-arrow"><i class="fas fa-arrow-right"></i></div>
        <div class="op-field">
          <label>Stok Aktual</label>
          <input type="number" id="op-act-${i}" value="${stokNum}" min="0"
            class="op-input" oninput="updateOpnameDiff(${i})">
        </div>
        <div class="op-field">
          <label>Selisih</label>
          <span id="op-diff-${i}" class="op-diff">0</span>
        </div>
      </div>

      <!-- Baris bawah: catatan + tombol simpan -->
      <div class="opname-card-bot">
        <input type="text" id="op-note-${i}" placeholder="✏️ Catatan opname..." class="op-note-input">
        <button class="btn btn-success op-save-btn" id="op-save-${i}"
          onclick="simpanOpnameRow(${i})" title="Simpan ke sistem">
          <i class="fas fa-save"></i> Simpan
        </button>
      </div>
    </div>`;
  }).join('');
}

function renderOpnameStats() {
  const safe = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
  safe('op-total',  DB.barang.length);
  safe('op-aman',   DB.barang.filter(b=>(parseInt(b.stok)||0)>(parseInt(b.minStok)||20)).length);
  safe('op-kritis', DB.barang.filter(b=>{const s=parseInt(b.stok)||0,m=parseInt(b.minStok)||20;return s>0&&s<=m;}).length);
  safe('op-habis',  DB.barang.filter(b=>(parseInt(b.stok)||0)<=0).length);
}

function updateOpnameDiff(i) {
  const b       = DB.barang[i];
  const sistem  = b.stok || 0;
  const aktual  = parseInt(document.getElementById(`op-act-${i}`)?.value) ?? 0;
  const selisih = aktual - sistem;

  // Update selisih
  const diffEl = document.getElementById(`op-diff-${i}`);
  if (diffEl) {
    diffEl.textContent = (selisih > 0 ? '+' : '') + selisih;
    diffEl.style.color = selisih < 0 ? 'var(--danger)' : selisih > 0 ? 'var(--accent2)' : 'var(--text-muted)';
  }

  // Update STATUS secara otomatis berdasarkan nilai aktual
  const statusWrap = document.getElementById(`op-status-wrap-${i}`);
  if (statusWrap) {
    const minStok = b.minStok || 20;
    if (aktual <= 0) {
      statusWrap.innerHTML = `<span class="badge badge-red" id="op-status-${i}">⛔ Habis</span>`;
    } else if (aktual <= minStok) {
      statusWrap.innerHTML = `<span class="badge badge-amber" id="op-status-${i}">⚠️ Kritis</span>`;
    } else {
      statusWrap.innerHTML = `<span class="badge badge-green" id="op-status-${i}">✅ Aman</span>`;
    }
  }

  // Highlight baris jika ada perubahan
  const row = document.getElementById(`op-row-${i}`);
  if (row) row.style.background = selisih !== 0 ? 'rgba(245,158,11,0.04)' : '';
  const saveBtn = document.getElementById(`op-save-${i}`);
  if (saveBtn) {
    saveBtn.style.opacity = selisih !== 0 ? '1' : '0.45';
    saveBtn.title = selisih !== 0 ? `Simpan stok aktual: ${aktual}` : 'Tidak ada perubahan';
  }
}

async function simpanOpnameRow(i) {
  if (currentUser?.role === 'sales') { showToast('❌ Sales tidak bisa melakukan opname!', 'error'); return; }
  const b      = DB.barang[i];
  if (!b) return;
  const aktual = parseInt(document.getElementById(`op-act-${i}`)?.value) || 0;
  const note   = document.getElementById(`op-note-${i}`)?.value || '';
  const selisih = aktual - b.stok;

  if (!confirm(`Simpan stok aktual "${b.nama}"?\nStok sistem: ${b.stok} → Aktual: ${aktual} (${selisih >= 0 ? '+' : ''}${selisih})\n\n⚠️ Stok barang akan diupdate ke sistem.`)) return;

  const btn = document.getElementById(`op-save-${i}`);
  if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; btn.disabled = true; }

  try {
    // 1. Update stok barang di Firestore
    if (b._id) {
      await window.FS.updateDoc(window.FS.docRef('barang', b._id), {
        stok: aktual,
        keluar: (b.keluar || 0) + Math.max(0, b.stok - aktual),
        masuk : (b.masuk  || 0) + Math.max(0, aktual - b.stok),
      });
    } else {
      b.stok = aktual;
      renderBarang(); renderStok();
    }
    // 2. Simpan record opname ke Firestore
    await window.FS.addDoc(window.FS.col('opname'), {
      tgl      : new Date().toISOString().slice(0,10),
      kode     : b.kode, nama: b.nama, satuan: b.satuan,
      stokSistem: b.stok, stokAktual: aktual, selisih,
      catatan  : note,
      user     : currentUser?.name || '-',
    });

    addLog('stok', `Opname ${b.nama}: sistem ${b.stok} → aktual ${aktual} (${selisih >= 0 ? '+' : ''}${selisih})`);
    showToast(`✅ Stok ${b.nama} diupdate ke ${aktual}!`);

    // Update lokal langsung agar status langsung berubah
    b.stok = aktual;
    if (btn) { btn.innerHTML = '<i class="fas fa-check"></i>'; btn.style.background = 'var(--accent2)'; }
    setTimeout(() => {
      renderOpname(); // Re-render tabel setelah simpan
    }, 800);
  } catch(e) {
    showToast('❌ Gagal simpan: ' + e.message, 'error');
    if (btn) { btn.innerHTML = '<i class="fas fa-save"></i>'; btn.disabled = false; }
  }
}

async function simpanSemuaOpname() {
  const changed = DB.barang.filter((b,i) => {
    const aktual = parseInt(document.getElementById(`op-act-${i}`)?.value);
    return !isNaN(aktual) && aktual !== b.stok;
  });
  if (changed.length === 0) { showToast('Tidak ada perubahan untuk disimpan.', 'info'); return; }
  if (!confirm(`Simpan ${changed.length} perubahan stok ke sistem sekaligus?`)) return;

  showToast('⏳ Menyimpan semua perubahan...', 'info');
  let berhasil = 0;
  for (let i = 0; i < DB.barang.length; i++) {
    const b      = DB.barang[i];
    const aktual = parseInt(document.getElementById(`op-act-${i}`)?.value);
    if (isNaN(aktual) || aktual === b.stok) continue;
    try {
      if (b._id) await window.FS.updateDoc(window.FS.docRef('barang', b._id), { stok: aktual });
      await window.FS.addDoc(window.FS.col('opname'), {
        tgl: new Date().toISOString().slice(0,10),
        kode:b.kode, nama:b.nama, satuan:b.satuan,
        stokSistem:b.stok, stokAktual:aktual, selisih:aktual-b.stok,
        catatan: document.getElementById(`op-note-${i}`)?.value||'',
        user: currentUser?.name||'-',
      });
      b.stok = aktual;
      berhasil++;
    } catch(e) { console.warn('opname simpan error:', e); }
  }
  addLog('stok', `Opname massal: ${berhasil} barang diupdate`);
  showToast(`✅ ${berhasil} stok berhasil disimpan!`);
  setTimeout(() => renderOpname(), 600);
}

async function generateOpname() {
  const rows = DB.barang.map((b,i) => {
    const aktual = parseInt(document.getElementById(`op-act-${i}`)?.value) ?? b.stok;
    const note   = document.getElementById(`op-note-${i}`)?.value || '';
    const selisih = aktual - b.stok;
    const status  = aktual <= 0 ? 'Habis' : aktual <= b.minStok ? 'Kritis' : 'Aman';
    return [b.kode, `"${b.nama}"`, b.satuan, b.stok, aktual, selisih, status, `"${note}"`].join(',');
  });
  const csv = ['Kode,Nama,Satuan,Stok Sistem,Stok Aktual,Selisih,Status,Catatan', ...rows].join('\n');
  const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'}); // BOM untuk Excel
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
  safe('set-ppn-rate',   appConfig?.ppnRate ?? 11);
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
  if (currentUser?.role === 'sales') { showToast('❌ Sales tidak bisa ubah profil perusahaan!', 'error'); return; }
  const g = (id) => document.getElementById(id)?.value.trim()||'';
  const company = {
    nama: g('set-company-nama'), alamat: g('set-company-alamat'),
    telp: g('set-company-telp'), email: g('set-company-email'),
    npwp: g('set-company-npwp'), rekening: g('set-company-rek'),
  };
  const bonusRate = parseInt(document.getElementById('set-bonus-rate')?.value)||2;
  const ppnRate   = parseInt(document.getElementById('set-ppn-rate')?.value) ?? 11;
  if (!appConfig) appConfig = {};
  appConfig.company   = company;
  appConfig.bonusRate = bonusRate;
  appConfig.ppnRate   = ppnRate;
  appConfig.kategori  = getKategoriList();
  try {
    await window.FS.setDoc(window.FS.docRef('test','appConfig'), appConfig);
    showToast('✅ Profil perusahaan tersimpan!');
    addLog('setting','Update profil perusahaan');
  } catch(e) { showToast('❌ Gagal simpan: '+e.message, 'error'); }
}

async function tambahUserSales() {
  if (currentUser?.role !== 'owner') { showToast('❌ Hanya Owner yang bisa tambah akun sales!', 'error'); return; }
  const name  = document.getElementById('new-sales-name')?.value.trim();
  const email = document.getElementById('new-sales-email')?.value.trim();
  const pass  = document.getElementById('new-sales-pass')?.value.trim();
  if (!name||!email||!pass) { showToast('Lengkapi semua field!', 'error'); return; }
  try {
    showToast('⏳ Membuat akun...', 'info');
    const uid = await window.FA.createUser(email, pass);
    // Profil akan dibuat otomatis saat user pertama login (buildProfileFromEmail)
    // Owner tidak bisa tulis ke /users/{uid} karena Firestore rules memerlukan request.auth.uid == uid
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
  if (currentUser?.role !== 'owner') { showToast('❌ Hanya Owner yang bisa hapus akun sales!', 'error'); return; }
  const s = appConfig?.salesUsers?.[i];
  if (!s) return;
  if (!confirm(`Hapus akun sales ${s.name}?`)) return;
  appConfig.salesUsers.splice(i,1);
  await window.FS.setDoc(window.FS.docRef('test','appConfig'), appConfig).catch(()=>{});
  renderUsersList(); renderSalesDropdown();
  showToast('🗑️ Akun sales dihapus dari konfigurasi');
  addLog('setting','Hapus akun sales: '+s.name);
}

// ───────────────────── GANTI PASSWORD IN-APP ─────────────────────
async function gantiPassword() {
  const oldPass  = document.getElementById('gp-old')?.value.trim();
  const newPass  = document.getElementById('gp-new')?.value.trim();
  const confPass = document.getElementById('gp-confirm')?.value.trim();

  if (!oldPass || !newPass || !confPass) {
    showToast('❌ Semua field wajib diisi!', 'error'); return;
  }
  if (newPass.length < 6) {
    showToast('❌ Password baru minimal 6 karakter!', 'error'); return;
  }
  if (newPass !== confPass) {
    showToast('❌ Konfirmasi password tidak cocok!', 'error'); return;
  }
  if (newPass === oldPass) {
    showToast('❌ Password baru tidak boleh sama dengan password lama!', 'error'); return;
  }

  const btn = document.getElementById('btn-ganti-pass');
  if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...'; btn.disabled = true; }

  try {
    const fbUser = window.FA.currentUser();
    if (!fbUser) throw new Error('Sesi tidak ditemukan. Silakan login ulang.');

    // Re-authenticate dulu (wajib untuk operasi sensitif Firebase)
    await window.FA.reauthenticate(fbUser.email, oldPass);

    // Update password
    await window.FA.updatePassword(newPass);

    // Clear form
    ['gp-old','gp-new','gp-confirm'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });

    showToast('✅ Password berhasil diubah! Silakan login ulang untuk keamanan.', 'success');
    addLog('setting', 'Ganti password akun: ' + currentUser?.name);

    // Auto logout setelah 3 detik (security best practice)
    setTimeout(() => doLogout(), 3000);

  } catch(err) {
    const msgs = {
      'auth/wrong-password'         : '❌ Password lama salah!',
      'auth/invalid-credential'     : '❌ Password lama salah!',
      'auth/too-many-requests'      : '❌ Terlalu banyak percobaan. Tunggu beberapa menit.',
      'auth/requires-recent-login'  : '❌ Sesi terlalu lama. Logout lalu login ulang dulu.',
      'auth/network-request-failed' : '❌ Gagal koneksi — cek internet.',
      'auth/weak-password'          : '❌ Password baru terlalu lemah!',
    };
    showToast(msgs[err.code] || ('❌ ' + err.message), 'error');
  } finally {
    if (btn) { btn.innerHTML = '<i class="fas fa-key"></i> Ganti Password'; btn.disabled = false; }
  }
}

// ───────────────────── FIREBASE STORAGE MIGRATION ────────────────
// Migrasi satu kali: base64 di Firestore → URL di Firebase Storage
// Hanya Owner yang bisa menjalankan ini.
// Setelah selesai, dokumen barang hanya berisi array URL kecil (<50 byte/url).

async function cekStatusFoto() {
  const status = document.getElementById('migration-status');
  if (!status) return;
  status.style.display = 'block';
  status.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menganalisis foto...';

  let base64Count = 0, urlCount = 0, emptyCount = 0, totalBarang = DB.barang.length;
  DB.barang.forEach(b => {
    const fotos = b.foto || [];
    if (!fotos.length) { emptyCount++; return; }
    fotos.forEach(f => {
      if (window.ST.isUrl(f)) urlCount++;
      else base64Count++;
    });
  });

  const pct = totalBarang ? Math.round(((totalBarang - Math.ceil(base64Count / Math.max(urlCount + base64Count, 1) * totalBarang)) / totalBarang) * 100) : 100;
  status.innerHTML = `
    <strong>📊 Status Foto Produk</strong><br>
    Total produk: <strong>${totalBarang}</strong><br>
    Foto sudah di Storage (URL): <strong style="color:var(--success)">${urlCount}</strong><br>
    Foto masih base64 di Firestore: <strong style="color:${base64Count > 0 ? 'var(--danger)' : 'var(--success)'}">${base64Count}</strong><br>
    Produk tanpa foto: <strong>${emptyCount}</strong><br>
    ${base64Count > 0
      ? `<span style="color:var(--warning)">⚠️ Ada ${base64Count} foto yang perlu dimigrasi ke Storage.</span>`
      : `<span style="color:var(--success)">✅ Semua foto sudah di Firebase Storage!</span>`}`;
}

async function migrasiFotoKeStorage() {
  if (currentUser?.role !== 'owner') {
    showToast('❌ Hanya Owner yang bisa menjalankan migrasi!', 'error'); return;
  }
  if (!confirm('Migrasi semua foto base64 ke Firebase Storage?\n\nProses ini membaca semua barang, upload foto ke Storage, dan update Firestore. Bisa memakan beberapa menit tergantung jumlah foto.\n\nLanjutkan?')) return;

  const statusEl = document.getElementById('migration-status');
  const btnEl    = document.getElementById('btn-migrasi-foto');
  if (statusEl) statusEl.style.display = 'block';
  if (btnEl) btnEl.disabled = true;

  const updateStatus = (msg) => {
    if (statusEl) statusEl.innerHTML = msg;
  };

  let processed = 0, migrated = 0, skipped = 0, errors = 0;
  const barangList = DB.barang.filter(b => b._id); // hanya yang ada di Firestore

  updateStatus(`<i class="fas fa-spinner fa-spin"></i> Memulai migrasi ${barangList.length} produk...`);

  for (const b of barangList) {
    const fotos = b.foto || [];
    if (!fotos.length) { processed++; skipped++; continue; }

    // Cek apakah ada foto base64
    const hasBase64 = fotos.some(f => !window.ST.isUrl(f));
    if (!hasBase64) { processed++; skipped++; continue; }

    try {
      updateStatus(`<i class="fas fa-spinner fa-spin"></i> Migrasi ${processed + 1}/${barangList.length}: <strong>${b.nama}</strong>...`);

      // Upload semua foto — URL tetap URL, base64 diupload
      const newUrls = await Promise.all(fotos.map(async (f) => {
        if (window.ST.isUrl(f)) return f; // sudah URL, skip
        return await window.ST.uploadBase64(f, b._id);
      }));

      // Update Firestore — ganti base64 dengan URL
      await window.FS.updateDoc(window.FS.docRef('barang', b._id), { foto: newUrls });

      // Update local cache
      const idx = DB.barang.findIndex(x => x._id === b._id);
      if (idx >= 0) DB.barang[idx].foto = newUrls;

      migrated++;
    } catch(e) {
      console.error(`[Migration] Error on ${b.nama}:`, e);
      errors++;
    }
    processed++;
  }

  const resultMsg = `
    <strong>✅ Migrasi Selesai!</strong><br>
    Produk diproses: <strong>${processed}</strong><br>
    Foto berhasil dimigrasi: <strong style="color:var(--success)">${migrated} produk</strong><br>
    Sudah Storage / tanpa foto (skip): <strong>${skipped}</strong><br>
    ${errors > 0 ? `<span style="color:var(--danger)">❌ Gagal: ${errors} produk — cek console</span>` : ''}
    <br><em style="font-size:12px;color:var(--text-muted)">Refresh halaman untuk melihat perubahan.</em>`;

  updateStatus(resultMsg);
  if (btnEl) btnEl.disabled = false;
  addLog('setting', `Migrasi foto ke Storage: ${migrated} produk berhasil, ${errors} gagal`);
  showToast(errors === 0
    ? `✅ Migrasi selesai — ${migrated} produk dimigrasi!`
    : `⚠️ Migrasi selesai dengan ${errors} error`, errors > 0 ? 'warning' : 'success');
}

// ───────────────────── CLEAR DATA FUNCTIONS ─────────────────────
async function clearCollection(colName, label) {
  if (currentUser?.role !== 'owner') { showToast('❌ Hanya Owner yang bisa hapus semua data!', 'error'); return; }
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
  if (currentUser?.role === 'sales') { showToast('❌ Sales tidak bisa backup data!', 'error'); return; }
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
async function checkStokKritisNotif() {
  // Cegah duplikat pakai key unik, simpan ke Firestore
  for (const b of DB.barang.filter(bb => bb.stok <= bb.minStok)) {
    const key = 'stok-kritis-' + b.kode;
    const exists = DB.notifikasi.some(n => n.key === key && !n.baca);
    if (!exists) {
      const notif = {
        key,
        pesan : `⚠️ Stok ${b.nama} kritis — sisa ${b.stok} ${b.satuan}`,
        waktu : 'Baru saja',
        tipe  : 'danger',
        baca  : false,
      };
      try {
        await window.FS.addDoc(window.FS.col('notifikasi'), notif);
        // Realtime listener akan update DB.notifikasi otomatis
      } catch(e) {
        // Offline fallback — tambah lokal saja
        DB.notifikasi.unshift({ ...notif, id: Date.now() + Math.random() });
      }
    }
  }
}

function renderNotifications() {
  // checkStokKritisNotif() dipanggil async terpisah dari renderAll()

  const list = document.getElementById('notif-list');
  if (!list) return;

  const unread = DB.notifikasi.filter(n => !n.baca).length;
  const dot    = document.getElementById('notif-dot');
  if (dot) {
    dot.style.display = unread > 0 ? '' : 'none';
    dot.textContent   = unread > 9 ? '9+' : String(unread || '');
  }
  // Update badge di header panel juga
  const countBadge = document.getElementById('notif-count-badge');
  if (countBadge) {
    countBadge.style.display = unread > 0 ? '' : 'none';
    countBadge.textContent   = unread > 9 ? '9+' : String(unread);
  }

  const iM = { danger:'fa-exclamation-circle', warning:'fa-clock', success:'fa-check-circle', info:'fa-info-circle' };
  const cM = { danger:'rgba(239,68,68,0.1)', warning:'rgba(245,158,11,0.1)', success:'rgba(16,185,129,0.1)', info:'rgba(37,99,168,0.1)' };
  const fM = { danger:'var(--danger)', warning:'var(--accent)', success:'var(--accent2)', info:'var(--primary-light)' };

  list.innerHTML = DB.notifikasi.length === 0
    ? '<div style="padding:28px;text-align:center;color:var(--text-muted)">✅ Tidak ada notifikasi</div>'
    : DB.notifikasi.map((n, i) => `
      <div class="notif-item${n.baca ? ' notif-read' : ''}" onclick="bacaNotif(${i})">
        <div class="notif-icon" style="background:${cM[n.tipe]||cM.info};color:${fM[n.tipe]||fM.info}">
          <i class="fas ${iM[n.tipe]||iM.info}"></i>
        </div>
        <div style="flex:1;min-width:0">
          <p style="${n.baca?'color:var(--text-muted);font-weight:400':''}">${n.pesan}</p>
          <span>${n.waktu}</span>
        </div>
        ${!n.baca ? '<div class="unread-dot" style="flex-shrink:0;margin-top:4px"></div>' : '<i class="fas fa-check" style="color:var(--accent2);font-size:11px;margin-top:4px;flex-shrink:0"></i>'}
      </div>`).join('');
}


// ───────────────────── BROWSER PUSH NOTIFICATION ────────────────
let _notifPermission = (typeof Notification !== "undefined") ? Notification.permission : "default";

async function requestNotifPermission() {
  if (!("Notification" in window)) return false;
  if (_notifPermission === "granted") return true;
  try {
    const result = await Notification.requestPermission();
    _notifPermission = result;
    if (result === "granted") {
      showBrowserNotif("BMS Notifikasi Aktif", "Kamu akan menerima notifikasi stok kritis & invoice jatuh tempo.", "success");
      addLog("setting", "Aktifkan notifikasi browser");
    }
    return result === "granted";
  } catch(e) { return false; }
}

function showBrowserNotif(title, body, type, urgent) {
  if (!("Notification" in window) || _notifPermission !== "granted") return;
  if (typeof urgent === "undefined") urgent = false;
  const opts = { body, icon: "assets/img/logo.png", badge: "assets/img/logo.png", tag: "bms-" + (type||"info") + "-" + Date.now(), requireInteraction: urgent, silent: !urgent };
  if (navigator.serviceWorker && navigator.serviceWorker.ready) {
    navigator.serviceWorker.ready.then(reg => reg.showNotification(title, opts)).catch(() => { try { new Notification(title, opts); } catch(e){} });
  } else { try { new Notification(title, opts); } catch(e){} }
}

function checkAndPushBrowserNotif() {
  if (_notifPermission !== "granted") return;
  const today = new Date().toISOString().slice(0, 10);
  DB.barang.filter(b => b.stok <= b.minStok && b.stok > 0).forEach(b => {
    const key = "notif_stok_" + b.kode + "_" + today;
    if (!sessionStorage.getItem(key)) { showBrowserNotif("Stok Kritis: " + b.nama, "Sisa " + b.stok + " " + b.satuan + " — di bawah minimum (" + b.minStok + ")", "danger", true); sessionStorage.setItem(key, "1"); }
  });
  DB.barang.filter(b => b.stok <= 0).forEach(b => {
    const key = "notif_habis_" + b.kode + "_" + today;
    if (!sessionStorage.getItem(key)) { showBrowserNotif("Stok Habis: " + b.nama, "Produk ini tidak bisa dijual sampai stok diisi ulang.", "danger", true); sessionStorage.setItem(key, "1"); }
  });
  DB.invoice.filter(inv => inv.status !== "Lunas" && inv.tempo === today).forEach(inv => {
    const key = "notif_tempo_" + inv.no;
    if (!sessionStorage.getItem(key)) { showBrowserNotif("Invoice Jatuh Tempo: " + inv.no, inv.mitra + " — Rp " + (inv.total||0).toLocaleString("id-ID") + " jatuh tempo hari ini!", "warning", true); sessionStorage.setItem(key, "1"); }
  });
}

function renderNotifPermissionBtn() {
  const el = document.getElementById("notif-permission-btn");
  if (!el) return;
  if (!("Notification" in window)) { el.style.display = "none"; return; }
  if (_notifPermission === "granted") {
    el.innerHTML = '<i class="fas fa-bell"></i> Notifikasi Browser Aktif';
    el.style.opacity = "0.55"; el.style.cursor = "default"; el.onclick = null;
  } else {
    el.innerHTML = '<i class="fas fa-bell"></i> Aktifkan Notifikasi Browser';
    el.style.opacity = "1"; el.style.cursor = "pointer";
    el.onclick = async () => { await requestNotifPermission(); renderNotifPermissionBtn(); };
  }
}
async function bacaNotif(i) {
  const n = DB.notifikasi[i];
  if (!n) return;
  n.baca = true;
  renderNotifications(); // Update UI segera
  // Sinkronkan ke Firestore
  if (n._id) {
    try { await window.FS.updateDoc(window.FS.docRef('notifikasi', n._id), { baca: true }); }
    catch(e) { console.warn('notif update offline:', e); }
  }
}

async function markAllRead() {
  // Update lokal dulu (langsung terasa)
  DB.notifikasi.forEach(n => n.baca = true);
  renderNotifications();
  showToast('✅ Semua notifikasi ditandai dibaca');
  // Simpan semua ke Firestore secara batch
  try {
    const batch = window.FS.batch();
    DB.notifikasi.forEach(n => {
      if (n._id) batch.update(window.FS.docRef('notifikasi', n._id), { baca: true });
    });
    await batch.commit();
  } catch(e) {
    console.warn('markAllRead offline:', e);
  }
}
function toggleNotif() {
  const panel = document.getElementById('notif-panel');
  panel.classList.toggle('open');
  if (panel.classList.contains('open')) renderNotifications();
}

// ───────────────────── SYNC ──────────────────────────────────────
async function syncData() {
  const icon = document.getElementById('sync-icon');
  if (icon) icon.style.animation = 'spin 1s linear infinite';
  showToast('🔄 Sinkronisasi data...','info');
  try { await loadAllFromFirestore(); if(icon) icon.style.animation=''; showToast('☁️ Data tersinkronkan!'); }
  catch(e) { if(icon) icon.style.animation=''; showToast('❌ Gagal sinkronisasi','error'); }
}

// ───────────────────── MODAL ─────────────────────────────────────
// BUG #2 FIX — PPN label update integrated directly here; removed fragile override from index.html
function openModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.add('open'); document.body.style.overflow = 'hidden'; }
  if (id === 'modal-invoice') {
    setTimeout(() => {
      const rate = typeof getBMSPPNRate === 'function' ? getBMSPPNRate() : 11;
      const lbl  = document.getElementById('inv-ppn-label');
      if (lbl) lbl.textContent = rate === 0 ? 'PPN (nonaktif)' : `PPN ${rate}%`;
    }, 50);
  }
}
function closeModal(id) { const el=document.getElementById(id); if(el){el.classList.remove('open'); document.body.style.overflow='';} }
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) { e.target.classList.remove('open'); document.body.style.overflow=''; }
  if (!e.target.closest('.notif-panel')&&!e.target.closest('.topbar-btn')) document.getElementById('notif-panel')?.classList.remove('open');
});

// ───────────────────── BARANG CRUD ──────────────────────────────
async function simpanBarang() {
  if (currentUser?.role === 'sales') { showToast('❌ Sales tidak bisa tambah barang!', 'error'); return; }
  const nama = document.getElementById('b-nama')?.value.trim();
  const kode = document.getElementById('b-kode')?.value.trim();
  if (!nama||!kode) { showToast('Nama dan kode wajib diisi!','error'); return; }

  // ── Storage v4.0: upload File objects, simpan URL (bukan base64) ──
  const btnSave = document.getElementById('btn-simpan-barang');
  if (btnSave) btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
  let fotoArr = [];
  if (_pendingFotoFiles.length > 0) {
    try {
      showToast('📤 Mengupload foto ke Firebase Storage...', 'info');
      // Upload sementara pakai 'new' — akan di-rename setelah dapat docId
      fotoArr = await window.ST.uploadFotoArr(_pendingFotoFiles, 'new');
    } catch(e) {
      showToast('⚠️ Upload foto gagal: ' + e.message + ' — barang tetap disimpan tanpa foto', 'warning');
    }
  }

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
    keluar  : 0,
    foto    : fotoArr,   // Array of Storage URLs (or empty)
  };
  try {
    await window.FS.addDoc(window.FS.col('barang'), data);
    addLog('tambah', 'Tambah barang: ' + nama + (fotoArr.length ? ` (${fotoArr.length} foto)` : ''));
    showToast('✅ Barang tersimpan ke cloud!');
  } catch(e) {
    DB.barang.unshift(data); renderBarang();
    showToast('✅ Barang ditambahkan (offline)');
  }
  _pendingFotoFiles = [];
  if (btnSave) btnSave.innerHTML = '<i class="fas fa-save"></i> Simpan Barang';
  fillDropdowns(); closeModal('modal-barang');
  ['b-kode','b-nama','b-stok','b-hbeli','b-hjual','b-desc'].forEach(id=>{ const el=document.getElementById(id); if(el)el.value=''; });
  const prev = document.getElementById('foto-preview'); if(prev) prev.innerHTML='';
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
  if (currentUser?.role === 'sales') { showToast('❌ Sales tidak bisa edit barang!', 'error'); return; }
  const i    = parseInt(document.getElementById('eb-idx')?.value);
  const b    = DB.barang[i];
  if (!b) return;
  const nama = document.getElementById('eb-nama')?.value.trim();
  const kode = document.getElementById('eb-kode')?.value.trim();
  if (!nama||!kode) { showToast('Nama dan kode wajib diisi!','error'); return; }

  // ── Storage v4.0 — upload foto baru jika ada, hapus foto lama dari Storage ──
  const btnSave = document.getElementById('btn-simpan-edit-barang');
  if (btnSave) btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
  let fotoArr = b.foto || [];   // fallback: pakai foto lama
  if (_pendingEditFotoFiles.length > 0) {
    try {
      showToast('📤 Mengupload foto baru ke Firebase Storage...', 'info');
      const newUrls = await window.ST.uploadFotoArr(_pendingEditFotoFiles, b._id || 'edit');
      // Hapus foto lama dari Storage (async, jangan tunggu)
      (b.foto || []).forEach(url => window.ST.deleteFoto(url).catch(() => {}));
      fotoArr = newUrls;
    } catch(e) {
      showToast('⚠️ Upload foto gagal: ' + e.message + ' — foto lama dipertahankan', 'warning');
    }
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
    foto     : fotoArr,   // Storage URLs
  };
  try {
    if (b._id) {
      await window.FS.updateDoc(window.FS.docRef('barang', b._id), updated);
    } else {
      DB.barang[i] = { ...b, ...updated };
      renderBarang(); renderStok(); fillDropdowns();
    }
    addLog('edit', `Edit barang: ${nama}${_pendingEditFotoFiles.length ? ' (foto baru)' : ''}`);
    showToast('✅ Barang berhasil diupdate!');
  } catch(e) {
    DB.barang[i] = { ...b, ...updated };
    renderBarang(); renderStok(); fillDropdowns();
    showToast('✅ Barang diupdate (offline)');
  }
  _pendingEditFotoFiles = [];
  if (btnSave) btnSave.innerHTML = '<i class="fas fa-save"></i> Simpan Perubahan';
  closeModal('modal-edit-barang');
}

async function hapusBarang(i) {
  if (currentUser?.role === 'sales') { showToast('❌ Sales tidak bisa hapus barang!', 'error'); return; }
  const b = DB.barang[i];
  if (!confirm(`Hapus barang "${b.nama}" beserta ${(b.foto||[]).length} foto?`)) return;
  try {
    if (b._id) {
      await window.FS.deleteDoc(window.FS.docRef('barang', b._id));
      // Hapus foto dari Storage secara async (tidak menghentikan flow jika gagal)
      (b.foto || []).forEach(url => window.ST.deleteFoto(url).catch(() => {}));
    } else {
      DB.barang.splice(i, 1); renderBarang();
    }
    addLog('hapus', 'Hapus barang: ' + b.nama);
    showToast('🗑️ Barang dihapus!');
  } catch(e) {
    DB.barang.splice(i, 1); renderBarang();
    showToast('🗑️ Barang dihapus (offline)');
  }
}

// ── previewFoto — Storage migration (v4.0) ────────────────────────
// File objects disimpan di _pendingFotoFiles untuk diupload saat
// simpanBarang() dipanggil. Preview pakai URL.createObjectURL()
// sehingga TIDAK ada base64 yang disimpan ke Firestore.
let _pendingFotoFiles = [];   // File[] — di-clear setiap buka modal

function previewFoto(event) {
  const preview = document.getElementById('foto-preview');
  preview.innerHTML = '';
  _pendingFotoFiles = [];
  const MAX_SIZE_MB = 5; // Storage menerima file lebih besar dari base64

  Array.from(event.target.files).slice(0, 4).forEach(file => {
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      showToast(`⚠️ "${file.name}" terlalu besar (maks ${MAX_SIZE_MB}MB).`, 'warning');
      return;
    }
    _pendingFotoFiles.push(file);
    const url = URL.createObjectURL(file);
    const img = document.createElement('img');
    img.src   = url;
    img.style.cssText = 'width:80px;height:80px;object-fit:cover;border-radius:10px;border:2px solid var(--border)';
    img.title = `${file.name} (${(file.size/1024).toFixed(0)}KB)`;
    preview.appendChild(img);
  });
  const lbl = document.getElementById('foto-upload-label');
  if (lbl) lbl.textContent = `${_pendingFotoFiles.length} foto dipilih — upload ke Firebase Storage`;
}

// previewEditFoto — untuk modal edit barang
let _pendingEditFotoFiles = [];

function previewEditFoto(event) {
  const preview = document.getElementById('eb-foto-new-preview');
  if (preview) preview.innerHTML = '';
  _pendingEditFotoFiles = [];
  const MAX_SIZE_MB = 5;

  Array.from(event.target.files).slice(0, 4).forEach(file => {
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      showToast(`⚠️ "${file.name}" terlalu besar (maks ${MAX_SIZE_MB}MB).`, 'warning');
      return;
    }
    _pendingEditFotoFiles.push(file);
    const url = URL.createObjectURL(file);
    const img = document.createElement('img');
    img.src   = url;
    img.style.cssText = 'width:64px;height:64px;object-fit:cover;border-radius:10px;border:2px solid var(--border)';
    if (preview) preview.appendChild(img);
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
  safe('trx-lunas',  fmtRp(lunas));
  safe('trx-belum',  fmtRp(belum));
  safe('trx-cash',   fmtRp(cash));
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
  document.getElementById(`inv-hp-${idx}`).textContent   = fmtRp(harga);
  const stokEl = document.getElementById(`inv-stok-${idx}`);
  if (stokEl) {
    stokEl.innerHTML = stok <= 0
      ? `<span style="color:var(--danger);font-weight:700">⛔ Habis</span>`
      : `<span style="color:${stok<=10?'var(--accent)':'var(--accent2)'}">Sisa: ${stok}</span>`;
  }
  document.getElementById(`inv-tot-${idx}`).textContent  = fmtRp(invItems[idx].total);
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
  if (el) el.textContent = fmtRp(invItems[idx].total);
  hitungTotal();
}

function removeInvItem(idx, row) { invItems[idx]=null; row.remove(); hitungTotal(); }

function hitungTotal() {
  const items    = invItems.filter(Boolean);
  const subtotal = items.reduce((s,i)=>s+(i.total||0),0);
  const diskon   = parseFloat(document.getElementById('inv-diskon')?.value)||0;
  const afterD   = subtotal*(1-diskon/100);
  const ppnRate  = appConfig?.ppnRate ?? 11;
  const ppn      = afterD*(ppnRate/100);
  const total    = afterD+ppn;
  const safe = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  safe('inv-subtotal', fmtRp(subtotal));
  safe('inv-ppn',      fmtRp(Math.round(ppn)));
  safe('inv-total',    fmtRp(Math.round(total)));
  // Update label PPN agar menampilkan persentase aktual
  const ppnLabel = document.getElementById('inv-ppn-label');
  if (ppnLabel) ppnLabel.textContent = `PPN ${ppnRate}%`;
}

async function hapusTransaksi(i) {
  const inv = DB.invoice[i];
  if (!inv) return;
  // Sales tidak bisa hapus transaksi apapun
  if (currentUser?.role === 'sales') { showToast('❌ Sales tidak bisa hapus transaksi!', 'error'); return; }

  // Tampilkan detail stok yang akan dikembalikan
  const itemList = (inv.items || []).filter(Boolean)
    .map(it => `• ${it.nama}: +${it.qty} ${it.satuan || ''}`)
    .join('\n');
  const rollbackInfo = itemList
    ? `\n\nStok berikut akan DIKEMBALIKAN:\n${itemList}` : '';

  if (!confirm(`Hapus transaksi ${inv.no}?\nMitra: ${inv.mitra} — Rp ${(inv.total||0).toLocaleString('id-ID')}${rollbackInfo}\n\n⚠️ Tindakan ini permanen!`)) return;

  try {
    // 1. Rollback stok setiap item ke Firestore
    const rollbackErrors = [];
    for (const item of (inv.items || []).filter(Boolean)) {
      if (!item.nama) continue;
      const b = DB.barang.find(b => b.nama === item.nama);
      if (b && b._id) {
        const newStok   = (b.stok   || 0) + item.qty;
        const newKeluar = Math.max(0, (b.keluar || 0) - item.qty);
        try {
          await window.FS.updateDoc(window.FS.docRef('barang', b._id), {
            stok: newStok, keluar: newKeluar,
          });
          b.stok = newStok; b.keluar = newKeluar;
        } catch(e) {
          rollbackErrors.push(item.nama);
          b.stok = (b.stok || 0) + item.qty;
          b.keluar = Math.max(0, (b.keluar || 0) - item.qty);
        }
      }
    }

    // 2. Hapus invoice
    if (inv._id) await window.FS.deleteDoc(window.FS.docRef('invoice', inv._id));
    else { DB.invoice.splice(i, 1); renderInvoice(); }

    addLog('hapus', `Hapus transaksi: ${inv.no} (stok ${inv.items?.length || 0} item dikembalikan)`);

    if (rollbackErrors.length) {
      showToast(`🗑️ Transaksi dihapus. ⚠️ Gagal rollback stok: ${rollbackErrors.join(', ')}`, 'warning');
    } else {
      showToast('🗑️ Transaksi dihapus & stok dikembalikan!');
    }
    renderBarang(); renderStok(); renderStokKritis();
  } catch(e) {
    // Offline fallback
    for (const item of (inv.items || []).filter(Boolean)) {
      const b = DB.barang.find(b => b.nama === item.nama);
      if (b) { b.stok = (b.stok || 0) + item.qty; b.keluar = Math.max(0, (b.keluar || 0) - item.qty); }
    }
    DB.invoice.splice(i, 1);
    renderInvoice(); renderBarang(); renderStok();
    showToast('🗑️ Transaksi dihapus & stok dikembalikan (offline)');
  }
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
  const ppnRate    = appConfig?.ppnRate ?? 11;
  const ppn        = afterD*(ppnRate/100);
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
    ppnRate     : appConfig?.ppnRate ?? 11,
    catatan     : document.getElementById('inv-catatan')?.value.trim() || '',
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
    // Update piutang mitra jika metode Tempo (Belum Lunas)
    if (status === 'Belum Lunas' && mitra) {
      const m = DB.mitra.find(m => m.nama === mitra);
      if (m) {
        m.piutang = (m.piutang || 0) + total;
        if (m._id) window.FS.updateDoc(window.FS.docRef('mitra', m._id), { piutang: m.piutang }).catch(() => {});
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
  const catatanEl = document.getElementById('inv-catatan'); if(catatanEl) catatanEl.value = '';
  hitungTotal();
  renderBarang(); renderStok(); renderStokKritis();
}

async function tandaiLunas(i) {
  const inv = DB.invoice[i];
  if (!inv) return;
  const prevStatus = inv.status;
  const updates = { status: 'Lunas', tglLunas: new Date().toISOString().slice(0,10) };

  if (inv._id) {
    try {
      await window.FS.updateDoc(window.FS.docRef('invoice', inv._id), updates);
      Object.assign(inv, updates);
    } catch(e) {
      // Cek apakah error karena Firebase permissions
      if (e.code === 'permission-denied') {
        showToast('❌ Tidak ada izin. Cek Firestore Rules di Firebase Console!', 'error');
        console.error('Firestore permission denied:', e);
        return;
      }
      // Error lain (offline) — update lokal saja
      Object.assign(inv, updates);
      showToast('⚠️ Offline — status diupdate lokal saja', 'warning');
    }
  } else {
    Object.assign(inv, updates);
  }

  // Update piutang mitra jika sebelumnya Belum Lunas
  if (prevStatus !== 'Lunas' && inv.mitra) {
    const m = DB.mitra.find(m => m.nama === inv.mitra);
    if (m) {
      const bayar = inv.total || 0;
      m.piutang = Math.max(0, (m.piutang || 0) - bayar);
      if (m._id) {
        window.FS.updateDoc(window.FS.docRef('mitra', m._id), { piutang: m.piutang })
          .catch(err => console.warn('Gagal update piutang mitra:', err));
      }
    }
  }
  renderInvoice();
  renderInvoiceStats();
  renderMitra();
  renderDashboardStats();
  if (isPageActive('laporan')) buildLaporanChart();
  addLog('invoice', 'Tandai lunas: ' + inv.no);
  showToast('✅ Invoice ' + inv.no + ' ditandai Lunas!');
}

function editInvoice(i) {
  const inv = DB.invoice[i];
  if (!inv) return;
  const safe = (id,v) => { const el=document.getElementById(id); if(el) el.value=v||''; };
  safe('ei-idx',     i);
  safe('ei-no',      inv.no);
  safe('ei-tempo',   inv.tempo !== '-' ? inv.tempo : '');
  safe('ei-catatan', inv.catatan || '');
  const statusEl = document.getElementById('ei-status');
  if (statusEl) statusEl.value = inv.status || 'Belum Lunas';
  openModal('modal-edit-invoice');
}

async function simpanEditInvoice() {
  const i      = parseInt(document.getElementById('ei-idx')?.value);
  const inv    = DB.invoice[i];
  if (!inv) return;
  // Sales hanya bisa edit invoice miliknya sendiri
  if (currentUser?.role === 'sales' && inv.salesUid !== currentUser.uid) {
    showToast('❌ Sales hanya bisa edit invoice miliknya!', 'error'); return;
  }
  const status  = document.getElementById('ei-status')?.value;
  const tempo   = document.getElementById('ei-tempo')?.value || '-';
  const catatan = document.getElementById('ei-catatan')?.value.trim() || '';
  const updates = { status, tempo, catatan };
  try {
    if (inv._id) {
      await window.FS.updateDoc(window.FS.docRef('invoice', inv._id), updates);
    } else {
      Object.assign(DB.invoice[i], updates);
      renderInvoice();
    }
    addLog('edit', `Edit invoice ${inv.no}: status → ${status}`);
    showToast('✅ Invoice berhasil diupdate!');
  } catch(e) {
    Object.assign(DB.invoice[i], updates);
    renderInvoice();
    showToast('✅ Invoice diupdate (offline)');
  }
  closeModal('modal-edit-invoice');
}

function previewInvoice() {
  const mitra = document.getElementById('inv-mitra')?.value||'Nama Mitra';
  const items = invItems.filter(Boolean);
  const subtotal = items.reduce((s,i)=>s+(i.total||0),0);
  const diskon   = parseFloat(document.getElementById('inv-diskon')?.value)||0;
  const afterD   = subtotal*(1-diskon/100);
  const ppnRate  = appConfig?.ppnRate ?? 11;
  const ppn      = afterD*(ppnRate/100);
  const total    = afterD+ppn;
  const catatan  = document.getElementById('inv-catatan')?.value.trim() || '';
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
      <tr><td>PPN ${ppnRate}%</td><td style="text-align:right">Rp ${Math.round(ppn).toLocaleString('id-ID')}</td></tr>
      <tr class="total-row"><td>TOTAL</td><td style="text-align:right">Rp ${Math.round(total).toLocaleString('id-ID')}</td></tr>
    </table></div>
    ${catatan ? `<div class="invoice-catatan"><strong>Catatan:</strong> ${catatan}</div>` : ''}
    <div class="invoice-terbilang" style="border:1px solid #e2e8f0;border-radius:8px;padding:10px 16px;margin:12px 0;background:#f8fafc">
      <span style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Terbilang:</span>
      <p style="font-size:12.5px;font-style:italic;margin:4px 0 0;color:#1e293b;font-weight:600"># ${terbilang(Math.round(total))} #</p>
    </div>
    <div class="invoice-footer">
      <p>Terima kasih atas kepercayaan Anda berbelanja di ${co.nama||"Baitul Ma'mur Syafaah"}</p>
      <p>Pembayaran: ${co.rekening||'BCA 123-456-7890 a/n Baitul Mamur Syafaah'}</p>
    </div>`;
  openModal('modal-preview-inv');
}

function showInvoicePreview(i) {
  const inv = DB.invoice[i];
  const co  = appConfig?.company || {};
  const nama    = co.nama    || "CV. Baitul Ma'mur Syafaah";
  const alamat  = co.alamat  || 'Ruko Villa Bogor Indah 5, Bogor, Jawa Barat';
  const telp    = co.telp    || '(0251) 8xxx-xxxx';
  const email   = co.email   || 'info@bms-syafaah.id';
  const npwp    = co.npwp    || '-';
  const rek     = co.rekening|| 'BCA 123-456-7890 a/n Baitul Mamur Syafaah';

  const badgeMetode = inv.metodeBayar === 'Tunai' ? '#16a34a' : inv.metodeBayar === 'Transfer' ? '#2563a8' : '#d97706';
  const badgeStatus = inv.status === 'Lunas' ? '#16a34a' : inv.status === 'Jatuh Tempo' ? '#dc2626' : '#d97706';

  const itemsHtml = inv.items
    ? `<table class="invoice-table">
        <thead><tr>
          <th style="width:32px">No</th><th>Nama Barang</th><th>Satuan</th>
          <th style="text-align:right">Qty</th>
          <th style="text-align:right">Harga Satuan</th>
          <th style="text-align:right">Total</th>
        </tr></thead>
        <tbody>${inv.items.filter(Boolean).map((it,j)=>`
          <tr>
            <td>${j+1}</td><td>${it.nama}</td><td>${it.satuan}</td>
            <td style="text-align:right">${it.qty}</td>
            <td style="text-align:right">Rp ${(it.harga||0).toLocaleString('id-ID')}</td>
            <td style="text-align:right"><strong>Rp ${(it.total||0).toLocaleString('id-ID')}</strong></td>
          </tr>`).join('')}
        </tbody>
      </table>`
    : `<div style="padding:20px;text-align:center;color:#666;font-style:italic">Detail item tidak tersedia</div>`;

  const subtotal   = inv.items ? inv.items.filter(Boolean).reduce((s,it)=>s+(it.total||0),0) : inv.total;
  const diskon     = inv.diskon || 0;
  const afterD     = subtotal * (1 - diskon/100);
  const ppnRate    = inv.ppnRate ?? appConfig?.ppnRate ?? 11;
  const ppn        = afterD * (ppnRate/100);

  document.getElementById('invoice-preview-content').innerHTML = `
    <div class="invoice-header">
      <div class="invoice-company">
        <h2>${nama}</h2>
        <p>${alamat}<br>
        Telp: ${telp}&nbsp;&nbsp;|&nbsp;&nbsp;Email: ${email}<br>
        NPWP: ${npwp}</p>
      </div>
      <div class="invoice-meta">
        <h1>INVOICE</h1>
        <p>No: <strong>${inv.no}</strong></p>
        <p>Tanggal: <strong>${inv.tgl}</strong></p>
        <p>Jatuh Tempo: <strong>${inv.metodeBayar === 'Tempo' ? inv.tempo : '-'}</strong></p>
        <p style="margin-top:6px">
          <span style="background:${badgeMetode};color:#fff;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:700">${inv.metodeBayar||'Tempo'}</span>
          &nbsp;
          <span style="background:${badgeStatus};color:#fff;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:700">${inv.status}</span>
        </p>
      </div>
    </div>

    <div class="invoice-to">
      <h4>Kepada Yth.</h4>
      <p><strong>${inv.mitra}</strong></p>
      ${inv.salesName ? `<p style="font-size:11px;color:#666;margin-top:2px">Sales: ${inv.salesName}</p>` : ''}
    </div>

    ${itemsHtml}

    <div class="invoice-totals">
      <table>
        <tr><td>Subtotal</td><td style="text-align:right">Rp ${subtotal.toLocaleString('id-ID')}</td></tr>
        ${diskon > 0 ? `<tr><td>Diskon (${diskon}%)</td><td style="text-align:right;color:#dc2626">- Rp ${Math.round(subtotal*diskon/100).toLocaleString('id-ID')}</td></tr>` : ''}
        <tr><td>PPN ${ppnRate}%</td><td style="text-align:right">Rp ${Math.round(ppn).toLocaleString('id-ID')}</td></tr>
        <tr class="total-row"><td>TOTAL</td><td style="text-align:right">Rp ${(inv.total||0).toLocaleString('id-ID')}</td></tr>
      </table>
    </div>

    ${inv.catatan ? `<div class="invoice-catatan"><strong>Catatan:</strong> ${inv.catatan}</div>` : ''}

    <div class="invoice-terbilang" style="border:1px solid #e2e8f0;border-radius:8px;padding:10px 16px;margin:12px 0;background:#f8fafc">
      <span style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Terbilang:</span>
      <p style="font-size:12.5px;font-style:italic;margin:4px 0 0;color:#1e293b;font-weight:600"># ${terbilang(inv.total || 0)} #</p>
    </div>

    <div class="invoice-footer">
      <p>Pembayaran ke: <strong>${rek}</strong></p>
      <p>Terima kasih telah berbelanja di <strong>${nama}</strong>. Harap konfirmasi pembayaran setelah transfer.</p>
    </div>

    <div class="invoice-sign-area">
      <div class="sign-box">
        <span class="sign-line"></span>
        <strong>Disiapkan Oleh</strong>
        <p>${inv.salesName || 'Sales / Admin'}</p>
      </div>
      <div class="sign-box">
        <span class="sign-line"></span>
        <strong>Diterima Oleh</strong>
        <p>( Pelanggan )</p>
      </div>
      <div class="sign-box">
        <span class="sign-line"></span>
        <strong>Mengetahui</strong>
        <p>( Pimpinan )</p>
      </div>
    </div>`;

  // Wrap untuk @print — hanya invoice-preview-content yang tercetak
  let wrapper = document.getElementById('print-invoice-wrapper');
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.id = 'print-invoice-wrapper';
    wrapper.style.cssText = 'display:none;position:fixed;top:0;left:0;width:100%;z-index:99999;background:#fff';
    document.body.appendChild(wrapper);
  }
  wrapper.innerHTML = `<div class="invoice-preview">${document.getElementById('invoice-preview-content').innerHTML}</div>`;

  openModal('modal-preview-inv');
}

function printInvoice() {
  // Tampilkan wrapper, print, sembunyikan kembali
  const wrapper = document.getElementById('print-invoice-wrapper');
  if (wrapper) {
    wrapper.style.display = 'block';
    setTimeout(() => {
      window.print();
      setTimeout(() => { wrapper.style.display = 'none'; }, 1000);
    }, 200);
  } else {
    window.print();
  }
}

// ───────────────────── MITRA CRUD ───────────────────────────────
async function simpanMitra() {
  if (currentUser?.role === 'sales') { showToast('❌ Sales tidak bisa tambah mitra!', 'error'); return; }
  const nama = document.getElementById('m-nama')?.value.trim();
  if (!nama) { showToast('Nama mitra wajib diisi!','error'); return; }
  const kode = `MTR-${String(DB.mitra.length+1).padStart(3,'0')}`;
  const data = {
    kode, nama,
    tipe   : document.getElementById('m-tipe')?.value||'Pelanggan',
    pic    : document.getElementById('m-pic')?.value||'',
    hp     : document.getElementById('m-hp')?.value||'',
    kota   : document.getElementById('m-kota')?.value||'',
    alamat : document.getElementById('m-alamat')?.value.trim()||'',
    piutang: 0, status:'Aktif',
  };
  try { await window.FS.addDoc(window.FS.col('mitra'),data); addLog('tambah','Tambah mitra: '+nama); showToast('✅ Mitra tersimpan ke cloud!'); }
  catch(e) { DB.mitra.push(data); renderMitra(); showToast('✅ Mitra ditambahkan (offline)'); }
  fillDropdowns(); closeModal('modal-mitra');
  ['m-nama','m-pic','m-hp','m-kota','m-alamat'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
}

async function hapusMitra(i) {
  if (currentUser?.role === 'sales') { showToast('❌ Sales tidak bisa hapus mitra!', 'error'); return; }
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
// BUG #4 FIX — sebelumnya tidak membaca harga beli dan tidak mencatat ke data pembelian/keuangan
async function simpanStokMasuk() {
  if (currentUser?.role === 'sales') { showToast('❌ Sales tidak bisa input stok masuk!', 'error'); return; }
  const nama    = document.getElementById('sm-barang')?.value;
  const qty     = parseInt(document.getElementById('sm-qty')?.value)||0;
  const harga   = parseInt(document.getElementById('sm-harga')?.value)||0;
  const pemasok = document.getElementById('sm-pemasok')?.value || '-';
  const tgl     = document.getElementById('sm-tgl')?.value;
  if (!nama||qty<=0) { showToast('Lengkapi data stok masuk!','error'); return; }
  const b = DB.barang.find(b=>b.nama===nama);
  if (!b) return;
  b.stok  += qty;
  b.masuk = (b.masuk||0) + qty;
  if (b._id) {
    try { await window.FS.updateDoc(window.FS.docRef('barang',b._id),{stok:b.stok,masuk:b.masuk}); }
    catch(e) { /* offline — local state terupdate */ }
  }
  // Catat ke data pembelian/keuangan jika harga beli diisi
  if (harga > 0) {
    const pbData = { tgl, pemasok, barang: nama, qty, total: qty * harga };
    try { await window.FS.addDoc(window.FS.col('pembelian'), pbData); }
    catch(e) { DB.pembelian.unshift(pbData); }
    renderPembelian();
  }
  renderStok(); renderBarang(); renderStokKritis();
  addLog('stok','Stok masuk '+nama+' +'+qty);
  closeModal('modal-stok-masuk');
  showToast(`✅ Stok ${nama} +${qty}!`);
}

async function simpanStokKeluar() {
  if (currentUser?.role === 'sales') { showToast('❌ Sales tidak bisa input stok keluar manual!', 'error'); return; }
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
  if (currentUser?.role === 'sales') { showToast('❌ Sales tidak bisa input pengeluaran!', 'error'); return; }
  const ket = document.getElementById('pe-ket')?.value.trim();
  const jml = parseInt(document.getElementById('pe-jml')?.value)||0;
  if (!ket||jml<=0) { showToast('Lengkapi data pengeluaran!','error'); return; }
  const data = { tgl:document.getElementById('pe-tgl')?.value, ket, jml, kat:document.getElementById('pe-kat')?.value||'Lain-lain' };
  try { await window.FS.addDoc(window.FS.col('pengeluaran'),data); addLog('tambah','Pengeluaran: '+ket); showToast('✅ Pengeluaran tersimpan!'); }
  catch(e) { DB.pengeluaran.unshift(data); renderPengeluaran(); showToast('✅ Pengeluaran dicatat (offline)'); }
  closeModal('modal-pengeluaran');
}

// BUG #3 FIX — sebelumnya tidak mengupdate stok barang; sekarang stok ikut bertambah
async function simpanPembelian() {
  if (currentUser?.role === 'sales') { showToast('❌ Sales tidak bisa input pembelian!', 'error'); return; }
  const pemasok = document.getElementById('pb-pemasok')?.value;
  const barang  = document.getElementById('pb-barang')?.value;
  const qty     = parseInt(document.getElementById('pb-qty')?.value)||0;
  const harga   = parseInt(document.getElementById('pb-harga')?.value)||0;
  if (!pemasok||!barang||qty<=0) { showToast('Lengkapi data pembelian!','error'); return; }
  const data = { tgl:document.getElementById('pb-tgl')?.value, pemasok, barang, qty, total:qty*harga };
  try {
    await window.FS.addDoc(window.FS.col('pembelian'), data);
    addLog('tambah','Pembelian: '+barang);
    showToast('✅ Pembelian tersimpan!');
  } catch(e) {
    DB.pembelian.unshift(data);
    renderPembelian();
    showToast('✅ Pembelian dicatat (offline)');
  }
  // Update stok barang yang dibeli
  const b = DB.barang.find(x => x.nama === barang);
  if (b) {
    b.stok  = (b.stok  || 0) + qty;
    b.masuk = (b.masuk || 0) + qty;
    if (b._id) {
      try { await window.FS.updateDoc(window.FS.docRef('barang', b._id), { stok: b.stok, masuk: b.masuk }); }
      catch(e) { /* offline — local state sudah terupdate */ }
    }
    renderBarang(); renderStok(); renderStokKritis();
  }
  closeModal('modal-pembelian');
}

// ───────────────────── CHAT ─────────────────────────────────────
function toggleChat() {
  chatOpen = !chatOpen;
  document.getElementById('chat-window').classList.toggle('open', chatOpen);
  const fab = document.getElementById('chat-fab');
  if (fab) fab.classList.toggle('chat-fab-active', chatOpen);
  if (chatOpen) {
    document.getElementById('chat-unread-badge').style.display = 'none';
    document.getElementById('chat-input')?.focus();
  }
}
function openChat() {
  chatOpen = true;
  document.getElementById('chat-window').classList.add('open');
  document.getElementById('chat-unread-badge').style.display = 'none';
  const fab = document.getElementById('chat-fab');
  if (fab) fab.classList.add('chat-fab-active');
}

function switchChatTab(tab) {
  activeChatTab = tab;
  document.querySelectorAll('.chat-tab').forEach((t,i)=>t.classList.toggle('active',['messages','contacts','broadcast'][i]===tab));
  document.getElementById('chat-messages').style.display         = tab==='messages'?'flex':'none';
  document.getElementById('chat-contacts-panel').style.display   = tab==='contacts'?'block':'none';
  document.getElementById('chat-broadcast-panel').style.display  = tab==='broadcast'?'block':'none';
  document.getElementById('chat-input-area').style.display       = tab==='messages'?'flex':'none';
}

// ── CHAT NOTIFICATION SOUND ──────────────────────────────────────
let _lastChatCount = 0;
function playChatNotifSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  } catch(e) { /* AudioContext tidak tersedia */ }
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

async function clearChat() {
  if (currentUser?.role !== 'owner' && currentUser?.role !== 'admin') {
    showToast('❌ Hanya Owner/Admin yang bisa hapus semua chat!', 'error'); return;
  }
  if (!confirm('Kosongkan semua pesan live chat? Tindakan ini permanen!')) return;
  try {
    const snap = await window.FS.getDocs(window.FS.col('chat'));
    const batch = window.FS.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    DB.chat = [];
    renderChatMessages();
    showToast('🗑️ Live chat berhasil dikosongkan!');
    addLog('chat', 'Live chat dikosongkan oleh ' + currentUser.name);
  } catch(e) {
    // Fallback offline
    DB.chat = [];
    renderChatMessages();
    showToast('🗑️ Chat dikosongkan (offline)');
  }
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
  // FIX: Sanitasi RFC 4180 — escape koma, kutip, newline agar tidak corrupt di Excel
  const esc = v => {
    if (v === null || v === undefined) return '';
    const s = String(v).replace(/\r?\n/g, ' ');
    return (s.includes(',') || s.includes('"') || s.includes('\n'))
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const maps = {
    barang    : { h:['Kode','Nama','Kategori','Satuan','H.Beli','H.Jual','Stok','Min Stok'], d:DB.barang.map(b=>[b.kode,b.nama,b.kategori,b.satuan,b.hbeli,b.hjual,b.stok,b.minStok]) },
    invoice   : { h:['No Invoice','Tanggal','Mitra','Sales','Total','Status','Jatuh Tempo','Catatan'], d:DB.invoice.map(i=>[i.no,i.tgl,i.mitra,i.salesName,i.total,i.status,i.tempo,i.catatan||'']) },
    mitra     : { h:['Kode','Nama','Tipe','PIC','HP','Kota','Alamat','Piutang'], d:DB.mitra.map(m=>[m.kode,m.nama,m.tipe,m.pic,m.hp,m.kota,m.alamat||'',m.piutang]) },
    stok      : { h:['Kode','Nama','Kategori','Masuk','Keluar','Stok','Min Stok'], d:DB.barang.map(b=>[b.kode,b.nama,b.kategori,b.masuk,b.keluar,b.stok,b.minStok]) },
    pengeluaran:{ h:['Tanggal','Keterangan','Kategori','Jumlah'], d:DB.pengeluaran.map(p=>[p.tgl,p.ket,p.kat,p.jml]) },
    surat_jalan:{ h:['No SJ','No Invoice','Tanggal','Mitra','Sopir','Kendaraan','Status'], d:DB.surat_jalan.map(sj=>[sj.noSJ,sj.noInvoice,sj.tgl,sj.mitra,sj.sopir,sj.kendaraan,sj.status]) },
  };
  const m = maps[type]; if (!m) return;
  const csv = [
    m.h.map(esc).join(','),
    ...m.d.map(row => row.map(esc).join(','))
  ].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM untuk Excel
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `BMS_${type}_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url); // Bersihkan memory
  addLog('export', 'Export CSV: ' + type);
  showToast(`📊 Export ${type} CSV berhasil!`);
}

// ───────────────────── EXPORT EXCEL ──────────────────────────────
function exportExcel(type) {
  if (typeof XLSX === 'undefined') {
    showToast('❌ Library Excel belum siap. Coba lagi.', 'error'); return;
  }
  const maps = {
    barang    : { sheet:'Data Barang',    h:['Kode','Nama','Kategori','Satuan','H.Beli','H.Jual','Stok','Min Stok'], d:DB.barang.map(b=>[b.kode,b.nama,b.kategori,b.satuan,b.hbeli||0,b.hjual||0,b.stok||0,b.minStok||0]) },
    invoice   : { sheet:'Transaksi',      h:['No Invoice','Tanggal','Mitra','Sales','Total','Status','Jatuh Tempo','Catatan'], d:DB.invoice.map(i=>[i.no,i.tgl,i.mitra,i.salesName||'',i.total||0,i.status,i.tempo||'-',i.catatan||'']) },
    mitra     : { sheet:'Mitra Bisnis',   h:['Kode','Nama','Tipe','PIC','HP','Kota','Alamat','Piutang'], d:DB.mitra.map(m=>[m.kode,m.nama,m.tipe,m.pic||'',m.hp||'',m.kota||'',m.alamat||'',m.piutang||0]) },
    stok      : { sheet:'Info Stok',      h:['Kode','Nama','Kategori','Masuk','Keluar','Stok','Min Stok'], d:DB.barang.map(b=>[b.kode,b.nama,b.kategori,b.masuk||0,b.keluar||0,b.stok||0,b.minStok||0]) },
    pengeluaran:{ sheet:'Pengeluaran',    h:['Tanggal','Keterangan','Kategori','Jumlah'], d:DB.pengeluaran.map(p=>[p.tgl,p.ket,p.kat,p.jml||0]) },
    surat_jalan:{ sheet:'Surat Jalan',    h:['No SJ','No Invoice','Tanggal','Mitra','Sopir','Kendaraan','Status'], d:DB.surat_jalan.map(sj=>[sj.noSJ,sj.noInvoice,sj.tgl,sj.mitra,sj.sopir||'',sj.kendaraan||'',sj.status||'']) },
  };
  const m = maps[type]; if (!m) return;
  const wb = XLSX.utils.book_new();
  const wsData = [m.h, ...m.d];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  // Style header row (kolom lebar otomatis)
  const colWidths = m.h.map((hdr, ci) => {
    const maxLen = Math.max(hdr.length, ...m.d.map(row => String(row[ci]||'').length));
    return { wch: Math.min(maxLen + 2, 40) };
  });
  ws['!cols'] = colWidths;
  XLSX.utils.book_append_sheet(wb, ws, m.sheet);
  XLSX.writeFile(wb, `BMS_${type}_${new Date().toISOString().slice(0,10)}.xlsx`);
  addLog('export', 'Export Excel: ' + type);
  showToast(`📊 Export ${type} Excel berhasil!`);
}

// ───────────────────── SEARCH ───────────────────────────────────
function initSearch() {
  const searchMap = [
    { inputId:'search-barang',   tbodyId:'tbody-barang'   },
    { inputId:'search-invoice',  tbodyId:'tbody-invoice'  },
    { inputId:'search-mitra',    tbodyId:'tbody-mitra'    },
    { inputId:'search-stok',     tbodyId:'tbody-stok'     },
  ];
  const keyToPagination = {
    'search-barang':  'barang',
    'search-invoice': 'invoice',
    'search-mitra':   'mitra',
    'search-stok':    null, // stok tidak paginasi
  };
  searchMap.forEach(({ inputId, tbodyId }) => {
    const inp = document.getElementById(inputId);
    if (!inp) return;
    inp.addEventListener('input', e => {
      const q = e.target.value.toLowerCase();
      // Reset pagination ke halaman 1 saat ada pencarian
      const pKey = keyToPagination[inputId];
      if (pKey && pagination[pKey]) {
        pagination[pKey].page = 1;
        // Re-render dengan filter baru
        if (pKey === 'barang')  { renderBarang(); return; }
        if (pKey === 'invoice') { renderInvoice(); return; }
        if (pKey === 'mitra')   { renderMitra(); return; }
      }
      // Fallback: filter DOM langsung (untuk stok)
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
  const keuSafe = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=fmtRp(v); };
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

// ═══════════════════════════════════════════════════════════════
//  #21 OPTIMASI renderAll() — Selective render, bukan full re-render
//  Setiap modul hanya di-render jika halaman tersebut sedang aktif
//  atau data yang berkaitan berubah.
// ═══════════════════════════════════════════════════════════════

// Helper: cek apakah halaman tertentu sedang aktif
function isPageActive(id) {
  const el = document.getElementById('page-' + id);
  return el && el.classList.contains('active');
}

// Render hanya modul yang relevan berdasarkan halaman aktif
function renderAll() {
  // Selalu update: dropdown, running text, badge, notif, data global
  fillDropdowns();
  updateRunningText();
  updateKategoriDropdowns();
  renderStokKritis();
  if (currentUser) applyRoleRestrictions(currentUser.role);
  window.appData = DB;

  // Selective render per halaman aktif
  if (isPageActive('dashboard'))   { buildMainChart(); renderDashboardStats(); }
  if (isPageActive('barang'))      { renderBarang(); }
  if (isPageActive('invoice'))     { renderInvoice(); renderInvoiceStats(); }
  if (isPageActive('stok'))        { renderStok(); }
  if (isPageActive('mitra'))       { renderMitra(); }
  if (isPageActive('keuangan'))    { renderAssets(); renderPengeluaran(); renderPembelian(); }
  if (isPageActive('laporan'))     { buildLaporanChart(); renderDashboardStats(); }
  if (isPageActive('sales_dash'))  { buildSalesDashboard(); }
  if (isPageActive('opname'))      { renderOpname(); }
  if (isPageActive('gudang'))      { renderGudangList(); }
  if (isPageActive('tren_stok'))   { renderTrenStok(); }
  if (isPageActive('surat_jalan')) { renderSuratJalanList(); }
  if (isPageActive('log'))         { renderLog(); }

  // Notif: selalu cek (async, tidak blocking)
  checkStokKritisNotif().then(() => renderNotifications()).catch(() => renderNotifications());
  checkAndPushBrowserNotif();
}

// renderAll penuh — dipanggil sekali saat pertama load data dari Firestore
function renderAllFull() {
  renderBarang(); renderInvoice(); renderStok();
  renderMitra(); renderPengeluaran(); renderPembelian();
  renderStokKritis(); buildMainChart(); fillDropdowns();
  updateRunningText(); renderDashboardStats(); renderInvoiceStats();
  updateKategoriDropdowns(); renderSuratJalanList(); renderGudangList();
  renderTrenStok(); renderLog();
  if (currentUser) applyRoleRestrictions(currentUser.role);
  checkStokKritisNotif().then(() => renderNotifications()).catch(() => renderNotifications());
  checkAndPushBrowserNotif();
  window.appData = DB;
}

// Expose updateInvoiceData untuk modal edit invoice dari index.html scripts
window.updateInvoiceData = async function(invId, updates) {
  try {
    if (invId) await window.FS.updateDoc(window.FS.docRef('invoice', invId), updates);
    const inv = DB.invoice.find(i => i._id === invId);
    if (inv) Object.assign(inv, updates);
    addLog('edit', `Edit invoice ${invId}: ${JSON.stringify(updates)}`);
    renderInvoice();
    showToast('✅ Transaksi berhasil diperbarui');
  } catch(e) {
    showToast('❌ Gagal update: ' + e.message, 'error');
  }
};

// ================================================================
//  BMS v8.0 — FITUR BARU
//  1. Surat Jalan Digital
//  2. Grafik Tren Stok
//  3. Multi-Gudang
// ================================================================

// ───────────────────── SURAT JALAN DIGITAL ──────────────────────

function renderSuratJalanList() {
  const tbody = document.getElementById('tbody-surat-jalan');
  if (!tbody) return;
  const canDelete = currentUser?.role === 'owner' || currentUser?.role === 'admin';
  const isSales   = currentUser?.role === 'sales';
  // Sales hanya lihat SJ miliknya (via invoice yang dia buat)
  let list = DB.surat_jalan;
  if (isSales) {
    const myInvoiceNos = new Set(
      DB.invoice
        .filter(inv => inv.salesUid === currentUser.uid || inv.salesName === currentUser.name)
        .map(inv => inv.no)
    );
    list = list.filter(sj => myInvoiceNos.has(sj.noInvoice));
  }
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-muted)">Belum ada surat jalan. Generate dari menu Transaksi.</td></tr>';
    return;
  }
  tbody.innerHTML = list.map(sj => `
    <tr>
      <td><strong style="color:var(--primary-light)">${sj.noSJ}</strong></td>
      <td>${sj.tgl}</td>
      <td><strong>${sj.mitra}</strong></td>
      <td>${sj.sopir || '-'}</td>
      <td>${sj.kendaraan || '-'}</td>
      <td><span class="badge ${sj.status==='Terkirim'?'badge-green':sj.status==='Dikirim'?'badge-amber':'badge-blue'}">${sj.status||'Draft'}</span></td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-primary btn-icon btn-sm" onclick="printSuratJalan('${sj._id}')" title="Print"><i class="fas fa-print"></i></button>
          <button class="btn btn-success btn-icon btn-sm" onclick="kirimWASuratJalan('${sj._id}')" title="Kirim WhatsApp"><i class="fab fa-whatsapp"></i></button>
          <button class="btn btn-outline btn-icon btn-sm" onclick="updateStatusSJ('${sj._id}')" title="Update Status"><i class="fas fa-check"></i></button>
          ${canDelete ? `<button class="btn btn-danger btn-icon btn-sm" onclick="hapusSuratJalan('${sj._id}')" title="Hapus"><i class="fas fa-trash"></i></button>` : ''}
        </div>
      </td>
    </tr>`).join('');
}

async function generateSuratJalan(invoiceId) {
  const inv = DB.invoice.find(i => i._id === invoiceId || i.no === invoiceId);
  if (!inv) { showToast('Invoice tidak ditemukan!', 'error'); return; }
  const noSJ = 'SJ-' + Date.now().toString().slice(-6);
  const data = {
    noSJ,
    noInvoice  : inv.no,
    tgl        : new Date().toISOString().slice(0,10),
    mitra      : inv.mitra,
    alamatMitra: inv.alamatMitra || '-',
    items      : inv.items || [],
    totalBerat : '-',
    sopir      : '',
    kendaraan  : '',
    catatan    : '',
    status     : 'Draft',
    salesUid   : inv.salesUid || currentUser?.uid || '',
    salesName  : inv.salesName || currentUser?.name || '',
    _ts        : window.FS.ts(),
  };
  try {
    const ref = await window.FS.addDoc(window.FS.col('surat_jalan'), data);
    DB.surat_jalan.unshift({ _id: ref.id, ...data });
    renderSuratJalanList();
    showToast(`✅ Surat Jalan ${noSJ} berhasil dibuat!`, 'success');
    // Buka preview langsung
    openPreviewSuratJalan(ref.id);
  } catch(e) {
    showToast('Gagal simpan: ' + e.message, 'error');
  }
}

function openPreviewSuratJalan(id) {
  window._lastSJId = id; // simpan ID untuk tombol print di modal
  const sj = DB.surat_jalan.find(s => s._id === id);
  if (!sj) return;
  const co = appConfig?.company || {};
  const content = document.getElementById('surat-jalan-preview-content');
  if (!content) return;
  content.innerHTML = `
    <div class="sj-print-area" id="sj-print-${sj._id}">
      <div class="sj-header">
        <div class="sj-company">
          <h2>${co.nama || "CV. Baitul Ma'mur Syafaah"}</h2>
          <p>${co.alamat || ''}</p>
          <p>Telp: ${co.telp || ''} | ${co.email || ''}</p>
        </div>
        <div class="sj-title-box">
          <h1>SURAT JALAN</h1>
          <table class="sj-meta-table">
            <tr><td>No. SJ</td><td>: <strong>${sj.noSJ}</strong></td></tr>
            <tr><td>No. Invoice</td><td>: ${sj.noInvoice}</td></tr>
            <tr><td>Tanggal</td><td>: ${sj.tgl}</td></tr>
          </table>
        </div>
      </div>
      <div class="sj-recipient">
        <strong>Kepada Yth:</strong><br>
        <strong>${sj.mitra}</strong><br>
        ${sj.alamatMitra}
      </div>
      <div class="sj-transport">
        <div class="sj-transport-item"><label>Sopir</label><div class="sj-input-field" contenteditable="true" id="sj-sopir-${sj._id}" onblur="updateSJField('${sj._id}','sopir',this.innerText)">${sj.sopir || 'Klik untuk isi'}</div></div>
        <div class="sj-transport-item"><label>No. Kendaraan</label><div class="sj-input-field" contenteditable="true" id="sj-kend-${sj._id}" onblur="updateSJField('${sj._id}','kendaraan',this.innerText)">${sj.kendaraan || 'Klik untuk isi'}</div></div>
      </div>
      <table class="sj-items-table">
        <thead><tr><th>No</th><th>Nama Barang</th><th>Qty</th><th>Satuan</th><th>Keterangan</th></tr></thead>
        <tbody>
          ${(sj.items||[]).map((it,i) => `<tr><td>${i+1}</td><td>${it.nama}</td><td>${it.qty}</td><td>${it.satuan||''}</td><td></td></tr>`).join('')}
        </tbody>
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

async function updateSJField(id, field, value) {
  const sj = DB.surat_jalan.find(s => s._id === id);
  if (!sj) return;
  sj[field] = value;
  try {
    await window.FS.updateDoc(window.FS.docRef('surat_jalan', id), { [field]: value });
  } catch(e) { console.warn('Update SJ failed:', e); }
}

function printSuratJalan(id) {
  // Ambil data surat jalan langsung dari DB — tidak bergantung pada DOM modal
  const sj = DB.surat_jalan.find(s => s._id === id);
  if (!sj) { showToast('Data surat jalan tidak ditemukan!', 'error'); return; }

  const co = appConfig?.company || {};
  const namaPerusahaan = co.nama  || "CV. Baitul Ma'mur Syafaah";
  const alamat         = co.alamat || '';
  const telp           = co.telp   || '';
  const email          = co.email  || '';

  const itemsRows = (sj.items || []).filter(Boolean).map((it, i) => `
    <tr>
      <td style="text-align:center">${i + 1}</td>
      <td>${it.nama || '-'}</td>
      <td style="text-align:center">${it.qty || 0}</td>
      <td style="text-align:center">${it.satuan || ''}</td>
      <td></td>
    </tr>`).join('') || `<tr><td colspan="5" style="text-align:center;color:#666">Tidak ada item</td></tr>`;

  const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Surat Jalan ${sj.noSJ} — ${namaPerusahaan}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
      color: #111;
      background: white;
      padding: 15mm 18mm;
    }

    /* ── Header ── */
    .sj-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 18px;
      padding-bottom: 14px;
      border-bottom: 2.5px solid #0f2744;
    }
    .sj-company h2 { font-size: 15px; font-weight: 800; margin-bottom: 4px; color: #0f2744; }
    .sj-company p  { font-size: 11px; color: #555; line-height: 1.5; }
    .sj-title-box  { text-align: right; }
    .sj-title-box h1 { font-size: 22px; font-weight: 900; color: #0f2744; margin-bottom: 6px; }
    .sj-meta-table td { font-size: 11px; padding: 2px 4px 2px 0; vertical-align: top; }

    /* ── Penerima ── */
    .sj-recipient {
      background: #f8fafc;
      border-left: 4px solid #0f2744;
      padding: 10px 14px;
      margin-bottom: 14px;
      font-size: 12px;
      border-radius: 0 6px 6px 0;
      line-height: 1.6;
    }

    /* ── Transport ── */
    .sj-transport {
      display: flex;
      gap: 14px;
      margin-bottom: 14px;
    }
    .sj-transport-item { flex: 1; }
    .sj-transport-item label {
      font-size: 10px;
      font-weight: 700;
      color: #555;
      display: block;
      margin-bottom: 3px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .sj-field-value {
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 6px 10px;
      font-size: 12px;
      min-height: 30px;
      background: #fafafa;
    }

    /* ── Tabel Item ── */
    .sj-items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      font-size: 12px;
    }
    .sj-items-table th {
      background: #0f2744;
      color: #fff;
      padding: 7px 10px;
      text-align: left;
      font-weight: 700;
      font-size: 11px;
    }
    .sj-items-table td {
      padding: 7px 10px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: middle;
    }
    .sj-items-table tr:nth-child(even) td { background: #f9fafb; }

    /* ── Catatan ── */
    .sj-catatan { margin-bottom: 18px; }
    .sj-catatan label { font-size: 10px; font-weight: 700; color: #555; display: block; margin-bottom: 3px; text-transform: uppercase; }
    .sj-catatan .sj-field-value { min-height: 38px; }

    /* ── TTD ── */
    .sj-ttd { display: flex; gap: 14px; margin-top: 18px; }
    .sj-ttd-col { flex: 1; text-align: center; }
    .sj-ttd-label { font-size: 11px; font-weight: 700; margin-bottom: 6px; }
    .sj-ttd-space { height: 55px; border-bottom: 1px solid #999; margin: 0 10px; }
    .sj-ttd-name  { font-size: 11px; margin-top: 5px; color: #444; }

    /* ── Print override ── */
    @media print {
      body { padding: 10mm 14mm !important; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
  </style>
</head>
<body>
  <div class="sj-header">
    <div class="sj-company">
      <h2>${namaPerusahaan}</h2>
      <p>${alamat}</p>
      <p>${telp ? 'Telp: ' + telp : ''}${telp && email ? ' &nbsp;|&nbsp; ' : ''}${email || ''}</p>
    </div>
    <div class="sj-title-box">
      <h1>SURAT JALAN</h1>
      <table class="sj-meta-table">
        <tr><td>No. SJ</td><td>:&nbsp;</td><td><strong>${sj.noSJ || '-'}</strong></td></tr>
        <tr><td>No. Invoice</td><td>:&nbsp;</td><td>${sj.noInvoice || '-'}</td></tr>
        <tr><td>Tanggal</td><td>:&nbsp;</td><td>${sj.tgl || '-'}</td></tr>
      </table>
    </div>
  </div>

  <div class="sj-recipient">
    <strong>Kepada Yth:</strong><br>
    <strong>${sj.mitra || '-'}</strong><br>
    ${sj.alamatMitra && sj.alamatMitra !== '-' ? sj.alamatMitra : ''}
  </div>

  <div class="sj-transport">
    <div class="sj-transport-item">
      <label>Sopir / Pengantar</label>
      <div class="sj-field-value">${sj.sopir && sj.sopir !== 'Klik untuk isi' ? sj.sopir : '&nbsp;'}</div>
    </div>
    <div class="sj-transport-item">
      <label>No. Kendaraan</label>
      <div class="sj-field-value">${sj.kendaraan && sj.kendaraan !== 'Klik untuk isi' ? sj.kendaraan : '&nbsp;'}</div>
    </div>
  </div>

  <table class="sj-items-table">
    <thead>
      <tr>
        <th style="width:40px;text-align:center">No</th>
        <th>Nama Barang</th>
        <th style="width:60px;text-align:center">Qty</th>
        <th style="width:70px;text-align:center">Satuan</th>
        <th>Keterangan</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <div class="sj-catatan">
    <label>Catatan</label>
    <div class="sj-field-value">${sj.catatan && sj.catatan !== '-' ? sj.catatan : '&nbsp;'}</div>
  </div>

  <div class="sj-ttd">
    <div class="sj-ttd-col">
      <div class="sj-ttd-label">Disiapkan Oleh,</div>
      <div class="sj-ttd-space"></div>
      <div class="sj-ttd-name">( _________________ )</div>
    </div>
    <div class="sj-ttd-col">
      <div class="sj-ttd-label">Pengantar / Sopir,</div>
      <div class="sj-ttd-space"></div>
      <div class="sj-ttd-name">( ${sj.sopir && sj.sopir !== 'Klik untuk isi' ? sj.sopir : '________________'} )</div>
    </div>
    <div class="sj-ttd-col">
      <div class="sj-ttd-label">Penerima,</div>
      <div class="sj-ttd-space"></div>
      <div class="sj-ttd-name">( _________________ )</div>
    </div>
  </div>

  <script>
    window.onload = function() {
      window.print();
      setTimeout(function() { window.close(); }, 4000);
    };
  <\/script>
</body>
</html>`;

  const printPopup = window.open('', '_blank', 'width=900,height=750,scrollbars=yes,resizable=yes');
  if (!printPopup) {
    showToast('⚠️ Popup diblokir browser! Izinkan popup untuk halaman ini lalu coba lagi.', 'error');
    return;
  }
  printPopup.document.open();
  printPopup.document.write(htmlContent);
  printPopup.document.close();
}

// Dipanggil dari tombol Cetak di dalam modal preview surat jalan
function printSuratJalanFromModal() {
  const id = window._lastSJId;
  if (!id) { showToast('ID surat jalan tidak ditemukan!', 'error'); return; }
  printSuratJalan(id);
}

function kirimWASuratJalan(id) {
  const sj = DB.surat_jalan.find(s => s._id === id);
  if (!sj) return;
  const items = (sj.items||[]).map((it,i) => `${i+1}. ${it.nama} — ${it.qty} ${it.satuan||''}`).join('\n');
  const msg = encodeURIComponent(
    `*SURAT JALAN — ${appConfig?.company?.nama || 'BMS'}*\n` +
    `No: ${sj.noSJ} | Invoice: ${sj.noInvoice}\n` +
    `Tanggal: ${sj.tgl}\n` +
    `Kepada: ${sj.mitra}\n\n` +
    `*Item Pengiriman:*\n${items}\n\n` +
    `Sopir: ${sj.sopir || '-'} | Kendaraan: ${sj.kendaraan || '-'}\n` +
    `Catatan: ${sj.catatan || '-'}`
  );
  window.open(`https://wa.me/?text=${msg}`, '_blank');
}

async function updateStatusSJ(id) {
  const sj = DB.surat_jalan.find(s => s._id === id);
  if (!sj) return;
  const next = sj.status === 'Draft' ? 'Dikirim' : sj.status === 'Dikirim' ? 'Terkirim' : 'Draft';
  sj.status = next;
  try {
    await window.FS.updateDoc(window.FS.docRef('surat_jalan', id), { status: next });
    renderSuratJalanList();
    showToast(`Status diubah ke: ${next}`, 'success');
  } catch(e) { showToast('Gagal update status', 'error'); }
}

async function hapusSuratJalan(id) {
  if (currentUser?.role === 'sales') { showToast('❌ Sales tidak bisa hapus surat jalan!', 'error'); return; }
  if (!confirm('Hapus surat jalan ini?')) return;
  try {
    await window.FS.deleteDoc(window.FS.docRef('surat_jalan', id));
    DB.surat_jalan = DB.surat_jalan.filter(s => s._id !== id);
    renderSuratJalanList();
    showToast('Surat jalan dihapus.', 'success');
  } catch(e) { showToast('Gagal hapus: ' + e.message, 'error'); }
}

// ───────────────────── GRAFIK TREN STOK ────────────────────────

function renderTrenStok() {
  const container = document.getElementById('tren-stok-container');
  if (!container) return;

  // Ambil filter produk
  const filterEl = document.getElementById('tren-stok-filter');
  const selected = filterEl ? filterEl.value : 'all';

  // Hitung tren: perubahan stok per bulan dari riwayat pembelian & invoice
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push({
      key  : `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,
      label: d.toLocaleString('id-ID', { month: 'short', year:'2-digit' })
    });
  }

  const barangList = selected === 'all'
    ? DB.barang.slice(0, 8)
    : DB.barang.filter(b => b._id === selected || b.kode === selected);

  if (!barangList.length) {
    container.innerHTML = '<p style="color:var(--text-muted);padding:20px">Tidak ada data barang.</p>';
    return;
  }

  // Render summary cards dan chart
  const cards = barangList.map(b => {
    // Hitung masuk & keluar per bulan
    const masuks = months.map(m => {
      return DB.pembelian
        .filter(p => p.barang === b.nama && p.tgl?.startsWith(m.key))
        .reduce((s, p) => s + (p.qty || 0), 0);
    });
    const keluars = months.map(m => {
      return DB.invoice.flatMap(inv => (inv.items || []).filter(it => it.nama === b.nama))
        .filter((_, idx) => {
          const inv = DB.invoice[Math.floor(idx / (DB.invoice[0]?.items?.length || 1))];
          return inv?.tgl?.startsWith(m.key);
        }).reduce((s, it) => s + (it.qty || 0), 0);
      // Simplified: count all keluar per month via stok keluar history
    });

    // Gunakan data stok sekarang + tren sederhana dari masuk/keluar
    const stokNow = b.stok || 0;
    const statusColor = stokNow <= (b.minStok || 0) ? 'var(--danger)' : stokNow <= (b.minStok || 0) * 2 ? 'var(--accent)' : 'var(--accent2)';
    const trend = (b.masuk || 0) >= (b.keluar || 0) ? '📈' : '📉';

    return `
      <div class="tren-card">
        <div class="tren-card-header">
          <div>
            <div class="tren-card-title">${b.nama}</div>
            <div class="tren-card-sub">${b.kode} · ${b.kategori}</div>
          </div>
          <span class="tren-trend-badge">${trend}</span>
        </div>
        <div class="tren-stats">
          <div class="tren-stat"><span>Stok Kini</span><strong style="color:${statusColor}">${stokNow} ${b.satuan}</strong></div>
          <div class="tren-stat"><span>Total Masuk</span><strong style="color:var(--accent2)">+${b.masuk||0}</strong></div>
          <div class="tren-stat"><span>Total Keluar</span><strong style="color:var(--danger)">-${b.keluar||0}</strong></div>
          <div class="tren-stat"><span>Min. Stok</span><strong>${b.minStok||0}</strong></div>
        </div>
        <div class="tren-bar-chart">
          ${buildTrenBars(b, months)}
        </div>
        ${stokNow <= (b.minStok||0) ? `<div class="tren-alert">⚠️ Stok kritis — segera reorder ke supplier!</div>` : ''}
        ${b.masuk && b.keluar ? `<div class="tren-reorder">💡 Rata-rata keluar: ~${Math.round((b.keluar||0)/6)}/bulan · Reorder saat stok &lt; ${Math.round((b.minStok||0)*1.5)}</div>` : ''}
      </div>`;
  }).join('');

  container.innerHTML = cards;
}

function buildTrenBars(b, months) {
  // Rekonstruksi tren stok dari invoice dan pembelian per bulan
  const masukPerBulan = months.map(m =>
    DB.pembelian.filter(p => (p.namaBarang === b.nama || p.barang === b.nama) && p.tgl?.startsWith(m.key))
      .reduce((s, p) => s + (p.qty||0), 0)
  );
  // FIX: filter null items dan pastikan perbandingan nama barang aman
  const keluarPerBulan = months.map(m =>
    DB.invoice
      .filter(inv => inv.tgl?.startsWith(m.key))
      .flatMap(inv => (inv.items || []).filter(it => it && it.nama === b.nama))
      .reduce((s, it) => s + (it.qty || 0), 0)
  );
  const maxVal = Math.max(...masukPerBulan, ...keluarPerBulan, 1);

  return `<div class="tren-dual-bars">
    ${months.map((m, i) => `
      <div class="tren-month-col">
        <div class="tren-dual-bar-wrap">
          <div class="tren-bar-masuk" style="height:${Math.max(Math.round((masukPerBulan[i]/maxVal)*60),2)}px" title="+${masukPerBulan[i]} masuk"></div>
          <div class="tren-bar-keluar" style="height:${Math.max(Math.round((keluarPerBulan[i]/maxVal)*60),2)}px" title="-${keluarPerBulan[i]} keluar"></div>
        </div>
        <div class="tren-month-label">${m.label}</div>
      </div>`).join('')}
    </div>
    <div class="tren-legend">
      <span class="tren-leg-masuk">▮ Masuk</span>
      <span class="tren-leg-keluar">▮ Keluar</span>
    </div>`;
}

function filterTrenStok() {
  renderTrenStok();
}

function updateTrenStokDropdown() {
  const sel = document.getElementById('tren-stok-filter');
  if (!sel) return;
  const opts = DB.barang.map(b => `<option value="${b._id}">${b.nama} (${b.kode})</option>`).join('');
  sel.innerHTML = `<option value="all">Semua Produk (Top 8)</option>${opts}`;
}

// ───────────────────── MULTI-GUDANG ────────────────────────────

function renderGudangList() {
  const container = document.getElementById('gudang-list-container');
  if (!container) return;
  if (!DB.gudang.length) {
    container.innerHTML = `
      <div style="text-align:center;padding:40px;color:var(--text-muted)">
        <i class="fas fa-warehouse" style="font-size:40px;margin-bottom:12px;opacity:0.3"></i>
        <p>Belum ada gudang terdaftar.</p>
        <button class="btn btn-primary" onclick="openModal('modal-gudang')"><i class="fas fa-plus"></i> Tambah Gudang Pertama</button>
      </div>`;
    return;
  }
  container.innerHTML = DB.gudang.map(g => {
    // Hitung total stok di gudang ini
    const totalStok = (g.stokItems || []).reduce((s, it) => s + (it.qty||0), 0);
    const totalNilai = (g.stokItems || []).reduce((s, it) => {
      const barang = DB.barang.find(b => b._id === it.barangId || b.nama === it.nama);
      return s + (it.qty||0) * (barang?.hjual||0);
    }, 0);
    return `
      <div class="gudang-card">
        <div class="gudang-card-header">
          <div class="gudang-icon"><i class="fas fa-warehouse"></i></div>
          <div class="gudang-info">
            <h3>${g.nama}</h3>
            <p><i class="fas fa-map-marker-alt"></i> ${g.lokasi||'-'}</p>
            <p><i class="fas fa-user"></i> PIC: ${g.pic||'-'}</p>
          </div>
          <span class="badge ${g.status==='Aktif'?'badge-green':'badge-amber'}">${g.status||'Aktif'}</span>
        </div>
        <div class="gudang-stats">
          <div class="gudang-stat"><span>Total Item</span><strong>${(g.stokItems||[]).length}</strong></div>
          <div class="gudang-stat"><span>Total Unit</span><strong>${totalStok.toLocaleString('id-ID')}</strong></div>
          <div class="gudang-stat"><span>Nilai Stok</span><strong>${fmtRp(totalNilai)}</strong></div>
        </div>
        <div class="gudang-actions">
          <button class="btn btn-outline btn-sm" onclick="lihatStokGudang('${g._id}')"><i class="fas fa-eye"></i> Lihat Stok</button>
          <button class="btn btn-primary btn-sm" onclick="openTransferModal('${g._id}')"><i class="fas fa-exchange-alt"></i> Transfer Stok</button>
          <button class="btn btn-danger btn-icon btn-sm" onclick="hapusGudang('${g._id}')"><i class="fas fa-trash"></i></button>
        </div>
      </div>`;
  }).join('');
}

async function simpanGudang() {
  if (currentUser?.role === 'sales') { showToast('❌ Sales tidak bisa tambah gudang!', 'error'); return; }
  const nama   = document.getElementById('gd-nama')?.value.trim();
  const lokasi = document.getElementById('gd-lokasi')?.value.trim();
  const pic    = document.getElementById('gd-pic')?.value.trim();
  const telp   = document.getElementById('gd-telp')?.value.trim();
  if (!nama) { showToast('Nama gudang wajib diisi!', 'error'); return; }
  const data = { nama, lokasi, pic, telp, status: 'Aktif', stokItems: [], _ts: window.FS.ts() };
  try {
    const ref = await window.FS.addDoc(window.FS.col('gudang'), data);
    DB.gudang.unshift({ _id: ref.id, ...data });
    renderGudangList();
    closeModal('modal-gudang');
    showToast(`✅ Gudang "${nama}" berhasil ditambahkan!`, 'success');
    addLog('Tambah Gudang', `Gudang: ${nama} - ${lokasi}`);
  } catch(e) { showToast('Gagal simpan: ' + e.message, 'error'); }
}

async function hapusGudang(id) {
  if (currentUser?.role === 'sales') { showToast('❌ Sales tidak bisa hapus gudang!', 'error'); return; }
  const g = DB.gudang.find(x => x._id === id);
  if (!confirm(`Hapus gudang "${g?.nama}"? Semua data stok di gudang ini akan hilang.`)) return;
  try {
    await window.FS.deleteDoc(window.FS.docRef('gudang', id));
    DB.gudang = DB.gudang.filter(x => x._id !== id);
    renderGudangList();
    showToast('Gudang dihapus.', 'success');
  } catch(e) { showToast('Gagal hapus: ' + e.message, 'error'); }
}

function lihatStokGudang(id) {
  const g = DB.gudang.find(x => x._id === id);
  if (!g) return;
  const modal = document.getElementById('modal-stok-gudang');
  const title = document.getElementById('stok-gudang-title');
  const body  = document.getElementById('stok-gudang-body');
  if (!modal || !body) return;
  if (title) title.textContent = `📦 Stok Gudang — ${g.nama}`;
  const items = g.stokItems || [];
  body.innerHTML = items.length
    ? `<table style="width:100%">
        <thead><tr><th>Barang</th><th>Qty</th><th>Satuan</th><th>Update Terakhir</th></tr></thead>
        <tbody>${items.map(it => `
          <tr>
            <td><strong>${it.nama}</strong></td>
            <td style="font-weight:800;color:var(--primary-light)">${it.qty}</td>
            <td>${it.satuan||'-'}</td>
            <td style="color:var(--text-muted);font-size:12px">${it.updatedAt||'-'}</td>
          </tr>`).join('')}</tbody>
       </table>`
    : '<p style="color:var(--text-muted);padding:20px;text-align:center">Gudang ini belum memiliki stok terdaftar.</p>';
  openModal('modal-stok-gudang');
}

let _transferFromId = null;
function openTransferModal(fromId) {
  _transferFromId = fromId;
  const from = DB.gudang.find(g => g._id === fromId);
  if (!from) return;
  // Isi dropdown tujuan
  const sel = document.getElementById('tf-tujuan');
  if (sel) {
    sel.innerHTML = DB.gudang
      .filter(g => g._id !== fromId)
      .map(g => `<option value="${g._id}">${g.nama}</option>`).join('') ||
      '<option value="">-- Tidak ada gudang lain --</option>';
  }
  // Isi dropdown barang dari gudang asal
  const selBarang = document.getElementById('tf-barang');
  if (selBarang) {
    const items = from.stokItems || [];
    selBarang.innerHTML = items.length
      ? items.map(it => `<option value="${it.nama}">${it.nama} (stok: ${it.qty})</option>`).join('')
      : '<option value="">-- Belum ada stok --</option>';
  }
  const fromEl = document.getElementById('tf-dari-nama');
  if (fromEl) fromEl.textContent = from.nama;
  openModal('modal-transfer-stok');
}

async function simpanTransferStok() {
  if (currentUser?.role === 'sales') { showToast('❌ Sales tidak bisa transfer stok antar gudang!', 'error'); return; }
  const tujuanId = document.getElementById('tf-tujuan')?.value;
  const namaBarang = document.getElementById('tf-barang')?.value;
  const qty = parseInt(document.getElementById('tf-qty')?.value || '0');
  const catatan = document.getElementById('tf-catatan')?.value.trim();

  if (!tujuanId)    { showToast('Pilih gudang tujuan!', 'error'); return; }
  if (!namaBarang)  { showToast('Pilih barang!', 'error'); return; }
  if (!qty || qty < 1) { showToast('Jumlah harus lebih dari 0!', 'error'); return; }

  const from = DB.gudang.find(g => g._id === _transferFromId);
  const to   = DB.gudang.find(g => g._id === tujuanId);
  if (!from || !to) return;

  const itemFrom = (from.stokItems||[]).find(it => it.nama === namaBarang);
  if (!itemFrom || itemFrom.qty < qty) {
    showToast(`Stok tidak cukup! Tersedia: ${itemFrom?.qty||0}`, 'error'); return;
  }

  // Kurangi dari gudang asal
  itemFrom.qty -= qty;

  // Tambah ke gudang tujuan
  let itemTo = (to.stokItems||[]).find(it => it.nama === namaBarang);
  if (itemTo) {
    itemTo.qty += qty;
  } else {
    to.stokItems = to.stokItems || [];
    to.stokItems.push({ nama: namaBarang, qty, satuan: itemFrom.satuan, updatedAt: new Date().toISOString().slice(0,10) });
  }
  if (itemTo) itemTo.updatedAt = new Date().toISOString().slice(0,10);

  try {
    await Promise.all([
      window.FS.updateDoc(window.FS.docRef('gudang', _transferFromId), { stokItems: from.stokItems }),
      window.FS.updateDoc(window.FS.docRef('gudang', tujuanId), { stokItems: to.stokItems }),
    ]);
    renderGudangList();
    closeModal('modal-transfer-stok');
    showToast(`✅ Transfer ${qty} ${namaBarang} dari ${from.nama} → ${to.nama} berhasil!`, 'success');
    addLog('Transfer Stok', `${qty}x ${namaBarang}: ${from.nama} → ${to.nama}. ${catatan||''}`);
  } catch(e) {
    showToast('Gagal transfer: ' + e.message, 'error');
    // Rollback
    itemFrom.qty += qty;
    if (itemTo) itemTo.qty -= qty;
  }
}

// Tambah stok masuk ke gudang tertentu (via modal stok masuk diperluas)
async function simpanStokMasukGudang(gudangId, barangId, qty) {
  const g = DB.gudang.find(x => x._id === gudangId);
  const b = DB.barang.find(x => x._id === barangId);
  if (!g || !b) return;
  g.stokItems = g.stokItems || [];
  const item = g.stokItems.find(it => it.nama === b.nama);
  if (item) {
    item.qty += qty;
    item.updatedAt = new Date().toISOString().slice(0,10);
  } else {
    g.stokItems.push({ nama: b.nama, qty, satuan: b.satuan, barangId: b._id, updatedAt: new Date().toISOString().slice(0,10) });
  }
  await window.FS.updateDoc(window.FS.docRef('gudang', gudangId), { stokItems: g.stokItems });
}

