import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "crime-detection-system-734c6.firebaseapp.com",
  projectId: "crime-detection-system-734c6",
  storageBucket: "crime-detection-system-734c6.firebasestorage.app",
  messagingSenderId: "500709121041",
  appId: "1:500709121041:web:ed970480dc4da088b7a5b0",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ EXPORT BOTH
export const auth = getAuth(app);
export const db = getFirestore(app);
