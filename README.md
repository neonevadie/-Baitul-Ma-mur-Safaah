# BMS - Sistem Manajemen CV. Baitul Ma'mur Syafaah

Dikembangkan untuk kebutuhan internal CV. Baitul Ma'mur Syafaah — 2026

### Fitur Utama

- Dashboard ringkasan bisnis real-time (stok kritis, invoice jatuh tempo, running text produk)
- Manajemen Data Barang & Inventaris (tambah, edit, hapus, foto produk)
- Transaksi & Invoice (metode bayar Tunai/Transfer/Tempo, stok otomatis berkurang, tandai lunas)
- Info Stok & Stock Opname (adjustment selisih, generate CSV)
- Mitra Bisnis (Pelanggan/Pemasok, tracking piutang)
- Keuangan (Pengeluaran, Pembelian, Aset, laba rugi sederhana)
- Laporan & Analitik (chart penjualan, margin, perputaran stok)
- Dashboard Sales + Estimasi Bonus
- Live Chat internal tim (real-time, online status)
- Log Aktivitas (khusus owner)
- Pengaturan (profil perusahaan, kategori barang, user sales, theme)
- Notifikasi stok kritis & jatuh tempo
- Export CSV & Backup/Restore JSON

### Struktur Proyek

bms/
├── index.html
├── assets/
│ ├── css/style.css
│ ├── js/
│ │ ├── app.js ← Entry point (import semua modul)
│ │ ├── constants.js ← Konstanta & state global
│ │ ├── theme.js ← Tema & running text
│ │ ├── auth.js ← Autentikasi & session
│ │ ├── nav.js ← Menu sidebar & navigasi
│ │ ├── data.js ← Firestore load & realtime
│ │ ├── ui-render.js ← Semua fungsi render UI
│ │ ├── business.js ← CRUD & logika bisnis
│ │ ├── dashboard.js ← Chart & statistik
│ │ ├── settings.js ← Pengaturan lengkap
│ │ └── helpers.js ← Utilitas (toast, modal, search, dll.)
│ └── img/logo.png
├── .gitignore
└── README.md

### Teknologi

- Frontend: HTML, CSS (dark/light mode), Vanilla JavaScript (ES6+ modules)
- Backend: Firebase Authentication + Firestore (real-time sync)
- Hosting: GitHub Pages (auto-deploy)
- Library: Font Awesome (icons)

### Cara Update & Deploy

1. Edit file di folder `assets/js/` atau `css/`
2. `git add .`
3. `git commit -m "update fitur XYZ"`
4. `git push`
5. Buka https://[username].github.io/[repo-name]/ → live dalam 1–2 menit

### Catatan Penting

- Semua data disimpan di Firestore koleksi `test/*` (ubah ke produksi nanti)
- Pastikan Firebase Rules aman (role-based: owner/admin/sales)
- Untuk developer: gunakan `type="module"` di index.html agar import ES modules berjalan

Dibuat oleh @gostcyber — 2026  
Hubungi Owner via chat internal atau WA untuk bantuan.
