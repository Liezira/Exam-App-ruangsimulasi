import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check"; 
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,  
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// 1. Initialize Firebase (HANYA SEKALI DI SINI)
const app = initializeApp(firebaseConfig);

// 2. Setup App Check (ReCaptcha) - Hanya jalan di browser
if (typeof window !== "undefined") {
  const siteKey = import.meta.env.VITE_RECAPTCHA;

  if (siteKey) {
    // Aktifkan Debug Token jika di Localhost agar tidak kena blokir sendiri
    if (window.location.hostname === "localhost") {
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      console.log("Firebase: Debug Token Aktif (Mode Localhost)");
    }

    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
    console.log("Firebase: App Check Protected");
  } else {
    // Warning saja, tidak error, agar tetap jalan kalau lupa set .env
    console.warn("Firebase Warning: VITE_RECAPTCHA tidak ditemukan di .env, App Check non-aktif.");
  }
}

// 3. Export Services (Gunakan 'app' yang sudah dibuat di langkah 1)
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); 

export default app;