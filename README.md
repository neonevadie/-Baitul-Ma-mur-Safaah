# 🏪 BMS — Sistem Manajemen Bisnis
### CV. Baitul Ma'mur Syafaah — Distributor Sembako Nasional

[![Firebase](https://img.shields.io/badge/Database-Firebase%20Firestore-orange?style=flat-square&logo=firebase)](https://firebase.google.com/)
[![Status](https://img.shields.io/badge/Status-Online-success?style=flat-square)]()
[![Version](https://img.shields.io/badge/Versi-8.0-blue?style=flat-square)]()

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
| 🧾 Transaksi | Buat transaksi + metode bayar + PPN 11% | ✅ | ✅ | ✅ |
| 🏭 Info Stok | Monitor stok masuk/keluar | ✅ | ✅ | 👁️ |
| 🤝 Mitra Bisnis | Data pelanggan & pemasok | ✅ | ✅ | ✅ |
| 💰 Keuangan | Laporan laba-rugi, pengeluaran | ✅ | ✅ | ❌ |
| 📈 Laporan | Analitik & grafik performa | ✅ | ✅ | ❌ |
| 📋 Stock Opname | Audit stok fisik, simpan ke cloud | ✅ | ✅ | ❌ |
| 💬 Live Chat | Chat internal antar tim | ✅ | ✅ | ✅ |
| ⚙️ Pengaturan | Akun, kategori, backup | ✅ | ✅ | ❌ |
| 📋 Log Aktivitas | Rekam jejak semua aktivitas | ✅ | ❌ | ❌ |

> 👁️ = hanya lihat (read-only)

---

## 🗂️ Struktur Proyek

```
bms/
├── index.html              # UI utama
├── manifest.json           # PWA manifest
├── sw.js                   # Service Worker
├── assets/
│   ├── css/style.css       # Styling & @print
│   ├── js/app.js           # Logika utama
│   ├── js/firebase.js      # Konfigurasi Firebase ⚠️
│   └── img/                # Aset & ikon PWA
├── .gitignore
└── README.md
```

> v8.0: +3 fitur baru vs v7.0 · Koleksi Firestore baru: `gudang`, `surat_jalan`

---

## 🛠️ Teknologi

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Database:** Firebase Firestore (realtime NoSQL)
- **Auth:** Firebase Authentication (Email/Password)
- **Icons:** Font Awesome 6.4 | **Fonts:** Plus Jakarta Sans, Syne

---

## 📱 Fitur Teknis

- ✅ Realtime sync — data sinkron otomatis semua perangkat
- ✅ Notifikasi persisten — status baca tersimpan ke Firebase
- ✅ Push Notifikasi Browser — stok kritis & invoice jatuh tempo 🆕
- ✅ Print Invoice PDF — layout profesional, tanda tangan 3 kolom 🆕
- ✅ Ganti Password In-App — re-auth Firebase, auto logout 🆕
- ✅ PWA — bisa diinstall di HP, support offline 🆕
- ✅ Multi-Gudang — kelola stok di banyak lokasi, transfer antar gudang 🆕
- ✅ Surat Jalan Digital — generate dari invoice, print PDF, kirim WhatsApp 🆕
- ✅ Grafik Tren Stok — visualisasi masuk/keluar per produk 6 bulan 🆕
- ✅ Stock Opname — audit fisik, simpan & update stok ke cloud
- ✅ Role-based access — akses sesuai peran pengguna
- ✅ Export CSV — barang, invoice, mitra, stok, opname
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
*Sistem internal CV. BMS — v8.0 · 25 February 2026*
