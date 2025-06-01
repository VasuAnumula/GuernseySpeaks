
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
let errorMsg = "❌ FATAL ERROR: Firebase configuration is incomplete. Review server logs for details.\n";
errorMsg += "Required Firebase environment variables:\n";

const requiredVarsDisplay: Record<string, string | undefined> = {
  NEXT_PUBLIC_FIREBASE_API_KEY: firebaseEnvVars.apiKey,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: firebaseEnvVars.authDomain,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: firebaseEnvVars.projectId,
  // Other vars are important but API key is most critical for initialization
};

for (const [envVarName, value] of Object.entries(requiredVarsDisplay)) {
  errorMsg += `  - ${envVarName}: ${value ? (envVarName === 'NEXT_PUBLIC_FIREBASE_API_KEY' ? 'Present (value hidden)' : `"${value}"`) : '*** MISSING ***'}\n`;
  if (envVarName === 'NEXT_PUBLIC_FIREBASE_API_KEY' && !value) {
    criticalEnvVarMissing = true;
  }
}

if (criticalEnvVarMissing) {
  errorMsg += "\n👉 Troubleshooting Steps:\n";
  errorMsg += "   IF RUNNING LOCALLY (e.g., 'npm run dev'):\n";
  errorMsg += "   1. Ensure '.env.local' file exists in your project ROOT directory.\n";
  errorMsg += "   2. Verify `NEXT_PUBLIC_FIREBASE_API_KEY` and other Firebase variables are correctly set within it.\n";
  errorMsg += "   3. You MUST RESTART your development server after changes to '.env.local'.\n";
  errorMsg += "   IF DEPLOYED (e.g., to Firebase Studio / App Hosting):\n";
  errorMsg += "   1. Check 'apphosting.yaml' for correct `NEXT_PUBLIC_FIREBASE_API_KEY` and other Firebase variables.\n";
  errorMsg += "   2. CRITICAL: Check Environment Variable settings in the Firebase Console for your App Hosting backend. Settings in the UI OVERRIDE 'apphosting.yaml'.\n";
  errorMsg += "   3. Ensure the API key value is correct and active for your project ('" + (firebaseEnvVars.projectId || 'your-project-id') + "').\n";
  errorMsg += "   4. A REDEPLOY is necessary after changing environment variables in the hosting platform or 'apphosting.yaml'.\n";
  errorMsg += "Server-side environment variables found starting with 'NEXT_PUBLIC_FIREBASE_':\n";
    if (typeof process !== 'undefined' && process.env) {
        let foundAny = false;
        for (const envKey in process.env) {
            if (envKey.startsWith("NEXT_PUBLIC_FIREBASE_")) {
                errorMsg += `  - ${envKey}: ${process.env[envKey] ? (envKey === "NEXT_PUBLIC_FIREBASE_API_KEY" ? 'Set (value hidden)' : `Value: "${process.env[envKey]}"`): 'MISSING/EMPTY'}\n`;
                foundAny = true;
            }
        }
        if (!foundAny) {
            errorMsg += "  - None found. This strongly suggests .env.local (if local) or hosting configuration (if deployed) is not being loaded or is empty.\n";
        }
    } else {
        errorMsg += "  - Could not inspect process.env on the server.\n";
    }
  errorMsg += "--------------------------------------------------------------------------------------\n";
  
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
