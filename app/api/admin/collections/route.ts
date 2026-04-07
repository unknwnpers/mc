export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { verifyAdmin } from "@/lib/admin-auth";

// ── GET /api/admin/collections ───────────────────────────────────────────────
export async function GET(req: Request) {
  try {
    await verifyAdmin(req);

    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    let query = adminDb.collection("curated_collections").orderBy("displayOrder", "asc");
    
    if (!includeInactive) {
      query = query.where("isActive", "==", true);
    }

    const snapshot = await query.get();
    const collections = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({ success: true, collections });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}

// ── POST /api/admin/collections ──────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const user = await verifyAdmin(req);
    const body = await req.json();

    const { title, subtitle, type, products, filter, displayOrder, isActive, cardStyle, backgroundImage } = body;

    if (!title || !type || !cardStyle) {
      return NextResponse.json({ success: false, error: "title, type, and cardStyle are required" }, { status: 400 });
    }

    if (type === "manual" && (!products || !Array.isArray(products) || products.length === 0)) {
      return NextResponse.json({ success: false, error: "Manual collections require at least one product" }, { status: 400 });
    }

    if (type === "auto" && (!filter || !filter.limit)) {
      return NextResponse.json({ success: false, error: "Auto collections require a filter with limit" }, { status: 400 });
    }

    const collectionRef = adminDb.collection("curated_collections").doc();
    const newCollection = {
      id: collectionRef.id,
      title: String(title).trim(),
      subtitle: subtitle ? String(subtitle).trim() : "",
      type,
      products: type === "manual" ? products : [],
      filter: type === "auto" ? filter : null,
      displayOrder: displayOrder || 0,
      isActive: isActive !== undefined ? isActive : true,
      cardStyle,
      backgroundImage: backgroundImage || "",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await collectionRef.set(newCollection);

    await adminDb.collection("admin_logs").add({
      adminId: user.uid,
      action: "create_collection",
      resourceId: collectionRef.id,
      details: `Created "${title}"`,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, id: collectionRef.id });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}

// ── PATCH /api/admin/collections ─────────────────────────────────────────────
export async function PATCH(req: Request) {
  try {
    const user = await verifyAdmin(req);
    const { id, data } = await req.json();

    if (!id || !data) {
      return NextResponse.json({ success: false, error: "id and data are required" }, { status: 400 });
    }

    const ref = adminDb.collection("curated_collections").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ success: false, error: "Collection not found" }, { status: 404 });

    const updateData: any = { ...data, updatedAt: FieldValue.serverTimestamp() };

    // Validate type-specific fields
    if (data.type === "manual" && data.products) {
      updateData.filter = null;
    } else if (data.type === "auto" && data.filter) {
      updateData.products = [];
    }

    await ref.update(updateData);

    await adminDb.collection("admin_logs").add({
      adminId: user.uid,
      action: "update_collection",
      resourceId: id,
      details: `Updated fields: ${Object.keys(data).join(", ")}`,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}

// ── DELETE /api/admin/collections ────────────────────────────────────────────
export async function DELETE(req: Request) {
  try {
    const user = await verifyAdmin(req);
    const { id } = await req.json();

    if (!id) return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });

    const ref = adminDb.collection("curated_collections").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ success: false, error: "Collection not found" }, { status: 404 });

    const collectionData = snap.data();
    await ref.delete();

    await adminDb.collection("admin_logs").add({
      adminId: user.uid,
      action: "delete_collection",
      resourceId: id,
      details: `Deleted "${collectionData?.title}"`,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status || 500 });
  }
}
