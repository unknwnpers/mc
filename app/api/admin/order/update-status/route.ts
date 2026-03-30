import { adminDb } from "@/lib/firebase-admin";
import { verifyUser } from "@/lib/server-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const user = await verifyUser(req);
    
    // Authorization check
    if (user.role !== "admin" && user.role !== "superadmin") {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 403 });
    }

    const body = await req.json();
    const { orderId, status } = body;

    const validStatuses = ["pending", "paid", "processing", "shipped", "delivered", "cancelled"];

    if (!orderId || !status || !validStatuses.includes(status)) {
      return NextResponse.json({ success: false, error: "Invalid request data" }, { status: 400 });
    }

    const orderRef = adminDb.collection("orders").doc(orderId);

    // Verify order exists before updating
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    // Perform atomic update
    await orderRef.update({
      status,
      updated_at: new Date()
    });

    // Log admin action
    await adminDb.collection("admin_logs").add({
      adminId: user.uid,
      action: "update_order_status",
      resource: "orders",
      resourceId: orderId,
      details: `Status updated to ${status}`,
      created_at: new Date()
    });

    return NextResponse.json({ success: true, message: `Order status updated to ${status}` });
  } catch (error: any) {
    console.error("Failed to update order status:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
