
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// --- Environment Variable Check ---
const firebaseEnvVars = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log("🔎 [Firebase Config] Checking environment variables server-side:");
let criticalEnvVarMissing = false;
for (const [key, value] of Object.entries(firebaseEnvVars)) {
  const envVarName = `NEXT_PUBLIC_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`;
  if (value) {
    console.log(`✅ [Firebase Config] ${envVarName}: Found (Value will not be logged for security)`);
  } else {
    console.warn(`⚠️ [Firebase Config] ${envVarName}: MISSING or UNDEFINED`);
    if (key === 'apiKey') {
      criticalEnvVarMissing = true;
    }
  }
}

if (criticalEnvVarMissing) {
  console.error("--------------------------------------------------------------------------------------");
  console.error("❌ FATAL ERROR: Firebase API Key (NEXT_PUBLIC_FIREBASE_API_KEY) is MISSING or UNDEFINED in the server environment.");
  console.error("👉 Please ensure all NEXT_PUBLIC_FIREBASE_... variables are correctly set in your .env.local file.");
  console.error("   Your .env.local file should be in the ROOT of your project and look similar to this:");
  console.error("   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXX");
  console.error("   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com");
  console.error("   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id");
  console.error("   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com");
  console.error("   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890");
  console.error("   NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abcdef123456");
  console.error("👉 You MUST RESTART your development server (e.g., stop and re-run `npm run dev`) after making changes to .env.local.");
  console.error("--------------------------------------------------------------------------------------");
  throw new Error("Firebase API Key (NEXT_PUBLIC_FIREBASE_API_KEY) is not configured. Server cannot initialize Firebase.");
} else {
  console.log("✅ [Firebase Config] NEXT_PUBLIC_FIREBASE_API_KEY seems to be present. Proceeding with initialization.");
}

const firebaseConfig = {
  apiKey: firebaseEnvVars.apiKey,
  authDomain: firebaseEnvVars.authDomain,
  projectId: firebaseEnvVars.projectId,
  storageBucket: firebaseEnvVars.storageBucket,
  messagingSenderId: firebaseEnvVars.messagingSenderId,
  appId: firebaseEnvVars.appId,
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
    console.log("🔥 Firebase app initialized successfully.");
  } catch (e: any) {
    console.error("🚨 Firebase initialization error:", e.message);
    console.error("🚨 This could be due to incorrect values in your Firebase config (even if the API key was present).");
    console.error("🚨 Double-check your Firebase config values in .env.local against your Firebase project settings.");
    throw e; // Re-throw after logging
  }
} else {
  app = getApp();
  console.log("🔥 Existing Firebase app instance retrieved.");
}

try {
  auth = getAuth(app);
  db = getFirestore(app);
  console.log("🔑 Firebase Auth and Firestore services initialized.");
} catch (e: any) {
  console.error("🚨 Error getting Firebase Auth/Firestore instances:", e.message);
  if (e.message.includes('invalid-api-key') || e.message.includes('auth/invalid-api-key')) {
     console.error("🚨 This specific error (invalid-api-key) strongly suggests the API Key value in .env.local is incorrect or not valid for your Firebase project, even if it was loaded.");
  }
  throw e; // Re-throw after logging
}


export { app, auth, db };
