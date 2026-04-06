export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { verifyAdmin } from "@/lib/admin-auth";

// POST /api/admin/products/bulk - Bulk operations on products
export async function POST(req: Request) {
  try {
    const user = await verifyAdmin(req);
    const body = await req.json();
    const { action, ids } = body;

    if (!action || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid request: action and ids array required" },
        { status: 400 }
      );
    }

    const validActions = ["archive", "restore", "delete"];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: `Invalid action. Must be one of: ${validActions.join(", ")}` },
        { status: 400 }
      );
    }

    const results = { success: 0, failed: 0, errors: [] as string[] };

    // Process in batches of 10 for Firestore batch limits
    const batchSize = 10;
    for (let i = 0; i < ids.length; i += batchSize) {
      const batchIds = ids.slice(i, i + batchSize);
      const batch = adminDb.batch();

      for (const id of batchIds) {
        const ref = adminDb.collection("products").doc(id);

        if (action === "delete") {
          batch.delete(ref);
        } else if (action === "archive") {
          batch.update(ref, { isActive: false, updatedAt: FieldValue.serverTimestamp() });
        } else if (action === "restore") {
          batch.update(ref, { isActive: true, updatedAt: FieldValue.serverTimestamp() });
        }
      }

      try {
        await batch.commit();
        results.success += batchIds.length;
      } catch (err: any) {
        results.failed += batchIds.length;
        results.errors.push(err.message);
      }
    }

    // Log the bulk action
    await adminDb.collection("admin_logs").add({
      adminId: user.uid,
      action: `bulk_${action}`,
      details: `Bulk ${action} on ${ids.length} products`,
      metadata: { productIds: ids, results },
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      results,
      message: `${action} completed: ${results.success} succeeded, ${results.failed} failed`,
    });
  } catch (err: any) {
    console.error("Bulk product operation error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: err.status || 500 }
    );
  }
}
