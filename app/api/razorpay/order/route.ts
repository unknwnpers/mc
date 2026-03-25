import { NextResponse } from "next/server";
import { razorpay } from "@/lib/razorpay";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";

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

    // 2. Create Razorpay Order
    const options = {
      amount: calculatedTotal * 100, // Amount in paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    // 3. Create Pending Order in Firestore
    const orderData = {
      userId,
      items: cart,
      total: calculatedTotal,
      status: "pending_payment",
      razorpayOrderId: order.id,
      shippingAddress: profile.address,
      phoneNumber: profile.phone,
      customerName: profile.name,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "orders"), orderData);

    return NextResponse.json({
      orderId: order.id,
      amount: options.amount,
      currency: options.currency,
      firestoreOrderId: docRef.id
    });

  } catch (error: any) {
    console.error("Razorpay Order Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
