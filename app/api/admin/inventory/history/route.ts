export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdmin } from "@/lib/admin-auth";

/**
 * GET /api/admin/inventory/history?productId=xxx&sku=xxx&limit=20
 * Get stock change history for a specific variant
 */
export async function GET(req: Request) {
  try {
    await verifyAdmin(req);
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const sku = searchParams.get("sku");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);

    if (!productId || !sku) {
      return NextResponse.json(
        { success: false, error: "productId and sku are required" },
        { status: 400 }
      );
    }

    // Query inventory logs
    const snapshot = await adminDb
      .collection("inventory_logs")
      .where("productId", "==", productId)
      .where("sku", "==", sku)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const logs = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        action: data.action,
        previousStock: data.previousStock,
        newStock: data.newStock,
        changedBy: data.changedBy,
        reason: data.reason || null,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
      };
    });

    return NextResponse.json({ success: true, logs });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}
