// ================================================================
//  BMS — ui-render.js  (ES Module)
//  Semua fungsi render UI (tidak ada side effect ke Firestore)
// ================================================================
import { DB, state, pagination, PAGE_SIZE, invoiceFilter, laporanFilter, DEFAULT_KATEGORI } from './constants.js';
import { fmtRp, terbilang, isPageActive, getKategoriList, getPPNRate } from './utils.js';

// ── Pagination Render ─────────────────────────────────────────────
export function renderPagination(key, total) {
  pagination[key].total = total;
  const page    = pagination[key].page;
  const maxPage = Math.ceil(total / PAGE_SIZE) || 1;
  const from    = (page - 1) * PAGE_SIZE + 1;
  const to      = Math.min(page * PAGE_SIZE, total);
  const el      = document.getElementById(`pagination-${key}`);
  if (!el) return;
  if (total === 0) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <div class="pagination-wrap">
      <span class="page-info">${from}–${to} dari ${total}</span>
      <div class="page-btns">
        <button class="page-btn" onclick="goPage('${key}',-1)" ${page<=1?'disabled':''}><i class="fas fa-chevron-left"></i></button>
        <span class="page-current">${page} / ${maxPage}</span>
        <button class="page-btn" onclick="goPage('${key}',1)" ${page>=maxPage?'disabled':''}><i class="fas fa-chevron-right"></i></button>
      </div>
    </div>`;
}

// ── Barang ────────────────────────────────────────────────────────
export function renderBarang() {
  const tbody = document.getElementById('tbody-barang');
  if (!tbody) return;
  const badge = document.getElementById('total-barang-badge');
  if (badge) badge.textContent = DB.barang.length + ' Item';
  const canEdit = state.currentUser && ['owner','admin'].includes(state.currentUser.role);
  const total = DB.barang.length;
  const page  = pagination.barang.page;
  const start = (page - 1) * PAGE_SIZE;
  const paged = DB.barang.slice(start, start + PAGE_SIZE);
  tbody.innerHTML = paged.map((b, pi) => {
    const i = start + pi;
    const isUrl   = b.foto?.[0]?.startsWith('http');
    const fotoEl  = b.foto?.length
      ? `<img src="${b.foto[0]}" style="width:44px;height:44px;border-radius:10px;object-fit:cover;border:2px solid var(--border)">`
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
        <button class="btn btn-outline btn-icon btn-sm" onclick="editBarang(${i})" title="Edit"><i class="fas fa-edit"></i></button>
        <button class="btn btn-danger btn-icon btn-sm" onclick="hapusBarang(${i})" title="Hapus"><i class="fas fa-trash"></i></button>
      </div>` : '<span style="color:var(--text-muted)">—</span>'}</td>
    </tr>`;
  }).join('');
  renderPagination('barang', total);
}

// ── Invoice ───────────────────────────────────────────────────────
export function getFilteredInvoices() {
  let list = [...DB.invoice];
  if (state.currentUser?.role === 'sales') {
    list = list.filter(i => i.salesUid === state.currentUser.uid || i.salesName === state.currentUser.name);
  }
  if (invoiceFilter.dari)   list = list.filter(i => i.tgl >= invoiceFilter.dari);
  if (invoiceFilter.sampai) list = list.filter(i => i.tgl <= invoiceFilter.sampai);
  if (invoiceFilter.status) list = list.filter(i => i.status === invoiceFilter.status);
  if (invoiceFilter.metode) list = list.filter(i => i.metodeBayar === invoiceFilter.metode);
  const info = document.getElementById('filter-inv-info');
  const has  = invoiceFilter.dari || invoiceFilter.sampai || invoiceFilter.status || invoiceFilter.metode;
  if (info) info.textContent = has ? `${list.length} transaksi ditemukan` : '';
  return list;
}

export function renderInvoice() {
  const tbody = document.getElementById('tbody-invoice');
  if (!tbody) return;
  const canEdit = state.currentUser && ['owner','admin'].includes(state.currentUser.role);
  const isSales = state.currentUser?.role === 'sales';
  const filtered = getFilteredInvoices();
  const total    = filtered.length;
  const page     = pagination.invoice.page;
  const start    = (page - 1) * PAGE_SIZE;
  const paged    = filtered.slice(start, start + PAGE_SIZE);
  tbody.innerHTML = paged.map(inv => {
    const i = DB.invoice.indexOf(inv);
    const bm = inv.metodeBayar || 'Tempo';
    const bmCls = bm==='Tunai'?'badge-green':bm==='Transfer'?'badge-blue':'badge-amber';
    const stCls = inv.status==='Lunas'?'badge-green':inv.status==='Jatuh Tempo'?'badge-red':'badge-amber';
    return `<tr>
      <td><strong style="color:var(--primary-light)">${inv.no}</strong></td>
      <td>${inv.tgl}</td>
      <td><strong>${inv.mitra}</strong></td>
      <td>${inv.salesName||'-'}</td>
      <td><strong>Rp ${(inv.total||0).toLocaleString('id-ID')}</strong></td>
      <td><span class="badge ${bmCls}">${bm}</span></td>
      <td><span class="badge ${stCls}">${inv.status}</span></td>
      <td>${bm==='Tempo'?inv.tempo:'-'}</td>
      <td><div style="display:flex;gap:6px">
        <button class="btn btn-outline btn-icon btn-sm" onclick="showInvoicePreview(${i})" title="Preview"><i class="fas fa-eye"></i></button>
        ${canEdit?`<button class="btn btn-primary btn-icon btn-sm" onclick="editInvoice(${i})" title="Edit"><i class="fas fa-edit"></i></button>`:''}
        ${(canEdit||(isSales&&inv.salesUid===state.currentUser?.uid))&&inv.status!=='Lunas'?`<button class="btn btn-success btn-icon btn-sm" onclick="tandaiLunas(${i})" title="Lunas"><i class="fas fa-check"></i></button>`:''}
        <button class="btn btn-accent btn-icon btn-sm" onclick="generateSuratJalan('${inv._id}')" title="Surat Jalan"><i class="fas fa-truck"></i></button>
        ${canEdit?`<button class="btn btn-danger btn-icon btn-sm" onclick="hapusTransaksi(${i})" title="Hapus"><i class="fas fa-trash"></i></button>`:''}
      </div></td>
    </tr>`;
  }).join('') || '<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--text-muted)">Belum ada transaksi</td></tr>';
  renderPagination('invoice', total);
  renderInvoiceStats();
}

export function renderInvoiceStats() {
  // Normalisasi: pastikan total selalu Number (data lama Firestore bisa string)
  const getTotal = i => Number(i.total) || 0;
  // Status 'Tempo' adalah alias lama dari 'Belum Lunas' — tangani keduanya
  const isBelumLunas = i => i.status !== 'Lunas';
  const total = DB.invoice.length;
  const lunas = DB.invoice.filter(i=>i.status==='Lunas').reduce((s,i)=>s+getTotal(i),0);
  const belum = DB.invoice.filter(isBelumLunas).reduce((s,i)=>s+getTotal(i),0);
  const cash  = DB.invoice.filter(i=>i.metodeBayar==='Tunai'||i.metodeBayar==='Transfer').reduce((s,i)=>s+getTotal(i),0);
  const safe  = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  safe('trx-total-count', total);
  safe('trx-lunas',  fmtRp(lunas));
  safe('trx-belum',  fmtRp(belum));
  safe('trx-cash',   fmtRp(cash));
}

// ── Stok ──────────────────────────────────────────────────────────
export function renderStok() {
  const tbody = document.getElementById('tbody-stok');
  if (!tbody) return;
  const total = DB.barang.reduce((s,x)=>s+(x.stok||0),0);
  tbody.innerHTML = DB.barang.map((b,i) => {
    const fotoEl = b.foto?.length
      ? `<img src="${b.foto[0]}" style="width:36px;height:36px;border-radius:8px;object-fit:cover">`
      : `<div style="width:36px;height:36px;border-radius:8px;background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:18px">📦</div>`;
    const pct = total > 0 ? Math.round((b.stok/total)*100) : 0;
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
  }).join('');
}

// ── Mitra ─────────────────────────────────────────────────────────
export function renderMitra() {
  const tbody = document.getElementById('tbody-mitra');
  if (!tbody) return;
  const canEdit = state.currentUser && ['owner','admin'].includes(state.currentUser.role);
  const total = DB.mitra.length;
  const page  = pagination.mitra.page;
  const start = (page - 1) * PAGE_SIZE;
  const paged = DB.mitra.slice(start, start + PAGE_SIZE);
  tbody.innerHTML = paged.map((m, pi) => {
    const i = start + pi;
    return `<tr>
      <td><code style="background:var(--bg);padding:2px 8px;border-radius:6px;font-size:12px">${m.kode}</code></td>
      <td><strong>${m.nama}</strong></td>
      <td><span class="badge ${m.tipe==='Pelanggan'?'badge-blue':'badge-green'}">${m.tipe}</span></td>
      <td>${m.pic||'-'}</td><td>${m.hp||'-'}</td><td>${m.kota||'-'}</td>
      <td>${m.piutang>0?`<span class="badge badge-amber">Rp ${m.piutang.toLocaleString('id-ID')}</span>`:'-'}</td>
      <td><span class="badge badge-green">${m.status||'Aktif'}</span></td>
      <td><div style="display:flex;gap:6px">
        <button class="btn btn-outline btn-icon btn-sm" onclick="chatMitra('${m.nama}')" title="Chat"><i class="fas fa-comment"></i></button>
        ${canEdit?`<button class="btn btn-danger btn-icon btn-sm" onclick="hapusMitra(${i})" title="Hapus"><i class="fas fa-trash"></i></button>`:''}
      </div></td>
    </tr>`;
  }).join('');
  renderPagination('mitra', total);
}

// ── Keuangan ──────────────────────────────────────────────────────
export function renderPengeluaran() {
  const tbody = document.getElementById('tbody-pengeluaran');
  if (!tbody) return;
  tbody.innerHTML = DB.pengeluaran.map(p => `
    <tr><td>${p.tgl}</td><td>${p.ket}</td>
    <td><span class="badge badge-purple">${p.kat}</span></td>
    <td style="color:var(--danger);font-weight:700">Rp ${(p.jml||0).toLocaleString('id-ID')}</td></tr>`).join('');
}

export function renderPembelian() {
  const tbody = document.getElementById('tbody-pembelian');
  if (!tbody) return;
  tbody.innerHTML = DB.pembelian.map(p => `
    <tr><td>${p.tgl}</td><td>${p.pemasok}</td><td>${p.barang}</td>
    <td style="font-weight:700">Rp ${(p.total||0).toLocaleString('id-ID')}</td></tr>`).join('');
}

export function renderAssets() {
  const el = document.getElementById('asset-list');
  if (!el) return;
  const totalStok    = DB.barang.reduce((s,b)=>s+(Number(b.hbeli)||0)*(Number(b.stok)||0),0);
  // Piutang dihitung dari invoice belum lunas — source of truth, bukan mitra.piutang field
  // yang mungkin tidak tersinkron dengan data historis
  const totalPiutang = DB.invoice
    .filter(i => i.status !== 'Lunas')
    .reduce((s,i) => s + (Number(i.total)||0), 0);
  const totalBeli    = DB.pembelian.reduce((s,p)=>s+(Number(p.total)||0),0);
  el.innerHTML = `
    <div class="pl-row"><strong>Nilai Stok Barang</strong><span>Rp ${totalStok.toLocaleString('id-ID')}</span></div>
    <div class="pl-row"><strong>Total Piutang (Invoice Belum Lunas)</strong><span style="color:var(--accent)">Rp ${totalPiutang.toLocaleString('id-ID')}</span></div>
    <div class="pl-row"><strong>Total Pembelian</strong><span style="color:var(--danger)">Rp ${totalBeli.toLocaleString('id-ID')}</span></div>
    <div class="pl-row total"><strong>Total Aset Operasional</strong><strong>Rp ${(totalStok+totalPiutang).toLocaleString('id-ID')}</strong></div>`;
}

// ── Stok Kritis ───────────────────────────────────────────────────
export function renderStokKritis() {
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

// ── Log ───────────────────────────────────────────────────────────
export function renderLog() {
  const tbody = document.getElementById('tbody-log');
  if (!tbody) return;
  const icons = { login:'fa-sign-in-alt', tambah:'fa-plus', hapus:'fa-trash', invoice:'fa-file-invoice', stok:'fa-warehouse', chat:'fa-comment', edit:'fa-edit', export:'fa-download', setting:'fa-cog' };
  const total = DB.log.length;
  const page  = pagination.log.page;
  const start = (page - 1) * PAGE_SIZE;
  const paged = DB.log.slice(start, start + PAGE_SIZE);
  tbody.innerHTML = paged.map(l => `
    <tr>
      <td><span class="badge badge-blue"><i class="fas ${icons[l.aksi]||'fa-circle'} me-1"></i>${l.aksi}</span></td>
      <td><strong>${l.user}</strong></td>
      <td><span class="badge ${l.role==='owner'?'badge-purple':l.role==='admin'?'badge-amber':'badge-green'}">${l.role}</span></td>
      <td>${l.detail}</td>
      <td style="color:var(--text-muted);font-size:12px">${new Date(l.waktu).toLocaleString('id-ID')}</td>
    </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted)">📋 Log kosong</td></tr>';
  renderPagination('log', total);
}

// ── Charts ────────────────────────────────────────────────────────
export function buildMainChart() {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    months.push({ key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`, label:d.toLocaleString('id-ID',{month:'short'}) });
  }
  const data = months.map(m => Math.round(DB.invoice.filter(inv=>inv.tgl?.startsWith(m.key)).reduce((s,inv)=>s+(inv.total||0),0)/1000000)||0);
  const max  = Math.max(...data, 1);
  const el   = document.getElementById('main-chart');
  if (!el) return;
  el.innerHTML = data.map((v,i) => `
    <div class="bar-wrap">
      <div class="bar" style="height:${Math.max(Math.round((v/max)*100),4)}%;${v===Math.max(...data)?'background:linear-gradient(180deg,var(--accent),#f97316)':''}">
        <div class="bar-tooltip">Rp ${v} Jt</div></div>
      <div class="bar-label">${months[i].label}</div>
    </div>`).join('');
}

export function buildLaporanChart() {
  const yearSel = document.getElementById('laporan-year-sel');
  if (yearSel) {
    const curY = new Date().getFullYear();
    const years = [...new Set([...(DB.invoice.map(i=>parseInt(i.tgl?.slice(0,4))).filter(Boolean)), curY-1, curY, curY+1])].sort();
    const selY  = yearSel.value ? parseInt(yearSel.value) : curY;
    yearSel.innerHTML = years.map(y=>`<option value="${y}" ${y===selY?'selected':''}>${y}</option>`).join('');
  }
  const lapDari   = document.getElementById('filter-lap-dari')?.value || '';
  const lapSampai = document.getElementById('filter-lap-sampai')?.value || '';
  const hasFilter = lapDari || lapSampai;
  const year   = yearSel ? parseInt(yearSel.value) : new Date().getFullYear();
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
  let pool = DB.invoice;
  if (hasFilter) {
    pool = pool.filter(inv => (!lapDari||inv.tgl>=lapDari) && (!lapSampai||inv.tgl<=lapSampai));
    const el = document.getElementById('filter-lap-info');
    if (el) el.textContent = pool.length + ' transaksi dalam rentang ini';
  } else {
    const el = document.getElementById('filter-lap-info');
    if (el) el.textContent = '';
  }
  const data = months.map((_,mi) => {
    const key = `${year}-${String(mi+1).padStart(2,'0')}`;
    return Math.round(pool.filter(inv=>inv.tgl?.startsWith(key)).reduce((s,i)=>s+(i.total||0),0)/1000000);
  });
  const max = Math.max(...data, 1);
  const el  = document.getElementById('laporan-chart');
  if (!el) return;
  const maxV = Math.max(...data);
  const note = hasFilter ? ' (filter aktif)' : '';
  el.innerHTML = data.map((v,i) => `
    <div class="bar-wrap">
      <div class="bar" style="height:${Math.max(Math.round((v/max)*100),2)}%;${v===maxV?'background:linear-gradient(180deg,var(--accent),#f97316)':''}">
        <div class="bar-tooltip">Rp ${v} Jt</div></div>
      <div class="bar-label">${months[i]}</div>
    </div>`).join('');
  const tot = document.getElementById('laporan-total-year');
  if (tot) tot.textContent = `Total ${year}${note}: Rp ${data.reduce((s,v)=>s+v,0).toLocaleString('id-ID')} Jt`;
  renderLaporanPiutang();
}

export function renderLaporanPiutang() {
  const tbody = document.getElementById('lap-piutang-tbody');
  const totEl = document.getElementById('lap-piutang-total');
  if (!tbody) return;
  const belum = DB.invoice.filter(i => i.status !== 'Lunas');
  const total = belum.reduce((s,i)=>s+(Number(i.total)||0),0);
  if (totEl) totEl.textContent = 'Total Piutang: ' + fmtRp(total);
  if (!belum.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:16px">✅ Semua invoice sudah lunas</td></tr>';
    return;
  }
  const today = new Date().toISOString().slice(0,10);
  tbody.innerHTML = belum.map(inv => {
    const over = inv.tempo && inv.tempo!=='-' && inv.tempo<today;
    return `<tr>
      <td><strong>${inv.no}</strong></td><td>${inv.mitra}</td><td>${inv.tgl}</td>
      <td style="color:${over?'var(--danger)':'inherit'}">${inv.tempo!=='-'?inv.tempo:'-'}${over?' ⚠️':''}</td>
      <td style="color:var(--danger);font-weight:700">${fmtRp(Number(inv.total)||0)}</td>
      <td>${inv.salesName||'-'}</td>
    </tr>`;
  }).join('');
}

// ── Sales Dashboard ───────────────────────────────────────────────
export function buildSalesDashboard() {
  const name  = state.currentUser?.name || '';
  const myInv = state.currentUser?.role === 'sales'
    ? DB.invoice.filter(i => i.salesName===name)
    : DB.invoice;
  const lunas  = myInv.filter(i=>i.status==='Lunas').reduce((s,i)=>s+(i.total||0),0);
  const pending= myInv.filter(i=>i.status!=='Lunas').reduce((s,i)=>s+(i.total||0),0);
  const bonus  = Math.round(lunas*((state.appConfig?.bonusRate||2)/100));
  const el     = document.getElementById('sales-kpi-area');
  if (!el) return;
  el.innerHTML = `
    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
      <div class="stat-card blue"><div class="stat-glow"></div><div class="stat-icon"><i class="fas fa-file-invoice-dollar"></i></div><h3>${myInv.length}</h3><p>Total Invoice</p></div>
      <div class="stat-card green"><div class="stat-glow"></div><div class="stat-icon"><i class="fas fa-check-circle"></i></div><h3>${fmtRp(lunas)}</h3><p>Sudah Lunas</p></div>
      <div class="stat-card amber"><div class="stat-glow"></div><div class="stat-icon"><i class="fas fa-clock"></i></div><h3>${fmtRp(pending)}</h3><p>Belum Lunas</p></div>
      <div class="stat-card red" style="background:linear-gradient(135deg,rgba(16,185,129,0.08),rgba(16,185,129,0.04))"><div class="stat-glow" style="background:var(--accent2)"></div><div class="stat-icon" style="background:rgba(16,185,129,0.12);color:var(--accent2)"><i class="fas fa-gift"></i></div><h3 style="color:var(--accent2)">${fmtRp(bonus)}</h3><p>Bonus (${state.appConfig?.bonusRate||2}%)</p></div>
    </div>`;
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
  const year   = new Date().getFullYear();
  const cd     = months.map((_,mi)=>Math.round(myInv.filter(i=>i.tgl?.startsWith(`${year}-${String(mi+1).padStart(2,'0')}`)).reduce((s,i)=>s+(i.total||0),0)/1000000));
  const max    = Math.max(...cd,1);
  const ce     = document.getElementById('sales-chart');
  if (ce) ce.innerHTML = cd.map((v,i)=>`<div class="bar-wrap"><div class="bar" style="height:${Math.max(Math.round((v/max)*100),2)}%"><div class="bar-tooltip">Rp ${v} Jt</div></div><div class="bar-label">${months[i]}</div></div>`).join('');
  const te = document.getElementById('sales-invoice-table');
  if (te) te.innerHTML = myInv.slice(0,10).map(inv=>`<tr><td><strong style="color:var(--primary-light)">${inv.no}</strong></td><td>${inv.tgl}</td><td>${inv.mitra}</td><td>Rp ${(inv.total||0).toLocaleString('id-ID')}</td><td><span class="badge ${inv.status==='Lunas'?'badge-green':inv.status==='Jatuh Tempo'?'badge-red':'badge-amber'}">${inv.status}</span></td><td>Rp ${Math.round((inv.total||0)*((state.appConfig?.bonusRate||2)/100)).toLocaleString('id-ID')}</td></tr>`).join('') || '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-muted)">Belum ada invoice</td></tr>';
}

// ── Opname ────────────────────────────────────────────────────────
export function renderOpnameStats() {
  const safe = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
  safe('op-total',  DB.barang.length);
  safe('op-aman',   DB.barang.filter(b=>(parseInt(b.stok)||0)>(parseInt(b.minStok)||20)).length);
  safe('op-kritis', DB.barang.filter(b=>{const s=parseInt(b.stok)||0,m=parseInt(b.minStok)||20;return s>0&&s<=m;}).length);
  safe('op-habis',  DB.barang.filter(b=>(parseInt(b.stok)||0)<=0).length);
}

export function renderOpname() {
  const container = document.getElementById('opname-cards');
  if (!container) return;
  const dateEl = document.getElementById('opname-date');
  if (dateEl) dateEl.textContent = 'Tanggal: ' + new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
  if (!DB.barang.length) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)"><i class="fas fa-box-open" style="font-size:40px;margin-bottom:12px;display:block;opacity:0.3"></i>Belum ada data barang</div>';
    renderOpnameStats(); return;
  }
  renderOpnameStats();
  container.innerHTML = DB.barang.map((b,i) => {
    const stok = parseInt(b.stok)||0, min = parseInt(b.minStok)||20;
    const sCls = stok<=0?'badge-red':stok<=min?'badge-amber':'badge-green';
    const sTxt = stok<=0?'⛔ Habis':stok<=min?'⚠️ Kritis':'✅ Aman';
    return `<div class="opname-card" id="op-row-${i}">
      <div class="opname-card-top"><div class="opname-card-info"><code class="op-kode">${b.kode}</code><strong class="op-nama">${b.nama}</strong><span class="op-satuan">${b.satuan}</span></div>
      <div id="op-status-wrap-${i}"><span class="badge ${sCls}">${sTxt}</span></div></div>
      <div class="opname-card-mid"><div class="op-field"><label>Stok Sistem</label><span class="op-sistem" id="op-sistem-${i}">${stok}</span></div>
      <div class="op-arrow"><i class="fas fa-arrow-right"></i></div>
      <div class="op-field"><label>Stok Aktual</label><input type="number" id="op-act-${i}" value="${stok}" min="0" class="op-input" oninput="updateOpnameDiff(${i})"></div>
      <div class="op-field"><label>Selisih</label><span id="op-diff-${i}" class="op-diff">0</span></div></div>
      <div class="opname-card-bot"><input type="text" id="op-note-${i}" placeholder="✏️ Catatan opname..." class="op-note-input">
      <button class="btn btn-success op-save-btn" id="op-save-${i}" onclick="simpanOpnameRow(${i})" style="opacity:0.45"><i class="fas fa-save"></i> Simpan</button></div>
    </div>`;
  }).join('');
}

export function updateOpnameDiff(i) {
  const b = DB.barang[i]; if (!b) return;
  const aktual  = parseInt(document.getElementById(`op-act-${i}`)?.value) ?? 0;
  const selisih = aktual - b.stok;
  const diffEl  = document.getElementById(`op-diff-${i}`);
  if (diffEl) { diffEl.textContent = (selisih>0?'+':'')+selisih; diffEl.style.color = selisih<0?'var(--danger)':selisih>0?'var(--accent2)':'var(--text-muted)'; }
  const sw = document.getElementById(`op-status-wrap-${i}`);
  if (sw) {
    const m = b.minStok||20;
    sw.innerHTML = `<span class="badge ${aktual<=0?'badge-red':aktual<=m?'badge-amber':'badge-green'}">${aktual<=0?'⛔ Habis':aktual<=m?'⚠️ Kritis':'✅ Aman'}</span>`;
  }
  document.getElementById(`op-row-${i}`)?.style.setProperty('background', selisih!==0?'rgba(245,158,11,0.04)':'');
  const btn = document.getElementById(`op-save-${i}`);
  if (btn) { btn.style.opacity = selisih!==0?'1':'0.45'; }
}

// ── Settings ──────────────────────────────────────────────────────
export function renderSettings() {
  const c    = state.appConfig?.company || {};
  const safe = (id,v) => { const el=document.getElementById(id); if(el) el.value=v||''; };
  safe('set-company-nama',  c.nama); safe('set-company-alamat',c.alamat);
  safe('set-company-telp',  c.telp); safe('set-company-email', c.email);
  safe('set-company-npwp',  c.npwp); safe('set-company-rek',   c.rekening);
  safe('set-bonus-rate', state.appConfig?.bonusRate||2);
  safe('set-ppn-rate',   state.appConfig?.ppnRate??11);
  const cbPpn = document.getElementById('set-ppn-aktif');
  if (cbPpn) cbPpn.checked = state.appConfig?.ppnAktif !== false;
  if (state.appConfig?.kategori?.length) localStorage.setItem('bms_kategori', JSON.stringify(state.appConfig.kategori));
  renderKategoriSettings();
  renderUsersList();
}

export function renderUsersList() {
  const el = document.getElementById('settings-users-list');
  if (!el || !state.appConfig) return;
  const sales = state.appConfig.salesUsers || [];
  el.innerHTML = `
    <div class="settings-user-row"><span class="badge badge-purple">Owner</span><strong>Owner BMS</strong><span style="color:var(--text-muted);font-size:12px">${state.appConfig.roleEmails?.owner||'owner@bms-syafaah.id'}</span><span class="badge badge-green">Aktif</span></div>
    <div class="settings-user-row"><span class="badge badge-amber">Admin</span><strong>Admin Keuangan</strong><span style="color:var(--text-muted);font-size:12px">${state.appConfig.roleEmails?.admin||'admin@bms-syafaah.id'}</span><span class="badge badge-green">Aktif</span></div>
    ${sales.map((s,i)=>`<div class="settings-user-row"><span class="badge badge-green">Sales</span><strong>${s.name}</strong><span style="color:var(--text-muted);font-size:12px">${s.email}</span><button class="btn btn-danger btn-sm" onclick="hapusUserSales(${i})"><i class="fas fa-trash"></i></button></div>`).join('')}`;
}

export function renderKategoriSettings() {
  const el   = document.getElementById('settings-kategori-list');
  if (!el) return;
  const list = getKategoriList();
  el.innerHTML = list.map((k,i)=>`
    <div class="settings-user-row" style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--bg);border-radius:10px;margin-bottom:8px">
      <span class="badge badge-blue" style="flex-shrink:0"><i class="fas fa-tag"></i></span>
      <strong style="flex:1;font-size:13.5px">${k}</strong>
      ${DEFAULT_KATEGORI.includes(k)?'<span style="font-size:11px;color:var(--text-muted)">Default</span>':`<button class="btn btn-danger btn-sm" onclick="hapusKategori(${i})" style="padding:4px 10px"><i class="fas fa-trash"></i></button>`}
    </div>`).join('');
}

// ── Notifications ─────────────────────────────────────────────────
export function renderNotifications() {
  const list = document.getElementById('notif-list');
  if (!list) return;
  const unread = DB.notifikasi.filter(n=>!n.baca).length;
  const dot    = document.getElementById('notif-dot');
  if (dot) { dot.style.display=unread>0?'':'none'; dot.textContent=unread>9?'9+':String(unread||''); }
  const cb = document.getElementById('notif-count-badge');
  if (cb)  { cb.style.display=unread>0?'':'none'; cb.textContent=unread>9?'9+':String(unread); }
  const iM = { danger:'fa-exclamation-circle', warning:'fa-clock', success:'fa-check-circle', info:'fa-info-circle' };
  const cM = { danger:'rgba(239,68,68,0.1)', warning:'rgba(245,158,11,0.1)', success:'rgba(16,185,129,0.1)', info:'rgba(37,99,168,0.1)' };
  const fM = { danger:'var(--danger)', warning:'var(--accent)', success:'var(--accent2)', info:'var(--primary-light)' };
  list.innerHTML = !DB.notifikasi.length
    ? '<div style="padding:28px;text-align:center;color:var(--text-muted)">✅ Tidak ada notifikasi</div>'
    : DB.notifikasi.map((n,i)=>`
      <div class="notif-item${n.baca?' notif-read':''}" onclick="bacaNotif(${i})">
        <div class="notif-icon" style="background:${cM[n.tipe]||cM.info};color:${fM[n.tipe]||fM.info}"><i class="fas ${iM[n.tipe]||iM.info}"></i></div>
        <div style="flex:1;min-width:0"><p style="${n.baca?'color:var(--text-muted);font-weight:400':''}">${n.pesan}</p><span>${n.waktu}</span></div>
        ${!n.baca?'<div class="unread-dot" style="flex-shrink:0;margin-top:4px"></div>':'<i class="fas fa-check" style="color:var(--accent2);font-size:11px;margin-top:4px;flex-shrink:0"></i>'}
      </div>`).join('');
}

export function renderNotifPermissionBtn() {
  const el = document.getElementById('notif-permission-btn');
  if (!el) return;
  if (!('Notification' in window)) { el.style.display='none'; return; }
  const granted = Notification.permission === 'granted';
  el.innerHTML = `<i class="fas fa-bell"></i> ${granted?'Notifikasi Browser Aktif':'Aktifkan Notifikasi Browser'}`;
  el.style.opacity = granted ? '0.55' : '1';
  el.style.cursor  = granted ? 'default' : 'pointer';
  el.onclick       = granted ? null : async () => { await window.requestNotifPermission?.(); renderNotifPermissionBtn(); };
}

// ── Dashboard Stats ───────────────────────────────────────────────
export function renderDashboardStats() {
  const safe = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  safe('dash-total-barang',  DB.barang.length);
  safe('dash-barang-aman',   DB.barang.filter(b=>b.stok>b.minStok).length+' aman');
  safe('dash-total-invoice', DB.invoice.length);
  safe('dash-total-mitra',   DB.mitra.length);
  safe('dash-stok-kritis',   DB.barang.filter(b=>b.stok<=b.minStok).length);
  const pendingEl = document.getElementById('invoice-pending-list');
  if (pendingEl) {
    const pending = DB.invoice.filter(i=>i.status!=='Lunas').slice(0,5);
    pendingEl.innerHTML = pending.map(inv=>`
      <div class="act-item">
        <div class="act-dot" style="background:rgba(245,158,11,0.1);color:var(--accent)"><i class="fas fa-file-invoice"></i></div>
        <div class="act-text"><p style="font-weight:700">${inv.mitra}</p><span style="color:var(--danger)">${inv.no} — Rp ${(inv.total||0).toLocaleString('id-ID')}</span></div>
        <span class="badge badge-amber">${inv.status}</span>
      </div>`).join('') || '<div style="padding:16px;text-align:center;color:var(--text-muted)">✅ Semua invoice lunas</div>';
  }
  renderDistribusiStok('distribusi-stok'); renderDistribusiStok('laporan-distribusi');
  const tPng = DB.pengeluaran.reduce((s,p)=>s+(Number(p.jml)||0),0);
  const tBeli= DB.pembelian.reduce((s,p)=>s+(Number(p.total)||0),0);
  const tPend= DB.invoice.filter(i=>i.status==='Lunas').reduce((s,i)=>s+(Number(i.total)||0),0);
  const laba = tPend - tPng - tBeli;
  const ks   = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=fmtRp(v); };
  ks('keu-total-pengeluaran',tPng); ks('keu-total-pembelian',tBeli);
  ks('keu-total-pendapatan',tPend); ks('keu-laba',laba);
  const mk  = DB.barang.reduce((max,b)=>((b.keluar||0)>(max.keluar||0)?b:max),{keluar:0});
  const mc  = {}; DB.invoice.forEach(i=>{ mc[i.mitra]=(mc[i.mitra]||0)+(i.total||0); });
  const bm  = Object.entries(mc).sort((a,b)=>b[1]-a[1])[0];
  const avg = DB.barang.reduce((s,b)=>{ if(!b.hbeli||!b.hjual) return s; return s+((b.hjual-b.hbeli)/b.hbeli*100); },0)/(DB.barang.length||1);
  const tK  = DB.barang.reduce((s,b)=>s+(b.keluar||0),0);
  const tS  = DB.barang.reduce((s,b)=>s+(b.stok||0),0);
  const lap = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  lap('lap-produk-terlaris',mk.nama||'—'); lap('lap-pelanggan-terbaik',bm?bm[0]:'—');
  lap('lap-margin',Math.round(avg)+'%'); lap('lap-perputaran',(tS>0?(tK/tS).toFixed(1):0)+'x');
  const sn = document.getElementById('sales-dash-name');
  if (sn) sn.textContent = state.currentUser?.name||'';
}

export function renderDistribusiStok(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const total = DB.barang.reduce((s,b)=>s+(b.stok||0),0);
  if (!total) { el.innerHTML='<p style="color:var(--text-muted);font-size:13px">Belum ada data stok</p>'; return; }
  const sorted = [...DB.barang].sort((a,b)=>(b.stok||0)-(a.stok||0)).slice(0,8);
  const colors = ['var(--primary-light)','var(--accent)','var(--accent2)','var(--danger)','var(--purple)','var(--cyan)','#f97316','#06b6d4'];
  el.innerHTML = sorted.map((b,i)=>{
    const pct = Math.round(((b.stok||0)/total)*100);
    return `<div class="dist-item"><div class="legend-dot" style="background:${colors[i%colors.length]};width:10px;height:10px;border-radius:50%;flex-shrink:0"></div><span class="dist-name">${b.nama}</span><div class="dist-bar-wrap"><div class="dist-bar" style="width:${pct}%;background:${colors[i%colors.length]}"></div></div><span class="dist-pct">${pct}%</span></div>`;
  }).join('');
}

// ── Surat Jalan ───────────────────────────────────────────────────
export function renderSuratJalanList() {
  const tbody = document.getElementById('tbody-surat-jalan');
  if (!tbody) return;
  const canDel  = ['owner','admin'].includes(state.currentUser?.role);
  const isSales = state.currentUser?.role === 'sales';
  let list = DB.surat_jalan;
  if (isSales) {
    const myNos = new Set(DB.invoice.filter(i=>i.salesUid===state.currentUser.uid||i.salesName===state.currentUser.name).map(i=>i.no));
    list = list.filter(sj=>myNos.has(sj.noInvoice));
  }
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-muted)">Belum ada surat jalan. Generate dari menu Transaksi.</td></tr>';
    return;
  }
  tbody.innerHTML = list.map(sj=>`<tr>
    <td><strong style="color:var(--primary-light)">${sj.noSJ}</strong></td>
    <td>${sj.tgl}</td><td><strong>${sj.mitra}</strong></td><td>${sj.sopir||'-'}</td><td>${sj.kendaraan||'-'}</td>
    <td><span class="badge ${sj.status==='Terkirim'?'badge-green':sj.status==='Dikirim'?'badge-amber':'badge-blue'}">${sj.status||'Draft'}</span></td>
    <td><div style="display:flex;gap:6px">
      <button class="btn btn-primary btn-icon btn-sm" onclick="printSuratJalan('${sj._id}')" title="Print"><i class="fas fa-print"></i></button>
      <button class="btn btn-success btn-icon btn-sm" onclick="kirimWASuratJalan('${sj._id}')" title="WhatsApp"><i class="fab fa-whatsapp"></i></button>
      <button class="btn btn-outline btn-icon btn-sm" onclick="updateStatusSJ('${sj._id}')" title="Update Status"><i class="fas fa-check"></i></button>
      ${canDel?`<button class="btn btn-danger btn-icon btn-sm" onclick="hapusSuratJalan('${sj._id}')" title="Hapus"><i class="fas fa-trash"></i></button>`:''}
    </div></td>
  </tr>`).join('');
}

// ── Tren Stok ─────────────────────────────────────────────────────
export function renderTrenStok() {
  const container = document.getElementById('tren-stok-container');
  if (!container) return;
  const filterEl = document.getElementById('tren-stok-filter');
  const selected = filterEl ? filterEl.value : 'all';
  const months   = [];
  for (let i=5;i>=0;i--) { const d=new Date(); d.setMonth(d.getMonth()-i); months.push({ key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`, label:d.toLocaleString('id-ID',{month:'short',year:'2-digit'}) }); }
  const list = selected==='all' ? DB.barang.slice(0,8) : DB.barang.filter(b=>b._id===selected||b.kode===selected);
  if (!list.length) { container.innerHTML='<p style="color:var(--text-muted);padding:20px">Tidak ada data barang.</p>'; return; }
  container.innerHTML = list.map(b => {
    const stok = b.stok||0;
    const sc   = stok<=(b.minStok||0)?'var(--danger)':stok<=(b.minStok||0)*2?'var(--accent)':'var(--accent2)';
    return `<div class="tren-card">
      <div class="tren-card-header"><div><div class="tren-card-title">${b.nama}</div><div class="tren-card-sub">${b.kode} · ${b.kategori}</div></div><span class="tren-trend-badge">${(b.masuk||0)>=(b.keluar||0)?'📈':'📉'}</span></div>
      <div class="tren-stats"><div class="tren-stat"><span>Stok Kini</span><strong style="color:${sc}">${stok} ${b.satuan}</strong></div><div class="tren-stat"><span>Total Masuk</span><strong style="color:var(--accent2)">+${b.masuk||0}</strong></div><div class="tren-stat"><span>Total Keluar</span><strong style="color:var(--danger)">-${b.keluar||0}</strong></div><div class="tren-stat"><span>Min. Stok</span><strong>${b.minStok||0}</strong></div></div>
      <div class="tren-bar-chart">${buildTrenBars(b, months)}</div>
      ${stok<=(b.minStok||0)?'<div class="tren-alert">⚠️ Stok kritis — segera reorder ke supplier!</div>':''}
    </div>`;
  }).join('');
}

function buildTrenBars(b, months) {
  const masuk  = months.map(m=>DB.pembelian.filter(p=>(p.barang===b.nama||p.namaBarang===b.nama)&&p.tgl?.startsWith(m.key)).reduce((s,p)=>s+(p.qty||0),0));
  const keluar = months.map(m=>DB.invoice.filter(i=>i.tgl?.startsWith(m.key)).flatMap(i=>(i.items||[]).filter(it=>it&&it.nama===b.nama)).reduce((s,it)=>s+(it.qty||0),0));
  const max    = Math.max(...masuk,...keluar,1);
  return `<div class="tren-dual-bars">${months.map((m,i)=>`<div class="tren-month-col"><div class="tren-dual-bar-wrap"><div class="tren-bar-masuk" style="height:${Math.max(Math.round((masuk[i]/max)*60),2)}px" title="+${masuk[i]} masuk"></div><div class="tren-bar-keluar" style="height:${Math.max(Math.round((keluar[i]/max)*60),2)}px" title="-${keluar[i]} keluar"></div></div><div class="tren-month-label">${m.label}</div></div>`).join('')}</div><div class="tren-legend"><span class="tren-leg-masuk">▮ Masuk</span><span class="tren-leg-keluar">▮ Keluar</span></div>`;
}

export function updateTrenStokDropdown() {
  const sel = document.getElementById('tren-stok-filter');
  if (!sel) return;
  sel.innerHTML = `<option value="all">Semua Produk (Top 8)</option>${DB.barang.map(b=>`<option value="${b._id}">${b.nama} (${b.kode})</option>`).join('')}`;
}

// ── Gudang ────────────────────────────────────────────────────────
export function renderGudangList() {
  const container = document.getElementById('gudang-list-container');
  if (!container) return;
  if (!DB.gudang.length) {
    container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)"><i class="fas fa-warehouse" style="font-size:40px;margin-bottom:12px;opacity:0.3"></i><p>Belum ada gudang terdaftar.</p><button class="btn btn-primary" onclick="openModal('modal-gudang')"><i class="fas fa-plus"></i> Tambah Gudang</button></div>`;
    return;
  }
  container.innerHTML = DB.gudang.map(g => {
    const tS = (g.stokItems||[]).reduce((s,it)=>s+(it.qty||0),0);
    const tN = (g.stokItems||[]).reduce((s,it)=>{ const b=DB.barang.find(x=>x._id===it.barangId||x.nama===it.nama); return s+(it.qty||0)*(b?.hjual||0); },0);
    return `<div class="gudang-card">
      <div class="gudang-card-header"><div class="gudang-icon"><i class="fas fa-warehouse"></i></div><div class="gudang-info"><h3>${g.nama}</h3><p><i class="fas fa-map-marker-alt"></i> ${g.lokasi||'-'}</p><p><i class="fas fa-user"></i> PIC: ${g.pic||'-'}</p></div><span class="badge ${g.status==='Aktif'?'badge-green':'badge-amber'}">${g.status||'Aktif'}</span></div>
      <div class="gudang-stats"><div class="gudang-stat"><span>Total Item</span><strong>${(g.stokItems||[]).length}</strong></div><div class="gudang-stat"><span>Total Unit</span><strong>${tS.toLocaleString('id-ID')}</strong></div><div class="gudang-stat"><span>Nilai Stok</span><strong>${fmtRp(tN)}</strong></div></div>
      <div class="gudang-actions"><button class="btn btn-outline btn-sm" onclick="lihatStokGudang('${g._id}')"><i class="fas fa-eye"></i> Lihat Stok</button><button class="btn btn-primary btn-sm" onclick="openTransferModal('${g._id}')"><i class="fas fa-exchange-alt"></i> Transfer Stok</button><button class="btn btn-danger btn-icon btn-sm" onclick="hapusGudang('${g._id}')"><i class="fas fa-trash"></i></button></div>
    </div>`;
  }).join('');
}

// ── Chat ──────────────────────────────────────────────────────────
export function renderChatMessages() {
  const body = document.getElementById('chat-messages');
  if (!body) return;
  const msgs  = DB.chat.length ? DB.chat : state.chatMessages;
  const myUid = window._currentFbUid?.();
  body.innerHTML = msgs.map(m => {
    const mine = m.uid===myUid || m.mine;
    return `<div class="msg ${mine?'mine':'other'}">
      <div class="msg-avatar">${m.avatar||m.sender?.[0]||'?'}</div>
      <div>${!mine?`<div style="font-size:11px;color:var(--text-muted);margin-bottom:3px;font-weight:600">${m.sender}</div>`:''}<div class="msg-bubble">${m.text}</div><span class="msg-time">${m.time||''}</span></div>
    </div>`;
  }).join('');
  body.scrollTop = body.scrollHeight;
}

export function renderContactsList() {
  const panel  = document.getElementById('chat-contacts-panel');
  if (!panel) return;
  const colors = ['#1a3a5c','#f59e0b','#10b981','#7c3aed','#ef4444'];
  const list   = Object.values(state.onlineUsers);
  panel.innerHTML = list.length
    ? list.map((u,i)=>`<div class="chat-contact"><div class="contact-avatar" style="background:${colors[i%colors.length]}">${u.avatar||u.name[0]}</div><div class="contact-info"><div class="contact-name">${u.name}</div><div class="contact-last" style="color:var(--accent2)">🟢 Online</div></div><div class="contact-meta"><div class="contact-time">${u.role}</div></div></div>`).join('')
    : '<div style="padding:20px;text-align:center;color:var(--text-muted)">Tidak ada yang online</div>';
}

// ── renderAll ─────────────────────────────────────────────────────
export function renderAll() {
  import('./utils.js').then(({ fillDropdowns, updateRunningText, updateKategoriDropdowns }) => {
    fillDropdowns(); updateRunningText(); updateKategoriDropdowns();
  });
  renderStokKritis();
  if (isPageActive('dashboard'))   { buildMainChart(); renderDashboardStats(); }
  if (isPageActive('barang'))      renderBarang();
  if (isPageActive('invoice'))     { renderInvoice(); renderInvoiceStats(); }
  if (isPageActive('stok'))        renderStok();
  if (isPageActive('mitra'))       renderMitra();
  if (isPageActive('keuangan'))    { renderAssets(); renderPengeluaran(); renderPembelian(); }
  if (isPageActive('laporan'))     { buildLaporanChart(); renderDashboardStats(); }
  if (isPageActive('sales_dash'))  buildSalesDashboard();
  if (isPageActive('opname'))      renderOpname();
  if (isPageActive('gudang'))      renderGudangList();
  if (isPageActive('tren_stok'))   renderTrenStok();
  if (isPageActive('surat_jalan')) renderSuratJalanList();
  if (isPageActive('log'))         renderLog();
  window._checkNotif?.();
}

export function renderAllFull() {
  renderBarang(); renderInvoice(); renderStok(); renderMitra();
  renderPengeluaran(); renderPembelian(); renderStokKritis();
  buildMainChart(); renderDashboardStats(); renderInvoiceStats();
  renderSuratJalanList(); renderGudangList(); renderTrenStok(); renderLog();
  import('./utils.js').then(({ fillDropdowns, updateRunningText, updateKategoriDropdowns }) => {
    fillDropdowns(); updateRunningText(); updateKategoriDropdowns();
  });
  window._checkNotif?.();
}

// ── Invoice Preview ───────────────────────────────────────────────
export function showInvoicePreview(i) {
  const inv = DB.invoice[i]; if (!inv) return;
  const co  = state.appConfig?.company || {};
  const sub = inv.items ? inv.items.filter(Boolean).reduce((s,it)=>s+(it.total||0),0) : inv.total;
  const dis = inv.diskon||0; const afterD = sub*(1-dis/100);
  const ppr = (inv.ppnAktif===false||inv.ppnRate===0)?0:(inv.ppnRate??state.appConfig?.ppnRate??11);
  const ppn = afterD*(ppr/100);
  const bm  = inv.metodeBayar==='Tunai'?'#16a34a':inv.metodeBayar==='Transfer'?'#2563a8':'#d97706';
  const bs  = inv.status==='Lunas'?'#16a34a':inv.status==='Jatuh Tempo'?'#dc2626':'#d97706';
  const itemsHtml = inv.items
    ? `<table class="invoice-table"><thead><tr><th>No</th><th>Nama Barang</th><th>Satuan</th><th style="text-align:right">Qty</th><th style="text-align:right">Harga</th><th style="text-align:right">Total</th></tr></thead><tbody>${inv.items.filter(Boolean).map((it,j)=>`<tr><td>${j+1}</td><td>${it.nama}</td><td>${it.satuan}</td><td style="text-align:right">${it.qty}</td><td style="text-align:right">Rp ${(it.harga||0).toLocaleString('id-ID')}</td><td style="text-align:right"><strong>Rp ${(it.total||0).toLocaleString('id-ID')}</strong></td></tr>`).join('')}</tbody></table>`
    : '<div style="padding:20px;text-align:center;color:#666;font-style:italic">Detail item tidak tersedia</div>';
  document.getElementById('invoice-preview-content').innerHTML = `
    <div class="invoice-header"><div class="invoice-company"><h2>${co.nama||"CV. Baitul Ma'mur Syafaah"}</h2><p>${co.alamat||''}<br>Telp: ${co.telp||''} | Email: ${co.email||''}<br>NPWP: ${co.npwp||'-'}</p></div>
    <div class="invoice-meta"><h1>INVOICE</h1><p>No: <strong>${inv.no}</strong></p><p>Tanggal: <strong>${inv.tgl}</strong></p><p>Jatuh Tempo: <strong>${inv.metodeBayar==='Tempo'?inv.tempo:'-'}</strong></p><p style="margin-top:6px"><span style="background:${bm};color:#fff;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:700">${inv.metodeBayar||'Tempo'}</span> <span style="background:${bs};color:#fff;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:700">${inv.status}</span></p></div></div>
    <div class="invoice-to"><h4>Kepada Yth.</h4><p><strong>${inv.mitra}</strong></p>${inv.salesName?`<p style="font-size:11px;color:#666;margin-top:2px">Sales: ${inv.salesName}</p>`:''}</div>
    ${itemsHtml}
    <div class="invoice-totals"><table><tr><td>Subtotal</td><td style="text-align:right">Rp ${sub.toLocaleString('id-ID')}</td></tr>${dis>0?`<tr><td>Diskon (${dis}%)</td><td style="text-align:right;color:#dc2626">- Rp ${Math.round(sub*dis/100).toLocaleString('id-ID')}</td></tr>`:''}${ppr>0?`<tr><td>PPN ${ppr}%</td><td style="text-align:right">Rp ${Math.round(ppn).toLocaleString('id-ID')}</td></tr>`:''}<tr class="total-row"><td>TOTAL</td><td style="text-align:right">Rp ${(inv.total||0).toLocaleString('id-ID')}</td></tr></table></div>
    ${inv.catatan?`<div class="invoice-catatan"><strong>Catatan:</strong> ${inv.catatan}</div>`:''}
    <div class="invoice-terbilang" style="border:1px solid #e2e8f0;border-radius:8px;padding:10px 16px;margin:12px 0;background:#f8fafc"><span style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase"># Terbilang:</span><p style="font-size:12.5px;font-style:italic;margin:4px 0 0;color:#1e293b;font-weight:600">${terbilang(inv.total||0)}</p></div>
    <div class="invoice-footer"><p>Pembayaran ke: <strong>${co.rekening||'BCA 123-456-7890'}</strong></p></div>
    <div class="invoice-sign-area"><div class="sign-box"><span class="sign-line"></span><strong>Disiapkan Oleh</strong><p>${inv.salesName||'Sales / Admin'}</p></div><div class="sign-box"><span class="sign-line"></span><strong>Diterima Oleh</strong><p>( Pelanggan )</p></div><div class="sign-box"><span class="sign-line"></span><strong>Mengetahui</strong><p>( Pimpinan )</p></div></div>`;
  import('./utils.js').then(({ openModal }) => openModal('modal-preview-inv'));
}

// ── filterTrenStok alias ──────────────────────────────────────────
// Dipanggil oleh onchange di <select id="tren-stok-filter">
export function filterTrenStok() { renderTrenStok(); }
