import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCkJbUdaXRwPwggrUZ7O_o6QfW7zr-jpXs",
  authDomain: "cardapioteste-6990e.firebaseapp.com",
  projectId: "cardapioteste-6990e",
  storageBucket: "cardapioteste-6990e.firebasestorage.app",
  messagingSenderId: "971520125071",
  appId: "1:971520125071:web:b4b90f6f08b740300268fa",
  measurementId: "G-GQC60ZLELN"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Analytics initialization (safe for SSR)
if (typeof window !== "undefined") {
  isSupported().then((yes) => yes && getAnalytics(app));
}
