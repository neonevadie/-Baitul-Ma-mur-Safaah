// ============================================================
// BUG #5 FIX — File ini adalah STUB (kerangka kosong).
// Semua implementasi aktif ada di: assets/js/app.js
// File ini adalah rencana refactoring yang BELUM selesai.
// Jangan import file ini — tidak ada isi yang berfungsi.
// Lihat assets/js/js/README.md untuk detail.
// ============================================================
// auth.js
import { appConfig, currentUser } from './constants.js';  // contoh import

export async function loadAppConfig() { ... }
export function renderSalesDropdown() { ... }
export function selectSalesUser(id, name, email) { ... }
export function selectRole(role) { ... }
export async function doLogin() { ... }
export async function doLogout() { ... }

window.FA.onAuth(async (fbUser) => { ... });  // listener ini tetap di auth.js

export function buildProfileFromEmail(email, uid) { ... }
export function applySession(user) { ... }
export function applyRoleRestrictions(role) { ... }
export function updateOnlineStatus(user) { ... }
export function updateOnlineCount() { ... }