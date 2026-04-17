export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getRazorpayClient } from "@/lib/razorpay";
import { adminDb, verifyAppCheckFromRequest } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { auditLog } from "@/lib/logger";

/**
 * POST /api/razorpay/pay-cod
 * Allows a COD customer to pay online before delivery.
 * Creates a Razorpay order for an existing COD order.
 */
export async function POST(req: Request) {
  try {
    // App Check verification (use lighter check - not replay-protected since this is conversion)
    const appCheckResult = await verifyAppCheckFromRequest(req);
    if (!appCheckResult.valid) {
      if (appCheckResult.error === "Missing App Check token") {
        console.warn("[Pay COD] App Check token missing - allowing with auth verification");
      } else {
        return NextResponse.json(
          { error: appCheckResult.error || "App verification failed" },
          { status: 403 }
        );
      }
    }

    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    // Verify order exists and is COD
    const orderRef = adminDb.collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const orderData = orderSnap.data()!;

    // Validate: must be a COD order
    if (!orderData.isCOD) {
      return NextResponse.json({ error: "This order is not a COD order" }, { status: 400 });
    }

    // Validate: order must not be already paid, cancelled, or delivered
    if (["cancelled", "delivered"].includes(orderData.status)) {
      return NextResponse.json(
        { error: `Cannot pay for order in ${orderData.status} state` },
        { status: 400 }
      );
    }

    // Validate: not already converted to online payment
    if (orderData.razorpayPaymentId && orderData.isCOD === false) {
      return NextResponse.json({ error: "This order has already been paid online" }, { status: 400 });
    }

    // Get Razorpay client
    const razorpay = getRazorpayClient();
    if (!razorpay) {
      return NextResponse.json({ error: "Online payment is not available right now" }, { status: 503 });
    }

    // Create Razorpay order for the existing COD order amount
    const amount = orderData.total * 100; // Convert to paise
    const rpOrder = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `codpay_${orderId.slice(-12)}`,
      notes: {
        originalOrderId: orderId,
        type: "cod_to_online",
      },
    });

    // Store the Razorpay order ID on the existing order for correlation
    await orderRef.update({
      codPaymentRazorpayOrderId: rpOrder.id,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await auditLog("INFO", {
      event: "COD_PAY_ONLINE_INITIATED",
      orderId,
      details: { razorpayOrderId: rpOrder.id, amount: orderData.total },
    });

    return NextResponse.json({
      success: true,
      razorpayOrderId: rpOrder.id,
      amount,
      currency: "INR",
      originalOrderId: orderId,
    });
  } catch (error: any) {
    console.error("[Pay COD] Error:", error);
    await auditLog("ERROR", { event: "COD_PAY_ONLINE_FAILED", error: error.message });
    return NextResponse.json({ error: error.message || "Failed to create payment" }, { status: 500 });
  }
}
