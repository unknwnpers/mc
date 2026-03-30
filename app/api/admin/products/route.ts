import { adminDb } from "@/lib/firebase-admin";
import { verifyUser } from "@/lib/server-auth";
import { NextResponse } from "next/server";

// 1. GET ALL PRODUCTS (ADMIN)
export async function GET(req: Request) {
  try {
    const user = await verifyUser(req);
    
    if (user.role !== "admin" && user.role !== "superadmin") {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const includeArchived = searchParams.get("includeArchived") === "true";

    let query: FirebaseFirestore.Query = adminDb.collection("products");

    if (!includeArchived) {
        query = query.where("is_active", "==", true);
    }
    
    // Sort by created date descending
    query = query.orderBy("created_at", "desc");

    const snapshot = await query.get();
    
    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ success: true, products });
  } catch (error: any) {
    console.error("Failed to fetch admin products:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 2. CREATE PRODUCT (ADMIN)
export async function POST(req: Request) {
  try {
    const user = await verifyUser(req);
    
    if (user.role !== "admin" && user.role !== "superadmin") {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 403 });
    }

    const body = await req.json();
    
    // Validate required payload
    if (!body.name || body.price === undefined || body.stock === undefined) {
       return NextResponse.json({ success: false, error: "Missing core product fields (name, price, stock)" }, { status: 400 });
    }

    const productRef = adminDb.collection("products").doc();
    
    const newProduct = {
      id: productRef.id,
      name: body.name,
      price: Number(body.price),
      stock: Number(body.stock),
      sizes: body.sizes || [],
      is_active: body.is_active !== undefined ? body.is_active : true, // default active
      image_url: body.image_url || "",
      category_id: body.category_id || "",
      category_slug: body.category_slug || "",
      description: body.description || "",
      is_featured: body.is_featured || false,
      created_at: new Date(),
      updated_at: new Date()
    };

    await productRef.set(newProduct);

    // Explicitly Log Admin Action
    await adminDb.collection("admin_logs").add({
      adminId: user.uid,
      action: "create_product",
      resource: "products",
      resourceId: productRef.id,
      details: `Created product ${body.name}`,
      created_at: new Date()
    });

    return NextResponse.json({ success: true, product: newProduct });
  } catch (error: any) {
    console.error("Failed to create product:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
