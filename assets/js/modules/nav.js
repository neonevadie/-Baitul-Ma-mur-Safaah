// ================================================================
//  BMS — nav.js  (ES Module)
//  Navigasi sidebar, menu grup, mobile toggle
// ================================================================
import { MENU_CONFIG, MENU_GROUPS, state } from './constants.js';
import { showToast, isPageActive } from './utils.js';

export function buildNav(allowed) {
  const nav = document.getElementById('sidebar-nav');
  nav.innerHTML = '<div class="nav-label">MENU UTAMA</div>';
  MENU_GROUPS.forEach(group => {
    const allowedChildren = group.children
      ? group.children.filter(c => allowed.includes(c.id))
      : (allowed.includes(group.single) ? [group] : []);
    if (!allowedChildren.length) return;

    if (group.single) {
      const el = document.createElement('div');
      el.className = 'nav-item'; el.id = 'nav-' + group.single;
      el.onclick = () => { navigateTo(group.single); if (window.innerWidth <= 768) closeSidebar(); };
      el.innerHTML = `<i class="fas ${group.icon}"></i><span>${group.label}</span>`;
      nav.appendChild(el);
    } else {
      const isOpen = state.openGroups.has(group.id);
      const grpEl  = document.createElement('div');
      grpEl.className = 'nav-group' + (isOpen ? ' open' : '');
      grpEl.id        = 'navgrp-' + group.id;
      const hdr = document.createElement('div');
      hdr.className = 'nav-group-header'; hdr.onclick = () => toggleNavGroup(group.id);
      hdr.innerHTML = `<i class="fas ${group.icon}"></i><span>${group.label}</span><i class="fas fa-chevron-right nav-chevron"></i>`;
      grpEl.appendChild(hdr);
      const body = document.createElement('div');
      body.className = 'nav-group-body';
      allowedChildren.forEach(child => {
        const ci = document.createElement('div');
        ci.className = 'nav-item nav-sub-item'; ci.id = 'nav-' + child.id;
        ci.onclick = () => { navigateTo(child.id); if (window.innerWidth <= 768) closeSidebar(); };
        ci.innerHTML = `<i class="fas ${child.icon}"></i><span>${child.label}</span>`;
        body.appendChild(ci);
      });
      grpEl.appendChild(body); nav.appendChild(grpEl);
    }
  });
}

export function toggleNavGroup(groupId) {
  const el = document.getElementById('navgrp-' + groupId);
  if (!el) return;
  const isOpen = el.classList.contains('open');
  if (isOpen) { el.classList.remove('open'); state.openGroups.delete(groupId); }
  else        { el.classList.add('open');    state.openGroups.add(groupId);    }
}

export function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('mobile-open');
  document.getElementById('sidebar-overlay')?.classList.remove('show');
}

export function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebar-overlay');
  if (!sb) return;
  const isOpen = sb.classList.contains('mobile-open');
  sb.classList.toggle('mobile-open', !isOpen);
  ov?.classList.toggle('show', !isOpen);
}

export function navigateTo(id) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const navEl = document.getElementById('nav-' + id);
  if (navEl) {
    navEl.classList.add('active');
    const grp = navEl.closest('.nav-group');
    if (grp && !grp.classList.contains('open')) {
      grp.classList.add('open'); state.openGroups.add(grp.id.replace('navgrp-',''));
    }
  }
  document.getElementById('page-' + id)?.classList.add('active');
  const cfg = MENU_CONFIG.find(m => m.id === id);
  if (cfg) {
    document.getElementById('page-title').textContent = cfg.label;
    document.getElementById('page-sub').textContent   = cfg.sub;
  }
  // Trigger render per halaman — dipanggil dari main.js via window hooks
  window._onNavigate?.(id);
}
