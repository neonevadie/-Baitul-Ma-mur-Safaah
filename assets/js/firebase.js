// ================================================================
//  BMS — firebase.js  v4.0 (ES Module)
//  Firebase Firestore + Auth + Storage
//  CV. Baitul Ma'mur Syafaah · Upgrade v11.0
// ================================================================

import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, addDoc as _addDoc, getDocs, onSnapshot,
  doc, setDoc as _setDoc, getDoc as _getDoc, updateDoc as _updateDoc,
  deleteDoc, query, orderBy, serverTimestamp, where, limit, writeBatch, startAfter
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged,
  createUserWithEmailAndPassword, EmailAuthProvider,
  reauthenticateWithCredential, updatePassword as _updatePassword
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

const app     = initializeApp(firebaseConfig);
const db      = getFirestore(app);
const auth    = getAuth(app);
const storage = getStorage(app);

export const col     = (path)         => collection(db, path);
export const docRef  = (path, id)     => doc(db, path, id);
export const ts      = ()             => serverTimestamp();
export const batch   = ()             => writeBatch(db);
export const addDoc  = (c, data)      => _addDoc(c, { ...data, _ts: serverTimestamp() });
export const setDoc  = (ref, data)    => _setDoc(ref, { ...data, _ts: serverTimestamp() });
export const getDoc  = (ref)          => _getDoc(ref);
export const updateDoc = (ref, data)  => _updateDoc(ref, { ...data, _ts: serverTimestamp() });
export const deleteDoc_ = (ref)       => deleteDoc(ref);
export const getDocs_   = (q)         => getDocs(q);
export { query, orderBy, where, limit, startAfter, onSnapshot, writeBatch };

// ── Firebase Storage — Upgrade 4.1: Migrasi Foto base64 → Cloud ──
export async function uploadFoto(file, barangId) {
  const ext  = file.type === 'image/png' ? 'png' : 'jpg';
  const path = `barang/${barangId}/${Date.now()}.${ext}`;
  const ref  = storageRef(storage, path);
  await uploadBytes(ref, file);
  return getDownloadURL(ref);
}

export async function uploadBase64ToStorage(base64, barangId) {
  const res  = await fetch(base64);
  const blob = await res.blob();
  const ext  = blob.type === 'image/png' ? 'png' : 'jpg';
  const path = `barang/${barangId}/migrated_${Date.now()}.${ext}`;
  const ref  = storageRef(storage, path);
  await uploadBytes(ref, blob);
  return getDownloadURL(ref);
}

export async function deleteFotoFromStorage(url) {
  try {
    const ref = storageRef(storage, url);
    await deleteObject(ref);
  } catch(e) {
    if (e.code !== 'storage/object-not-found') console.warn('deleteFoto:', e.message);
  }
}

// ── Auth Helpers ──────────────────────────────────────────────────
export const signIn         = (email, pw) => signInWithEmailAndPassword(auth, email, pw);
export const doSignOut      = ()          => signOut(auth);
export const onAuth         = (cb)        => onAuthStateChanged(auth, cb);
export const currentFbUser  = ()          => auth.currentUser;

export const createUser = async (email, pw) => {
  const key   = `bms_tmp_${Date.now()}`;
  const app2  = initializeApp(firebaseConfig, key);
  const auth2 = getAuth(app2);
  try {
    const cred = await createUserWithEmailAndPassword(auth2, email, pw);
    const uid  = cred.user.uid;
    await signOut(auth2);
    await deleteApp(app2);
    return uid;
  } catch(e) { await deleteApp(app2).catch(() => {}); throw e; }
};

export const reauthenticate = async (email, pw) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Tidak ada user aktif');
  return reauthenticateWithCredential(user, EmailAuthProvider.credential(email, pw));
};

export const doUpdatePassword = (newPw) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Tidak ada user aktif');
  return _updatePassword(user, newPw);
};

window.FIREBASE_READY = true;
console.log("✅ Firebase v4.0 — Auth + Firestore + Storage aktif");
