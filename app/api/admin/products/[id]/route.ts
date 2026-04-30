export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { verifyAdmin } from "@/lib/admin-auth";

// ── GET /api/admin/products/[id] ─────────────────────────────────────────────
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await verifyAdmin(req);
    const { id } = await context.params;
    const snap = await adminDb.collection("products").doc(id).get();
    if (!snap.exists) return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    
    const data = snap.data();
    // Convert Firestore Timestamps to ISO strings for serialization
    const product = {
      id: snap.id,
      ...data,
      createdAt: data?.createdAt?.toDate?.().toISOString() || data?.createdAt,
      updatedAt: data?.updatedAt?.toDate?.().toISOString() || data?.updatedAt,
    };
    
    return NextResponse.json({ success: true, product });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}

// ── PATCH /api/admin/products/[id] ───────────────────────────────────────────
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyAdmin(req);
    const body = await req.json();
    const { id } = await context.params;

    const ref = adminDb.collection("products").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });

    // Validate variants if being updated (V2 Schema: Array)
    if (body.variants) {
      if (!Array.isArray(body.variants)) {
        return NextResponse.json({ success: false, error: "variants must be an array" }, { status: 400 });
      }
      for (const v of body.variants) {
        if (!v.sku || typeof v.price !== "number" || typeof v.stock !== "number") {
          return NextResponse.json({ success: false, error: "Each variant must have a sku and numeric price/stock" }, { status: 400 });
        }
      }
    }

    const safeUpdate: Record<string, any> = { updatedAt: FieldValue.serverTimestamp() };
    const allowed = ["name", "description", "images", "variants", "options", "isActive", "is_featured", "category_id", "category_slug"];
    for (const key of allowed) {
      if (body[key] !== undefined) safeUpdate[key] = body[key];
    }

    await ref.update(safeUpdate);

    await adminDb.collection("admin_logs").add({
      adminId: user.uid,
      action: "update_product",
      resourceId: id,
      details: `Updated: ${Object.keys(safeUpdate).filter(k => k !== "updatedAt").join(", ")}`,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}

// ── DELETE /api/admin/products/[id] (soft archive) ───────────────────────────
export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyAdmin(req);
    const { id } = await context.params;

    const ref = adminDb.collection("products").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });

    await ref.update({ isActive: false, updatedAt: FieldValue.serverTimestamp() });

    await adminDb.collection("admin_logs").add({
      adminId: user.uid,
      action: "archive_product",
      resourceId: id,
      details: "Soft-archived",
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}
