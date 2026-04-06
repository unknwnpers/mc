import { NextRequest, NextResponse } from "next/server";
import { verifySuperAdmin } from "@/lib/rbac";
import { adminDb } from "@/lib/firebase-admin";
import { logSecurityEvent } from "@/lib/logger";
import { getClientInfo } from "@/lib/logger";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * DELETE /api/admin/coupons/[code]
 * Delete coupon (SUPERADMIN ONLY)
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const superAdmin = await verifySuperAdmin(request);
    const { ip, userAgent } = getClientInfo(request);
    const { code } = await context.params;
    
    if (!code) {
      return NextResponse.json(
        { success: false, error: "Coupon code is required" },
        { status: 400 }
      );
    }
    
    const couponRef = adminDb.collection("coupons").doc(code.toUpperCase());
    const doc = await couponRef.get();
    
    if (!doc.exists) {
      return NextResponse.json(
        { success: false, error: "Coupon not found" },
        { status: 404 }
      );
    }
    
    await couponRef.delete();
    
    // Log security event
    await logSecurityEvent({
      type: "ADMIN_ACTION",
      action: "DELETE_COUPON",
      userId: superAdmin.uid,
      role: superAdmin.role,
      ip,
      userAgent,
      status: "SUCCESS",
      metadata: {
        couponCode: code.toUpperCase(),
      },
      timestamp: new Date(),
    });
    
    return NextResponse.json({
      success: true,
      message: "Coupon deleted successfully",
    });
  } catch (error: any) {
    console.error("Failed to delete coupon:", error);
    
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete coupon" },
      { status: error.status || 500 }
    );
  }
}
