// ================================================================
//   BMS — firebase.js  v3.0
//   Firebase Firestore + Firebase Authentication
//   Kredensial TIDAK disimpan di sini — dikelola via Firebase Console
// ================================================================

import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, onSnapshot,
  doc, setDoc, getDoc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp, where, limit, writeBatch
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged,
  createUserWithEmailAndPassword, EmailAuthProvider,
  reauthenticateWithCredential, updatePassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// BUG #8 — KEAMANAN: Firebase config terekspos di source code.
// Ini dapat diterima untuk Firebase karena keamanan dijaga oleh Security Rules,
// BUKAN kerahasiaan API Key. Namun WAJIB melakukan langkah berikut:
//
//  ✅ 1. Firebase Console > Authentication > Settings > Authorized Domains
//         → Tambahkan HANYA domain produksi Anda (hapus localhost jika sudah live)
//
//  ✅ 2. Firebase Console > Firestore > Rules → Pastikan rules seperti ini:
//         rules_version = '2';
//         service cloud.firestore {
//           match /databases/{database}/documents {
//             match /{document=**} {
//               allow read, write: if request.auth != null;
//             }
//           }
//         }
//
//  ✅ 3. (Opsional) Aktifkan Firebase App Check untuk proteksi berlapis.
//
const firebaseConfig = {
  apiKey           : "AIzaSyDFwMLJTDqpbODBkL3rice1cYlQq0lIFSs",
  authDomain       : "bms-syafaah.firebaseapp.com",
  projectId        : "bms-syafaah",
  storageBucket    : "bms-syafaah.firebasestorage.app",
  messagingSenderId: "247629123246",
  appId            : "1:247629123246:web:5249353551c37fbd95e73f",
  measurementId    : "G-8ZK1CZ6E0X"
};

const app  = initializeApp(firebaseConfig);
const db      = getFirestore(app);
const auth    = getAuth(app);
const storage = getStorage(app);

window.FS = {
  db,
  col       : (path)       => collection(db, path),
  docRef    : (path, id)   => doc(db, path, id),
  addDoc    : (col, data)  => addDoc(col,  { ...data, _ts: serverTimestamp() }),
  setDoc    : (ref, data)  => setDoc(ref,  { ...data, _ts: serverTimestamp() }),
  getDoc    : (ref)        => getDoc(ref),
  getDocs   : (q)          => getDocs(q),
  updateDoc : (ref, data)  => updateDoc(ref, { ...data, _ts: serverTimestamp() }),
  deleteDoc : (ref)        => deleteDoc(ref),
  onSnapshot: (q, cb)      => onSnapshot(q, cb),
  query     : (...args)    => query(...args),
  orderBy   : (f, d)       => orderBy(f, d),
  where     : (f, op, v)   => where(f, op, v),
  limit     : (n)          => limit(n),
  ts        : ()           => serverTimestamp(),
  batch     : ()           => writeBatch(db),
};

window.FA = {
  auth,
  currentUser : () => auth.currentUser,
  signIn      : (email, pw) => signInWithEmailAndPassword(auth, email, pw),
  signOut     : () => signOut(auth),
  onAuth      : (cb) => onAuthStateChanged(auth, cb),
  // Buat user baru tanpa logout user aktif (pakai secondary app)
  createUser  : async (email, pw) => {
    const key = `bms_tmp_${Date.now()}`;
    const app2 = initializeApp(firebaseConfig, key);
    const auth2 = getAuth(app2);
    try {
      const cred = await createUserWithEmailAndPassword(auth2, email, pw);
      const uid  = cred.user.uid;
      await signOut(auth2);
      await deleteApp(app2);
      return uid;
    } catch(e) { await deleteApp(app2).catch(()=>{}); throw e; }
  },
  // Re-authenticate (wajib sebelum ganti password)
  reauthenticate: async (email, pw) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Tidak ada user aktif');
    const credential = EmailAuthProvider.credential(email, pw);
    return reauthenticateWithCredential(user, credential);
  },
  // Update password (requires reauthenticate first)
  updatePassword: (newPw) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Tidak ada user aktif');
    return updatePassword(user, newPw);
  },
};

// ── Firebase Storage Helper ────────────────────────────────────────
// window.ST — foto produk disimpan di Storage, bukan base64 di Firestore
// Path: barang/{barangId}/{timestamp}_{filename}
//
// ⚠️  Storage Security Rules (set di Firebase Console → Storage → Rules):
// rules_version = '2';
// service firebase.storage {
//   match /b/{bucket}/o {
//     match /barang/{allPaths=**} {
//       allow read: if request.auth != null;
//       allow write: if request.auth != null
//                    && request.resource.size < 2 * 1024 * 1024  // max 2MB
//                    && request.resource.contentType.matches('image/.*');
//       allow delete: if request.auth != null;
//     }
//   }
// }
window.ST = {
  storage,

  /**
   * Upload satu file ke Firebase Storage.
   * @param {File|Blob} file — File objek dari input atau canvas
   * @param {string} barangId — Firestore document ID (atau 'new' untuk barang baru)
   * @returns {Promise<string>} — Download URL publik
   */
  uploadFoto: async (file, barangId = 'new') => {
    const ext       = file.type === 'image/png' ? 'png' : 'jpg';
    const filename  = `${Date.now()}_${Math.random().toString(36).slice(2,7)}.${ext}`;
    const storagePath = `barang/${barangId}/${filename}`;
    const storageRef  = ref(storage, storagePath);
    const snapshot    = await uploadBytes(storageRef, file, { contentType: file.type || 'image/jpeg' });
    const url         = await getDownloadURL(snapshot.ref);
    return url;
  },

  /**
   * Upload multiple files, return array URL.
   * @param {FileList|File[]} files
   * @param {string} barangId
   * @returns {Promise<string[]>}
   */
  uploadFotoArr: async (files, barangId = 'new') => {
    const results = await Promise.all(
      Array.from(files).slice(0, 4).map(f => window.ST.uploadFoto(f, barangId))
    );
    return results;
  },

  /**
   * Upload dari base64 DataURL (digunakan di migration & canvas preview).
   * @param {string} dataUrl — data:image/jpeg;base64,...
   * @param {string} barangId
   * @returns {Promise<string>} — Download URL
   */
  uploadBase64: async (dataUrl, barangId = 'migration') => {
    const res    = await fetch(dataUrl);
    const blob   = await res.blob();
    return window.ST.uploadFoto(blob, barangId);
  },

  /**
   * Hapus foto dari Storage berdasarkan URL.
   * Gagal diam-diam jika URL bukan Storage (e.g. base64 lama).
   */
  deleteFoto: async (url) => {
    if (!url || !url.startsWith('https://firebasestorage')) return;
    try {
      const storageRef = ref(storage, url);
      await deleteObject(storageRef);
    } catch(e) {
      // File sudah tidak ada — oke
      if (e.code !== 'storage/object-not-found') console.warn('[ST] deleteFoto:', e.message);
    }
  },

  /** Helper: apakah string adalah URL Storage (bukan base64)? */
  isUrl: (s) => typeof s === 'string' && s.startsWith('https://'),
};

window.FIREBASE_READY = true;
console.log("✅ Firebase v4.0 — Auth + Firestore + Storage aktif");
