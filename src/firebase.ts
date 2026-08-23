import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
import firebaseAppletConfig from "../firebase-applet-config.json";

export const ADMIN_EMAIL = "a60840397@gmail.com";

export const firebaseConfig = {
  apiKey: "AIzaSyB1cNyANrsKZZIYw_eGRBt7Z0NPUNTSLcM",
  authDomain: "fir-50300.firebaseapp.com",
  projectId: "fir-50300",
  storageBucket: "fir-50300.firebasestorage.app",
  messagingSenderId: "538511193051",
  appId: "1:538511193051:web:e305bd85a0c87cdeea2dfe",
  measurementId: "G-H66KMZVC72"
};

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
export const db = getFirestore(app);

export { signInWithPopup, signOut, onAuthStateChanged, doc, setDoc, getDoc, onSnapshot, type User };

