/* ================================================================
   BMS — Firebase Configuration & Firestore API
   CV. Baitul Ma'mur Syafaah | firebase.js
   Project: bms-syafaah
   ================================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection, addDoc, getDocs, onSnapshot,
  doc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp, limit
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey           : "AIzaSyDFwMLJTDqpbODBkL3rice1cYlQq0lIFSs",
  authDomain       : "bms-syafaah.firebaseapp.com",
  projectId        : "bms-syafaah",
  storageBucket    : "bms-syafaah.firebasestorage.app",
  messagingSenderId: "247629123246",
  appId            : "1:247629123246:web:5249353551c37fbd95e73f"
};

function setDOMStatus(state) {
  const el  = document.getElementById('fb-status');
  const txt = document.getElementById('fb-status-text');
  if (!el || !txt) return;
  if (state === 'online') {
    el.className = 'firebase-status online';
    txt.textContent = '☁️ Firebase terhubung — data tersinkron ke cloud';
  } else {
    el.className = 'firebase-status offline';
    txt.textContent = '⚠️ Tidak terhubung — cek koneksi internet';
  }
}

try {
  const app = initializeApp(firebaseConfig);
  const db  = getFirestore(app);

  // ── Expose ke window ────────────────────────────────────────
  window.FS = {
    db,
    col      : (p)       => collection(db, p),
    docRef   : (p, id)   => doc(db, p, id),
    addDoc   : (c, data) => addDoc(c, { ...data, _ts: serverTimestamp() }),
    getDocs  : (q)       => getDocs(q),
    updateDoc: (r, data) => updateDoc(r, { ...data, _ts: serverTimestamp() }),
    deleteDoc: (r)       => deleteDoc(r),
    onSnapshot:(q, cb)   => onSnapshot(q, cb),
    query    : (...a)    => query(...a),
    orderBy  : (f, d)    => orderBy(f, d),
    limit    : (n)       => limit(n),
    ts       : ()        => serverTimestamp(),
  };

  // ── Flag global ──────────────────────────────────────────────
  window.FIREBASE_READY = true;

  // ── Update DOM langsung dari sini (module bisa akses DOM) ────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setDOMStatus('online'));
  } else {
    setDOMStatus('online');
  }

  // ── Dispatch event untuk app.js ──────────────────────────────
  window.dispatchEvent(new CustomEvent('firebase-ready'));
  console.log('✅ Firebase Firestore terhubung — project: bms-syafaah');

} catch(err) {
  console.error('❌ Firebase gagal:', err);
  window.FIREBASE_READY = false;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setDOMStatus('offline'));
  } else {
    setDOMStatus('offline');
  }
  window.dispatchEvent(new CustomEvent('firebase-failed'));
}
