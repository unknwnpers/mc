import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  runTransaction, 
  serverTimestamp 
} from "firebase/firestore";

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

      // 4. ATOMIC TRANSACTION: Stock Decrement + Order Status Update
      await runTransaction(db, async (transaction) => {
        // Fetch products inside transaction to ensure fresh stock data
        const productRefs = orderData.items.map((item: any) => doc(db, "products", item.id));
        const productSnaps = await Promise.all(productRefs.map((ref: any) => transaction.get(ref)));

        // Check stock levels first
        for (let i = 0; i < productSnaps.length; i++) {
          const snap = productSnaps[i];
          const item = orderData.items[i];
          if (!snap.exists()) throw new Error(`Product ${item.name} not found`);
          
          const currentStock = snap.data().stock || 0;
          if (currentStock < item.quantity) {
             throw new Error(`Insufficient stock for ${item.name}`);
          }
        }

        // Commit Updates
        productRefs.forEach((ref: any, i: number) => {
            const currentStock = productSnaps[i].data().stock || 0;
            transaction.update(ref, { 
                stock: currentStock - orderData.items[i].quantity 
            });
        });

        // Update Order
        transaction.update(doc(db, "orders", firestoreOrderId), {
          status: "paid",
          razorpayPaymentId,
          updatedAt: serverTimestamp(),
        });

      });

      console.log("Order paid and processed:", firestoreOrderId);
      return NextResponse.json({ status: "ok" });
    }

    return NextResponse.json({ status: "ok" });

  } catch (error: any) {
    console.error("Webhook Error:", error);
    // Note: Razorpay expects a 200 OK to stop retrying, but for critical logic errors we might want a 500.
    // However, if the stock check fails, we should handle it gracefully.
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
