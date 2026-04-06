export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { verifyAdmin } from "@/lib/admin-auth";
import type { ProductVariant } from "@/lib/types";

/**
 * POST /api/admin/inventory
 * Body: { productId, sku, stock }
 * Atomically sets a variant's stock by SKU.
 */
export async function POST(req: Request) {
  try {
    const user = await verifyAdmin(req);
    const { productId, sku, stock } = await req.json();

    if (!productId || !sku || typeof stock !== "number" || stock < 0) {
      return NextResponse.json(
        { success: false, error: "productId, sku, and a non-negative stock value are required" },
        { status: 400 }
      );
    }

    const ref  = adminDb.collection("products").doc(productId);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });

    const data     = snap.data()!;
    const variants = (data.variants || []) as ProductVariant[];
    const idx      = variants.findIndex(v => v.sku === sku);

    if (idx === -1) {
      return NextResponse.json(
        { success: false, error: `SKU "${sku}" not found on this product` },
        { status: 400 }
      );
    }

    const previousStock = variants[idx].stock;
    const updatedVariants = variants.map((v, i) =>
      i === idx ? { ...v, stock: Number(stock) } : v
    );

    await ref.update({ variants: updatedVariants, updatedAt: FieldValue.serverTimestamp() });

    // Log to admin_logs
    await adminDb.collection("admin_logs").add({
      adminId:   user.uid,
      action:    "update_inventory",
      resourceId: productId,
      details:   `Set SKU "${sku}" stock from ${previousStock} to ${stock}`,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Log to inventory_logs for history tracking
    await adminDb.collection("inventory_logs").add({
      productId,
      sku,
      action: "update",
      previousStock,
      newStock: stock,
      changedBy: user.uid,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, productId, sku, stock, previousStock });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}

/**
 * GET /api/admin/inventory?productId=xxx
 */
export async function GET(req: Request) {
  try {
    await verifyAdmin(req);
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    if (!productId) return NextResponse.json({ success: false, error: "productId required" }, { status: 400 });

    const snap = await adminDb.collection("products").doc(productId).get();
    if (!snap.exists) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    const data = snap.data()!;
    return NextResponse.json({ success: true, variants: data.variants || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}
