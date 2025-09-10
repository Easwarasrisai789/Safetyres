// src/firebase.js
import { initializeApp, getApps } from "firebase/app";
import { getAuth, onAuthStateChanged, signInAnonymously, signOut, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBY5-qkTZa84Xg4_kQNLWMdCriql5rtPo8",
  authDomain: "emergency-6fef1.firebaseapp.com",
  projectId: "emergency-6fef1",
  storageBucket: "emergency-6fef1.appspot.com",
  messagingSenderId: "706251688953",
  appId: "1:706251688953:web:5aaff2f24b18d379b88b28",
  measurementId: "G-7B4EBSRCHV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Auth
export const auth = getAuth(app);

// Firestore
export const db = getFirestore(app);

// Analytics (optional)
export let analytics = null;
isSupported().then((yes) => {
  if (yes) analytics = getAnalytics(app);
});

// Ensure there is an authenticated user for Firestore security rules that require auth
// Attempts anonymous sign-in ASAP and exposes a promise to await readiness
export const authReady = new Promise((resolve) => {
  let resolved = false;
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      signInAnonymously(auth).catch(() => {
        // Swallow to avoid noisy logs; Firestore reads will still fail if rules disallow
      });
    }
    if (!resolved) {
      resolved = true;
      resolve();
    }
  });
});

// Create Firebase Auth user for drivers using a secondary app so admin stays logged in
let secondaryApp = null;
export const createDriverAccount = async (email, password) => {
  if (!secondaryApp) {
    secondaryApp = initializeApp(firebaseConfig, 'secondary');
  }
  const secondaryAuth = getAuth(secondaryApp);
  const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
  await signOut(secondaryAuth);
  return cred.user.uid;
};
