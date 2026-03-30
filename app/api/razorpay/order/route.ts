import { NextResponse } from "next/server";
import { getRazorpayClient } from "@/lib/razorpay";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { reserveStock } from "@/lib/inventory";
import { auditLog } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const { cart, userId, profile } = await req.json();

    if (!cart || !userId || !profile) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 0. Stateful Rate Limiting (Bot Protection)
    // Avoid "Pending Order Spam" - limit to 3 pending orders in 15 mins
    try {
        const staleTime = new Date(Date.now() - 15 * 60 * 1000);
        const spamSnapshot = await adminDb.collection("orders")
            .where("userId", "==", userId)
            .where("status", "==", "pending_payment")
            .where("createdAt", ">", staleTime)
            .get();
        
        if (spamSnapshot.size >= 3) {
            await auditLog("WARN", {
                event: "RATE_LIMIT_EXEEDED",
                userId,
                details: "Too many pending orders in a short time"
            });
            return NextResponse.json({ 
                error: "Too many pending orders. Please complete your current order first.",
                type: "RATE_LIMIT_ERROR"
            }, { status: 429 });
        }
    } catch (qErr: any) {
        // FAIL-OPEN: If query fails (likely missing index), log it but let the customer buy!
        console.error("Rate-limit query failed (Check Firestore Indexes):", qErr.message);
        await auditLog("WARN", {
            event: "RATE_LIMIT_QUERY_FAILED",
            error: qErr.message,
            details: "Checkout allowed to proceed (Fail-Open mode)"
        });
    }

    // 1. Server-side Amount Validation (Prevent Manipulation)
    let calculatedTotal = 0;
    for (const item of cart) {
      const productDoc = await adminDb.collection("products").doc(item.id).get();
      if (!productDoc.exists) {
        return NextResponse.json({ error: `Product ${item.name} not found` }, { status: 404 });
      }
      const price = productDoc.data()?.price || 0;
      calculatedTotal += price * item.quantity;
    }

    // 2. Atomic Stock Reservation
    let reservationIds: string[] = [];
    try {
      reservationIds = await reserveStock(cart, userId);
    } catch (error: any) {
      return NextResponse.json({ 
        error: error.message || "Stock reservation failed",
        type: "INVENTORY_ERROR"
      }, { status: 409 }); // Conflict
    }

    // 3. Create Razorpay Order or Bypass
    const razorpay = getRazorpayClient();
    let orderId = "";
    let isMock = false;

    if (razorpay) {
        const options = {
            amount: calculatedTotal * 100, // Amount in paise
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
        };
        const order = await razorpay.orders.create(options);
        orderId = order.id;
    } else {
        // BYPASS MODE - Generate Mock ID
        orderId = `mock_ord_${Math.random().toString(36).substring(2, 11)}`;
        isMock = true;
    }

    // 3. Create Pending Order in Firestore
    const orderData = {
      userId,
      items: cart,
      total: calculatedTotal,
      status: isMock ? "processing" : "pending_payment",
      razorpayOrderId: orderId,
      recipient: {
        name: profile.name,
        phone: profile.phone,
      },
      shipping: {
        address: profile.address,
        city: profile.city || "",
        pincode: profile.pincode || "",
      },
      reservationIds,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection("orders").add(orderData);

    return NextResponse.json({
      orderId: orderId,
      amount: calculatedTotal * 100,
      currency: "INR",
      firestoreOrderId: docRef.id,
      reservationIds,
      isMock
    });

  } catch (error: any) {
    console.error("Razorpay Order Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
