import { NextRequest, NextResponse } from "next/server";
import { verifySuperAdmin, verifyAdmin } from "@/lib/rbac";
import { adminDb } from "@/lib/firebase-admin";
import { logSecurityEvent } from "@/lib/logger";
import { getClientInfo } from "@/lib/logger";

/**
 * POST /api/admin/users/update-role
 * Update user role (SUPERADMIN ONLY)
 */
export async function POST(request: NextRequest) {
  try {
    // SUPERADMIN ONLY
    const superAdmin = await verifySuperAdmin(request);
    
    const { userId, role } = await request.json();
    const { ip, userAgent } = getClientInfo(request);
    
    if (!userId || !role) {
      return NextResponse.json(
        { success: false, error: "userId and role are required" },
        { status: 400 }
      );
    }
    
    // Validate role
    const validRoles = ["customer", "admin", "superadmin"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: "Invalid role. Must be one of: customer, admin, superadmin" },
        { status: 400 }
      );
    }
    
    // Prevent self-demotion
    if (userId === superAdmin.uid && superAdmin.role !== role) {
      return NextResponse.json(
        { success: false, error: "Cannot change your own role" },
        { status: 403 }
      );
    }
    
    // Get current user data
    const userRef = adminDb.collection("users").doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }
    
    const currentRole = userDoc.data()?.role || "customer";
    
    // Update role in Firestore
    await userRef.update({
      role,
      updatedAt: new Date(),
    });
    
    // Log security event
    await logSecurityEvent({
      type: "SECURITY",
      action: "ROLE_CHANGE",
      userId: superAdmin.uid,
      role: superAdmin.role,
      ip,
      userAgent,
      status: "SUCCESS",
      metadata: {
        targetUserId: userId,
        previousRole: currentRole,
        newRole: role,
      },
      timestamp: new Date(),
    });
    
    return NextResponse.json({
      success: true,
      message: `User role updated to ${role}`,
    });
  } catch (error: any) {
    console.error("Failed to update user role:", error);
    
    await logSecurityEvent({
      type: "SECURITY",
      action: "ROLE_CHANGE_FAILED",
      status: "FAILED",
      metadata: { error: error.message },
      timestamp: new Date(),
    });
    
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update role" },
      { status: error.status || 500 }
    );
  }
}

/**
 * GET /api/admin/users/list
 * List all users (ADMIN+)
 */
export async function GET(request: NextRequest) {
  try {
    // ADMIN+ required
    const admin = await verifyAdmin(request);
    
    // Fetch users from Firestore
    const usersSnapshot = await adminDb.collection("users").get();
    
    const users = usersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })).map((user: any) => ({
      id: user.id,
      email: user.email || "N/A",
      name: user.name || "Anonymous",
      role: user.role || "customer",
      createdAt: user.createdAt?.toDate ? user.createdAt.toDate() : null,
      updatedAt: user.updatedAt?.toDate ? user.updatedAt.toDate() : null,
    }));
    
    return NextResponse.json({
      success: true,
      users,
      count: users.length,
    });
  } catch (error: any) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch users" },
      { status: error.status || 500 }
    );
  }
}
