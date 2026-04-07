export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// ── GET /api/collections/[id] ────────────────────────────────────────────────
// Public endpoint to fetch a single curated collection by ID
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const doc = await adminDb.collection("curated_collections").doc(id).get();
    
    if (!doc.exists) {
      return NextResponse.json({ success: false, error: "Collection not found" }, { status: 404 });
    }

    const data = doc.data();
    
    // Only return active collections
    if (!data?.isActive) {
      return NextResponse.json({ success: false, error: "Collection not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      collection: { id: doc.id, ...data }
    });
  } catch (err: any) {
    console.error("Error fetching collection:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
