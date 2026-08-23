import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration provided by user
export const firebaseConfig = {
  apiKey: "AIzaSyB1cNyANrsKZZIYw_eGRBt7Z0NPUNTSLcM",
  authDomain: "fir-50300.firebaseapp.com",
  projectId: "fir-50300",
  storageBucket: "fir-50300.firebasestorage.app",
  messagingSenderId: "538511193051",
  appId: "1:538511193051:web:e305bd85a0c87cdeea2dfe",
  measurementId: "G-H66KMZVC72"
};

// Initialize Firebase SDK
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const ADMIN_EMAIL = "a60840397@gmail.com";
