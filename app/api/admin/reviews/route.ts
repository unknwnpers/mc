import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/rbac";
import { adminDb } from "@/lib/firebase-admin";
import { logSecurityEvent } from "@/lib/logger";
import { getClientInfo } from "@/lib/logger";

/**
 * GET /api/admin/reviews
 * Fetch all reviews (ADMIN+)
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get("productId");
    const limit = parseInt(searchParams.get("limit") || "50");
    
    let query: any = adminDb.collection("reviews");
    
    if (productId) {
      query = query.where("productId", "==", productId);
    }
    
    query = query.orderBy("createdAt", "desc").limit(limit);
    
    const snapshot = await query.get();
    const reviews = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : null,
    }));
    
    return NextResponse.json({
      success: true,
      reviews,
      count: reviews.length,
    });
  } catch (error: any) {
    console.error("Failed to fetch reviews:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch reviews" },
      { status: error.status || 500 }
    );
  }
}

/**
 * DELETE /api/admin/reviews
 * Delete abusive review (SUPERADMIN ONLY)
 */
export async function DELETE(request: NextRequest) {
  try {
    const superAdmin = await verifyAdmin(request); // Admin can delete reviews
    
    const { reviewId } = await request.json();
    const { ip, userAgent } = getClientInfo(request);
    
    if (!reviewId) {
      return NextResponse.json(
        { success: false, error: "reviewId is required" },
        { status: 400 }
      );
    }
    
    // Get review before deletion for logging
    const reviewRef = adminDb.collection("reviews").doc(reviewId);
    const reviewDoc = await reviewRef.get();
    
    if (!reviewDoc.exists) {
      return NextResponse.json(
        { success: false, error: "Review not found" },
        { status: 404 }
      );
    }
    
    const reviewData = reviewDoc.data();
    
    // Delete review
    await reviewRef.delete();
    
    // Log security event
    await logSecurityEvent({
      type: "ADMIN_ACTION",
      action: "DELETE_REVIEW",
      userId: superAdmin.uid,
      role: superAdmin.role,
      ip,
      userAgent,
      status: "SUCCESS",
      metadata: {
        reviewId,
        productId: reviewData?.productId,
        reason: "Admin deletion",
      },
      timestamp: new Date(),
    });
    
    return NextResponse.json({
      success: true,
      message: "Review deleted",
    });
  } catch (error: any) {
    console.error("Failed to delete review:", error);
    
    await logSecurityEvent({
      type: "ADMIN_ACTION",
      action: "DELETE_REVIEW_FAILED",
      status: "FAILED",
      metadata: { error: error.message },
      timestamp: new Date(),
    });
    
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete review" },
      { status: error.status || 500 }
    );
  }
}
