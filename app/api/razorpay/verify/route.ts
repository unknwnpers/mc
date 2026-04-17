export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { adminDb, verifyAppCheckWithReplayProtection } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { confirmReservation } from "@/lib/inventory";
import { auditLog } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    // 🔐 Layer 1: App Check verification WITH replay protection - CRITICAL for payment verification
    const appCheckResult = await verifyAppCheckWithReplayProtection(req, 60);
    if (!appCheckResult.valid) {
      console.warn('[Razorpay Verify] App Check failed:', appCheckResult.error);
      // If token is simply missing (not invalid/expired), allow with a warning
      // The cryptographic signature verification below provides strong security
      if (appCheckResult.error === "Missing App Check token") {
        console.warn('[Razorpay Verify] App Check token missing - allowing with signature verification as fallback');
      } else {
        return NextResponse.json(
          { success: false, error: appCheckResult.error || "App verification failed" },
          { status: 403 }
        );
      }
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    // ── 1. Input validation ─────────────────────────────────────────────────
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing verification fields" }, { status: 400 });
    }

    // ── 2. Cryptographic signature verification ─────────────────────────────
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) throw new Error("Razorpay secret not configured");

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      await auditLog("SECURITY", {
        event:   "INVALID_PAYMENT_SIGNATURE",
        orderId: razorpay_order_id,
        details: { razorpay_payment_id },
      });
      return NextResponse.json({ success: false, error: "Invalid payment signature" }, { status: 400 });
    }

    // ── 3. Idempotent order confirmation (full transaction) ─────────────────
    // IMPORTANT: confirmReservation is called INSIDE the transaction so both
    // the order status update and the reservation confirmation are atomic.
    //
    // Two paths to find the order:
    //  a) Direct: razorpay_order_id == Firestore document ID (standard online payment)
    //  b) COD conversion: find order where codPaymentRazorpayOrderId == razorpay_order_id
    let orderRef = adminDb.collection("orders").doc(razorpay_order_id);
    let orderSnap = await orderRef.get();
    let isCODConversion = false;

    if (!orderSnap.exists) {
      // Try finding by codPaymentRazorpayOrderId field
      const codQuery = await adminDb
        .collection("orders")
        .where("codPaymentRazorpayOrderId", "==", razorpay_order_id)
        .limit(1)
        .get();

      if (codQuery.empty) {
        return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
      }

      orderRef = codQuery.docs[0].ref;
      orderSnap = codQuery.docs[0];
      isCODConversion = true;
    }

    const existingOrder = orderSnap.data()!;
    let alreadyPaid = false;

    await adminDb.runTransaction(async (tx) => {
      const orderSnap = await tx.get(orderRef);

      if (!orderSnap.exists) {
        throw new Error(`Order not found: ${orderRef.id}`);
      }

      const order = orderSnap.data()!;

      // Idempotency guard — do nothing if already processed
      if (order.status === "paid" && !order.isCOD) {
        alreadyPaid = true;
        return;
      }

      if (isCODConversion) {
        // COD → Online payment conversion
        tx.update(orderRef, {
          isCOD:              false,
          status:             "paid",
          razorpayPaymentId:  razorpay_payment_id,
          razorpaySignature:  razorpay_signature,
          updatedAt:          FieldValue.serverTimestamp(),
          timeline: FieldValue.arrayUnion({
            status: "paid",
            time: Timestamp.now(),
            by: "system",
            note: "COD order paid online via Razorpay",
          }),
        });
      } else {
        // Standard online payment
        tx.update(orderRef, {
          status:             "paid",
          razorpayPaymentId:  razorpay_payment_id,
          razorpaySignature:  razorpay_signature,
          updatedAt:          FieldValue.serverTimestamp(),
          timeline: FieldValue.arrayUnion({
            status: "paid",
            time: Timestamp.now(),
            by: "system",
            note: "Payment verified via Razorpay",
          }),
        });
      }

      // Confirm reservation in the SAME transaction
      // This prevents cleanup cron from restoring stock between the order update
      // and a separate confirmReservation call.
      if (order.reservationId) {
        const resRef = adminDb.collection("reservations").doc(order.reservationId);
        tx.update(resRef, {
          status:    "paid",
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      // Update coupon usage if applicable
      if (order.couponCode) {
        const couponRef = adminDb.collection("coupons").doc(order.couponCode.toUpperCase());
        tx.update(couponRef, {
          usedCount: FieldValue.increment(1)
        });

        const usageRef = adminDb.collection("coupon_usages").doc();
        tx.set(usageRef, {
          userId: order.userId,
          couponCode: order.couponCode.toUpperCase(),
          orderId: orderRef.id,
          usedAt: FieldValue.serverTimestamp()
        });
      }
    });

    if (alreadyPaid) {
      await auditLog("INFO", {
        event:   "PAYMENT_VERIFY_IDEMPOTENT",
        orderId: orderRef.id,
        details: { razorpay_payment_id },
      });
    } else {
      await auditLog("INFO", {
        event:   isCODConversion ? "COD_PAYMENT_CONVERTED" : "PAYMENT_VERIFIED",
        orderId: orderRef.id,
        details: { razorpay_payment_id, signatureValid: true, isCODConversion },
      });
    }

    return NextResponse.json({ success: true, firestoreOrderId: orderRef.id });

  } catch (err: any) {
    console.error("Payment Verification Error:", err);
    await auditLog("ERROR", { event: "PAYMENT_VERIFY_FAILED", error: err.message });
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
