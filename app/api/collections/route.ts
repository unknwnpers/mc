export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// ── GET /api/collections ─────────────────────────────────────────────────────
// Public endpoint for homepage to fetch active curated collections
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const snapshot = await adminDb
      .collection("curated_collections")
      .where("isActive", "==", true)
      .orderBy("displayOrder", "asc")
      .limit(limit)
      .get();

    const collections = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({ success: true, collections });
  } catch (err: any) {
    console.error("Error fetching collections:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
