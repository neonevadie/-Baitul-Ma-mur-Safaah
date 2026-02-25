// ================================================================
//  BMS — firebase.js v4.0
//  Firebase Auth + Firestore realtime
//  Project: bms-syafaah | CV. Baitul Ma'mur Syafaah
// ================================================================

import { initializeApp, deleteApp } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, onSnapshot,
  doc, setDoc, getDoc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp, where, limit, writeBatch
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ── Config ───────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey           : "AIzaSyDFwMLJTDqpbODBkL3rice1cYlQq0lIFSs",
  authDomain       : "bms-syafaah.firebaseapp.com",
  projectId        : "bms-syafaah",
  storageBucket    : "bms-syafaah.firebasestorage.app",
  messagingSenderId: "247629123246",
  appId            : "1:247629123246:web:5249353551c37fbd95e73f",
};

// ── Init ─────────────────────────────────────────────────────────
const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

// ── Firestore API (window.FS) ────────────────────────────────────
window.FS = {
  db,
  col      : (path)      => collection(db, path),
  docRef   : (path, id)  => doc(db, path, id),
  addDoc   : (col, data) => addDoc(col,  { ...data, _ts: serverTimestamp() }),
  setDoc   : (ref, data) => setDoc(ref,  { ...data, _ts: serverTimestamp() }),
  getDoc   : (ref)       => getDoc(ref),
  getDocs  : (q)         => getDocs(q),
  updateDoc: (ref, data) => updateDoc(ref, { ...data, _ts: serverTimestamp() }),
  deleteDoc: (ref)       => deleteDoc(ref),
  onSnapshot:(q, cb)     => onSnapshot(q, cb),
  query    : (...args)   => query(...args),
  orderBy  : (f, d)      => orderBy(f, d),
  where    : (f, op, v)  => where(f, op, v),
  limit    : (n)         => limit(n),
  ts       : ()          => serverTimestamp(),
  batch    : ()          => writeBatch(db),
};

// ── Auth API (window.FA) ─────────────────────────────────────────
window.FA = {
  auth,
  currentUser: ()       => auth.currentUser,
  signIn     : (e, pw)  => signInWithEmailAndPassword(auth, e, pw),
  signOut    : ()       => signOut(auth),
  onAuth     : (cb)     => onAuthStateChanged(auth, cb),

  // Buat user baru tanpa logout user aktif (pakai secondary app instance)
  createUser: async (email, pw) => {
    const key  = `bms_tmp_${Date.now()}`;
    const app2 = initializeApp(firebaseConfig, key);
    const auth2 = getAuth(app2);
    try {
      const cred = await createUserWithEmailAndPassword(auth2, email, pw);
      const uid  = cred.user.uid;
      await signOut(auth2);
      await deleteApp(app2);
      return uid;
    } catch(e) {
      await deleteApp(app2).catch(() => {});
      throw e;
    }
  },
};

// ── Ready Flag & DOM Status ──────────────────────────────────────
window.FIREBASE_READY = true;

function setLoginStatus(online) {
  const el  = document.getElementById('fb-status');
  const txt = document.getElementById('fb-status-text');
  if (!el || !txt) return;
  if (online) {
    el.className  = 'firebase-status online';
    txt.textContent = '☁️ Firebase terhubung — siap login';
  } else {
    el.className  = 'firebase-status offline';
    txt.textContent = '⚠️ Firebase tidak terhubung — cek internet';
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setLoginStatus(true));
} else {
  setLoginStatus(true);
}

window.dispatchEvent(new CustomEvent('firebase-ready'));
console.log('✅ BMS Firebase v4.0 — Auth + Firestore aktif | project: bms-syafaah');
