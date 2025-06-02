
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// --- Enhanced Environment Variable Inspection (Server-Side) ---
console.log("🔎 [Firebase Config] Initial inspection of `process.env` for 'NEXT_PUBLIC_FIREBASE_' variables (server-side at module load):");
if (typeof process !== 'undefined' && process.env) {
  let foundRelevantVars = false;
  Object.keys(process.env).forEach(key => {
    if (key.startsWith("NEXT_PUBLIC_FIREBASE_")) {
      foundRelevantVars = true;
      const value = process.env[key];
      if (key === "NEXT_PUBLIC_FIREBASE_API_KEY") {
        console.log(`  🔑 ${key}: ${value ? 'Exists (actual value hidden for security)' : '!!! CRITICAL: MISSING or UNDEFINED !!!'}`);
      } else {
        console.log(`  🔑 ${key}: ${value ? `Value: "${value}"` : '!!! MISSING or UNDEFINED !!!'}`);
      }
    }
  });
  if (!foundRelevantVars) {
    console.log("  ⚠️ No environment variables starting with 'NEXT_PUBLIC_FIREBASE_' were found in `process.env` at this point.");
  }
} else {
  console.log("  ⚠️ `process.env` or `process` is undefined (this is highly unexpected on the server during module load).");
}
console.log("--- End of initial `process.env` inspection ---");


// --- Original Environment Variable Check Logic ---
const firebaseEnvVars = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log("🔎 [Firebase Config] Checking specific environment variables values (server-side):");
try {
  if (typeof process !== 'undefined' && typeof process.cwd === 'function') {
    console.log(`ℹ️ [Firebase Config] Current working directory (where .env.local should be in project root): ${process.cwd()}`);
  } else {
    console.log("ℹ️ [Firebase Config] process.cwd() not available (client-side bundle or specific server environment).");
  }
} catch (e) {
    console.warn("ℹ️ [Firebase Config] Could not determine current working directory.", e);
}

let criticalEnvVarMissing = false;
if (!firebaseEnvVars.apiKey) {
    criticalEnvVarMissing = true;
}

if (criticalEnvVarMissing) {
  const errorMsg = "ACTION REQUIRED: CRITICAL SERVER-SIDE CONFIGURATION ERROR - Firebase API Key Missing.\n" +
    "The `NEXT_PUBLIC_FIREBASE_API_KEY` was NOT found in the server's runtime environment (process.env).\n" +
    "This means the Next.js server (running on Firebase App Hosting) cannot initialize Firebase.\n\n" +
    "FOR A DEPLOYED APP ON FIREBASE APP HOSTING:\n" +
    "  1. Go to the Firebase Console -> App Hosting -> Your Backend.\n" +
    "  2. Check the 'Environment Variables' section in the UI.\n" +
    "  3. Ensure `NEXT_PUBLIC_FIREBASE_API_KEY` is correctly set there. THE UI OVERRIDES `apphosting.yaml`.\n" +
    "  4. If `apphosting.yaml` is the intended source, ensure the variable is NOT set in the UI, or its UI value matches.\n\n" +
    "FOR LOCAL DEVELOPMENT (e.g., `npm run dev`):\n" +
    "  1. Check your `.env.local` file in the project root.\n" +
    "  2. Ensure `NEXT_PUBLIC_FIREBASE_API_KEY` is correctly defined there.\n\n" +
    "IMPORTANT: A FULL RESTART (local dev) or REDEPLOY (App Hosting) IS REQUIRED after any changes to environment variables.\n\n" +
    "*** CONSULT YOUR SERVER LOGS *** for detailed diagnostics, including an inspection of `process.env` that occurs before this error.";

  console.error("❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌");
  console.error(errorMsg);
  console.error("Server-side `process.env` keys at time of error (for NEXT_PUBLIC_FIREBASE_*):");
    if (typeof process !== 'undefined' && process.env) {
        let foundAny = false;
        for (const envKey in process.env) {
            if (envKey.startsWith("NEXT_PUBLIC_FIREBASE_")) {
                 console.error(`  - ${envKey}: ${process.env[envKey] ? (envKey === "NEXT_PUBLIC_FIREBASE_API_KEY" ? 'Value Present (hidden for security)' : `Value: "${process.env[envKey]}"`): 'Value MISSING/EMPTY'}`);
                foundAny = true;
            }
        }
        if (!foundAny) {
            console.error("  - No variables starting with 'NEXT_PUBLIC_FIREBASE_' found in server `process.env`.");
        }
    } else {
        console.error("  - Could not inspect `process.env` on the server at time of error.");
    }
  console.error("❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌");
  throw new Error(errorMsg); // This error will be caught by Next.js and displayed.
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

console.log("🚀 [Firebase Config] Final firebaseConfig object for initializeApp (API key value hidden):",
  JSON.stringify({
    ...firebaseConfig,
    apiKey: firebaseConfig.apiKey ? 'PRESENT (value hidden)' : 'MISSING!!!'
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
    
