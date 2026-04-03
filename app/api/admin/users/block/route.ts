import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { verifySuperAdmin } from "@/lib/rbac";

/**
 * POST /api/admin/users/block
 * Block a user (superadmin only)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify superadmin access
    const admin = await verifySuperAdmin(request);
    
    const { userId, blocked } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }
    
    // Update user's blocked status
    await adminDb.collection("users").doc(userId).update({
      blocked: blocked === true,
      blockedAt: blocked ? FieldValue.serverTimestamp() : null,
      blockedBy: blocked ? admin.uid : null,
      updated_at: FieldValue.serverTimestamp(),
    });
    
    // Log the action
    await adminDb.collection("admin_logs").add({
      adminId: admin.uid,
      action: blocked ? "BLOCK_USER" : "UNBLOCK_USER",
      resourceId: userId,
      details: JSON.stringify({
        email: admin.email,
        reason: blocked ? "User blocked by superadmin" : "User unblocked",
      }),
      status: "SUCCESS",
      createdAt: FieldValue.serverTimestamp(),
    });
    
    // Also log to security logs
    await adminDb.collection("security_logs").add({
      type: "ADMIN_ACTION",
      action: blocked ? "USER_BLOCKED" : "USER_UNBLOCKED",
      userId: admin.uid,
      role: admin.role,
      metadata: {
        targetUserId: userId,
        blocked: blocked,
      },
      status: "SUCCESS",
      timestamp: new Date(),
    });
    
    return NextResponse.json({
      success: true,
      message: blocked ? "User blocked successfully" : "User unblocked successfully",
    });
  } catch (error: any) {
    console.error("Block user error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to block user" },
      { status: error.status || 500 }
    );
  }
}
