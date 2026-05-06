import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { initializeAppCheck, ReCaptchaV3Provider, AppCheck, getToken } from "firebase/app-check";
import { getMessaging, Messaging, isSupported as isMessagingSupported } from "firebase/messaging";

// ─── Firebase Config ─────────────────────────────────────────────────────────

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function validateConfig(): boolean {
  const missing = Object.entries(firebaseConfig)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    console.error("[Firebase] Missing environment variables:", missing);
    return false;
  }
  return true;
}

const isConfigValid = validateConfig();

// ─── Firebase App (Singleton) ─────────────────────────────────────────────────

let app: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!isConfigValid) {
    throw new Error("Firebase config is invalid. Check your .env file.");
  }
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }
  return app;
}

// ─── Core Service Singletons ──────────────────────────────────────────────────
// These are eagerly initialized so that Firestore, Auth, and Storage
// are always the same instances throughout the app. We do NOT use Proxy
// wrappers because Firebase's internal checks (instanceof, _delegate, etc.)
// will break if the real instances are wrapped.

const firebaseApp = isConfigValid ? getFirebaseApp() : null;

export const db:      Firestore       = firebaseApp ? getFirestore(firebaseApp) : (null as any);
export const auth:    Auth            = firebaseApp ? getAuth(firebaseApp)      : (null as any);
export const storage: FirebaseStorage = firebaseApp ? getStorage(firebaseApp)  : (null as any);

// Convenience aliases used across the codebase
export const getFirebaseAuth  = (): Auth      => auth;
export const getDbInstance    = (): Firestore => db;

// Set persistent auth session on the client
if (typeof window !== "undefined" && auth) {
  setPersistence(auth, browserLocalPersistence).catch(() => {});
}

// ─── Firebase App Check ───────────────────────────────────────────────────────

let appCheckInstance: AppCheck | null = null;

export function initAppCheck(): AppCheck | null {
  if (typeof window === "undefined") return null;
  if (appCheckInstance) return appCheckInstance;

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY;

  if (!siteKey) {
    console.warn("[AppCheck] NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY not set — App Check not initialized.");
    return null;
  }

  try {
    appCheckInstance = initializeAppCheck(getFirebaseApp(), {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });

    console.log("[AppCheck] Initialized with V3 key.");
    return appCheckInstance;
  } catch (err) {
    console.error("[AppCheck] Initialization failed:", err);
    return null;
  }
}

// Eagerly initialize App Check on the client so the token is ready
// before the first Firestore/Auth/Storage request is made.
if (typeof window !== "undefined") {
  initAppCheck();
}

// ─── App Check Token Helpers ──────────────────────────────────────────────────

// Track whether we've force-refreshed once this session
let firstTokenFetch = true;

/**
 * Returns a valid App Check token string, or null if unavailable.
 * Forces a refresh on the first call to avoid stale cached tokens.
 */
export async function getAppCheckToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const appCheck = initAppCheck();
  if (!appCheck) return null;

  try {
    const forceRefresh = firstTokenFetch;
    firstTokenFetch = false;
    const tokenResult = await getToken(appCheck, forceRefresh);
    return tokenResult.token;
  } catch (err) {
    console.warn("[AppCheck] Token fetch failed, retrying with force refresh...", err);
    try {
      const retryResult = await getToken(appCheck, true);
      firstTokenFetch = false;
      return retryResult.token;
    } catch (retryErr) {
      console.error("[AppCheck] Token fetch failed after retry:", retryErr);
      return null;
    }
  }
}

/** Returns true if App Check is ready and a valid token was obtained. */
export async function ensureAppCheckReady(): Promise<boolean> {
  const token = await getAppCheckToken();
  return !!token;
}

// ─── Fetch Helpers ────────────────────────────────────────────────────────────

/**
 * Merges App Check token into a headers object.
 */
export async function withAppCheckHeaders(
  headers: HeadersInit = {}
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};

  if (headers instanceof Headers) {
    headers.forEach((value, key) => { result[key] = value; });
  } else if (Array.isArray(headers)) {
    headers.forEach(([key, value]) => { result[key] = value; });
  } else {
    Object.assign(result, headers);
  }

  const token = await getAppCheckToken();
  if (token) {
    result["X-Firebase-AppCheck"] = token;
  }

  return result;
}

/**
 * Drop-in replacement for `fetch` that automatically attaches:
 *  - Firebase App Check token (X-Firebase-AppCheck)
 *  - Firebase Auth ID token (Authorization: Bearer)
 */
export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = await withAppCheckHeaders(options.headers);

  // Use the module-level auth singleton — no need for a dynamic import
  if (auth?.currentUser) {
    try {
      const idToken = await auth.currentUser.getIdToken();
      headers["Authorization"] = `Bearer ${idToken}`;
    } catch {
      // Continue without auth token if retrieval fails
    }
  }

  return fetch(url, { ...options, headers });
}

// ─── Firebase Cloud Messaging ─────────────────────────────────────────────────

let messagingInstance: Messaging | null = null;

/**
 * Returns the FCM Messaging instance, or null if not supported.
 * Must be called after the Firebase app is initialized.
 */
export async function getMessagingInstance(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;
  if (messagingInstance) return messagingInstance;

  const supported = await isMessagingSupported();
  if (!supported) {
    console.warn("[Firebase] Cloud Messaging is not supported in this browser.");
    return null;
  }

  messagingInstance = getMessaging(getFirebaseApp());
  console.log("[Firebase] Cloud Messaging initialized.");
  return messagingInstance;
}