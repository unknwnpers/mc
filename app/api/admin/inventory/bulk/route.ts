export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { verifyAdmin } from "@/lib/admin-auth";
import type { ProductVariant } from "@/lib/types";

/**
 * POST /api/admin/inventory/bulk
 * Body: { updates: [{ productId, sku, stock }, ...] }
 * Bulk update multiple variant stocks atomically per product.
 */
export async function POST(req: Request) {
  try {
    const user = await verifyAdmin(req);
    const { updates } = await req.json();

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { success: false, error: "updates array is required" },
        { status: 400 }
      );
    }

    if (updates.length > 100) {
      return NextResponse.json(
        { success: false, error: "Maximum 100 updates per request" },
        { status: 400 }
      );
    }

    // Group updates by productId
    const updatesByProduct: Record<string, Array<{ sku: string; stock: number }>> = {};
    for (const update of updates) {
      const { productId, sku, stock } = update;
      if (!productId || !sku || typeof stock !== "number" || stock < 0) {
        return NextResponse.json(
          { success: false, error: "Each update requires productId, sku, and non-negative stock" },
          { status: 400 }
        );
      }
      if (!updatesByProduct[productId]) {
        updatesByProduct[productId] = [];
      }
      updatesByProduct[productId].push({ sku, stock });
    }

    const results: Array<{ productId: string; sku: string; success: boolean; error?: string }> = [];

    // Process each product's updates
    for (const [productId, productUpdates] of Object.entries(updatesByProduct)) {
      const ref = adminDb.collection("products").doc(productId);
      const snap = await ref.get();

      if (!snap.exists) {
        for (const update of productUpdates) {
          results.push({ productId, sku: update.sku, success: false, error: "Product not found" });
        }
        continue;
      }

      const data = snap.data()!;
      const variants = (data.variants || []) as ProductVariant[];
      const updatedVariants = [...variants];
      let hasChanges = false;

      for (const { sku, stock } of productUpdates) {
        const idx = variants.findIndex(v => v.sku === sku);
        if (idx === -1) {
          results.push({ productId, sku, success: false, error: "SKU not found" });
        } else {
          updatedVariants[idx] = { ...updatedVariants[idx], stock };
          results.push({ productId, sku, success: true });
          hasChanges = true;
        }
      }

      if (hasChanges) {
        await ref.update({ variants: updatedVariants, updatedAt: FieldValue.serverTimestamp() });

        // Log bulk update to admin_logs
        await adminDb.collection("admin_logs").add({
          adminId: user.uid,
          action: "bulk_update_inventory",
          resourceId: productId,
          details: `Bulk updated ${productUpdates.length} variants`,
          createdAt: FieldValue.serverTimestamp(),
        });

        // Log each change to inventory_logs
        const batch = adminDb.batch();
        for (const { sku, stock } of productUpdates) {
          const originalVariant = variants.find(v => v.sku === sku);
          if (originalVariant && originalVariant.stock !== stock) {
            const logRef = adminDb.collection("inventory_logs").doc();
            batch.set(logRef, {
              productId,
              sku,
              action: "bulk_update",
              previousStock: originalVariant.stock,
              newStock: stock,
              changedBy: user.uid,
              createdAt: FieldValue.serverTimestamp(),
            });
          }
        }
        await batch.commit();
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    return NextResponse.json({
      success: true,
      summary: { total: results.length, success: successCount, failed: failCount },
      results,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}
