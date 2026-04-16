export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { adminDb, verifyAppCheckWithReplayProtection } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { releaseReservation } from "@/lib/inventory";
import { auditLog } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    // 🔐 App Check verification for payment cancellation
    const appCheckResult = await verifyAppCheckWithReplayProtection(req, 60);
    if (!appCheckResult.valid) {
      return NextResponse.json(
        { success: false, error: appCheckResult.error || "App verification failed" },
        { status: 403 }
      );
    }

    const { reservationId, razorpayOrderId } = await req.json();

    if (!reservationId) {
      return NextResponse.json({ error: "No reservation to release" }, { status: 400 });
    }

    // 1. Transactionally Release Stock Reservation
    await releaseReservation(reservationId);

    // 2. Exact Map Update Order Status
    if (razorpayOrderId) {
      const orderRef = adminDb.collection("orders").doc(razorpayOrderId);
      
      await adminDb.runTransaction(async (tx) => {
          const snap = await tx.get(orderRef);
          if (!snap.exists) return;
          
          if (snap.data()?.status === "pending_payment") {
             tx.update(orderRef, {
                 status: "failed",
                 updatedAt: FieldValue.serverTimestamp()
             });
          }
      });
      
      await auditLog("INFO", {
          event: "ORDER_FAILED_AND_RELEASED",
          orderId: razorpayOrderId,
          details: "User cancelled or payment failed from frontend"
      });
    }

    return NextResponse.json({ success: true, message: "Reservation released safely" });

  } catch (error: any) {
    console.error("Manual Release Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
