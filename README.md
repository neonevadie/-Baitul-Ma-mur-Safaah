# 🏪 BMS — Business Management System

### CV. Baitul Ma'mur Syafaah — Distributor Sembako Nasional

[![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%2B%20Auth%20%2B%20Storage-orange?style=flat-square&logo=firebase)](https://firebase.google.com/)
[![ES Modules](https://img.shields.io/badge/Arsitektur-ES%20Modules%20v11.0-blue?style=flat-square&logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
[![PWA](https://img.shields.io/badge/PWA-Installable-purple?style=flat-square&logo=pwa)](https://web.dev/progressive-web-apps/)
[![Status](https://img.shields.io/badge/Status-Production-success?style=flat-square)](https://github.com/neonevadie/-Baitul-Ma-mur-Safaah)
[![Version](https://img.shields.io/badge/Versi-11.0-blue?style=flat-square)]()

> ⚠️ **Repositori ini bersifat privat — tidak untuk disebarkan ke publik.**

---

## 📋 Tentang Sistem

**BMS** adalah aplikasi manajemen bisnis berbasis web yang dikembangkan khusus untuk **CV. Baitul Ma'mur Syafaah** — distributor sembako nasional yang beroperasi di Bogor, Jawa Barat.

Sistem ini dibangun di atas **Firebase (Google)**, menjadikannya solusi cloud-native yang mensinkronkan data secara real-time kepada seluruh pengguna. BMS v11.0 mengadopsi **arsitektur ES Modules penuh** — monolith `app.js` telah sepenuhnya dipecah menjadi **9 modul terpisah** yang terorganisasi dan mudah dipelihara, tanpa satu baris pun dari file monolith tersisa.

### Masalah yang Diselesaikan

- **Stok tidak akurat** — sales dan gudang kini punya satu sumber kebenaran real-time
- **Invoice manual** di Word/Excel — diganti sistem otomatis dengan nomor unik
- **Piutang sulit dipantau** — update otomatis setiap transaksi Tempo dibuat/dilunasi
- **Laporan perlu berjam-jam** — grafik & KPI otomatis tersedia kapan saja
- **Foto produk membengkakkan Firestore** — sekarang disimpan di Firebase Storage (URL)
- **Tidak ada visibilitas real-time** bagi pemilik — dashboard live dengan onSnapshot

---

## ✨ Fitur Utama

| Modul                 | Deskripsi                                                  | Owner | Admin | Sales |
| --------------------- | ---------------------------------------------------------- | :---: | :---: | :---: |
| 📊 Dashboard          | KPI real-time, grafik penjualan 6 bulan, distribusi stok   |  ✅   |  ✅   |  ✅   |
| 🧾 Transaksi          | Invoice multi-item, PPN configurable, cetak PDF, preview   |  ✅   |  ✅   |  ✅   |
| 📦 Data Barang        | CRUD produk, foto ke Firebase Storage, stok otomatis       |  ✅   |  ✅   |  👁️   |
| 🏭 Info Stok          | Monitor stok masuk/keluar, distribusi, stok kritis         |  ✅   |  ✅   |  👁️   |
| 🤝 Mitra Bisnis       | Pelanggan & pemasok, tracking piutang otomatis             |  ✅   |  ✅   |  👁️   |
| 💰 Keuangan           | Pengeluaran, pembelian, laporan aset operasional           |  ✅   |  ✅   |  ❌   |
| 📈 Laporan & Analitik | Grafik 12 bulan, tabel piutang, KPI produk & mitra terbaik |  ✅   |  ✅   |  ❌   |
| 🧑‍💼 Dashboard Sales    | Invoice pribadi, estimasi bonus komisi                     |  ✅   |  ✅   |  ✅   |
| 📋 Stock Opname       | Audit fisik vs sistem, simpan batch, export CSV            |  ✅   |  ✅   |  ❌   |
| 🏫 Multi-Gudang       | CRUD gudang, stok per lokasi, transfer antar gudang        |  ✅   |  ✅   |  👁️   |
| 📉 Tren Stok          | Visualisasi naik/turun stok 6 bulan per produk             |  ✅   |  ✅   |  ❌   |
| 🚚 Surat Jalan        | Generate dari invoice, print A4, kirim WhatsApp            |  ✅   |  ✅   |  ✅   |
| 💬 Live Chat          | Real-time internal, broadcast, kontak online               |  ✅   |  ✅   |  ✅   |
| 🔔 Notifikasi         | Stok kritis, jatuh tempo, push browser                     |  ✅   |  ✅   |  ✅   |
| ⚙️ Pengaturan         | Profil perusahaan, PPN, kategori, akun sales               |  ✅   |  ✅   |  ❌   |
| 📋 Log Aktivitas      | Rekam jejak tim, auto-cleanup log > 90 hari                |  ✅   |  ❌   |  ❌   |
| ❓ Panduan            | Tutorial penggunaan sistem per modul                       |  ✅   |  ✅   |  ✅   |

> 👁️ = read-only &nbsp;|&nbsp; ❌ = tidak ada akses

---

## 🗂️ Struktur Proyek

```
bms/
├── index.html                      # UI utama (~1.941 baris)
├── manifest.json                   # PWA manifest
├── sw.js                           # Service Worker (cache bms-cache-v11, semua modul)
├── firestore.rules                 # Security Rules v2.1 → deploy v2.2 (lihat Keamanan)
│
└── assets/
    ├── css/
    │   └── style.css               # Styling lengkap + dark mode + @print
    ├── img/                        # Logo & ikon PWA
    └── js/
        ├── firebase.js             # Firebase SDK — Auth + Firestore + Storage ⚠️
        ├── main.js                 # ★ ENTRY POINT — import & bootstrap semua modul
        │
        └── modules/                # ★ ES Modules — 9 modul aktif (monolith selesai)
            ├── constants.js        # State, DB, cursors, MENU_CONFIG, pagination
            ├── theme.js            # initTheme, applyTheme, toggleTheme
            ├── nav.js              # buildNav, navigateTo, toggleNavGroup
            ├── auth.js             # doLogin, doLogout, initAuthListener, applySession
            ├── utils.js            # showToast, addLog, fmtRp, terbilang, getPPNRate
            ├── ui-helpers.js       # renderSalesDropdown, toggleChat, switchGuide
            ├── ui-render.js        # renderBarang, renderInvoice, charts, dashboard
            ├── data.js             # loadAllFromFirestore, cursor pagination,
            │                       # server-side filter, realtime listeners, cleanupOldLogs
            └── business.js         # simpanBarang, simpanInvoice, export,
                                    # clearChat, migrasi foto Storage, CRUD semua
```

### Arsitektur ES Modules — Load Order

```
index.html  →  <script type="module" src="assets/js/main.js">
                    │
                    ├── constants.js    (1) state, DB, cursors — zero deps
                    ├── firebase.js     (2) Auth + Firestore + Storage
                    ├── theme.js        (3) initTheme
                    ├── nav.js          (4) buildNav, navigateTo
                    ├── auth.js         (5) initAuthListener → loadAppConfig
                    ├── utils.js        (6) showToast, addLog, helpers
                    ├── ui-helpers.js   (7) renderSalesDropdown, toggleChat
                    ├── ui-render.js    (8) render tables, charts, dashboard
                    ├── data.js         (9) loadAllFromFirestore, realtime, pagination
                    └── business.js    (10) CRUD, export, foto Storage, clearChat
```

### Status Refactor ES Modules — SELESAI PENUH ✅

| #   | Modul           | Isi Utama                                                                   | Status     | Baris |
| --- | --------------- | --------------------------------------------------------------------------- | ---------- | ----- |
| 1   | `theme.js`      | initTheme, applyTheme, toggleTheme                                          | ✅ Selesai | 23    |
| 2   | `constants.js`  | state{}, DB, cursors, MENU_CONFIG, pagination                               | ✅ Selesai | 103   |
| 3   | `nav.js`        | buildNav, navigateTo, toggleNavGroup                                        | ✅ Selesai | 87    |
| 4   | `auth.js`       | doLogin, doLogout, RBAC, onAuth listener                                    | ✅ Selesai | 222   |
| 5   | `data.js`       | loadAllFromFirestore, cursor pagination, server-side filter, cleanupOldLogs | ✅ Selesai | 229   |
| 6   | `utils.js`      | showToast, addLog, fmtRp, terbilang, getPPNRate                             | ✅ Selesai | 326   |
| 7   | `ui-helpers.js` | renderSalesDropdown, toggleChat, switchGuide                                | ✅ Selesai | 67    |
| 8   | `ui-render.js`  | renderBarang, renderInvoice, charts, dashboard                              | ✅ Selesai | 720   |
| 9   | `business.js`   | simpanBarang, simpanInvoice, clearChat, foto Storage, CRUD semua            | ✅ Selesai | 1.312 |

> **`app.js` monolith telah dihapus sepenuhnya.** Tidak ada satu fungsi pun yang tersisa di luar modul.

---

## 🛠️ Teknologi & Fitur Teknis

### Stack Teknologi

| Layer      | Teknologi                      | Fungsi                                        |
| ---------- | ------------------------------ | --------------------------------------------- |
| Database   | Firebase Firestore             | NoSQL cloud, real-time `onSnapshot` listeners |
| Auth       | Firebase Authentication        | Login email/password, multi-role session      |
| Storage    | Firebase Storage               | Foto produk (migrasi dari base64)             |
| Frontend   | HTML5 / CSS3 / Vanilla JS ES6+ | Single-page app tanpa framework eksternal     |
| Arsitektur | ES Modules (9 modul)           | Modular, tree-shakeable, testable             |
| Mobile     | PWA (SW + Manifest)            | Installable, offline cache                    |
| Security   | Firestore Rules v2.1           | Role-based access control per koleksi/field   |
| Export     | SheetJS                        | Export Excel `.xlsx`, CSV                     |

### Firestore Collections (13 Koleksi)

| Koleksi             | Isi                                  | Akses Write                          |
| ------------------- | ------------------------------------ | ------------------------------------ |
| `/users/{uid}`      | Profil pengguna                      | Self atau Owner                      |
| `/test/appConfig`   | Konfigurasi app, profil perusahaan   | Owner/Admin (read: publik)           |
| `/test/online_*`    | Status online tim                    | Self only                            |
| `/invoice/{id}`     | Transaksi penjualan                  | Semua (create), Sales own (update)   |
| `/barang/{id}`      | Produk — `foto[]` berisi Storage URL | Owner/Admin + Sales (stok field)     |
| `/mitra/{id}`       | Pelanggan & pemasok                  | Owner/Admin + Sales (piutang field)  |
| `/pengeluaran/{id}` | Biaya operasional                    | Owner/Admin                          |
| `/pembelian/{id}`   | Pembelian stok                       | Owner/Admin                          |
| `/surat_jalan/{id}` | Surat pengiriman                     | Semua (create), Sales own fields     |
| `/gudang/{id}`      | Data multi-gudang                    | Owner/Admin                          |
| `/opname/{id}`      | Hasil stock opname                   | Owner/Admin                          |
| `/log/{id}`         | Log aktivitas                        | Semua (create), Owner (delete)       |
| `/chat/{id}`        | Pesan live chat                      | Semua (create), Owner/Admin (delete) |
| `/notifikasi/{id}`  | Notifikasi sistem                    | Owner/Admin (create)                 |

### Fitur Teknis Lengkap

- ✅ **ES Modules penuh** — 9 modul, `app.js` monolith dihapus total
- ✅ **Firebase Storage** — foto produk dari base64 → URL CDN, dokumen Firestore ringan
- ✅ **Cursor-based pagination** — `startAfter()` Firestore, load 25 item/halaman
- ✅ **Server-side filter invoice** — `queryInvoiceServerSide()` via Firestore `where()`
- ✅ **Auto-cleanup log** — `cleanupOldLogs()` hapus log > 90 hari, max 1x/30 hari (Owner)
- ✅ **Realtime sync** — data sinkron otomatis semua perangkat via `onSnapshot`
- ✅ **PPN configurable** — toggle aktif/nonaktif, rate bebas, sinkron Firestore
- ✅ **Print Invoice PDF** — layout profesional, terbilang Indonesia, tanda tangan 3 kolom
- ✅ **Surat Jalan Digital** — generate dari invoice, print A4, kirim WhatsApp
- ✅ **Push Notifikasi Browser** — stok kritis & jatuh tempo, muncul saat tab tertutup
- ✅ **Stock Opname** — audit fisik vs sistem, batch update, export CSV
- ✅ **Multi-Gudang** — CRUD gudang, stok per lokasi, transfer antar gudang
- ✅ **Live Chat internal** — real-time, broadcast, kontak online, notifikasi suara
- ✅ **Dashboard Sales** — invoice pribadi, estimasi bonus komisi otomatis
- ✅ **Export Excel (.xlsx)** — barang, invoice, mitra, stok, surat jalan
- ✅ **PWA** — installable di HP, Service Worker cache semua modul ES
- ✅ **Error handling informatif** — setiap catch block tampil `showToast()` dengan pesan actionable
- ✅ **Mobile-friendly** — sidebar accordion, layout responsif, optimasi sentuh

---

## 🔒 Keamanan

### Firestore Security Rules v2.1

Rules saat ini **v2.1** — mencakup 13 koleksi dengan RBAC tiga level (owner/admin/sales).

> ⚠️ **Upgrade ke v2.2 direkomendasikan** — Rules v2.1 menggunakan `getUserRole()` yang membutuhkan `request.auth` untuk membaca `/test/appConfig`. Ini menyebabkan daftar Sales tidak muncul di halaman login karena `loadAppConfig()` dipanggil sebelum login (error: _Missing or insufficient permissions_).
>
> **Fix v2.2:** `/test/appConfig` diberi `allow read` tanpa syarat auth. Aman karena appConfig hanya berisi nama sales, profil perusahaan, dan konfigurasi tampilan — bukan data transaksi.

```

### Best Practices
- Kredensial Firebase tidak disimpan di repositori — hanya di `firebase.js` yang di-gitignore
- Manajemen akun melalui **Pengaturan → Manajemen Pengguna** (Owner only)
- Gunakan password kuat & unik untuk setiap akun
- Authorized Domain: hapus `localhost` dari Firebase Console → Authentication → Settings setelah go-live
- Aktifkan **Firebase App Check** (reCAPTCHA v3) untuk proteksi berlapis

---

## 📞 Informasi Perusahaan

**CV. Baitul Ma'mur Syafaah** · Distributor Sembako Nasional
Ruko Pertokoan Villa Bogor Indah 5, Bogor, Jawa Barat

- 🌐 GitHub: [github.com/neonevadie/-Baitul-Ma-mur-Safaah](https://github.com/neonevadie/-Baitul-Ma-mur-Safaah)
- 📧 Admin: admin@bms-syafaah.id
- 📖 Panduan: tersedia di dalam aplikasi → menu **Panduan**

---

*Sistem internal CV. Baitul Ma'mur Syafaah — BMS v11.0 · Februari 2026*
*Firebase Project: bms-syafaah · Firestore Rules: v2.1 (upgrade ke v2.2 direkomendasikan) · SW: bms-cache-v11*
```
