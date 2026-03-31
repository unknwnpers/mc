import { getAuth } from "firebase-admin/auth";
import { adminDb } from "./firebase-admin";

/**
 * Unified admin auth middleware.
 * Verifies the Bearer token and asserts admin/superadmin role.
 * Throws on any failure — API routes should let it propagate to catch().
 */
export async function verifyAdmin(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw Object.assign(new Error("Unauthorized: Missing token"), { status: 401 });
  }

  const token = authHeader.split("Bearer ")[1];
  if (!token) {
    throw Object.assign(new Error("Unauthorized: Malformed token"), { status: 401 });
  }

  const decoded = await getAuth().verifyIdToken(token);

  // Check custom claims first (fastest path)
  if (decoded.role === "admin" || decoded.role === "superadmin") {
    return decoded;
  }

  // Fall back to Firestore role (for existing users before custom claims)
  const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
  const role = userDoc.data()?.role;

  if (role !== "admin" && role !== "superadmin") {
    throw Object.assign(new Error("Forbidden: Admin access required"), { status: 403 });
  }

  return { ...decoded, role };
}
