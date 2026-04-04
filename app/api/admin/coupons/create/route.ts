import { NextRequest, NextResponse } from "next/server";
import { verifySuperAdmin } from "@/lib/rbac";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { logSecurityEvent } from "@/lib/logger";
import { getClientInfo } from "@/lib/logger";

// Force dynamic rendering - this route uses request-based auth
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/coupons/create
 * Create new coupon (SUPERADMIN ONLY)
 */
export async function POST(request: NextRequest) {
  try {
    const superAdmin = await verifySuperAdmin(request);
    const { ip, userAgent } = getClientInfo(request);
    
    const {
      code,
      type,
      value,
      minOrder = 0,
      maxDiscount,
      usageLimit = 100,
      expiresAt,
      active = true,
    } = await request.json();
    
    // Validate required fields
    if (!code || !type || value === undefined) {
      return NextResponse.json(
        { success: false, error: "Code, type, and value are required" },
        { status: 400 }
      );
    }
    
    // Validate type
    if (!["percentage", "fixed"].includes(type)) {
      return NextResponse.json(
        { success: false, error: "Type must be 'percentage' or 'fixed'" },
        { status: 400 }
      );
    }
    
    // Validate value
    if (type === "percentage" && (value < 0 || value > 100)) {
      return NextResponse.json(
        { success: false, error: "Percentage value must be between 0 and 100" },
        { status: 400 }
      );
    }
    
    if (value < 0) {
      return NextResponse.json(
        { success: false, error: "Value cannot be negative" },
        { status: 400 }
      );
    }
    
    // Create coupon
    const couponRef = adminDb.collection("coupons").doc(code.toUpperCase());
    await couponRef.set({
      code: code.toUpperCase(),
      type,
      value,
      minOrder,
      maxDiscount: maxDiscount || null,
      usageLimit,
      usedCount: 0,
      active,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null, // Convert to ISO UTC
      createdAt: FieldValue.serverTimestamp(),
      createdBy: superAdmin.uid,
    });
    
    // Log security event
    await logSecurityEvent({
      type: "ADMIN_ACTION",
      action: "CREATE_COUPON",
      userId: superAdmin.uid,
      role: superAdmin.role,
      ip,
      userAgent,
      status: "SUCCESS",
      metadata: {
        couponCode: code.toUpperCase(),
        type,
        value,
      },
      timestamp: new Date(),
    });
    
    return NextResponse.json({
      success: true,
      message: `Coupon ${code.toUpperCase()} created successfully`,
    });
  } catch (error: any) {
    console.error("Failed to create coupon:", error);
    
    await logSecurityEvent({
      type: "ADMIN_ACTION",
      action: "CREATE_COUPON_FAILED",
      status: "FAILED",
      metadata: { error: error.message },
      timestamp: new Date(),
    });
    
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create coupon" },
      { status: error.status || 500 }
    );
  }
}

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
