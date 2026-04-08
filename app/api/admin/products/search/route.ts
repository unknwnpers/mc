export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdmin } from "@/lib/admin-auth";

// ── GET /api/admin/products/search?q=query ───────────────────────────────────
export async function GET(req: Request) {
  try {
    await verifyAdmin(req);

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim();
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    if (!query || query.length < 2) {
      return NextResponse.json({ success: true, products: [] });
    }

    // Fetch all active products and filter in-memory for case-insensitive substring search
    // This avoids Firestore index requirements and enables true "contains" search
    const snapshot = await adminDb
      .collection("products")
      .where("isActive", "==", true)
      .limit(500) // Fetch reasonable batch for in-memory filtering
      .get();

    const queryLower = query.toLowerCase();
    
    const products = snapshot.docs
      .map(doc => ({
        id: doc.id,
        name: doc.data().name,
        images: doc.data().images || [],
        category_slug: doc.data().category_slug,
        isActive: doc.data().isActive,
      }))
      .filter(p => p.name?.toLowerCase().includes(queryLower))
      .slice(0, limit);

    return NextResponse.json({ success: true, products });
  } catch (err: any) {
    console.error("Product search error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}
