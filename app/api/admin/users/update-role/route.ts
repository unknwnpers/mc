import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { verifySuperAdmin } from "@/lib/rbac";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/users/update-role
 * Update user role (superadmin only)
 * Body: { userId: string, role: "customer" | "admin" | "superadmin" }
 */
export async function POST(req: NextRequest) {
  try {
    // Only superadmins can update roles
    const admin = await verifySuperAdmin(req);
    
    const body = await req.json();
    const { userId, role } = body;

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
        { success: false, error: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
        { status: 400 }
      );
    }

    // Prevent demoting yourself
    if (userId === admin.uid && role !== "superadmin") {
      return NextResponse.json(
        { success: false, error: "Cannot change your own role" },
        { status: 403 }
      );
    }

    const userRef = adminDb.collection("users").doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const userData = userSnap.data();
    const oldRole = userData?.role || "customer";

    // Update user role
    await userRef.update({
      role,
      updatedAt: FieldValue.serverTimestamp(),
      roleUpdatedBy: admin.uid,
      roleUpdatedAt: FieldValue.serverTimestamp(),
    });

    // Log the action
    await adminDb.collection("admin_logs").add({
      adminId: admin.uid,
      action: "update_user_role",
      resourceId: userId,
      details: `Changed role from "${oldRole}" to "${role}" for user ${userData?.email || userId}`,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: `User role updated to "${role}"`,
      data: {
        userId,
        oldRole,
        newRole: role,
      },
    });
  } catch (error: any) {
    console.error("[Update Role API] Error:", error);
    
    if (error.status) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    
    return NextResponse.json(
      { success: false, error: "Failed to update role" },
      { status: 500 }
    );
  }
}
