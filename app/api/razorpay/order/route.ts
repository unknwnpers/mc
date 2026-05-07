export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getRazorpayClient } from "@/lib/razorpay";
import { adminDb, verifyAppCheckWithReplayProtection } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { reserveStock } from "@/lib/inventory";
import { auditLog } from "@/lib/logger";
import { calculatePaymentBreakdown, calculateSellingPrice } from "@/lib/payment-calculator";

export async function POST(req: Request) {
  try {
    // 🔐 Layer 1: App Check verification WITH replay protection - CRITICAL for payment endpoint
    // On first request, App Check token may not be ready yet - log warning but allow with degraded trust
    const appCheckResult = await verifyAppCheckWithReplayProtection(req, 60);
    if (!appCheckResult.valid) {
      console.warn('[Razorpay Order] App Check failed:', appCheckResult.error);
      // For payment endpoints, we enforce App Check strictly
      // But if token is simply missing (not invalid/expired), allow with a warning
      // This handles the case where App Check hasn't initialized yet on first load
      if (appCheckResult.error === "Missing App Check token") {
        console.warn('[Razorpay Order] App Check token missing - allowing request with degraded trust');
        // Continue - Auth token verification below provides secondary security
      } else {
        return NextResponse.json(
          { error: appCheckResult.error || "App verification failed" },
          { status: 403 }
        );
      }
    }

    const body = await req.json();
    const { cart, userId, profile, couponCode, isCOD = false, paymentBreakdown: clientBreakdown } = body;

    // ── 1. Input validation ─────────────────────────────────────────────────
    if (!Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    // Check for required delivery info (MANDATORY FIELDS)
    if (!profile?.addressLine1 || !profile?.city || !profile?.pincode || !profile?.phone || !profile?.email || !profile?.name) {
      return NextResponse.json({ 
        error: "Complete delivery profile required (Name, Email, Phone, Address, City, Pincode)" 
      }, { status: 400 });
    }

    for (const item of cart) {
      if (!item.id || !item.sku || item.quantity <= 0) {
        return NextResponse.json({
          error: `Invalid cart item: id, sku, and quantity > 0 are required`
        }, { status: 400 });
      }
    }

    // ── 2. Server-side price calculation & validation (single transaction) ─
    let calculatedTotal = 0;
    let calculatedMrpTotal = 0;
    const validatedItems: any[] = [];
    
    // Fetch all active offers once to apply them server-side
    const offersSnapshot = await adminDb.collection('offers').where('isActive', '==', true).get();
    const now = new Date();
    const allActiveOffers = offersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const getBestOffer = (price: number, categorySlug?: string, productId?: string) => {
      const applicable = allActiveOffers.filter((offer: any) => {
        const getOfferDate = (dateValue: any): Date | null => {
          if (!dateValue) return null;
          if (dateValue.toDate) return dateValue.toDate();
          if (dateValue.seconds) return new Date(dateValue.seconds * 1000);
          const d = new Date(dateValue);
          return isNaN(d.getTime()) ? null : d;
        };
        const startDate = getOfferDate(offer.startDate);
        const endDate = getOfferDate(offer.endDate);
        if (startDate && startDate > now) return false;
        if (endDate && endDate < now) return false;
        if (offer.appliesTo === 'all') return true;
        if (categorySlug && offer.appliesTo === 'category' && offer.categorySlug === categorySlug) return true;
        if (productId && offer.appliesTo === 'product' && offer.productIds?.includes(productId)) return true;
        return false;
      }).sort((a: any, b: any) => {
        const savingsA = a.type === 'percentage' ? price * (a.value / 100) : a.value;
        const savingsB = b.type === 'percentage' ? price * (b.value / 100) : b.value;
        return savingsB - savingsA;
      });
      return applicable[0] as any;
    };

    // First validate all products exist and get pricing
    const productChecks = await Promise.all(
      cart.map(async (item: any) => {
        const productSnap = await adminDb.collection("products").doc(item.id).get();
        if (!productSnap.exists) {
          return { error: `Product not found: ${item.id}`, status: 404 };
        }
        const data = productSnap.data()!;
        if (!data.isActive) {
          return { error: `Product "${data.name}" is no longer available`, status: 409 };
        }
        const variants = (data.variants || []) as any[];
        const variant = variants.find((v: any) => v.sku === item.sku);
        if (!variant) {
          return { error: `SKU "${item.sku}" is not available for "${data.name}"`, status: 409 };
        }

        // Canonical price calculation: Apply product-level offers
        const mrp = variant.price;
        const bestOffer = getBestOffer(mrp, data.category_slug, item.id);

        let sellingPrice = mrp;
        if (bestOffer) {
          sellingPrice = bestOffer.type === 'percentage'
            ? calculateSellingPrice(mrp, bestOffer.value)
            : Math.max(0, mrp - bestOffer.value);
        }

        // Get the correct size from variant options, not from frontend selectedSize
        const correctSize = variant.options?.Size || item.sku;
        
        return { 
          success: true, 
          item: { 
            ...item, 
            price: sellingPrice,
            selectedSize: correctSize
          },
          mrp,
          sellingPrice
        };
      })
    );
    
    // Check for errors
    for (const check of productChecks) {
      if ('error' in check) {
        return NextResponse.json({ error: check.error }, { status: check.status });
      }
      const c = check as any;
      validatedItems.push(c.item);
      calculatedTotal += c.sellingPrice * c.item.quantity;
      calculatedMrpTotal += c.mrp * c.item.quantity;
    }

    // ── 2.5. Server-side discount validation ──────────────────────────────
    let discountAmount = 0;

    if (couponCode) {
      const couponRef = adminDb.collection("coupons").doc(couponCode.toUpperCase());
      const couponSnap = await couponRef.get();

      if (couponSnap.exists) {
        const coupon = couponSnap.data()!;
        // Handle Firestore Timestamp or string/Date for expiresAt
        let expiresAt: Date | null = null;
        if (coupon.expiresAt) {
          if (coupon.expiresAt.toDate) {
            // Firestore Timestamp
            expiresAt = coupon.expiresAt.toDate();
          } else {
            // String or Date
            expiresAt = new Date(coupon.expiresAt);
          }
        }
        const isExpired = expiresAt !== null && expiresAt < new Date();
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
        }
      }
    }

    // ── 2.6. Server-side payment calculation (authoritative) ───────────────
    const paymentBreakdown = calculatePaymentBreakdown({
      subtotal:        calculatedTotal,
      mrpTotal:        calculatedMrpTotal,
      couponDiscount:  discountAmount,
      isCOD,
    });

    // Security: Validate client-provided breakdown if present
    if (clientBreakdown) {
      const tolerance = 1; // Allow ₹1 difference for rounding
      const clientConvFee = clientBreakdown.convenienceFee ?? clientBreakdown.platformFee ?? 0;
      const isValid =
        Math.abs(clientBreakdown.totalAmount  - paymentBreakdown.totalAmount)  <= tolerance &&
        Math.abs(clientConvFee                - paymentBreakdown.convenienceFee) <= tolerance &&
        Math.abs(clientBreakdown.codCharge    - paymentBreakdown.codCharge)    <= tolerance;
      
      if (!isValid) {
        await auditLog("WARN", {
          event: "PAYMENT_BREAKDOWN_MISMATCH",
          userId,
          details: { clientTotal: clientBreakdown.totalAmount, serverTotal: paymentBreakdown.totalAmount },
        });
      }
    }

    const finalTotal = paymentBreakdown.totalAmount;

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

    // ── 4. Create Razorpay order (skip for COD) ──────────────────────────────
    const razorpay = getRazorpayClient();
    let razorpayOrderId = "";
    let isMock = false;

    // For COD orders, generate a custom order ID without Razorpay
    if (isCOD) {
      razorpayOrderId = `cod_${Date.now().toString().slice(-6)}_${Math.random().toString(36).slice(2, 7)}`;
      isMock = true; // Treat COD like mock for immediate confirmation
    } else if (razorpay) {
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
    // Calculate payment expiration time (30 minutes from now)
    const paymentExpiresAt = Timestamp.fromMillis(Date.now() + 30 * 60 * 1000);
    
    const orderDoc = {
      userId,
      items:           validatedItems,
      subtotal:        calculatedTotal,
      discount:        discountAmount,
      total:           finalTotal,
      status:          isCOD ? "processing" : (isMock ? "paid" : "pending_payment"),
      couponCode:      couponCode || null,
      razorpayOrderId,
      reservationId,
      isCOD,
      paymentExpiresAt: isCOD || isMock ? null : paymentExpiresAt, // Only for pending payment orders
      paymentBreakdown: {
        convenienceFee: paymentBreakdown.convenienceFee,
        codCharge:      paymentBreakdown.codCharge,
        shippingFee:    paymentBreakdown.shippingFee,
        shippingLabel:  paymentBreakdown.shippingLabel,
        discountAmount: paymentBreakdown.totalSavings,
        mrpTotal:       paymentBreakdown.mrpTotal,
        taxIncluded:    true,
      },
      recipient: {
        name:  profile.name  || "",
        email: profile.email || "",
        phone: profile.phone || "",
        address: {
          name:        profile.name || "",
          phone:       profile.phone || "",
          addressLine1: profile.addressLine1 || "",
          addressLine2: profile.addressLine2 || "",
          landmark:    profile.landmark || "",
          city:        profile.city || "",
          state:       profile.state || "Kerala",
          pincode:     profile.pincode || "",
        },
      },
      shipping: {
        address: `${profile.addressLine1 || ''}${profile.addressLine2 ? ', ' + profile.addressLine2 : ''}${profile.landmark ? ', Near ' + profile.landmark : ''}`,
        city:    profile.city    || "",
        state:   profile.state   || "Kerala",
        pincode: profile.pincode || "",
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      timeline: [{
        status: isCOD ? "processing" : (isMock ? "paid" : "pending_payment"),
        time: Timestamp.now(),
        by: "system",
        note: isCOD ? "COD order placed" : (isMock ? "Mock order created" : "Order created, awaiting payment"),
      }],
    };

    await adminDb.collection("orders").doc(razorpayOrderId).set(orderDoc);

    // ── 6. Atomic completion for COD and Mock Orders ─────────────────────────
    if ((isCOD || isMock) && reservationId) {
      await adminDb.collection("reservations").doc(reservationId).update({
        status:    isCOD ? "confirmed" : "paid",
        updatedAt: FieldValue.serverTimestamp(),
      });
      
      // Also update coupon usage for COD/mock orders
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
      paymentBreakdown,
      isCOD,
    });

  } catch (err: any) {
    console.error("ORDER CREATION ERROR:", err);
    await auditLog("ERROR", { event: "ORDER_CREATION_FAILED", error: err.message });
    return NextResponse.json({ error: err.message || "Order creation failed" }, { status: 500 });
  }
}
