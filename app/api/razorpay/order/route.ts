import { NextResponse } from "next/server";
import { getRazorpayClient } from "@/lib/razorpay";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { reserveStock } from "@/lib/inventory";

export async function POST(req: Request) {
  try {
    const { cart, userId, profile } = await req.json();

    if (!cart || !userId || !profile) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Server-side Amount Validation (Prevent Manipulation)
    let calculatedTotal = 0;
    for (const item of cart) {
      const productDoc = await getDoc(doc(db, "products", item.id));
      if (!productDoc.exists()) {
        return NextResponse.json({ error: `Product ${item.name} not found` }, { status: 404 });
      }
      const price = productDoc.data().price;
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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "orders"), orderData);

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
