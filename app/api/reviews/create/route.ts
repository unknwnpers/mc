import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDb } from "@/lib/firebase-admin";
import { logSecurityEvent } from "@/lib/logger";
import { getClientInfo } from "@/lib/logger";

/**
 * POST /api/reviews/create
 * Create a product review (CUSTOMER+)
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
    const decoded = await getAuth().verifyIdToken(token);
    const userId = decoded.uid;
    
    const { productId, rating, comment, images = [], attributes = {} } = await request.json();
    const { ip, userAgent } = getClientInfo(request);
    
    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    // Validate attributes (Softness, Quality, Fit) if provided
    const validAttributes = ['softness', 'quality', 'fit'];
    const sanitizedAttributes: Record<string, number> = {};

    for (const attr of validAttributes) {
      if (attributes[attr] !== undefined) {
        const val = Number(attributes[attr]);
        if (!isNaN(val) && val >= 1 && val <= 5) {
          sanitizedAttributes[attr] = val;
        }
      }
    }
    
    if (!productId) {
      return NextResponse.json(
        { success: false, error: "Product ID is required" },
        { status: 400 }
      );
    }
    
    // CRITICAL: Verify purchase
    const ordersSnapshot = await adminDb.collection("orders")
      .where("userId", "==", userId)
      .get();
    
    let hasPurchased = false;
    
    ordersSnapshot.forEach((doc: any) => {
      const order = doc.data();
      const items = order.items || [];
      
      // Check if any item contains this productId
      if (items.some((item: any) => item.productId === productId)) {
        hasPurchased = true;
      }
    });
    
    if (!hasPurchased) {
      return NextResponse.json(
        { success: false, error: "You must purchase this product to review it" },
        { status: 403 }
      );
    }
    
    // Check if user already reviewed this product
    const existingReview = await adminDb.collection("reviews")
      .where("productId", "==", productId)
      .where("userId", "==", userId)
      .limit(1)
      .get();
    
    if (!existingReview.empty) {
      return NextResponse.json(
        { success: false, error: "You have already reviewed this product" },
        { status: 400 }
      );
    }
    
    // Create review
    const reviewRef = await adminDb.collection("reviews").add({
      productId,
      userId,
      rating,
      comment: comment || "",
      images: images.slice(0, 5), // Max 5 images
      attributes: sanitizedAttributes,
      verifiedPurchase: true,
      createdAt: new Date(),
    });
    
    // Update product average rating
    await updateProductRating(productId);
    
    // Log security event
    await logSecurityEvent({
      type: "ADMIN_ACTION",
      action: "CREATE_REVIEW",
      userId,
      ip,
      userAgent,
      status: "SUCCESS",
      metadata: {
        productId,
        reviewId: reviewRef.id,
        rating,
      },
      timestamp: new Date(),
    });
    
    return NextResponse.json({
      success: true,
      message: "Review submitted successfully",
      reviewId: reviewRef.id,
    });
  } catch (error: any) {
    console.error("Failed to create review:", error);
    
    await logSecurityEvent({
      type: "ADMIN_ACTION",
      action: "CREATE_REVIEW_FAILED",
      status: "FAILED",
      metadata: { error: error.message },
      timestamp: new Date(),
    });
    
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create review" },
      { status: error.status || 500 }
    );
  }
}

/**
 * GET /api/reviews/product/{id}
 * Get reviews for a product
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get("productId");
    
    if (!productId) {
      return NextResponse.json(
        { success: false, error: "productId is required" },
        { status: 400 }
      );
    }
    
    // Fetch reviews
    const reviewsSnapshot = await adminDb.collection("reviews")
      .where("productId", "==", productId)
      .orderBy("createdAt", "desc")
      .get();
    
    const reviews = reviewsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : null,
    }));
    
    // Calculate average rating
    const totalRating = reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0);
    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;
    
    return NextResponse.json({
      success: true,
      reviews,
      count: reviews.length,
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
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
 * Helper: Update product average rating
 */
async function updateProductRating(productId: string) {
  try {
    const reviewsSnapshot = await adminDb.collection("reviews")
      .where("productId", "==", productId)
      .get();
    
    if (reviewsSnapshot.empty) {
      return;
    }
    
    const totalRating = reviewsSnapshot.docs.reduce((sum: number, doc: any) => {
      return sum + (doc.data().rating || 0);
    }, 0);
    
    const averageRating = totalRating / reviewsSnapshot.size;
    
    // Update product document
    await adminDb.collection("products").doc(productId).update({
      averageRating: Math.round(averageRating * 10) / 10,
      reviewCount: reviewsSnapshot.size,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error("Failed to update product rating:", error);
  }
}
