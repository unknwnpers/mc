import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth, setPersistence, browserLocalPersistence } from "firebase/auth";
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
    return false;
  }

  return true;
}

const isConfigValid = validateConfig();

// SSR-safe Firebase initialization
let app: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp {
  // Prevent SSR initialization
  if (typeof window === "undefined") {
    throw new Error("Firebase can only be initialized on the client side");
  }
  
  if (!isConfigValid) {
    throw new Error("Firebase config is invalid. Check env variables.");
  }

  if (!app) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }

  return app;
}


let appCheckInstance: AppCheck | null = null;

export function initAppCheck() {
  if (typeof window === "undefined") return;

  if (appCheckInstance) return appCheckInstance;

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (!siteKey) return null;

  const app = getFirebaseApp();

  try {
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    // Enable debug token for local development
    if (isLocalhost) {
      // @ts-ignore
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }

    appCheckInstance = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });

    return appCheckInstance;
  } catch (err) {
    console.error("[AppCheck] Init failed:", err);
    return null;
  }
}

// Track first token fetch per session
let firstTokenFetch = true;

/**
 * Get App Check token for API requests
 * First call forces refresh, subsequent calls use cache
 */
export async function getAppCheckToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const appCheck = initAppCheck();
  if (!appCheck) {
    console.warn("[Firebase] App Check not initialized");
    return null;
  }

  try {
    // 🔥 First call after refresh → FORCE refresh
    // Subsequent calls → allow cached
    const forceRefresh = firstTokenFetch;
    firstTokenFetch = false;
    
    const tokenResult = await getToken(appCheck, forceRefresh);
    return tokenResult.token;
  } catch (err) {
    console.warn("[Firebase] Token fetch failed, retrying with force...", err);
    
    // Retry once with force refresh
    try {
      const retryResult = await getToken(appCheck, true);
      firstTokenFetch = false;
      return retryResult.token;
    } catch (retryErr) {
      console.error("[Firebase] Token fetch failed completely:", retryErr);
      return null;
    }
  }
}

/**
 * Ensure App Check is ready before making API calls
 * Use this before critical API calls on app load
 */
export async function ensureAppCheckReady(): Promise<boolean> {
  const token = await getAppCheckToken();
  return !!token;
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

/**
 * API fetch helper with automatic App Check token
 * Use this instead of raw fetch for all API calls
 */
export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = await withAppCheckHeaders(options.headers);
  
  return fetch(url, {
    ...options,
    headers,
  });
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

// Only initialize Firebase on the client side
// During SSR/static generation, these will be null
let firebaseApp: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;
let storageInstance: FirebaseStorage | null = null;
let persistenceSet = false;

// Initialize Firebase services lazily on first access
// Returns null during SSR to prevent "Service firestore is not available" errors
function ensureFirebaseApp(): FirebaseApp | null {
  if (typeof window === "undefined") {
    return null;
  }
  if (!firebaseApp) {
    firebaseApp = getFirebaseApp();
  }
  return firebaseApp;
}

function ensureDb(): Firestore | null {
  if (typeof window === "undefined") {
    return null;
  }
  if (!dbInstance) {
    const app = ensureFirebaseApp();
    if (!app) return null;
    dbInstance = getFirestore(app);
  }
  return dbInstance;
}

function ensureAuth(): Auth | null {
  if (typeof window === "undefined") {
    return null;
  }
  if (!authInstance) {
    const app = ensureFirebaseApp();
    if (!app) return null;
    authInstance = getAuth(app);
    if (!persistenceSet) {
      persistenceSet = true;
      setPersistence(authInstance, browserLocalPersistence).catch(() => {
        // Silent fail
      });
    }
  }
  return authInstance;
}

function ensureStorage(): FirebaseStorage | null {
  if (typeof window === "undefined") {
    return null;
  }
  if (!storageInstance) {
    const app = ensureFirebaseApp();
    if (!app) return null;
    storageInstance = getStorage(app);
  }
  return storageInstance;
}

// Export getter functions for safe access
export const getDb = ensureDb;
export const getAuthClient = ensureAuth;
export const getStorageClient = ensureStorage;

// Backward-compatible direct exports - these use Proxies to lazy-init
// During SSR, they return empty objects that will be populated on client
// This allows existing code like `import { db } from '@/lib/firebase'` to work
const createServiceProxy = <T extends object>(
  getter: () => T | null,
  name: string
): T => {
  return new Proxy({} as T, {
    get(_, prop) {
      if (typeof window === "undefined") {
        // Return noop functions during SSR for common Firebase methods
        if (prop === 'collection' || prop === 'doc') return () => ({}) as any;
        if (prop === 'onAuthStateChanged') return () => () => {};
        if (prop === 'currentUser') return null;
        return undefined;
      }
      const instance = getter();
      if (!instance) {
        throw new Error(`${name} is not available`);
      }
      return (instance as any)[prop];
    }
  });
};

export const db: Firestore = createServiceProxy(ensureDb, 'Firestore');
export const auth: Auth = createServiceProxy(ensureAuth, 'Auth');
export const storage: FirebaseStorage = createServiceProxy(ensureStorage, 'Storage');

// Keep getFirebaseAuth() and getDbInstance() as aliases for callers that were updated
export const getFirebaseAuth = ensureAuth;
export const getDbInstance = ensureDb;