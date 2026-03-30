import { adminDb } from "@/lib/firebase-admin";
import { verifyUser } from "@/lib/server-auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const user = await verifyUser(req);
    
    // Auth Check
    if (user.role !== "admin" && user.role !== "superadmin") {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limitParams = parseInt(searchParams.get("limit") || "50", 10);
    const statusFilter = searchParams.get("status");

    let query: FirebaseFirestore.Query = adminDb.collection("orders");

    if (statusFilter) {
      query = query.where("status", "==", statusFilter);
    }

    // Default sorting - newest first
    query = query.orderBy("created_at", "desc").limit(limitParams);

    const snapshot = await query.get();
    
    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    console.error("Failed to fetch admin orders:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
