// Firebase Configuration and Initialization
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, isSupported } from "firebase/messaging";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA3577UYsUcd_cgZjiLs0YXlAY505RKyEs",
  authDomain: "civicconnect-b8190.firebaseapp.com",
  projectId: "civicconnect-b8190",
  storageBucket: "civicconnect-b8190.firebasestorage.app",
  messagingSenderId: "448109429534",
  appId: "1:448109429534:web:9494921785c9d28c17ff0f",
  measurementId: "G-M6PPBLEVPY"
};

// Initialize Firebase (only once)
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

// Debug: Verify Firebase initialization
console.log("🔥 Firebase Initialized");
console.log("✅ Firestore DB:", db ? "Connected" : "ERROR: Not initialized");
console.log("✅ Auth:", auth ? "Connected" : "ERROR: Not initialized");
console.log("✅ Storage:", storage ? "Connected" : "ERROR: Not initialized");

// Initialize messaging (only if supported)
let messaging = null;
isSupported().then(yes => {
  if (yes) {
    messaging = getMessaging(app);
    console.log("✅ FCM Messaging: Supported");
  } else {
    console.log("⚠️ FCM Messaging: Not supported in this browser");
  }
}).catch(err => console.warn("⚠️ FCM not supported:", err));

// Enable offline persistence for Firestore
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('⚠️ Multiple tabs open, persistence enabled in first tab only');
  } else if (err.code === 'unimplemented') {
    console.warn('⚠️ Browser does not support persistence');
  } else {
    console.error('❌ Persistence error:', err);
  }
});

export { app, analytics, auth, db, storage, messaging, googleProvider };
