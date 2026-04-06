export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdmin } from "@/lib/admin-auth";
import type { Product } from "@/lib/types";

/**
 * GET /api/admin/inventory/export
 * Export all inventory as CSV
 */
export async function GET(req: Request) {
  try {
    await verifyAdmin(req);
    
    // Get all active products
    const snapshot = await adminDb
      .collection("products")
      .where("isActive", "==", true)
      .get();

    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Product[];

    // Build CSV
    const headers = ["Product ID", "Product Name", "SKU", "Price", "Stock", "Reserved", "Available", "Low Stock Threshold"];
    const rows: string[] = [];

    for (const product of products) {
      if (!product.variants || product.variants.length === 0) {
        rows.push([
          product.id,
          `"${product.name.replace(/"/g, '""')}"`,
          "",
          "",
          "",
          "",
          "",
          product.lowStockThreshold ?? 3,
        ].join(","));
      } else {
        for (const variant of product.variants) {
          const reserved = variant.reservedStock || 0;
          const available = variant.stock - reserved;
          rows.push([
            product.id,
            `"${product.name.replace(/"/g, '""')}"`,
            variant.sku,
            variant.price,
            variant.stock,
            reserved,
            available,
            product.lowStockThreshold ?? 3,
          ].join(","));
        }
      }
    }

    const csv = [headers.join(","), ...rows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="inventory-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}
