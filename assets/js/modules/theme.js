// ================================================================
//  BMS — theme.js  (ES Module)
//  Manajemen tema Light/Dark
// ================================================================

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
