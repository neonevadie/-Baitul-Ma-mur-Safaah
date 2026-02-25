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
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
const db   = getFirestore(app);
const auth = getAuth(app);

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
};

window.FIREBASE_READY = true;
console.log("✅ Firebase v3.0 — Auth + Firestore aktif");
