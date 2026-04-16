export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdmin } from "@/lib/admin-auth";
import { sendOrderNotification } from "@/lib/email-service";
import { auditLog } from "@/lib/logger";

/**
 * POST /api/admin/orders/notify
 * Send order status notification email to customer
 * Body: { orderId, status: 'shipped' | 'delivered', trackingNumber?, estimatedDelivery? }
 */
export async function POST(req: Request) {
  try {
    // Verify admin
    await verifyAdmin(req);

    const body = await req.json();
    const { orderId, status, trackingNumber, estimatedDelivery } = body;

    if (!orderId || !status) {
      return NextResponse.json(
        { success: false, error: "orderId and status are required" },
        { status: 400 }
      );
    }

    if (!['shipped', 'delivered', 'cancelled'].includes(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid status. Must be: shipped, delivered, or cancelled" },
        { status: 400 }
      );
    }

    // Get order data
    const orderRef = adminDb.collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    const orderData = orderSnap.data()!;

    // Check if order has email
    const userEmail = orderData.recipient?.email;
    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: "Order does not have customer email" },
        { status: 400 }
      );
    }

    // Send notification
    const result = await sendOrderNotification({
      orderId: orderId,
      userEmail: userEmail,
      userName: orderData.recipient?.name || "Customer",
      items: orderData.items || [],
      total: orderData.total || 0,
      status: status,
      shippingAddress: orderData.recipient?.address || orderData.shipping,
      trackingNumber: trackingNumber || orderData.trackingNumber,
      estimatedDelivery: estimatedDelivery,
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to send email");
    }

    // Update order with tracking info if provided
    if (trackingNumber) {
      await orderRef.update({
        trackingNumber: trackingNumber,
        updatedAt: new Date(),
      });
    }

    // Log the notification
    await auditLog("INFO", {
      event: "ORDER_NOTIFICATION_SENT",
      orderId,
      details: { status, trackingNumber, recipient: userEmail },
    });

    return NextResponse.json({
      success: true,
      message: `Order ${status} notification sent to ${userEmail}`,
    });

  } catch (error: any) {
    console.error("[Order Notify API] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to send notification" },
      { status: 500 }
    );
  }
}
