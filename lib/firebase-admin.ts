import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

let app;

try {
  if (serviceAccountKey) {
    // robustly handle escaped newlines in env variables
    const formattedKey = serviceAccountKey.replace(/\\n/g, '\n');
    const serviceAccount = JSON.parse(formattedKey);
    app = getApps().length === 0
      ? initializeApp({ credential: cert(serviceAccount) })
      : getApps()[0];
  } else if (projectId && clientEmail && privateKey) {
    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
    app = getApps().length === 0
      ? initializeApp({
          credential: cert({
            projectId: projectId,
            clientEmail: clientEmail,
            privateKey: formattedPrivateKey,
          }),
        })
      : getApps()[0];
  } else {
    console.warn("No Firebase Admin credentials found. Initialization may fail or use default config.");
    if (getApps().length === 0) {
      app = initializeApp();
    } else {
      app = getApps()[0];
    }
  }
} catch (error) {
  console.error("Firebase Admin Initialization Error:", error);
}

export const adminDb = getFirestore(app!);
