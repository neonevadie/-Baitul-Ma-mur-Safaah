// ================================================================
//  BMS — ui-helpers.js
//  Helper functions: notifikasi, chat, guide, sales dropdown
//  FIX: Null safety + sales dropdown dengan dataset
// ================================================================

import { state } from './constants.js';

// ── Render Sales Dropdown ────────────────────────────────────────
export function renderSalesDropdown() {
  const container = document.getElementById('sales-user-list');
  if (!container) {
    console.warn('[UI] sales-user-list not found');
    return;
  }
  
  const salesUsers = state.appConfig?.salesUsers || [];
  if (salesUsers.length === 0) {
    container.innerHTML = '<p style="color:rgba(255,255,255,0.5);font-size:12px;padding:8px">Belum ada akun sales. Tambah di menu Pengaturan.</p>';
    return;
  }
  
  let html = '';
  salesUsers.forEach(user => {
    html += `
      <button class="sales-user-btn ${state.selectedSalesId === user.id ? 'active' : ''}" 
              data-user-id="${user.id}"
              data-user-name="${user.name}"
              data-user-email="${user.email}"
              onclick="selectSalesUser('${user.id}', '${user.name}', '${user.email}')">
        <i class="fas fa-user-tie" style="margin-right:8px"></i>
        ${user.name}
      </button>
    `;
  });
  
  container.innerHTML = html;
}

// ── Notifikasi ───────────────────────────────────────────────────
export function toggleNotif() {
  const panel = document.getElementById('notif-panel');
  if (panel) {
    panel.classList.toggle('open');
  } else {
    console.warn('[UI] notif-panel not found');
  }
}

export function renderNotifPermissionBtn() {
  const btn = document.getElementById('notif-permission-btn');
  if (!btn) return;
  
  if (!('Notification' in window)) {
    btn.style.display = 'none';
    return;
  }
  
  if (Notification.permission === 'granted') {
    btn.style.display = 'none';
  } else {
    btn.style.display = 'inline-flex';
    btn.onclick = () => {
      Notification.requestPermission().then(perm => {
        if (perm === 'granted') btn.style.display = 'none';
      });
    };
  }
}

// ── Chat ─────────────────────────────────────────────────────────
export function toggleChat() {
  const chatWindow = document.getElementById('chat-window');
  if (chatWindow) {
    chatWindow.classList.toggle('open');
  } else {
    console.warn('[UI] chat-window not found');
  }
}

export function switchChatTab(tabName) {
  const messagesPanel = document.getElementById('chat-messages');
  const contactsPanel = document.getElementById('chat-contacts-panel');
  const broadcastPanel = document.getElementById('chat-broadcast-panel');
  const tabs = document.querySelectorAll('.chat-tab');
  
  // Update tab active
  tabs.forEach(tab => {
    const tabText = tab.textContent?.toLowerCase() || '';
    if (tabText.includes(tabName)) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
  
  // Show/hide panels with null check
  if (messagesPanel) {
    messagesPanel.style.display = tabName === 'messages' ? 'flex' : 'none';
  }
  if (contactsPanel) {
    contactsPanel.style.display = tabName === 'contacts' ? 'flex' : 'none';
  }
  if (broadcastPanel) {
    broadcastPanel.style.display = tabName === 'broadcast' ? 'flex' : 'none';
  }
}

// ── Panduan (Guide) ──────────────────────────────────────────────
export function switchGuide(section) {
  // Sembunyikan semua panel
  document.querySelectorAll('.guide-panel').forEach(panel => {
    panel.classList.remove('active');
  });
  
  // Nonaktifkan semua tab
  document.querySelectorAll('.guide-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Aktifkan panel dan tab yang dipilih
  const panel = document.getElementById('guide-' + section);
  if (panel) {
    panel.classList.add('active');
  }
  
  // Cari tab yang sesuai dan aktifkan
  document.querySelectorAll('.guide-tab').forEach(tab => {
    if (tab.textContent?.toLowerCase().includes(section)) {
      tab.classList.add('active');
    }
  });
}

// ── Export semua fungsi ke window ─────────────────────────────────
Object.assign(window, {
  toggleNotif,
  toggleChat,
  switchChatTab,
  switchGuide,
  renderNotifPermissionBtn
});