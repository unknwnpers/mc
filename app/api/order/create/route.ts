import { adminDb } from "@/lib/firebase-admin";
import { verifyUser } from "@/lib/server-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const user = await verifyUser(req);
    const body = await req.json();

    const { cart, payment, shipping } = body;

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json({ success: false, error: "Invalid cart" }, { status: 400 });
    }

    const orderRef = adminDb.collection("orders").doc();

    await adminDb.runTransaction(async (tx) => {
      let total = 0;

      // 1. PERFORM ALL READS FIRST
      const productSnaps = [];
      for (const item of cart) {
        const productRef = adminDb.collection("products").doc(item.productId);
        const productSnap = await tx.get(productRef);
        productSnaps.push({ snap: productSnap, item, ref: productRef });
      }

      // 2. CHECK ALL CONSTRAINTS AND PERFORM ALL WRITES
      for (const { snap, item, ref } of productSnaps) {
        const product = snap.data();

        if (!snap.exists || !product) {
          throw new Error(`Product ${item.name || item.productId} not found`);
        }

        // -------------------------------------------------------------
        // CORE RULES: Dynamic Scarcity & Fair Distribution
        // -------------------------------------------------------------
        const total_stock = product.stock;
        const reserve = Math.ceil(0.2 * total_stock);
        const sellable_stock = total_stock - reserve;
        
        // Enforce max 2 items per customer, dynamically scaling down based on stock
        const max_per_customer = Math.min(2, Math.floor(sellable_stock / 3));

        // 1. Prevent selling into reserve (Strict cutoff)
        if (item.quantity > sellable_stock) {
          throw new Error(`Insufficient sellable stock for "${product.name}". Reserve limits active.`);
        }

        // 2. Never trust frontend quantity - enforce max allowed strictly
        if (max_per_customer <= 0) {
          throw new Error(`"${product.name}" is currently unavailable for purchase.`);
        }

        if (item.quantity > max_per_customer) {
          throw new Error(`Maximum allowed quantity for "${product.name}" is ${max_per_customer} to ensure fair distribution.`);
        }

        // 🔥 reduce stock
        tx.update(ref, {
          stock: product.stock - item.quantity,
          updated_at: new Date()
        });

        // log
        tx.set(adminDb.collection("inventory_logs").doc(), {
          productId: item.productId,
          change: -item.quantity,
          reason: "order_created",
          orderId: orderRef.id,
          created_at: new Date(),
        });

        total += item.price * item.quantity;
      }

      // create order
      tx.set(orderRef, {
        id: orderRef.id,
        userId: user.uid,
        items: cart,
        totalAmount: total,
        status: "paid", // initial status as defined
        payment: payment || { status: "paid" },
        shipping: shipping || {},
        created_at: new Date(),
        updated_at: new Date(),
      });
    });

    return NextResponse.json({ success: true, orderId: orderRef.id });

  } catch (error: any) {
    console.error("Order creation failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
