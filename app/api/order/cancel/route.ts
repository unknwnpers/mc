import { adminDb } from "@/lib/firebase-admin";
import { verifyUser } from "@/lib/server-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const user = await verifyUser(req);
    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ success: false, error: "Missing orderId" }, { status: 400 });
    }

    const orderRef = adminDb.collection("orders").doc(orderId);

    await adminDb.runTransaction(async (tx) => {
      const orderSnap = await tx.get(orderRef);
      const order = orderSnap.data();

      if (!orderSnap.exists || !order) {
        throw new Error("Order not found");
      }

      if (user.role !== 'admin' && user.role !== 'superadmin' && order.userId !== user.uid) {
         throw new Error("Unauthorized to access this order");
      }

      if (["shipped", "delivered", "cancelled"].includes(order.status)) {
        throw new Error(`Cannot cancel order in ${order.status} state`);
      }

      // 1. PERFORM ALL READS FIRST
      const productSnaps = [];
      if (order.items && Array.isArray(order.items)) {
        for (const item of order.items) {
          const productRef = adminDb.collection("products").doc(item.productId);
          const productSnap = await tx.get(productRef);
          productSnaps.push({ snap: productSnap, item, ref: productRef });
        }
      }

      // 2. CHECK CONSTRAINTS AND PERFORM ALL WRITES
      // restore stock
      for (const { snap, item, ref } of productSnaps) {
        const product = snap.data();
        if (product) {
          tx.update(ref, {
            stock: product.stock + item.quantity,
            updated_at: new Date()
          });
        }

        tx.set(adminDb.collection("inventory_logs").doc(), {
          productId: item.productId,
          change: item.quantity,
          reason: "order_cancelled",
          orderId,
          created_at: new Date(),
        });
      }

      tx.update(orderRef, {
        status: "cancelled",
        updated_at: new Date(),
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Order cancellation failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
