import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc,
  serverTimestamp 
} from "firebase/firestore";
import { confirmReservations, releaseReservations } from "@/lib/inventory";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "";

    // 1. Verify Signature
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    if (signature !== expectedSignature) {
      console.error("Invalid Webhook Signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;

    // 2. Handle order.paid
    if (event === "order.paid") {
      const razorpayOrderId = payload.payload.order.entity.id;
      const razorpayPaymentId = payload.payload.payment.entity.id;

      // 3. Find Order in Firestore
      const q = query(collection(db, "orders"), where("razorpayOrderId", "==", razorpayOrderId));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        console.error("Order not found in Firestore:", razorpayOrderId);
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      const orderDoc = snapshot.docs[0];
      const firestoreOrderId = orderDoc.id;
      const orderData = orderDoc.data();

      if (orderData.status === "paid") {
        return NextResponse.json({ message: "Order already processed" });
      }

      // 4. Confirm Reservation & Update Order
      if (orderData.reservationIds && orderData.reservationIds.length > 0) {
        await confirmReservations(orderData.reservationIds);
      }

      await updateDoc(doc(db, "orders", firestoreOrderId), {
        status: "paid",
        razorpayPaymentId,
        updatedAt: serverTimestamp(),
      });

      console.log("Order paid and processed:", firestoreOrderId);
      return NextResponse.json({ status: "ok" });
    }

    // 5. Handle payment.failed
    if (event === "payment.failed") {
        const razorpayOrderId = payload.payload.payment.entity.order_id;
        
        const q = query(collection(db, "orders"), where("razorpayOrderId", "==", razorpayOrderId));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const orderDoc = snapshot.docs[0];
            const orderData = orderDoc.data();
            
            if (orderData.reservationIds && orderData.reservationIds.length > 0) {
                await releaseReservations(orderData.reservationIds);
            }

            await updateDoc(doc(db, "orders", orderDoc.id), {
                status: "failed",
                updatedAt: serverTimestamp(),
            });
            console.log("Payment failed, reservations released:", orderDoc.id);
        }
    }

    return NextResponse.json({ status: "ok" });

  } catch (error: any) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
