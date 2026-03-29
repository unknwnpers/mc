import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { getRazorpayClient } from "@/lib/razorpay";

export async function POST(req: Request) {
  try {
    const { orderId, reason, userId } = await req.json();

    if (!orderId || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await runTransaction(db, async (transaction) => {
      const orderRef = doc(db, "orders", orderId);
      const orderSnap = await transaction.get(orderRef);

      if (!orderSnap.exists()) {
        throw new Error("Order not found");
      }

      const orderData = orderSnap.data();

      // 1. Security & State Validation
      if (orderData.userId !== userId) {
        throw new Error("Unauthorized");
      }

      const cancellableStates = ["pending_payment", "paid", "processing"];
      if (!cancellableStates.includes(orderData.status)) {
        throw new Error(`Order in state '${orderData.status}' cannot be cancelled`);
      }

      // 2. Restore Stock
      for (const item of orderData.items) {
        const productRef = doc(db, "products", item.id);
        const productSnap = await transaction.get(productRef);
        
        if (productSnap.exists()) {
          const currentStock = productSnap.data().stock || 0;
          transaction.update(productRef, {
            stock: currentStock + item.quantity,
            updatedAt: serverTimestamp()
          });
        }
      }

      // 3. Update Order Status
      transaction.update(orderRef, {
        status: "cancelled",
        cancelReason: reason || "User requested cancellation",
        cancelledAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return { 
        paymentId: orderData.razorpayPaymentId,
        amount: orderData.total 
      };
    });

    // 4. Handle Razorpay Refund (if paid)
    if (result.paymentId) {
        const razorpay = getRazorpayClient();
        if (razorpay) {
            try {
                await razorpay.payments.refund(result.paymentId, {
                    amount: result.amount * 100, // in paise
                    notes: { reason: reason || "User requested cancellation" }
                });
            } catch (refundError) {
                console.error("Razorpay Refund Error:", refundError);
                // We still returned success because the order is cancelled in our DB.
                // Admin might need to manually check refund if automatic fails.
            }
        }
    }

    return NextResponse.json({ message: "Order cancelled successfully" });

  } catch (error: any) {
    console.error("Cancel Order Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
