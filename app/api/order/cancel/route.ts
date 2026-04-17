import { adminDb } from "@/lib/firebase-admin";
import { verifyUser } from "@/lib/server-auth";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { processRefund, getPaymentByOrderId } from "@/lib/razorpay";
import { auditLog } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    // Authenticate first
    const user = await verifyUser(req);
    
    // Parse body with error handling
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error("[Cancel Order] Failed to parse request body:", e);
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }
    
    const { orderId } = body;
    
    // 🔴 DEBUG LOG
    console.log("[Cancel Order] Received orderId:", orderId, "type:", typeof orderId);
    
    // 🔴 HARD VALIDATION
    if (!orderId || typeof orderId !== 'string' || orderId.trim() === '') {
      console.error("[Cancel Order] Invalid orderId - rejecting");
      return NextResponse.json({ success: false, error: "Invalid orderId: must be a non-empty string" }, { status: 400 });
    }

    const trimmedOrderId = orderId.trim();
    const orderRef = adminDb.collection("orders").doc(trimmedOrderId);
    
    // Variables to track refund info
    let refundInfo: { refundId: string; amount: number } | null = null;

    // First, get order data outside transaction to check for refund eligibility
    const orderSnap = await orderRef.get();
    const orderData = orderSnap.data();
    
    if (!orderSnap.exists || !orderData) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    // Authorization check
    if (user.role !== 'admin' && user.role !== 'superadmin' && orderData.userId !== user.uid) {
      return NextResponse.json({ success: false, error: "Unauthorized to access this order" }, { status: 403 });
    }

    // Status check
    if (["shipped", "delivered", "cancelled"].includes(orderData.status)) {
      return NextResponse.json({ 
        success: false, 
        error: `Cannot cancel order in ${orderData.status} state` 
      }, { status: 400 });
    }

    // 🔴 PROCESS REFUND FOR ONLINE PAYMENTS
    // Check if order has Razorpay payment (not COD or mock)
    // For COD-converted orders, use codPaymentRazorpayOrderId instead of razorpayOrderId
    const razorpayOrderId = orderData.razorpayOrderId || orderData.codPaymentRazorpayOrderId;
    const isCOD = orderData.isCOD === true;
    const isPaid = ["paid", "processing"].includes(orderData.status) || 
                   (orderData.payment?.status === "paid") ||
                   (orderData.status === "pending_payment" && orderData.razorpayPaymentId);
    
    if (razorpayOrderId && !isCOD && isPaid) {
      console.log("[Cancel Order] Processing refund for online payment...");
      
      try {
        // Get payment ID from Razorpay order
        const paymentInfo = await getPaymentByOrderId(razorpayOrderId);
        
        if (paymentInfo?.paymentId) {
          // Process refund (full amount)
          const refund = await processRefund(
            paymentInfo.paymentId,
            paymentInfo.amount,
            "Order cancelled by " + (user.role === 'admin' ? 'admin' : 'customer')
          );
          
          if (refund) {
            refundInfo = {
              refundId: refund.id,
              amount: refund.amount / 100, // Convert paise to rupees
            };
            console.log("[Cancel Order] Refund processed:", refundInfo);
          }
        } else if (orderData.razorpayPaymentId) {
          // Fallback: use stored payment ID
          const refund = await processRefund(
            orderData.razorpayPaymentId,
            undefined,
            "Order cancelled by " + (user.role === 'admin' ? 'admin' : 'customer')
          );
          
          if (refund) {
            refundInfo = {
              refundId: refund.id,
              amount: (refund.amount || orderData.total * 100) / 100,
            };
          }
        }
      } catch (refundError: any) {
        console.error("[Cancel Order] Refund failed:", refundError.message);
        // Log but continue - order should still be cancelled
        // Admin will need to manually process refund
        await auditLog("ERROR", {
          event: "REFUND_FAILED",
          orderId: trimmedOrderId,
          details: { error: refundError.message, requiresManualRefund: true },
        });
      }
    }

    await adminDb.runTransaction(async (tx) => {
      const orderSnap = await tx.get(orderRef);
      const order = orderSnap.data();

      if (!orderSnap.exists || !order) {
        const error = new Error("Order not found");
        (error as any).status = 404;
        throw error;
      }

      // 1. PERFORM ALL READS FIRST - with validation
      const productSnaps = [];
      if (order.items && Array.isArray(order.items)) {
        for (const item of order.items) {
          if (!item.productId || typeof item.productId !== 'string') {
            console.warn("[Cancel Order] Skipping item with invalid productId:", item);
            continue;
          }
          const productRef = adminDb.collection("products").doc(item.productId);
          const productSnap = await tx.get(productRef);
          productSnaps.push({ snap: productSnap, item, ref: productRef });
        }
      }

      // 2. PERFORM ALL WRITES
      for (const { snap, item, ref } of productSnaps) {
        const product = snap.data();
        if (product) {
          tx.update(ref, {
            stock: product.stock + item.quantity,
            updated_at: new Date()
          });
        }

        if (item.productId) {
          tx.set(adminDb.collection("inventory_logs").doc(), {
            productId: item.productId,
            change: item.quantity,
            reason: "order_cancelled",
            orderId: trimmedOrderId,
            created_at: new Date(),
          });
        }
      }

      // Update order with cancellation and refund info
      const orderUpdate: any = {
        status: "cancelled",
        cancelledAt: new Date(),
        updated_at: new Date(),
        timeline: FieldValue.arrayUnion({
          status: "cancelled",
          time: new Date(),
          by: user.uid,
          note: refundInfo ? `Cancelled. Refund of ₹${refundInfo.amount} processed.` : "Cancelled. No refund applicable.",
        }),
      };
      
      if (refundInfo) {
        orderUpdate.refund = {
          id: refundInfo.refundId,
          amount: refundInfo.amount,
          status: "processed",
          processedAt: new Date(),
        };
      }
      
      tx.update(orderRef, orderUpdate);
    });

    // Log successful cancellation
    await auditLog("INFO", {
      event: "ORDER_CANCELLED",
      orderId: trimmedOrderId,
      userId: user.uid,
      details: {
        refund: refundInfo ? `₹${refundInfo.amount} refunded` : 'No refund (COD or unpaid)',
      },
    });

    console.log("[Cancel Order] Successfully cancelled order:", trimmedOrderId, refundInfo ? `(Refund: ₹${refundInfo.amount})` : '');
    return NextResponse.json({ 
      success: true,
      refund: refundInfo ? { amount: refundInfo.amount, refundId: refundInfo.refundId } : null,
    });
  } catch (error: any) {
    console.error("[Cancel Order] Error:", error.message, error.stack);
    
    // Return appropriate status codes based on error type
    if (error.message?.includes("Unauthorized") || error.message?.includes("Token")) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    
    const status = error.status || 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}
