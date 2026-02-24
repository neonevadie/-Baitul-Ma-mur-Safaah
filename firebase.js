// ================================================================
//   BMS — firebase.js
//   Konfigurasi & inisialisasi Firebase Firestore
//   Ubah nilai di firebaseConfig jika project Firebase berganti
// ================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, onSnapshot,
  doc, setDoc, getDoc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp, where, limit
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ── Konfigurasi project Firebase ──────────────────────────────────────────
const firebaseConfig = {
  apiKey           : "AIzaSyDFwMLJTDqpbODBkL3rice1cYlQq0lIFSs",
  authDomain       : "bms-syafaah.firebaseapp.com",
  projectId        : "bms-syafaah",
  storageBucket    : "bms-syafaah.firebasestorage.app",
  messagingSenderId: "247629123246",
  appId            : "1:247629123246:web:5249353551c37fbd95e73f",
  measurementId    : "G-8ZK1CZ6E0X"
};

// ── Init ──────────────────────────────────────────────────────────────────
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ── Expose semua fungsi Firestore ke global scope (dipakai app.js) ────────
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
};

window.FIREBASE_READY = true;
console.log("✅ Firebase Firestore terhubung — bms-syafaah");
