import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { initializeAppCheck, ReCaptchaV3Provider, AppCheck, getToken } from "firebase/app-check";
import { getMessaging, Messaging, isSupported as isMessagingSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function validateConfig() {
  const missing = Object.entries(firebaseConfig)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    console.warn("⚠️ Missing Firebase config:", missing.join(", "));
    return false;
  }

  return true;
}

const isConfigValid = validateConfig();


let app: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!isConfigValid) {
    throw new Error("Firebase config is invalid. Check env variables.");
  }

  if (!app) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    console.log("[Firebase] App initialized:", app.name);
  }

  return app;
}


let appCheckInstance: AppCheck | null = null;

export function initAppCheck() {
  if (typeof window === "undefined") return; // SSR guard

  if (appCheckInstance) return appCheckInstance;

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  // Skip App Check if no site key is configured
  if (!siteKey) {
    console.warn("[Firebase] App Check skipped: NEXT_PUBLIC_RECAPTCHA_SITE_KEY not set");
    return null;
  }

  const app = getFirebaseApp();

  try {
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    // Skip App Check on localhost to avoid 403 errors during development
    if (isLocalhost) {
      console.log("[Firebase] App Check skipped on localhost");
      return null;
    }

    appCheckInstance = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });

    console.log("[Firebase] App Check initialized");
    return appCheckInstance;
  } catch (err) {
    console.warn("[Firebase] App Check failed:", err);
    return null;
  }
}

/**
 * Get App Check token for API requests
 * Call this before making sensitive API calls
 */
export async function getAppCheckToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const appCheck = initAppCheck();
  if (!appCheck) {
    console.warn("[Firebase] App Check not initialized");
    return null;
  }

  try {
    const tokenResult = await getToken(appCheck, false); // false = use cached token if available
    return tokenResult.token;
  } catch (err) {
    console.error("[Firebase] Failed to get App Check token:", err);
    return null;
  }
}

/**
 * Headers helper: Adds App Check token to request headers
 */
export async function withAppCheckHeaders(headers: HeadersInit = {}): Promise<HeadersInit> {
  const token = await getAppCheckToken();
  const result: Record<string, string> = {};

  // Copy existing headers
  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      result[key] = value;
    });
  } else if (Array.isArray(headers)) {
    headers.forEach(([key, value]) => {
      result[key] = value;
    });
  } else {
    Object.assign(result, headers);
  }

  // Add App Check token if available
  if (token) {
    result["X-Firebase-AppCheck"] = token;
  }

  return result;
}


// Initialize Firebase services lazily
function getDB(): Firestore {
  return getFirestore(getFirebaseApp());
}

function getAuthInstance(): Auth {
  return getAuth(getFirebaseApp());
}

function getStorageInstance(): FirebaseStorage {
  return getStorage(getFirebaseApp());
}

let messagingInstance: Messaging | null = null;

/**
 * Get Firebase Cloud Messaging instance
 * Must be called AFTER getFirebaseApp() is initialized
 * Returns null if messaging is not supported (e.g., Safari, some browsers)
 */
export async function getMessagingInstance(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null; // SSR guard

  if (messagingInstance) return messagingInstance;

  // Check browser support BEFORE initializing
  const supported = await isMessagingSupported();
  if (!supported) {
    console.warn("[Firebase] Messaging not supported in this browser");
    return null;
  }

  // Initialize messaging AFTER app is ready
  const app = getFirebaseApp();
  messagingInstance = getMessaging(app);
  console.log("[Firebase] Messaging initialized");
  return messagingInstance;
}

export { getDB, getAuthInstance, getStorageInstance };

// ─── Direct singleton exports ──────────────────────────────────────────────
// All files that import from firebase.ts are "use client" components, so this
// module ONLY runs in the browser. We can safely export real instances.
//
// NO PROXY for auth or db — Firebase uses instanceof / _delegate / prototype
// chain checks internally. Any Proxy wrapper silently breaks:
//   - collection(db, ...) → "Expected first argument to be FirebaseFirestore"
//   - signInWithPopup(auth, ...) → auth/internal-error
//   - new RecaptchaVerifier(auth, ...) → runtime failure
// ──────────────────────────────────────────────────────────────────────────

// Eagerly initialize Firebase app FIRST, then services
// This ensures proper initialization order and avoids auth/internal-error
const firebaseApp = isConfigValid ? getFirebaseApp() : null;

export const db: Firestore = firebaseApp ? getFirestore(firebaseApp) : (null as any);
export const auth: Auth = firebaseApp ? getAuth(firebaseApp) : (null as any);
export const storage: FirebaseStorage = firebaseApp ? getStorage(firebaseApp) : (null as any);

// Keep getFirebaseAuth() and getDbInstance() as aliases for callers that were updated
export const getFirebaseAuth = (): Auth => auth;
export const getDbInstance = (): Firestore => db;