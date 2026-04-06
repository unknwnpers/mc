export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifySuperAdmin } from "@/lib/rbac";

// POST /api/admin/users/bulk - Bulk operations on users
export async function POST(req: NextRequest) {
  try {
    // Only superadmins can perform bulk actions
    const superAdmin = await verifySuperAdmin(req);
    const body = await req.json();
    const { action, ids } = body;

    if (!action || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid request: action and ids array required" },
        { status: 400 }
      );
    }

    const validActions = ["set_customer", "set_admin", "block", "unblock"];
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
      
      for (const id of batchIds) {
        try {
          const ref = adminDb.collection("users").doc(id);
          
          if (action === "set_customer" || action === "set_admin") {
            await ref.update({ role: action === "set_customer" ? "customer" : "admin" });
          } else if (action === "block") {
            await ref.update({ blocked: true });
          } else if (action === "unblock") {
            await ref.update({ blocked: false });
          }
          
          results.success++;
        } catch (err: any) {
          results.failed++;
          results.errors.push(`Failed to update ${id}: ${err.message}`);
        }
      }
    }

    // Log the bulk action
    await adminDb.collection("admin_logs").add({
      adminId: superAdmin.uid,
      action: `bulk_${action}`,
      details: `Bulk ${action} on ${ids.length} users`,
      metadata: { userIds: ids, results },
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      results,
      message: `${action} completed: ${results.success} succeeded, ${results.failed} failed`,
    });
  } catch (err: any) {
    console.error("Bulk user operation error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: err.status || 500 }
    );
  }
}
