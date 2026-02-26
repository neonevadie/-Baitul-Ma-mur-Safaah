// ================================================================
//  BMS — modules/nav.js  v1.0
//  Phase 3 — ES Modules Refactor
//  Exports: buildNav, toggleNavGroup, closeSidebar, toggleSidebar,
//           navigateTo, switchGuide
//  Dependencies: ./constants.js (MENU_GROUPS, MENU_CONFIG, state)
//
//  CROSS-MODULE BRIDGE NOTE:
//  navigateTo() triggers page-specific renders for functions that
//  live in app.js (phases 6-7 — not yet modularised). These are
//  called via window.* and will be replaced with direct imports
//  once phases 6-7 are complete. Each bridge call is annotated
//  with the target module (e.g. "→ ui-render.js phase 7").
// ================================================================

import { MENU_GROUPS, MENU_CONFIG, state } from './constants.js';

// ── NAV BUILD ────────────────────────────────────────────────────
export function buildNav(allowed) {
  const nav = document.getElementById('sidebar-nav');
  nav.innerHTML = '<div class="nav-label">MENU UTAMA</div>';

  MENU_GROUPS.forEach(group => {
    const allowedChildren = group.children
      ? group.children.filter(c => allowed.includes(c.id))
      : (allowed.includes(group.single) ? [group] : []);
    if (allowedChildren.length === 0) return;

    if (group.single) {
      // Single item — render as plain nav-item
      const el = document.createElement('div');
      el.className = 'nav-item';
      el.id = 'nav-' + group.single;
      el.onclick = () => {
        navigateTo(group.single);
        if (window.innerWidth <= 768) closeSidebar();
      };
      el.innerHTML = `<i class="fas ${group.icon}"></i><span>${group.label}</span>`;
      nav.appendChild(el);
    } else {
      // Group with sub-menu
      const isOpen = state.openGroups.has(group.id);
      const grpEl  = document.createElement('div');
      grpEl.className = 'nav-group' + (isOpen ? ' open' : '');
      grpEl.id = 'navgrp-' + group.id;

      const hdr = document.createElement('div');
      hdr.className = 'nav-group-header';
      hdr.onclick   = () => toggleNavGroup(group.id);
      hdr.innerHTML = `<i class="fas ${group.icon}"></i><span>${group.label}</span><i class="fas fa-chevron-right nav-chevron"></i>`;
      grpEl.appendChild(hdr);

      const body = document.createElement('div');
      body.className = 'nav-group-body';
      allowedChildren.forEach(child => {
        const ci = document.createElement('div');
        ci.className = 'nav-item nav-sub-item';
        ci.id = 'nav-' + child.id;
        ci.onclick = () => {
          navigateTo(child.id);
          if (window.innerWidth <= 768) closeSidebar();
        };
        ci.innerHTML = `<i class="fas ${child.icon}"></i><span>${child.label}</span>`;
        body.appendChild(ci);
      });
      grpEl.appendChild(body);
      nav.appendChild(grpEl);
    }
  });
}

// ── GROUP EXPAND/COLLAPSE ─────────────────────────────────────────
export function toggleNavGroup(groupId) {
  const el = document.getElementById('navgrp-' + groupId);
  if (!el) return;
  const isOpen = el.classList.contains('open');
  if (isOpen) {
    el.classList.remove('open');
    state.openGroups.delete(groupId);
  } else {
    el.classList.add('open');
    state.openGroups.add(groupId);
  }
}

// ── SIDEBAR MOBILE ───────────────────────────────────────────────
export function closeSidebar() {
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('sidebar-overlay').classList.remove('show');
}

export function toggleSidebar() {
  const sb    = document.getElementById('sidebar');
  const ov    = document.getElementById('sidebar-overlay');
  const isOpen = sb.classList.contains('mobile-open');
  if (isOpen) {
    sb.classList.remove('mobile-open');
    ov.classList.remove('show');
  } else {
    sb.classList.add('mobile-open');
    ov.classList.add('show');
  }
}

// ── ROUTING ──────────────────────────────────────────────────────
export function navigateTo(id) {
  // Deactivate all nav items & pages
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  // Activate target nav item
  const navEl = document.getElementById('nav-' + id);
  if (navEl) {
    navEl.classList.add('active');
    // Auto-open parent group
    const grp = navEl.closest('.nav-group');
    if (grp && !grp.classList.contains('open')) {
      grp.classList.add('open');
      state.openGroups.add(grp.id.replace('navgrp-', ''));
    }
  }

  // Activate target page
  const pageEl = document.getElementById('page-' + id);
  if (pageEl) pageEl.classList.add('active');

  // Update topbar title
  const cfg = MENU_CONFIG.find(m => m.id === id);
  if (cfg) {
    document.getElementById('page-title').textContent = cfg.label;
    document.getElementById('page-sub').textContent   = cfg.sub;
  }

  // ── Page-specific render calls ────────────────────────────────
  // Functions not yet in modules are bridged via window.*
  // Each annotation shows the target module after full refactor.

  if (id === 'laporan') {
    window.buildLaporanChart?.();       // → ui-render.js (phase 7)
    window.renderLaporanPiutang?.();    // → ui-render.js (phase 7)
  }
  if (id === 'sales_dash') window.buildSalesDashboard?.();  // → ui-render.js (phase 7)
  if (id === 'settings')   window.renderSettings?.();       // → settings.js  (phase 6)
  if (id === 'opname')     window.renderOpname?.();         // → business.js  (phase 6)
  if (id === 'keuangan')   window.renderAssets?.();         // → ui-render.js (phase 7)
  if (id === 'log')        window.renderLog?.();            // → data.js ✓ (already modularised)
  if (id === 'tren_stok') {
    window.updateTrenStokDropdown?.();  // → ui-render.js (phase 7)
    window.renderTrenStok?.();          // → ui-render.js (phase 7)
  }
  if (id === 'gudang')      window.renderGudangList?.();    // → ui-render.js (phase 7)
  if (id === 'surat_jalan') window.renderSuratJalanList?.();// → ui-render.js (phase 7)
}

// ── PANDUAN (GUIDE) TABS ──────────────────────────────────────────
export function switchGuide(tab) {
  document.querySelectorAll('.guide-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.guide-tab').forEach(t => t.classList.remove('active'));

  const panel = document.getElementById('guide-' + tab);
  if (panel) panel.classList.add('active');

  const tabMap = ['login','barang','transaksi','stok','keuangan','opname','pengaturan','tips'];
  const idx    = tabMap.indexOf(tab);
  const tabs   = document.querySelectorAll('.guide-tab');
  if (tabs[idx]) tabs[idx].classList.add('active');
}
