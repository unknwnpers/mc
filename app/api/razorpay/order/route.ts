export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getRazorpayClient } from "@/lib/razorpay";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { reserveStock } from "@/lib/inventory";
import { auditLog } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { cart, userId, profile, couponCode } = body;

    // ── 1. Input validation ─────────────────────────────────────────────────
    if (!Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    // Check for required delivery info (structured address)
    if (!profile?.addressLine1 || !profile?.city || !profile?.pincode || !profile?.phone) {
      return NextResponse.json({ error: "Complete delivery profile required (address, city, pincode, phone)" }, { status: 400 });
    }

    for (const item of cart) {
      if (!item.id || !item.sku || item.quantity <= 0) {
        return NextResponse.json({
          error: `Invalid cart item: id, sku, and quantity > 0 are required`
        }, { status: 400 });
      }
    }

    // ── 2. Server-side price calculation (never trust the client) ───────────
    let calculatedTotal = 0;
    const validatedItems: any[] = [];

    for (const item of cart) {
      const productSnap = await adminDb.collection("products").doc(item.id).get();
      if (!productSnap.exists) {
        return NextResponse.json({ error: `Product not found: ${item.id}` }, { status: 404 });
      }

      const data = productSnap.data()!;
      if (!data.isActive) {
        return NextResponse.json({ error: `Product "${data.name}" is no longer available` }, { status: 409 });
      }

      const variants = (data.variants || []) as any[];
      const variant  = variants.find((v: any) => v.sku === item.sku);
      if (!variant) {
        return NextResponse.json({
          error: `SKU "${item.sku}" is not available for "${data.name}"`
        }, { status: 409 });
      }

      calculatedTotal += variant.price * item.quantity;
      validatedItems.push({ ...item, price: variant.price });
    }

    // ── 2.5. Server-side discount validation ──────────────────────────────
    let finalTotal = calculatedTotal;
    let discountAmount = 0;

    if (couponCode) {
      const couponRef = adminDb.collection("coupons").doc(couponCode.toUpperCase());
      const couponSnap = await couponRef.get();

      if (couponSnap.exists) {
        const coupon = couponSnap.data()!;
        const isExpired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
        const isUsageLimitReached = coupon.usedCount >= coupon.usageLimit;
        
        if (coupon.active && !isExpired && !isUsageLimitReached && calculatedTotal >= (coupon.minOrder || 0)) {
          if (coupon.type === "percentage") {
            discountAmount = Math.round((calculatedTotal * coupon.value) / 100);
            if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
              discountAmount = coupon.maxDiscount;
            }
          } else if (coupon.type === "fixed") {
            discountAmount = coupon.value;
          }
          
          discountAmount = Math.min(discountAmount, calculatedTotal);
          finalTotal = calculatedTotal - discountAmount;
        }
      }
    }

    // ── 3. Atomic stock reservation (fails entire cart if any item OOS) ─────
    let reservationId: string;
    try {
      reservationId = await reserveStock(cart, userId);
    } catch (err: any) {
      return NextResponse.json({
        error: err.message || "Stock reservation failed",
        type: "INVENTORY_ERROR",
      }, { status: 409 });
    }

    // ── 4. Create Razorpay order ────────────────────────────────────────────
    const razorpay = getRazorpayClient();
    let razorpayOrderId = "";
    let isMock = false;

    if (razorpay) {
      const rpOrder = await razorpay.orders.create({
        amount:   finalTotal * 100,
        currency: "INR",
        receipt:  `rcpt_${Date.now().toString().slice(-6)}_${userId.slice(-4)}`,
      });
      razorpayOrderId = rpOrder.id;
    } else {
      razorpayOrderId = `mock_ord_${Math.random().toString(36).slice(2, 11)}`;
      isMock = true;
    }

    // ── 5. Persist order (keyed by Razorpay order ID for webhook correlation) ──
    const orderDoc = {
      userId,
      items:           validatedItems,
      subtotal:        calculatedTotal,
      discount:        discountAmount,
      total:           finalTotal,
      status:          isMock ? "paid" : "pending_payment",
      couponCode:      couponCode || null,
      razorpayOrderId,
      reservationId,
      recipient: {
        name:  profile.name  || "",
        phone: profile.phone || "",
      },
      shipping: {
        address: `${profile.addressLine1 || ''}${profile.addressLine2 ? ', ' + profile.addressLine2 : ''}${profile.landmark ? ', Near ' + profile.landmark : ''}`,
        city:    profile.city    || "",
        state:   profile.state   || "Kerala",
        pincode: profile.pincode || "",
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await adminDb.collection("orders").doc(razorpayOrderId).set(orderDoc);

    // ── 6. Atomic completion for Mock Orders ────────────────────────────────
    if (isMock && reservationId) {
      await adminDb.collection("reservations").doc(reservationId).update({
        status:    "paid",
        updatedAt: FieldValue.serverTimestamp(),
      });
      
      // Also update coupon usage for mock orders
      if (couponCode) {
        const couponRef = adminDb.collection("coupons").doc(couponCode.toUpperCase());
        await couponRef.update({
          usedCount: FieldValue.increment(1)
        });
        
        await adminDb.collection("coupon_usages").add({
          userId,
          couponCode: couponCode.toUpperCase(),
          orderId: razorpayOrderId,
          usedAt: FieldValue.serverTimestamp()
        });
      }
    }

    await auditLog("INFO", {
      event:   "ORDER_CREATED",
      orderId: razorpayOrderId,
      userId,
      details: { total: finalTotal, items: cart.length, mock: isMock },
    });

    return NextResponse.json({
      orderId:         razorpayOrderId,
      amount:          finalTotal * 100,
      currency:        "INR",
      firestoreOrderId: razorpayOrderId,
      reservationId,
      isMock,
    });

  } catch (err: any) {
    console.error("ORDER CREATION ERROR:", err);
    await auditLog("ERROR", { event: "ORDER_CREATION_FAILED", error: err.message });
    return NextResponse.json({ error: err.message || "Order creation failed" }, { status: 500 });
  }
}
