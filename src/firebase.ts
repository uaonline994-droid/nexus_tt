import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
import firebaseAppletConfig from "../firebase-applet-config.json";

export const ADMIN_EMAIL = "a60840397@gmail.com";

export const firebaseConfig = {
  apiKey: firebaseAppletConfig.apiKey || "AIzaSyAQFrE-vzx8KwjV3Gte-L8JDeVJlTh1Fx8",
  authDomain: firebaseAppletConfig.authDomain || "aspect-rp-485622.firebaseapp.com",
  projectId: firebaseAppletConfig.projectId || "aspect-rp-485622",
  storageBucket: firebaseAppletConfig.storageBucket || "aspect-rp-485622.firebasestorage.app",
  messagingSenderId: firebaseAppletConfig.messagingSenderId || "210129271765",
  appId: firebaseAppletConfig.appId || "1:210129271765:web:9f7d7486766d7627179b5c"
};

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
export const db = getFirestore(app);

export { signInWithPopup, signOut, onAuthStateChanged, doc, setDoc, getDoc, onSnapshot, type User };

