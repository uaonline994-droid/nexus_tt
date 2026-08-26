import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
import { getDatabase, ref, set as rtdbSet, get as rtdbGet, onValue as rtdbOnValue } from "firebase/database";
import firebaseAppletConfig from "../firebase-applet-config.json";

export const ADMIN_EMAIL = "a60840397@gmail.com";

export const firebaseConfig = {
  ...firebaseAppletConfig,
  databaseURL: "https://fir-50300-default-rtdb.firebaseio.com"
};

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const rtdb = getDatabase(app);

export { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  getDatabase, 
  ref, 
  rtdbSet, 
  rtdbGet, 
  rtdbOnValue, 
  type User 
};

