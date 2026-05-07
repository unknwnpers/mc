export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { calculatePaymentBreakdown, calculateSellingPrice } from "@/lib/payment-calculator";
import { auth } from "firebase-admin";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    // 1. Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1];
    let userId: string;
    try {
      const decodedToken = await auth().verifyIdToken(token);
      userId = decodedToken.uid;
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    // 2. Parse request body (for transient options like isCOD and coupon)
    const body = await req.json();
    const {
      couponDiscount = 0,
      isCOD = false,
    } = body;

    // 3. Fetch canonical cart from Firestore (calculations MUST happen in backend)
    const cartSnapshot = await adminDb.collection("users").doc(userId).collection("cart").get();

    if (cartSnapshot.empty) {
      return NextResponse.json({
        success: true,
        data: calculatePaymentBreakdown({ subtotal: 0, mrpTotal: 0, isCOD })
      });
    }

    // 4. Fetch all active offers once
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

    // 5. Calculate Subtotal and MRP Total from DB products
    let subtotal = 0;
    let mrpTotal = 0;

    for (const doc of cartSnapshot.docs) {
      const item = doc.data();
      const productId = item.id; // item.id is used as productId in cart-context
      const sku = item.sku;
      const quantity = item.quantity || 1;

      const productSnap = await adminDb.collection("products").doc(productId).get();
      if (!productSnap.exists) continue;

      const productData = productSnap.data()!;
      const variant = (productData.variants || []).find((v: any) => v.sku === sku);
      if (!variant) continue;

      const mrp = variant.price;
      const bestOffer = getBestOffer(mrp, productData.category_slug, productId);

      let sellingPrice = mrp;
      if (bestOffer) {
        sellingPrice = bestOffer.type === 'percentage'
          ? calculateSellingPrice(mrp, bestOffer.value)
          : Math.max(0, mrp - bestOffer.value);
      }

      subtotal += sellingPrice * quantity;
      mrpTotal += mrp * quantity;
    }

    // 6. Calculate authoritative payment breakdown
    const breakdown = calculatePaymentBreakdown({
      subtotal,
      mrpTotal,
      couponDiscount,
      isCOD,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...breakdown,
        meta: {
          calculatedAt: new Date().toISOString(),
          isBackendAuthoritative: true
        },
      },
    });
  } catch (error: any) {
    console.error("Payment calculation error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Calculation failed" },
      { status: 500 }
    );
  }
}
