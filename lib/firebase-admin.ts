import { initializeApp, cert, getApps, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAppCheck } from "firebase-admin/app-check";
import { Redis } from "@upstash/redis";

// Initialize Upstash Redis for replay protection
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_TOKEN;

const redis = redisUrl && redisToken
  ? new Redis({ url: redisUrl, token: redisToken })
  : null;

if (!redis) {
  console.warn("[App Check] Redis not configured - replay protection disabled");
}

// Use individual env vars (Vercel-compatible)
const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

let app: App;

if (!getApps().length) {
  if (projectId && clientEmail && privateKey) {
    // Handle multiple formats of escaped newlines
    // Vercel/env files may have \\n or \n depending on how they're stored
    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

    try {
      app = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: formattedPrivateKey,
        }),
      });
      console.log('✅ Firebase Admin initialized successfully');
    } catch (error) {
      console.error('❌ Firebase Admin initialization failed:', error);
      throw error;
    }
  } else {
    console.warn(
      '⚠️ Missing Firebase Admin credentials.\n' +
      'Required env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY\n' +
      'Check Vercel → Settings → Environment Variables'
    );
    throw new Error('Firebase Admin credentials not configured');
  }
} else {
  app = getApps()[0];
}

export const adminDb = getFirestore(app);

/**
 * Verify Firebase App Check token from server-side
 * Use this to protect sensitive API endpoints
 */
export async function verifyAppCheckToken(token: string): Promise<{ valid: boolean; appId?: string; error?: string }> {
  if (!token) {
    return { valid: false, error: "App Check token is required" };
  }

  try {
    const appCheck = getAppCheck(app);
    const claims = await appCheck.verifyToken(token);
    return { valid: true, appId: claims.appId };
  } catch (error: any) {
    console.error("[AppCheck] Token verification failed:", error.message);

    // Map common errors to user-friendly messages
    if (error.code === "app-check/invalid-token") {
      return { valid: false, error: "Invalid App Check token" };
    }
    if (error.code === "app-check/token-expired") {
      return { valid: false, error: "App Check token expired" };
    }

    return { valid: false, error: "App Check verification failed" };
  }
}

/**
 * Extract and verify App Check token from request headers
 * Returns verification result for use in API routes
 */
export async function verifyAppCheckFromRequest(
  request: Request
): Promise<{ valid: boolean; appId?: string; error?: string }> {
  const token = request.headers.get("X-Firebase-AppCheck");

  if (!token) {
    return { valid: false, error: "Missing App Check token" };
  }

  return verifyAppCheckToken(token);
}

/**
 * Verify App Check token WITH replay protection
 * Use this for HIGH-RISK endpoints (payments, coupons, etc.)
 * Requires Redis (Upstash) to be configured
 */
export async function verifyAppCheckWithReplayProtection(
  request: Request,
  ttlSeconds: number = 60
): Promise<{ valid: boolean; appId?: string; error?: string }> {
  const token = request.headers.get("X-Firebase-AppCheck");

  if (!token) {
    return { valid: false, error: "Missing App Check token" };
  }

  // Step 1: Verify token is valid
  const verification = await verifyAppCheckToken(token);
  if (!verification.valid) {
    return verification;
  }

  // Step 2: Replay protection (if Redis available)
  if (redis) {
    try {
      // Create hash of token to use as key
      const crypto = await import("crypto");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const key = `appcheck:${tokenHash}`;

      // Check if token was already used
      const exists = await redis.get(key);
      if (exists) {
        console.warn("[App Check] Replay attack detected - token already used");
        return { valid: false, error: "Token replay detected" };
      }

      // Mark token as used with TTL
      await redis.set(key, "1", { ex: ttlSeconds });
    } catch (error) {
      console.error("[App Check] Replay protection error:", error);
      // Continue without replay protection if Redis fails
    }
  }

  return verification;
}
