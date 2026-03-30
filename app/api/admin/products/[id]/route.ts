import { adminDb } from "@/lib/firebase-admin";
import { verifyUser } from "@/lib/server-auth";
import { NextResponse } from "next/server";

// 1. UPDATE COMPONENT
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await verifyUser(req);
    
    if (user.role !== "admin" && user.role !== "superadmin") {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 403 });
    }

    const productId = params.id;
    if (!productId) {
      return NextResponse.json({ success: false, error: "Missing product ID" }, { status: 400 });
    }

    const body = await req.json();
    
    const productRef = adminDb.collection("products").doc(productId);
    const snap = await productRef.get();

    if (!snap.exists) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    // Prepare fields to update, omit undefined dynamically or explicitly set
    const updateData: any = {
      updated_at: new Date()
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.price !== undefined) updateData.price = Number(body.price);
    if (body.stock !== undefined) updateData.stock = Number(body.stock);
    if (body.sizes !== undefined) updateData.sizes = body.sizes;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.image_url !== undefined) updateData.image_url = body.image_url;
    if (body.category_id !== undefined) updateData.category_id = body.category_id;
    if (body.category_slug !== undefined) updateData.category_slug = body.category_slug;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.is_featured !== undefined) updateData.is_featured = body.is_featured;

    await productRef.update(updateData);

    // Explicitly Log Admin Action
    await adminDb.collection("admin_logs").add({
      adminId: user.uid,
      action: "update_product",
      resource: "products",
      resourceId: productId,
      details: `Updated product fields: ${Object.keys(updateData).join(', ')}`,
      created_at: new Date()
    });

    return NextResponse.json({ success: true, message: "Product updated successfully" });
  } catch (error: any) {
    console.error("Failed to update product:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 2. ARCHIVE PRODUCT (Archive is safer than DELETE)
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await verifyUser(req);
    
    if (user.role !== "admin" && user.role !== "superadmin") {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 403 });
    }

    const productId = params.id;
    if (!productId) {
      return NextResponse.json({ success: false, error: "Missing product ID" }, { status: 400 });
    }

    const productRef = adminDb.collection("products").doc(productId);
    const snap = await productRef.get();

    if (!snap.exists) {
        return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    // Instead of deleting entirely, we archive it
    await productRef.update({
        is_active: false,
        updated_at: new Date()
    });

    // Explicitly Log Admin Action
    await adminDb.collection("admin_logs").add({
      adminId: user.uid,
      action: "archive_product",
      resource: "products",
      resourceId: productId,
      details: `Archived product`,
      created_at: new Date()
    });

    return NextResponse.json({ success: true, message: "Product archived successfully" });
  } catch (error: any) {
    console.error("Failed to archive product:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
