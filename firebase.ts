import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDGedUAIexIAEIPA6HEqaqO2I9I11Gpk60",
  authDomain: "jefinho-78c5b.firebaseapp.com",
  projectId: "jefinho-78c5b",
  storageBucket: "jefinho-78c5b.firebasestorage.app",
  messagingSenderId: "16669972433",
  appId: "1:16669972433:web:7122d2eb86f3ba74b1b2f0"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);