import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Use individual env vars (Vercel-compatible)
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

let app;

if (!getApps().length) {
  if (projectId && clientEmail && privateKey) {
    // Handle escaped newlines in Vercel env vars
    // Split raw \n and join with actual newlines
    const formattedPrivateKey = privateKey.split(String.raw`\n`).join('\n');
    
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
