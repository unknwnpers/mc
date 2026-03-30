import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { releaseReservations } from "@/lib/inventory";

export async function POST(req: Request) {
  try {
    const { reservationIds, razorpayOrderId } = await req.json();

    if (!reservationIds || reservationIds.length === 0) {
      return NextResponse.json({ error: "No reservations to release" }, { status: 400 });
    }

    // 1. Release Stock Reservations
    await releaseReservations(reservationIds);

    // 2. Update Order Status to failed if it exists
    if (razorpayOrderId) {
      const snapshot = await adminDb.collection("orders")
        .where("razorpayOrderId", "==", razorpayOrderId)
        .get();
      
      if (!snapshot.empty) {
        const orderDoc = snapshot.docs[0];
        const orderData = orderDoc.data();
        
        // Only update if not already paid/completed
        if (orderData.status === "pending_payment") {
          await adminDb.collection("orders").doc(orderDoc.id).update({
            status: "failed",
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      }
    }

    return NextResponse.json({ success: true, message: "Reservations released" });

  } catch (error: any) {
    console.error("Manual Release Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
