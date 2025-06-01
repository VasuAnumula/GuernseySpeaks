
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
try {
  if (typeof process !== 'undefined' && typeof process.cwd === 'function') {
    console.log(`ℹ️ [Firebase Config] Current working directory (where .env.local should be if running locally): ${process.cwd()}`);
  } else {
    console.log("ℹ️ [Firebase Config] process.cwd() not available (client-side bundle or specific server environment).");
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
    if (key === 'apiKey') {
      criticalEnvVarMissing = true;
    }
  }
}

if (criticalEnvVarMissing) {
  let errorMsg = `
--------------------------------------------------------------------------------------
❌ FATAL ERROR: Firebase API Key (NEXT_PUBLIC_FIREBASE_API_KEY) is MISSING or UNDEFINED in the server environment.
The application will not work correctly.

👉 Troubleshooting Steps:

   IF RUNNING LOCALLY (e.g., with 'npm run dev'):
   1. Ensure you have a file named exactly '.env.local' in your project ROOT directory.
      (The root directory is usually logged above as 'Current working directory').
   2. Inside '.env.local', ensure the line is: NEXT_PUBLIC_FIREBASE_API_KEY=YourActualApiKeyHere
   3. Replace 'YourActualApiKeyHere' with your real Firebase API Key.
   4. Check for typos in the variable name or the API key value.
   5. You MUST RESTART your development server after creating or changing '.env.local'.

   IF DEPLOYED (e.g., to Firebase Studio / App Hosting):
   1. Check your 'apphosting.yaml' file. Ensure NEXT_PUBLIC_FIREBASE_API_KEY is correctly defined there.
   2. Check the Firebase Console: Go to App Hosting -> Your Backend -> Configuration / Environment Variables.
      Settings in the Firebase Console UI will OVERRIDE 'apphosting.yaml'.
   3. Ensure the API key value is correct and active for your project ('${firebaseEnvVars.projectId || 'your-project-id'}').
   4. A REDEPLOY might be necessary after changing environment variables in the hosting platform.

Server-side environment variables found starting with 'NEXT_PUBLIC_FIREBASE_':`;
  if (typeof process !== 'undefined' && process.env) {
    let foundAny = false;
    for (const envKey in process.env) {
      if (envKey.startsWith("NEXT_PUBLIC_FIREBASE_")) {
        errorMsg += `\n  - ${envKey}: ${process.env[envKey] ? 'Set (value hidden)' : 'MISSING/EMPTY'}`;
        foundAny = true;
      }
    }
    if (!foundAny) {
      errorMsg += "\n  - None found. This strongly suggests .env.local (if local) or hosting configuration (if deployed) is not being loaded or is empty.";
    }
  } else {
     errorMsg += "\n  - Could not inspect process.env on the server.";
  }
  errorMsg += "\n--------------------------------------------------------------------------------------";
  
  console.error(errorMsg);
  throw new Error("Firebase API Key (NEXT_PUBLIC_FIREBASE_API_KEY) is not configured. CHECK YOUR .env.local (for local) OR apphosting.yaml / Firebase Console UI (for deployed) AND RESTART/REDEPLOY. See terminal logs for detailed diagnostics.");
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

console.log("🚀 [Firebase Config] Final firebaseConfig object before initializeApp (apiKey will be 'YOUR_API_KEY_VAL' if found):", 
  JSON.stringify({
    ...firebaseConfig,
    apiKey: firebaseConfig.apiKey ? 'YOUR_API_KEY_VAL' : undefined 
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
    console.error("🚨 Double-check your Firebase config values in .env.local (local) or apphosting.yaml / Firebase Console (deployed) against your Firebase project settings.");
    throw e; 
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
     console.error("🚨 This specific error (invalid-api-key) strongly suggests the API Key value (from .env.local or hosting config) is incorrect or not valid for your Firebase project, even if it was loaded.");
  }
  throw e; 
}

export { app, auth, db };
