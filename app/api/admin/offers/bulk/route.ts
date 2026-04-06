export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdmin } from "@/lib/rbac";

// POST /api/admin/offers/bulk - Bulk operations on offers
export async function POST(req: NextRequest) {
  try {
    // Verify admin access
    const admin = await verifyAdmin(req);
    const body = await req.json();
    const { action, ids } = body;

    if (!action || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid request: action and ids array required" },
        { status: 400 }
      );
    }

    const validActions = ["activate", "deactivate"];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: `Invalid action. Must be one of: ${validActions.join(", ")}` },
        { status: 400 }
      );
    }

    const results = { success: 0, failed: 0, errors: [] as string[] };

    // Process in batches
    for (const id of ids) {
      try {
        const ref = adminDb.collection("offers").doc(id);
        await ref.update({ isActive: action === "activate" });
        results.success++;
      } catch (err: any) {
        results.failed++;
        results.errors.push(`Failed to update ${id}: ${err.message}`);
      }
    }

    // Log the bulk action
    await adminDb.collection("admin_logs").add({
      adminId: admin.uid,
      action: `bulk_${action}_offers`,
      details: `Bulk ${action} on ${ids.length} offers`,
      metadata: { offerIds: ids, results },
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      results,
      message: `${action} completed: ${results.success} succeeded, ${results.failed} failed`,
    });
  } catch (err: any) {
    console.error("Bulk offer operation error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: err.status || 500 }
    );
  }
}
