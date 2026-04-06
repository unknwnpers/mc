export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { verifyAdmin } from "@/lib/admin-auth";
import type { ProductVariant } from "@/lib/types";

/**
 * GET /api/admin/inventory/reservations
 * Get all active reservations (for admin overview)
 */
export async function GET(req: Request) {
  try {
    await verifyAdmin(req);
    
    // Get all products with reserved stock
    const snapshot = await adminDb
      .collection("products")
      .where("variants", "!=", null)
      .get();

    const reservations: Array<{
      productId: string;
      productName: string;
      sku: string;
      physicalStock: number;
      reservedStock: number;
      availableStock: number;
    }> = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const variants = (data.variants || []) as ProductVariant[];
      
      for (const v of variants) {
        if (v.reservedStock && v.reservedStock > 0) {
          reservations.push({
            productId: doc.id,
            productName: data.name,
            sku: v.sku,
            physicalStock: v.stock,
            reservedStock: v.reservedStock,
            availableStock: v.stock - (v.reservedStock || 0),
          });
        }
      }
    }

    return NextResponse.json({ success: true, reservations });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}

/**
 * POST /api/admin/inventory/reservations/release
 * Body: { productId, sku, amount? }
 * Release reserved stock (admin manual release)
 */
export async function POST(req: Request) {
  try {
    const user = await verifyAdmin(req);
    const { productId, sku, amount } = await req.json();

    if (!productId || !sku) {
      return NextResponse.json(
        { success: false, error: "productId and sku are required" },
        { status: 400 }
      );
    }

    const ref = adminDb.collection("products").doc(productId);
    const snap = await ref.get();
    
    if (!snap.exists) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    const data = snap.data()!;
    const variants = (data.variants || []) as ProductVariant[];
    const idx = variants.findIndex(v => v.sku === sku);

    if (idx === -1) {
      return NextResponse.json({ success: false, error: "SKU not found" }, { status: 404 });
    }

    const currentReserved = variants[idx].reservedStock || 0;
    const releaseAmount = amount ? Math.min(amount, currentReserved) : currentReserved;
    
    if (releaseAmount <= 0) {
      return NextResponse.json({ success: false, error: "No reserved stock to release" }, { status: 400 });
    }

    const updatedVariants = variants.map((v, i) =>
      i === idx ? { ...v, reservedStock: Math.max(0, (v.reservedStock || 0) - releaseAmount) } : v
    );

    await ref.update({ variants: updatedVariants, updatedAt: FieldValue.serverTimestamp() });

    // Log the release
    await adminDb.collection("admin_logs").add({
      adminId: user.uid,
      action: "release_reservation",
      resourceId: productId,
      details: `Released ${releaseAmount} reserved stock for SKU "${sku}"`,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      productId,
      sku,
      released: releaseAmount,
      remainingReserved: currentReserved - releaseAmount,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}
