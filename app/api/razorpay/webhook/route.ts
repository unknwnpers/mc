export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { releaseReservation } from "@/lib/inventory";
import { auditLog } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const rawBody  = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing webhook signature" }, { status: 400 });
    }

    // ── 1. HMAC signature verification ─────────────────────────────────────
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) throw new Error("RAZORPAY_WEBHOOK_SECRET is not configured");

    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    if (expected !== signature) {
      await auditLog("SECURITY", { event: "WEBHOOK_INVALID_SIGNATURE", details: "Rejected unauthorized webhook" });
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // ── 2. Parse event ──────────────────────────────────────────────────────
    const payload   = JSON.parse(rawBody);
    const event     = payload.event as string;

    let orderId:   string | undefined;
    let paymentId: string | undefined;

    if (payload.payload?.payment?.entity) {
      paymentId = payload.payload.payment.entity.id;
      orderId   = payload.payload.payment.entity.order_id;
    } else if (payload.payload?.order?.entity) {
      orderId = payload.payload.order.entity.id;
    }

    if (!orderId) {
      return NextResponse.json({ success: true, message: "No order ID — ignored" });
    }

    let orderRef = adminDb.collection("orders").doc(orderId);
    let orderSnap = await orderRef.get();

    // Fallback: COD-converted orders use codPaymentRazorpayOrderId, not doc ID
    if (!orderSnap.exists) {
      const codQuery = await adminDb
        .collection("orders")
        .where("codPaymentRazorpayOrderId", "==", orderId)
        .limit(1)
        .get();

      if (!codQuery.empty) {
        orderRef = codQuery.docs[0].ref;
        orderSnap = codQuery.docs[0];
      }
    }

    // ── 3. payment.captured / payment.authorized / order.paid ───────────────
    if (["payment.captured", "payment.authorized", "order.paid"].includes(event)) {
      await adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(orderRef);
        if (!snap.exists) return;

        const order = snap.data()!;

        // Idempotency — already processed
        if (order.status === "paid") return;

        // Mark order paid
        tx.update(orderRef, {
          status: "paid",
          ...(paymentId && { razorpayPaymentId: paymentId }),
          updatedAt: FieldValue.serverTimestamp(),
        });

        // Confirm reservation inside the same transaction — atomic
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

      await auditLog("INFO", {
        event:   `WEBHOOK_${event.toUpperCase()}`,
        orderId,
        details: { paymentId: paymentId || "unknown" },
      });
    }

    // ── 4. payment.failed ───────────────────────────────────────────────────
    else if (event === "payment.failed") {
      let reservationId: string | undefined;

      // Mark order failed — read reservationId in same transaction
      await adminDb.runTransaction(async (tx) => {
        const snap = await tx.get(orderRef);
        if (!snap.exists) return;

        const order = snap.data()!;
        if (order.status === "paid") return; // already paid — ignore failure

        reservationId = order.reservationId;

        tx.update(orderRef, {
          status:    "failed",
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      // Release stock — runs its own transaction; must be OUTSIDE above tx
      // because Firestore doesn't allow nested transactions
      if (reservationId) {
        await releaseReservation(reservationId);
      }

      await auditLog("WARN", {
        event:   "WEBHOOK_PAYMENT_FAILED",
        orderId,
        details: { paymentId: paymentId || "unknown" },
      });
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("Webhook Error:", err);
    await auditLog("ERROR", { event: "WEBHOOK_UNHANDLED_ERROR", error: err.message });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
