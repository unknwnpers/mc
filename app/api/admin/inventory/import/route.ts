export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { verifyAdmin } from "@/lib/admin-auth";
import type { Product, ProductVariant } from "@/lib/types";

interface ImportRow {
  productId: string;
  productName: string;
  sku: string;
  price: string;
  stock: string;
  reserved: string;
  available: string;
  lowStockThreshold: string;
}

/**
 * POST /api/admin/inventory/import
 * Body: { csv: string, preview?: boolean }
 * Import inventory from CSV
 */
export async function POST(req: Request) {
  try {
    const user = await verifyAdmin(req);
    const { csv, preview = false } = await req.json();

    if (!csv || typeof csv !== "string") {
      return NextResponse.json(
        { success: false, error: "CSV content is required" },
        { status: 400 }
      );
    }

    // Parse CSV
    const lines = csv.trim().split("\n");
    if (lines.length < 2) {
      return NextResponse.json(
        { success: false, error: "CSV must have at least a header and one data row" },
        { status: 400 }
      );
    }

    const headers = lines[0].split(",").map(h => h.trim());
    const requiredCols = ["Product ID", "SKU", "Stock"];
    const missingCols = requiredCols.filter(col => !headers.includes(col));
    
    if (missingCols.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required columns: ${missingCols.join(", ")}` },
        { status: 400 }
      );
    }

    const rows: ImportRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length !== headers.length) continue;
      
      const row: any = {};
      headers.forEach((h, idx) => {
        row[h.replace(/\s+/g, "_").toLowerCase()] = values[idx]?.trim() || "";
      });
      rows.push(row as ImportRow);
    }

    // Group by product
    const updatesByProduct: Record<string, {
      name: string;
      variants: Array<{ sku: string; stock: number; price?: number }>;
      lowStockThreshold?: number;
    }> = {};

    const errors: string[] = [];
    const warnings: string[] = [];

    for (const row of rows) {
      if (!row.productId || !row.sku) {
        warnings.push(`Row skipped: missing productId or sku`);
        continue;
      }

      const stock = parseInt(row.stock, 10);
      if (isNaN(stock) || stock < 0) {
        errors.push(`Invalid stock value for ${row.productName} (${row.sku}): ${row.stock}`);
        continue;
      }

      if (!updatesByProduct[row.productId]) {
        updatesByProduct[row.productId] = {
          name: row.productName,
          variants: [],
        };
      }

      updatesByProduct[row.productId].variants.push({
        sku: row.sku,
        stock,
        price: row.price ? parseFloat(row.price) : undefined,
      });

      // Set threshold if provided
      if (row.lowStockThreshold) {
        const threshold = parseInt(row.lowStockThreshold, 10);
        if (!isNaN(threshold) && threshold > 0) {
          updatesByProduct[row.productId].lowStockThreshold = threshold;
        }
      }
    }

    // If preview mode, return what would be updated
    if (preview) {
      const previewData = await Promise.all(
        Object.entries(updatesByProduct).map(async ([productId, data]) => {
          const snap = await adminDb.collection("products").doc(productId).get();
          const existing = snap.exists ? snap.data() as Product : null;
          
          return {
            productId,
            productName: data.name,
            exists: snap.exists,
            currentVariants: existing?.variants?.length || 0,
            updates: data.variants.map(v => ({
              sku: v.sku,
              newStock: v.stock,
              currentStock: existing?.variants?.find(ev => ev.sku === v.sku)?.stock ?? null,
            })),
            newThreshold: data.lowStockThreshold,
            currentThreshold: existing?.lowStockThreshold ?? 3,
          };
        })
      );

      return NextResponse.json({
        success: true,
        preview: true,
        summary: {
          totalProducts: Object.keys(updatesByProduct).length,
          totalVariants: rows.filter(r => r.productId && r.sku).length,
          errors: errors.length,
          warnings: warnings.length,
        },
        products: previewData,
        errors,
        warnings,
      });
    }

    // Apply updates
    const results: Array<{ productId: string; success: boolean; error?: string }> = [];

    for (const [productId, data] of Object.entries(updatesByProduct)) {
      try {
        const ref = adminDb.collection("products").doc(productId);
        const snap = await ref.get();

        if (!snap.exists) {
          results.push({ productId, success: false, error: "Product not found" });
          continue;
        }

        const productData = snap.data() as Product;
        const currentVariants = productData.variants || [];
        
        const updatedVariants = currentVariants.map(v => {
          const update = data.variants.find(u => u.sku === v.sku);
          if (update) {
            return { ...v, stock: update.stock };
          }
          return v;
        });

        const updateData: any = {
          variants: updatedVariants,
          updatedAt: FieldValue.serverTimestamp(),
        };

        if (data.lowStockThreshold !== undefined) {
          updateData.lowStockThreshold = data.lowStockThreshold;
        }

        await ref.update(updateData);

        // Log the import
        await adminDb.collection("admin_logs").add({
          adminId: user.uid,
          action: "import_inventory",
          resourceId: productId,
          details: `Imported ${data.variants.length} variant stocks`,
          createdAt: FieldValue.serverTimestamp(),
        });

        results.push({ productId, success: true });
      } catch (err: any) {
        results.push({ productId, success: false, error: err.message });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return NextResponse.json({
      success: true,
      summary: {
        total: results.length,
        success: successCount,
        failed: results.length - successCount,
      },
      results,
      errors,
      warnings,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}

// Simple CSV line parser that handles quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}
