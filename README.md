# 🏪 BMS — Sistem Manajemen Bisnis
### CV. Baitul Ma'mur Syafaah — Distributor Sembako Nasional

[![GitHub Pages](https://img.shields.io/badge/Live-GitHub%20Pages-brightgreen?style=flat-square&logo=github)](https://neonevadie.github.io/-Baitul-Ma-mur-Safaah/)
[![Firebase](https://img.shields.io/badge/Database-Firebase%20Firestore-orange?style=flat-square&logo=firebase)](https://firebase.google.com/)
[![Status](https://img.shields.io/badge/Status-Online-success?style=flat-square)]()

---

## 📋 Tentang Sistem

**BMS** adalah aplikasi manajemen bisnis berbasis web untuk CV. Baitul Ma'mur Syafaah. Sistem ini membantu mengelola operasional distribusi sembako secara real-time melalui integrasi Firebase Firestore.

> 🔒 Sistem ini bersifat **internal** dan hanya digunakan oleh tim CV. Baitul Ma'mur Syafaah. Akses memerlukan autentikasi yang dikelola oleh Owner.

---

## ✨ Fitur Utama

| Modul | Deskripsi | Owner | Admin | Sales |
|-------|-----------|:-----:|:-----:|:-----:|
| 📊 Dashboard | KPI real-time, grafik performa & running text produk laris | ✅ | ✅ | ✅ |
| 📦 Data Barang | CRUD produk, upload foto, export CSV | ✅ | ✅ | 👁️ |
| 🧾 Invoice | Buat & kelola invoice + PPN 11%, preview & cetak | ✅ | ✅ | ✅ |
| 🏭 Info Stok | Monitor stok masuk/keluar, distribusi persentase | ✅ | ✅ | 👁️ |
| 🤝 Mitra Bisnis | Data pelanggan & pemasok | ✅ | ✅ | ✅ |
| 💰 Keuangan | Laporan laba-rugi, aset, pengeluaran & pembelian | ✅ | ✅ | ❌ |
| 📈 Laporan & Analitik | Grafik trend 2024–2035, distribusi produk nyata | ✅ | ❌ | ❌ |
| 📊 Dashboard Sales | Performa & estimasi bonus per sales | ✅ | ✅ | ✅ |
| 📋 Stock Opname | Audit stok fisik vs sistem, generate CSV | ✅ | ✅ | ❌ |
| ⚙️ Pengaturan | Kelola user, profil perusahaan, backup/restore | ✅ | ❌ | ❌ |
| 💬 Live Chat | Chat internal tim realtime, broadcast, status online | ✅ | ✅ | ✅ |
| 📚 Panduan | Panduan lengkap penggunaan sistem | ✅ | ✅ | ✅ |

> 👁️ = hanya lihat (read-only), tidak bisa edit/hapus

---

## 🗂️ Struktur Proyek

```
bms/
│
├── index.html              ← Halaman utama (entry point)
│
├── assets/
│   ├── css/
│   │   └── style.css       ← Semua styling + dark/light mode
│   ├── js/
│   │   ├── firebase.js     ← Firebase Auth + Firestore
│   │   └── app.js          ← Logika utama aplikasi
│   └── img/
│       └── logo.png        ← Logo perusahaan
│
├── .gitignore              ← File yang diabaikan Git
└── README.md               ← Dokumentasi ini
```

---

## 👥 Hak Akses

Sistem menggunakan **Firebase Authentication** dengan tiga level akses:

| Role | Deskripsi |
|------|-----------|
| 👑 **Owner** | Akses penuh ke semua fitur termasuk pengaturan user dan hapus data |
| 💼 **Admin Keuangan** | Kelola barang, invoice, stok, keuangan, dan stock opname |
| 🤝 **Sales** | Buat invoice, lihat stok (read-only), dan pantau performa pribadi |

> 🔒 Manajemen akun dan password dikelola langsung oleh Owner melalui menu **Pengaturan** di dalam aplikasi.

---

## 🛠️ Teknologi

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Database:** Firebase Firestore (NoSQL, realtime)
- **Auth:** Firebase Authentication (Email + Password)
- **Hosting:** GitHub Pages
- **Icons:** Font Awesome 6.4
- **Fonts:** Plus Jakarta Sans, Syne (Google Fonts)

---

## 📱 Fitur Teknis

- ✅ **Firebase Auth** — login aman, password tidak tersimpan di kode
- ✅ **Realtime sync** — data update otomatis di semua tab & device
- ✅ **Dark / Light mode** — bisa diganti dari dashboard atau pengaturan
- ✅ **Running text** — produk terlaris + harga tampil live di atas dashboard
- ✅ **Role-based access** — tampilan & aksi otomatis sesuai role
- ✅ **Export CSV** — barang, invoice, mitra, stok, opname
- ✅ **Backup & Restore** — download/upload JSON seluruh data
- ✅ **Stock Opname** — audit & generate laporan selisih stok
- ✅ **Dashboard Sales** — grafik & bonus terpisah per sales
- ✅ **Responsive** — laptop, tablet, smartphone
- ✅ **Print invoice** — format siap cetak dengan detail perusahaan

---

## 📞 Informasi Perusahaan

**CV. Baitul Ma'mur Syafaah**  
Distributor Sembako Nasional  
Ruko Pertokoan Villa Bogor Indah 5, Bogor, Jawa Barat  
📧 info@bms-syafaah.id

---

*Dikembangkan untuk kebutuhan internal — CV. Baitul Ma'mur Syafaah © 2026*  
*Dibuat oleh [@gostcyber](https://github.com/gostcyber)*
