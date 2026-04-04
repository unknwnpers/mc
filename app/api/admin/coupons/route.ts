import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/rbac";
import { adminDb } from "@/lib/firebase-admin";

// Force dynamic rendering - this route uses request-based auth
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/coupons
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
