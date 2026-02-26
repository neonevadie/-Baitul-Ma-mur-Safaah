# 🏪 BMS — Sistem Manajemen Bisnis
### CV. Baitul Ma'mur Syafaah — Distributor Sembako Nasional

[![Firebase](https://img.shields.io/badge/Database-Firebase%20Firestore-orange?style=flat-square&logo=firebase)](https://firebase.google.com/)
[![Status](https://img.shields.io/badge/Status-Online-success?style=flat-square)]()
[![Version](https://img.shields.io/badge/Versi-11.0-blue?style=flat-square)]()

---

## 📋 Tentang Sistem

**BMS** adalah aplikasi manajemen bisnis berbasis web untuk CV. Baitul Ma'mur Syafaah, membantu mengelola operasional distribusi sembako secara real-time melalui Firebase Firestore.

> ⚠️ **Repositori ini bersifat privat — tidak untuk disebarkan ke publik.**

---

## ✨ Fitur Utama

| Modul | Deskripsi | Owner | Admin | Sales |
|-------|-----------|:-----:|:-----:|:-----:|
| 📊 Dashboard | KPI real-time, grafik performa | ✅ | ✅ | ✅ |
| 📦 Data Barang | CRUD produk & inventaris + edit | ✅ | ✅ | 👁️ |
| 🧾 Transaksi | Buat transaksi + metode bayar + PPN configurable | ✅ | ✅ | ✅ |
| 🏭 Info Stok | Monitor stok masuk/keluar | ✅ | ✅ | 👁️ |
| 🤝 Mitra Bisnis | Data pelanggan & pemasok | ✅ | ✅ | ✅ |
| 💰 Keuangan | Laporan laba-rugi, pengeluaran | ✅ | ✅ | ❌ |
| 📈 Laporan | Analitik & grafik performa | ✅ | ✅ | ❌ |
| 📋 Stock Opname | Audit stok fisik, simpan ke cloud | ✅ | ✅ | ❌ |
| 💬 Live Chat | Chat internal antar tim | ✅ | ✅ | ✅ |
| ⚙️ Pengaturan | Akun, kategori, backup | ✅ | ✅ | ❌ |
| 📋 Log Aktivitas | Rekam jejak semua aktivitas | ✅ | ❌ | ❌ |
| 🏫 Multi-Gudang | Kelola stok per gudang, transfer antar lokasi | ✅ | ✅ | ❌ |
| 🚚 Surat Jalan | Generate dari invoice, print PDF, kirim WhatsApp | ✅ | ✅ | ✅ |
| 📉 Tren Stok | Visualisasi masuk/keluar per produk | ✅ | ✅ | ❌ |
| ❓ Panduan | Tutorial penggunaan sistem | ✅ | ✅ | ✅ |

> 👁️ = hanya lihat (read-only)

---

## 🗂️ Struktur Proyek

```
bms/
├── index.html                    # UI utama (1.941 baris)
├── manifest.json                 # PWA manifest
├── sw.js                         # Service Worker (cache v2 — include semua modul)
├── firestore.rules               # Security Rules v2.1 (13 koleksi, RBAC)
├── assets/
│   ├── css/
│   │   └── style.css             # Styling lengkap + @print + dark mode
│   ├── img/                      # Logo & ikon PWA
│   └── js/
│       ├── firebase.js           # Konfigurasi Firebase SDK ⚠️ JANGAN COMMIT
│       │
│       ├── main.js               # ★ ENTRY POINT — import semua modul ES
│       │                         #   Ganti <script src="app.js"> lama
│       │                         #   Expose semua fn ke window.* untuk bridge
│       │
│       ├── modules/              # ★ ES Modules (Fase 1–5 selesai)
│       │   ├── constants.js      # Fase 2 — State, DB, MENU_CONFIG, fmtRp, terbilang
│       │   ├── theme.js          # Fase 1 — initTheme, applyTheme, updateRunningText
│       │   ├── nav.js            # Fase 3 — buildNav, navigateTo, toggleNavGroup
│       │   ├── auth.js           # Fase 4 — doLogin, doLogout, applySession, RBAC, onAuth
│       │   └── data.js           # Fase 5 — loadAllFromFirestore, listeners, addLog, filters
│       │
│       ├── app.js                # Fase 6-7 (belum dipecah) — Business CRUD + UI Render
│       │                         #   Baca state dari window.BMS (di-set oleh main.js)
│       │                         #   3.104 baris (dipangkas dari 3.883 monolith)
│       │
│       └── js/                   # Stub lama (referensi saja — TIDAK dieksekusi)
│           └── README.md
│
├── .gitignore
└── README.md
```

### Arsitektur ES Modules

```
index.html
  └── <script type="module" src="main.js">
        ├── import modules/theme.js       # Fase 1 ✅
        ├── import modules/constants.js   # Fase 2 ✅
        ├── import modules/nav.js         # Fase 3 ✅
        ├── import modules/auth.js        # Fase 4 ✅  ← onAuth listener terdaftar di sini
        ├── import modules/data.js        # Fase 5 ✅
        └── import app.js                 # Fase 6-7 🔄 (antri)
              ↕ membaca state via window.BMS
```

### Status Refactor

| Fase | Modul | File | Status | Baris |
|------|-------|------|--------|-------|
| 1 | Theme | `modules/theme.js` | ✅ Selesai | 37 |
| 2 | Constants & State | `modules/constants.js` | ✅ Selesai | ~170 |
| 3 | Navigation | `modules/nav.js` | ✅ Selesai | ~115 |
| 4 | Auth & Session | `modules/auth.js` | ✅ Selesai | ~195 |
| 5 | Data & Firestore | `modules/data.js` | ✅ Selesai | ~260 |
| 6 | Business CRUD | `modules/business.js` | 🔄 Antri | — |
| 7 | UI Render | `modules/ui-render.js` | 🔄 Antri | — |

> Ketika fase 6-7 selesai: `app.js` dihapus, `window.*` bridge di `main.js` dilepas.

---

## 🛠️ Teknologi

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Database:** Firebase Firestore (realtime NoSQL)
- **Auth:** Firebase Authentication (Email/Password)
- **Icons:** Font Awesome 6.4 | **Fonts:** Plus Jakarta Sans, Syne

---

## 📱 Fitur Teknis

- ✅ Realtime sync — data sinkron otomatis semua perangkat
- ✅ ES Modules Fase 1-5 — arsitektur modular, siap scale 🆕
- ✅ PPN Configurable — toggle aktif/nonaktif, rate bebas, tersinkron Firestore 🆕
- ✅ Notifikasi persisten — status baca tersimpan ke Firebase
- ✅ Push Notifikasi Browser — stok kritis & invoice jatuh tempo
- ✅ Print Invoice PDF — layout profesional, tanda tangan 3 kolom
- ✅ Ganti Password In-App — re-auth Firebase, auto logout
- ✅ PWA — bisa diinstall di HP, support offline, cache v2
- ✅ Multi-Gudang — kelola stok di banyak lokasi, transfer antar gudang
- ✅ Surat Jalan Digital — generate dari invoice, print PDF, kirim WhatsApp
- ✅ Grafik Tren Stok — visualisasi masuk/keluar per produk 6 bulan
- ✅ Stock Opname — audit fisik, simpan & update stok ke cloud
- ✅ Role-based access — akses sesuai peran pengguna (owner/admin/sales)
- ✅ Export CSV & Excel — barang, invoice, mitra, stok, surat jalan
- ✅ Mobile-friendly — sidebar accordion, responsive layout

---

## 🔒 Keamanan

- Kredensial login **tidak disimpan** di kode maupun repositori ini
- Manajemen akun melalui **Pengaturan → Manajemen Pengguna**
- Gunakan **password kuat & unik** untuk setiap akun
- Hubungi administrator untuk reset akses

---

## 📞 Informasi Perusahaan

**CV. Baitul Ma'mur Syafaah** · Distributor Sembako Nasional  
Ruko Pertokoan Villa Bogor Indah 5, Bogor, Jawa Barat

---

## 🗃️ Koleksi Firestore

| Koleksi | Isi | Akses |
|---------|-----|-------|
| `barang` | Produk & inventaris | Semua role |
| `invoice` | Transaksi penjualan | Semua role |
| `mitra` | Pelanggan & pemasok | Semua role |
| `pengeluaran` | Pengeluaran operasional | Owner/Admin |
| `pembelian` | Pembelian dari pemasok | Owner/Admin |
| `log` | Log aktivitas tim | Owner saja |
| `chat` | Pesan live chat internal | Semua role |
| `notifikasi` | Push notif in-app | Semua role |
| `gudang` | Data multi-gudang | Owner/Admin |
| `surat_jalan` | Surat jalan digital | Semua role |
| `users` | Profil pengguna | Masing-masing uid |
| `test` | appConfig & online status | Owner/Admin (write) |
| `opname` | Hasil stock opname | Owner/Admin |

---

*Sistem internal CV. BMS — v11.0 · 26 Februari 2026 · ES Modules Fase 1-5*
