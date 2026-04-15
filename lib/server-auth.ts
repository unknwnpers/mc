import { getAuth } from "firebase-admin/auth";
import { adminDb } from "./firebase-admin";

export async function verifyUser(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Unauthorized: Missing or invalid token");
  }

  const token = authHeader.split("Bearer ")[1];
  if (!token) throw new Error("Unauthorized: Token split failed");

  try {
    // Verify the ID token using the Firebase Admin SDK
    const decodedToken = await getAuth().verifyIdToken(token);
    
    // Optionally fetch the user's role from Firestore if it's not set in custom claims
    // For safety, let's inject it into the returned object from the 'users' collection
    const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
    const userData = userDoc.data();
    const role = userData?.role || "customer";

    return {
      ...decodedToken,
      role
    };
  } catch (error: any) {
    console.error("[verifyUser] Token verification failed:", error.message);
    if (error.code === 'auth/id-token-expired') {
      throw new Error("Unauthorized: Token expired");
    }
    if (error.code === 'auth/id-token-revoked') {
      throw new Error("Unauthorized: Token revoked");
    }
    throw new Error("Unauthorized: Invalid token");
  }
}
