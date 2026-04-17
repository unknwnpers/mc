export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { verifyUser } from "@/lib/server-auth";

export async function POST(req: Request) {
  try {
    const user = await verifyUser(req);
    
    // Authorization check
    if (user.role !== "admin" && user.role !== "superadmin") {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 403 });
    }

    const body = await req.json();
    const { orderId, status, trackingNumber, trackingUrl, courierName, note } = body;

    const validStatuses = ["pending_payment", "paid", "created", "processing", "shipped", "delivered", "cancelled", "failed"];

    if (!orderId || !status || !validStatuses.includes(status)) {
      return NextResponse.json({ success: false, error: "Invalid request data" }, { status: 400 });
    }

    const orderRef = adminDb.collection("orders").doc(orderId);

    // Verify order exists before updating
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    // Build update object
    const updateData: Record<string, any> = {
      status,
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Add timeline entry
    const timelineEntry: Record<string, any> = {
      status,
      time: Timestamp.now(), // Cannot use FieldValue.serverTimestamp() inside arrays
      by: user.uid,
      note: note || "",
    };
    updateData.timeline = FieldValue.arrayUnion(timelineEntry);

    // Add tracking info when shipped
    if (status === "shipped" || status === "delivered") {
      if (trackingNumber) updateData.trackingNumber = trackingNumber;
      if (trackingUrl) updateData.trackingUrl = trackingUrl;
      if (courierName) updateData.courierName = courierName;
    }

    // Perform atomic update
    await orderRef.update(updateData);

    // Log admin action
    await adminDb.collection("admin_logs").add({
      adminId: user.uid,
      action: "update_order_status",
      resource: "orders",
      resourceId: orderId,
      details: `Status updated to ${status}${trackingNumber ? `, tracking: ${trackingNumber}` : ""}`,
      created_at: new Date()
    });

    return NextResponse.json({ success: true, message: `Order status updated to ${status}` });
  } catch (error: any) {
    console.error("Failed to update order status:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
