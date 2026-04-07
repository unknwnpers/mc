export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// ── GET /api/reviews/product?productId=xxx ───────────────────────────────────
// Public endpoint to fetch reviews for a specific product
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json(
        { success: false, error: "productId is required" },
        { status: 400 }
      );
    }

    const reviewsSnapshot = await adminDb
      .collection("reviews")
      .where("productId", "==", productId)
      .where("status", "==", "approved")
      .orderBy("createdAt", "desc")
      .get();

    const reviews = reviewsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Calculate average rating
    const totalRating = reviews.reduce((sum, r: any) => sum + (r.rating || 0), 0);
    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

    return NextResponse.json({
      success: true,
      reviews,
      stats: {
        total: reviews.length,
        averageRating: Math.round(averageRating * 10) / 10,
      },
    });
  } catch (err: any) {
    console.error("Error fetching reviews:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
