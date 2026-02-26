// ================================================================
//  BMS — main.js  v1.0  (ES Module Entry Point)
//  Fase 1-5 Refactor — CV. Baitul Ma'mur Syafaah · 2026
//
//  Urutan import PENTING — dependency graph:
//    constants  ← (no deps)
//    theme      ← constants
//    nav        ← constants
//    auth       ← constants, nav        (side-effect: onAuth listener)
//    data       ← constants, theme
//    app        ← semua modul di atas   (business, ui-render — fase 6-7)
//
//  Setelah fase 6-7 selesai:
//    - app.js akan terpecah menjadi business.js + ui-render.js
//    - import app.js di sini diganti dengan dua import tersebut
//    - Semua window.* bridge dihapus
// ================================================================

// ── Phase 1 — Theme (no deps, runs first so no FOUC) ─────────────
import { initTheme, updateRunningText } from './modules/theme.js';

// ── Phase 2 — Constants (shared state, DB, helpers) ──────────────
import {
  state, DB, pagination, PAGE_SIZE, invoiceFilter,
  DEFAULT_KATEGORI, fmtRp, terbilang,
  resetPage, goPage, renderPagination,
} from './modules/constants.js';

// ── Phase 3 — Navigation ─────────────────────────────────────────
import {
  buildNav, toggleNavGroup, closeSidebar,
  toggleSidebar, navigateTo, switchGuide,
} from './modules/nav.js';

// ── Phase 4 — Auth (also registers onAuth listener) ──────────────
import {
  loadAppConfig, renderSalesDropdown, selectSalesUser,
  selectRole, doLogin, doLogout,
  buildProfileFromEmail, applySession,
  applyRoleRestrictions, updateOnlineStatus, updateOnlineCount,
} from './modules/auth.js';

// ── Phase 5 — Data (Firestore load + realtime) ────────────────────
import {
  initData, loadAllFromFirestore, setupRealtimeListeners,
  addLog, renderLog, clearLog, updateFBStatus,
  setDefaultDates, fillDropdowns, syncData, updateDate,
  applyInvoiceFilter, resetInvoiceFilter, getFilteredInvoices,
  resetLaporanFilter,
} from './modules/data.js';

// ── Phase 6-7 — Business + UI-Render (still monolith, imported last)
// app.js has been stripped of duplicated phase 1-5 code.
// It reads state/DB from modules via window.BMS_* globals exposed below.
// When phases 6-7 are extracted, this import will be split.
import './app.js';

// ================================================================
//  GLOBAL BRIDGE — expose all module exports on window so that:
//  1. Inline onclick="..." handlers in index.html still work
//  2. app.js (phases 6-7 not yet modularised) can call module fns
//  3. The inline <script> blocks at the bottom of index.html work
//
//  Each bridge entry is annotated with its migration target.
//  Entries are removed as those phases complete.
// ================================================================

Object.assign(window, {
  // ── Phase 1 — Theme ───────────────────────────────────────────
  initTheme,
  updateRunningText,

  // ── Phase 2 — Helpers / pagination ────────────────────────────
  fmtRp,
  terbilang,
  resetPage,
  goPage,
  renderPagination,

  // Expose shared mutable objects so app.js can mutate them
  // (app.js reads window.BMS to access module state)
  BMS: { state, DB, pagination, PAGE_SIZE, invoiceFilter, DEFAULT_KATEGORI },

  // ── Phase 3 — Navigation ──────────────────────────────────────
  buildNav,
  toggleNavGroup,
  closeSidebar,
  toggleSidebar,
  navigateTo,
  switchGuide,

  // ── Phase 4 — Auth ────────────────────────────────────────────
  loadAppConfig,
  renderSalesDropdown,
  selectSalesUser,
  selectRole,
  doLogin,
  doLogout,
  buildProfileFromEmail,
  applySession,
  applyRoleRestrictions,
  updateOnlineStatus,
  updateOnlineCount,

  // ── Phase 5 — Data ────────────────────────────────────────────
  initData,
  loadAllFromFirestore,
  setupRealtimeListeners,
  addLog,
  renderLog,
  clearLog,
  updateFBStatus,
  setDefaultDates,
  fillDropdowns,
  syncData,
  updateDate,
  applyInvoiceFilter,
  resetInvoiceFilter,
  getFilteredInvoices,
  resetLaporanFilter,
});

// ── INIT SEQUENCE ─────────────────────────────────────────────────
// 1. Apply theme immediately (prevents flash of unstyled content)
initTheme();

// 2. Load appConfig once Firebase is ready
//    Firebase SDK is loaded as a module in firebase.js — it sets
//    window.FIREBASE_READY = true when auth + Firestore are ready.
function waitForFirebaseAndInit() {
  if (window.FA && window.FS) {
    loadAppConfig();
  } else {
    setTimeout(waitForFirebaseAndInit, 100);
  }
}
waitForFirebaseAndInit();

console.log('[BMS] main.js loaded — ES Modules Phase 1-5 aktif');
