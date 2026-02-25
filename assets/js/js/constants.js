// ============================================================
// BUG #5 FIX — File ini adalah STUB (kerangka kosong).
// Semua implementasi aktif ada di: assets/js/app.js
// File ini adalah rencana refactoring yang BELUM selesai.
// Jangan import file ini — tidak ada isi yang berfungsi.
// Lihat assets/js/js/README.md untuk detail.
// ============================================================
// constants.js
export const MENU_CONFIG = [ ... ];  // seluruh array MENU_CONFIG

export const MENU_GROUPS = [ ... ];  // seluruh array MENU_GROUPS

export let openGroups = new Set(['g-data']);

export let currentUser  = null;
export let selectedRole = 'owner';
export let selectedSalesId = null;
export let invItems  = [];
export let invCounter = 1000;
export let appConfig = null;
export let onlineUsers = {};

export const DB = { ... };  // seluruh objek DB

export let chatMessages = [];
export let chatOpen = false;
export let activeChatTab = 'messages';

export const DEFAULT_KATEGORI = ['Beras & Tepung', ...];