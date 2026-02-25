<div align="center">

# 🕌 BMS — Baitul Ma'mur Syafaah
### Sistem Manajemen Bisnis Internal

**CV. Baitul Ma'mur Syafaah · 2026**

[![Status](https://img.shields.io/badge/status-aktif-brightgreen?style=flat-square)](https://neonevadie.github.io/-Baitul-Ma-mur-Safaah/)
[![Firebase](https://img.shields.io/badge/backend-Firebase-orange?style=flat-square)](https://firebase.google.com/)
[![Deploy](https://img.shields.io/badge/hosting-GitHub%20Pages-blue?style=flat-square)](https://pages.github.com/)

</div>

---

## ✨ Fitur Utama

| Modul | Deskripsi |
|---|---|
| 📊 **Dashboard** | Ringkasan real-time — stok kritis, invoice jatuh tempo, running text produk |
| 🛒 **Transaksi & Invoice** | Buat invoice, metode bayar Tunai/Transfer/Tempo, stok otomatis berkurang |
| 📦 **Data Barang** | CRUD produk dengan foto, harga beli/jual, kategori, lokasi rak |
| 📋 **Stock Opname** | Audit fisik vs sistem, simpan per-baris atau massal, generate laporan CSV |
| 🤝 **Mitra Bisnis** | Kelola pelanggan & pemasok, tracking piutang |
| 💰 **Keuangan** | Pengeluaran, pembelian, aset, laba rugi sederhana |
| 📈 **Laporan & Analitik** | Grafik penjualan, margin, perputaran stok |
| 📊 **Dashboard Sales** | Performa individu & estimasi bonus per sales |
| 💬 **Live Chat** | Komunikasi real-time antar tim (Owner, Admin, Sales) |
| 📋 **Log Aktivitas** | Rekam jejak lengkap semua tindakan tim (khusus Owner) |
| ⚙️ **Pengaturan** | Profil perusahaan, kategori barang, manajemen akun, backup/restore |

---

## 👥 Hak Akses Pengguna

```
👑 Owner     → Akses penuh semua modul
🛠️  Admin     → Transaksi, barang, mitra, keuangan, laporan, opname, pengaturan
📊 Sales     → Dashboard, stok, transaksi, mitra, dashboard sales pribadi
```

---

## 🗂️ Struktur Proyek

```
bms/
├── index.html                  ← Satu-satunya halaman HTML (SPA)
├── assets/
│   ├── css/
│   │   └── style.css           ← Semua styling (dark/light mode)
│   ├── js/
│   │   ├── app.js              ← Logic utama (nav, render, CRUD, chat)
│   │   └── firebase.js         ← Konfigurasi & wrapper Firebase SDK
│   └── img/
│       └── logo.png            ← Logo BMS (opsional, ada fallback teks)
├── .gitignore
└── README.md
```

---

## 🚀 Cara Deploy & Update

```bash
# 1. Edit file sesuai kebutuhan
# 2. Push ke GitHub
git add .
git commit -m "feat: deskripsi perubahan"
git push

# 3. Tunggu 1–2 menit → otomatis live di:
# https://neonevadie.github.io/-Baitul-Ma-mur-Safaah/
```

---

## 🔐 Keamanan Firebase

> **Penting:** Firebase config ada di frontend (`firebase.js`). Pastikan Firestore & Storage Rules sudah ketat.

### Firestore Rules (disarankan)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Koleksi test: bebas untuk testing
    match /test/{doc} {
      allow read, write: if true;
    }
    // Semua koleksi lain: wajib login
    match /{collection}/{doc} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Setup Firebase Auth
1. Buka **Firebase Console → Authentication → Sign-in method**
2. Aktifkan **Email/Password**
3. Tambahkan user: **Authentication → Add User**
   - Owner: `owner@bms-syafaah.id`
   - Admin: `admin@bms-syafaah.id`
   - Sales: sesuai kebutuhan

---

## 🛠️ Teknologi

- **Frontend:** HTML5, CSS3 (Dark/Light Mode), Vanilla JavaScript ES6+
- **Backend:** Firebase Authentication + Firestore (realtime sync)
- **Hosting:** GitHub Pages (auto-deploy on push)
- **Icons:** Font Awesome 6

---

## 🔭 Rencana Pengembangan

- [ ] Pisah halaman ke partial HTML / komponen (`/pages`, `/components`)
- [ ] Gunakan `lit-html` atau templating engine ringan
- [ ] Role-based Firestore rules lebih granular
- [ ] Notifikasi push (Firebase Cloud Messaging)
- [ ] Laporan PDF otomatis bulanan

---

<div align="center">

Dibuat oleh **[@gostcyber](https://github.com/gostcyber)** · 2026  
_Untuk kebutuhan internal CV. Baitul Ma'mur Syafaah_

</div>
