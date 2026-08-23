import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";

export const ADMIN_EMAIL = "a60840397@gmail.com";

export const firebaseConfig = {
  apiKey: "AIzaSyDPtL8ZM7mIA45ovrffR4ljBMq44ZQhd1c",
  authDomain: "gen-lang-client-0277017419.firebaseapp.com",
  projectId: "gen-lang-client-0277017419",
  storageBucket: "gen-lang-client-0277017419.firebasestorage.app",
  messagingSenderId: "890855632011",
  appId: "1:890855632011:web:34a3c430271fee7a40b88e"
};

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
export const db = getFirestore(app);

export { signInWithPopup, signOut, onAuthStateChanged, doc, setDoc, getDoc, onSnapshot, type User };
