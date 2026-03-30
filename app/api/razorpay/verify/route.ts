import { NextResponse } from "next/server";
import crypto from "crypto";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { confirmReservations } from "@/lib/inventory";
import { auditLog } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing verification fields" }, { status: 400 });
    }

    // 1. Initial Setup
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
        throw new Error("Razorpay secret not configured");
    }
    const sign = razorpay_order_id + "|" + razorpay_payment_id;

    // 2. Strict Idempotency (Deduplication)
    const paymentCheckSnapshot = await adminDb.collection("orders")
        .where("razorpayPaymentId", "==", razorpay_payment_id)
        .get();
    
    if (!paymentCheckSnapshot.empty) {
        await auditLog("INFO", {
            event: "IDEMPOTENT_RETRY_DETECTED",
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id,
            details: "Verification called for already processed payment"
        });
        return NextResponse.json({ success: true, firestoreOrderId: paymentCheckSnapshot.docs[0].id });
    }

    // 3. Verify Signature
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(sign)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      await auditLog("SECURITY", {
          event: "INVALID_SIGNATURE_ATTEMPT",
          orderId: razorpay_order_id,
          details: { razorpay_payment_id, razorpay_signature }
      });
      return NextResponse.json({ success: false, error: "Invalid payment signature" }, { status: 400 });
    }

    // 4. Find and Update Order in Firestore
    const snapshot = await adminDb.collection("orders")
        .where("razorpayOrderId", "==", razorpay_order_id)
        .get();

    if (snapshot.empty) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    const orderDoc = snapshot.docs[0];
    const orderData = orderDoc.data();

    // 5. Confirm Reservations & Set Paid status
    if (orderData.status !== "paid") {
        if (orderData.reservationIds && orderData.reservationIds.length > 0) {
            await confirmReservations(orderData.reservationIds);
        }

        await adminDb.collection("orders").doc(orderDoc.id).update({
            status: "paid",
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
            updatedAt: FieldValue.serverTimestamp(),
        });

        await auditLog("INFO", {
            event: "PAYMENT_VERIFIED",
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id,
            details: "Signature valid, order marked as paid"
        });
    }

    return NextResponse.json({ success: true, firestoreOrderId: orderDoc.id });

  } catch (error: any) {
    await auditLog("ERROR", {
        event: "PAYMENT_VERIFICATION_FAILED",
        error: error.message,
        details: {} // Removed direct access to req for safety
    });
    console.error("Payment Verification Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
