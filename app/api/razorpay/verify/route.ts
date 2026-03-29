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
import { confirmReservations } from "@/lib/inventory";

export async function POST(req: Request) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing verification fields" }, { status: 400 });
    }

    // 1. Verify Signature
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
        throw new Error("Razorpay secret not configured");
    }

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(sign)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ success: false, error: "Invalid payment signature" }, { status: 400 });
    }

    // 2. Find and Update Order in Firestore
    const q = query(collection(db, "orders"), where("razorpayOrderId", "==", razorpay_order_id));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    const orderDoc = snapshot.docs[0];
    const orderData = orderDoc.data();

    // 3. Confirm Reservations & Set Paid status
    if (orderData.status !== "paid") {
        if (orderData.reservationIds && orderData.reservationIds.length > 0) {
            await confirmReservations(orderData.reservationIds);
        }

        await updateDoc(doc(db, "orders", orderDoc.id), {
            status: "paid",
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
            updatedAt: serverTimestamp(),
        });
    }

    return NextResponse.json({ success: true, firestoreOrderId: orderDoc.id });

  } catch (error: any) {
    console.error("Payment Verification Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
