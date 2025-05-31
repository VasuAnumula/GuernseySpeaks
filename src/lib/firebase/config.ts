
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
// Log the current working directory to help user verify .env.local placement
try {
  if (typeof process !== 'undefined' && typeof process.cwd === 'function') {
    console.log(`ℹ️ [Firebase Config] Current working directory (where .env.local should be in project root): ${process.cwd()}`);
  } else {
    console.log("ℹ️ [Firebase Config] process.cwd() not available in this environment (likely client-side bundle, server-side check is key).");
  }
} catch (e) {
    console.warn("ℹ️ [Firebase Config] Could not determine current working directory.", e);
}


let criticalEnvVarMissing = false;
for (const [key, value] of Object.entries(firebaseEnvVars)) {
  const envVarName = `NEXT_PUBLIC_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`;
  if (value) {
    console.log(`✅ [Firebase Config] ${envVarName}: Found (Value will not be logged for security)`);
  } else {
    console.warn(`⚠️ [Firebase Config] ${envVarName}: MISSING or UNDEFINED`);
    if (key === 'apiKey') { // 'apiKey' is the key for NEXT_PUBLIC_FIREBASE_API_KEY in firebaseEnvVars
      criticalEnvVarMissing = true;
    }
  }
}

if (criticalEnvVarMissing) {
  let errorMsg = `
--------------------------------------------------------------------------------------
❌ FATAL ERROR: Firebase API Key (NEXT_PUBLIC_FIREBASE_API_KEY) is MISSING or UNDEFINED in the server environment.
Server cannot initialize Firebase. The application will not work correctly.

👉 Troubleshooting Steps:
1.  Ensure you have a file named exactly '.env.local' in the ROOT of your project.
    (The root directory is the one logged above as 'Current working directory').
2.  Inside '.env.local', ensure the line looks like: NEXT_PUBLIC_FIREBASE_API_KEY=YourActualApiKeyHere
3.  Replace 'YourActualApiKeyHere' with your real Firebase API Key from your Firebase project settings.
4.  Check for any typos in the variable name ('NEXT_PUBLIC_FIREBASE_API_KEY') or the API key value itself.
5.  Ensure all other NEXT_PUBLIC_FIREBASE_... variables are also correctly set in '.env.local'.
6.  MOST IMPORTANTLY: You MUST RESTART your development server (e.g., stop and re-run 'npm run dev') after creating or changing the .env.local file. Next.js only loads these variables on startup.
--------------------------------------------------------------------------------------`;
  
  console.error(errorMsg);

  console.log("\n[Firebase Config] Diagnosing .env.local loading issues. Found the following NEXT_PUBLIC_FIREBASE_ prefixed vars on the server (if any):");
  let foundAnyFirebaseVars = false;
  if (typeof process !== 'undefined' && process.env) {
    for (const envKey in process.env) {
      if (envKey.startsWith("NEXT_PUBLIC_FIREBASE_")) {
        console.log(`  - ${envKey}: ${process.env[envKey] ? 'Set (value hidden for security if not API key itself)' : 'MISSING/EMPTY'}`);
        foundAnyFirebaseVars = true;
      }
    }
  }
  if (!foundAnyFirebaseVars) {
    console.log("  - No environment variables starting with 'NEXT_PUBLIC_FIREBASE_' were found. This strongly suggests .env.local is not being loaded or is empty.");
  }
  console.log("--------------------------------------------------------------------------------------\n");

  throw new Error("Firebase API Key (NEXT_PUBLIC_FIREBASE_API_KEY) is not configured. CHECK YOUR .env.local FILE AND RESTART THE SERVER. See terminal logs for details.");
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

// Log the final config object before attempting to initialize
console.log("🚀 [Firebase Config] Final firebaseConfig object before initializeApp (apiKey will be 'YOUR_API_KEY_VAL' if found):", 
  JSON.stringify({
    ...firebaseConfig,
    apiKey: firebaseConfig.apiKey ? 'YOUR_API_KEY_VAL' : undefined // Obfuscate API key in log
  }, null, 2)
);


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
