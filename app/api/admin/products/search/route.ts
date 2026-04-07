export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdmin } from "@/lib/admin-auth";

// ── GET /api/admin/products/search?q=query ───────────────────────────────────
export async function GET(req: Request) {
  try {
    await verifyAdmin(req);

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim().toLowerCase();
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    if (!query) {
      return NextResponse.json({ success: false, error: "Query parameter required" }, { status: 400 });
    }

    // Search by name (case-insensitive)
    const snapshot = await adminDb
      .collection("products")
      .orderBy("name")
      .startAt(query)
      .endAt(query + "\uf8ff")
      .limit(limit)
      .get();

    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      images: doc.data().images || [],
      category_slug: doc.data().category_slug,
      isActive: doc.data().isActive,
    }));

    return NextResponse.json({ success: true, products });
  } catch (err: any) {
    console.error("Product search error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}
