import { NextRequest, NextResponse } from "next/server";
import { verifySuperAdmin } from "@/lib/rbac";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { logSecurityEvent } from "@/lib/logger";
import { getClientInfo } from "@/lib/logger";

// Force dynamic rendering - this route uses request-based auth
export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/coupons/update
 * Update coupon (SUPERADMIN ONLY)
 */
export async function PATCH(request: NextRequest) {
  try {
    const superAdmin = await verifySuperAdmin(request);
    const { ip, userAgent } = getClientInfo(request);
    
    const { code, updates } = await request.json();
    
    if (!code) {
      return NextResponse.json(
        { success: false, error: "Coupon code is required" },
        { status: 400 }
      );
    }
    
    // Validate updates object exists
    if (!updates || typeof updates !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid updates data" },
        { status: 400 }
      );
    }
    
    const allowedUpdates = ["active", "usageLimit", "maxDiscount", "expiresAt"];
    const updateData: any = {};
    
    for (const key of Object.keys(updates)) {
      if (allowedUpdates.includes(key)) {
        // Handle date conversion to ISO UTC
        if (key === "expiresAt") {
          updateData[key] = updates[key] ? new Date(updates[key]).toISOString() : null;
        } else {
          updateData[key] = updates[key];
        }
      }
    }
    
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid fields to update" },
        { status: 400 }
      );
    }
    
    updateData.updatedAt = FieldValue.serverTimestamp();
    
    const couponRef = adminDb.collection("coupons").doc(code.toUpperCase());
    await couponRef.update(updateData);
    
    // Log security event
    await logSecurityEvent({
      type: "ADMIN_ACTION",
      action: "UPDATE_COUPON",
      userId: superAdmin.uid,
      role: superAdmin.role,
      ip,
      userAgent,
      status: "SUCCESS",
      metadata: {
        couponCode: code.toUpperCase(),
        updates: updateData,
      },
      timestamp: new Date(),
    });
    
    return NextResponse.json({
      success: true,
      message: "Coupon updated successfully",
    });
  } catch (error: any) {
    console.error("Failed to update coupon:", error);
    
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update coupon" },
      { status: error.status || 500 }
    );
  }
}
