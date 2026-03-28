// import { initializeApp, getApps, getApp } from 'firebase/app';
// import { getFirestore } from 'firebase/firestore';
// import { getAuth } from "firebase/auth";

// // Firebase config (from .env.local)
// const firebaseConfig = {
//   apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
//   authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
//   projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
//   storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
//   messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
//   appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
// };

// // Debug (optional — remove later)
// console.log('Firebase Project:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

// // Prevent re-initialization (Next.js hot reload safe)
// let app;
// let db: any = null;
// let auth: any = null;

// const isConfigValid = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

// if (isConfigValid) {
//   try {
//     app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
//     db = getFirestore(app);
//     auth = getAuth(app);
//   } catch (error) {
//     console.error("Firebase initialization failed:", error);
//   }
// } else {
//   console.warn("Firebase configuration is missing. Operating in limited/build mode.");
// }

// export { db, auth };

// // ✅ CLEAN Product type (matches Firestore)
// export interface Product {
//   id: string;
//   name: string;
//   price: number;
//   image: string;           // Keeping for safety
//   image_url: string;       // New field
//   description?: string;
//   category_id: string;
//   category_slug: string;   // New field
//   stock: number;
//   is_featured: boolean;
//   created_at: any;
// }

// // ✅ SIMPLE Category type (use later when needed)
// export interface Category {
//   id: string;
//   name: string;
//   slug: string;
//   description?: string;
//   image_url?: string;
//   created_at?: any;
// }

// // ✅ User Profile type
// export interface UserProfile {
//   uid: string;
//   name: string | null;
//   email: string | null;
//   address?: string;
//   phone?: string;
//   updated_at: any;
// }


import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// ✅ STRICT config validation
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 🔥 HARD FAIL if config missing
if (
  !firebaseConfig.apiKey ||
  !firebaseConfig.authDomain ||
  !firebaseConfig.projectId ||
  !firebaseConfig.appId
) {
  throw new Error("🔥 Firebase ENV variables are missing");
}

// ✅ SAFE INIT (no nulls EVER)
const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();

export const db = getFirestore(app);
export const auth = getAuth(app);