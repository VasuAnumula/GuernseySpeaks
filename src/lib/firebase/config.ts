
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// Firebase environment variable check
const firebaseEnvVars = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check for required Firebase configuration

let criticalEnvVarMissing = false;
if (!firebaseEnvVars.apiKey) {
    criticalEnvVarMissing = true;
}

if (criticalEnvVarMissing) {
  const errorMsg = "Firebase API Key is missing. Please check your environment variables.";
  console.error("❌ Firebase Config Error:", errorMsg);
  throw new Error(errorMsg);
}

const firebaseConfig = {
  apiKey: firebaseEnvVars.apiKey,
  authDomain: firebaseEnvVars.authDomain,
  projectId: firebaseEnvVars.projectId,
  storageBucket: firebaseEnvVars.storageBucket,
  messagingSenderId: firebaseEnvVars.messagingSenderId,
  appId: firebaseEnvVars.appId,
};

// Firebase configuration ready

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
  } catch (e: any) {
    console.error("Firebase initialization error:", e.message);
    throw e;
  }
} else {
  app = getApp();
}

try {
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
} catch (e: any) {
  console.error("Error initializing Firebase services:", e.message);
  throw e;
}

export { app, auth, db, storage };
