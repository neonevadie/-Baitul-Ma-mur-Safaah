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