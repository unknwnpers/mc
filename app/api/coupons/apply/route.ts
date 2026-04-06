import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/rbac";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { logSecurityEvent } from "@/lib/logger";
import { getClientInfo } from "@/lib/logger";

/**
 * POST /api/coupons/apply
 * Apply coupon code to order
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(" ")[1];
    const { getAuth } = await import("firebase-admin/auth");
    const decoded = await getAuth().verifyIdToken(token);
    const userId = decoded.uid;
    
    const { code, orderAmount } = await request.json();
    
    if (!code || !orderAmount) {
      return NextResponse.json(
        { success: false, error: "Code and order amount are required" },
        { status: 400 }
      );
    }
    
    // Fetch coupon
    const couponRef = adminDb.collection("coupons").doc(code.toUpperCase());
    const couponDoc = await couponRef.get();
    
    if (!couponDoc.exists) {
      return NextResponse.json(
        { success: false, error: "Invalid coupon code" },
        { status: 404 }
      );
    }
    
    const coupon = couponDoc.data()!;
    
    // Validate coupon
    if (!coupon.active) {
      return NextResponse.json(
        { success: false, error: "This coupon is no longer active" },
        { status: 400 }
      );
    }
    
    if (coupon.usedCount >= coupon.usageLimit) {
      return NextResponse.json(
        { success: false, error: "Coupon usage limit reached" },
        { status: 400 }
      );
    }
    
    // Handle Firestore Timestamp or string/Date for expiresAt
    let expiresAt: Date | null = null;
    if (coupon.expiresAt) {
      if (coupon.expiresAt.toDate) {
        // Firestore Timestamp
        expiresAt = coupon.expiresAt.toDate();
      } else {
        // String or Date
        expiresAt = new Date(coupon.expiresAt);
      }
    }
    if (expiresAt !== null && expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: "Coupon has expired" },
        { status: 400 }
      );
    }
    
    if (orderAmount < coupon.minOrder) {
      return NextResponse.json(
        { success: false, error: `Minimum order amount is ₹${coupon.minOrder}` },
        { status: 400 }
      );
    }
    
    // Check if user already used this coupon
    const existingUsage = await adminDb.collection("coupon_usages")
      .where("userId", "==", userId)
      .where("couponCode", "==", code.toUpperCase())
      .limit(1)
      .get();
    
    if (!existingUsage.empty) {
      return NextResponse.json(
        { success: false, error: "You have already used this coupon" },
        { status: 400 }
      );
    }
    
    // Calculate discount
    let discount = 0;
    
    if (coupon.type === "percentage") {
      discount = (orderAmount * coupon.value) / 100;
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else if (coupon.type === "fixed") {
      discount = coupon.value;
    }
    
    // Ensure discount doesn't exceed order amount
    discount = Math.min(discount, orderAmount);
    
    // CRITICAL: Track coupon usage BEFORE returning success
    // This is where most systems fail - usage must be atomic
    await adminDb.collection("coupon_usages").add({
      userId,
      couponCode: code.toUpperCase(),
      orderAmount,
      discount: Math.round(discount),
      usedAt: FieldValue.serverTimestamp(),
    });
    
    // Increment usage count atomically
    await couponRef.update({
      usedCount: FieldValue.increment(1),
    });
    
    return NextResponse.json({
      success: true,
      discount: Math.round(discount),
      finalAmount: orderAmount - Math.round(discount),
      coupon: {
        code: code.toUpperCase(),
        type: coupon.type,
        value: coupon.value,
      },
    });
  } catch (error: any) {
    console.error("Failed to apply coupon:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to apply coupon" },
      { status: error.status || 500 }
    );
  }
}

/**
 * GET /api/coupons/list
 * List all coupons (ADMIN+)
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    
    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get("active") === "true";
    
    let query: any = adminDb.collection("coupons");
    
    if (activeOnly) {
      query = query.where("active", "==", true);
    }
    
    query = query.orderBy("createdAt", "desc");
    
    const snapshot = await query.get();
    const coupons = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
      expiresAt: doc.data().expiresAt?.toDate ? doc.data().expiresAt.toDate() : null,
      createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : null,
    }));
    
    return NextResponse.json({
      success: true,
      coupons,
      count: coupons.length,
    });
  } catch (error: any) {
    console.error("Failed to fetch coupons:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch coupons" },
      { status: error.status || 500 }
    );
  }
}
