export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { verifyAdmin } from "@/lib/admin-auth";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

// ── GET /api/admin/products ─────────────────────────────────────────────────
export async function GET(req: Request) {
  try {
    await verifyAdmin(req);

    const { searchParams } = new URL(req.url);
    const includeArchived = searchParams.get("includeArchived") === "true";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_SIZE), 10),
      MAX_PAGE_SIZE
    );
    const offset = (page - 1) * limit;

    let snapshot;
    let totalCount = 0;
    
    try {
      // Get total count for pagination
      const countQuery = includeArchived 
        ? adminDb.collection("products").count()
        : adminDb.collection("products").where("isActive", "==", true).count();
      const countSnapshot = await countQuery.get();
      totalCount = countSnapshot.data().count;

      // Get paginated results
      let q = adminDb.collection("products").orderBy("createdAt", "desc");
      if (!includeArchived) {
        q = q.where("isActive", "==", true);
      }
      snapshot = await q.limit(limit).offset(offset).get();
    } catch (firebaseErr: any) {
      // Fallback for missing composite index (FAILED_PRECONDITION)
      console.warn("Falling back to in-memory filter due to missing index:", firebaseErr.message);
      const allSnapshot = await adminDb.collection("products").get();
      
      let docs = allSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (!includeArchived) {
        docs = docs.filter((d: any) => d.isActive === true);
      }
      
      // In-memory sort by createdAt desc
      docs.sort((a: any, b: any) => {
        const tA = a.createdAt?.seconds || 0;
        const tB = b.createdAt?.seconds || 0;
        return tB - tA;
      });

      totalCount = docs.length;
      
      // Apply pagination in-memory
      docs = docs.slice(offset, offset + limit);
      
      return NextResponse.json({ 
        success: true, 
        products: docs,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasMore: offset + docs.length < totalCount,
        }
      });
    }

    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({ 
      success: true, 
      products,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: offset + products.length < totalCount,
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}

// ── POST /api/admin/products ────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const user = await verifyAdmin(req);
    const body = await req.json();

    const { name, description, images, variants, options, category_id, category_slug, is_featured, isActive } = body;

    if (!name || !variants || !Array.isArray(variants) || variants.length === 0) {
      return NextResponse.json({ success: false, error: "name and at least one variant array are required" }, { status: 400 });
    }

    // Validate each variant in the array
    for (const v of variants) {
      if (!v.sku || typeof v.price !== "number" || typeof v.stock !== "number") {
        return NextResponse.json({ success: false, error: "Each variant must have a sku, and numeric price/stock" }, { status: 400 });
      }
    }

    const productRef = adminDb.collection("products").doc();
    const newProduct = {
      id: productRef.id,
      name: String(name).trim(),
      description: description || "",
      images: Array.isArray(images) ? images : [],
      options: Array.isArray(options) ? options : [{ name: "Size", values: variants.map(v => v.sku) }],
      variants,               // [ { sku, options, price, stock } ]
      isActive: isActive !== undefined ? isActive : true,
      is_featured: is_featured || false,
      category_id: category_id || "",
      category_slug: category_slug || "",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await productRef.set(newProduct);

    await adminDb.collection("admin_logs").add({
      adminId: user.uid,
      action: "create_product",
      resourceId: productRef.id,
      details: `Created "${name}"`,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, id: productRef.id });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}

// ── PATCH /api/admin/products ────────────────────────────────────────────────
export async function PATCH(req: Request) {
  try {
    const user = await verifyAdmin(req);
    const { id, data } = await req.json();

    if (!id || !data) {
      return NextResponse.json({ success: false, error: "id and data are required" }, { status: 400 });
    }

    const ref = adminDb.collection("products").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });

    // V2 Validation for variants if present in update
    if (data.variants) {
        if (!Array.isArray(data.variants)) {
            return NextResponse.json({ success: false, error: "variants must be an array" }, { status: 400 });
        }
        for (const v of data.variants) {
            if (!v.sku || typeof v.price !== "number" || typeof v.stock !== "number") {
                return NextResponse.json({ success: false, error: "Invalid variant data in array" }, { status: 400 });
            }
        }
    }

    await ref.update({ ...data, updatedAt: FieldValue.serverTimestamp() });

    await adminDb.collection("admin_logs").add({
      adminId: user.uid,
      action: "update_product",
      resourceId: id,
      details: `Updated fields: ${Object.keys(data).join(", ")}`,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}

// ── DELETE /api/admin/products (soft delete or permanent) ───────────────────
export async function DELETE(req: Request) {
  try {
    const user = await verifyAdmin(req);
    const { id, action } = await req.json();

    if (!id) return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });

    const ref = adminDb.collection("products").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });

    // Default to soft delete (archive) for backward compatibility
    const deleteAction = action || "archive";

    if (deleteAction === "delete_permanently") {
      // Permanent deletion - remove from database
      await ref.delete();

      await adminDb.collection("admin_logs").add({
        adminId: user.uid,
        action: "delete_product_permanently",
        resourceId: id,
        details: `Permanently deleted product", was active: ${snap.data()?.isActive}`,
        createdAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({ success: true, message: "Product permanently deleted" });
    } else {
      // Soft delete (archive) - set isActive = false
      await ref.update({ isActive: false, updatedAt: FieldValue.serverTimestamp() });

      await adminDb.collection("admin_logs").add({
        adminId: user.uid,
        action: "archive_product",
        resourceId: id,
        details: "Soft-deleted (isActive=false)",
        createdAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({ success: true, message: "Product archived" });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}
