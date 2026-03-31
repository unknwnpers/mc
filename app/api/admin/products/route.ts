export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { verifyAdmin } from "@/lib/admin-auth";

// ── GET /api/admin/products ─────────────────────────────────────────────────
export async function GET(req: Request) {
  try {
    await verifyAdmin(req);

    const { searchParams } = new URL(req.url);
    const includeArchived = searchParams.get("includeArchived") === "true";

    let query: FirebaseFirestore.Query = adminDb.collection("products").orderBy("createdAt", "desc");
    if (!includeArchived) query = adminDb.collection("products").where("isActive", "==", true).orderBy("createdAt", "desc");

    const snapshot = await query.get();
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({ success: true, products });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}

// ── POST /api/admin/products ────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const user = await verifyAdmin(req);
    const body = await req.json();

    const { name, description, images, variants, category_id, category_slug, is_featured } = body;

    if (!name || !variants || typeof variants !== "object" || Object.keys(variants).length === 0) {
      return NextResponse.json({ success: false, error: "name and at least one variant are required" }, { status: 400 });
    }

    // Validate each variant
    for (const [size, data] of Object.entries(variants as Record<string, any>)) {
      if (typeof data.price !== "number" || typeof data.stock !== "number") {
        return NextResponse.json({ success: false, error: `Variant "${size}" must have numeric price and stock` }, { status: 400 });
      }
    }

    const productRef = adminDb.collection("products").doc();
    const newProduct = {
      id: productRef.id,
      name: String(name).trim(),
      description: description || "",
      images: Array.isArray(images) ? images : [],
      variants,               // { S: { price, stock }, M: { price, stock } }
      isActive: true,
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
