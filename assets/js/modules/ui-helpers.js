// ================================================================
//  BMS — ui-helpers.js (ES Module)
//  Helper UI kecil yang tidak masuk kategori render utama
// ================================================================
import { state, DB } from './constants.js';
import { showToast, addLog } from './utils.js';

export function renderSalesDropdown() {
  const list = document.getElementById('sales-user-list');
  if (!list || !state.appConfig) return;
  list.innerHTML = (state.appConfig.salesUsers||[]).map(s =>
    `<div class="sales-user-btn ${state.selectedSalesId===s.id?'active':''}"
      onclick="selectSalesUser('${s.id}','${s.name}','${s.email}')">${s.avatar} ${s.name}</div>`
  ).join('');
}

export function switchGuide(tab) {
  document.querySelectorAll('.guide-panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.guide-tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('guide-'+tab)?.classList.add('active');
  const tabMap=['login','barang','transaksi','stok','keuangan','opname','pengaturan','tips'];
  const tabs  = document.querySelectorAll('.guide-tab');
  const idx   = tabMap.indexOf(tab);
  if (tabs[idx]) tabs[idx].classList.add('active');
}

export function toggleNotif() {
  const panel = document.getElementById('notif-panel');
  panel.classList.toggle('open');
  if (panel.classList.contains('open')) {
    import('./ui-render.js').then(r => r.renderNotifications());
  }
}

export function toggleChat() {
  state.chatOpen = !state.chatOpen;
  document.getElementById('chat-window').classList.toggle('open', state.chatOpen);
  document.getElementById('chat-fab')?.classList.toggle('chat-fab-active', state.chatOpen);
  if (state.chatOpen) {
    document.getElementById('chat-unread-badge').style.display = 'none';
    document.getElementById('chat-input')?.focus();
  }
}

export function switchChatTab(tab) {
  state.activeChatTab = tab;
  document.querySelectorAll('.chat-tab').forEach((t,i)=>t.classList.toggle('active',['messages','contacts','broadcast'][i]===tab));
  document.getElementById('chat-messages').style.display        = tab==='messages'?'flex':'none';
  document.getElementById('chat-contacts-panel').style.display  = tab==='contacts'?'block':'none';
  document.getElementById('chat-broadcast-panel').style.display = tab==='broadcast'?'block':'none';
  document.getElementById('chat-input-area').style.display      = tab==='messages'?'flex':'none';
}

export function resetPage(key) {
  const { pagination } = state;
  import('./constants.js').then(c => { if(c.pagination[key]) c.pagination[key].page=1; });
}

export function toggleTempoField(metode) {
  const row = document.getElementById('tempo-row');
  if (row) row.style.display = metode==='Tempo'?'flex':'none';
}

export function updateDate() {
  const el = document.getElementById('topbar-date');
  if (el) el.textContent = new Date().toLocaleDateString('id-ID',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
}
