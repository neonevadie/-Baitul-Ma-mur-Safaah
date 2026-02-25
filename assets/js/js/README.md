# Folder Modul (Rencana Refactoring)

Folder ini berisi rencana refactoring `assets/js/app.js` (monolith ~3.600 baris)
ke arsitektur ES Modules.

## Status
**BELUM AKTIF** — Semua file di folder ini adalah STUB (kerangka kosong).
Implementasi aktual masih berada di `assets/js/app.js`.

## File Stub (Kerangka — belum diimplementasi)
| File          | Rencana isi                                        |
|---------------|----------------------------------------------------|
| auth.js       | doLogin, doLogout, applySession, selectRole        |
| business.js   | simpanBarang, simpanInvoice, simpanMitra, dll.     |
| constants.js  | DB, MENU_CONFIG, state variables                   |
| data.js       | loadAllFromFirestore, setupRealtimeListeners        |
| nav.js        | buildNav, navigateTo, closeSidebar                 |
| theme.js      | initTheme, applyTheme, toggleTheme                 |
| ui-render.js  | renderBarang, renderInvoice, renderStok, dll.      |

## File Draft (.txt → dihapus)
File `*.txt` yang sebelumnya ada di sini (app.js.txt, dashboard.js.txt,
helpers.js.txt, settings.js.txt) telah dihapus karena berisi kode JS
dengan ekstensi salah yang tidak dieksekusi browser.

## Cara Menyelesaikan Refactoring (jika diperlukan)
1. Pindahkan fungsi dari `app.js` ke file modul yang sesuai
2. Tambahkan `export` pada setiap fungsi di modul
3. Tambahkan `import` di `app.js` atau di entry point baru
4. Update `index.html` agar memuat entry point dengan `type="module"`
