// ================================================================
//  BMS — main.js  (ES Module Entry Point) v11.0
//  Mengimpor semua modul dan mengekspos fungsi ke window
//  sehingga kompatibel dengan onclick="..." di index.html
//
//  Load order:
//    1. constants.js   — state, DB, config
//    2. firebase.js    — Auth + Firestore + Storage
//    3. theme.js       — initTheme
//    4. auth.js        — initAuthListener → loadAppConfig
//    5. nav, utils, ui-helpers, ui-render, data, business
// ================================================================

import { state, DB, pagination, cursors, invoiceFilter } from './modules/constants.js';
import * as fb from './firebase.js';

// ── Modular imports ─────────────────────────────────────────────
import { initTheme, applyTheme, toggleTheme } from './modules/theme.js';
import { buildNav, navigateTo, closeSidebar, toggleSidebar, toggleNavGroup } from './modules/nav.js';
import {
  loadAppConfig, doLogin, doLogout, initAuthListener,
  buildProfileFromEmail, selectRole, selectSalesUser
} from './modules/auth.js';
import {
  showToast, openModal, closeModal, updateFBStatus,
  addLog, fmtRp, terbilang, isPageActive,
  setDefaultDates, fillDropdowns, updateRunningText,
  getPPNRate, getKategoriList, saveKategoriList,
  tambahKategori, hapusKategori, updateKategoriDropdowns,
  playChatNotifSound, renderNotifPermissionBtn, requestNotifPermission,
  showBrowserNotif, checkAndPushBrowserNotif, initSearch, updateDate
} from './modules/utils.js';
import {
  renderSalesDropdown, switchGuide, toggleNotif,
  toggleChat, switchChatTab
} from './modules/ui-helpers.js';
import {
  renderAll, renderAllFull, renderBarang, renderInvoice, renderStok,
  renderMitra, renderPengeluaran, renderPembelian, renderAssets,
  renderStokKritis, renderLog, buildMainChart, buildLaporanChart,
  renderLaporanPiutang, buildSalesDashboard, renderOpname, renderOpnameStats,
  updateOpnameDiff, renderSettings, renderUsersList, renderKategoriSettings as renderKatSet,
  renderNotifications, renderDashboardStats, renderDistribusiStok,
  renderSuratJalanList, renderTrenStok, filterTrenStok, updateTrenStokDropdown,
  renderGudangList, renderChatMessages, renderContactsList,
  renderPagination, getFilteredInvoices, renderInvoiceStats,
  showInvoicePreview
} from './modules/ui-render.js';
import { loadAllFromFirestore, setupRealtimeListeners, queryInvoiceServerSide, cleanupOldLogs } from './modules/data.js';
import {
  simpanBarang, editBarang, simpanEditBarang, hapusBarang, previewFoto,
  addInvItem, updateItemBarang, updateItemQty, removeInvItem, hitungTotal, toggleTempoField,
  simpanInvoice, tandaiLunas, editInvoice, simpanEditInvoice, hapusTransaksi,
  previewInvoice, printInvoice,
  simpanMitra, hapusMitra,
  simpanStokMasuk, simpanStokKeluar,
  simpanPengeluaran, simpanPembelian,
  simpanOpnameRow, simpanSemuaOpname, generateOpname,
  saveCompanyProfile, tambahUserSales, hapusUserSales, gantiPassword,
  clearCollection, clearInvoice, clearKeuangan, clearDataBarang,
  backupData, restoreData, exportCSV, exportExcel,
  sendMessage, clearChat, sendBroadcast,
  checkStokKritisNotif, bacaNotif, markAllRead,
  generateSuratJalan, openPreviewSuratJalan, updateSJField, updateStatusSJ,
  hapusSuratJalan, printSuratJalanFromModal, kirimWASuratJalan,
  simpanGudang, hapusGudang, lihatStokGudang, openTransferModal,
  simpanTransferStok, simpanStokMasukGudang, syncData
} from './modules/business.js';

// ── Ekspos semua fungsi ke window (kompatibilitas onclick HTML) ──
Object.assign(window, {
  // Theme
  toggleTheme, applyTheme, initTheme,
  // Nav
  buildNav, navigateTo, closeSidebar, toggleSidebar, toggleNavGroup,
  // Auth
  doLogin, doLogout, selectRole, selectSalesUser,
  // Modal / Utils
  openModal, closeModal, showToast, addLog,
  setDefaultDates, fillDropdowns, updateRunningText, fmtRp, terbilang,
  getPPNRate, getKategoriList, saveKategoriList,
  tambahKategori, hapusKategori, updateKategoriDropdowns,
  renderKategoriSettings: renderKatSet,
  // UI Helpers
  renderSalesDropdown, switchGuide, toggleNotif, toggleChat, switchChatTab,
  requestNotifPermission, renderNotifPermissionBtn, checkAndPushBrowserNotif,
  // UI Render
  renderAll, renderAllFull, renderBarang, renderInvoice, renderStok, renderMitra,
  renderPengeluaran, renderPembelian, renderAssets, renderStokKritis,
  renderLog, buildMainChart, buildLaporanChart, renderLaporanPiutang,
  buildSalesDashboard, renderOpname, renderOpnameStats, updateOpnameDiff,
  renderSettings, renderUsersList, renderNotifications, renderDashboardStats,
  renderSuratJalanList, renderTrenStok, filterTrenStok, updateTrenStokDropdown,
  renderGudangList, renderChatMessages, renderContactsList, showInvoicePreview,
  renderPagination, getFilteredInvoices, renderInvoiceStats,
  renderDistribusiStok,
  // Data
  loadAllFromFirestore, setupRealtimeListeners, queryInvoiceServerSide, cleanupOldLogs,
  // Business — Barang
  simpanBarang, editBarang, simpanEditBarang, hapusBarang, previewFoto,
  // Business — Invoice
  addInvItem, updateItemBarang, updateItemQty, removeInvItem, hitungTotal, toggleTempoField,
  simpanInvoice, tandaiLunas, editInvoice, simpanEditInvoice, hapusTransaksi,
  previewInvoice, printInvoice,
  // Business — Mitra
  simpanMitra, hapusMitra,
  // Business — Stok
  simpanStokMasuk, simpanStokKeluar,
  // Business — Keuangan
  simpanPengeluaran, simpanPembelian,
  // Business — Opname
  simpanOpnameRow, simpanSemuaOpname, generateOpname,
  // Business — Settings
  saveCompanyProfile, tambahUserSales, hapusUserSales, gantiPassword,
  // Business — Clear / Backup
  clearCollection, clearInvoice, clearKeuangan, clearDataBarang,
  backupData, restoreData, exportCSV, exportExcel,
  // Business — Chat
  sendMessage, clearChat, sendBroadcast,
  // Business — Notifikasi
  checkStokKritisNotif, bacaNotif, markAllRead,
  // Business — Surat Jalan
  generateSuratJalan, openPreviewSuratJalan, updateSJField, updateStatusSJ,
  hapusSuratJalan, printSuratJalanFromModal, kirimWASuratJalan,
  // Business — Gudang
  simpanGudang, hapusGudang, lihatStokGudang, openTransferModal,
  simpanTransferStok, simpanStokMasukGudang,
  // Misc
  syncData,
  // Pagination
  goPage, resetPage, applyInvoiceFilter, resetInvoiceFilter, resetLaporanFilter,
  applyLaporanFilter,
});

// ── Pagination helpers ───────────────────────────────────────────
function resetPage(key)  { if (pagination[key]) pagination[key].page = 1; }
function goPage(key, dir) {
  if (!pagination[key]) return;
  const maxPage = Math.ceil(pagination[key].total / 25) || 1;
  pagination[key].page = Math.min(Math.max(1, pagination[key].page + dir), maxPage);
  const renders = { barang: renderBarang, invoice: renderInvoice, mitra: renderMitra, log: renderLog };
  renders[key]?.();
}

// ── Invoice filter helpers ───────────────────────────────────────
function applyInvoiceFilter() {
  invoiceFilter.dari   = document.getElementById('filter-inv-dari')?.value    || '';
  invoiceFilter.sampai = document.getElementById('filter-inv-sampai')?.value  || '';
  invoiceFilter.status = document.getElementById('filter-inv-status')?.value  || '';
  invoiceFilter.metode = document.getElementById('filter-inv-metode')?.value  || '';
  resetPage('invoice');
  renderInvoice();
}
function resetInvoiceFilter() {
  ['filter-inv-dari','filter-inv-sampai','filter-inv-status','filter-inv-metode']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  Object.assign(invoiceFilter, { dari:'', sampai:'', status:'', metode:'' });
  resetPage('invoice'); renderInvoice();
}
function resetLaporanFilter() {
  ['filter-lap-dari','filter-lap-sampai'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  buildLaporanChart();
}
function applyLaporanFilter() { buildLaporanChart(); }

// ── Navigation hook ──────────────────────────────────────────────
window._onNavigate = (id) => {
  const renders = {
    dashboard  : () => { buildMainChart(); renderDashboardStats(); },
    barang     : renderBarang,
    invoice    : () => { renderInvoice(); renderInvoiceStats(); },
    stok       : renderStok,
    mitra      : renderMitra,
    keuangan   : () => { renderAssets(); renderPengeluaran(); renderPembelian(); },
    laporan    : () => { buildLaporanChart(); renderDashboardStats(); },
    sales_dash : buildSalesDashboard,
    opname     : renderOpname,
    settings   : () => { renderSettings(); renderUsersList(); renderKatSet(); },
    log        : renderLog,
    gudang     : renderGudangList,
    tren_stok  : renderTrenStok,
    surat_jalan: renderSuratJalanList,
  };
  renders[id]?.();
};

// ── Logout helper for gantiPassword auto-logout ──────────────────
window._doLogout = doLogout;

// ── Modal overlay click handler ──────────────────────────────────
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open'); document.body.style.overflow = '';
  }
  if (!e.target.closest('.notif-panel') && !e.target.closest('.topbar-btn')) {
    document.getElementById('notif-panel')?.classList.remove('open');
  }
});

// ── Bootstrap ────────────────────────────────────────────────────
(async function bootstrap() {
  initTheme();
  updateDate();
  initSearch();
  setDefaultDates();
  await loadAppConfig();
  initAuthListener();

  // Expose updateInvoiceData globally (used by index.html inline scripts)
  window.updateInvoiceData = async (invId, updates) => {
    try {
      if (invId) await fb.updateDoc(fb.docRef('invoice', invId), updates);
      const inv = DB.invoice.find(i => i._id === invId);
      if (inv) Object.assign(inv, updates);
      addLog('edit', `Edit invoice ${invId}: ${JSON.stringify(updates)}`);
      renderInvoice();
      showToast('✅ Transaksi berhasil diperbarui');
    } catch(e) {
      showToast('❌ Gagal update transaksi: ' + e.message, 'error');
    }
  };

  // FIX BUG 2: _initData harus di-assign agar data Firestore diload setelah login
  window._initData = () => {
    loadAllFromFirestore();
    setupRealtimeListeners();
  };

  console.log('✅ BMS v11.0 — ES Modules aktif');
})();
