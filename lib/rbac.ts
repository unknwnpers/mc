import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "./firebase-admin";

/**
 * Verify user has required role(s)
 * Throws on failure - let API route catch() handle it
 */
export async function verifyRole(req: NextRequest, allowedRoles: string[]) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw Object.assign(new Error("Unauthorized: Missing token"), { status: 401 });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    throw Object.assign(new Error("Unauthorized: Malformed token"), { status: 401 });
  }

  try {
    // Verify token with Firebase Auth
    const decoded = await import("firebase-admin/auth").then(m => m.getAuth().verifyIdToken(token));
    
    // Get user document from Firestore
    const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
    
    if (!userDoc.exists) {
      throw Object.assign(new Error("User not found"), { status: 404 });
    }

    const userData = userDoc.data();
    const userRole = userData?.role || "customer";

    // Check if user role is in allowed roles
    if (!allowedRoles.includes(userRole)) {
      throw Object.assign(new Error(`Forbidden: Required role is one of [${allowedRoles.join(", ")}]`), { 
        status: 403 
      });
    }

    return {
      uid: decoded.uid,
      email: decoded.email,
      role: userRole,
      profile: userData,
    };
  } catch (error: any) {
    if (error.status) {
      throw error; // Re-throw auth errors with status
    }
    throw Object.assign(new Error("Unauthorized: Invalid token"), { status: 401 });
  }
}

/**
 * Convenience wrapper for admin-only routes
 */
export async function verifyAdmin(req: NextRequest) {
  return verifyRole(req, ["admin", "superadmin"]);
}

/**
 * Convenience wrapper for superadmin-only routes
 */
export async function verifySuperAdmin(req: NextRequest) {
  return verifyRole(req, ["superadmin"]);
}
