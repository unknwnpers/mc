export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { verifyAdmin } from "@/lib/admin-auth";

// ── GET /api/admin/products/[id] ─────────────────────────────────────────────
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await verifyAdmin(req);
    const snap = await adminDb.collection("products").doc(params.id).get();
    if (!snap.exists) return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    return NextResponse.json({ success: true, product: { id: snap.id, ...snap.data() } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}

// ── PATCH /api/admin/products/[id] ───────────────────────────────────────────
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await verifyAdmin(req);
    const body = await req.json();

    const ref = adminDb.collection("products").doc(params.id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });

    // Validate variants if being updated
    if (body.variants) {
      for (const [size, data] of Object.entries(body.variants as Record<string, any>)) {
        if (typeof data.price !== "number" || typeof data.stock !== "number") {
          return NextResponse.json({ success: false, error: `Variant "${size}" must have numeric price and stock` }, { status: 400 });
        }
      }
    }

    const safeUpdate: Record<string, any> = { updatedAt: FieldValue.serverTimestamp() };
    const allowed = ["name", "description", "images", "variants", "isActive", "is_featured", "category_id", "category_slug"];
    for (const key of allowed) {
      if (body[key] !== undefined) safeUpdate[key] = body[key];
    }

    await ref.update(safeUpdate);

    await adminDb.collection("admin_logs").add({
      adminId: user.uid,
      action: "update_product",
      resourceId: params.id,
      details: `Updated: ${Object.keys(safeUpdate).filter(k => k !== "updatedAt").join(", ")}`,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}

// ── DELETE /api/admin/products/[id] (soft archive) ───────────────────────────
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await verifyAdmin(req);

    const ref = adminDb.collection("products").doc(params.id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });

    await ref.update({ isActive: false, updatedAt: FieldValue.serverTimestamp() });

    await adminDb.collection("admin_logs").add({
      adminId: user.uid,
      action: "archive_product",
      resourceId: params.id,
      details: "Soft-archived",
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}
