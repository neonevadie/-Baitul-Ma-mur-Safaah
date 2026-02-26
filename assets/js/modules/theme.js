// ================================================================
//  BMS — modules/theme.js  v1.0
//  Phase 1 — ES Modules Refactor
//  Exports: initTheme, applyTheme, toggleTheme, updateRunningText
//  Dependencies: ./constants.js (DB)
// ================================================================

import { DB } from './constants.js';

// ── THEME ────────────────────────────────────────────────────────
export function initTheme() {
  const saved = localStorage.getItem('bms_theme') || 'light';
  applyTheme(saved);
}

export function applyTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem('bms_theme', theme);
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) btn.innerHTML = theme === 'dark'
    ? '<i class="fas fa-sun"></i>'
    : '<i class="fas fa-moon"></i>';
}

export function toggleTheme() {
  const cur = document.body.dataset.theme || 'light';
  applyTheme(cur === 'dark' ? 'light' : 'dark');
}

// ── RUNNING TEXT ─────────────────────────────────────────────────
// Displays top-5 best-selling products in the ticker banner.
// Reads from DB.barang which is populated by data.js.
export function updateRunningText() {
  const el = document.getElementById('running-text-content');
  if (!el || !DB.barang.length) return;
  const sorted = [...DB.barang].sort((a, b) => (b.keluar || 0) - (a.keluar || 0));
  const items = sorted.slice(0, 5).map(b =>
    `🔥 ${b.nama} — Rp ${(b.hjual || 0).toLocaleString('id-ID')} / ${b.satuan}`
  ).join('   ⬥   ');
  el.textContent = items + '   ⬥   ' + items;
}
