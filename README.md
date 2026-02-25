# 🏪 BMS — Sistem Manajemen Bisnis
### CV. Baitul Ma'mur Syafaah — Distributor Sembako Nasional

[![GitHub Pages](https://img.shields.io/badge/Live-GitHub%20Pages-brightgreen?style=flat-square&logo=github)](https://neonevadie.github.io/-Baitul-Ma-mur-Safaah/)
[![Firebase](https://img.shields.io/badge/Database-Firebase%20Firestore-orange?style=flat-square&logo=firebase)](https://firebase.google.com/)
[![Status](https://img.shields.io/badge/Status-Online-success?style=flat-square)]()

---

## 📋 Tentang Sistem

**BMS** adalah aplikasi manajemen bisnis berbasis web untuk CV. Baitul Ma'mur Syafaah. Sistem ini membantu mengelola operasional distribusi sembako secara real-time melalui integrasi Firebase Firestore.

🌐 **Live Demo:** https://neonevadie.github.io/-Baitul-Ma-mur-Safaah/

---

## ✨ Fitur Utama

| Modul | Deskripsi | Owner | Admin | Sales |
|-------|-----------|:-----:|:-----:|:-----:|
| 📊 Dashboard | KPI real-time, grafik performa | ✅ | ✅ | ✅ |
| 📦 Data Barang | CRUD produk & inventaris | ✅ | ✅ | 👁️ |
| 🧾 Invoice | Buat & kelola invoice + PPN 11% | ✅ | ✅ | ✅ |
| 🏭 Info Stok | Monitor stok masuk/keluar | ✅ | ✅ | 👁️ |
| 🤝 Mitra Bisnis | Data pelanggan & pemasok | ✅ | ✅ | ✅ |
| 💰 Keuangan | Laporan laba-rugi, pengeluaran | ✅ | ✅ | ❌ |
| 📈 Laporan | Analitik & grafik performa | ✅ | ❌ | ❌ |
| 💬 Live Chat | Chat internal antar tim | ✅ | ✅ | ✅ |

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
│   │   └── style.css       ← Semua styling (774 baris)
│   ├── js/
│   │   ├── firebase.js     ← Konfigurasi & koneksi Firebase
│   │   └── app.js          ← Logika utama aplikasi (1090 baris)
│   └── img/
│       └── logo.png        ← Logo perusahaan
│
├── .gitignore              ← File yang diabaikan Git
└── README.md               ← Dokumentasi ini
```

---

## 🚀 Cara Deploy ke GitHub Pages

1. **Push ke GitHub:**
   ```bash
   git add .
   git commit -m "update: deskripsi perubahan"
   git push origin main
   ```

2. **Aktifkan GitHub Pages:**
   - Buka repo → **Settings** → **Pages**
   - Source: `Deploy from a branch`
   - Branch: `main` / `root`
   - Klik **Save**

3. Website live di: `https://[username].github.io/[repo-name]/`

---

## 🔥 Setup Firebase

### Langkah 1 — Firestore Rules
Buka [Firebase Console](https://console.firebase.google.com/) → Proyek **bms-syafaah** → **Firestore Database** → **Rules**, paste:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;  // Development only
    }
  }
}
```

> ⚠️ Untuk production, gunakan rules yang lebih ketat dengan autentikasi.

### Langkah 2 — Ganti Config (jika perlu)
Edit `assets/js/firebase.js` bagian `firebaseConfig`:
```javascript
const firebaseConfig = {
  apiKey     : "YOUR_API_KEY",
  authDomain : "YOUR_PROJECT.firebaseapp.com",
  projectId  : "YOUR_PROJECT_ID",
  // ...
};
```

---

## 👥 Akun Default

| Role | Username | Password | Akses |
|------|----------|----------|-------|
| 👑 Owner | `owner` | `bms2024` | Full akses semua fitur |
| 💼 Admin | `admin` | `bms2024` | Keuangan, stok, invoice |
| 🤝 Sales | `sales` | `bms2024` | Invoice & info stok saja |

> 🔒 **Penting:** Ganti password di `assets/js/app.js` bagian `const USERS` sebelum production!

---

## 🛠️ Teknologi

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Database:** Firebase Firestore (NoSQL, realtime)
- **Hosting:** GitHub Pages
- **UI Framework:** Custom CSS (no framework)
- **Icons:** Font Awesome 6.4
- **Fonts:** Plus Jakarta Sans, Syne (Google Fonts)

---

## 📱 Fitur Teknis

- ✅ **Realtime sync** — data update otomatis di semua tab/device
- ✅ **Session persistent** — tidak logout saat refresh (localStorage)
- ✅ **Role-based access** — tampilan & aksi sesuai role
- ✅ **Offline fallback** — pakai data lokal jika Firebase tidak tersedia
- ✅ **Export CSV** — barang, invoice, mitra, stok
- ✅ **Responsive** — bisa dipakai di HP & tablet
- ✅ **Print invoice** — format siap cetak

---

## 📞 Informasi Perusahaan

**CV. Baitul Ma'mur Syafaah**  
Distributor Sembako Nasional  
Ruko Pertokoan Villa Bogor Indah 5, Bogor, Jawa Barat  
📧 info@bms-syafaah.id

---

*Dikembangkan untuk kebutuhan internal CV. BMS — 2025*
